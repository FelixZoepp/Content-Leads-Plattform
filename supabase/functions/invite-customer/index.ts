import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_APP_URL = "https://app.content-leads.de";
const USER_LOOKUP_PAGE_SIZE = 100;

function isExistingUserError(message?: string | null) {
  return Boolean(
    message?.includes("already been registered") ||
      message?.includes("already exists") ||
      message?.includes("email_exists")
  );
}

async function findUserByEmail(adminClient: any, email: string) {
  const normalizedEmail = email.toLowerCase();

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: USER_LOOKUP_PAGE_SIZE,
    });

    if (error) throw error;

    const foundUser = (data.users as any[]).find(
      (user: any) => user.email?.toLowerCase() === normalizedEmail
    );

    if (foundUser) return foundUser;
    if (data.users.length < USER_LOOKUP_PAGE_SIZE) break;
  }

  return null;
}

function dispatchInvitationWebhooks(
  adminClient: ReturnType<typeof createClient>,
  payload: { tenant_id: string; company_name: string; email: string; contact_name: string | null }
) {
  const task = (async () => {
    const { data: webhookEndpoints } = await adminClient
      .from("webhook_endpoints")
      .select("url")
      .eq("event_type", "customer_invited")
      .eq("is_active", true);

    if (!webhookEndpoints?.length) return;

    const webhookPayload = JSON.stringify({
      event: "customer_invited",
      timestamp: new Date().toISOString(),
      data: payload,
    });

    await Promise.allSettled(
      (webhookEndpoints as any[]).map((endpoint: any) =>
        fetch(endpoint.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: webhookPayload,
          signal: AbortSignal.timeout(4000),
        })
      )
    );
  })().catch((error) => {
    console.error("Customer invitation webhooks failed:", error);
  });

  const runtime = globalThis as typeof globalThis & {
    EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void };
  };

  runtime.EdgeRuntime?.waitUntil?.(task);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, company_name, contact_name, industry } = body;
    const redirectTo = `${req.headers.get("origin") || DEFAULT_APP_URL}/set-password`;

    if (!email || !company_name) {
      return new Response(
        JSON.stringify({ error: "E-Mail und Firmenname sind erforderlich" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userId: string;
    let invitationSent = false;

    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { full_name: contact_name || company_name },
        redirectTo,
      });

    if (inviteError) {
      if (isExistingUserError(inviteError.message)) {
        const { data: existingTenant } = await adminClient
          .from("tenants")
          .select("id, user_id")
          .eq("company_name", company_name)
          .maybeSingle();

        if (existingTenant) {
          return new Response(
            JSON.stringify({ error: "Dieser Benutzer hat bereits ein Kundenkonto" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const existingUser = await findUserByEmail(adminClient, email);

        if (!existingUser) {
          return new Response(
            JSON.stringify({ error: "Benutzer existiert, konnte aber nicht geladen werden" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
        const { error: resetError } = await anonClient.auth.resetPasswordForEmail(email, {
          redirectTo,
        });

        if (resetError) {
          return new Response(
            JSON.stringify({ error: `Setup-E-Mail fehlgeschlagen: ${resetError.message}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        userId = existingUser.id;
        invitationSent = true;
      } else {
        return new Response(
          JSON.stringify({ error: `Einladung fehlgeschlagen: ${inviteError.message}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      userId = inviteData.user.id;
      invitationSent = true;
    }

    const { data: existingTenantByUser } = await adminClient
      .from("tenants")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingTenantByUser) {
      return new Response(
        JSON.stringify({ error: "Dieser Benutzer hat bereits ein Kundenkonto" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create tenant
    const { data: tenant, error: tenantError } = await adminClient
      .from("tenants")
      .insert({
        user_id: userId,
        company_name,
        contact_name: contact_name || null,
        industry: industry || null,
        is_active: true,
        onboarding_completed: false,
      })
      .select()
      .single();

    if (tenantError) {
      return new Response(
        JSON.stringify({ error: `Tenant-Erstellung fehlgeschlagen: ${tenantError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create profile
    await adminClient.from("profiles").upsert({
      user_id: userId,
      full_name: contact_name || company_name,
      company_name,
    }, { onConflict: "user_id" });

    dispatchInvitationWebhooks(adminClient as any, {
      tenant_id: tenant.id,
      company_name,
      email,
      contact_name: contact_name || null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        tenant_id: tenant.id,
        user_id: userId,
        invited: !inviteError,
        email_sent: invitationSent,
        message: inviteError
          ? `Setup-E-Mail an ${email} gesendet`
          : `Einladung an ${email} gesendet`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: `Server error: ${(err as Error).message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
