import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  BarChart3, Phone, Package, DollarSign, TrendingUp, TrendingDown,
  Calendar as CalendarIcon, Users, Target, Activity, ArrowUpRight, ArrowDownRight,
  AlertTriangle, CheckCircle2, XCircle, UserSearch, Trophy,
} from "lucide-react";
import {
  outboundKPIConfigs, marketingKPIConfigs, salesKPIConfigs, financeKPIConfigs,
} from "@/lib/kpiTrackerConfigs";

type TimeRange = "daily" | "weekly" | "monthly" | "custom";

interface Props {
  tenant: any | null;
  open: boolean;
  onClose: () => void;
}

// ═══════════════════════════════════════════
// KPI WEAKNESS ANALYSIS
// ═══════════════════════════════════════════

interface KPIStatus {
  label: string;
  icon: string;
  current: number | null;
  target: number;
  unit: string;
  status: "on-track" | "off-track" | "critical";
  percentOfTarget: number;
  impact: string;
  actions: string[];
  category: string;
}

function analyzeKPIs(metrics: any[], category: string, configs: typeof outboundKPIConfigs): KPIStatus[] {
  if (!metrics.length) return [];

  return configs.map((config) => {
    const current = config.getValue(metrics);
    if (current === null) return null;

    const ratio = config.higherIsBetter
      ? current / config.target
      : config.target / current;

    let status: KPIStatus["status"] = "on-track";
    if (ratio < (config.criticalThreshold || 0.5)) status = "critical";
    else if (ratio < 1) status = "off-track";

    // For inverse KPIs (lower is better), flip logic
    if (!config.higherIsBetter) {
      if (current > config.target * 2) status = "critical";
      else if (current > config.target) status = "off-track";
      else status = "on-track";
    }

    return {
      label: config.label,
      icon: config.icon,
      current,
      target: config.target,
      unit: config.unit,
      status,
      percentOfTarget: Math.round(ratio * 100),
      impact: config.getImpact(current, config.target),
      actions: config.actions,
      category,
    } as KPIStatus;
  }).filter(Boolean) as KPIStatus[];
}

function formatKPIValue(value: number, unit: string): string {
  if (unit === "€") return `${value.toLocaleString("de-DE")}€`;
  if (unit === "%") return `${value.toFixed(1)}%`;
  return value.toLocaleString("de-DE");
}

// ═══════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════

export function TenantDetailSheet({ tenant, open, onClose }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>("weekly");
  const [activeTab, setActiveTab] = useState("profil");
  const [metrics, setMetrics] = useState<any[]>([]);
  
  const [financial, setFinancial] = useState<any>(null);
  const [healthScores, setHealthScores] = useState<any[]>([]);
  const [icpCustomers, setIcpCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (tenant && open) loadDetail();
  }, [tenant, open, timeRange, dateFrom, dateTo]);

  const loadDetail = async () => {
    if (!tenant) return;
    setLoading(true);

    const effectiveRange = timeRange === "custom" ? "daily" : timeRange;
    const viewMap: Record<string, string> = {
      daily: "v_metrics_daily",
      weekly: "v_metrics_weekly",
      monthly: "v_metrics_monthly",
    };
    const dateCol = effectiveRange === "daily" ? "period_date" : "period_start";
    const limit = timeRange === "custom" ? 1000 : effectiveRange === "daily" ? 30 : effectiveRange === "weekly" ? 12 : 6;

    const currentMonth = new Date().toISOString().slice(0, 7) + "-01";

    let metricsQuery = supabase.from(viewMap[effectiveRange] as any).select("*").eq("tenant_id", tenant.id)
      .order(dateCol, { ascending: false });

    if (timeRange === "custom" && dateFrom) {
      metricsQuery = metricsQuery.gte(dateCol, format(dateFrom, "yyyy-MM-dd"));
    }
    if (timeRange === "custom" && dateTo) {
      metricsQuery = metricsQuery.lte(dateCol, format(dateTo, "yyyy-MM-dd"));
    }
    if (timeRange !== "custom") {
      metricsQuery = metricsQuery.limit(limit);
    }

    const [mRes, finRes, hRes, icpRes] = await Promise.all([
      metricsQuery,
      supabase.from("financial_tracking").select("*").eq("tenant_id", tenant.id).eq("period_month", currentMonth).maybeSingle(),
      supabase.from("health_scores").select("*").eq("tenant_id", tenant.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("icp_customers").select("*").eq("tenant_id", tenant.id).order("sort_order"),
    ]);

    setMetrics((mRes.data as any) || []);
    setFinancial(finRes.data);
    setHealthScores(hRes.data || []);
    setIcpCustomers(icpRes.data || []);
    setLoading(false);
  };

  // KPI Analysis from knowledge base
  const kpiAnalysis = useMemo(() => {
    if (!metrics.length) return [];
    const all = [
      ...analyzeKPIs(metrics, "Outbound", outboundKPIConfigs),
      ...analyzeKPIs(metrics, "Marketing", marketingKPIConfigs),
      ...analyzeKPIs(metrics, "Sales", salesKPIConfigs),
      ...analyzeKPIs(metrics, "Finanzen", financeKPIConfigs),
    ];
    // Sort: critical first, then off-track, then on-track
    return all.sort((a, b) => {
      const order = { critical: 0, "off-track": 1, "on-track": 2 };
      return order[a.status] - order[b.status];
    });
  }, [metrics]);

  const weakKPIs = kpiAnalysis.filter(k => k.status !== "on-track");
  const strongKPIs = kpiAnalysis.filter(k => k.status === "on-track");

  const n = (v: any) => parseFloat(String(v)) || 0;

  if (!tenant) return null;

  const health = healthScores[0];
  const fin = financial;
  const m = metrics[0]; // latest period

  const cash = n(fin?.cash_collected);
  const costs = n(fin?.costs_ads) + n(fin?.costs_tools) + n(fin?.costs_personnel) + n(fin?.costs_other);
  const cashflow = cash - costs;
  const margin = cash > 0 ? ((cashflow / cash) * 100).toFixed(1) : "–";

  const rangeLabel: Record<TimeRange, string> = { daily: "Tage", weekly: "Wochen", monthly: "Monate", custom: "Einträge" };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto glass-sidebar border-l border-border/50 p-0">
        <SheetHeader className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-lg">{tenant.company_name}</SheetTitle>
              <p className="text-xs text-muted-foreground">{tenant.contact_name || "Kein Kontakt hinterlegt"}</p>
            </div>
            {health && (
              <Badge variant="outline" className={`ml-auto ${
                health.color === "green" ? "border-success/50 text-success bg-success/10"
                : health.color === "amber" ? "border-warning/50 text-warning bg-warning/10"
                : "border-destructive/50 text-destructive bg-destructive/10"
              }`}>
                Health: {health.score}/100
              </Badge>
            )}
          </div>
        </SheetHeader>

        <Separator className="opacity-30" />


        <div className="p-6 pt-4 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-6 bg-secondary/50">
                <TabsTrigger value="profil" className="text-[10px]">📋 Profil</TabsTrigger>
                <TabsTrigger value="summary" className="text-[10px]">🎯 Analyse</TabsTrigger>
                <TabsTrigger value="marketing" className="text-[10px]">📈 Mktg</TabsTrigger>
                <TabsTrigger value="sales" className="text-[10px]">📞 Sales</TabsTrigger>
                <TabsTrigger value="finance" className="text-[10px]">💰 Fin.</TabsTrigger>
                <TabsTrigger value="icp" className="text-[10px]">👤 ICP</TabsTrigger>
              </TabsList>

              {/* Time range selector for data tabs */}
              {["summary", "marketing", "sales", "finance"].includes(activeTab) && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-1 bg-secondary/50 rounded-xl p-1">
                    {(["daily", "weekly", "monthly", "custom"] as const).map((r) => (
                      <Button
                        key={r}
                        variant={timeRange === r ? "default" : "ghost"}
                        size="sm"
                        className={`flex-1 text-xs rounded-lg h-7 ${timeRange === r ? "" : "text-muted-foreground"}`}
                        onClick={() => setTimeRange(r)}
                      >
                        {r === "daily" ? "📅 Täglich" : r === "weekly" ? "📊 Wöchentlich" : r === "monthly" ? "📈 Monatlich" : "📆 Zeitraum"}
                      </Button>
                    ))}
                  </div>
                  {timeRange === "custom" && (
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("flex-1 justify-start text-left text-xs h-8", !dateFrom && "text-muted-foreground")}>
                            <CalendarIcon className="mr-1.5 h-3 w-3" />
                            {dateFrom ? format(dateFrom, "dd.MM.yyyy", { locale: de }) : "Von"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} locale={de} />
                        </PopoverContent>
                      </Popover>
                      <span className="text-xs text-muted-foreground">–</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("flex-1 justify-start text-left text-xs h-8", !dateTo && "text-muted-foreground")}>
                            <CalendarIcon className="mr-1.5 h-3 w-3" />
                            {dateTo ? format(dateTo, "dd.MM.yyyy", { locale: de }) : "Bis"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className={cn("p-3 pointer-events-auto")} locale={de} />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground text-center">
                    {metrics.length} {rangeLabel[timeRange]} geladen
                  </p>
                </div>
              )}
              {/* ═══ PROFIL / ONBOARDING TAB ═══ */}
              <TabsContent value="profil" className="space-y-4 mt-4">
                <ProfilTabContent tenant={tenant} />
              </TabsContent>

              {/* ═══ KPI SUMMARY / WEAKNESS TAB ═══ */}
              <TabsContent value="summary" className="space-y-4 mt-4">
                {kpiAnalysis.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Keine KPI-Daten für diesen Zeitraum vorhanden</p>
                ) : (
                  <>
                    {/* Overview cards */}
                    <div className="grid grid-cols-3 gap-2">
                      <Card className="glass-card border-destructive/20">
                        <CardContent className="p-3 text-center">
                          <XCircle className="h-4 w-4 text-destructive mx-auto mb-1" />
                          <p className="text-lg font-bold text-destructive">{kpiAnalysis.filter(k => k.status === "critical").length}</p>
                          <p className="text-[9px] text-muted-foreground">Kritisch</p>
                        </CardContent>
                      </Card>
                      <Card className="glass-card border-warning/20">
                        <CardContent className="p-3 text-center">
                          <AlertTriangle className="h-4 w-4 text-warning mx-auto mb-1" />
                          <p className="text-lg font-bold text-warning">{kpiAnalysis.filter(k => k.status === "off-track").length}</p>
                          <p className="text-[9px] text-muted-foreground">Off-Track</p>
                        </CardContent>
                      </Card>
                      <Card className="glass-card border-success/20">
                        <CardContent className="p-3 text-center">
                          <CheckCircle2 className="h-4 w-4 text-success mx-auto mb-1" />
                          <p className="text-lg font-bold text-success">{strongKPIs.length}</p>
                          <p className="text-[9px] text-muted-foreground">On-Track</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Weak KPIs */}
                    {weakKPIs.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" /> Schwachstellen ({weakKPIs.length})
                        </p>
                        {weakKPIs.map((kpi, i) => (
                          <KPIWeaknessCard key={i} kpi={kpi} />
                        ))}
                      </div>
                    )}

                    {/* Strong KPIs */}
                    {strongKPIs.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-success flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Stärken ({strongKPIs.length})
                        </p>
                        {strongKPIs.map((kpi, i) => (
                          <Card key={i} className="glass-card border-success/10">
                            <CardContent className="p-3 flex items-center gap-3">
                              <span className="text-base">{kpi.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-medium truncate">{kpi.label}</p>
                                  <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/30 shrink-0 ml-2">
                                    {kpi.category}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {formatKPIValue(kpi.current!, kpi.unit)} / Ziel: {formatKPIValue(kpi.target, kpi.unit)}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* ═══ MARKETING TAB ═══ */}
              <TabsContent value="marketing" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <KpiCard label="Impressionen" value={n(m?.impressions).toLocaleString("de-DE")} icon={BarChart3} />
                  <KpiCard label="Kommentare" value={n(m?.comments)} icon={Activity} />
                  <KpiCard label="DMs gesendet" value={n(m?.dms_sent)} icon={Target} />
                  <KpiCard label="Leads gesamt" value={n(m?.leads_total)} icon={Target} />
                  <KpiCard label="MQL" value={n(m?.leads_qualified)} icon={Target} accent />
                  <KpiCard label="MQL-Quote" value={n(m?.lead_quality_rate) > 0 ? `${n(m?.lead_quality_rate)}%` : "–"} icon={TrendingUp} />
                  <KpiCard label="Follower" value={n(m?.followers_current).toLocaleString("de-DE")} icon={Users} />
                  <KpiCard label="Link-Klicks" value={n(m?.link_clicks)} icon={ArrowUpRight} />
                </div>

                {/* Trend mini chart */}
                {metrics.length > 1 && (
                  <Card className="glass-card">
                    <CardHeader className="py-3"><CardTitle className="text-xs text-muted-foreground">Trend – Leads ({rangeLabel[timeRange]})</CardTitle></CardHeader>
                    <CardContent className="pb-3">
                      <MiniBarChart data={metrics} field="leads_total" />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ═══ SALES TAB ═══ */}
              <TabsContent value="sales" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <KpiCard label="Anwahlen" value={n(m?.calls_made)} icon={Phone} />
                  <KpiCard label="Erreicht" value={n(m?.calls_reached)} icon={Phone} />
                  <KpiCard label="Erreichungsquote" value={n(m?.reach_rate) > 0 ? `${n(m?.reach_rate).toFixed(1)}%` : "–"} icon={TrendingUp} />
                  <KpiCard label="Settings geplant" value={n(m?.settings_planned)} icon={Target} />
                  <KpiCard label="Settings gehalten" value={n(m?.settings_held)} icon={Target} />
                  <KpiCard label="Setting Show" value={n(m?.setting_show_rate) > 0 ? `${n(m?.setting_show_rate).toFixed(1)}%` : "–"} icon={TrendingUp}
                    good={n(m?.setting_show_rate) >= 70} bad={n(m?.setting_show_rate) > 0 && n(m?.setting_show_rate) < 70} />
                  <KpiCard label="Closings geplant" value={n(m?.closings_planned)} icon={Target} />
                  <KpiCard label="Closings gehalten" value={n(m?.closings_held)} icon={Target} />
                  <KpiCard label="Closing Show" value={n(m?.closing_show_rate) > 0 ? `${n(m?.closing_show_rate).toFixed(1)}%` : "–"} icon={TrendingUp}
                    good={n(m?.closing_show_rate) >= 70} bad={n(m?.closing_show_rate) > 0 && n(m?.closing_show_rate) < 70} />
                  <KpiCard label="Deals" value={n(m?.deals)} icon={Target} accent />
                  <KpiCard label="Closing-Rate" value={n(m?.closing_rate) > 0 ? `${n(m?.closing_rate).toFixed(1)}%` : "–"} icon={TrendingUp}
                    good={n(m?.closing_rate) >= 20} bad={n(m?.closing_rate) > 0 && n(m?.closing_rate) < 20} />
                  <KpiCard label="Deal Volume" value={`${n(m?.deal_volume).toLocaleString("de-DE")}€`} icon={DollarSign} accent />
                </div>

                {metrics.length > 1 && (
                  <Card className="glass-card">
                    <CardHeader className="py-3"><CardTitle className="text-xs text-muted-foreground">Trend – Deals ({rangeLabel[timeRange]})</CardTitle></CardHeader>
                    <CardContent className="pb-3">
                      <MiniBarChart data={metrics} field="deals" />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>



              {/* ═══ FINANCE TAB ═══ */}
              <TabsContent value="finance" className="space-y-4 mt-4">
                {fin ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <KpiCard label="Cash Collected" value={`${cash.toLocaleString("de-DE")}€`} icon={DollarSign} accent />
                      <KpiCard label="MRR" value={`${n(fin.revenue_recurring).toLocaleString("de-DE")}€`} icon={TrendingUp} />
                      <KpiCard label="Einmalig" value={`${n(fin.revenue_onetime).toLocaleString("de-DE")}€`} icon={DollarSign} />
                      <KpiCard label="Kosten gesamt" value={`${costs.toLocaleString("de-DE")}€`} icon={ArrowDownRight} />
                    </div>

                    <Card className="glass-card">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Cashflow</span>
                          <span className={`font-bold ${cashflow >= 0 ? "text-success" : "text-destructive"}`}>
                            {cashflow.toLocaleString("de-DE")}€
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Marge</span>
                          <span className="font-medium">{margin === "–" ? "–" : `${margin}%`}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <p className="text-xs text-muted-foreground font-medium mt-2">Kostenaufschlüsselung</p>
                    <div className="grid grid-cols-2 gap-3">
                      <KpiCard label="Ads" value={`${n(fin.costs_ads).toLocaleString("de-DE")}€`} icon={ArrowDownRight} />
                      <KpiCard label="Tools" value={`${n(fin.costs_tools).toLocaleString("de-DE")}€`} icon={ArrowDownRight} />
                      <KpiCard label="Personal" value={`${n(fin.costs_personnel).toLocaleString("de-DE")}€`} icon={ArrowDownRight} />
                      <KpiCard label="Sonstige" value={`${n(fin.costs_other).toLocaleString("de-DE")}€`} icon={ArrowDownRight} />
                    </div>

                    <p className="text-xs text-muted-foreground font-medium mt-2">Rechnungen</p>
                    <div className="grid grid-cols-2 gap-3">
                      <KpiCard label="Offen" value={fin.invoices_open_count > 0 ? `${fin.invoices_open_count} (${n(fin.invoices_open_amount).toLocaleString("de-DE")}€)` : "–"} icon={CalendarIcon} />
                      <KpiCard label="Überfällig" value={fin.invoices_overdue_count > 0 ? `${fin.invoices_overdue_count} (${n(fin.invoices_overdue_amount).toLocaleString("de-DE")}€)` : "–"} icon={CalendarIcon}
                        bad={fin.invoices_overdue_count > 0} />
                      <KpiCard label="⌀ Zahlungsziel" value={fin.avg_days_to_payment > 0 ? `${fin.avg_days_to_payment} Tage` : "–"} icon={CalendarIcon} />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Keine Finanzdaten für diesen Monat</p>
                )}
              </TabsContent>

              {/* ═══ ICP TAB ═══ */}
              <TabsContent value="icp" className="space-y-4 mt-4">
                <ICPTabContent customers={icpCustomers} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════
// PROFIL TAB COMPONENT
// ═══════════════════════════════════════════

function ProfilRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  const display = value === null || value === undefined || value === "" ? "–" : String(value);
  return (
    <div className="flex justify-between text-xs border-b border-border/30 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[55%] truncate">{display}</span>
    </div>
  );
}

function ProfilTabContent({ tenant }: { tenant: any }) {
  const n = (v: any) => {
    const p = parseFloat(String(v));
    return isNaN(p) ? null : p;
  };
  const fmt = (v: any) => {
    const num = n(v);
    return num !== null ? `${num.toLocaleString("de-DE")}€` : "–";
  };

  const products = Array.isArray(tenant.product_palette) ? tenant.product_palette : [];

  return (
    <>
      {/* Company Info */}
      <Card className="glass-card">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-primary" /> Unternehmen</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-0">
          <ProfilRow label="Firma" value={tenant.company_name} />
          <ProfilRow label="Ansprechpartner" value={tenant.contact_name} />
          <ProfilRow label="Branche" value={tenant.industry} />
          <ProfilRow label="Teamgröße" value={tenant.team_size} />
          <ProfilRow label="Zielgruppe" value={tenant.target_audience} />
          <ProfilRow label="Website" value={tenant.website_url} />
          <ProfilRow label="LinkedIn" value={tenant.linkedin_url} />
          <ProfilRow label="Laufzeit" value={tenant.contract_duration} />
          <ProfilRow label="Angebotspreis" value={fmt(tenant.offer_price)} />
        </CardContent>
      </Card>

      {/* Product Palette */}
      {products.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs flex items-center gap-1.5"><Package className="h-3.5 w-3.5 text-primary" /> Produkt-Palette ({products.length})</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            {products.map((p: any, i: number) => (
              <div key={i} className="rounded-lg border border-border/30 p-2.5 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold">{p.name || `Produkt ${i + 1}`}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {p.price ? `${parseFloat(p.price).toLocaleString("de-DE")}€` : "–"} · {p.duration || "–"}
                  </Badge>
                </div>
                {p.description && <p className="text-[11px] text-muted-foreground">{p.description}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Baseline KPIs */}
      <Card className="glass-card">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-primary" /> Baseline-Kennzahlen</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-0">
          <ProfilRow label="Monatl. Umsatz (IST)" value={fmt(tenant.current_revenue_monthly)} />
          <ProfilRow label="Leads/Monat (IST)" value={n(tenant.current_leads_per_month)} />
          <ProfilRow label="Conversion-Rate" value={n(tenant.current_conversion_rate) !== null ? `${n(tenant.current_conversion_rate)}%` : "–"} />
          <ProfilRow label="LinkedIn Follower" value={n(tenant.linkedin_followers_current)} />
          <ProfilRow label="Bestandskunden" value={n(tenant.existing_customers)} />
          <ProfilRow label="Neukunden/Monat" value={n(tenant.new_customers_monthly)} />
          <ProfilRow label="Closing-Rate" value={n(tenant.closing_rate) !== null ? `${n(tenant.closing_rate)}%` : "–"} />
        </CardContent>
      </Card>

      {/* Costs */}
      <Card className="glass-card">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-primary" /> Kostenstruktur</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-0">
          <ProfilRow label="Ads-Budget" value={fmt(tenant.ads_spend_monthly)} />
          <ProfilRow label="Tool-Kosten" value={fmt(tenant.tools_costs_monthly)} />
          <ProfilRow label="Personalkosten" value={fmt(tenant.personnel_costs_monthly)} />
          <ProfilRow label="Delivery-Kosten" value={fmt(tenant.delivery_costs_monthly)} />
          <ProfilRow label="Sonstige Kosten" value={fmt(tenant.other_costs_monthly)} />
          <ProfilRow label="Marge" value={n(tenant.margin_percent) !== null ? `${n(tenant.margin_percent)}%` : "–"} />
        </CardContent>
      </Card>

      {/* Goals */}
      <Card className="glass-card">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-primary" /> Ziele</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-0">
          <ProfilRow label="Ziel Leads/Monat" value={n(tenant.goal_leads_monthly)} />
          <ProfilRow label="Ziel Umsatz/Monat" value={fmt(tenant.goal_revenue_monthly)} />
          <ProfilRow label="Zeitrahmen" value={tenant.goal_timeframe} />
          <ProfilRow label="Primäres Ziel" value={tenant.primary_goal} />
        </CardContent>
      </Card>
    </>
  );
}

// ═══════════════════════════════════════════
// ICP TAB COMPONENT
// ═══════════════════════════════════════════

function scoreICP(c: any) {
  let s = 0;
  if (c.payment_status === "Ja, komplett") s += 25;
  else if (c.payment_status === "Teilweise") s += 10;
  else if (c.payment_status === "Läuft noch") s += 15;
  if (c.payment_speed?.includes("Sofort")) s += 20;
  else if (c.payment_speed?.includes("Schnell")) s += 15;
  else if (c.payment_speed?.includes("Normal")) s += 8;
  else if (c.payment_speed?.includes("Langsam")) s += 3;
  if (c.close_duration === "1 Setter-Call") s += 20;
  else if (c.close_duration === "2 Calls") s += 15;
  else if (c.close_duration === "3 Calls") s += 10;
  else if (c.close_duration === "4+ Calls") s += 5;
  s += (c.collaboration_score || 0) * 1.5;
  s += (c.result_score || 0) * 1.5;
  if (c.problem_awareness?.includes("Sehr hoch")) s += 15;
  else if (c.problem_awareness?.includes("Mittel")) s += 8;
  const dv = parseFloat(c.deal_value) || 0;
  if (dv >= 3000) s += 10; else if (dv >= 1500) s += 5;
  return Math.round(s);
}

function ICPTabContent({ customers }: { customers: any[] }) {
  const valid = customers.filter(c => c.customer_name && c.industry);

  if (valid.length === 0) {
    return (
      <div className="text-center py-8">
        <UserSearch className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">Keine ICP-Daten vorhanden</p>
        <p className="text-xs text-muted-foreground mt-1">Werden beim Onboarding erfasst</p>
      </div>
    );
  }

  const scored = valid.map(c => ({ ...c, score: scoreICP(c) })).sort((a, b) => b.score - a.score);
  const maxScore = Math.max(...scored.map(s => s.score), 1);

  const topOf = (arr: string[]) => {
    const m: Record<string, number> = {};
    arr.filter(Boolean).forEach(v => m[v] = (m[v] || 0) + 1);
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };

  const branchen = topOf(valid.map(c => c.industry));
  const quelleTop = topOf(valid.map(c => c.lead_source));
  const closeTop = topOf(valid.map(c => c.close_duration));

  let totalDeal = 0, dealN = 0, payGood = 0;
  let fulfillmentDurations: number[] = [];
  let longFulfillmentClients: { name: string; days: number }[] = [];
  valid.forEach(c => {
    const dv = parseFloat(c.deal_value) || 0;
    if (dv > 0) { totalDeal += dv; dealN++; }
    if (c.payment_status === "Ja, komplett" || c.has_paid) payGood++;
    if (c.project_start_date && c.project_end_date) {
      const days = Math.round((new Date(c.project_end_date).getTime() - new Date(c.project_start_date).getTime()) / 86400000);
      fulfillmentDurations.push(days);
      if (days > 60) longFulfillmentClients.push({ name: c.customer_name, days });
    }
  });
  const avgDeal = dealN > 0 ? Math.round(totalDeal / dealN) : 0;
  const payRate = valid.length > 0 ? Math.round(payGood / valid.length * 100) : 0;
  const avgFulfillment = fulfillmentDurations.length > 0 ? Math.round(fulfillmentDurations.reduce((a, b) => a + b, 0) / fulfillmentDurations.length) : null;

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <>
      {/* Fulfillment Warning */}
      {longFulfillmentClients.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 space-y-1">
          <p className="text-xs font-bold flex items-center gap-1.5 text-warning">⚠️ Lange Fulfillment-Zeit erkannt</p>
          <p className="text-[11px] text-muted-foreground">Stau-Gefahr: Folgende Kunden hatten eine Projektdauer von über 60 Tagen:</p>
          {longFulfillmentClients.map(c => (
            <div key={c.name} className="flex justify-between text-xs">
              <span>{c.name}</span>
              <span className="font-semibold text-destructive">{c.days} Tage</span>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground mt-1">💡 Tipp: Onboarding & Projektstart straffen, um Engpässe zu vermeiden.</p>
        </div>
      )}

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1.5">
        <p className="text-xs font-bold flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-primary" /> Idealer Wunschkunde</p>
        {[
          ["Branche", branchen[0]?.[0] || "—"],
          ["Ø Deal-Value", `€${avgDeal.toLocaleString("de-DE")}`],
          ["Beste Quelle", quelleTop[0]?.[0] || "—"],
          ["Close-Dauer", closeTop[0]?.[0] || "—"],
          ["Zahlungsquote", `${payGood}/${valid.length} (${payRate}%)`],
          ...(avgFulfillment !== null ? [["Ø Fulfillment-Dauer", `${avgFulfillment} Tage`]] : []),
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between text-xs border-b border-border/30 py-1.5">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>

      <Card className="glass-card">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-primary" /> Top-Kunden</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="space-y-1.5">
            {scored.slice(0, 10).map((c, i) => {
              const pct = Math.round(c.score / maxScore * 100);
              return (
                <div key={c.id} className="flex items-center gap-2 text-xs py-1 border-b border-border/20">
                  <span className="w-5 text-center">{medals[i] || <span className="text-muted-foreground">{i + 1}</span>}</span>
                  <span className={`flex-1 truncate ${i < 3 ? "font-bold" : ""}`}>{c.customer_name}</span>
                  <span className="text-muted-foreground">{c.industry}</span>
                  <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${pct > 70 ? "bg-green-500" : pct > 40 ? "bg-yellow-500" : "bg-destructive"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="font-mono text-[10px] font-bold w-6 text-right">{c.score}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs">Branchen</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-1">
          {branchen.map(([b, count]) => (
            <div key={b} className="flex items-center gap-2 text-xs">
              <span className="w-24 truncate">{b}</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((count as number) / valid.length * 100)}%` }} />
              </div>
              <span className="font-mono text-[10px] text-primary font-semibold">{count}×</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

// ═══════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════

function KPIWeaknessCard({ kpi }: { kpi: KPIStatus }) {
  const [expanded, setExpanded] = useState(false);
  const isCritical = kpi.status === "critical";

  return (
    <Card className={`glass-card cursor-pointer transition-all ${isCritical ? "border-destructive/30" : "border-warning/30"}`}
      onClick={() => setExpanded(!expanded)}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <span className="text-base">{kpi.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium truncate">{kpi.label}</p>
              <Badge variant="outline" className={`text-[9px] shrink-0 ${
                isCritical ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-warning/10 text-warning border-warning/30"
              }`}>
                {isCritical ? "Kritisch" : "Off-Track"} · {kpi.category}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-sm font-bold ${isCritical ? "text-destructive" : "text-warning"}`}>
                {formatKPIValue(kpi.current!, kpi.unit)}
              </span>
              <span className="text-[10px] text-muted-foreground">/ Ziel: {formatKPIValue(kpi.target, kpi.unit)}</span>
              <span className={`text-[10px] font-medium ${isCritical ? "text-destructive" : "text-warning"}`}>
                ({kpi.percentOfTarget}%)
              </span>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
            <p className="text-xs text-muted-foreground italic">{kpi.impact}</p>
            <p className="text-[10px] font-semibold text-foreground">Empfohlene Maßnahmen:</p>
            <ul className="space-y-1">
              {kpi.actions.slice(0, 3).map((a, i) => (
                <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">→</span>
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniBarChart({ data, field }: { data: any[]; field: string }) {
  const n = (v: any) => parseFloat(String(v)) || 0;
  const reversed = [...data].reverse();
  const max = Math.max(...reversed.map(d => n(d[field])), 1);

  return (
    <div className="flex items-end gap-1 h-16">
      {reversed.map((d: any, i: number) => {
        const val = n(d[field]);
        const h = (val / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t bg-primary/60" style={{ height: `${Math.max(h, 4)}%` }} />
            <span className="text-[9px] text-muted-foreground">{val}</span>
          </div>
        );
      })}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, accent, good, bad }: {
  label: string; value: string | number; icon: any; accent?: boolean; good?: boolean; bad?: boolean;
}) {
  return (
    <Card className="glass-card">
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          accent ? "bg-primary/15" : "bg-secondary/60"
        }`}>
          <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground truncate">{label}</p>
          <p className={`text-sm font-semibold truncate ${
            good ? "text-success" : bad ? "text-destructive" : "text-foreground"
          }`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
