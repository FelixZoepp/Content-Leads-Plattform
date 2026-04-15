import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";

interface Props {
  metrics: any[];
}

interface Insight {
  type: "warning" | "success" | "tip";
  title: string;
  message: string;
}

// Benchmarks aus Wissensdatenbank (90 Tage Cashflow Offensive)
const BENCHMARKS = {
  show_up_rate: { min: 80, label: "Show-Up-Rate (Setting)" },      // Grün >80%
  closing_rate: { min: 50, label: "Closing-Rate" },                 // Rot <50%
  cr_lead_to_appt: { min: 15, label: "Lead→Termin Conv." },
  cost_per_lead: { max: 50, label: "Kosten pro Lead" },
  closing_show_rate: { min: 85, label: "Show-Up-Rate (Closing)" },  // Grün >85%
  impressions: { min: 5000, label: "Impressions / Post" },          // Rot <5000
};

export function KPIInsights({ metrics }: Props) {
  if (!metrics || metrics.length === 0) return null;

  const insights: Insight[] = [];

  // Use aggregated data
  const total = metrics.reduce(
    (acc, m) => ({
      leads: acc.leads + (parseFloat(m.leads_total) || 0),
      qualified: acc.qualified + (parseFloat(m.leads_qualified) || 0),
      appointments: acc.appointments + (parseFloat(m.appointments) || 0),
      settings_planned: acc.settings_planned + (parseFloat(m.settings_planned) || 0),
      settings_held: acc.settings_held + (parseFloat(m.settings_held) || 0),
      closings: acc.closings + (parseFloat(m.closings) || 0),
      deals: acc.deals + (parseFloat(m.deals) || 0),
      revenue: acc.revenue + (parseFloat(m.revenue) || 0),
      retainer: Math.max(acc.retainer, parseFloat(m.monthly_retainer) || 0),
    }),
    { leads: 0, qualified: 0, appointments: 0, settings_planned: 0, settings_held: 0, closings: 0, deals: 0, revenue: 0, retainer: 0 }
  );

  // Show-Up-Rate check
  if (total.settings_planned > 0) {
    const rate = (total.settings_held / total.settings_planned) * 100;
    if (rate < BENCHMARKS.show_up_rate.min) {
      insights.push({
        type: "warning",
        title: `Show-Up-Rate niedrig (${rate.toFixed(0)}%)`,
        message: `Deine Show-Up-Rate liegt unter ${BENCHMARKS.show_up_rate.min}%. Sende Erinnerungen vor Settings und bestätige Termine 24h vorher.`,
      });
    } else {
      insights.push({
        type: "success",
        title: `Show-Up-Rate top (${rate.toFixed(0)}%)`,
        message: "Deine Settings-Teilnehmerquote ist überdurchschnittlich gut.",
      });
    }
  }

  // Closing-Rate check
  if (total.closings > 0) {
    const rate = (total.deals / total.closings) * 100;
    if (rate < BENCHMARKS.closing_rate.min) {
      insights.push({
        type: "warning",
        title: `Closing-Rate verbessern (${rate.toFixed(0)}%)`,
        message: `Nur ${rate.toFixed(0)}% deiner Closings führen zum Deal. Überprüfe dein Closing-Skript und die Einwandbehandlung.`,
      });
    }
  }

  // Lead Quality
  if (total.leads > 0) {
    const qualRate = (total.qualified / total.leads) * 100;
    if (qualRate < 50) {
      insights.push({
        type: "tip",
        title: `Lead-Qualität steigern (${qualRate.toFixed(0)}% qualifiziert)`,
        message: "Weniger als die Hälfte deiner Leads sind qualifiziert. Optimiere dein Targeting und Lead-Magneten.",
      });
    }
  }

  // Cost per Lead
  if (total.retainer > 0 && total.leads > 0) {
    const cpl = total.retainer / total.leads;
    if (cpl > BENCHMARKS.cost_per_lead.max) {
      insights.push({
        type: "warning",
        title: `Hohe Kosten pro Lead (${cpl.toFixed(0)}€)`,
        message: `Dein CPL liegt über ${BENCHMARKS.cost_per_lead.max}€. Erhöhe die Lead-Generierung oder optimiere dein Budget.`,
      });
    }
  }

  // No leads tip
  if (total.leads === 0 && metrics.length >= 3) {
    insights.push({
      type: "tip",
      title: "Keine Leads generiert",
      message: "Du hast in diesem Zeitraum keine Leads erfasst. Fokussiere dich auf Lead-Posts und CTAs in deinen Beiträgen.",
    });
  }

  // Revenue/Lead positive
  if (total.leads > 0 && total.revenue > 0) {
    const rpl = total.revenue / total.leads;
    insights.push({
      type: "success",
      title: `${rpl.toFixed(0)}€ Umsatz pro Lead`,
      message: `Jeder Lead generiert durchschnittlich ${rpl.toFixed(0)}€ Umsatz.`,
    });
  }

  if (insights.length === 0) return null;

  const iconMap = {
    warning: <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />,
    success: <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />,
    tip: <Lightbulb className="h-4 w-4 text-blue-500 shrink-0" />,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">💡 KPI-Analyse & Tipps</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            {iconMap[insight.type]}
            <div>
              <p className="text-sm font-medium">{insight.title}</p>
              <p className="text-xs text-muted-foreground">{insight.message}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
