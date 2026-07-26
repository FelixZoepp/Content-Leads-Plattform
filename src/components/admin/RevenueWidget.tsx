import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, TrendingDown, Loader2 } from "lucide-react";

interface RevenueData {
  mrr: number;
  activeSubscriptions: number;
  totalCustomers: number;
  churnRisk: number;
}

export function RevenueWidget() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadRevenue(); }, []);

  async function loadRevenue() {
    setLoading(true);

    // Count active tenants
    const { count: totalCustomers } = await supabase
      .from("tenants" as any)
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    // Count subscriptions
    const { data: subs } = await (supabase as any)
      .from("subscriptions")
      .select("plan_name, status")
      .eq("status", "active");

    // Get health scores for churn risk
    const { data: healthScores } = await (supabase as any)
      .from("health_scores")
      .select("tenant_id, score, color")
      .order("created_at", { ascending: false });

    // Deduplicate to latest per tenant
    const latestHealth: Record<string, any> = {};
    for (const h of healthScores || []) {
      if (!latestHealth[h.tenant_id]) latestHealth[h.tenant_id] = h;
    }
    const churnRisk = Object.values(latestHealth).filter((h: any) => h.color === "red").length;

    // Estimate MRR from plan names
    const planPrices: Record<string, number> = { basic: 99, pro: 249, scale: 399 };
    const mrr = (subs || []).reduce((sum: number, s: any) => sum + (planPrices[s.plan_name] || 0), 0);

    setData({
      mrr,
      activeSubscriptions: subs?.length || 0,
      totalCustomers: totalCustomers || 0,
      churnRisk,
    });
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="glass-panel fade-up">
        <div className="relative z-[2] flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-[rgba(249,249,249,0.3)]" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="glass-panel fade-up">
      <div className="relative z-[2]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">Revenue</span>
            <h2 className="text-[15px] text-white" style={{ fontFamily: "var(--font-serif)" }}>Umsatzübersicht</h2>
          </div>
          <DollarSign className="w-4 h-4 text-[rgba(249,249,249,0.2)]" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-xl border border-[rgba(249,249,249,0.06)]" style={{ background: "rgba(249,249,249,0.02)" }}>
            <p className="text-[10px] text-[rgba(249,249,249,0.4)] uppercase tracking-wider mb-1">Geschätzter MRR</p>
            <p className="text-xl font-bold text-[#E9CB8B]">
              {data.mrr > 0 ? `€${data.mrr.toLocaleString("de-DE")}` : "—"}
            </p>
          </div>
          <div className="p-3 rounded-xl border border-[rgba(249,249,249,0.06)]" style={{ background: "rgba(249,249,249,0.02)" }}>
            <p className="text-[10px] text-[rgba(249,249,249,0.4)] uppercase tracking-wider mb-1">Aktive Abos</p>
            <p className="text-xl font-bold text-white">{data.activeSubscriptions}</p>
          </div>
          <div className="p-3 rounded-xl border border-[rgba(249,249,249,0.06)]" style={{ background: "rgba(249,249,249,0.02)" }}>
            <p className="text-[10px] text-[rgba(249,249,249,0.4)] uppercase tracking-wider mb-1">Kunden gesamt</p>
            <p className="text-xl font-bold text-white">{data.totalCustomers}</p>
          </div>
          <div className="p-3 rounded-xl border border-[rgba(249,249,249,0.06)]" style={{ background: "rgba(249,249,249,0.02)" }}>
            <p className="text-[10px] text-[rgba(249,249,249,0.4)] uppercase tracking-wider mb-1">Churn-Risiko</p>
            <div className="flex items-center gap-2">
              <p className={`text-xl font-bold ${data.churnRisk > 0 ? "text-[#E87467]" : "text-[#7FC29B]"}`}>
                {data.churnRisk}
              </p>
              {data.churnRisk > 0 ? (
                <TrendingDown className="w-4 h-4 text-[#E87467]" />
              ) : (
                <TrendingUp className="w-4 h-4 text-[#7FC29B]" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
