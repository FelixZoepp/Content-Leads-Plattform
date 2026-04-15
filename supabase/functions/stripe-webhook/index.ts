import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Map Stripe product IDs to plan names
const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_Tka87AKXNmsZUv": "basic",      // Starter Monthly
  "prod_TkaAeLeq8rEn90": "basic",      // Starter Yearly
  "prod_TkoJ98sfzflYyR": "pro",        // Pro Monthly
  "prod_TkoJ8E0e8l4vwV": "pro",        // Pro Yearly
};

// Credit add-on product IDs
const CREDIT_PRODUCT_IDS: Record<string, { package: string; extra_credits: number }> = {
  "prod_U4mZzdPCWNkrJh": { package: "s", extra_credits: 100 },
  "prod_U4mZNjYKB77XFk": { package: "m", extra_credits: 250 },
  "prod_U4mZT1S9a9AXTR": { package: "l", extra_credits: 500 },
};

function isCreditProduct(productId: string): boolean {
  return productId in CREDIT_PRODUCT_IDS;
}

async function syncCreditSubscription(
  supabase: SupabaseClient,
  stripe: Stripe,
  subscription: Stripe.Subscription
) {
  const productId = subscription.items.data[0]?.price?.product as string;
  const creditInfo = CREDIT_PRODUCT_IDS[productId];
  if (!creditInfo) return;

  logStep("Syncing credit subscription", { subscriptionId: subscription.id, package: creditInfo.package });

  const customer = await stripe.customers.retrieve(subscription.customer as string);
  if (customer.deleted) return;
  const customerEmail = (customer as Stripe.Customer).email;
  if (!customerEmail) return;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, account_id")
    .eq("email", customerEmail)
    .limit(1);

  if (!profiles?.length || !profiles[0].account_id) return;
  const accountId = profiles[0].account_id;

  const isActive = subscription.status === "active" || subscription.status === "trialing";

  // Upsert credit subscription
  const { error } = await supabase
    .from("credit_subscriptions")
    .upsert({
      account_id: accountId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      package: creditInfo.package,
      extra_credits: creditInfo.extra_credits,
      status: isActive ? "active" : subscription.status === "past_due" ? "past_due" : "canceled",
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "account_id" });

  if (error) {
    logStep("Error upserting credit subscription", { error: error.message });
    return;
  }

  // Update enrichment credits limit
  if (isActive) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const newLimit = 100 + creditInfo.extra_credits;

    // Ensure row exists
    await supabase.rpc("get_enrichment_credits", { p_account_id: accountId });

    await supabase
      .from("enrichment_credits")
      .update({ phone_credits_limit: newLimit, email_credits_limit: newLimit, updated_at: new Date().toISOString() })
      .eq("account_id", accountId)
      .eq("month_year", currentMonth);

    logStep("Credit limits updated", { accountId, newLimit });
  }
}

async function syncSubscription(
  supabase: SupabaseClient,
  stripe: Stripe,
  subscription: Stripe.Subscription
) {
  // Skip credit product subscriptions - handled separately
  const syncProductId = subscription.items.data[0]?.price?.product as string;
  if (isCreditProduct(syncProductId)) {
    logStep("Credit product detected, routing to credit sync");
    await syncCreditSubscription(supabase, stripe, subscription);
    return;
  }

  logStep("Syncing subscription", { 
    subscriptionId: subscription.id,
    customerId: subscription.customer as string,
    status: subscription.status 
  });

  // Get customer details
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  if (customer.deleted) {
    logStep("Customer deleted, skipping sync");
    return;
  }

  const customerEmail = (customer as Stripe.Customer).email;
  const customerName = (customer as Stripe.Customer).name;
  
  if (!customerEmail) {
    logStep("No customer email found, skipping sync");
    return;
  }

  logStep("Customer details", { email: customerEmail, name: customerName || "unknown" });

  // Find user by email
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, account_id, name")
    .eq("email", customerEmail)
    .limit(1);

  if (profileError) {
    logStep("Error finding profile", { error: profileError.message });
    return;
  }

  let userId: string;
  let accountId: string | null;

  if (profiles && profiles.length > 0) {
    const profile = profiles[0] as { id: string; account_id: string | null; name: string | null };
    userId = profile.id;
    accountId = profile.account_id;
    logStep("Found existing profile", { userId, accountId: accountId || "none" });
  } else {
    logStep("No profile found for email", { email: customerEmail });
    return;
  }

  // Create account if user doesn't have one
  if (!accountId) {
    const { data: newAccount, error: accountError } = await supabase
      .from("accounts")
      .insert({
        name: customerName || customerEmail.split("@")[0],
        email: customerEmail,
        is_active: true,
        subscription_status: subscription.status === "active" ? "active" : "inactive"
      })
      .select("id")
      .single();

    if (accountError) {
      logStep("Error creating account", { error: accountError.message });
      return;
    }

    const account = newAccount as { id: string };
    accountId = account.id;
    logStep("Created new account", { accountId });

    // Link profile to account
    const { error: linkError } = await supabase
      .from("profiles")
      .update({ account_id: accountId })
      .eq("id", userId);

    if (linkError) {
      logStep("Error linking profile to account", { error: linkError.message });
    } else {
      logStep("Linked profile to account");
    }
  } else {
    // Update account subscription status
    const { error: updateError } = await supabase
      .from("accounts")
      .update({ 
        subscription_status: subscription.status === "active" ? "active" : "inactive",
        is_active: subscription.status === "active"
      })
      .eq("id", accountId);

    if (updateError) {
      logStep("Error updating account status", { error: updateError.message });
    }
  }

  // Determine plan from product
  const priceId = subscription.items.data[0]?.price?.id;
  const detailProductId = subscription.items.data[0]?.price?.product as string;
  const planName = PRODUCT_TO_PLAN[detailProductId] || "basic";
  
  // Determine billing interval
  const interval = subscription.items.data[0]?.price?.recurring?.interval;
  const billingInterval = interval === "year" ? "yearly" : "monthly";

  logStep("Subscription details", { priceId, detailProductId, planName, billingInterval });

  // Check if subscription already exists
  const { data: existingSubs } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .limit(1);

  const existingSub = existingSubs && existingSubs.length > 0 ? existingSubs[0] as { id: string } : null;

  const subscriptionData = {
    user_id: userId,
    stripe_customer_id: subscription.customer as string,
    stripe_subscription_id: subscription.id,
    plan_name: planName,
    billing_interval: billingInterval,
    status: subscription.status === "active" ? "active" : 
            subscription.status === "trialing" ? "trialing" :
            subscription.status === "past_due" ? "past_due" : "cancelled",
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end
  };

  if (existingSub) {
    // Update existing subscription
    const { error } = await supabase
      .from("subscriptions")
      .update(subscriptionData)
      .eq("id", existingSub.id);

    if (error) {
      logStep("Error updating subscription", { error: error.message });
    } else {
      logStep("Subscription updated successfully");
    }
  } else {
    // Create new subscription
    const { error } = await supabase
      .from("subscriptions")
      .insert(subscriptionData);

    if (error) {
      logStep("Error creating subscription", { error: error.message });
    } else {
      logStep("Subscription created successfully");
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    logStep("Webhook received", { hasSignature: !!signature });

    // Verify webhook signature
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    let event: Stripe.Event;

    if (webhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
        logStep("Webhook signature verified", { eventType: event.type });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logStep("Webhook signature verification failed", { error: errorMessage });
        return new Response(JSON.stringify({ error: "Webhook signature verification failed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    } else {
      // For development/testing without signature verification
      event = JSON.parse(body) as Stripe.Event;
      logStep("Processing webhook without signature verification", { eventType: event.type });
    }

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { 
          sessionId: session.id, 
          customerId: session.customer as string,
          customerEmail: session.customer_email || "unknown"
        });
        
        if (session.mode === "subscription" && session.subscription) {
          // Fetch subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          await syncSubscription(supabase, stripe, subscription);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription event", { 
          eventType: event.type,
          subscriptionId: subscription.id,
          status: subscription.status 
        });
        await syncSubscription(supabase, stripe, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { subscriptionId: subscription.id });
        
        // Update subscription status to cancelled
        const { error } = await supabase
          .from("subscriptions")
          .update({ 
            status: "cancelled",
            cancel_at_period_end: true 
          })
          .eq("stripe_subscription_id", subscription.id);
        
        if (error) {
          logStep("Error updating cancelled subscription", { error: error.message });
        } else {
          logStep("Subscription marked as cancelled");
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment succeeded", { 
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription as string || "none"
        });
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          await syncSubscription(supabase, stripe, subscription);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment failed", { 
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription as string || "none"
        });
        
        // Update subscription status to past_due
        if (invoice.subscription) {
          const { error } = await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", invoice.subscription as string);
          
          if (error) {
            logStep("Error updating past_due subscription", { error: error.message });
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { eventType: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
