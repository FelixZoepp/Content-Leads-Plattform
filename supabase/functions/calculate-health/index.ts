import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function calculateForTenant(supabaseClient: any, tenantId: string) {
  // Get latest 2 weeks of metrics
  const { data: metrics, error: metricsError } = await supabaseClient
    .from("metrics_snapshot")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("period_date", { ascending: false })
    .limit(14);

  if (metricsError) throw metricsError;
  if (!metrics || metrics.length === 0) return null;

  const latestWeek = metrics.slice(0, 7);
  const previousWeek = metrics.slice(7, 14);

  let score = 0;
  const rationale: string[] = [];

  // 1. Activity Score (0-20 points)
  const postsThisWeek = latestWeek.reduce((acc: number, m: any) => acc + (Number(m.posts) || 0), 0);
  const activityScore = Math.min(20, (postsThisWeek / 3) * 20);
  score += activityScore;
  if (postsThisWeek < 3) {
    rationale.push(`Nur ${postsThisWeek} Posts diese Woche (Ziel: ≥3)`);
  }

  // 2. Top-Funnel Score (0-25 points)
  const leadsThisWeek = latestWeek.reduce((acc: number, m: any) => acc + (m.leads_total || 0), 0);
  const avgLeadsHistorical = metrics.reduce((acc: number, m: any) => acc + (m.leads_total || 0), 0) / metrics.length;
  const targetLeads = Math.max(10, avgLeadsHistorical);
  const topFunnelScore = Math.min(25, (leadsThisWeek / targetLeads) * 25);
  score += topFunnelScore;
  if (leadsThisWeek < targetLeads * 0.8) {
    rationale.push(`Leads unter Ziel: ${leadsThisWeek} (Ziel: ${targetLeads.toFixed(0)})`);
  }

  // 3. Mid-Funnel Score (0-20 points)
  const appointmentsThisWeek = latestWeek.reduce((acc: number, m: any) => acc + (m.appointments || 0), 0);
  const convLeadsToAppts = leadsThisWeek > 0 ? (appointmentsThisWeek / leadsThisWeek) : 0;
  const midFunnelScore = Math.min(20, (convLeadsToAppts / 0.25) * 20);
  score += midFunnelScore;
  if (convLeadsToAppts < 0.25 && leadsThisWeek > 0) {
    rationale.push(`Lead→Termin Conv. zu niedrig: ${(convLeadsToAppts * 100).toFixed(1)}% (Ziel: ≥25%)`);
  }

  // 4. Bottom-Funnel Score (0-20 points)
  const dealsThisWeek = latestWeek.reduce((acc: number, m: any) => acc + (m.deals || 0), 0);
  const convApptsToDeals = appointmentsThisWeek > 0 ? (dealsThisWeek / appointmentsThisWeek) : 0;
  const bottomFunnelScore = Math.min(20, (convApptsToDeals / 0.30) * 20);
  score += bottomFunnelScore;
  if (convApptsToDeals < 0.30 && appointmentsThisWeek > 0) {
    rationale.push(`Termin→Deal Conv. zu niedrig: ${(convApptsToDeals * 100).toFixed(1)}% (Ziel: ≥30%)`);
  }

  // 5. Revenue Trend Score (0-15 points)
  const revenueThisWeek = latestWeek.reduce((acc: number, m: any) => acc + parseFloat(m.revenue || 0), 0);
  const revenuePrevWeek = previousWeek.reduce((acc: number, m: any) => acc + parseFloat(m.revenue || 0), 0);
  const revenueGrowth = revenuePrevWeek > 0 ? ((revenueThisWeek - revenuePrevWeek) / revenuePrevWeek) : 0;
  const revenueTrendScore = revenueGrowth >= 0 ? 15 : Math.max(0, 15 + (revenueGrowth * 100));
  score += revenueTrendScore;
  if (revenueGrowth < -0.20) {
    rationale.push(`Umsatzrückgang: ${(revenueGrowth * 100).toFixed(1)}% WoW`);
  }

  let color: string;
  if (score >= 75) color = 'green';
  else if (score >= 50) color = 'amber';
  else color = 'red';

  const rationaleText = rationale.length > 0
    ? rationale.join('; ')
    : 'Performance im Zielbereich';

  // Save health score
  const { data: healthScore, error: healthError } = await supabaseClient
    .from("health_scores")
    .insert({
      tenant_id: tenantId,
      score: Math.round(score),
      color,
      rationale_text: rationaleText,
    })
    .select()
    .single();

  if (healthError) throw healthError;

  // Generate alerts – only for meaningful thresholds
  const alerts: any[] = [];

  if (postsThisWeek === 0 && metrics.length >= 3) {
    alerts.push({
      tenant_id: tenantId,
      type: 'no_posts',
      severity: 'high',
      message: 'Keine Posts in den letzten 7 Tagen – Sichtbarkeit sinkt.',
    });
  }
  if (leadsThisWeek > 0 && leadsThisWeek < targetLeads * 0.5) {
    alerts.push({
      tenant_id: tenantId,
      type: 'low_leads',
      severity: 'high',
      message: `Leads deutlich unter Ziel: ${leadsThisWeek}/${targetLeads.toFixed(0)}`,
    });
  }
  if (revenueGrowth < -0.20 && revenuePrevWeek > 0) {
    alerts.push({
      tenant_id: tenantId,
      type: 'revenue_drop',
      severity: 'high',
      message: `Umsatzrückgang: ${(revenueGrowth * 100).toFixed(1)}% gegenüber Vorwoche`,
    });
  }
  if (score < 40) {
    alerts.push({
      tenant_id: tenantId,
      type: 'low_health',
      severity: 'high',
      message: `Health Score kritisch niedrig: ${Math.round(score)}/100`,
    });
  }

  if (alerts.length > 0) {
    // Check for existing unresolved alerts of same type to avoid duplicates
    for (const alert of alerts) {
      const { data: existing } = await supabaseClient
        .from("alerts")
        .select("id")
        .eq("tenant_id", alert.tenant_id)
        .eq("type", alert.type)
        .is("resolved_at", null)
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabaseClient.from("alerts").insert(alert);
      }
    }
  }

  return { tenantId, score: Math.round(score), color, alertsGenerated: alerts.length };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let body: any = {};
    try { body = await req.json(); } catch { /* empty body = batch mode */ }

    // Single tenant mode
    if (body?.tenantId) {
      const result = await calculateForTenant(supabaseClient, body.tenantId);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch mode: process all active tenants
    const { data: tenants, error: tErr } = await supabaseClient
      .from("tenants")
      .select("id")
      .eq("is_active", true);

    if (tErr) throw tErr;

    const results: any[] = [];
    for (const t of (tenants || [])) {
      try {
        const r = await calculateForTenant(supabaseClient, t.id);
        if (r) results.push(r);
      } catch (e) {
        results.push({ tenantId: t.id, error: (e as Error).message });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error calculating health score:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
