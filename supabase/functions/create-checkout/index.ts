import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Price IDs for each plan/billing combination
const PRICE_IDS = {
  starter: {
    monthly: "price_1RUtXVG2AAmJlpyxLVYgkqxM",   // Starter Monthly 149€
    yearly: "price_1RUtaIG2AAmJlpyxyLY3yMSZ",    // Starter Yearly 1490€
  },
  pro: {
    monthly: "price_1RV6LtG2AAmJlpyxZvpwDdYW",   // Pro Monthly 299€
    yearly: "price_1RV6MkG2AAmJlpyxc1SZlbKD",    // Pro Yearly 2990€
  },
  scale: {
    monthly: "price_1StWgeEaO7RPawTGAOC9JZxj",   // Scale Monthly 399€
    yearly: "price_1StWggEaO7RPawTGNXYsPtbD",    // Scale Yearly 3990€
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const { plan, billingPeriod, origin, email } = await req.json();

    if (!plan || !billingPeriod) {
      return new Response(
        JSON.stringify({ error: "Plan and billingPeriod are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Request params", { plan, billingPeriod, origin, email: email ? "provided" : "none" });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get price ID
    const priceId = PRICE_IDS[plan as keyof typeof PRICE_IDS]?.[billingPeriod as 'monthly' | 'yearly'];
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: "Invalid plan or billing period" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Using price", { priceId });

    // Check for existing customer by email
    let customerId: string | undefined;
    if (email) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing customer", { customerId });
      }
    }

    // Create checkout session with dynamic success URL including session_id
    const successUrl = `${origin || "https://pitchfirst.io"}/subscription-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin || "https://pitchfirst.io"}/upgrade`;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    };

    // If customer exists, attach to session
    if (customerId) {
      sessionParams.customer = customerId;
    } else if (email) {
      sessionParams.customer_email = email;
    }

    logStep("Creating checkout session", { successUrl, cancelUrl, hasCustomer: !!customerId });

    const session = await stripe.checkout.sessions.create(sessionParams);

    logStep("Session created", { sessionId: session.id, url: session.url });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
