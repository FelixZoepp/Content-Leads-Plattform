import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TenantDetailSheet } from "@/components/admin/TenantDetailSheet";
import { AdvisorAssignment } from "@/components/admin/AdvisorAssignment";
import { motion } from "framer-motion";
import {
  Search, Users, TrendingUp, TrendingDown, AlertTriangle,
  ChevronRight, Building2, Calendar, DollarSign, Target,
} from "lucide-react";

// ═══════════════════════════════════════════════════
// TYPES & SCORING
// ═══════════════════════════════════════════════════

interface EnrichedTenant {
  id: string;
  company_name: string;
  contact_name: string | null;
  industry: string | null;
  contract_duration: string | null;
  created_at: string;
  offer_price: number;
  total_customers: number | null;
  current_revenue_monthly: number;
  goal_revenue_monthly: number;
  is_active: boolean;
  advisor_id: string | null;
  // Loaded data
  health: any | null;
  fulfillment: any | null;
  latestMetrics: any | null;
  // Computed
  score: number;
  focusLabel: string;
  problems: string[];
  strengths: string[];
  recommendations: Recommendation[];
}

interface Recommendation {
  action: string;
  priority: "hoch" | "mittel" | "info";
  reason: string;
}

function computeScore(tenant: any, health: any, fulfillment: any, metrics: any): number {
  let score = 0;

  // Health score contribution (0-30)
  if (health?.score) score += Math.min(health.score * 0.3, 30);

  // Revenue contribution (0-25)
  const rev = parseFloat(tenant.current_revenue_monthly) || 0;
  if (rev >= 50000) score += 25;
  else if (rev >= 20000) score += 20;
  else if (rev >= 10000) score += 15;
  else if (rev >= 5000) score += 10;
  else score += 5;

  // Contract duration (0-15)
  const dur = tenant.contract_duration || "";
  if (dur.includes("12") || dur.includes("Jahr")) score += 15;
  else if (dur.includes("6")) score += 10;
  else if (dur.includes("3")) score += 7;
  else score += 3;

  // Fulfillment progress (0-15)
  if (fulfillment) {
    if (fulfillment.project_status === "active") score += 10;
    if (fulfillment.contract_renewed) score += 5;
    if (fulfillment.csat_score >= 4) score += 5;
  }

  // Activity (0-15) — has recent metrics
  if (metrics) {
    if (parseFloat(metrics.leads_total) > 0) score += 5;
    if (parseFloat(metrics.deals) > 0) score += 5;
    if (parseFloat(metrics.revenue) > 0) score += 5;
  }

  return Math.round(score);
}

function getFocusLabel(score: number): string {
  if (score >= 70) return "Top";
  if (score >= 50) return "Gut";
  if (score >= 30) return "Mittel";
  return "Schwach";
}

function detectProblems(tenant: any, health: any, fulfillment: any, metrics: any): string[] {
  const problems: string[] = [];
  if (health && health.score < 40) problems.push("Niedriger Health-Score");
  if (health?.color === "red") problems.push("Kritischer Zustand");
  if (fulfillment?.project_status === "paused") problems.push("Projekt pausiert");
  if (fulfillment?.csat_score && fulfillment.csat_score < 3) problems.push("Niedrige Zufriedenheit");
  if (fulfillment?.contract_end) {
    const daysLeft = Math.round((new Date(fulfillment.contract_end).getTime() - Date.now()) / 86400000);
    if (daysLeft < 30 && daysLeft > 0) problems.push("Vertrag läuft bald aus");
    if (daysLeft <= 0) problems.push("Vertrag abgelaufen");
  }
  if (!metrics || (!parseFloat(metrics.leads_total) && !parseFloat(metrics.deals))) problems.push("Keine aktuelle Aktivität");
  const dur = tenant.contract_duration || "";
  if (dur === "1 Monat" || dur === "1") problems.push("Kurze Laufzeit");
  return problems;
}

function detectStrengths(tenant: any, health: any, fulfillment: any, metrics: any): string[] {
  const strengths: string[] = [];
  if (health && health.score >= 70) strengths.push("Top Health");
  if (fulfillment?.contract_renewed) strengths.push("Verlängert");
  if (fulfillment?.csat_score >= 4) strengths.push("Hohe Zufriedenheit");
  if (metrics && parseFloat(metrics.deals) > 0) strengths.push("Aktive Deals");
  const rev = parseFloat(tenant.current_revenue_monthly) || 0;
  if (rev >= 20000) strengths.push("High Revenue");
  return strengths;
}

function detectRecommendations(tenant: any, health: any, fulfillment: any, metrics: any): Recommendation[] {
  const recs: Recommendation[] = [];
  const problems = detectProblems(tenant, health, fulfillment, metrics);

  if (problems.includes("Vertrag läuft bald aus")) {
    recs.push({ action: "Verlängerung initiieren", priority: "hoch", reason: "Vertrag läuft in weniger als 30 Tagen aus. Jetzt Renewal-Gespräch führen." });
  }
  if (problems.includes("Niedrige Zufriedenheit")) {
    recs.push({ action: "CSAT-Gespräch führen", priority: "hoch", reason: "Kundenzufriedenheit unter 3/5 – Churn-Risiko. Sofort Ursachen klären." });
  }
  if (problems.includes("Keine aktuelle Aktivität")) {
    recs.push({ action: "Check-in anrufen", priority: "hoch", reason: "Keine aktuelle Aktivität erkennbar. Prüfen ob der Kunde Support benötigt." });
  }
  if (problems.includes("Niedriger Health-Score")) {
    recs.push({ action: "Intensiv-Betreuung", priority: "hoch", reason: "Health-Score kritisch niedrig. Maßnahmenplan erarbeiten." });
  }
  if (problems.includes("Kurze Laufzeit")) {
    recs.push({ action: "Upsell auf Langvertrag", priority: "mittel", reason: "Kurze Laufzeit = höheres Churn-Risiko. Vorteile eines Jahresvertrags aufzeigen." });
  }
  if (!fulfillment?.contract_renewed && fulfillment?.contract_end) {
    recs.push({ action: "Vertragsverlängerung besprechen", priority: "mittel", reason: "Vertrag noch nicht verlängert. Proaktiv Gespräch initiieren." });
  }

  // Positive recs
  const strengths = detectStrengths(tenant, health, fulfillment, metrics);
  if (strengths.includes("Hohe Zufriedenheit") && !problems.length) {
    recs.push({ action: "Empfehlung anfragen", priority: "info", reason: "Zufriedener Kunde – ideal für Testimonial oder Empfehlung." });
  }
  if (recs.length === 0) {
    recs.push({ action: "Status halten", priority: "info", reason: "Kunde läuft stabil. Regelmäßiges Check-in empfohlen." });
  }

  return recs;
}

const FOCUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Top: { bg: "bg-success/10", text: "text-success", border: "border-success/30" },
  Gut: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30" },
  Mittel: { bg: "bg-warning/10", text: "text-warning", border: "border-warning/30" },
  Schwach: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30" },
};

const PRIORITY_STYLES: Record<string, string> = {
  hoch: "bg-destructive/10 text-destructive border-destructive/30",
  mittel: "bg-warning/10 text-warning border-warning/30",
  info: "bg-muted text-muted-foreground border-border/40",
};

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════

export function CustomerAnalysisTable() {
  const [tenants, setTenants] = useState<EnrichedTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [focusFilter, setFocusFilter] = useState<string>("alle");
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const { data: tenantsData } = await supabase
        .from("tenants")
        .select("*")
        .eq("is_active", true)
        .order("company_name");

      if (!tenantsData) { setLoading(false); return; }

      const enriched = await Promise.all(
        tenantsData.map(async (tenant) => {
          const [healthRes, fulfillmentRes, metricsRes] = await Promise.all([
            supabase.from("health_scores").select("*").eq("tenant_id", tenant.id)
              .order("created_at", { ascending: false }).limit(1).maybeSingle(),
            supabase.from("fulfillment_tracking").select("*").eq("tenant_id", tenant.id).maybeSingle(),
            supabase.from("v_metrics_monthly").select("*").eq("tenant_id", tenant.id)
              .order("period_start", { ascending: false }).limit(1),
          ]);

          const health = healthRes.data;
          const fulfillment = fulfillmentRes.data;
          const latestMetrics = (metricsRes.data as any)?.[0] || null;

          const score = computeScore(tenant, health, fulfillment, latestMetrics);
          const fl = getFocusLabel(score);
          const problems = detectProblems(tenant, health, fulfillment, latestMetrics);
          const strengths = detectStrengths(tenant, health, fulfillment, latestMetrics);
          const recommendations = detectRecommendations(tenant, health, fulfillment, latestMetrics);

          return {
            ...tenant,
            health,
            fulfillment,
            latestMetrics,
            score,
            focusLabel: fl,
            problems,
            strengths,
            recommendations,
          } as EnrichedTenant;
        })
      );

      // Sort by score descending
      enriched.sort((a, b) => b.score - a.score);
      setTenants(enriched);
    } catch (err) {
      console.error("Error loading tenants:", err);
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let data = tenants;
    if (focusFilter !== "alle") data = data.filter(t => t.focusLabel === focusFilter);
    if (search.trim()) data = data.filter(t =>
      t.company_name.toLowerCase().includes(search.toLowerCase()) ||
      (t.contact_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.industry || "").toLowerCase().includes(search.toLowerCase())
    );
    return data;
  }, [tenants, search, focusFilter]);

  const counts = useMemo(() =>
    tenants.reduce((a: Record<string, number>, t) => {
      a[t.focusLabel] = (a[t.focusLabel] || 0) + 1;
      return a;
    }, { Top: 0, Gut: 0, Mittel: 0, Schwach: 0 }),
  [tenants]);

  const handleSelect = (tenant: EnrichedTenant) => {
    setSelectedTenant(tenant);
    setSheetOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="glass-card"><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="glass-card"><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Focus category cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["Schwach", "Mittel", "Gut", "Top"] as const).map((label, i) => {
          const styles = FOCUS_STYLES[label];
          const active = focusFilter === label;
          return (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card
                className={`glass-card cursor-pointer transition-all duration-200 hover:scale-[1.02] ${active ? `${styles.border} border ${styles.bg}` : ""}`}
                onClick={() => setFocusFilter(active ? "alle" : label)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-3xl font-bold font-mono ${styles.text}`}>
                      {counts[label] || 0}
                    </span>
                    <Badge variant="outline" className={`${styles.bg} ${styles.text} ${styles.border} text-[10px] font-bold`}>
                      {label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {label === "Top" ? "Exzellente Performance" :
                     label === "Gut" ? "Auf gutem Kurs" :
                     label === "Mittel" ? "Optimierungsbedarf" :
                     "Sofortmaßnahmen nötig"}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Kunde, Kontakt oder Branche suchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 glass-card border-border/50"
        />
      </div>

      {/* Customer list */}
      <div className="space-y-2">
        {filtered.map((tenant, idx) => {
          const styles = FOCUS_STYLES[tenant.focusLabel] || FOCUS_STYLES.Mittel;
          const rev = parseFloat(String(tenant.current_revenue_monthly)) || 0;

          return (
            <motion.div
              key={tenant.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.02 }}
            >
              <Card
                className="glass-card cursor-pointer transition-all duration-200 hover:border-border/80 hover:scale-[1.005] group"
                onClick={() => handleSelect(tenant)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Score circle */}
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${styles.bg} border ${styles.border}`}>
                      <span className={`text-sm font-bold font-mono ${styles.text}`}>{tenant.score}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{tenant.company_name}</p>
                        <Badge variant="outline" className={`${styles.bg} ${styles.text} ${styles.border} text-[9px] font-bold shrink-0`}>
                          {tenant.focusLabel}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {tenant.contact_name && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />{tenant.contact_name}
                          </span>
                        )}
                        {tenant.industry && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />{tenant.industry}
                          </span>
                        )}
                        {rev > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 hidden sm:flex">
                            <DollarSign className="h-3 w-3" />{rev.toLocaleString("de-DE")}€/M
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="hidden md:flex items-center gap-1.5 flex-wrap justify-end max-w-xs">
                      {tenant.strengths.slice(0, 2).map(s => (
                        <span key={s} className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded-full whitespace-nowrap">
                          ✓ {s}
                        </span>
                      ))}
                      {tenant.problems.slice(0, 2).map(p => (
                        <span key={p} className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full whitespace-nowrap">
                          ⚠ {p}
                        </span>
                      ))}
                    </div>

                    {/* Recommendations preview */}
                    <div className="hidden lg:flex flex-col gap-1 max-w-52">
                      {tenant.recommendations.slice(0, 2).map((rec, ri) => (
                        <span key={ri} className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${PRIORITY_STYLES[rec.priority]}`}>
                          <Target className="h-2.5 w-2.5 shrink-0" />
                          {rec.action}
                        </span>
                      ))}
                    </div>

                    {/* Health indicator */}
                    {tenant.health && (
                      <div className="hidden sm:flex flex-col items-center gap-0.5">
                        <span className={`text-xs font-bold font-mono ${
                          tenant.health.color === "green" ? "text-success" :
                          tenant.health.color === "amber" ? "text-warning" :
                          "text-destructive"
                        }`}>{tenant.health.score}</span>
                        <span className="text-[9px] text-muted-foreground">Health</span>
                      </div>
                    )}

                    {/* Berater-Zuweisung */}
                    <div className="hidden md:block" onClick={(e) => e.stopPropagation()}>
                      <AdvisorAssignment
                        tenantId={tenant.id}
                        currentAdvisorId={tenant.advisor_id}
                        onUpdate={loadTenants}
                      />
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Keine Kunden gefunden</p>
        )}
      </div>

      {/* Detail Sheet */}
      <TenantDetailSheet
        tenant={selectedTenant}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
