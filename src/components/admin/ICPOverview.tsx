import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Target, Trophy, Building2, Rocket, UserSearch, TrendingUp } from "lucide-react";

function scoreClient(c: any) {
  let s = 0;
  if (c.payment_status === "Ja, komplett") s += 25;
  else if (c.payment_status === "Teilweise") s += 10;
  else if (c.payment_status === "Läuft noch") s += 15;
  if (c.payment_speed?.includes("Sofort")) s += 20;
  else if (c.payment_speed?.includes("Schnell")) s += 15;
  else if (c.payment_speed?.includes("Normal")) s += 8;
  else if (c.payment_speed?.includes("Langsam")) s += 3;
  if (c.close_duration === "1 Setter-Call") s += 20;
  else if (c.close_duration === "2 Calls") s += 15;
  else if (c.close_duration === "3 Calls") s += 10;
  else if (c.close_duration === "4+ Calls") s += 5;
  s += (c.collaboration_score || 0) * 1.5;
  s += (c.result_score || 0) * 1.5;
  if (c.problem_awareness?.includes("Sehr hoch")) s += 15;
  else if (c.problem_awareness?.includes("Mittel")) s += 8;
  const dv = parseFloat(c.deal_value) || 0;
  if (dv >= 3000) s += 10; else if (dv >= 1500) s += 5;
  return Math.round(s);
}

function topCount(arr: string[]) {
  const m: Record<string, number> = {};
  arr.filter(Boolean).forEach(v => m[v] = (m[v] || 0) + 1);
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

export function ICPOverview() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [icpData, setIcpData] = useState<Record<string, any[]>>({});
  const [selectedTenantId, setSelectedTenantId] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: tenantsData } = await supabase
      .from("tenants")
      .select("id, company_name")
      .eq("is_active", true)
      .order("company_name");

    const { data: icpRows } = await supabase
      .from("icp_customers")
      .select("*")
      .order("sort_order");

    setTenants(tenantsData || []);

    const grouped: Record<string, any[]> = {};
    (icpRows || []).forEach(row => {
      if (!grouped[row.tenant_id]) grouped[row.tenant_id] = [];
      grouped[row.tenant_id].push(row);
    });
    setIcpData(grouped);
    setLoading(false);
  };

  const clients = useMemo(() => {
    if (selectedTenantId === "all") {
      return Object.values(icpData).flat();
    }
    return icpData[selectedTenantId] || [];
  }, [selectedTenantId, icpData]);

  const tenantsWithICP = tenants.filter(t => (icpData[t.id]?.length || 0) > 0);
  const valid = clients.filter(c => c.customer_name && c.industry);
  const scored = valid.map(c => ({ ...c, score: scoreClient(c) })).sort((a, b) => b.score - a.score);
  const maxScore = Math.max(...scored.map(s => s.score), 1);

  const branchen = topCount(valid.map(c => c.industry));
  const maTop = topCount(valid.map(c => c.employee_count));
  const quelleTop = topCount(valid.map(c => c.lead_source));
  const closeTop = topCount(valid.map(c => c.close_duration));

  let totalDeal = 0, dealN = 0, payGood = 0, payBad = 0;
  valid.forEach(c => {
    const dv = parseFloat(c.deal_value) || 0;
    if (dv > 0) { totalDeal += dv; dealN++; }
    if (c.payment_status === "Ja, komplett" || c.has_paid) payGood++;
    if (c.payment_status === "Nein") payBad++;
  });
  const avgDeal = dealN > 0 ? Math.round(totalDeal / dealN) : 0;
  const avgZus = valid.length > 0 ? (valid.reduce((s, c) => s + (c.collaboration_score || 0), 0) / valid.length).toFixed(1) : "0";
  const avgErg = valid.length > 0 ? (valid.reduce((s, c) => s + (c.result_score || 0), 0) / valid.length).toFixed(1) : "0";
  const payRate = valid.length > 0 ? Math.round(payGood / valid.length * 100) : 0;

  const medals = ["🥇", "🥈", "🥉"];

  if (loading) {
    return <div className="text-center text-muted-foreground py-12">Lade ICP-Daten…</div>;
  }

  if (tenantsWithICP.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <UserSearch className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Noch keine ICP-Daten vorhanden</p>
          <p className="text-sm mt-1">ICP-Daten werden beim Kunden-Onboarding erfasst.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Kunde wählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kunden ({valid.length} ICP-Einträge)</SelectItem>
            {tenantsWithICP.map(t => (
              <SelectItem key={t.id} value={t.id}>
                {t.company_name} ({icpData[t.id]?.length || 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedTenantId !== "all" && (
          <Badge variant="secondary" className="text-xs">
            {icpData[selectedTenantId]?.length || 0} Kunden erfasst
          </Badge>
        )}
      </div>

      {valid.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Keine auswertbaren ICP-Daten für diese Auswahl.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ICP Profile */}
          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <h4 className="font-bold text-lg">
                {selectedTenantId === "all" ? "Portfolio ICP-Profil" : "Idealer Wunschkunde"}
              </h4>
            </div>
            <div className="space-y-0">
              {[
                ["Branche", branchen[0]?.[0] || "—"],
                ["Unternehmensgröße", maTop[0]?.[0] ? `${maTop[0][0]} Mitarbeiter` : "—"],
                ["Ø Deal-Value", `€${avgDeal.toLocaleString("de-DE")}`],
                ["Beste Lead-Quelle", quelleTop[0]?.[0] || "—"],
                ["Typische Close-Dauer", closeTop[0]?.[0] || "—"],
                ["Zahlungsmoral", `${payGood}/${valid.length} bezahlt (${payRate}%)`],
                ["Ø Zusammenarbeit", `${avgZus} / 10`],
                ["Ø Ergebnis", `${avgErg} / 10`],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[160px_1fr] gap-2 py-2.5 border-b border-border/40 text-sm">
                  <span className="text-muted-foreground font-medium text-xs">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Kunden analysiert", value: String(valid.length), color: "text-primary" },
              { label: "Ø Deal-Value", value: `€${avgDeal.toLocaleString("de-DE")}`, color: "text-green-600 dark:text-green-400" },
              { label: "Zahlungsquote", value: `${payRate}%`, color: payRate >= 70 ? "text-green-600 dark:text-green-400" : payRate >= 40 ? "text-yellow-600" : "text-destructive" },
              { label: "Non-Payment", value: String(payBad), color: payBad === 0 ? "text-green-600 dark:text-green-400" : "text-destructive" },
            ].map(s => (
              <div key={s.label} className="rounded-lg bg-muted/50 p-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className={`text-2xl font-bold font-mono mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Ranking */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" /> Kunden-Ranking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-border">
                      {["#", "Firma", selectedTenantId === "all" ? "Mandant" : null, "Branche", "Deal €", "Bezahlt", "Close", "Score"].filter(Boolean).map(h => (
                        <th key={h} className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider py-2 px-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scored.slice(0, 20).map((c, i) => {
                      const pct = Math.round(c.score / maxScore * 100);
                      const tenantName = tenants.find(t => t.id === c.tenant_id)?.company_name;
                      return (
                        <tr key={c.id} className="border-b border-border/50">
                          <td className="py-2 px-2 text-sm">{medals[i] || <span className="text-muted-foreground">{i + 1}</span>}</td>
                          <td className={`py-2 px-2 text-xs ${i < 3 ? "font-bold" : "font-medium"}`}>{c.customer_name}</td>
                          {selectedTenantId === "all" && (
                            <td className="py-2 px-2 text-xs text-muted-foreground">{tenantName}</td>
                          )}
                          <td className="py-2 px-2 text-xs">{c.industry}</td>
                          <td className="py-2 px-2 text-xs">€{(parseFloat(c.deal_value) || 0).toLocaleString("de-DE")}</td>
                          <td className="py-2 px-2">
                            <Badge variant={c.payment_status === "Ja, komplett" ? "default" : c.payment_status === "Nein" ? "destructive" : "secondary"} className="text-[10px]">
                              {c.payment_status || (c.has_paid ? "Ja" : "—")}
                            </Badge>
                          </td>
                          <td className="py-2 px-2 text-xs">{c.close_duration || "—"}</td>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${pct > 70 ? "bg-green-500" : pct > 40 ? "bg-yellow-500" : "bg-destructive"}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="font-mono text-xs font-bold">{c.score}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Branchen */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Branchen-Verteilung
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {branchen.map(([b, n]) => (
                  <div key={b} className="flex items-center gap-3 py-2 border-b border-border/30">
                    <span className="flex-shrink-0 w-40 text-sm font-medium truncate">{b}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((n as number) / valid.length * 100)}%` }} />
                    </div>
                    <span className="font-mono text-xs text-primary font-semibold w-8 text-right">{n}×</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Steps */}
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Rocket className="h-4 w-4 text-primary" /> Empfehlungen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                `Fokus auf <strong>${branchen[0]?.[0] || "—"}</strong>${maTop[0]?.[0] ? ` mit <strong>${maTop[0][0]}</strong> Mitarbeitern` : ""}`,
                quelleTop[0]?.[0] ? `Primäre Lead-Quelle: <strong>${quelleTop[0][0]}</strong>` : null,
                avgDeal > 0 ? `Mindest-Deal-Value: <strong>€${Math.round(avgDeal * 0.8).toLocaleString("de-DE")}</strong>` : null,
                `Close-Dauer-Benchmark: <strong>${closeTop[0]?.[0] || "—"}</strong>`,
              ].filter(Boolean).map((text, i) => (
                <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-muted/50 text-sm">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{i + 1}</div>
                  <div dangerouslySetInnerHTML={{ __html: text! }} className="leading-relaxed" />
                </div>
              ))}
              {payBad > 0 && (
                <div className="flex gap-3 items-start p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-destructive text-destructive-foreground flex items-center justify-center font-bold">!</div>
                  <div><strong>{payBad} Kunde(n)</strong> haben nicht bezahlt – Zahlungsbedingungen prüfen</div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
