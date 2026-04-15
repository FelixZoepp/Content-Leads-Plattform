import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, TrendingUp, TrendingDown, Clock } from "lucide-react";

interface Props {
  tenants: any[];
}

interface CSATEntry {
  tenant_id: string;
  csat_1_5: number | null;
  nps_0_10: number | null;
  comment: string | null;
  created_at: string;
  respondent_email: string | null;
}

export function AdminCSATOverview({ tenants }: Props) {
  const [responses, setResponses] = useState<CSATEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResponses();
  }, [tenants]);

  const loadResponses = async () => {
    const tenantIds = tenants.map(t => t.id);
    if (tenantIds.length === 0) return;

    const { data } = await supabase
      .from("csat_responses")
      .select("*")
      .in("tenant_id", tenantIds)
      .order("created_at", { ascending: false })
      .limit(200);

    setResponses((data as CSATEntry[]) || []);
    setLoading(false);
  };

  const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t]));

  // Per tenant: latest response + averages
  const perTenant = tenants.map(t => {
    const rs = responses.filter(r => r.tenant_id === t.id);
    const latest = rs[0];
    const avgCSAT = rs.length > 0 ? rs.reduce((s, r) => s + (r.csat_1_5 || 0), 0) / rs.length : null;
    const avgNPS = rs.length > 0 ? rs.reduce((s, r) => s + (r.nps_0_10 || 0), 0) / rs.length : null;
    const daysSince = latest
      ? Math.floor((Date.now() - new Date(latest.created_at).getTime()) / 86400000)
      : null;
    const isDue = daysSince === null || daysSince >= 14;
    return { tenant: t, latest, avgCSAT, avgNPS, count: rs.length, daysSince, isDue };
  });

  // Overall stats
  const totalResponses = responses.length;
  const overallCSAT = totalResponses > 0
    ? (responses.reduce((s, r) => s + (r.csat_1_5 || 0), 0) / totalResponses).toFixed(1)
    : "–";
  const overallNPS = totalResponses > 0
    ? (responses.reduce((s, r) => s + (r.nps_0_10 || 0), 0) / totalResponses).toFixed(1)
    : "–";
  const dueCount = perTenant.filter(p => p.isDue).length;

  if (loading) return null;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">⌀ CSAT</p>
            <p className="text-2xl font-bold text-foreground">{overallCSAT}<span className="text-sm text-muted-foreground">/5</span></p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">⌀ NPS</p>
            <p className="text-2xl font-bold text-foreground">{overallNPS}<span className="text-sm text-muted-foreground">/10</span></p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Responses</p>
            <p className="text-2xl font-bold text-foreground">{totalResponses}</p>
          </CardContent>
        </Card>
        <Card className={`glass-card ${dueCount > 0 ? "border-warning/40 border-2" : ""}`}>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Ausstehend</p>
            <p className={`text-2xl font-bold ${dueCount > 0 ? "text-warning" : "text-success"}`}>{dueCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-tenant table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            CSAT/NPS pro Kunde
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-2">Kunde</th>
                  <th className="text-right p-2">Letzter CSAT</th>
                  <th className="text-right p-2">Letzter NPS</th>
                  <th className="text-right p-2">⌀ CSAT</th>
                  <th className="text-right p-2">⌀ NPS</th>
                  <th className="text-right p-2">Anzahl</th>
                  <th className="text-center p-2">Status</th>
                  <th className="text-left p-2">Letzter Kommentar</th>
                </tr>
              </thead>
              <tbody>
                {perTenant.map(({ tenant, latest, avgCSAT, avgNPS, count, daysSince, isDue }) => (
                  <tr key={tenant.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="p-2 font-medium text-foreground">{tenant.company_name}</td>
                    <td className="p-2 text-right">
                      {latest?.csat_1_5 != null ? (
                        <span className={latest.csat_1_5 >= 4 ? "text-success" : latest.csat_1_5 >= 3 ? "text-foreground" : "text-destructive"}>
                          {latest.csat_1_5}/5
                        </span>
                      ) : "–"}
                    </td>
                    <td className="p-2 text-right">
                      {latest?.nps_0_10 != null ? (
                        <span className={latest.nps_0_10 >= 9 ? "text-success" : latest.nps_0_10 >= 7 ? "text-foreground" : "text-destructive"}>
                          {latest.nps_0_10}
                        </span>
                      ) : "–"}
                    </td>
                    <td className="p-2 text-right">{avgCSAT != null ? avgCSAT.toFixed(1) : "–"}</td>
                    <td className="p-2 text-right">{avgNPS != null ? avgNPS.toFixed(1) : "–"}</td>
                    <td className="p-2 text-right text-muted-foreground">{count}</td>
                    <td className="p-2 text-center">
                      {isDue ? (
                        <Badge variant="outline" className="text-warning border-warning/40 text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Fällig
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-success border-success/40 text-xs">
                          OK
                        </Badge>
                      )}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground max-w-[200px] truncate">
                      {latest?.comment || "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
