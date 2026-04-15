import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, Flame, Mail, AlertTriangle, CheckCircle, XCircle, Clock, Target, PhoneCall, Megaphone, TrendingDown, Zap } from "lucide-react";

// ═══════════════════════════════════════════════════
// BENCHMARKS & EVALUATION
// ═══════════════════════════════════════════════════

const BENCHMARKS: Record<string, Record<string, any>> = {
  daily: {
    connection_requests: { label: "Connection Requests", green: 20, yellow: 10, dir: "higher" },
    cold_mails: { label: "Cold Mails", green: 50, yellow: 20, dir: "higher" },
    anwahlen: { label: "Anwahlen", green: 150, yellow: 50, dir: "higher" },
    erreicht_entscheider: { label: "Erreichbarkeit", greenPct: 25, yellowPct: 15, dir: "higher", rel: "anwahlen", isPct: true },
    gatekeeper: { label: "Gatekeeper Rate", greenPct: 10, yellowPct: 20, dir: "lower", rel: "anwahlen", isPct: true },
    callbacks: { label: "Callbacks", green: null },
    termine_gebucht: { label: "Termine gebucht", green: null },
  },
  weekly: {
    leadposts: { label: "Leadposts", green: 3, yellow: 2, dir: "higher" },
    impressions: { label: "Impressions / Post", green: 20000, yellow: 5000, dir: "higher" },
    kommentare: { label: "Kommentare / Post", green: 200, yellow: 50, dir: "higher" },
    kommentar_leads: { label: "Kommentar-Leads", green: 100, yellow: 25, dir: "higher" },
    funnel_besucher: { label: "Funnelbesucher", green: null },
    funnel_eintragungen: { label: "Funneleintragungen", green: null },
    funnel_conversion: { label: "Funnel-zu-Lead CR", green: 40, yellow: 20, dir: "higher", unit: "%" },
    kommentar_conversion: { label: "Kommentar-zu-Lead CR", green: 30, yellow: 15, dir: "higher", unit: "%" },
    settings_gesamt: { label: "Settings / Woche", green: 20, yellow: 10, dir: "higher" },
    showup_setting: { label: "Show-Up Setting", green: 80, yellow: 60, dir: "higher", unit: "%" },
    quali_quote: { label: "Quali-Quote", green: 25, yellow: 15, dir: "higher", greenMax: 30, unit: "%" },
    showup_closing: { label: "Show-Up Closing", green: 85, yellow: 70, dir: "higher", unit: "%" },
    closing_rate: { label: "Closing Rate", green: 70, yellow: 50, dir: "higher", greenMax: 80, unit: "%" },
    dealwert: { label: "Dealwert", green: 6000, yellow: 3000, dir: "higher", unit: "€" },
    sales_cycle: { label: "Sales Cycle", green: 7, yellow: 14, dir: "lower", unit: " Tage" },
  },
  monthly: {
    mrr_growth: { label: "MRR Wachstum", green: 15, yellow: 5, dir: "higher", unit: "%" },
    churn: { label: "Churn Rate", green: 5, yellow: 10, dir: "lower", unit: "%" },
    clv: { label: "CLV", green: 15000, yellow: 8000, dir: "higher", unit: "€" },
    umsatz_growth: { label: "Umsatzwachstum", green: 20, yellow: 10, dir: "higher", unit: "%" },
    cpa_ratio: { label: "CLV:CPA Ratio", green: 5, yellow: 3, dir: "higher", unit: ":1" },
  },
};

const DAILY_REQUIRED_FIELDS = ["connection_requests", "cold_mails", "anwahlen", "erreicht_entscheider", "gatekeeper", "termine_gebucht"];

function evaluateKPI(bench: any, value: any, allValues?: any): string {
  if (bench.green === null && !bench.greenPct) return "neutral";
  if (value === undefined || value === null || value === "") return "empty";
  if (bench.isPct && bench.rel) {
    const base = allValues?.[bench.rel];
    if (!base || base === 0) return "neutral";
    const pct = (value / base) * 100;
    if (bench.dir === "lower") {
      if (pct <= bench.greenPct) return "green";
      if (pct <= bench.yellowPct) return "yellow";
      return "red";
    }
    if (pct >= bench.greenPct) return "green";
    if (pct >= bench.yellowPct) return "yellow";
    return "red";
  }
  if (bench.greenMax !== undefined && value > bench.greenMax) return "yellow";
  if (bench.dir === "lower") {
    if (value <= bench.green) return "green";
    if (value <= bench.yellow) return "yellow";
    return "red";
  }
  if (value >= bench.green) return "green";
  if (value >= bench.yellow) return "yellow";
  return "red";
}

function getCustomerScores(customer: any) {
  const scores = { green: 0, yellow: 0, red: 0, total: 0 };
  for (const [cat, benchmarks] of Object.entries(BENCHMARKS)) {
    const data = customer[cat];
    for (const [key, bench] of Object.entries(benchmarks)) {
      const status = evaluateKPI(bench, data?.[key], data);
      if (status === "green") scores.green++;
      if (status === "yellow") scores.yellow++;
      if (status === "red") scores.red++;
      if (status !== "neutral" && status !== "empty") scores.total++;
    }
  }
  return scores;
}

function getDaysSinceSubmission(lastSubmission: string | null) {
  if (!lastSubmission) return Infinity;
  return Math.floor((Date.now() - new Date(lastSubmission).getTime()) / 86400000);
}

function getSubmissionStatus(customer: any) {
  const daysSince = getDaysSinceSubmission(customer.last_daily_submission);
  if (daysSince > 2) return "missing";
  const data = customer.daily || {};
  const filled = DAILY_REQUIRED_FIELDS.filter((f) => data[f] !== undefined && data[f] !== null && data[f] !== "").length;
  if (filled < DAILY_REQUIRED_FIELDS.length) return "partial";
  return "submitted";
}

function getOverallStatus(scores: any, submissionStatus: string) {
  if (submissionStatus === "missing") return "missing";
  if (scores.red >= 3) return "red";
  if (scores.red >= 1 || scores.yellow >= 4) return "yellow";
  return "green";
}

// Action Plan Generator

// ═══════════════════════════════════════════════════
// ACTION PLAN GENERATOR
// ═══════════════════════════════════════════════════

interface ActionItem {
  icon: typeof Target;
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  impact: string;
}

function generateActionPlan(customer: any): ActionItem[] {
  const actions: ActionItem[] = [];
  const d = customer.daily || {};
  const w = customer.weekly || {};
  const m = customer.monthly || {};

  // Missing data → top priority
  if (customer.overallStatus === "missing") {
    actions.push({
      icon: PhoneCall,
      priority: "high",
      title: "Sofort anrufen",
      description: `${customer.contact} hat ${customer.last_daily_submission ? `seit ${formatTimeAgo(customer.last_daily_submission).toLowerCase()} keine Daten eingetragen` : "noch nie Daten eingetragen"}. Frage nach Blockern und biete eine gemeinsame Eingabe an.`,
      impact: "Reaktivierung & Accountability",
    });
    return actions;
  }

  // Outbound activity too low
  if (d.anwahlen !== undefined && d.anwahlen < 50) {
    actions.push({
      icon: PhoneCall,
      priority: "high",
      title: "Outbound-Aktivität massiv steigern",
      description: `Nur ${d.anwahlen} Anwahlen (Ziel: 150). Feste Telefonblöcke von 2h morgens einführen. Power-Hour-Challenge vorschlagen.`,
      impact: "3x mehr Termine bei Zielerreichung",
    });
  } else if (d.anwahlen !== undefined && d.anwahlen < 150) {
    actions.push({
      icon: PhoneCall,
      priority: "medium",
      title: "Anwahlen auf Zielniveau bringen",
      description: `${d.anwahlen}/150 Anwahlen. Noch ${150 - d.anwahlen} mehr pro Tag nötig. Prüfe ob Kontaktlisten ausreichen und CRM-Workflow optimiert ist.`,
      impact: "+30-50% mehr Termine erwartet",
    });
  }

  // Gatekeeper rate too high
  if (d.anwahlen > 0 && d.gatekeeper > 0) {
    const gkRate = (d.gatekeeper / d.anwahlen) * 100;
    if (gkRate > 20) {
      actions.push({
        icon: Zap,
        priority: "high",
        title: "Gatekeeper-Durchbruch trainieren",
        description: `${gkRate.toFixed(0)}% Gatekeeper-Rate (Ziel: <10%). Skript für Gatekeeper-Überwindung überarbeiten. Direkte Durchwahlen recherchieren. LinkedIn-Warmup vor Cold Calls nutzen.`,
        impact: "2x mehr Entscheider-Gespräche",
      });
    }
  }

  // Entscheider-Erreichbarkeit niedrig
  if (d.anwahlen > 0 && d.erreicht_entscheider !== undefined) {
    const erRate = (d.erreicht_entscheider / d.anwahlen) * 100;
    if (erRate < 15) {
      actions.push({
        icon: Target,
        priority: "medium",
        title: "Erreichbarkeit optimieren",
        description: `Nur ${erRate.toFixed(0)}% Entscheider erreicht. Anrufzeiten analysieren (7:30-9:00 & 17:00-18:30 testen). Mobilnummern über LinkedIn/Xing beschaffen.`,
        impact: "+50% mehr qualifizierte Gespräche",
      });
    }
  }

  // Weekly: Low show-up setting
  if (w.showup_setting !== undefined && w.showup_setting < 60) {
    actions.push({
      icon: AlertTriangle,
      priority: "high",
      title: "Setting Show-Up-Rate kritisch",
      description: `Nur ${w.showup_setting}% Show-Up (Ziel: 80%). Sofort einführen: SMS-Reminder 24h + 1h vorher, Bestätigungs-Call am Vortag, Termin-Kalendereinladung mit Agenda.`,
      impact: "30-40% weniger No-Shows",
    });
  } else if (w.showup_setting !== undefined && w.showup_setting < 80) {
    actions.push({
      icon: Target,
      priority: "medium",
      title: "Show-Up-Rate verbessern",
      description: `${w.showup_setting}% Show-Up. Personalisierte Vorab-Mail mit Mehrwert senden. Termin-Value im Vorfeld klar kommunizieren.`,
      impact: "+15% mehr gehaltene Settings",
    });
  }

  // Weekly: Closing rate
  if (w.closing_rate !== undefined && w.closing_rate < 50) {
    actions.push({
      icon: TrendingDown,
      priority: "high",
      title: "Closing-Rate sofort verbessern",
      description: `Nur ${w.closing_rate}% Closing-Rate (Ziel: 70-80%). Closing-Skript reviewen, Einwandbehandlung trainieren. Shadow-Calls mit Top-Performer organisieren.`,
      impact: "Verdopplung der Deals bei gleichen Leads",
    });
  } else if (w.closing_rate !== undefined && w.closing_rate > 80) {
    actions.push({
      icon: Megaphone,
      priority: "low",
      title: "Closing-Rate über Optimum",
      description: `${w.closing_rate}% liegt über dem optimalen Korridor (70-80%). Prüfe ob die Pipeline zu eng qualifiziert wird und potenzielle Deals verloren gehen.`,
      impact: "Mehr Deals bei breiterer Qualifikation",
    });
  }

  // Weekly: Impressions too low
  if (w.impressions !== undefined && w.impressions < 5000) {
    actions.push({
      icon: Megaphone,
      priority: "medium",
      title: "Content-Reichweite steigern",
      description: `Nur ${w.impressions?.toLocaleString("de-DE")} Impressions (Ziel: 20.000). Posting-Frequenz erhöhen, Hook-Formeln optimieren, Engagement-Pods nutzen.`,
      impact: "4x mehr Sichtbarkeit & Leads",
    });
  }

  // Monthly: High churn
  if (m.churn !== undefined && m.churn > 10) {
    actions.push({
      icon: AlertTriangle,
      priority: "high",
      title: "Churn-Rate alarmierend",
      description: `${m.churn}% Churn (Ziel: <5%). Exit-Interviews mit abgewanderten Kunden führen. Onboarding-Prozess und erste 30 Tage analysieren. Proaktives Check-in bei gefährdeten Kunden.`,
      impact: "Stabilisierung der Recurring Revenue",
    });
  } else if (m.churn !== undefined && m.churn > 5) {
    actions.push({
      icon: Target,
      priority: "medium",
      title: "Churn-Rate senken",
      description: `${m.churn}% Churn. Monatliche Success-Calls einführen. Quick-Wins in ersten 14 Tagen sicherstellen.`,
      impact: "+20% höhere Kundenbindung",
    });
  }

  // Monthly: MRR stagnation
  if (m.mrr_growth !== undefined && m.mrr_growth < 5) {
    actions.push({
      icon: TrendingDown,
      priority: "high",
      title: "MRR-Wachstum stagniert",
      description: `Nur ${m.mrr_growth}% MRR-Wachstum (Ziel: >15%). Upselling-Strategie entwickeln, Vertragslaufzeiten verlängern, Preisanpassung prüfen.`,
      impact: "Nachhaltige Umsatzsteigerung",
    });
  }

  // Connection requests low
  if (d.connection_requests !== undefined && d.connection_requests < 10) {
    actions.push({
      icon: Zap,
      priority: "medium",
      title: "LinkedIn-Aktivität erhöhen",
      description: `Nur ${d.connection_requests} Connection Requests (Ziel: 20). Tägliche LinkedIn-Routine von 30 Min. einführen. Sales Navigator für gezieltes Targeting nutzen.`,
      impact: "+100% mehr LinkedIn-Pipeline",
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return actions.slice(0, 5); // Max 5 actions
}

function formatValue(val: any, bench: any) {
  if (val === undefined || val === null) return "–";
  if (bench.unit === "€") return val.toLocaleString("de-DE") + " €";
  if (bench.unit) return val + bench.unit;
  return val.toLocaleString("de-DE");
}

function formatTimeAgo(dateStr: string | null) {
  if (!dateStr) return "Nie eingereicht";
  const days = getDaysSinceSubmission(dateStr);
  if (days === 0) return "Heute";
  if (days === 1) return "Gestern";
  return `Vor ${days} Tagen`;
}

// ═══════════════════════════════════════════════════
// STATUS STYLING
// ═══════════════════════════════════════════════════

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; colorClass: string; bgClass: string; borderClass: string }> = {
  green: { label: "Auf Kurs", icon: CheckCircle, colorClass: "text-success", bgClass: "bg-success/10", borderClass: "border-success/30" },
  yellow: { label: "Achtung", icon: AlertTriangle, colorClass: "text-warning", bgClass: "bg-warning/10", borderClass: "border-warning/30" },
  red: { label: "Kritisch", icon: XCircle, colorClass: "text-destructive", bgClass: "bg-destructive/10", borderClass: "border-destructive/30" },
  missing: { label: "Nicht eingereicht", icon: Clock, colorClass: "text-purple-400", bgClass: "bg-purple-500/10", borderClass: "border-purple-500/30" },
};

// ═══════════════════════════════════════════════════
// DATA FETCHING — uses tenants + metrics_snapshot
// ═══════════════════════════════════════════════════

async function fetchCustomersFromSupabase(): Promise<any[]> {
  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("is_active", true)
    .order("company_name");

  if (error) throw error;
  if (!tenants) return [];

  const enriched = await Promise.all(
    tenants.map(async (tenant) => {
      // Latest daily snapshot
      const { data: dailyData } = await supabase
        .from("metrics_snapshot")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("period_date", { ascending: false })
        .limit(1);

      const latestDaily = dailyData?.[0];

      // Streak: count consecutive days
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const { data: recentDaily } = await supabase
        .from("metrics_snapshot")
        .select("period_date")
        .eq("tenant_id", tenant.id)
        .gte("period_date", weekAgo)
        .order("period_date", { ascending: false });

      let streak = 0;
      if (recentDaily && recentDaily.length > 0) {
        const today = new Date();
        for (let i = 0; i < 7; i++) {
          const expected = new Date(today);
          expected.setDate(expected.getDate() - i);
          if (expected.getDay() === 0 || expected.getDay() === 6) continue;
          const expectedStr = expected.toISOString().split("T")[0];
          if (recentDaily.find((d: any) => d.period_date === expectedStr)) {
            streak++;
          } else {
            break;
          }
        }
      }

      const startDate = new Date(tenant.created_at || Date.now());
      const weekNumber = Math.min(Math.ceil((Date.now() - startDate.getTime()) / (7 * 86400000)), 12);

      // Map metrics_snapshot fields to daily KPI keys
      const daily: Record<string, any> = {};
      if (latestDaily) {
        daily.connection_requests = latestDaily.dms_sent || 0;
        daily.cold_mails = 0; // Not in schema yet
        daily.anwahlen = latestDaily.calls_made || 0;
        daily.erreicht_entscheider = latestDaily.calls_reached || 0;
        daily.gatekeeper = (latestDaily.calls_made || 0) - (latestDaily.calls_reached || 0);
        daily.callbacks = latestDaily.calls_interested || 0;
        daily.termine_gebucht = latestDaily.appointments || 0;
      }

      // Weekly data from aggregated view
      const { data: weeklyView } = await supabase
        .from("v_metrics_weekly")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("period_start", { ascending: false })
        .limit(1);

      const wk: any = weeklyView?.[0];
      const weekly: Record<string, any> = {};
      if (wk) {
        weekly.settings_gesamt = wk.settings_planned || 0;
        weekly.showup_setting = wk.setting_show_rate || 0;
        weekly.showup_closing = wk.closing_show_rate || 0;
        weekly.closing_rate = wk.closing_rate || 0;
        weekly.dealwert = wk.deal_volume && wk.deals ? Math.round(Number(wk.deal_volume) / Number(wk.deals)) : 0;
        weekly.impressions = wk.impressions || 0;
        weekly.kommentare = wk.comments || 0;
      }

      return {
        id: tenant.id,
        name: tenant.company_name,
        contact: tenant.contact_name || "–",
        email: "",
        startDate: tenant.created_at,
        week: weekNumber,
        last_daily_submission: latestDaily?.period_date || null,
        last_weekly_submission: wk?.period_start || null,
        last_monthly_submission: null,
        streak,
        daily,
        weekly,
        monthly: {},
      };
    })
  );

  return enriched;
}

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════

export function BeraterDashboard() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [detailTab, setDetailTab] = useState("daily");

  useEffect(() => {
    fetchCustomersFromSupabase()
      .then(setCustomers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const enrichedCustomers = useMemo(() =>
    customers.map((c) => {
      const submissionStatus = getSubmissionStatus(c);
      const scores = getCustomerScores(c);
      const overallStatus = getOverallStatus(scores, submissionStatus);
      return { ...c, scores, overallStatus, submissionStatus };
    }).sort((a, b) => {
      const order: Record<string, number> = { missing: 0, red: 1, yellow: 2, green: 3 };
      return (order[a.overallStatus] ?? 4) - (order[b.overallStatus] ?? 4);
    }),
  [customers]);

  const filtered = enrichedCustomers.filter((c) => {
    if (filterStatus !== "all" && c.overallStatus !== filterStatus) return false;
    if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase()) && !c.contact.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const counts = enrichedCustomers.reduce((a: any, c) => { a[c.overallStatus] = (a[c.overallStatus] || 0) + 1; return a; }, { green: 0, yellow: 0, red: 0, missing: 0 });

  const detail = selectedCustomer ? enrichedCustomers.find((c) => c.id === selectedCustomer) : null;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="glass-card"><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="glass-card"><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* STATUS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["missing", "red", "yellow", "green"] as const).map((key, i) => {
          const cfg = STATUS_CONFIG[key];
          const active = filterStatus === key;
          const Icon = cfg.icon;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card
                className={`glass-card cursor-pointer transition-all duration-200 hover:scale-[1.02] ${active ? `${cfg.borderClass} border ${cfg.bgClass}` : ""}`}
                onClick={() => setFilterStatus(active ? "all" : key)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-3xl font-bold font-mono ${cfg.colorClass}`}>
                      {counts[key] || 0}
                    </span>
                    <Icon className={`h-5 w-5 ${cfg.colorClass} opacity-60`} />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">{cfg.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* SEARCH */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Kunde oder Kontakt suchen…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 glass-card border-border/50"
        />
      </div>

      {/* CUSTOMER LIST */}
      <div className="space-y-2">
        {filtered.map((customer, idx) => {
          const cfg = STATUS_CONFIG[customer.overallStatus] || STATUS_CONFIG.green;
          const isSelected = selectedCustomer === customer.id;
          const isMissing = customer.overallStatus === "missing";

          return (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.03 }}
            >
              <Card
                className={`glass-card cursor-pointer transition-all duration-200 hover:border-border/80 ${isSelected ? `${cfg.borderClass} border ${cfg.bgClass}` : ""}`}
                onClick={() => { setSelectedCustomer(isSelected ? null : customer.id); setDetailTab("daily"); }}
              >
                <CardContent className="p-4">
                  {/* Row */}
                  <div className="flex items-center gap-4">
                    {/* Status dot */}
                    <div className={`h-3 w-3 rounded-full shrink-0 ${
                      customer.overallStatus === "green" ? "bg-success" :
                      customer.overallStatus === "yellow" ? "bg-warning" :
                      customer.overallStatus === "red" ? "bg-destructive" :
                      "bg-purple-400"
                    }`} style={{ boxShadow: `0 0 8px ${
                      customer.overallStatus === "green" ? "hsl(var(--success) / 0.5)" :
                      customer.overallStatus === "yellow" ? "hsl(var(--warning) / 0.5)" :
                      customer.overallStatus === "red" ? "hsl(var(--destructive) / 0.5)" :
                      "rgba(139,92,246,0.5)"
                    }` }} />

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {customer.contact} · Woche {customer.week}/12
                        {customer.streak > 0 && (
                          <span className="ml-2 inline-flex items-center gap-1 text-warning">
                            <Flame className="h-3 w-3" />{customer.streak}d
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Last submission */}
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {formatTimeAgo(customer.last_daily_submission)}
                    </span>

                    {/* Score pills */}
                    {!isMissing && (
                      <div className="hidden md:flex items-center gap-2">
                        {[
                          { color: "bg-success", n: customer.scores.green },
                          { color: "bg-warning", n: customer.scores.yellow },
                          { color: "bg-destructive", n: customer.scores.red },
                        ].map((s, i) => (
                          <span key={i} className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                            <span className={`h-2 w-2 rounded-full ${s.color}`} />
                            {s.n}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Status badge */}
                    <Badge variant="outline" className={`${cfg.bgClass} ${cfg.colorClass} ${cfg.borderClass} text-[11px] font-semibold shrink-0`}>
                      {cfg.label}
                    </Badge>

                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isSelected ? "rotate-180" : ""}`} />
                  </div>

                  {/* DETAIL PANEL */}
                  <AnimatePresence>
                    {isSelected && detail && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="pt-4 mt-4 border-t border-border/30 space-y-4">
                          {/* Missing alert */}
                          {detail.overallStatus === "missing" && (
                            <div className={`p-4 rounded-xl bg-purple-500/10 border border-purple-500/20`}>
                              <div className="flex gap-3">
                                <XCircle className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                                <div className="space-y-2">
                                  <p className="text-sm font-semibold text-purple-300">Keine aktuellen Daten</p>
                                  <p className="text-xs text-muted-foreground">
                                    {detail.last_daily_submission
                                      ? `Letzte Eingabe war ${formatTimeAgo(detail.last_daily_submission).toLowerCase()}. ${detail.contact} hat seitdem keine täglichen Kennzahlen eingetragen.`
                                      : `${detail.contact} hat noch nie Kennzahlen eingetragen.`}
                                  </p>
                                  <p className="text-xs text-purple-400/80">
                                    Empfohlene Maßnahme: Direkt anrufen und Unterstützung anbieten.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Submission status row */}
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: "Täglich", last: detail.last_daily_submission, maxDays: 1 },
                              { label: "Wöchentlich", last: detail.last_weekly_submission, maxDays: 7 },
                              { label: "Monatlich", last: detail.last_monthly_submission, maxDays: 31 },
                            ].map((sub) => {
                              const days = getDaysSinceSubmission(sub.last);
                              const ok = days <= sub.maxDays;
                              return (
                                <div key={sub.label} className="p-3 rounded-lg bg-secondary/50 text-center">
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{sub.label}</p>
                                  <p className={`text-xs font-semibold ${ok ? "text-success" : "text-destructive"}`}>
                                    {formatTimeAgo(sub.last)}
                                  </p>
                                </div>
                              );
                            })}
                          </div>

                          {/* Tabs */}
                          <div className="flex gap-1 p-1 rounded-lg bg-secondary/50">
                            {[{ key: "daily", label: "Täglich" }, { key: "weekly", label: "Wöchentlich" }, { key: "monthly", label: "Monatlich" }].map((tab) => (
                              <button
                                key={tab.key}
                                onClick={() => setDetailTab(tab.key)}
                                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                  detailTab === tab.key
                                    ? "bg-primary/20 text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>

                          {/* KPI Grid */}
                          {Object.keys(detail[detailTab] || {}).length === 0 ? (
                            <div className="text-center py-8">
                              <p className="text-2xl text-muted-foreground/30">—</p>
                              <p className="text-xs text-muted-foreground mt-2">Keine Daten vorhanden</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {Object.entries(BENCHMARKS[detailTab] || {}).map(([key, bench]) => {
                                const val = detail[detailTab]?.[key];
                                const status = evaluateKPI(bench, val, detail[detailTab]);
                                const hasValue = val !== undefined && val !== null && val !== "";
                                let displayVal = formatValue(val, bench);
                                if (bench.isPct && bench.rel && detail[detailTab]?.[bench.rel]) {
                                  displayVal = `${val} (${((val / detail[detailTab][bench.rel]) * 100).toFixed(1)}%)`;
                                }

                                const statusColor =
                                  status === "green" ? "text-success" :
                                  status === "yellow" ? "text-warning" :
                                  status === "red" ? "text-destructive" :
                                  "text-muted-foreground";

                                return (
                                  <div key={key} className="p-3 rounded-lg bg-secondary/30 border border-border/20">
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{bench.label}</p>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-sm font-bold font-mono ${statusColor}`}>
                                        {hasValue ? displayVal : "–"}
                                      </span>
                                      {hasValue && status !== "neutral" && status !== "empty" && (
                                        <span className={`h-2 w-2 rounded-full ${
                                          status === "green" ? "bg-success" :
                                          status === "yellow" ? "bg-warning" :
                                          "bg-destructive"
                                        }`} />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* ACTION PLAN */}
                          {(() => {
                            const actions = generateActionPlan(detail);
                            if (actions.length === 0) return null;
                            const priorityStyles = {
                              high: { bg: "bg-destructive/10", border: "border-destructive/20", badge: "bg-destructive/20 text-destructive", label: "Dringend" },
                              medium: { bg: "bg-warning/10", border: "border-warning/20", badge: "bg-warning/20 text-warning", label: "Wichtig" },
                              low: { bg: "bg-muted/50", border: "border-border/30", badge: "bg-secondary text-muted-foreground", label: "Hinweis" },
                            };
                            return (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                                  <Target className="h-3.5 w-3.5 text-primary" />
                                  Handlungsplan ({actions.length} Maßnahmen)
                                </p>
                                {actions.map((action, ai) => {
                                  const ps = priorityStyles[action.priority];
                                  const Icon = action.icon;
                                  return (
                                    <div key={ai} className={`p-3 rounded-lg ${ps.bg} border ${ps.border}`}>
                                      <div className="flex items-start gap-3">
                                        <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                        <div className="flex-1 min-w-0 space-y-1">
                                          <div className="flex items-center gap-2">
                                            <p className="text-xs font-semibold text-foreground">{action.title}</p>
                                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${ps.badge}`}>
                                              {ps.label}
                                            </span>
                                          </div>
                                          <p className="text-xs text-muted-foreground leading-relaxed">{action.description}</p>
                                          <p className="text-[10px] text-primary/80 font-medium">⚡ Impact: {action.impact}</p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Keine Kunden gefunden</p>
        )}
      </div>
    </div>
  );
}
