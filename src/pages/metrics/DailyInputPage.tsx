import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Save, Check, Loader2, ChevronLeft, ChevronRight,
  CalendarDays, AlertCircle, ShieldCheck,
} from "lucide-react";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { de } from "date-fns/locale";

interface MetricDef {
  slug: string;
  label: string;
  unit: string;
  type: string;
  is_mandatory: boolean;
  is_derived: boolean;
  order: number;
}

interface DayValues {
  [slug: string]: { value: string; saved: boolean; source: string };
}

// Status of each day in the navigation window (last 7 days)
type DayStatus = "today" | "has_entry" | "zero_day" | "empty" | "future";

interface DayInfo {
  dateStr: string;
  status: DayStatus;
}

// ── Compliance score badge ──────────────────────────────────────────────────
function ComplianceHeader({ score }: { score: number }) {
  const color = score >= 80 ? "#7FC29B" : score >= 50 ? "#E9CB8B" : "#E87467";
  const label = score >= 80 ? "Gut" : score >= 50 ? "Ausbaufähig" : "Lückenhaft";
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl border"
      style={{
        borderColor: `${color}30`,
        background: `${color}08`,
      }}
    >
      <ShieldCheck className="w-4 h-4" style={{ color }} />
      <div>
        <span className="text-[13px] font-bold" style={{ color }}>
          {score}%
        </span>
        <span className="text-[11px] text-[rgba(249,249,249,0.4)] ml-1.5">
          Compliance letzte 7 Tage · {label}
        </span>
      </div>
    </div>
  );
}

// ── Day dot indicator ───────────────────────────────────────────────────────
function DayDot({ status, isActive }: { status: DayStatus; isActive: boolean }) {
  const colors: Record<DayStatus, string> = {
    today:     "#C5A059",
    has_entry: "#7FC29B",
    zero_day:  "rgba(249,249,249,0.2)",
    empty:     "#E87467",
    future:    "rgba(249,249,249,0.08)",
  };
  return (
    <span
      className="inline-block w-2 h-2 rounded-full transition-all duration-200"
      style={{
        background: colors[status],
        transform: isActive ? "scale(1.5)" : "scale(1)",
        boxShadow: isActive ? `0 0 6px ${colors[status]}` : "none",
      }}
    />
  );
}

export default function DailyInputPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<MetricDef[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [values, setValues] = useState<DayValues>({});
  const [yesterdayValues, setYesterdayValues] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [allSaved, setAllSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // CL-150: zero_day and compliance state
  const [isZeroDay, setIsZeroDay] = useState(false);
  const [complianceScore, setComplianceScore] = useState<number | null>(null);
  const [dayInfos, setDayInfos] = useState<DayInfo[]>([]);

  useEffect(() => {
    if (user) loadMetrics();
  }, [user]);

  useEffect(() => {
    if (user && metrics.length) loadDayData();
  }, [user, date, metrics]);

  // CL-150: load compliance + day statuses whenever user changes
  useEffect(() => {
    if (user) loadComplianceData();
  }, [user]);

  async function loadMetrics() {
    const { data } = await (supabase as any)
      .from("metric_definitions")
      .select("*")
      .eq("is_derived", false)
      .order("order");
    setMetrics(data || []);
    setLoading(false);
  }

  async function loadDayData() {
    if (!user) return;

    const { data: todayData } = await (supabase as any)
      .from("daily_metrics")
      .select("metric_slug, value, source, is_zero_day")
      .eq("user_id", user.id)
      .eq("date", date);

    // Check if this day is a zero_day
    const zeroDay = todayData?.some((d: any) => d.is_zero_day === true) ?? false;
    setIsZeroDay(zeroDay);

    const vals: DayValues = {};
    for (const m of metrics) {
      const existing = todayData?.find((d: any) => d.metric_slug === m.slug);
      vals[m.slug] = {
        value: existing ? String(existing.value) : "",
        saved: !!existing,
        source: existing?.source || "manual",
      };
    }
    setValues(vals);

    // Load yesterday's values for reference
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split("T")[0];

    const { data: yData } = await (supabase as any)
      .from("daily_metrics")
      .select("metric_slug, value")
      .eq("user_id", user.id)
      .eq("date", yStr);

    const yVals: Record<string, number> = {};
    for (const d of yData || []) {
      yVals[d.metric_slug] = Number(d.value);
    }
    setYesterdayValues(yVals);

    // Refresh compliance after loading day data
    loadComplianceData();
  }

  async function loadComplianceData() {
    if (!user) return;

    const sevenAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
    const today = new Date().toISOString().split("T")[0];

    const { data: allRows } = await (supabase as any)
      .from("daily_metrics")
      .select("date, is_zero_day")
      .eq("user_id", user.id)
      .gte("date", sevenAgo);

    const rows: { date: string; is_zero_day: boolean }[] = allRows || [];

    // Build day infos for navigation dots
    const last7 = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
    const infos: DayInfo[] = last7.map(d => {
      const ds = format(d, "yyyy-MM-dd");
      const dayRows = rows.filter(r => r.date === ds);
      const hasEntry = dayRows.length > 0;
      const allZero = hasEntry && dayRows.every(r => r.is_zero_day);
      let status: DayStatus;
      if (ds === today) {
        status = "today";
      } else if (allZero) {
        status = "zero_day";
      } else if (hasEntry) {
        status = "has_entry";
      } else {
        status = "empty";
      }
      return { dateStr: ds, status };
    });
    setDayInfos(infos);

    // Compliance: business days with any entry (non-future)
    const businessDays = last7.filter(d => {
      const dow = d.getDay();
      const ds = format(d, "yyyy-MM-dd");
      return dow !== 0 && dow !== 6 && ds <= today;
    });
    const daysWithEntry = businessDays.filter(d => {
      const ds = format(d, "yyyy-MM-dd");
      return rows.some(r => r.date === ds);
    });
    const score = businessDays.length > 0
      ? Math.round((daysWithEntry.length / businessDays.length) * 100)
      : 100;
    setComplianceScore(score);
  }

  async function saveMetric(slug: string) {
    if (!user) return;
    const val = values[slug]?.value;
    if (val === "" || val === undefined) return;

    setSaving(slug);
    const numVal = parseFloat(val) || 0;
    const today = new Date().toISOString().split("T")[0];
    const isBackfill = date < today;

    await (supabase as any)
      .from("daily_metrics")
      .upsert({
        user_id: user.id,
        metric_slug: slug,
        date,
        value: numVal,
        source: isBackfill ? "nachgetragen" : "manual",
        is_zero_day: numVal === 0,
      }, { onConflict: "user_id,metric_slug,date" });

    setValues(prev => ({
      ...prev,
      [slug]: { ...prev[slug], saved: true, source: isBackfill ? "nachgetragen" : "manual" },
    }));
    setSaving(null);

    // Auto-focus next input
    const slugs = metrics.map(m => m.slug);
    const idx = slugs.indexOf(slug);
    if (idx < slugs.length - 1) {
      inputRefs.current[slugs[idx + 1]]?.focus();
    }
  }

  async function saveAll() {
    setSaving("all");
    for (const m of metrics) {
      if (values[m.slug]?.value !== "" && !values[m.slug]?.saved) {
        await saveMetric(m.slug);
      }
    }
    setAllSaved(true);
    setSaving(null);
    setTimeout(() => setAllSaved(false), 2000);
    await loadComplianceData();
  }

  async function markZeroDay() {
    if (!user) return;
    setSaving("zero");
    for (const m of metrics) {
      await (supabase as any)
        .from("daily_metrics")
        .upsert({
          user_id: user.id,
          metric_slug: m.slug,
          date,
          value: 0,
          source: "manual",
          is_zero_day: true,
        }, { onConflict: "user_id,metric_slug,date" });
    }
    await loadDayData();
    setSaving(null);
  }

  function changeDate(delta: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    const today = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const minDate = sevenDaysAgo.toISOString().split("T")[0];

    const newDate = d.toISOString().split("T")[0];
    if (newDate > today || newDate < minDate) return;
    setDate(newDate);
  }

  const today = new Date().toISOString().split("T")[0];
  const isToday = date === today;
  const filledCount = Object.values(values).filter(v => v.saved).length;
  const totalCount = metrics.length;
  const pct = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[rgba(249,249,249,0.3)]" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 lg:p-6 space-y-4">
      {/* CL-150: Compliance score header */}
      {complianceScore !== null && (
        <ComplianceHeader score={complianceScore} />
      )}

      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => changeDate(-1)} className="p-2 rounded-xl hover:bg-[rgba(249,249,249,0.04)] transition">
          <ChevronLeft className="w-5 h-5 text-[rgba(249,249,249,0.5)]" />
        </button>
        <div className="text-center">
          <div className="flex items-center gap-2 justify-center">
            <CalendarDays className="w-4 h-4 text-[#E9CB8B]" />
            <span className="text-[15px] font-semibold text-white">
              {isToday
                ? "Heute"
                : new Date(date).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
            </span>
            {/* CL-150: zero_day badge */}
            {isZeroDay && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(249,249,249,0.07)] text-[rgba(249,249,249,0.4)] border border-[rgba(249,249,249,0.1)]">
                Nulltag
              </span>
            )}
          </div>
          {!isToday && (
            <span className="text-[10px] text-[rgba(249,249,249,0.3)] uppercase tracking-wider">Nachtrag</span>
          )}

          {/* CL-150: Day status dots */}
          {dayInfos.length > 0 && (
            <div className="flex items-center gap-1.5 justify-center mt-2">
              {dayInfos.map(info => (
                <button
                  key={info.dateStr}
                  onClick={() => {
                    const d = new Date(info.dateStr + "T12:00:00");
                    const newDate = d.toISOString().split("T")[0];
                    if (newDate <= today) setDate(newDate);
                  }}
                  title={format(new Date(info.dateStr + "T12:00:00"), "EEEE, d. MMM", { locale: de })}
                  className="p-0.5"
                >
                  <DayDot status={info.status} isActive={info.dateStr === date} />
                </button>
              ))}
            </div>
          )}

          {/* CL-150: legend */}
          {dayInfos.length > 0 && (
            <div className="flex items-center gap-3 justify-center mt-1.5 flex-wrap">
              {[
                { status: "has_entry" as DayStatus, label: "Einträge" },
                { status: "zero_day" as DayStatus, label: "Nulltag" },
                { status: "empty" as DayStatus, label: "Fehlend" },
              ].map(({ status, label }) => (
                <span key={status} className="flex items-center gap-1">
                  <DayDot status={status} isActive={false} />
                  <span className="text-[9px] text-[rgba(249,249,249,0.25)] uppercase tracking-wide">{label}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => changeDate(1)}
          disabled={isToday}
          className="p-2 rounded-xl hover:bg-[rgba(249,249,249,0.04)] transition disabled:opacity-20"
        >
          <ChevronRight className="w-5 h-5 text-[rgba(249,249,249,0.5)]" />
        </button>
      </div>

      {/* Progress */}
      <div className="glass-panel" style={{ padding: "12px 16px" }}>
        <div className="relative z-[2] flex items-center gap-3">
          <div className="flex-1">
            <div className="h-2 bg-[rgba(249,249,249,0.06)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  background: isZeroDay
                    ? "rgba(249,249,249,0.15)"
                    : "linear-gradient(90deg, #C5A059, #E9CB8B)",
                }}
              />
            </div>
          </div>
          <span className="text-[13px] font-semibold text-[#E9CB8B] tabular-nums">
            {filledCount}/{totalCount}
          </span>
        </div>
      </div>

      {/* Metric Inputs */}
      <div className="space-y-2">
        {metrics.map(m => {
          const v = values[m.slug];
          const yVal = yesterdayValues[m.slug];
          const isFieldZero = v?.saved && Number(v.value) === 0;

          return (
            <div
              key={m.slug}
              className="glass-panel"
              style={{
                padding: "12px 16px",
                opacity: isZeroDay && !v?.saved ? 0.5 : 1,
              }}
            >
              <div className="relative z-[2]">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[12px] font-medium text-white">
                    {m.label}
                    {m.is_mandatory && <span className="text-[#E87467] ml-0.5">*</span>}
                  </label>
                  <div className="flex items-center gap-2">
                    {yVal !== undefined && (
                      <span className="text-[10px] text-[rgba(249,249,249,0.3)]">
                        Gestern: {m.unit === "EUR" ? `€${yVal}` : yVal}
                      </span>
                    )}
                    {/* Source badge */}
                    {v?.saved && v.source && v.source !== "manual" && (
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded tracking-wide ${
                          v.source === "nachgetragen"
                            ? "bg-[rgba(233,203,139,0.1)] text-[#E9CB8B]"
                            : "bg-[rgba(127,194,155,0.1)] text-[#7FC29B]"
                        }`}
                      >
                        {v.source === "nachgetragen" ? "nachgetragen" : v.source.replace("api:", "")}
                      </span>
                    )}
                    {v?.saved && (
                      <Check className="w-3.5 h-3.5 text-[#7FC29B]" />
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    ref={el => { inputRefs.current[m.slug] = el; }}
                    type="number"
                    inputMode="numeric"
                    value={v?.value || ""}
                    onChange={e => setValues(prev => ({
                      ...prev,
                      [m.slug]: { value: e.target.value, saved: false, source: "manual" },
                    }))}
                    onKeyDown={e => {
                      if (e.key === "Enter") saveMetric(m.slug);
                      if (e.key === "Tab" && !e.shiftKey) {
                        e.preventDefault();
                        saveMetric(m.slug);
                      }
                    }}
                    onBlur={() => { if (v?.value && !v.saved) saveMetric(m.slug); }}
                    placeholder={m.unit === "EUR" ? "€ 0" : "0"}
                    className={`flex-1 bg-[rgba(10,11,11,0.4)] border rounded-lg px-3 py-2.5 text-[15px] text-white tabular-nums outline-none transition placeholder:text-[rgba(249,249,249,0.15)] ${
                      isFieldZero && v?.saved
                        ? "border-[rgba(249,249,249,0.06)]"
                        : "border-[rgba(249,249,249,0.08)] focus:border-[rgba(197,160,89,0.3)]"
                    }`}
                    style={{ minHeight: 44 }}
                  />
                  {saving === m.slug && (
                    <Loader2 className="w-5 h-5 animate-spin text-[#E9CB8B] mt-2.5" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={markZeroDay}
          disabled={saving !== null}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[12px] font-medium text-[rgba(249,249,249,0.5)] border border-[rgba(249,249,249,0.08)] hover:bg-[rgba(249,249,249,0.04)] transition disabled:opacity-30"
        >
          <AlertCircle className="w-4 h-4" />
          Heute nichts gemacht
        </button>
        <button
          onClick={saveAll}
          disabled={saving !== null || filledCount === totalCount}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[13px] font-semibold text-white transition disabled:opacity-30"
          style={{
            background: "linear-gradient(135deg, #C5A059, #775A19)",
            boxShadow: "0 0 18px rgba(197,160,89,0.25)",
          }}
        >
          {saving === "all" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : allSaved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {allSaved ? "Gespeichert" : "Alles speichern"}
        </button>
      </div>
    </div>
  );
}
