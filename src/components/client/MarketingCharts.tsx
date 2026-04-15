import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from "recharts";
import { GlassTooltip, glassGridProps, glassXAxisProps, glassYAxisProps, glassLegendStyle, ChartGradient, barRadius } from "@/components/charts/chartStyles";

interface Props {
  metrics: any[];
  timeRange?: string;
}

export function MarketingCharts({ metrics, timeRange = "daily" }: Props) {
  if (!metrics || metrics.length === 0) return null;

  const dateKey = timeRange === "daily" ? "period_date" : "period_start";

  const chartData = [...metrics].reverse()
    .filter(m => (parseFloat(m.followers_current) || 0) > 0 || (parseFloat(m.impressions) || 0) > 0)
    .map(m => ({
      date: new Date(m[dateKey]).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
      Impressionen: parseFloat(m.impressions) || 0,
      Likes: parseFloat(m.likes) || 0,
      Kommentare: parseFloat(m.comments) || 0,
      "Follower gesamt": parseFloat(m.followers_current) || 0,
      "Neue Follower": parseFloat(m.new_followers) || 0,
      Leads: parseFloat(m.leads_total) || 0,
      MQL: parseFloat(m.leads_qualified) || 0,
      "MQL-Quote %": parseFloat(m.lead_quality_rate) || 0,
      "Reach-Rate %": parseFloat(m.reach_rate) || 0,
    }));

  const c1 = "hsl(0 85% 55%)";
  const c2 = "hsl(25 90% 55%)";
  const c3 = "hsl(38 92% 55%)";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-tight">Reichweite & Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <ChartGradient id="gImp" color={c1} />
                <ChartGradient id="gLike" color={c2} />
                <ChartGradient id="gComm" color={c3} />
              </defs>
              <CartesianGrid {...glassGridProps} />
              <XAxis dataKey="date" {...glassXAxisProps} />
              <YAxis {...glassYAxisProps} />
              <Tooltip content={<GlassTooltip />} />
              <Legend wrapperStyle={glassLegendStyle} />
              <Area type="monotone" dataKey="Impressionen" fill="url(#gImp)" stroke={c1} strokeWidth={2} />
              <Area type="monotone" dataKey="Likes" fill="url(#gLike)" stroke={c2} strokeWidth={2} />
              <Area type="monotone" dataKey="Kommentare" fill="url(#gComm)" stroke={c3} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-tight">Follower-Entwicklung</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData.filter(d => d["Follower gesamt"] > 0)}>
              <defs>
                <ChartGradient id="gFollower" color={c2} />
              </defs>
              <CartesianGrid {...glassGridProps} />
              <XAxis dataKey="date" {...glassXAxisProps} />
              <YAxis {...glassYAxisProps} />
              <Tooltip content={<GlassTooltip />} />
              <Legend wrapperStyle={glassLegendStyle} />
              <Area type="monotone" dataKey="Follower gesamt" fill="url(#gFollower)" stroke={c2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-tight">Leads & MQL</CardTitle>
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
              <Bar dataKey="MQL" fill={c3} radius={barRadius} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-tight">Quoten</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <ChartGradient id="gMQL" color={c1} />
                <ChartGradient id="gReach" color={c2} />
              </defs>
              <CartesianGrid {...glassGridProps} />
              <XAxis dataKey="date" {...glassXAxisProps} />
              <YAxis {...glassYAxisProps} domain={[0, 100]} />
              <Tooltip content={<GlassTooltip formatter={(v: number) => `${v.toFixed(1)}%`} />} />
              <Legend wrapperStyle={glassLegendStyle} />
              <Area type="monotone" dataKey="MQL-Quote %" fill="url(#gMQL)" stroke={c1} strokeWidth={2} />
              <Area type="monotone" dataKey="Reach-Rate %" fill="url(#gReach)" stroke={c2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
