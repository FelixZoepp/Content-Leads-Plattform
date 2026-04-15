import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TenantDetailSheet } from "./TenantDetailSheet";

interface Props {
  alerts: any[];
  tenants?: any[];
  onResolve: () => void;
}

export function AlertsPanel({ alerts, tenants = [], onResolve }: Props) {
  const { toast } = useToast();
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);

  const resolveAlert = async (alertId: number) => {
    try {
      const { error } = await supabase
        .from("alerts")
        .update({ resolved_at: new Date().toISOString() })
        .eq("id", alertId);

      if (error) throw error;

      toast({
        title: "Alert gelöst",
        description: "Der Alert wurde als gelöst markiert",
      });

      onResolve();
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getReport = (alert: any) => {
    const reports: Record<string, { cause: string; action: string }> = {
      no_posts: {
        cause: "Keine Content-Aktivität in den letzten 7 Tagen. Ohne regelmäßige Sichtbarkeit sinkt die organische Reichweite und der Algorithmus bestraft Inaktivität.",
        action: "Posting-Plan erstellen & mindestens 3 Posts/Woche sicherstellen. Content-Batching-Session vereinbaren.",
      },
      low_leads: {
        cause: "Die Lead-Generierung liegt deutlich unter dem Zielwert. Der Top-Funnel liefert nicht genug Volumen für die Pipeline.",
        action: "Lead-Quellen prüfen (Ads, Outreach, Content). Budget oder Frequenz erhöhen. Zielgruppen-Targeting optimieren.",
      },
      revenue_drop: {
        cause: "Signifikanter Umsatzrückgang gegenüber der Vorwoche. Mögliche Ursachen: weniger Abschlüsse, niedrigere Deal-Values oder saisonale Schwankungen.",
        action: "Pipeline-Analyse durchführen. Closing-Rate und Deal-Value prüfen. Ggf. Follow-up-Kampagne für warme Leads starten.",
      },
      low_health: {
        cause: "Mehrere KPI-Bereiche performen gleichzeitig unter Ziel. Der Kunde braucht intensive Betreuung, um den Abwärtstrend zu stoppen.",
        action: "Strategie-Call mit Kunden ansetzen. Schwächste KPIs identifizieren und priorisiert angehen. Ggf. Ressourcen umverteilen.",
      },
    };
    return reports[alert.type] || {
      cause: "Performance-Abweichung erkannt.",
      action: "Kundenprofil prüfen und Maßnahmen ableiten.",
    };
  };

  const openTenant = (tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      setSelectedTenant(tenant);
    }
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Keine offenen Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Alle Kunden performen im Zielbereich. Keine Handlung erforderlich.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Offene Alerts ({alerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {alerts.map(alert => {
            const report = getReport(alert);
            return (
              <div
                key={alert.id}
                className="p-3 border rounded-lg hover:bg-muted/30 transition-colors space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'}>
                        {alert.severity}
                      </Badge>
                      <button
                        onClick={() => openTenant(alert.tenant_id)}
                        className="font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {alert.tenants?.company_name || "Unbekannt"}
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(alert.created_at).toLocaleString('de-DE')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resolveAlert(alert.id)}
                  >
                    Erledigt
                  </Button>
                </div>
                <div className="rounded-md bg-muted/50 p-2.5 space-y-1.5 text-xs">
                  <div>
                    <span className="font-semibold text-destructive">⚠️ Problem: </span>
                    <span className="text-muted-foreground">{report.cause}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-primary">💡 Empfehlung: </span>
                    <span className="text-muted-foreground">{report.action}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <TenantDetailSheet
        tenant={selectedTenant}
        open={!!selectedTenant}
        onClose={() => setSelectedTenant(null)}
      />
    </>
  );
}
