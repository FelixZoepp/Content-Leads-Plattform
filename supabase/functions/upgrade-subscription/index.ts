import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPGRADE-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Price IDs for each plan
const PRICE_IDS = {
  starter_monthly: "price_1RUtXVG2AAmJlpyxLVYgkqxM", // 149€/month
  starter_yearly: "price_1RUtaIG2AAmJlpyxyLY3yMSZ",  // 1490€/year
  pro_monthly: "price_1RV6LtG2AAmJlpyxZvpwDdYW",    // 299€/month
  pro_yearly: "price_1RV6MkG2AAmJlpyxc1SZlbKD",     // 2990€/year
  scale_monthly: "price_1StWgeEaO7RPawTGAOC9JZxj",  // 399€/month
  scale_yearly: "price_1StWggEaO7RPawTGNXYsPtbD",   // 3990€/year
};

// Product IDs for plan detection
const PRODUCT_IDS = {
  starter_monthly: "prod_Tka87AKXNmsZUv",
  starter_yearly: "prod_TkaAeLeq8rEn90",
  pro_monthly: "prod_TkoJ98sfzflYyR",
  pro_yearly: "prod_TkoJ8E0e8l4vwV",
  scale_monthly: "prod_TrFB2U9xGL68vY",
  scale_yearly: "prod_TrFB4brZtWtOvX",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { targetPlan, billingPeriod } = await req.json();
    logStep("Upgrade request", { targetPlan, billingPeriod });

    // Validate target plan
    const targetPriceKey = `${targetPlan}_${billingPeriod}` as keyof typeof PRICE_IDS;
    const targetPriceId = PRICE_IDS[targetPriceKey];
    if (!targetPriceId) {
      throw new Error(`Invalid plan: ${targetPlan}_${billingPeriod}`);
    }
    logStep("Target price identified", { targetPriceId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      // No existing customer - create checkout for new subscription
      logStep("No existing customer, creating checkout session");
      
      const session = await stripe.checkout.sessions.create({
        customer_email: user.email,
        line_items: [{ price: targetPriceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${req.headers.get("origin")}/subscription-success?upgraded=true`,
        cancel_url: `${req.headers.get("origin")}/upgrade`,
      });

      return new Response(JSON.stringify({ 
        type: "checkout",
        url: session.url 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      // No active subscription - create checkout
      logStep("No active subscription, creating checkout session");
      
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{ price: targetPriceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${req.headers.get("origin")}/subscription-success?upgraded=true`,
        cancel_url: `${req.headers.get("origin")}/upgrade`,
      });

      return new Response(JSON.stringify({ 
        type: "checkout",
        url: session.url 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const currentItem = subscription.items.data[0];
    logStep("Current subscription", { 
      subscriptionId: subscription.id,
      currentPriceId: currentItem.price.id,
      currentProductId: currentItem.price.product 
    });

    // Check if already on target plan
    if (currentItem.price.id === targetPriceId) {
      return new Response(JSON.stringify({ 
        error: "Du bist bereits auf diesem Plan" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Calculate proration preview
    const preview = await stripe.invoices.createPreview({
      customer: customerId,
      subscription: subscription.id,
      subscription_items: [{
        id: currentItem.id,
        price: targetPriceId,
      }],
      subscription_proration_behavior: "create_prorations",
    });

    const prorationAmount = (preview.lines.data as Array<{proration?: boolean; amount: number}>)
      .filter((line) => line.proration)
      .reduce((sum: number, line) => sum + line.amount, 0);
    
    const totalDue = preview.amount_due;
    logStep("Proration calculated", { 
      prorationAmount: prorationAmount / 100, 
      totalDue: totalDue / 100 
    });

    // Perform the upgrade with proration
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: [{
        id: currentItem.id,
        price: targetPriceId,
      }],
      proration_behavior: "create_prorations",
      payment_behavior: "error_if_incomplete",
    });

    logStep("Subscription upgraded", { 
      newPriceId: targetPriceId,
      status: updatedSubscription.status 
    });

    // Update internal subscription record
    const planName = targetPlan === "scale" ? "scale" : targetPlan === "pro" ? "pro" : "basic";
    await supabaseClient
      .from("subscriptions")
      .update({ 
        plan_name: planName,
        updated_at: new Date().toISOString(),
        current_period_end: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
      })
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ 
      type: "upgraded",
      success: true,
      prorationAmount: prorationAmount / 100,
      totalCharged: totalDue / 100,
      newPlan: targetPlan,
      billingPeriod: billingPeriod,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
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
