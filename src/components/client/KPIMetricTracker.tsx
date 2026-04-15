import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Zap } from "lucide-react";

export interface KPIMetricConfig {
  key: string;
  label: string;
  icon: string;
  unit?: "%" | "€" | "number";
  target: number;
  higherIsBetter: boolean;
  /** fraction of target below which it's "critical" (default 0.7) */
  criticalThreshold?: number;
  getValue: (metrics: any[]) => number | null;
  formatValue?: (v: number) => string;
  getImpact: (current: number, target: number) => string;
  actions: string[];
}

interface Props {
  configs: KPIMetricConfig[];
  metrics: any[];
  title?: string;
}

function TrackBadge({ status }: { status: "on-track" | "off-track" | "critical" }) {
  const map = {
    "on-track": { label: "On Track ✓", bg: "hsl(142 71% 45% / 0.15)", color: "hsl(142 71% 55%)", border: "hsl(142 71% 55% / 0.3)" },
    "off-track": { label: "Optimierung nötig", bg: "hsl(38 92% 50% / 0.15)", color: "hsl(38 92% 60%)", border: "hsl(38 92% 50% / 0.3)" },
    critical: { label: "Kritisch ⚠", bg: "hsl(0 84% 50% / 0.15)", color: "hsl(0 84% 65%)", border: "hsl(0 84% 50% / 0.3)" },
  };
  const { label, bg, color, border } = map[status];
  return (
    <span
      className="text-xs font-semibold px-3 py-1 rounded-full"
      style={{ background: bg, color, border: `1px solid ${border}` }}
    >
      {label}
    </span>
  );
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted) / 0.4)" }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}66` }}
        initial={{ width: 0 }}
        animate={{ width: `${clampedPercent}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

function KPICard({ config, metrics }: { config: KPIMetricConfig; metrics: any[] }) {
  const raw = config.getValue(metrics);
  const hasData = raw !== null && raw !== undefined;
  const current = raw ?? 0;
  const target = config.target;
  const higherIsBetter = config.higherIsBetter;
  const criticalThreshold = config.criticalThreshold ?? 0.7;

  let status: "on-track" | "off-track" | "critical" = "on-track";
  let progressPercent = 0;

  if (hasData) {
    if (higherIsBetter) {
      progressPercent = Math.min(100, (current / target) * 100);
      if (current >= target) status = "on-track";
      else if (current >= target * criticalThreshold) status = "off-track";
      else status = "critical";
    } else {
      // lower is better (e.g. cost per lead)
      progressPercent = current <= target ? 100 : Math.max(0, 100 - ((current - target) / target) * 100);
      if (current <= target) status = "on-track";
      else if (current <= target * (1 + (1 - criticalThreshold))) status = "off-track";
      else status = "critical";
    }
  }

  const colorMap = {
    "on-track": "hsl(142 71% 55%)",
    "off-track": "hsl(38 92% 60%)",
    critical: "hsl(0 84% 65%)",
  };
  const glowColor = colorMap[status];

  const formatVal = (v: number) => {
    if (config.formatValue) return config.formatValue(v);
    if (config.unit === "%") return `${v.toFixed(1)}%`;
    if (config.unit === "€") return `${v.toLocaleString("de-DE")}€`;
    return `${v}`;
  };

  const leftAccentColor = {
    "on-track": "hsl(142 71% 55%)",
    "off-track": "hsl(38 92% 60%)",
    critical: "hsl(0 84% 55%)",
  }[status];

  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.005, y: -1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      {/* Glass bg */}
      <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.07] rounded-2xl" />
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ background: leftAccentColor, boxShadow: `0 0 12px ${leftAccentColor}88` }}
      />
      {/* Hover glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ boxShadow: `0 0 40px -10px ${glowColor}44, inset 0 0 20px -10px ${glowColor}11` }}
      />
      {/* Top shimmer */}
      <div
        className="absolute top-0 left-0 right-0 h-px opacity-30"
        style={{ background: `linear-gradient(90deg, transparent, ${glowColor}88, transparent)` }}
      />

      <div className="relative z-10 p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: `${glowColor}18`, border: `1px solid ${glowColor}30` }}
            >
              {config.icon}
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm leading-tight">{config.label}</h3>
              {hasData ? (
                <p className="text-xs mt-0.5" style={{ color: glowColor }}>
                  Aktuell: {formatVal(current)} → Ziel: {formatVal(target)}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">Noch keine Daten</p>
              )}
            </div>
          </div>
          <TrackBadge status={hasData ? status : "off-track"} />
        </div>

        {/* Progress bar */}
        {hasData && (
          <div className="space-y-1">
            <ProgressBar percent={progressPercent} color={glowColor} />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0</span>
              <span className="font-medium" style={{ color: glowColor }}>{progressPercent.toFixed(0)}% vom Ziel</span>
              <span>{formatVal(target)}</span>
            </div>
          </div>
        )}

        {/* Impact */}
        {hasData && (
          <div
            className="flex items-start gap-2 p-3 rounded-xl"
            style={{ background: `${glowColor}0e`, border: `1px solid ${glowColor}1a` }}
          >
            {status === "on-track" ? (
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: glowColor }} />
            ) : (
              <Zap className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: glowColor }} />
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: glowColor }}>
                {status === "on-track" ? "Impact" : "Erwarteter Impact"}
              </p>
              <p className="text-xs text-foreground font-medium">{config.getImpact(current, target)}</p>
            </div>
          </div>
        )}

        {/* Action Steps */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: glowColor, boxShadow: `0 0 6px ${glowColor}` }}
            />
            Handlungsschritte
          </p>
          <div className="space-y-2">
            {config.actions.map((action, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-lg text-[10px] font-bold flex items-center justify-center mt-0.5"
                  style={{ background: `${glowColor}18`, color: glowColor, border: `1px solid ${glowColor}28` }}
                >
                  {i + 1}
                </span>
                <span className="text-xs text-muted-foreground leading-relaxed">{action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function KPIMetricTracker({ configs, metrics, title }: Props) {
  if (!metrics || metrics.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title || "KPI-Tracker & Handlungsempfehlungen"}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configs.map((config) => (
          <KPICard key={config.key} config={config} metrics={metrics} />
        ))}
      </div>
    </div>
  );
}
