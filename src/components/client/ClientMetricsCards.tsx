import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Target, Users, DollarSign, FileText, BarChart3, Percent, Phone, PhoneCall } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  metrics: any[];
  timeRange?: string;
}

export function ClientMetricsCards({ metrics, timeRange = "daily" }: Props) {
  if (!metrics || metrics.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Noch keine Daten für diesen Zeitraum.</p>
      </div>
    );
  }

  const sum = (field: string) => metrics.reduce((s, m) => s + (parseFloat(m[field]) || 0), 0);
  const avg = (field: string) => {
    const vals = metrics.filter(m => m[field] != null && parseFloat(m[field]) > 0);
    if (vals.length === 0) return 0;
    return vals.reduce((s, m) => s + parseFloat(m[field]), 0) / vals.length;
  };

  const totalImpressions = sum("impressions");
  const totalLeads = sum("leads_total");
  const totalAppointments = sum("appointments");
  const totalDeals = sum("deals");

  const crVisitorToLead = totalImpressions > 0 ? (totalLeads / totalImpressions) * 100 : 0;
  const crLeadToAppt = totalLeads > 0 ? (totalAppointments / totalLeads) * 100 : 0;
  const crApptToDeal = totalAppointments > 0 ? (totalDeals / totalAppointments) * 100 : 0;
  const crVisitorToDeal = totalImpressions > 0 ? (totalDeals / totalImpressions) * 100 : 0;

  const cards = [
    { title: "Impressionen", value: totalImpressions, icon: BarChart3, format: "number" },
    { title: "Kommentare", value: sum("comments"), icon: FileText, format: "number" },
    { title: "Leads", value: totalLeads, icon: Target, format: "number" },
    { title: "MQL", value: sum("leads_qualified"), icon: Target, format: "number" },
    { title: "MQL-Quote", value: avg("lead_quality_rate"), icon: Percent, format: "percent" },
    { title: "Besucher → Lead", value: crVisitorToLead, icon: TrendingUp, format: "percent" },
    { title: "Lead → Termin", value: crLeadToAppt, icon: TrendingUp, format: "percent" },
    { title: "Termin → Deal", value: crApptToDeal, icon: TrendingUp, format: "percent" },
    { title: "Besucher → Deal", value: crVisitorToDeal, icon: TrendingDown, format: "percent4" },
    { title: "Anwahlen", value: sum("calls_made"), icon: Phone, format: "number" },
    { title: "Erreicht", value: sum("calls_reached"), icon: PhoneCall, format: "number" },
    { title: "Termine", value: totalAppointments, icon: Users, format: "number" },
    { title: "Setting Show-Rate", value: avg("setting_show_rate"), icon: Percent, format: "percent" },
    { title: "Closing Show-Rate", value: avg("closing_show_rate"), icon: Percent, format: "percent" },
    { title: "Closing-Rate", value: avg("closing_rate"), icon: BarChart3, format: "percent" },
    { title: "Deals", value: totalDeals, icon: TrendingUp, format: "number" },
    { title: "Cash Collected", value: sum("cash_collected") || sum("revenue"), icon: DollarSign, format: "currency" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
          whileTap={{ scale: 0.98 }}
        >
          <Card className="h-full cursor-default group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
              <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{card.title}</CardTitle>
              <div className="p-1.5 rounded-lg" style={{ background: "hsl(0 85% 55% / 0.08)" }}>
                <card.icon className="h-3.5 w-3.5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-xl font-bold tracking-tight">
                {card.format === "currency" ? `${card.value.toFixed(0)}€` :
                 card.format === "percent4" ? (card.value > 0 ? `${card.value.toFixed(2)}%` : "–") :
                 card.format === "percent" ? (card.value > 0 ? `${card.value.toFixed(1)}%` : "–") :
                 card.value.toLocaleString("de-DE")}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
