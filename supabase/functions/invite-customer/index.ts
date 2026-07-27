import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_APP_URL = "https://app.content-leads.de";
const TOKEN_EXPIRY_DAYS = 14;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a cryptographically-random 32-byte hex token. */
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function dispatchInvitationWebhooks(
  adminClient: ReturnType<typeof createClient>,
  payload: {
    tenant_id: string;
    company_name: string;
    email: string;
    contact_name: string | null;
  }
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

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Generic error response — same shape for all failures (anti-enumeration)
  const genericError = (msg: string, status = 400) =>
    new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // ── Auth check ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return genericError("Unauthorized", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();
    if (!caller) return genericError("Unauthorized", 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) return genericError("Forbidden: Admin only", 403);

    // ── Parse body ──────────────────────────────────────────────────────────
    const body = await req.json();
    const {
      email,
      company_name,
      contact_name,
      industry,
      product_slug,
      advisor_email,
    } = body;

    if (!email || !company_name) {
      return genericError("E-Mail und Firmenname sind erforderlich");
    }

    // ── Resolve optional product ────────────────────────────────────────────
    let product_id: string | null = null;
    if (product_slug) {
      const { data: product } = await adminClient
        .from("products")
        .select("id")
        .eq("slug", product_slug)
        .maybeSingle();
      product_id = product?.id ?? null;
    }

    // ── Resolve optional advisor ────────────────────────────────────────────
    let advisor_id: string | null = null;
    if (advisor_email) {
      const { data: advisorProfile } = await adminClient
        .from("profiles")
        .select("user_id")
        .eq("email", advisor_email.toLowerCase())
        .maybeSingle();
      advisor_id = advisorProfile?.user_id ?? null;

      // Fallback: search auth.users via admin API
      if (!advisor_id) {
        const { data: usersPage } = await adminClient.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        const found = (usersPage?.users ?? []).find(
          (u: any) => u.email?.toLowerCase() === advisor_email.toLowerCase()
        );
        advisor_id = found?.id ?? null;
      }
    }

    // ── Check for duplicate pending invitation ──────────────────────────────
    const { data: existing } = await adminClient
      .from("invitations")
      .select("id, status")
      .eq("email_hint", email.toLowerCase())
      .in("status", ["pending", "opened"])
      .maybeSingle();

    if (existing) {
      // Revoke the old one and issue a fresh token below
      await adminClient
        .from("invitations")
        .update({ status: "revoked" })
        .eq("id", existing.id);
    }

    // ── Create tenant + user ────────────────────────────────────────────────
    // First check if tenant already exists for this email
    let userId: string;

    // Try inviting via Supabase Auth (creates user if not exists)
    const redirectTo = `${
      req.headers.get("origin") || DEFAULT_APP_URL
    }/set-password`;

    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { full_name: contact_name || company_name },
        redirectTo,
      });

    if (inviteError) {
      const msg = inviteError.message ?? "";
      const alreadyExists =
        msg.includes("already been registered") ||
        msg.includes("already exists") ||
        msg.includes("email_exists");

      if (!alreadyExists) {
        return genericError(`Einladung fehlgeschlagen: ${msg}`);
      }

      // User exists — find their id
      const { data: usersPage } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      const existingUser = (usersPage?.users ?? []).find(
        (u: any) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (!existingUser) {
        return genericError("Benutzer existiert, konnte aber nicht geladen werden", 500);
      }
      userId = existingUser.id;
    } else {
      userId = inviteData.user.id;
    }

    // ── Upsert tenant ───────────────────────────────────────────────────────
    const { data: existingTenant } = await adminClient
      .from("tenants")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    let tenantId: string;
    if (existingTenant) {
      tenantId = existingTenant.id;
    } else {
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
        return genericError(
          `Tenant-Erstellung fehlgeschlagen: ${tenantError.message}`,
          500
        );
      }
      tenantId = tenant.id;
    }

    // ── Upsert profile ──────────────────────────────────────────────────────
    await adminClient
      .from("profiles")
      .upsert(
        { user_id: userId, full_name: contact_name || company_name, company_name },
        { onConflict: "user_id" }
      );

    // ── Create customer_products entry if product given ─────────────────────
    if (product_id) {
      await adminClient
        .from("customer_products")
        .upsert(
          {
            tenant_id: tenantId,
            product_id,
            status: "onboarding",
            assigned_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id,product_id" }
        );
    }

    // ── Create advisor assignment if advisor given ───────────────────────────
    if (advisor_id) {
      await adminClient
        .from("advisor_assignments")
        .upsert(
          { tenant_id: tenantId, advisor_id, assigned_at: new Date().toISOString() },
          { onConflict: "tenant_id" }
        )
        .then(() => {}); // best-effort, table may not exist yet
    }

    // ── Generate secure token & persist invitation row ──────────────────────
    const token = generateToken();
    const expiresAt = new Date(
      Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: invitation, error: invRowError } = await adminClient
      .from("invitations")
      .insert({
        token,
        account_id: tenantId,
        created_by: caller.id,
        email_hint: email.toLowerCase(),
        role: "customer",
        expires_at: expiresAt,
        status: "pending",
        product_id: product_id ?? null,
        advisor_id: advisor_id ?? null,
        reminder_count: 0,
      })
      .select("id")
      .single();

    if (invRowError) {
      console.error("Invitation row error:", invRowError);
      // Non-fatal — token still returned below
    }

    // ── Build invitation link ───────────────────────────────────────────────
    const invitationLink = `${
      req.headers.get("origin") || DEFAULT_APP_URL
    }/set-password?invitation=${token}`;

    // ── Dispatch webhooks ───────────────────────────────────────────────────
    dispatchInvitationWebhooks(adminClient as any, {
      tenant_id: tenantId,
      company_name,
      email,
      contact_name: contact_name || null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        tenant_id: tenantId,
        user_id: userId,
        invitation_id: invitation?.id ?? null,
        invitation_link: invitationLink,
        expires_at: expiresAt,
        message: `Einladung an ${email} erstellt`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    // Same generic shape — don't leak internals
    console.error("invite-customer error:", err);
    return new Response(
      JSON.stringify({ error: "Ein Fehler ist aufgetreten" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
