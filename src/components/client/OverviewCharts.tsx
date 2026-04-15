import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from "recharts";
import { GlassTooltip, glassGridProps, glassXAxisProps, glassYAxisProps, glassLegendStyle, ChartGradient, barRadius } from "@/components/charts/chartStyles";

interface Props {
  metrics: any[];
  timeRange?: string;
}

export function OverviewCharts({ metrics, timeRange = "daily" }: Props) {
  if (!metrics || metrics.length === 0) return null;

  const dateKey = timeRange === "daily" ? "period_date" : "period_start";

  const chartData = [...metrics].reverse().map(m => ({
    date: new Date(m[dateKey]).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
    Leads: parseFloat(m.leads_total) || 0,
    Termine: parseFloat(m.appointments) || 0,
    Deals: parseFloat(m.deals) || 0,
    "Cash Collected": parseFloat(m.cash_collected) || parseFloat(m.revenue) || 0,
    Impressionen: parseFloat(m.impressions) || 0,
    "Closing %": parseFloat(m.closing_rate) || 0,
    "Sett. Show %": parseFloat(m.setting_show_rate) || 0,
  }));

  const c1 = "hsl(0 85% 55%)";
  const c2 = "hsl(25 90% 55%)";
  const c3 = "hsl(38 92% 55%)";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-tight">Pipeline: Leads → Deals</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid {...glassGridProps} />
              <XAxis dataKey="date" {...glassXAxisProps} />
              <YAxis {...glassYAxisProps} />
              <Tooltip content={<GlassTooltip />} />
              <Legend wrapperStyle={glassLegendStyle} />
              <Bar dataKey="Leads" fill={c1} radius={barRadius} />
              <Bar dataKey="Termine" fill={c2} radius={barRadius} />
              <Bar dataKey="Deals" fill={c3} radius={barRadius} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-tight">Umsatz-Entwicklung</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <ChartGradient id="gRevOverview" color={c3} />
              </defs>
              <CartesianGrid {...glassGridProps} />
              <XAxis dataKey="date" {...glassXAxisProps} />
              <YAxis {...glassYAxisProps} />
              <Tooltip content={<GlassTooltip formatter={(v: number) => `${v.toLocaleString("de-DE")}€`} />} />
              <Legend wrapperStyle={glassLegendStyle} />
              <Area type="monotone" dataKey="Cash Collected" fill="url(#gRevOverview)" stroke={c3} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
