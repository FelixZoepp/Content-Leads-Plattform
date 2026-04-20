import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ASSET_TYPES } from "@/hooks/useCashflowData";
import { Printer, Building2, Target, BarChart3, FileText, Check, Clock } from "lucide-react";

interface TenantData {
  company_name?: string;
  contact_name?: string;
  industry?: string;
  team_size?: string;
  target_audience?: string;
  website_url?: string;
  linkedin_url?: string;
  current_leads_per_month?: string;
  current_conversion_rate?: string;
  cost_per_lead?: string;
  cost_per_appointment?: string;
  revenue_recurring?: string;
  revenue_onetime?: string;
  total_customers?: string;
  new_customers_monthly?: string;
  closing_rate?: string;
  goal_leads_monthly?: string;
  goal_revenue_monthly?: string;
  goal_timeframe?: string;
  primary_goal?: string;
}

export default function ClientReport() {
  const { user, tenantId } = useAuth();
  const [tenant, setTenant] = useState<TenantData>({});
  const [generatedAssets, setGeneratedAssets] = useState<Set<string>>(new Set());
  const [icpCount, setIcpCount] = useState(0);
  const [tasksDone, setTasksDone] = useState(0);
  const [tasksTotal, setTasksTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !tenantId) return;
    (async () => {
      const [tenantRes, assetsRes, icpRes, tasksRes] = await Promise.all([
        supabase.from("tenants").select("*").eq("id", tenantId).single(),
        (supabase as any).from("generated_assets").select("asset_type").eq("user_id", user.id),
        (supabase as any).from("icp_customers").select("id").eq("user_id", user.id),
        (supabase as any).from("daily_tasks").select("id, is_done").eq("user_id", user.id),
      ]);

      if (tenantRes.data) setTenant(tenantRes.data);
      if (assetsRes.data) setGeneratedAssets(new Set(assetsRes.data.map((r: any) => r.asset_type)));
      if (icpRes.data) setIcpCount(icpRes.data.length);
      if (tasksRes.data) {
        setTasksTotal(tasksRes.data.length);
        setTasksDone(tasksRes.data.filter((t: any) => t.is_done).length);
      }
      setLoading(false);
    })();
  }, [user, tenantId]);

  const now = new Date();
  const dateStr = now.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
  const assetsDone = ASSET_TYPES.filter(a => generatedAssets.has(a.key)).length;
  const taskPct = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Print button */}
      <div className="flex justify-end print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold text-[#E9CB8B] border border-[rgba(197,160,89,0.3)] hover:bg-[rgba(197,160,89,0.08)] transition"
        >
          <Printer className="w-4 h-4" /> Report drucken / exportieren
        </button>
      </div>

      {/* Report Header */}
      <div
        className="glass-panel fade-up"
        style={{
          background: "linear-gradient(135deg, rgba(197,160,89,0.14), rgba(10,11,11,0.6))",
          borderColor: "rgba(197,160,89,0.2)",
        }}
      >
        <div className="relative z-[2]">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 flex items-center justify-center text-white text-xl"
              style={{
                background: "linear-gradient(135deg, #E9CB8B 0%, #C5A059 45%, #775A19 100%)",
                fontFamily: "var(--font-serif)",
              }}
            >
              C
            </div>
            <div>
              <div className="text-[11px] tracking-[0.18em] uppercase text-white" style={{ fontFamily: "var(--font-serif)" }}>
                Content-Leads
              </div>
              <div className="text-[9px] tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)]">
                Client Report
              </div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-[11px] text-[rgba(249,249,249,0.4)] tracking-[0.15em] uppercase">{dateStr}</div>
            </div>
          </div>

          <h1 className="text-2xl text-white mb-1" style={{ fontFamily: "var(--font-serif)" }}>
            {tenant.company_name || "Client Report"}
          </h1>
          <p className="text-[13px] text-[rgba(249,249,249,0.5)]">
            Ansprechpartner: {tenant.contact_name || "—"} · {tenant.industry || "—"} · Team: {tenant.team_size || "—"}
          </p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: BarChart3, label: "Assets generiert", value: `${assetsDone}/${ASSET_TYPES.length}` },
          { icon: Target, label: "ICP-Profile", value: String(icpCount) },
          { icon: FileText, label: "Aufgaben erledigt", value: `${taskPct}%` },
          { icon: Building2, label: "Fahrplan-Tag", value: `${tasksDone}/${tasksTotal}` },
        ].map((kpi, i) => (
          <div key={i} className="glass-panel fade-up" style={{ animationDelay: `${(i + 1) * 60}ms` }}>
            <div className="relative z-[2]">
              <kpi.icon className="w-4 h-4 text-[#E9CB8B] mb-2" />
              <div className="text-xl text-white" style={{ fontFamily: "var(--font-serif)" }}>{kpi.value}</div>
              <div className="text-[9px] text-[rgba(249,249,249,0.4)] tracking-[0.2em] uppercase mt-1">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Baseline Kennzahlen */}
      <div className="glass-panel fade-up" style={{ animationDelay: "300ms" }}>
        <div className="relative z-[2]">
          <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">Onboarding</span>
          <h2 className="text-lg text-white mb-4" style={{ fontFamily: "var(--font-serif)" }}>Eingereichte Kennzahlen</h2>

          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {[
              { label: "Leads / Monat", value: tenant.current_leads_per_month },
              { label: "Conversion Rate", value: tenant.current_conversion_rate, suffix: "%" },
              { label: "Cost per Lead", value: tenant.cost_per_lead, prefix: "€ " },
              { label: "Cost per Appointment", value: tenant.cost_per_appointment, prefix: "€ " },
              { label: "Closing Rate", value: tenant.closing_rate, suffix: "%" },
              { label: "Umsatz (recurring)", value: tenant.revenue_recurring, prefix: "€ " },
              { label: "Umsatz (einmalig)", value: tenant.revenue_onetime, prefix: "€ " },
              { label: "Kunden gesamt", value: tenant.total_customers },
              { label: "Neue Kunden / Monat", value: tenant.new_customers_monthly },
              { label: "Ziel Leads / Monat", value: tenant.goal_leads_monthly },
              { label: "Ziel Umsatz / Monat", value: tenant.goal_revenue_monthly, prefix: "€ " },
              { label: "Zeitrahmen", value: tenant.goal_timeframe },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2"
                style={{ borderBottom: "1px solid rgba(249,249,249,0.05)" }}
              >
                <span className="text-[12px] text-[rgba(249,249,249,0.5)]">{item.label}</span>
                <span className="text-[13px] text-white font-medium" style={{ fontFamily: "var(--font-serif)" }}>
                  {item.value ? `${item.prefix || ""}${item.value}${item.suffix || ""}` : "—"}
                </span>
              </div>
            ))}
          </div>

          {tenant.primary_goal && (
            <div className="mt-4 p-3 rounded-lg" style={{ background: "rgba(197,160,89,0.06)", border: "1px solid rgba(197,160,89,0.15)" }}>
              <span className="text-[10px] text-[#E9CB8B] tracking-[0.2em] uppercase block mb-1">Primäres Ziel</span>
              <span className="text-[13px] text-white">{tenant.primary_goal}</span>
            </div>
          )}
        </div>
      </div>

      {/* Asset Status */}
      <div className="glass-panel fade-up" style={{ animationDelay: "380ms" }}>
        <div className="relative z-[2]">
          <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">Playbook</span>
          <h2 className="text-lg text-white mb-4" style={{ fontFamily: "var(--font-serif)" }}>Generierte Assets</h2>

          <div className="grid grid-cols-2 gap-2">
            {ASSET_TYPES.map((asset) => {
              const done = generatedAssets.has(asset.key);
              return (
                <div key={asset.key} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ background: done ? "rgba(127,194,155,0.04)" : "transparent" }}>
                  {done ? (
                    <Check className="w-4 h-4 text-[#7FC29B] shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-[rgba(249,249,249,0.2)] shrink-0" />
                  )}
                  <span className={`text-[12px] ${done ? "text-white" : "text-[rgba(249,249,249,0.4)]"}`}>
                    {asset.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 fade-up" style={{ animationDelay: "460ms" }}>
        <p className="text-[10px] text-[rgba(249,249,249,0.25)] tracking-[0.15em] uppercase">
          Content-Leads Consulting Plattform · {dateStr}
        </p>
      </div>
    </div>
  );
}
