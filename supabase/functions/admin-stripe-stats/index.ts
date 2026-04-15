import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-STRIPE-STATS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Verify user is super admin
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
    if (!user) throw new Error("User not authenticated");

    // Check if user is super admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_super_admin) {
      throw new Error("Access denied - Super admin only");
    }

    logStep("Super admin verified", { userId: user.id });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // PitchFirst Product IDs - only count these as valid subscriptions
    const PITCHFIRST_PRODUCT_IDS = [
      "prod_Tka87AKXNmsZUv", // Starter Monthly
      "prod_TkaAeLeq8rEn90", // Starter Yearly
      "prod_TkoJ98sfzflYyR", // Pro Monthly
      "prod_TkoJ8E0e8l4vwV", // Pro Yearly
    ];

    // Excluded customer emails (not PitchFirst customers)
    const EXCLUDED_CUSTOMER_EMAILS = [
      "leon@ostermann.email", // Wrong payment link
    ];

    // Fetch all subscriptions from Stripe
    logStep("Fetching subscriptions from Stripe");
    
    const allSubscriptions: Stripe.Subscription[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const params: Stripe.SubscriptionListParams = {
        limit: 100,
        expand: ['data.customer', 'data.items.data.price'],
      };
      if (startingAfter) params.starting_after = startingAfter;

      const response = await stripe.subscriptions.list(params);
      
      // Filter to only include PitchFirst products and exclude certain customers
      const pitchFirstSubs = response.data.filter((sub: Stripe.Subscription) => {
        const customer = sub.customer as Stripe.Customer;
        const customerEmail = customer?.email?.toLowerCase() || '';
        
        // Exclude specific customers
        if (EXCLUDED_CUSTOMER_EMAILS.some(e => customerEmail.includes(e.toLowerCase()))) {
          return false;
        }
        
        // Filter by product ID
        const price = sub.items.data[0]?.price;
        const productId = typeof price?.product === 'string' 
          ? price.product 
          : (price?.product as Stripe.Product)?.id;
        return productId && PITCHFIRST_PRODUCT_IDS.includes(productId);
      });
      
      allSubscriptions.push(...pitchFirstSubs);
      hasMore = response.has_more;
      if (response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1].id;
      }
    }

    logStep("Fetched PitchFirst subscriptions", { count: allSubscriptions.length });

    // Calculate MRR and ARR
    let mrr = 0;
    let arr = 0;
    const activeSubscriptions: any[] = [];
    const canceledSubscriptions: any[] = [];
    const subscriptionsByPlan: Record<string, number> = {};
    const statusCounts = {
      active: 0,
      canceled: 0,
      past_due: 0,
      trialing: 0,
      incomplete: 0,
      other: 0,
    };

    // Price ID to plan mapping - dynamically calculate from price amount
    const getPlanInfo = (price: Stripe.Price | undefined): { name: string; monthlyAmount: number } => {
      if (!price) return { name: 'Unknown', monthlyAmount: 0 };
      
      const amount = price.unit_amount || 0;
      const interval = price.recurring?.interval || 'month';
      
      // Calculate monthly amount
      const monthlyAmount = interval === 'year' ? Math.round(amount / 12) : amount;
      
      // Determine plan name based on amount
      // Starter: ~49-149€/month, Pro: ~299€/month
      let planName = 'Starter';
      if (monthlyAmount >= 20000) {
        planName = interval === 'year' ? 'Pro (Jahr)' : 'Pro';
      } else if (interval === 'year') {
        planName = 'Starter (Jahr)';
      }
      
      return { name: planName, monthlyAmount };
    };

    for (const sub of allSubscriptions) {
      const customer = sub.customer as Stripe.Customer;
      const price = sub.items.data[0]?.price as Stripe.Price | undefined;
      const planInfo = getPlanInfo(price);
      
      // Count by plan
      subscriptionsByPlan[planInfo.name] = (subscriptionsByPlan[planInfo.name] || 0) + 1;

      // Count by status
      if (sub.status === 'active') {
        statusCounts.active++;
        mrr += planInfo.monthlyAmount;
      } else if (sub.status === 'canceled') {
        statusCounts.canceled++;
      } else if (sub.status === 'past_due') {
        statusCounts.past_due++;
      } else if (sub.status === 'trialing') {
        statusCounts.trialing++;
        mrr += planInfo.monthlyAmount; // Count trials as MRR too
      } else if (sub.status === 'incomplete') {
        statusCounts.incomplete++;
      } else {
        statusCounts.other++;
      }

      const subscriptionData = {
        id: sub.id,
        status: sub.status,
        planName: planInfo.name,
        monthlyAmount: planInfo.monthlyAmount / 100, // Convert to EUR
        customerEmail: customer?.email || 'Unknown',
        customerName: customer?.name || customer?.email || 'Unknown',
        currentPeriodEnd: sub.current_period_end 
          ? new Date(sub.current_period_end * 1000).toISOString() 
          : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        created: new Date(sub.created * 1000).toISOString(),
      };

      if (sub.status === 'active' || sub.status === 'trialing') {
        activeSubscriptions.push(subscriptionData);
      } else {
        canceledSubscriptions.push(subscriptionData);
      }
    }

    // Calculate ARR from MRR
    arr = mrr * 12;

    // Convert cents to EUR
    const mrrEur = mrr / 100;
    const arrEur = arr / 100;

    logStep("Calculated metrics", { mrr: mrrEur, arr: arrEur, active: statusCounts.active });

    // Sort active subscriptions by creation date (newest first)
    activeSubscriptions.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    // Calculate MRR history for the last 6 months
    logStep("Calculating MRR history");
    const mrrHistory: { month: string; mrr: number; subscriptions: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      
      let monthMrr = 0;
      let monthSubs = 0;

      for (const sub of allSubscriptions) {
        const createdAt = new Date(sub.created * 1000);
        const canceledAt = sub.canceled_at ? new Date(sub.canceled_at * 1000) : null;
        
        // Check if subscription was active during this month
        const wasCreatedBefore = createdAt <= monthEnd;
        const wasActiveInMonth = !canceledAt || canceledAt > monthDate;
        
        if (wasCreatedBefore && wasActiveInMonth) {
          const price = sub.items.data[0]?.price as Stripe.Price | undefined;
          const planInfo = getPlanInfo(price);
          
          // Only count if status was not incomplete at that time
          if (sub.status !== 'incomplete') {
            monthMrr += planInfo.monthlyAmount;
            monthSubs++;
          }
        }
      }

      const monthName = monthDate.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
      mrrHistory.push({
        month: monthName,
        mrr: monthMrr / 100, // Convert to EUR
        subscriptions: monthSubs,
      });
    }

    logStep("MRR history calculated", { months: mrrHistory.length });

    // Calculate Churn Rate and CLV
    logStep("Calculating Churn Rate and CLV");
    
    // Churn Rate: Canceled in last 30 days / Active at start of period
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    let canceledLast30Days = 0;
    let totalLifetimeMonths = 0;
    let customersWithLifetime = 0;

    for (const sub of allSubscriptions) {
      const createdAt = new Date(sub.created * 1000);
      const canceledAt = sub.canceled_at ? new Date(sub.canceled_at * 1000) : null;
      
      // Count cancellations in last 30 days
      if (canceledAt && canceledAt >= thirtyDaysAgo) {
        canceledLast30Days++;
      }
      
      // Calculate customer lifetime for churned customers
      if (canceledAt) {
        const lifetimeMs = canceledAt.getTime() - createdAt.getTime();
        const lifetimeMonths = lifetimeMs / (1000 * 60 * 60 * 24 * 30);
        totalLifetimeMonths += lifetimeMonths;
        customersWithLifetime++;
      }
    }

    // Also calculate lifetime for active customers (from creation to now)
    for (const sub of allSubscriptions) {
      if (sub.status === 'active' || sub.status === 'trialing') {
        const createdAt = new Date(sub.created * 1000);
        const lifetimeMs = now.getTime() - createdAt.getTime();
        const lifetimeMonths = lifetimeMs / (1000 * 60 * 60 * 24 * 30);
        totalLifetimeMonths += lifetimeMonths;
        customersWithLifetime++;
      }
    }

    // Churn Rate = (Canceled in period / Total at start) * 100
    const activeAtStart = statusCounts.active + statusCounts.trialing + canceledLast30Days;
    const churnRate = activeAtStart > 0 
      ? (canceledLast30Days / activeAtStart) * 100 
      : 0;

    // Average Customer Lifetime in months
    const avgLifetimeMonths = customersWithLifetime > 0 
      ? totalLifetimeMonths / customersWithLifetime 
      : 0;

    // ARPU (Average Revenue Per User per month)
    const activeCustomers = statusCounts.active + statusCounts.trialing;
    const arpu = activeCustomers > 0 ? mrrEur / activeCustomers : 0;

    // CLV = ARPU * Average Lifetime (in months)
    // Alternative: CLV = ARPU / Monthly Churn Rate
    const monthlyChurnRate = churnRate / 100;
    const clv = monthlyChurnRate > 0 
      ? arpu / monthlyChurnRate 
      : arpu * avgLifetimeMonths; // Fallback if no churn

    logStep("Churn and CLV calculated", { 
      churnRate: churnRate.toFixed(2), 
      avgLifetimeMonths: avgLifetimeMonths.toFixed(1),
      arpu: arpu.toFixed(2),
      clv: clv.toFixed(2)
    });

    return new Response(JSON.stringify({
      mrr: mrrEur,
      arr: arrEur,
      totalSubscriptions: allSubscriptions.length,
      statusCounts,
      subscriptionsByPlan,
      activeSubscriptions,
      canceledSubscriptions,
      mrrHistory,
      churnRate: Math.round(churnRate * 10) / 10,
      avgLifetimeMonths: Math.round(avgLifetimeMonths * 10) / 10,
      arpu: Math.round(arpu * 100) / 100,
      clv: Math.round(clv * 100) / 100,
      canceledLast30Days,
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