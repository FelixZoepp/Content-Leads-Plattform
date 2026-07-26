import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Save, Check, Loader2, ChevronLeft, ChevronRight, CalendarDays, AlertCircle } from "lucide-react";

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

  useEffect(() => {
    if (user) loadMetrics();
  }, [user]);

  useEffect(() => {
    if (user && metrics.length) loadDayData();
  }, [user, date, metrics]);

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

    // Load today's values
    const { data: todayData } = await (supabase as any)
      .from("daily_metrics")
      .select("metric_slug, value, source")
      .eq("user_id", user.id)
      .eq("date", date);

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
  }

  async function saveMetric(slug: string) {
    if (!user) return;
    const val = values[slug]?.value;
    if (val === "" || val === undefined) return;

    setSaving(slug);
    const numVal = parseFloat(val) || 0;
    const isBackfill = date < new Date().toISOString().split("T")[0];

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
  }

  async function markZeroDay() {
    if (!user) return;
    setSaving("zero");
    for (const m of metrics) {
      if (!values[m.slug]?.saved) {
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

  const isToday = date === new Date().toISOString().split("T")[0];
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
      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => changeDate(-1)} className="p-2 rounded-xl hover:bg-[rgba(249,249,249,0.04)] transition">
          <ChevronLeft className="w-5 h-5 text-[rgba(249,249,249,0.5)]" />
        </button>
        <div className="text-center">
          <div className="flex items-center gap-2 justify-center">
            <CalendarDays className="w-4 h-4 text-[#E9CB8B]" />
            <span className="text-[15px] font-semibold text-white">
              {isToday ? "Heute" : new Date(date).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </div>
          {!isToday && (
            <span className="text-[10px] text-[rgba(249,249,249,0.3)] uppercase tracking-wider">Nachtrag</span>
          )}
        </div>
        <button onClick={() => changeDate(1)} disabled={isToday} className="p-2 rounded-xl hover:bg-[rgba(249,249,249,0.04)] transition disabled:opacity-20">
          <ChevronRight className="w-5 h-5 text-[rgba(249,249,249,0.5)]" />
        </button>
      </div>

      {/* Progress */}
      <div className="glass-panel" style={{ padding: "12px 16px" }}>
        <div className="relative z-[2] flex items-center gap-3">
          <div className="flex-1">
            <div className="h-2 bg-[rgba(249,249,249,0.06)] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #C5A059, #E9CB8B)" }} />
            </div>
          </div>
          <span className="text-[13px] font-semibold text-[#E9CB8B] tabular-nums">{filledCount}/{totalCount}</span>
        </div>
      </div>

      {/* Metric Inputs */}
      <div className="space-y-2">
        {metrics.map(m => {
          const v = values[m.slug];
          const yVal = yesterdayValues[m.slug];
          return (
            <div key={m.slug} className="glass-panel" style={{ padding: "12px 16px" }}>
              <div className="relative z-[2]">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[12px] font-medium text-white">
                    {m.label}
                    {m.is_mandatory && <span className="text-[#E87467] ml-0.5">*</span>}
                  </label>
                  <div className="flex items-center gap-2">
                    {yVal !== undefined && (
                      <span className="text-[10px] text-[rgba(249,249,249,0.3)]">Gestern: {m.unit === "EUR" ? `€${yVal}` : yVal}</span>
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
                    className="flex-1 bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3 py-2.5 text-[15px] text-white tabular-nums outline-none focus:border-[rgba(197,160,89,0.3)] transition placeholder:text-[rgba(249,249,249,0.15)]"
                    style={{ minHeight: 44 }}
                  />
                  {saving === m.slug && <Loader2 className="w-5 h-5 animate-spin text-[#E9CB8B] mt-2.5" />}
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
          style={{ background: "linear-gradient(135deg, #C5A059, #775A19)", boxShadow: "0 0 18px rgba(197,160,89,0.25)" }}
        >
          {saving === "all" ? <Loader2 className="w-4 h-4 animate-spin" /> : allSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {allSaved ? "Gespeichert" : "Alles speichern"}
        </button>
      </div>
    </div>
  );
}
