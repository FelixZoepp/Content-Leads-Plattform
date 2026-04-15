import React from "react";

/** Shared Recharts styling for Apple Liquid Glass aesthetic */

export const glassGridProps = {
  strokeDasharray: "none",
  stroke: "hsl(0 0% 100% / 0.04)",
  strokeWidth: 1,
};

export const glassAxisProps = {
  tick: { fontSize: 10, fill: "hsl(215 12% 45%)", fontWeight: 500 },
  axisLine: false,
  tickLine: false,
};

export const glassXAxisProps = {
  ...glassAxisProps,
  dy: 8,
};

export const glassYAxisProps = {
  ...glassAxisProps,
  dx: -4,
};

export const glassLegendStyle: React.CSSProperties = {
  fontSize: 11,
  paddingTop: 12,
  fontWeight: 500,
  color: "hsl(215 12% 55%)",
};

/** Premium glass tooltip */
export function GlassTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-4 py-3 text-xs"
      style={{
        background: "hsl(222 22% 10% / 0.92)",
        backdropFilter: "blur(24px) saturate(1.8)",
        WebkitBackdropFilter: "blur(24px) saturate(1.8)",
        border: "1px solid hsl(0 0% 100% / 0.08)",
        boxShadow: "0 8px 32px -4px rgb(0 0 0 / 0.5), inset 0 1px 0 0 hsl(0 0% 100% / 0.06)",
      }}
    >
      <p className="text-muted-foreground font-medium mb-1.5">{label}</p>
      <div className="space-y-1">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: entry.color,
                boxShadow: `0 0 6px ${entry.color}88`,
              }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="text-foreground font-semibold tabular-nums ml-auto">
              {formatter ? formatter(entry.value) : entry.value?.toLocaleString("de-DE")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Gradient definitions for area/bar charts */
export function ChartGradient({ id, color }: { id: string; color: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={0.4} />
      <stop offset="95%" stopColor={color} stopOpacity={0.02} />
    </linearGradient>
  );
}

/** Bar radius for rounded bars */
export const barRadius: [number, number, number, number] = [6, 6, 0, 0];
export const barRadiusSm: [number, number, number, number] = [4, 4, 0, 0];
