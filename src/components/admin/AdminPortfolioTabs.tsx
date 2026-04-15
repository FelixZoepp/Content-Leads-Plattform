import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Users, Target, Phone, DollarSign, AlertCircle } from "lucide-react";
import { TenantDetailSheet } from "./TenantDetailSheet";

interface Props {
  tenants: any[];
}

export function AdminPortfolioTabs({ tenants }: Props) {
  const [monthlyMetrics, setMonthlyMetrics] = useState<Record<string, any>>({});
  
  const [financials, setFinancials] = useState<Record<string, any>>({});
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);

  useEffect(() => {
    loadAllData();
  }, [tenants]);

  const loadAllData = async () => {
    const tenantIds = tenants.map(t => t.id);
    if (tenantIds.length === 0) return;

    // Monthly metrics (current month)
    const { data: metricsData } = await supabase
      .from("v_metrics_monthly" as any)
      .select("*")
      .in("tenant_id", tenantIds)
      .gte("period_start", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0])
      .limit(100);

    const metricsMap: Record<string, any> = {};
    (metricsData || []).forEach((m: any) => { metricsMap[m.tenant_id] = m; });
    setMonthlyMetrics(metricsMap);




    // Financial (current month)
    const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
    const { data: finData } = await supabase
      .from("financial_tracking")
      .select("*")
      .in("tenant_id", tenantIds)
      .eq("period_month", currentMonth);

    const finMap: Record<string, any> = {};
    (finData || []).forEach((f: any) => { finMap[f.tenant_id] = f; });
    setFinancials(finMap);
  };

  const n = (v: any) => parseFloat(String(v)) || 0;

  // Aggregates
  const totalLeads = tenants.reduce((s, t) => s + n(monthlyMetrics[t.id]?.leads_total), 0);
  const totalMQL = tenants.reduce((s, t) => s + n(monthlyMetrics[t.id]?.leads_qualified), 0);
  const totalCalls = tenants.reduce((s, t) => s + n(monthlyMetrics[t.id]?.calls_made), 0);
  const totalDeals = tenants.reduce((s, t) => s + n(monthlyMetrics[t.id]?.deals), 0);
  const totalCash = tenants.reduce((s, t) => s + n(monthlyMetrics[t.id]?.cash_collected), 0);
  const totalRevenue = tenants.reduce((s, t) => s + n(financials[t.id]?.cash_collected), 0);
  const totalCosts = tenants.reduce((s, t) => {
    const f = financials[t.id];
    return s + n(f?.costs_ads) + n(f?.costs_tools) + n(f?.costs_personnel) + n(f?.costs_other);
  }, 0);
  const totalCashflow = totalRevenue - totalCosts;




  return (
    <div className="space-y-6">
      {/* Top-level KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <SummaryCard icon={Target} label="Leads (Monat)" value={totalLeads} />
        <SummaryCard icon={Target} label="MQL" value={totalMQL} />
        <SummaryCard icon={Phone} label="Anwahlen" value={totalCalls} />
        <SummaryCard icon={TrendingUp} label="Deals" value={totalDeals} />
        <SummaryCard icon={DollarSign} label="Cash Collected" value={`${totalCash.toLocaleString("de-DE")}€`} />
        <SummaryCard icon={DollarSign} label="Cashflow" value={`${totalCashflow.toLocaleString("de-DE")}€`}
          trend={totalCashflow >= 0 ? "up" : "down"} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <SummaryCard icon={Users} label="Aktive Kunden" value={tenants.length} small />
        <SummaryCard icon={AlertCircle} label="Überfällige Rechnungen" value={tenants.reduce((s, t) => s + (financials[t.id]?.invoices_overdue_count || 0), 0)}
          small trend={tenants.reduce((s, t) => s + (financials[t.id]?.invoices_overdue_count || 0), 0) > 0 ? "down" : undefined} />
      </div>

      {/* Tabs for detail views */}
      <Tabs defaultValue="marketing" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="marketing">📈 Marketing</TabsTrigger>
          <TabsTrigger value="sales">📞 Sales</TabsTrigger>
          <TabsTrigger value="finance">💰 Finanzen</TabsTrigger>
        </TabsList>

        {/* Marketing Tab */}
        <TabsContent value="marketing">
          <Card>
            <CardHeader><CardTitle className="text-base">Marketing-Übersicht</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Kunde</th>
                      <th className="text-right p-2">Impressionen</th>
                      <th className="text-right p-2">Kommentare</th>
                      <th className="text-right p-2">DMs</th>
                      <th className="text-right p-2">Leads</th>
                      <th className="text-right p-2">MQL</th>
                      <th className="text-right p-2">MQL-Quote</th>
                      <th className="text-right p-2">Follower</th>
                      <th className="text-center p-2">Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map(t => {
                      const m = monthlyMetrics[t.id] || {};
                      return (
                        <tr key={t.id} className="border-b hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => setSelectedTenant(t)}>
                          <td className="p-2 font-medium">{t.company_name}</td>
                          <td className="p-2 text-right">{n(m.impressions).toLocaleString("de-DE")}</td>
                          <td className="p-2 text-right">{n(m.comments)}</td>
                          <td className="p-2 text-right">{n(m.dms_sent)}</td>
                          <td className="p-2 text-right">{n(m.leads_total)}</td>
                          <td className="p-2 text-right">{n(m.leads_qualified)}</td>
                          <td className="p-2 text-right">
                            {n(m.lead_quality_rate) > 0 ? `${n(m.lead_quality_rate)}%` : "–"}
                          </td>
                          <td className="p-2 text-right">{n(m.followers_current).toLocaleString("de-DE")}</td>
                          <td className="p-2 text-center">
                            <HealthBadge health={t.latestHealth} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales">
          <Card>
            <CardHeader><CardTitle className="text-base">Sales-Übersicht</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Kunde</th>
                      <th className="text-right p-2">Anwahlen</th>
                      <th className="text-right p-2">Erreicht</th>
                      <th className="text-right p-2">Erreich. %</th>
                      <th className="text-right p-2">Termine</th>
                      <th className="text-right p-2">Sett. Show %</th>
                      <th className="text-right p-2">Clos. Show %</th>
                      <th className="text-right p-2">Deals</th>
                      <th className="text-right p-2">Closing %</th>
                      <th className="text-right p-2">Cash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map(t => {
                      const m = monthlyMetrics[t.id] || {};
                      return (
                        <tr key={t.id} className="border-b hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => setSelectedTenant(t)}>
                          <td className="p-2 font-medium">{t.company_name}</td>
                          <td className="p-2 text-right">{n(m.calls_made)}</td>
                          <td className="p-2 text-right">{n(m.calls_reached)}</td>
                          <td className="p-2 text-right">{n(m.reach_rate) > 0 ? `${n(m.reach_rate)}%` : "–"}</td>
                          <td className="p-2 text-right">{n(m.appointments)}</td>
                          <td className="p-2 text-right">
                            <RateBadge value={n(m.setting_show_rate)} threshold={70} />
                          </td>
                          <td className="p-2 text-right">
                            <RateBadge value={n(m.closing_show_rate)} threshold={70} />
                          </td>
                          <td className="p-2 text-right font-medium">{n(m.deals)}</td>
                          <td className="p-2 text-right">
                            <RateBadge value={n(m.closing_rate)} threshold={20} />
                          </td>
                          <td className="p-2 text-right font-medium">{n(m.cash_collected).toLocaleString("de-DE")}€</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>




        {/* Finance Tab */}
        <TabsContent value="finance">
          <Card>
            <CardHeader><CardTitle className="text-base">Finanzen-Übersicht (aktueller Monat)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Kunde</th>
                      <th className="text-right p-2">Cash</th>
                      <th className="text-right p-2">MRR</th>
                      <th className="text-right p-2">Kosten</th>
                      <th className="text-right p-2">Cashflow</th>
                      <th className="text-right p-2">Marge</th>
                      <th className="text-right p-2">Offene RE</th>
                      <th className="text-right p-2">Überfällig</th>
                      <th className="text-right p-2">⌀ Zahlungsziel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map(t => {
                      const f = financials[t.id];
                      const cash = n(f?.cash_collected);
                      const costs = n(f?.costs_ads) + n(f?.costs_tools) + n(f?.costs_personnel) + n(f?.costs_other);
                      const cf = cash - costs;
                      const margin = cash > 0 ? ((cf / cash) * 100).toFixed(1) : "–";

                      return (
                        <tr key={t.id} className="border-b hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => setSelectedTenant(t)}>
                          <td className="p-2 font-medium">{t.company_name}</td>
                          <td className="p-2 text-right">{cash.toLocaleString("de-DE")}€</td>
                          <td className="p-2 text-right">{n(f?.revenue_recurring).toLocaleString("de-DE")}€</td>
                          <td className="p-2 text-right">{costs.toLocaleString("de-DE")}€</td>
                          <td className={`p-2 text-right font-medium ${cf >= 0 ? "text-green-600" : "text-destructive"}`}>
                            {cf.toLocaleString("de-DE")}€
                          </td>
                          <td className="p-2 text-right">{margin === "–" ? "–" : `${margin}%`}</td>
                          <td className="p-2 text-right">
                            {f?.invoices_open_count > 0
                              ? `${f.invoices_open_count} (${n(f.invoices_open_amount).toLocaleString("de-DE")}€)`
                              : "–"}
                          </td>
                          <td className="p-2 text-right">
                            {f?.invoices_overdue_count > 0 ? (
                              <span className="text-destructive font-medium">
                                {f.invoices_overdue_count} ({n(f.invoices_overdue_amount).toLocaleString("de-DE")}€)
                              </span>
                            ) : "–"}
                          </td>
                          <td className="p-2 text-right">{f?.avg_days_to_payment > 0 ? `${f.avg_days_to_payment}d` : "–"}</td>
                        </tr>
                      );
                    })}
                    {/* Totals row */}
                    <tr className="border-t-2 font-bold bg-muted/30">
                      <td className="p-2">Gesamt</td>
                      <td className="p-2 text-right">{totalRevenue.toLocaleString("de-DE")}€</td>
                      <td className="p-2 text-right">
                        {tenants.reduce((s, t) => s + n(financials[t.id]?.revenue_recurring), 0).toLocaleString("de-DE")}€
                      </td>
                      <td className="p-2 text-right">{totalCosts.toLocaleString("de-DE")}€</td>
                      <td className={`p-2 text-right ${totalCashflow >= 0 ? "text-green-600" : "text-destructive"}`}>
                        {totalCashflow.toLocaleString("de-DE")}€
                      </td>
                      <td className="p-2 text-right">
                        {totalRevenue > 0 ? `${((totalCashflow / totalRevenue) * 100).toFixed(1)}%` : "–"}
                      </td>
                      <td className="p-2 text-right">
                        {tenants.reduce((s, t) => s + (financials[t.id]?.invoices_open_count || 0), 0) || "–"}
                      </td>
                      <td className="p-2 text-right text-destructive">
                        {(() => { const ov = tenants.reduce((s, t) => s + (financials[t.id]?.invoices_overdue_count || 0), 0); return ov > 0 ? ov : "–"; })()}
                      </td>
                      <td className="p-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TenantDetailSheet
        tenant={selectedTenant}
        open={!!selectedTenant}
        onClose={() => setSelectedTenant(null)}
      />
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, trend, small }: {
  icon: any; label: string; value: string | number; trend?: "up" | "down"; small?: boolean;
}) {
  return (
    <Card>
      <CardContent className={`${small ? "p-3" : "p-4"} flex flex-col items-center text-center`}>
        <Icon className={`${small ? "h-4 w-4" : "h-5 w-5"} text-muted-foreground mb-1`} />
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`font-bold ${small ? "text-lg" : "text-xl"} ${
          trend === "up" ? "text-green-600" : trend === "down" ? "text-destructive" : "text-foreground"
        }`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function HealthBadge({ health }: { health?: any }) {
  if (!health) return <span className="text-muted-foreground">–</span>;
  const color = health.color === "green" ? "bg-green-100 text-green-800 border-green-300"
    : health.color === "amber" ? "bg-yellow-100 text-yellow-800 border-yellow-300"
    : "bg-red-100 text-red-800 border-red-300";
  return <Badge variant="outline" className={color}>{health.score}</Badge>;
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-muted-foreground">–</span>;
  const map: Record<string, { label: string; cls: string }> = {
    onboarding: { label: "Onboarding", cls: "bg-blue-100 text-blue-800 border-blue-300" },
    active: { label: "Aktiv", cls: "bg-green-100 text-green-800 border-green-300" },
    paused: { label: "Pausiert", cls: "bg-yellow-100 text-yellow-800 border-yellow-300" },
    completed: { label: "Fertig", cls: "bg-primary/10 text-primary border-primary/20" },
    cancelled: { label: "Abgebr.", cls: "bg-red-100 text-red-800 border-red-300" },
  };
  const s = map[status] || { label: status, cls: "" };
  return <Badge variant="outline" className={s.cls}>{s.label}</Badge>;
}

function RateBadge({ value, threshold }: { value: number; threshold: number }) {
  if (value <= 0) return <span className="text-muted-foreground">–</span>;
  return (
    <span className={value >= threshold ? "text-green-600" : "text-destructive"}>
      {value}%
    </span>
  );
}
