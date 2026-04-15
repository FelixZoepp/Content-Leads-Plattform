import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from "recharts";
import { GlassTooltip, glassGridProps, glassXAxisProps, glassYAxisProps, glassLegendStyle, ChartGradient, barRadius } from "@/components/charts/chartStyles";

interface Props {
  metrics: any[];
  timeRange?: string;
}

export function SalesCharts({ metrics, timeRange = "daily" }: Props) {
  if (!metrics || metrics.length === 0) return null;

  const dateKey = timeRange === "daily" ? "period_date" : "period_start";

  const chartData = [...metrics].reverse().map(m => ({
    date: new Date(m[dateKey]).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
    Anwahlen: parseFloat(m.calls_made) || 0,
    Erreicht: parseFloat(m.calls_reached) || 0,
    Interessiert: parseFloat(m.calls_interested) || 0,
    Termine: parseFloat(m.appointments) || 0,
    "Sett. geplant": parseFloat(m.settings_planned) || 0,
    "Sett. gehalten": parseFloat(m.settings_held) || 0,
    "Clos. geplant": parseFloat(m.closings_planned) || 0,
    "Clos. gehalten": parseFloat(m.closings_held) || 0,
    Deals: parseFloat(m.deals) || 0,
    "Cash Collected": parseFloat(m.cash_collected) || parseFloat(m.revenue) || 0,
    "Sett. Show %": parseFloat(m.setting_show_rate) || 0,
    "Clos. Show %": parseFloat(m.closing_show_rate) || 0,
    "Closing %": parseFloat(m.closing_rate) || 0,
    "Interest %": parseFloat(m.interest_rate) || 0,
  }));

  const c1 = "hsl(0 85% 55%)";
  const c2 = "hsl(25 90% 55%)";
  const c3 = "hsl(38 92% 55%)";
  const c4 = "hsl(0 70% 45%)";
  const c5 = "hsl(15 80% 50%)";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-tight">Anwahlen → Termine</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid {...glassGridProps} />
              <XAxis dataKey="date" {...glassXAxisProps} />
              <YAxis {...glassYAxisProps} />
              <Tooltip content={<GlassTooltip />} />
              <Legend wrapperStyle={glassLegendStyle} />
              <Bar dataKey="Anwahlen" fill={c1} radius={barRadius} />
              <Bar dataKey="Erreicht" fill={c2} radius={barRadius} />
              <Bar dataKey="Interessiert" fill={c3} radius={barRadius} />
              <Bar dataKey="Termine" fill={c4} radius={barRadius} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-tight">Settings & Closings</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid {...glassGridProps} />
              <XAxis dataKey="date" {...glassXAxisProps} />
              <YAxis {...glassYAxisProps} />
              <Tooltip content={<GlassTooltip />} />
              <Legend wrapperStyle={glassLegendStyle} />
              <Bar dataKey="Sett. geplant" fill={c1} radius={barRadius} />
              <Bar dataKey="Sett. gehalten" fill={c2} radius={barRadius} />
              <Bar dataKey="Clos. geplant" fill={c4} radius={barRadius} />
              <Bar dataKey="Clos. gehalten" fill={c5} radius={barRadius} />
              <Bar dataKey="Deals" fill={c3} radius={barRadius} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-tight">Umsatz / Cash Collected</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <ChartGradient id="gCash" color={c3} />
              </defs>
              <CartesianGrid {...glassGridProps} />
              <XAxis dataKey="date" {...glassXAxisProps} />
              <YAxis {...glassYAxisProps} />
              <Tooltip content={<GlassTooltip formatter={(v: number) => `${v.toLocaleString("de-DE")}€`} />} />
              <Legend wrapperStyle={glassLegendStyle} />
              <Area type="monotone" dataKey="Cash Collected" fill="url(#gCash)" stroke={c3} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-tight">Show-Rates & Closing-Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <ChartGradient id="gSett" color={c1} />
                <ChartGradient id="gClos" color={c4} />
                <ChartGradient id="gClose" color={c3} />
                <ChartGradient id="gInt" color={c2} />
              </defs>
              <CartesianGrid {...glassGridProps} />
              <XAxis dataKey="date" {...glassXAxisProps} />
              <YAxis {...glassYAxisProps} domain={[0, 100]} />
              <Tooltip content={<GlassTooltip formatter={(v: number) => `${v.toFixed(1)}%`} />} />
              <Legend wrapperStyle={glassLegendStyle} />
              <Area type="monotone" dataKey="Sett. Show %" fill="url(#gSett)" stroke={c1} strokeWidth={2} />
              <Area type="monotone" dataKey="Clos. Show %" fill="url(#gClos)" stroke={c4} strokeWidth={2} />
              <Area type="monotone" dataKey="Closing %" fill="url(#gClose)" stroke={c3} strokeWidth={2} />
              <Area type="monotone" dataKey="Interest %" fill="url(#gInt)" stroke={c2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
