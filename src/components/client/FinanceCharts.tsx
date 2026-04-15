import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { GlassTooltip, glassGridProps, glassXAxisProps, glassYAxisProps, glassLegendStyle, ChartGradient, barRadius } from "@/components/charts/chartStyles";

interface Props {
  tenantId: string;
}

export function FinanceCharts({ tenantId }: Props) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: rows } = await supabase
        .from("financial_tracking")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("period_month", { ascending: true })
        .limit(12);
      setData(rows || []);
    };
    if (tenantId) load();
  }, [tenantId]);

  if (data.length === 0) return null;

  const chartData = data.map(r => {
    const revenue = parseFloat(r.cash_collected) || 0;
    const costs = (parseFloat(r.costs_ads) || 0) + (parseFloat(r.costs_tools) || 0) +
      (parseFloat(r.costs_personnel) || 0) + (parseFloat(r.costs_other) || 0);
    const cashflow = revenue - costs;
    const margin = revenue > 0 ? Math.round((cashflow / revenue) * 100) : 0;
    return {
      date: new Date(r.period_month).toLocaleDateString("de-DE", { month: "short", year: "2-digit" }),
      Einnahmen: revenue,
      Kosten: costs,
      Cashflow: cashflow,
      "Marge %": margin,
      Ads: parseFloat(r.costs_ads) || 0,
      Tools: parseFloat(r.costs_tools) || 0,
      Personal: parseFloat(r.costs_personnel) || 0,
      Sonstiges: parseFloat(r.costs_other) || 0,
      "Offene RE": parseFloat(r.invoices_open_amount) || 0,
      "Überfällig": parseFloat(r.invoices_overdue_amount) || 0,
    };
  });

  const c1 = "hsl(0 85% 55%)";
  const c2 = "hsl(25 90% 55%)";
  const c3 = "hsl(38 92% 55%)";
  const c4 = "hsl(0 70% 45%)";
  const fmtEur = (v: number) => `${v.toLocaleString("de-DE")}€`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-tight">Einnahmen vs. Kosten</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid {...glassGridProps} />
              <XAxis dataKey="date" {...glassXAxisProps} />
              <YAxis {...glassYAxisProps} />
              <Tooltip content={<GlassTooltip formatter={fmtEur} />} />
              <Legend wrapperStyle={glassLegendStyle} />
              <Bar dataKey="Einnahmen" fill={c2} radius={barRadius} />
              <Bar dataKey="Kosten" fill={c1} radius={barRadius} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-tight">Cashflow & Marge</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <ChartGradient id="gCF" color={c3} />
                <ChartGradient id="gMarg" color={c4} />
              </defs>
              <CartesianGrid {...glassGridProps} />
              <XAxis dataKey="date" {...glassXAxisProps} />
              <YAxis yAxisId="left" {...glassYAxisProps} />
              <YAxis yAxisId="right" orientation="right" {...glassYAxisProps} domain={[-100, 100]} />
              <Tooltip content={<GlassTooltip />} />
              <Legend wrapperStyle={glassLegendStyle} />
              <Area yAxisId="left" type="monotone" dataKey="Cashflow" fill="url(#gCF)" stroke={c3} strokeWidth={2} />
              <Area yAxisId="right" type="monotone" dataKey="Marge %" fill="url(#gMarg)" stroke={c4} strokeWidth={2} strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-tight">Kostenaufteilung</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <ChartGradient id="gAds" color={c1} />
                <ChartGradient id="gTools" color={c2} />
                <ChartGradient id="gPers" color={c3} />
                <ChartGradient id="gSonst" color={c4} />
              </defs>
              <CartesianGrid {...glassGridProps} />
              <XAxis dataKey="date" {...glassXAxisProps} />
              <YAxis {...glassYAxisProps} />
              <Tooltip content={<GlassTooltip formatter={fmtEur} />} />
              <Legend wrapperStyle={glassLegendStyle} />
              <Area type="monotone" dataKey="Ads" stackId="1" fill="url(#gAds)" stroke={c1} strokeWidth={1.5} />
              <Area type="monotone" dataKey="Tools" stackId="1" fill="url(#gTools)" stroke={c2} strokeWidth={1.5} />
              <Area type="monotone" dataKey="Personal" stackId="1" fill="url(#gPers)" stroke={c3} strokeWidth={1.5} />
              <Area type="monotone" dataKey="Sonstiges" stackId="1" fill="url(#gSonst)" stroke={c4} strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-tight">Offene & überfällige Rechnungen</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid {...glassGridProps} />
              <XAxis dataKey="date" {...glassXAxisProps} />
              <YAxis {...glassYAxisProps} />
              <Tooltip content={<GlassTooltip formatter={fmtEur} />} />
              <Legend wrapperStyle={glassLegendStyle} />
              <Bar dataKey="Offene RE" fill={c2} radius={barRadius} />
              <Bar dataKey="Überfällig" fill={c1} radius={barRadius} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
