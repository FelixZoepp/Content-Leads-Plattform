import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Save, TrendingUp, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface KPIConfig {
  id: string;
  label: string;
  placeholder: string;
  tooltip: string;
  dbField: string;
  benchmarks: { green: number; yellow: number } | { greenPct: number; yellowPct: number } | null;
  direction: "higher" | "lower";
  relativeTo?: string;
}

const DAILY_KPIS: KPIConfig[] = [
  {
    id: "connection_requests",
    label: "LinkedIn Connection Requests",
    placeholder: "z.B. 25",
    tooltip: "Gesendete Verbindungsanfragen heute",
    dbField: "dms_sent",
    benchmarks: { green: 20, yellow: 10 },
    direction: "higher",
  },
  {
    id: "anwahlen",
    label: "Anwahlen",
    placeholder: "z.B. 160",
    tooltip: "Gesamte Anwahlen inkl. Signal-Calls",
    dbField: "calls_made",
    benchmarks: { green: 150, yellow: 50 },
    direction: "higher",
  },
  {
    id: "erreicht_entscheider",
    label: "Entscheider erreicht",
    placeholder: "z.B. 38",
    tooltip: "Davon Entscheider direkt erreicht",
    dbField: "calls_reached",
    benchmarks: { greenPct: 25, yellowPct: 15 },
    direction: "higher",
    relativeTo: "anwahlen",
  },
  {
    id: "gatekeeper",
    label: "Am Gatekeeper hängengeblieben",
    placeholder: "z.B. 12",
    tooltip: "Nicht zum Entscheider durchgekommen",
    dbField: "calls_interested",
    benchmarks: { greenPct: 10, yellowPct: 20 },
    direction: "lower",
    relativeTo: "anwahlen",
  },
  {
    id: "callbacks",
    label: "Callbacks / Rückrufe",
    placeholder: "z.B. 5",
    tooltip: "Rückrufe erhalten heute",
    dbField: "leads_qualified",
    benchmarks: null,
    direction: "higher",
  },
  {
    id: "termine_gebucht",
    label: "Setting-Termine gebucht",
    placeholder: "z.B. 4",
    tooltip: "Heute gebuchte Setting-Termine (Outbound)",
    dbField: "appointments",
    benchmarks: null,
    direction: "higher",
  },
];

type StatusType = "empty" | "neutral" | "green" | "yellow" | "red";

function getStatus(kpi: KPIConfig, value: string, allValues: Record<string, string>): StatusType {
  if (value === "" || value === undefined) return "empty";
  const num = parseFloat(value);
  if (isNaN(num)) return "empty";
  if (kpi.benchmarks === null) return "neutral";

  if (kpi.relativeTo) {
    const base = parseFloat(allValues[kpi.relativeTo]);
    if (!base || base === 0) return "neutral";
    const pct = (num / base) * 100;
    const b = kpi.benchmarks as { greenPct: number; yellowPct: number };
    if (kpi.direction === "lower") {
      if (pct <= b.greenPct) return "green";
      if (pct <= b.yellowPct) return "yellow";
      return "red";
    }
    if (pct >= b.greenPct) return "green";
    if (pct >= b.yellowPct) return "yellow";
    return "red";
  }

  const b = kpi.benchmarks as { green: number; yellow: number };
  if (kpi.direction === "higher") {
    if (num >= b.green) return "green";
    if (num >= b.yellow) return "yellow";
    return "red";
  }
  return "neutral";
}

const statusLabel: Record<string, string> = {
  green: "Ziel erreicht",
  yellow: "Optimierungsbedarf",
  red: "Sofort handeln",
};

const statusColors: Record<string, { main: string; light: string; bg: string }> = {
  green: { main: "hsl(152 69% 41%)", light: "hsl(160 68% 56%)", bg: "hsl(152 69% 41% / 0.12)" },
  yellow: { main: "hsl(45 93% 47%)", light: "hsl(45 97% 54%)", bg: "hsl(45 93% 47% / 0.10)" },
  red: { main: "hsl(0 84% 60%)", light: "hsl(0 86% 70%)", bg: "hsl(0 84% 60% / 0.10)" },
};

function getPctDisplay(kpi: KPIConfig, value: string, allValues: Record<string, string>) {
  if (!kpi.relativeTo) return null;
  const base = parseFloat(allValues[kpi.relativeTo]);
  const num = parseFloat(value);
  if (!base || base === 0 || isNaN(num)) return null;
  return ((num / base) * 100).toFixed(1) + "%";
}

interface Props {
  tenantId: string;
  onEntryAdded: () => void;
}

export function DailyKPIInput({ tenantId, onEntryAdded }: Props) {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingId, setExistingId] = useState<number | null>(null);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    loadExisting(entryDate);
  }, [tenantId, entryDate]);

  const loadExisting = async (date: string) => {
    const { data } = await supabase
      .from("metrics_snapshot")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("period_date", date)
      .maybeSingle();

    if (data) {
      setExistingId(data.id);
      const loaded: Record<string, string> = {};
      DAILY_KPIS.forEach((kpi) => {
        const val = data[kpi.dbField as keyof typeof data];
        if (val !== null && val !== undefined && val !== 0) {
          loaded[kpi.id] = String(val);
        }
      });
      setValues(loaded);
    } else {
      setExistingId(null);
      setValues({});
    }
    setSubmitted(false);
  };

  const handleChange = (id: string, val: string) => {
    setValues((p) => ({ ...p, [id]: val }));
    setSubmitted(false);
  };

  const filledCount = DAILY_KPIS.filter((k) => values[k.id] && values[k.id] !== "").length;
  const allFilled = filledCount === DAILY_KPIS.length;

  const statusCounts = DAILY_KPIS.reduce(
    (a, kpi) => {
      const s = getStatus(kpi, values[kpi.id], values);
      if (s === "green") a.green++;
      if (s === "yellow") a.yellow++;
      if (s === "red") a.red++;
      return a;
    },
    { green: 0, yellow: 0, red: 0 }
  );

  const handleSubmit = async () => {
    setLoading(true);
    const payload: Record<string, any> = {};
    DAILY_KPIS.forEach((kpi) => {
      payload[kpi.dbField] = parseInt(values[kpi.id]) || 0;
    });

    let error;
    if (existingId) {
      ({ error } = await supabase.from("metrics_snapshot").update(payload).eq("id", existingId));
    } else {
      ({ error } = await supabase.from("metrics_snapshot").insert({
        tenant_id: tenantId,
        period_date: entryDate,
        period_type: "daily",
        ...payload,
      }));
    }

    setLoading(false);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      setSubmitted(true);
      toast({ title: "Gespeichert ✓", description: `Tageswerte für ${new Date(entryDate).toLocaleDateString("de-DE")} gespeichert` });
      onEntryAdded();
    }
  };

  const today = new Date(entryDate).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="glass-card rounded-2xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_12px_hsl(var(--primary)/0.5)]" />
            <span className="text-[11px] font-semibold tracking-[2px] uppercase text-primary font-mono">
              Daily Tracking
            </span>
          </div>
          <Input
            type="date"
            max={new Date().toISOString().split("T")[0]}
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="w-auto max-w-[180px] glass-card border-white/[0.08]"
          />
        </div>
        <h2 className="text-2xl font-bold text-foreground mt-3">Tägliche Kennzahlen</h2>
        <p className="text-sm text-muted-foreground mt-1">{today}</p>

        {/* Progress bar */}
        <div className="mt-5 space-y-2">
          <div className="flex justify-between">
            <span className="text-xs text-muted-foreground font-medium">Fortschritt</span>
            <span className="text-xs font-mono font-medium" style={{ color: allFilled ? "hsl(152 69% 41%)" : "hsl(var(--muted-foreground))" }}>
              {filledCount}/{DAILY_KPIS.length}
            </span>
          </div>
          <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: allFilled
                  ? "linear-gradient(90deg, hsl(152 69% 41%), hsl(160 68% 56%))"
                  : "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
              }}
              animate={{ width: `${(filledCount / DAILY_KPIS.length) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="space-y-3">
        {DAILY_KPIS.map((kpi, idx) => {
          const status = getStatus(kpi, values[kpi.id], values);
          const pct = getPctDisplay(kpi, values[kpi.id], values);
          const colors = statusColors[status];

          return (
            <motion.div
              key={kpi.id}
              className="glass-card rounded-2xl p-5 transition-all duration-300"
              style={{
                borderColor: colors ? colors.main + "66" : "hsl(var(--border))",
                background: colors
                  ? `linear-gradient(135deg, hsl(var(--card)) 0%, ${colors.bg} 100%)`
                  : undefined,
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 + idx * 0.04 }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <Label className="text-sm font-semibold text-foreground">{kpi.label}</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.tooltip}</p>
                </div>
                <AnimatePresence>
                  {status !== "empty" && status !== "neutral" && colors && (
                    <motion.div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-mono whitespace-nowrap"
                      style={{ background: colors.bg, color: colors.light }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: colors.main }}
                      />
                      {statusLabel[status]}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder={kpi.placeholder}
                  value={values[kpi.id] || ""}
                  onChange={(e) => handleChange(kpi.id, e.target.value)}
                  className="flex-1 h-12 text-lg font-semibold font-mono bg-white/[0.04] border-white/[0.08] rounded-xl focus-visible:ring-primary/40"
                />
                {pct && (
                  <span
                    className="text-sm font-semibold font-mono min-w-[60px] text-right"
                    style={{ color: colors?.light || "hsl(var(--muted-foreground))" }}
                  >
                    {pct}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            className="glass-card rounded-2xl p-5 border-primary/20"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <p className="text-[11px] font-semibold tracking-[1px] uppercase text-primary font-mono mb-4 flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5" />
              Tages-Zusammenfassung
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Grün", count: statusCounts.green, ...statusColors.green },
                { label: "Gelb", count: statusCounts.yellow, ...statusColors.yellow },
                { label: "Rot", count: statusCounts.red, ...statusColors.red },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: s.bg }}>
                  <div className="text-2xl font-bold font-mono" style={{ color: s.main }}>
                    {s.count}
                  </div>
                  <div className="text-[11px] font-medium mt-1" style={{ color: s.light, opacity: 0.8 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={!allFilled || loading}
        className="w-full h-12 rounded-xl text-[15px] font-semibold gap-2 shadow-[0_4px_24px_hsl(var(--primary)/0.3)]"
      >
        {submitted ? (
          <>
            <Check className="h-4 w-4" /> Gespeichert
          </>
        ) : (
          <>
            <Save className="h-4 w-4" /> {loading ? "Wird gespeichert..." : existingId ? "Tageswerte aktualisieren" : "Tageswerte speichern"}
          </>
        )}
      </Button>
    </div>
  );
}
