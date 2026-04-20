import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";

interface BaselineData {
  current_leads_per_month?: number;
  current_conversion_rate?: number;
  cost_per_lead?: number;
  cost_per_appointment?: number;
  monthly_budget?: number;
  revenue_recurring?: number;
  revenue_onetime?: number;
  total_customers?: number;
  new_customers_monthly?: number;
  closing_rate?: number;
  goal_leads_monthly?: number;
  goal_revenue_monthly?: number;
}

interface LatestKPI {
  leads?: number;
  conversion_rate?: number;
  cost_per_lead?: number;
  cost_per_appointment?: number;
  revenue?: number;
  new_customers?: number;
  closing_rate?: number;
}

const KPI_ROWS = [
  { label: "Leads / Monat", baseKey: "current_leads_per_month", currentKey: "leads", goalKey: "goal_leads_monthly", unit: "", format: "int" },
  { label: "Conversion Rate", baseKey: "current_conversion_rate", currentKey: "conversion_rate", unit: "%", format: "pct" },
  { label: "Closing Rate", baseKey: "closing_rate", currentKey: "closing_rate", unit: "%", format: "pct" },
  { label: "Cost per Lead", baseKey: "cost_per_lead", currentKey: "cost_per_lead", unit: "€", format: "eur" },
  { label: "Cost per Appointment", baseKey: "cost_per_appointment", currentKey: "cost_per_appointment", unit: "€", format: "eur" },
  { label: "Umsatz (mtl.)", baseKey: "revenue_recurring", currentKey: "revenue", goalKey: "goal_revenue_monthly", unit: "€", format: "eur" },
  { label: "Neue Kunden / Monat", baseKey: "new_customers_monthly", currentKey: "new_customers", unit: "", format: "int" },
] as const;

function formatValue(val: number | undefined, format: string): string {
  if (val === undefined || val === null) return "—";
  if (format === "eur") return `€ ${val.toLocaleString("de-DE")}`;
  if (format === "pct") return `${val}%`;
  return val.toLocaleString("de-DE");
}

function getDelta(baseline: number | undefined, current: number | undefined, isLowerBetter = false) {
  if (!baseline || !current) return { pct: null, direction: "neutral" as const };
  const diff = current - baseline;
  const pct = Math.round((diff / baseline) * 100);
  const direction = diff === 0 ? "neutral" : (isLowerBetter ? diff < 0 : diff > 0) ? "up" : "down";
  return { pct, direction } as const;
}

export default function KPIComparison() {
  const { user, tenantId } = useAuth();
  const [baseline, setBaseline] = useState<BaselineData>({});
  const [current, setCurrent] = useState<LatestKPI>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId || !user) return;
    (async () => {
      // Baseline from tenant (onboarding data)
      const { data: tenant } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .single();

      if (tenant) {
        setBaseline({
          current_leads_per_month: parseFloat(tenant.current_leads_per_month) || undefined,
          current_conversion_rate: parseFloat(tenant.current_conversion_rate) || undefined,
          cost_per_lead: parseFloat(tenant.cost_per_lead) || undefined,
          cost_per_appointment: parseFloat(tenant.cost_per_appointment) || undefined,
          monthly_budget: parseFloat(tenant.monthly_budget) || undefined,
          revenue_recurring: parseFloat(tenant.revenue_recurring) || undefined,
          revenue_onetime: parseFloat(tenant.revenue_onetime) || undefined,
          total_customers: parseFloat(tenant.total_customers) || undefined,
          new_customers_monthly: parseFloat(tenant.new_customers_monthly) || undefined,
          closing_rate: parseFloat(tenant.closing_rate) || undefined,
          goal_leads_monthly: parseFloat(tenant.goal_leads_monthly) || undefined,
          goal_revenue_monthly: parseFloat(tenant.goal_revenue_monthly) || undefined,
        });
      }

      // Latest KPIs from kpi_entries or metrics
      const { data: entries } = await (supabase as any)
        .from("kpi_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (entries && entries.length > 0) {
        const e = entries[0];
        setCurrent({
          leads: parseFloat(e.leads) || undefined,
          conversion_rate: parseFloat(e.conversion_rate) || undefined,
          cost_per_lead: parseFloat(e.cost_per_lead) || undefined,
          cost_per_appointment: parseFloat(e.cost_per_appointment) || undefined,
          revenue: parseFloat(e.revenue) || undefined,
          new_customers: parseFloat(e.new_customers) || undefined,
          closing_rate: parseFloat(e.closing_rate) || undefined,
        });
      }

      setLoading(false);
    })();
  }, [user, tenantId]);

  const isLowerBetter = (key: string) => key.includes("cost");

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="glass-panel fade-up">
        <div className="relative z-[2]">
          <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">Analyse</span>
          <h1 className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>
            Baseline vs. Aktuell
          </h1>
          <p className="text-[13px] text-[rgba(249,249,249,0.5)] mt-1">
            Deine eingereichten Kennzahlen im Vergleich zum aktuellen Stand<span className="text-[#C5A059]">.</span>
          </p>
        </div>
      </div>

      {/* KPI Table */}
      <div className="glass-panel fade-up" style={{ animationDelay: "80ms", padding: 0 }}>
        <div className="relative z-[2]">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_130px_40px_130px_130px] gap-4 px-6 py-4 border-b border-[rgba(249,249,249,0.08)]">
            <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-[rgba(249,249,249,0.3)]">Kennzahl</span>
            <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-[rgba(249,249,249,0.3)] text-right">Baseline</span>
            <span></span>
            <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-[rgba(249,249,249,0.3)] text-right">Aktuell</span>
            <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-[rgba(249,249,249,0.3)] text-right">Veränderung</span>
          </div>

          {/* Data rows */}
          {KPI_ROWS.map((row, i) => {
            const baseVal = baseline[row.baseKey as keyof BaselineData] as number | undefined;
            const curVal = current[row.currentKey as keyof LatestKPI] as number | undefined;
            const delta = getDelta(baseVal, curVal, isLowerBetter(row.baseKey));
            const goalVal = row.goalKey ? baseline[row.goalKey as keyof BaselineData] as number | undefined : undefined;

            return (
              <div
                key={row.label}
                className="grid grid-cols-[1fr_130px_40px_130px_130px] gap-4 px-6 py-4 items-center transition-colors hover:bg-[rgba(249,249,249,0.02)]"
                style={{
                  borderBottom: i < KPI_ROWS.length - 1 ? "1px solid rgba(249,249,249,0.05)" : "none",
                }}
              >
                <div>
                  <span className="text-[13px] text-white font-medium">{row.label}</span>
                  {goalVal && (
                    <span className="text-[10px] text-[rgba(249,249,249,0.3)] ml-2">
                      Ziel: {formatValue(goalVal, row.format)}
                    </span>
                  )}
                </div>
                <span className="text-[14px] text-[rgba(249,249,249,0.5)] text-right font-mono" style={{ fontFamily: "var(--font-serif)" }}>
                  {formatValue(baseVal, row.format)}
                </span>
                <div className="flex justify-center">
                  <ArrowRight className="w-3.5 h-3.5 text-[rgba(249,249,249,0.2)]" />
                </div>
                <span className="text-[14px] text-white text-right font-mono" style={{ fontFamily: "var(--font-serif)" }}>
                  {formatValue(curVal, row.format)}
                </span>
                <div className="flex items-center justify-end gap-2">
                  {delta.pct !== null ? (
                    <>
                      {delta.direction === "up" ? (
                        <TrendingUp className="w-3.5 h-3.5 text-[#7FC29B]" />
                      ) : delta.direction === "down" ? (
                        <TrendingDown className="w-3.5 h-3.5 text-[#E87467]" />
                      ) : (
                        <Minus className="w-3.5 h-3.5 text-[rgba(249,249,249,0.3)]" />
                      )}
                      <span
                        className="text-[12px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          color: delta.direction === "up" ? "#7FC29B" : delta.direction === "down" ? "#E87467" : "rgba(249,249,249,0.5)",
                          background: delta.direction === "up" ? "rgba(127,194,155,0.1)" : delta.direction === "down" ? "rgba(232,116,103,0.1)" : "rgba(249,249,249,0.04)",
                        }}
                      >
                        {delta.pct > 0 ? "+" : ""}{delta.pct}%
                      </span>
                    </>
                  ) : (
                    <span className="text-[11px] text-[rgba(249,249,249,0.2)]">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info note */}
      <div className="fade-up text-center" style={{ animationDelay: "160ms" }}>
        <p className="text-[11px] text-[rgba(249,249,249,0.3)] tracking-[0.1em] uppercase">
          Baseline-Daten aus deinem Onboarding · Aktuelle Daten aus dem letzten KPI-Eintrag
        </p>
      </div>
    </div>
  );
}
