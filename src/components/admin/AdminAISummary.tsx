import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Download, RefreshCw, Clock, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

interface TenantSummary {
  tenant_id: string;
  company_name: string;
  health_score: number | null;
  health_color: string | null;
  summary: string;
}

export function AdminAISummary() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<{ text: string; created_at: string } | null>(null);
  const [tenantSummaries, setTenantSummaries] = useState<TenantSummary[]>([]);

  useEffect(() => {
    loadExistingReport();
  }, []);

  const loadExistingReport = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("ai_summaries")
        .select("*")
        .is("tenant_id", null)
        .eq("scope", "admin_portfolio")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setReport({ text: data.summary_text, created_at: data.created_at! });
      }

      // Load per-tenant summaries
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, company_name, health_scores(score, color, created_at)")
        .eq("is_active", true)
        .order("company_name");

      if (tenants) {
        const summaries: TenantSummary[] = tenants.map((t: any) => {
          const sorted = t.health_scores?.sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          return {
            tenant_id: t.id,
            company_name: t.company_name,
            health_score: sorted?.[0]?.score ?? null,
            health_color: sorted?.[0]?.color ?? null,
            summary: "",
          };
        });
        setTenantSummaries(summaries);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      // Gather all tenant data for the AI
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, company_name, industry, health_scores(score, color, created_at)")
        .eq("is_active", true)
        .order("company_name");

      if (!tenants || tenants.length === 0) {
        toast({ title: "Keine Kunden", description: "Es gibt noch keine aktiven Kunden.", variant: "destructive" });
        setGenerating(false);
        return;
      }

      // Get latest metrics for each tenant
      const tenantData: any[] = [];
      for (const tenant of tenants) {
        const { data: metrics } = await supabase
          .from("v_metrics_weekly")
          .select("*")
          .eq("tenant_id", tenant.id)
          .order("period_start", { ascending: false })
          .limit(1)
          .maybeSingle();

        const sorted = (tenant as any).health_scores?.sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        tenantData.push({
          company: tenant.company_name,
          industry: tenant.industry,
          health: sorted?.[0]?.score ?? "N/A",
          healthColor: sorted?.[0]?.color ?? "unbekannt",
          metrics: metrics || {},
        });
      }

      const portfolioPrompt = `Du bist ein Portfolio-Manager für eine LinkedIn-Agentur. Erstelle einen kompakten Portfolio-Report über ALLE Kunden.

KUNDEN-ÜBERSICHT (${tenantData.length} aktive Kunden):

${tenantData.map((t, i) => `### ${i + 1}. ${t.company} (${t.industry || "k.A."})
- Health Score: ${t.health}/100 (${t.healthColor})
- Leads: ${t.metrics.leads_total || 0} | Termine: ${t.metrics.appointments || 0} | Deals: ${t.metrics.deals || 0}
- Revenue: ${t.metrics.revenue || 0}€ | Cash: ${t.metrics.cash_collected || 0}€
- Impressions: ${t.metrics.impressions || 0} | Calls: ${t.metrics.calls_made || 0}`).join("\n\n")}

ERSTELLE FOLGENDEN REPORT:

## 📊 Portfolio-Gesamtübersicht
Zusammenfassung: Wie steht das Gesamtportfolio? Durchschnittlicher Health Score, Gesamtrevenue, Trends.

## 🔴 Priorität 1 – Sofortiger Handlungsbedarf
Welche Kunden brauchen SOFORT Aufmerksamkeit? (niedrigster Health Score, keine Deals, kritische KPIs)
Pro Kunde: 1-2 Sätze mit konkreter Empfehlung.

## 🟡 Priorität 2 – Optimierungspotenzial
Kunden die okay performen aber Potenzial haben. Konkrete Hebel benennen.

## 🟢 Priorität 3 – Top-Performer
Kunden die gut laufen. Was kann man von ihnen lernen? Skalierungspotenzial?

## 🎯 Top 3 Maßnahmen für diese Woche
1. [Konkrete Maßnahme für kritischsten Kunden]
2. [Portfolio-weite Optimierung]
3. [Strategische Initiative]

Sei direkt, faktenbasiert, priorisiert. Max 600 Wörter.`;

      const { data, error } = await supabase.functions.invoke("generate-summary", {
        body: { tenantId: null, scope: "admin_portfolio", prompt: portfolioPrompt },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "Fehler", description: data.error, variant: "destructive" });
        setGenerating(false);
        return;
      }

      setReport({ text: data.summary.summary_text, created_at: data.summary.created_at });
      toast({ title: "Report erstellt", description: "Portfolio-Briefing wurde generiert" });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message || "Report konnte nicht erstellt werden", variant: "destructive" });
    }
    setGenerating(false);
  };

  const exportAsPDF = () => {
    if (!report) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Portfolio KI-Briefing</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; line-height: 1.6; font-size: 12px; }
          h1 { font-size: 20px; margin: 0 0 4px 0; color: #111; }
          h2 { font-size: 15px; margin: 20px 0 8px 0; color: #222; border-bottom: 1px solid #e5e5e5; padding-bottom: 4px; }
          h3 { font-size: 13px; margin: 14px 0 4px 0; color: #333; }
          p { margin: 4px 0; }
          ul { margin: 4px 0; padding-left: 20px; }
          li { margin: 2px 0; }
          .header { border-bottom: 2px solid #333; margin-bottom: 16px; padding-bottom: 8px; }
          .subtitle { font-size: 12px; color: #666; margin: 0; }
          .meta { font-size: 10px; color: #999; margin-top: 30px; border-top: 1px solid #e5e5e5; padding-top: 8px; }
          strong { color: #111; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📋 Portfolio KI-Briefing</h1>
          <p class="subtitle">ContentLeads – Wöchentlicher Portfolio-Report</p>
          <p class="subtitle">Erstellt am ${new Date(report.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <div id="content">${markdownToHtml(report.text)}</div>
        <p class="meta">Automatisch generiert von ContentLeads KI-Analyse · ${new Date().toLocaleDateString("de-DE")}</p>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    }
  };

  const exportAsText = () => {
    if (!report) return;
    const date = new Date(report.created_at).toLocaleDateString("de-DE");
    const text = `PORTFOLIO KI-BRIEFING – ${date}\n${"=".repeat(50)}\n\n${report.text}\n\n---\nErstellt von ContentLeads KI-Analyse`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Portfolio_Briefing_${date.replace(/\./g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 animate-pulse">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">KI-Portfolio-Briefing</CardTitle>
                <CardDescription className="text-xs">
                  Automatische Analyse aller Kunden mit Priorisierung und Handlungsempfehlungen
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              {report && (
                <>
                  <Button variant="outline" size="sm" onClick={exportAsText} className="rounded-xl gap-2 text-xs">
                    <FileText className="h-3 w-3" />
                    Text
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportAsPDF} className="rounded-xl gap-2 text-xs">
                    <Download className="h-3 w-3" />
                    PDF
                  </Button>
                </>
              )}
              <Button
                size="sm"
                onClick={generateReport}
                disabled={generating}
                className="rounded-xl gap-2 text-xs"
              >
                <RefreshCw className={`h-3 w-3 ${generating ? "animate-spin" : ""}`} />
                {generating ? "Wird erstellt..." : report ? "Neu erstellen" : "Report erstellen"}
              </Button>
            </div>
          </div>
        </CardHeader>
        {report && (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-4">
              <Clock className="h-3 w-3" />
              Erstellt: {new Date(report.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </CardContent>
        )}
      </Card>

      {report && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="prose prose-sm max-w-none [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_ul]:space-y-1 [&_li]:text-foreground/80 [&_p]:text-foreground/80 [&_strong]:text-foreground">
                <ReactMarkdown>{report.text}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!report && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <Sparkles className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Noch kein Portfolio-Report erstellt.</p>
            <p className="text-xs text-muted-foreground">Klicke auf "Report erstellen", um eine KI-Analyse aller Kunden zu generieren.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Simple markdown → HTML converter for PDF export */
function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^\- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");
}
