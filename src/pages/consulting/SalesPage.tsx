import { useMemo } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { SalesCharts } from "@/components/client/SalesCharts";
import { TimeRangeSelector } from "@/components/dashboard/TimeRangeSelector";
import { SalesKPIEntry } from "@/components/dashboard/SalesKPIEntry";
import { DailyKPIInput } from "@/components/dashboard/DailyKPIInput";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, PlusCircle, Zap, ArrowDown } from "lucide-react";
import { KPIMetricTracker } from "@/components/client/KPIMetricTracker";
import { salesKPIConfigs, outboundKPIConfigs } from "@/lib/kpiTrackerConfigs";

function SalesKPICards({ metrics }: { metrics: any[] }) {
  const latest = metrics?.[0];
  if (!latest) return null;
  const dmReplyRate = latest.dms_sent > 0 && latest.dms_replies != null
    ? `${((Number(latest.dms_replies) / Number(latest.dms_sent)) * 100).toFixed(1)}%` : "–";
  const cards = [
    { label: "Anwahlen", value: latest.calls_made ?? "–" },
    { label: "Erreichungsquote", value: latest.interest_rate != null ? `${Number(latest.interest_rate).toFixed(1)}%` : "–" },
    { label: "DMs gesendet", value: latest.dms_sent ?? "–" },
    { label: "DM-Antwort-Quote", value: dmReplyRate },
    { label: "Setting Show-Rate", value: latest.setting_show_rate != null ? `${Number(latest.setting_show_rate).toFixed(1)}%` : "–" },
    { label: "Closing Show-Rate", value: latest.closing_show_rate != null ? `${Number(latest.closing_show_rate).toFixed(1)}%` : "–" },
    { label: "Closing-Rate", value: latest.closing_rate != null ? `${Number(latest.closing_rate).toFixed(1)}%` : "–" },
    { label: "Deals", value: latest.deals ?? "–" },
    { label: "Cash Collected", value: latest.cash_collected != null ? `${Number(latest.cash_collected).toLocaleString("de-DE")}€` : "–" },
    { label: "Umsatz / Lead", value: latest.revenue_per_lead != null ? `${Number(latest.revenue_per_lead).toFixed(2)}€` : "–" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {cards.map(c => (
        <div key={c.label} className="glass-panel" style={{ padding: "14px" }}>
          <div className="relative z-[2] text-center">
            <div className="text-[10px] text-[rgba(249,249,249,0.4)] truncate tracking-[0.1em] uppercase">{c.label}</div>
            <div className="text-[16px] font-bold text-white mt-1" style={{ fontFamily: "var(--font-serif)" }}>{String(c.value)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WaterfallFunnel({ metrics }: { metrics: any[] }) {
  const totals = useMemo(() => {
    if (!metrics?.length) return null;
    const sum = (key: string) => metrics.reduce((s, m) => s + (Number(m[key]) || 0), 0);
    return {
      dms: sum("dms_sent"),
      replies: sum("dms_replies"),
      looms: sum("looms_sent"),
      termine: sum("appointments_scheduled") || sum("termine"),
      settings: sum("setting_calls") || sum("settings"),
      closings: sum("closing_calls") || sum("closings"),
      deals: sum("sales_closed") || sum("deals") || sum("abschluesse"),
      revenue: sum("cash_collected") || sum("revenue") || sum("umsatz"),
    };
  }, [metrics]);

  if (!totals || totals.dms === 0) {
    return (
      <div className="glass-panel fade-up">
        <div className="relative z-[2] text-center py-8">
          <p className="text-[13px] text-[rgba(249,249,249,0.4)]">Noch keine Daten für den Waterfall-Funnel</p>
          <p className="text-[11px] text-[rgba(249,249,249,0.25)] mt-1">Trage täglich deine Sales-KPIs ein</p>
        </div>
      </div>
    );
  }

  const stages = [
    { label: "DMs gesendet", value: totals.dms, color: "#8BB6E8" },
    { label: "Antworten", value: totals.replies, color: "#B49AE8" },
    { label: "Looms gesendet", value: totals.looms, color: "#E9CB8B" },
    { label: "Termine", value: totals.termine, color: "#C5A059" },
    { label: "Setting Calls", value: totals.settings, color: "#E9CB8B" },
    { label: "Closing Calls", value: totals.closings, color: "#C5A059" },
    { label: "Abschlüsse", value: totals.deals, color: "#7FC29B" },
  ].filter(s => s.value > 0);

  const max = Math.max(...stages.map(s => s.value));

  return (
    <div className="glass-panel fade-up">
      <div className="relative z-[2]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">Waterfall</span>
            <h3 className="text-[15px] text-white" style={{ fontFamily: "var(--font-serif)" }}>Sales Funnel · Conversion</h3>
          </div>
          {totals.revenue > 0 && (
            <div className="text-right">
              <div className="text-xl text-[#7FC29B]" style={{ fontFamily: "var(--font-serif)" }}>
                € {totals.revenue.toLocaleString("de-DE")}
              </div>
              <div className="text-[9px] text-[rgba(249,249,249,0.3)] tracking-[0.15em] uppercase">Umsatz</div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {stages.map((stage, i) => {
            const pct = max > 0 ? (stage.value / max) * 100 : 0;
            const convRate = i > 0 && stages[i - 1].value > 0
              ? ((stage.value / stages[i - 1].value) * 100).toFixed(1)
              : null;

            return (
              <div key={stage.label}>
                {i > 0 && (
                  <div className="flex items-center gap-2 py-1 pl-4">
                    <ArrowDown className="w-3 h-3 text-[rgba(249,249,249,0.15)]" />
                    {convRate && (
                      <span className="text-[10px] text-[rgba(249,249,249,0.3)]">{convRate}% Conversion</span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div className="w-[140px] flex-shrink-0 flex items-center justify-between">
                    <span className="text-[12px] text-[rgba(249,249,249,0.6)]">{stage.label}</span>
                  </div>
                  <div className="flex-1 h-8 bg-[rgba(249,249,249,0.04)] rounded-lg overflow-hidden border border-[rgba(249,249,249,0.06)]">
                    <div
                      className="h-full rounded-lg flex items-center justify-end pr-3 transition-all duration-1000"
                      style={{
                        width: `${Math.max(pct, 8)}%`,
                        background: `linear-gradient(90deg, ${stage.color}30, ${stage.color}80)`,
                        boxShadow: `0 0 12px ${stage.color}30`,
                      }}
                    >
                      <span className="text-[12px] font-bold text-white" style={{ fontFamily: "var(--font-serif)" }}>
                        {stage.value.toLocaleString("de-DE")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function SalesPage() {
  const { metrics, timeRange, setTimeRange, reload, tenantId } = useDashboardData();

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="glass-panel fade-up">
        <div className="relative z-[2] flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">Sales</span>
            <h2 className="text-xl text-white" style={{ fontFamily: "var(--font-serif)" }}>Sales & Pipeline</h2>
          </div>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="rounded-xl bg-[rgba(249,249,249,0.04)] border border-[rgba(249,249,249,0.08)]">
          <TabsTrigger value="dashboard" className="rounded-xl gap-2 data-[state=active]:bg-[rgba(197,160,89,0.15)] data-[state=active]:text-[#E9CB8B]">
            <BarChart3 className="h-4 w-4" /> Live-Dashboard
          </TabsTrigger>
          <TabsTrigger value="daily" className="rounded-xl gap-2 data-[state=active]:bg-[rgba(197,160,89,0.15)] data-[state=active]:text-[#E9CB8B]">
            <Zap className="h-4 w-4" /> Daily Tracking
          </TabsTrigger>
          <TabsTrigger value="entry" className="rounded-xl gap-2 data-[state=active]:bg-[rgba(197,160,89,0.15)] data-[state=active]:text-[#E9CB8B]">
            <PlusCircle className="h-4 w-4" /> Alle KPIs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4 space-y-6">
          <SalesKPICards metrics={metrics} />
          <WaterfallFunnel metrics={metrics} />
          <SalesCharts metrics={metrics} timeRange={timeRange} />
          <KPIMetricTracker configs={outboundKPIConfigs} metrics={metrics} title="Outbound-KPIs" />
          <KPIMetricTracker configs={salesKPIConfigs} metrics={metrics} title="Sales-Pipeline-KPIs" />
        </TabsContent>

        <TabsContent value="daily" className="mt-4 max-w-2xl">
          <DailyKPIInput tenantId={tenantId} onEntryAdded={reload} />
        </TabsContent>

        <TabsContent value="entry" className="mt-4">
          <SalesKPIEntry tenantId={tenantId} onEntryAdded={reload} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
