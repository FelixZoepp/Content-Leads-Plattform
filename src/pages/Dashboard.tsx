import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, Users, MessageSquare, CalendarDays, Video, ArrowRight,
  CheckCircle2, X, Pin, Send, Mail, Phone, TrendingUp, DollarSign,
  BarChart3, Save, Loader2
} from "lucide-react";

const quickStartSteps = [
  { icon: BookOpen, title: "Training starten", desc: "Starte deinen ersten Sprint", done: false, color: "#C5A059", cta: "Zum Training" },
  { icon: Users, title: "Community beitreten", desc: "Vernetze dich mit anderen", done: false, color: "#B49AE8", cta: "Jetzt posten" },
  { icon: MessageSquare, title: "Erste Nachricht", desc: "Sende deine erste DM", done: false, color: "#7FC29B", cta: "Nachricht senden" },
  { icon: CalendarDays, title: "Meeting buchen", desc: "Buche dein Onboarding", done: false, color: "#E9CB8B", cta: "Zum Kalender" },
  { icon: Video, title: "Live-Call besuchen", desc: "Besuche einen Live-Call", done: false, color: "#E87467", cta: "Zum Kalender" },
];

// Daily KPI fields (Mon-Fr: Sales & Outbound)
const DAILY_FIELDS = [
  { key: "dms_sent", label: "DMs gesendet", icon: Send, color: "#8BB6E8" },
  { key: "dm_replies", label: "DM Antworten", icon: MessageSquare, color: "#B49AE8" },
  { key: "mails_sent", label: "Mails gesendet", icon: Mail, color: "#E9CB8B" },
  { key: "mail_replies", label: "Mail Antworten", icon: Mail, color: "#C5A059" },
  { key: "looms_sent", label: "Looms gesendet", icon: Video, color: "#8BB6E8" },
  { key: "termine", label: "Termine", icon: CalendarDays, color: "#7FC29B" },
  { key: "setting_calls", label: "Setting Calls", icon: Phone, color: "#E9CB8B" },
  { key: "closing_calls", label: "Closing Calls", icon: Phone, color: "#C5A059" },
  { key: "abschluesse", label: "Abschlüsse", icon: TrendingUp, color: "#7FC29B" },
];

// Weekly KPI fields (Finance & Marketing)
const WEEKLY_FIELDS = [
  { key: "umsatz", label: "Umsatz (€)", icon: DollarSign, color: "#C5A059", type: "currency" },
  { key: "revenue", label: "Einnahmen gesamt (€)", icon: DollarSign, color: "#7FC29B", type: "currency" },
  { key: "posts_published", label: "Posts veröffentlicht", icon: BarChart3, color: "#8BB6E8" },
  { key: "impressions", label: "Impressionen", icon: TrendingUp, color: "#B49AE8" },
  { key: "new_followers", label: "Neue Follower", icon: Users, color: "#E9CB8B" },
  { key: "comments_received", label: "Kommentare erhalten", icon: MessageSquare, color: "#C5A059" },
  { key: "leads_from_comments", label: "Leads aus Kommentaren", icon: TrendingUp, color: "#7FC29B" },
];

function ProgressRing({ pct, size = 48 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(249,249,249,0.08)" strokeWidth={3} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#C5A059" strokeWidth={3} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">{pct}%</span>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const name = user?.user_metadata?.name || "dort";
  const completedSteps = quickStartSteps.filter(s => s.done).length;
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const todayStr = now.toISOString().split("T")[0];

  // Daily KPI state
  const [dailyValues, setDailyValues] = useState<Record<string, string>>({});
  const [savingDaily, setSavingDaily] = useState(false);
  const [dailySaved, setDailySaved] = useState(false);

  // Weekly KPI state
  const [weeklyValues, setWeeklyValues] = useState<Record<string, string>>({});
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [weeklySaved, setWeeklySaved] = useState(false);

  // Week streak
  const [weekEntries, setWeekEntries] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    loadTodayEntry();
    loadWeekStreak();
  }, [user]);

  async function loadTodayEntry() {
    const { data } = await (supabase as any)
      .from("kpi_entries")
      .select("*")
      .eq("user_id", user!.id)
      .eq("date", todayStr)
      .maybeSingle();

    if (data) {
      const vals: Record<string, string> = {};
      [...DAILY_FIELDS, ...WEEKLY_FIELDS].forEach(f => {
        if (data[f.key] !== null && data[f.key] !== undefined) {
          vals[f.key] = String(data[f.key]);
        }
      });
      setDailyValues(prev => ({ ...prev, ...vals }));
      setWeeklyValues(prev => ({ ...prev, ...vals }));
      setDailySaved(true);
    }
  }

  async function loadWeekStreak() {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // Monday
    const dates: string[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }

    const { data } = await (supabase as any)
      .from("kpi_entries")
      .select("date")
      .eq("user_id", user!.id)
      .in("date", dates);

    setWeekEntries((data || []).map((e: any) => e.date));
  }

  async function saveDaily() {
    if (!user) return;
    setSavingDaily(true);
    const payload: any = { user_id: user.id, date: todayStr };
    DAILY_FIELDS.forEach(f => {
      payload[f.key] = parseInt(dailyValues[f.key] || "0") || 0;
    });

    const { data: existing } = await (supabase as any)
      .from("kpi_entries")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", todayStr)
      .maybeSingle();

    if (existing) {
      await (supabase as any).from("kpi_entries").update(payload).eq("id", existing.id);
    } else {
      await (supabase as any).from("kpi_entries").insert(payload);
    }

    setDailySaved(true);
    setSavingDaily(false);
    loadWeekStreak();
  }

  async function saveWeekly() {
    if (!user) return;
    setSavingWeekly(true);
    const payload: any = { user_id: user.id, date: todayStr };
    WEEKLY_FIELDS.forEach(f => {
      payload[f.key] = parseFloat(weeklyValues[f.key] || "0") || 0;
    });

    const { data: existing } = await (supabase as any)
      .from("kpi_entries")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", todayStr)
      .maybeSingle();

    if (existing) {
      await (supabase as any).from("kpi_entries").update(payload).eq("id", existing.id);
    } else {
      await (supabase as any).from("kpi_entries").insert(payload);
    }

    setWeeklySaved(true);
    setSavingWeekly(false);
  }

  const dailyFilled = DAILY_FIELDS.filter(f => parseInt(dailyValues[f.key] || "0") > 0).length;
  const dailyPct = Math.round((dailyFilled / DAILY_FIELDS.length) * 100);

  return (
    <div className="space-y-6 max-w-6xl">

      {/* ── Quick Start Roadmap ── */}
      <div className="glass-panel fade-up" style={{ animationDelay: "60ms" }}>
        <div className="relative z-[2]">
          <div className="flex items-start justify-between mb-1">
            <div>
              <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">Willkommen</span>
              <h2 className="text-lg text-white" style={{ fontFamily: "var(--font-serif)" }}>Dein Schnellstart</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="p-1.5 rounded-lg text-[rgba(249,249,249,0.3)] hover:bg-[rgba(249,249,249,0.04)] hover:text-white transition">
                <Pin className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded-lg text-[rgba(249,249,249,0.3)] hover:bg-[rgba(249,249,249,0.04)] hover:text-white transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-[13px] text-[rgba(249,249,249,0.5)] mb-4">
            Erledige diese Schritte um das Beste aus deinem Sprint herauszuholen<span className="text-[#C5A059]">.</span>
          </p>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-1.5 bg-[rgba(249,249,249,0.06)] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${(completedSteps / quickStartSteps.length) * 100}%`, background: "linear-gradient(90deg, #775A19, #C5A059)", boxShadow: "0 0 12px rgba(197,160,89,0.4)" }} />
            </div>
            <span className="text-xs font-bold text-[rgba(249,249,249,0.5)]">{completedSteps}/{quickStartSteps.length}</span>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {quickStartSteps.map((step, i) => (
              <div key={i} className="rounded-xl p-4 border border-[rgba(249,249,249,0.08)] hover:border-[rgba(197,160,89,0.25)] transition group min-w-0" style={{ background: "rgba(249,249,249,0.03)" }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: step.done ? "#7FC29B" : `linear-gradient(135deg, ${step.color}33, ${step.color}15)`, border: `1px solid ${step.color}40` }}>
                  {step.done ? <CheckCircle2 className="w-6 h-6 text-white" /> : <step.icon className="w-6 h-6" style={{ color: step.color }} />}
                </div>
                <h3 className="text-[13px] font-bold text-white mb-1">{step.title}</h3>
                <p className="text-[11px] text-[rgba(249,249,249,0.5)] mb-3 leading-relaxed">{step.desc}</p>
                {step.done ? (
                  <span className="text-[11px] text-[#7FC29B] font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Erledigt!</span>
                ) : (
                  <button className="text-[11px] font-semibold flex items-center gap-1 hover:opacity-80 transition" style={{ color: step.color }}>{step.cta} <ArrowRight className="w-3 h-3" /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Wochen-Streak ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-panel fade-up" style={{ animationDelay: "140ms" }}>
          <div className="relative z-[2]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">Tracking</span>
                <h2 className="text-[15px] text-white" style={{ fontFamily: "var(--font-serif)" }}>Deine Woche</h2>
              </div>
              <ProgressRing pct={Math.round((weekEntries.length / 5) * 100)} />
            </div>
            <div className="grid grid-cols-5 gap-3">
              {["Mo", "Di", "Mi", "Do", "Fr"].map((day, i) => {
                const weekStart = new Date(now);
                weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
                const d = new Date(weekStart);
                d.setDate(d.getDate() + i);
                const dateStr = d.toISOString().split("T")[0];
                const filled = weekEntries.includes(dateStr);
                const isToday = dateStr === todayStr;

                return (
                  <div key={day} className="text-center">
                    <span className="text-[9px] text-[rgba(249,249,249,0.3)] font-medium">{day}</span>
                    <div
                      className="w-full aspect-square rounded-full mt-1.5 flex items-center justify-center"
                      style={{
                        background: filled ? "linear-gradient(135deg, #E9CB8B, #C5A059)" : isToday ? "rgba(197,160,89,0.15)" : "rgba(249,249,249,0.06)",
                        boxShadow: filled ? "0 0 12px rgba(197,160,89,0.4)" : "none",
                        border: isToday && !filled ? "1px solid rgba(197,160,89,0.3)" : "none",
                      }}
                    >
                      {filled && <CheckCircle2 className="w-3.5 h-3.5 text-[#0A0B0B]" />}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-[rgba(249,249,249,0.4)] mt-3 italic" style={{ fontFamily: "var(--font-serif)" }}>
              {weekEntries.length}/5 Tage getrackt diese Woche
            </p>
          </div>
        </div>

        {/* Sprint Roadmap mini */}
        <div className="glass-panel fade-up" style={{ animationDelay: "220ms" }}>
          <div className="relative z-[2]">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">Training</span>
                <h2 className="text-[15px] text-white" style={{ fontFamily: "var(--font-serif)" }}>Sprint Roadmap</h2>
              </div>
              <ProgressRing pct={0} />
            </div>
            <h3 className="text-[14px] text-white mb-1" style={{ fontFamily: "var(--font-serif)" }}>Trainingsfortschritt</h3>
            <div className="w-full h-1.5 bg-[rgba(249,249,249,0.06)] rounded-full mb-3 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: "0%", background: "linear-gradient(90deg, #775A19, #C5A059)" }} />
            </div>
            <p className="text-xs text-[rgba(249,249,249,0.5)] mb-4">Letzte Lektion: <span className="text-white font-medium">Willkommen zum Sprint</span></p>
            <button className="text-[12px] font-bold text-[#E9CB8B] hover:text-[#C5A059] flex items-center gap-1 transition">
              Jetzt weitermachen <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Tägliche Aufgaben: Sales & Outbound KPIs (Mo-Fr) ── */}
      <div className="glass-panel fade-up" style={{ animationDelay: "300ms" }}>
        <div className="relative z-[2]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">Täglich · Mo–Fr</span>
              <h2 className="text-lg text-white" style={{ fontFamily: "var(--font-serif)" }}>Sales & Outbound Tracking</h2>
              <p className="text-[12px] text-[rgba(249,249,249,0.4)] mt-0.5">
                {now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
            {dailySaved && (
              <span className="flex items-center gap-1.5 text-[11px] text-[#7FC29B] font-semibold bg-[rgba(127,194,155,0.1)] px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Gespeichert
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            {DAILY_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-3 p-3 rounded-xl border border-[rgba(249,249,249,0.08)]" style={{ background: "rgba(249,249,249,0.03)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${field.color}15`, border: `1px solid ${field.color}30` }}>
                  <field.icon className="w-4 h-4" style={{ color: field.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] text-[rgba(249,249,249,0.4)] block mb-1">{field.label}</label>
                  <input
                    type="number"
                    min="0"
                    value={dailyValues[field.key] || ""}
                    onChange={e => { setDailyValues(p => ({ ...p, [field.key]: e.target.value })); setDailySaved(false); }}
                    placeholder="0"
                    className="w-full bg-transparent text-[16px] text-white outline-none placeholder:text-[rgba(249,249,249,0.15)]"
                    style={{ fontFamily: "var(--font-serif)" }}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={saveDaily}
            disabled={savingDaily}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-[13px] font-semibold text-white transition disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #C5A059, #775A19)", boxShadow: "0 0 18px rgba(197,160,89,0.35)" }}
          >
            {savingDaily ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Tageswerte speichern
          </button>
        </div>
      </div>

      {/* ── Wöchentliche Aufgaben: Finance & Marketing ── */}
      <div className="glass-panel fade-up" style={{ animationDelay: "380ms" }}>
        <div className="relative z-[2]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">Wöchentlich</span>
              <h2 className="text-lg text-white" style={{ fontFamily: "var(--font-serif)" }}>Finance & Marketing</h2>
              <p className="text-[12px] text-[rgba(249,249,249,0.4)] mt-0.5">KW {getISOWeek(now)} · Einmal pro Woche eintragen</p>
            </div>
            {weeklySaved && (
              <span className="flex items-center gap-1.5 text-[11px] text-[#7FC29B] font-semibold bg-[rgba(127,194,155,0.1)] px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Gespeichert
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            {WEEKLY_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-3 p-3 rounded-xl border border-[rgba(249,249,249,0.08)]" style={{ background: "rgba(249,249,249,0.03)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${field.color}15`, border: `1px solid ${field.color}30` }}>
                  <field.icon className="w-4 h-4" style={{ color: field.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] text-[rgba(249,249,249,0.4)] block mb-1">{field.label}</label>
                  <input
                    type="number"
                    min="0"
                    step={field.type === "currency" ? "0.01" : "1"}
                    value={weeklyValues[field.key] || ""}
                    onChange={e => { setWeeklyValues(p => ({ ...p, [field.key]: e.target.value })); setWeeklySaved(false); }}
                    placeholder="0"
                    className="w-full bg-transparent text-[16px] text-white outline-none placeholder:text-[rgba(249,249,249,0.15)]"
                    style={{ fontFamily: "var(--font-serif)" }}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={saveWeekly}
            disabled={savingWeekly}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-[13px] font-semibold text-[#E9CB8B] border border-[rgba(197,160,89,0.3)] hover:bg-[rgba(197,160,89,0.08)] transition disabled:opacity-50"
          >
            {savingWeekly ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Wochenwerte speichern
          </button>
        </div>
      </div>

      {/* ── Kalender / Heute ── */}
      <div className="glass-panel fade-up" style={{ animationDelay: "460ms" }}>
        <div className="relative z-[2]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B]">Kalender</span>
              <span className="text-xs text-[rgba(249,249,249,0.3)]">/</span>
              <span className="text-[13px] font-semibold text-white">Heute</span>
            </div>
            <span className="text-xs font-semibold text-[#E9CB8B] px-3 py-1 rounded-full" style={{ background: "rgba(197,160,89,0.1)", border: "1px solid rgba(197,160,89,0.2)" }}>
              {now.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "2-digit" })}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {["9:00", "10:00", "11:00", "12:00"].map(time => (
              <div key={time} className="flex items-center gap-3 p-3 rounded-lg border border-[rgba(249,249,249,0.08)] hover:border-[rgba(197,160,89,0.2)] transition" style={{ background: "rgba(249,249,249,0.03)" }}>
                <span className="text-xs font-mono text-[rgba(249,249,249,0.3)] w-10">{time}</span>
                <div className="w-px h-6 bg-[rgba(249,249,249,0.08)]" />
                <span className="text-xs text-[rgba(249,249,249,0.4)]">Frei</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getISOWeek(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}
