import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-CREDITS] ${step}${detailsStr}`);
};

// Credit packages
const CREDIT_PACKAGES = {
  s: {
    price_id: "price_1T6czyEaO7RPawTGzMl3pjQu",
    product_id: "prod_U4mZzdPCWNkrJh",
    extra_credits: 100,
    label: "S – 100 Extra",
    price_eur: 100,
  },
  m: {
    price_id: "price_1T6czzEaO7RPawTGKMiqXA8m",
    product_id: "prod_U4mZNjYKB77XFk",
    extra_credits: 250,
    label: "M – 250 Extra",
    price_eur: 200,
  },
  l: {
    price_id: "price_1T6d02EaO7RPawTGil4ca7dy",
    product_id: "prod_U4mZT1S9a9AXTR",
    extra_credits: 500,
    label: "L – 500 Extra",
    price_eur: 350,
  },
} as const;

// Reverse lookup: product_id -> package key
export const CREDIT_PRODUCT_IDS: Record<string, { package: string; extra_credits: number }> = {
  "prod_U4mZzdPCWNkrJh": { package: "s", extra_credits: 100 },
  "prod_U4mZNjYKB77XFk": { package: "m", extra_credits: 250 },
  "prod_U4mZT1S9a9AXTR": { package: "l", extra_credits: 500 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user's account
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_id")
      .eq("id", user.id)
      .single();

    if (!profile?.account_id) throw new Error("No account found");
    const accountId = profile.account_id;

    const { action, package: pkg } = await req.json();
    logStep("Request", { action, package: pkg });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // GET current status
    if (action === "status") {
      const { data: creditSub } = await supabase
        .from("credit_subscriptions")
        .select("*")
        .eq("account_id", accountId)
        .eq("status", "active")
        .maybeSingle();

      return new Response(JSON.stringify({ 
        creditSubscription: creditSub,
        packages: CREDIT_PACKAGES,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CANCEL credit subscription
    if (action === "cancel") {
      const { data: creditSub } = await supabase
        .from("credit_subscriptions")
        .select("stripe_subscription_id")
        .eq("account_id", accountId)
        .eq("status", "active")
        .maybeSingle();

      if (!creditSub?.stripe_subscription_id) {
        return new Response(JSON.stringify({ error: "Kein aktives Credit-Abo gefunden" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      await stripe.subscriptions.cancel(creditSub.stripe_subscription_id);
      
      await supabase
        .from("credit_subscriptions")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("account_id", accountId);

      // Reset credit limits to default
      const currentMonth = new Date().toISOString().slice(0, 7);
      await supabase
        .from("enrichment_credits")
        .update({ 
          phone_credits_limit: 100, 
          email_credits_limit: 100,
          updated_at: new Date().toISOString() 
        })
        .eq("account_id", accountId)
        .eq("month_year", currentMonth);

      logStep("Credit subscription cancelled");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SUBSCRIBE or CHANGE package
    if (action === "subscribe" || action === "change") {
      if (!pkg || !CREDIT_PACKAGES[pkg as keyof typeof CREDIT_PACKAGES]) {
        return new Response(JSON.stringify({ error: "Ungültiges Paket" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const targetPkg = CREDIT_PACKAGES[pkg as keyof typeof CREDIT_PACKAGES];

      // Find Stripe customer
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      
      // Check existing credit subscription
      const { data: existingCreditSub } = await supabase
        .from("credit_subscriptions")
        .select("stripe_subscription_id, package")
        .eq("account_id", accountId)
        .eq("status", "active")
        .maybeSingle();

      if (existingCreditSub?.stripe_subscription_id) {
        // CHANGE existing subscription
        if (existingCreditSub.package === pkg) {
          return new Response(JSON.stringify({ error: "Du hast dieses Paket bereits" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        const sub = await stripe.subscriptions.retrieve(existingCreditSub.stripe_subscription_id);
        const currentItem = sub.items.data[0];

        await stripe.subscriptions.update(sub.id, {
          items: [{ id: currentItem.id, price: targetPkg.price_id }],
          proration_behavior: "create_prorations",
        });

        await supabase
          .from("credit_subscriptions")
          .update({ 
            package: pkg, 
            extra_credits: targetPkg.extra_credits,
            updated_at: new Date().toISOString(),
          })
          .eq("account_id", accountId);

        // Update credit limits
        const currentMonth = new Date().toISOString().slice(0, 7);
        const newLimit = 100 + targetPkg.extra_credits;
        await supabase
          .from("enrichment_credits")
          .update({ 
            phone_credits_limit: newLimit,
            email_credits_limit: newLimit,
            updated_at: new Date().toISOString(),
          })
          .eq("account_id", accountId)
          .eq("month_year", currentMonth);

        logStep("Credit subscription changed", { from: existingCreditSub.package, to: pkg });
        return new Response(JSON.stringify({ type: "changed", success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // NEW subscription - create checkout
      const origin = req.headers.get("origin") || "https://pitchfirst.io";
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: "subscription",
        line_items: [{ price: targetPkg.price_id, quantity: 1 }],
        success_url: `${origin}/billing?credits=success`,
        cancel_url: `${origin}/billing`,
        metadata: { credit_package: pkg, account_id: accountId },
      };

      if (customers.data.length > 0) {
        sessionParams.customer = customers.data[0].id;
      } else {
        sessionParams.customer_email = user.email;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      logStep("Checkout session created", { sessionId: session.id });

      return new Response(JSON.stringify({ type: "checkout", url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
