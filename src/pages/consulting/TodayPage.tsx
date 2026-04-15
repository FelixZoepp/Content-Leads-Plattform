import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, ArrowRight, TrendingUp, Users, Target, Star, Flame, BarChart3, Phone, DollarSign, Brain, MessageSquare, FileText } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useNavigate } from "react-router-dom";
import { DailyChecklist } from "@/components/today/DailyChecklist";
import { SurveyEngine } from "@/components/client/SurveyEngine";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const TODAY_KEY = `checklist_${new Date().toISOString().slice(0, 10)}`;

export type ChecklistItem = { id: string; label: string; done: boolean };
export type Section = {
  title: string;
  emoji: string;
  color: string;
  path: string;
  pathLabel: string;
  icon: React.ElementType;
  items: ChecklistItem[];
};

const defaultSections: Section[] = [
  {
    title: "Content & LinkedIn",
    emoji: "📣",
    color: "hsl(25 90% 55%)",
    path: "/dashboard/marketing",
    pathLabel: "Marketing eintragen",
    icon: BarChart3,
    items: [
      { id: "m1", label: "LinkedIn-Post veröffentlicht", done: false },
      { id: "m2", label: "10 relevante Beiträge kommentiert", done: false },
      { id: "m3", label: "5 DMs an potenzielle Leads gesendet", done: false },
      { id: "m4", label: "Neue Kontaktanfragen angenommen & begrüßt", done: false },
    ],
  },
  {
    title: "Outbound & Akquise",
    emoji: "📞",
    color: "hsl(0 85% 55%)",
    path: "/dashboard/sales",
    pathLabel: "Sales eintragen",
    icon: Phone,
    items: [
      { id: "s1", label: "Tages-Call-Liste vorbereitet (min. 20 Kontakte)", done: false },
      { id: "s2", label: "Anrufe durchgeführt & dokumentiert", done: false },
      { id: "s3", label: "Follow-ups an warme Leads gesendet", done: false },
      { id: "s4", label: "Termine bestätigt / Reminder verschickt", done: false },
    ],
  },
  {
    title: "Termine & Closing",
    emoji: "🎯",
    color: "hsl(15 80% 50%)",
    path: "/dashboard/sales",
    pathLabel: "Termine eintragen",
    icon: Target,
    items: [
      { id: "c1", label: "Erstgespräche / Settings durchgeführt", done: false },
      { id: "c2", label: "Closing-Calls gehalten", done: false },
      { id: "c3", label: "Angebote nachgefasst", done: false },
    ],
  },
  {
    title: "Tagesabschluss",
    emoji: "✅",
    color: "hsl(38 92% 55%)",
    path: "/dashboard/overview",
    pathLabel: "KPIs eintragen",
    icon: BarChart3,
    items: [
      { id: "d1", label: "Alle Tages-KPIs im Dashboard eingetragen", done: false },
      { id: "d2", label: "Tracking-Sheet aktualisiert", done: false },
      { id: "d3", label: "Top-3 Prioritäten für morgen notiert", done: false },
    ],
  },
];

function loadSections(): Section[] {
  try {
    const saved = localStorage.getItem(TODAY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return defaultSections.map((section) => {
        const savedSection = parsed.find((s: any) => s.title === section.title);
        if (!savedSection) return section;
        return {
          ...section,
          items: section.items.map((item) => {
            const savedItem = savedSection.items?.find((i: any) => i.id === item.id);
            return savedItem ? { ...item, done: savedItem.done } : item;
          }),
        };
      });
    }
  } catch {}
  return defaultSections;
}

const quickLinks = [
  { label: "Übersicht", icon: BarChart3, path: "/dashboard/overview", color: "hsl(var(--primary))" },
  { label: "Marketing", icon: TrendingUp, path: "/dashboard/marketing", color: "hsl(25 90% 55%)" },
  { label: "Sales", icon: Phone, path: "/dashboard/sales", color: "hsl(0 70% 50%)" },
  { label: "Finanzen", icon: DollarSign, path: "/dashboard/finance", color: "hsl(38 92% 55%)" },
  { label: "KI-Briefing", icon: Brain, path: "/dashboard/ai", color: "hsl(var(--primary))" },
  { label: "Feedback", icon: MessageSquare, path: "/dashboard/csat", color: "hsl(10 75% 52%)" },
  { label: "Reports", icon: FileText, path: "/dashboard/reports", color: "hsl(25 90% 55%)" },
];

export default function TodayPage() {
  const [sections, setSections] = useState<Section[]>(loadSections);
  const { metrics, tenantId, tenant } = useDashboardData();
  const navigate = useNavigate();
  const [onboardingDate, setOnboardingDate] = useState<string | null>(null);
  const [todayReported, setTodayReported] = useState<boolean | null>(null);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("tenants")
      .select("created_at, onboarding_completed")
      .eq("id", tenantId)
      .maybeSingle()
      .then(({ data }) => setOnboardingDate(data?.onboarding_completed ? data.created_at : null));

    // Check if today's metrics have been submitted
    supabase
      .from("metrics_snapshot")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("period_date", todayStr)
      .limit(1)
      .then(({ data }) => setTodayReported((data?.length ?? 0) > 0));
  }, [tenantId, todayStr]);

  useEffect(() => {
    localStorage.setItem(TODAY_KEY, JSON.stringify(sections));
  }, [sections]);

  const totalItems = sections.reduce((a, s) => a + s.items.length, 0);
  const doneItems = sections.reduce((a, s) => a + s.items.filter((i) => i.done).length, 0);
  const percent = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  const today = format(new Date(), "EEEE, d. MMMM", { locale: de });

  const toggle = (sectionIdx: number, itemId: string) => {
    setSections((prev) =>
      prev.map((s, si) =>
        si === sectionIdx
          ? { ...s, items: s.items.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)) }
          : s
      )
    );
  };

  const latest = metrics?.[0];

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Guten Morgen" : greetingHour < 18 ? "Guten Tag" : "Guten Abend";

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">{today}</p>
        <h1 className="text-2xl font-bold text-foreground mt-1">
          {greeting} 👋
        </h1>
      </motion.div>

      {/* Daily Report Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        {todayReported === null ? null : todayReported ? (
          <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/8 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/15">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-success">Tagesbericht eingereicht ✓</p>
              <p className="text-xs text-muted-foreground">Deine KPIs für heute wurden erfolgreich erfasst.</p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate("/dashboard/overview")}
            className="w-full flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/8 p-4 hover:bg-warning/12 transition-colors cursor-pointer text-left group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/15">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-warning">Tagesbericht ausstehend</p>
              <p className="text-xs text-muted-foreground">Trage deine heutigen KPIs ein, damit dein Dashboard aktuell bleibt.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-warning opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </button>
        )}
      </motion.div>

      {/* Survey Banner */}
      {onboardingDate && (
        <SurveyEngine tenantId={tenantId} onboardingCompletedAt={onboardingDate} />
      )}

      {/* Progress + KPI Row */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {/* Progress Card */}
        <div className="rounded-xl border border-border/50 bg-card p-5 flex flex-col items-center justify-center gap-3">
          <div className="relative">
            <svg width="100" height="100" className="rotate-[-90deg]">
              <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
              <motion.circle
                cx="50" cy="50" r="40" fill="none"
                stroke={percent === 100 ? "hsl(var(--success))" : "hsl(var(--primary))"}
                strokeWidth="6" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 40}
                initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 40 - (percent / 100) * 2 * Math.PI * 40 }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-foreground">{percent}%</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{doneItems}/{totalItems} erledigt</p>
            {percent === 100 && <p className="text-xs text-success font-medium mt-0.5">Alles geschafft! 🎉</p>}
          </div>
        </div>

        {/* KPI Summary */}
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <p className="text-xs text-muted-foreground font-medium mb-3">Letzte Kennzahlen</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Leads", value: latest?.leads_total ?? "–", icon: Users },
              { label: "Termine", value: latest?.appointments ?? "–", icon: Target },
              { label: "Deals", value: latest?.deals ?? "–", icon: Star },
              { label: "Umsatz", value: latest?.revenue ? `€${Number(latest.revenue).toLocaleString("de-DE")}` : "–", icon: DollarSign },
              { label: "Impressionen", value: latest?.impressions ? `${(Number(latest.impressions) / 1000).toFixed(1)}k` : "–", icon: Flame },
              { label: "Follower", value: latest?.followers_current ?? "–", icon: Users },
            ].map(kpi => (
              <div key={kpi.label} className="flex items-center gap-2 py-1.5">
                <kpi.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground leading-none">{kpi.value}</p>
                  <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Quick Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <p className="text-sm font-semibold text-foreground mb-3">Bereiche</p>
        <div className="flex flex-wrap gap-2">
          {quickLinks.map(link => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-card hover:bg-secondary/50 transition-colors text-xs font-medium text-foreground cursor-pointer"
            >
              <link.icon className="h-3.5 w-3.5 text-muted-foreground" />
              {link.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Daily Checklist */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <p className="text-sm font-semibold text-foreground mb-3">Tages-Checklist</p>
        <DailyChecklist sections={sections} onToggle={toggle} navigate={navigate} />
      </motion.div>
    </div>
  );
}
