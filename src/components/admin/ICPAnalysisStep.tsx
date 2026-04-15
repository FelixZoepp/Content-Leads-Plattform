import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Trash2, Plus, BarChart3, Trophy, Building2, Rocket } from "lucide-react";

const BRANCHES = [
  "IT & Software", "Agentur / Marketing", "E-Commerce", "Beratung / Consulting",
  "Handwerk", "Immobilien", "Fitness & Gesundheit", "Coaching / Training",
  "Zahnmedizin / Ärzte", "Gastronomie", "Finanzen / Versicherung",
  "Automotive", "Bauwesen", "Bildung", "Recht / Kanzlei",
  "Beauty / Kosmetik", "SaaS", "Sonstiges"
];

const MA_OPTIONS = ["1-5", "6-10", "11-25", "26-50", "51-100", "101-250", "250+"];
const UMSATZ_OPTIONS = ["<100k", "100k-500k", "500k-1M", "1M-5M", "5M+"];
const ZAHLUNGS_SPEED = ["Sofort (0-3 Tage)", "Schnell (4-7 Tage)", "Normal (8-14 Tage)", "Langsam (15-30 Tage)", "Sehr spät (30+ Tage)", "Nicht bezahlt"];
const CLOSE_DAUER = ["1 Setter-Call", "2 Calls", "3 Calls", "4+ Calls", "Über 2 Wochen", "Über 1 Monat"];
const LEAD_QUELLEN = ["Facebook Ads", "Instagram Ads", "Google Ads", "YouTube Ads", "TikTok Ads", "LinkedIn", "Empfehlung", "Organic / Content", "Cold Outreach", "Webinar", "Sonstiges"];
const GEZAHLT_OPTIONS = ["Ja, komplett", "Teilweise", "Nein", "Läuft noch"];
const PROBLEM_OPTIONS = ["Sehr hoch – wusste genau, was er braucht", "Mittel – musste überzeugt werden", "Niedrig – viel Aufklärung nötig"];

export type ICPClient = {
  firma: string; name: string; branche: string; mitarbeiter: string; jahresumsatz: string;
  leadQuelle: string; closeDauer: string; dealValue: string; gezahlt: string;
  zahlungsSpeed: string; zusammenarbeit: number; ergebnis: number; problemBewusstsein: string; notizen: string;
  closeDate: string; onboardingDate: string; projectStartDate: string; projectEndDate: string;
};

export const emptyICPClient = (): ICPClient => ({
  firma: "", name: "", branche: "", mitarbeiter: "", jahresumsatz: "",
  leadQuelle: "", closeDauer: "", dealValue: "", gezahlt: "",
  zahlungsSpeed: "", zusammenarbeit: 0, ergebnis: 0, problemBewusstsein: "", notizen: "",
  closeDate: "", onboardingDate: "", projectStartDate: "", projectEndDate: ""
});

function scoreClient(c: ICPClient) {
  let s = 0;
  if (c.gezahlt === "Ja, komplett") s += 25;
  else if (c.gezahlt === "Teilweise") s += 10;
  else if (c.gezahlt === "Läuft noch") s += 15;
  if (c.zahlungsSpeed?.includes("Sofort")) s += 20;
  else if (c.zahlungsSpeed?.includes("Schnell")) s += 15;
  else if (c.zahlungsSpeed?.includes("Normal")) s += 8;
  else if (c.zahlungsSpeed?.includes("Langsam")) s += 3;
  if (c.closeDauer === "1 Setter-Call") s += 20;
  else if (c.closeDauer === "2 Calls") s += 15;
  else if (c.closeDauer === "3 Calls") s += 10;
  else if (c.closeDauer === "4+ Calls") s += 5;
  s += (c.zusammenarbeit || 0) * 1.5;
  s += (c.ergebnis || 0) * 1.5;
  if (c.problemBewusstsein?.includes("Sehr hoch")) s += 15;
  else if (c.problemBewusstsein?.includes("Mittel")) s += 8;
  const dv = parseFloat(c.dealValue) || 0;
  if (dv >= 3000) s += 10; else if (dv >= 1500) s += 5;
  return Math.round(s);
}

function topCount(arr: string[]) {
  const m: Record<string, number> = {};
  arr.filter(Boolean).forEach(v => m[v] = (m[v] || 0) + 1);
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

function RatingRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5,6,7,8,9,10].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`w-8 h-8 rounded-md text-xs font-semibold border transition-colors ${
            value === n
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
          }`}>
          {n}
        </button>
      ))}
    </div>
  );
}

function ClientCard({ index, client, update, isOpen, toggle }: {
  index: number; client: ICPClient;
  update: (key: keyof ICPClient, val: any) => void;
  isOpen: boolean; toggle: () => void;
}) {
  const isComplete = client.firma && client.branche;

  return (
    <div className={`rounded-xl border transition-all ${isOpen ? "border-primary shadow-md shadow-primary/5" : "border-border"}`}>
      <button type="button" onClick={toggle} className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center h-8 w-8 rounded-lg text-xs font-bold ${
            isComplete ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"
          }`}>
            {isComplete ? "✓" : index + 1}
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm">{client.firma || `Kunde ${index + 1}`}</p>
            <p className="text-xs text-muted-foreground">
              {client.branche ? `${client.branche}${client.mitarbeiter ? ` · ${client.mitarbeiter} MA` : ""}` : "Noch nicht ausgefüllt"}
            </p>
          </div>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="p-4 border-t border-border space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px]">Firmenname *</Label>
              <Input value={client.firma} onChange={e => update("firma", e.target.value)} placeholder="z.B. TechVision AG" className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Ansprechpartner</Label>
              <Input value={client.name} onChange={e => update("name", e.target.value)} placeholder="Name des Entscheiders" className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Branche *</Label>
              <Select value={client.branche} onValueChange={v => update("branche", v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Wählen" /></SelectTrigger>
                <SelectContent>{BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Mitarbeiteranzahl</Label>
              <Select value={client.mitarbeiter} onValueChange={v => update("mitarbeiter", v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Wählen" /></SelectTrigger>
                <SelectContent>{MA_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-2 border-t border-border/50">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">💰 Deal & Sales</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Deal-Value (€)</Label>
                <Input type="number" value={client.dealValue} onChange={e => update("dealValue", e.target.value)} placeholder="3000" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Jahresumsatz Kunde</Label>
                <Select value={client.jahresumsatz} onValueChange={v => update("jahresumsatz", v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Wählen" /></SelectTrigger>
                  <SelectContent>{UMSATZ_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Lead-Quelle</Label>
                <Select value={client.leadQuelle} onValueChange={v => update("leadQuelle", v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Wählen" /></SelectTrigger>
                  <SelectContent>{LEAD_QUELLEN.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Close-Dauer</Label>
                <Select value={client.closeDauer} onValueChange={v => update("closeDauer", v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Wählen" /></SelectTrigger>
                  <SelectContent>{CLOSE_DAUER.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border/50">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">📋 Zahlung & Ergebnis</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Hat bezahlt?</Label>
                <Select value={client.gezahlt} onValueChange={v => update("gezahlt", v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Wählen" /></SelectTrigger>
                  <SelectContent>{GEZAHLT_OPTIONS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Zahlungsgeschwindigkeit</Label>
                <Select value={client.zahlungsSpeed} onValueChange={v => update("zahlungsSpeed", v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Wählen" /></SelectTrigger>
                  <SelectContent>{ZAHLUNGS_SPEED.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Problembewusstsein</Label>
                <Select value={client.problemBewusstsein} onValueChange={v => update("problemBewusstsein", v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Wählen" /></SelectTrigger>
                  <SelectContent>{PROBLEM_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px]">Zusammenarbeit (1-10)</Label>
            <RatingRow value={client.zusammenarbeit} onChange={v => update("zusammenarbeit", v)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px]">Ergebnis / Erfolg (1-10)</Label>
            <RatingRow value={client.ergebnis} onChange={v => update("ergebnis", v)} />
          </div>

          <div className="pt-2 border-t border-border/50">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">📅 Projekt-Timeline</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Close-Datum</Label>
                <Input type="date" value={client.closeDate} onChange={e => update("closeDate", e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Onboarding-Start</Label>
                <Input type="date" value={client.onboardingDate} onChange={e => update("onboardingDate", e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Projekt-Start</Label>
                <Input type="date" value={client.projectStartDate} onChange={e => update("projectStartDate", e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Projektabschluss</Label>
                <Input type="date" value={client.projectEndDate} onChange={e => update("projectEndDate", e.target.value)} className="h-9" />
              </div>
            </div>
            {client.closeDate && client.onboardingDate && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Close → Onboarding: <strong className="text-foreground">{Math.round((new Date(client.onboardingDate).getTime() - new Date(client.closeDate).getTime()) / 86400000)} Tage</strong></span>
                {client.projectStartDate && (
                  <span>Onboarding → Projekt: <strong className="text-foreground">{Math.round((new Date(client.projectStartDate).getTime() - new Date(client.onboardingDate).getTime()) / 86400000)} Tage</strong></span>
                )}
                {client.projectStartDate && client.projectEndDate && (
                  <span>Fulfillment-Dauer: <strong className={`${
                    Math.round((new Date(client.projectEndDate).getTime() - new Date(client.projectStartDate).getTime()) / 86400000) > 60 ? "text-destructive" : "text-foreground"
                  }`}>{Math.round((new Date(client.projectEndDate).getTime() - new Date(client.projectStartDate).getTime()) / 86400000)} Tage</strong></span>
                )}
                {client.closeDate && client.projectEndDate && (
                  <span>Gesamt (Close → Abschluss): <strong className="text-foreground">{Math.round((new Date(client.projectEndDate).getTime() - new Date(client.closeDate).getTime()) / 86400000)} Tage</strong></span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Notizen / Besonderheiten</Label>
            <Textarea value={client.notizen} onChange={e => update("notizen", e.target.value)} placeholder="Was war besonders an diesem Kunden?" rows={2} className="text-sm" />
          </div>
        </div>
      )}
    </div>
  );
}

function ICPResults({ clients, onBack }: { clients: ICPClient[]; onBack: () => void }) {
  const valid = clients.filter(c => c.firma && c.branche);
  const scored = valid.map(c => ({ ...c, score: scoreClient(c) })).sort((a, b) => b.score - a.score);
  const maxScore = Math.max(...scored.map(s => s.score), 1);

  const branchen = topCount(valid.map(c => c.branche));
  const maTop = topCount(valid.map(c => c.mitarbeiter));
  const quelleTop = topCount(valid.map(c => c.leadQuelle));
  const closeTop = topCount(valid.map(c => c.closeDauer));
  let totalDeal = 0, dealN = 0, payGood = 0, payBad = 0;
  let closeToOnb: number[] = [], onbToProj: number[] = [], closeToProj: number[] = [], fulfillmentDur: number[] = [];
  valid.forEach(c => {
    if (c.dealValue) { totalDeal += parseFloat(c.dealValue) || 0; dealN++; }
    if (c.gezahlt === "Ja, komplett") payGood++;
    if (c.gezahlt === "Nein") payBad++;
    if (c.closeDate && c.onboardingDate) {
      closeToOnb.push(Math.round((new Date(c.onboardingDate).getTime() - new Date(c.closeDate).getTime()) / 86400000));
    }
    if (c.onboardingDate && c.projectStartDate) {
      onbToProj.push(Math.round((new Date(c.projectStartDate).getTime() - new Date(c.onboardingDate).getTime()) / 86400000));
    }
    if (c.closeDate && c.projectStartDate) {
      closeToProj.push(Math.round((new Date(c.projectStartDate).getTime() - new Date(c.closeDate).getTime()) / 86400000));
    }
    if (c.projectStartDate && c.projectEndDate) {
      fulfillmentDur.push(Math.round((new Date(c.projectEndDate).getTime() - new Date(c.projectStartDate).getTime()) / 86400000));
    }
  });
  const avgDeal = dealN > 0 ? Math.round(totalDeal / dealN) : 0;
  const avgZus = (valid.reduce((s, c) => s + (c.zusammenarbeit || 0), 0) / valid.length).toFixed(1);
  const avgErg = (valid.reduce((s, c) => s + (c.ergebnis || 0), 0) / valid.length).toFixed(1);
  const payRate = valid.length > 0 ? Math.round(payGood / valid.length * 100) : 0;
  const avgCloseToOnb = closeToOnb.length > 0 ? Math.round(closeToOnb.reduce((a, b) => a + b, 0) / closeToOnb.length) : null;
  const avgOnbToProj = onbToProj.length > 0 ? Math.round(onbToProj.reduce((a, b) => a + b, 0) / onbToProj.length) : null;
  const avgCloseToProj = closeToProj.length > 0 ? Math.round(closeToProj.reduce((a, b) => a + b, 0) / closeToProj.length) : null;
  const avgFulfillment = fulfillmentDur.length > 0 ? Math.round(fulfillmentDur.reduce((a, b) => a + b, 0) / fulfillmentDur.length) : null;

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <Badge variant="outline" className="text-green-600 border-green-500/30 bg-green-500/10">✅ Analyse abgeschlossen</Badge>
        <h3 className="text-xl font-bold">Dein ICP Profil</h3>
        <p className="text-sm text-muted-foreground">Basierend auf {valid.length} analysierten Kunden</p>
      </div>

      {/* ICP Profile Card */}
      <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h4 className="font-bold text-lg">Dein idealer Wunschkunde</h4>
        </div>
        <p className="text-sm text-muted-foreground">Auf dieses Profil solltest du dich im Marketing & Sales fokussieren</p>
        <div className="space-y-0">
          {[
            ["Branche", branchen[0]?.[0] || "—"],
            ["Unternehmensgröße", `${maTop[0]?.[0] || "—"} Mitarbeiter`],
            ["Ø Deal-Value", `€${avgDeal.toLocaleString("de-DE")}`],
            ["Beste Lead-Quelle", quelleTop[0]?.[0] || "—"],
            ["Typische Close-Dauer", closeTop[0]?.[0] || "—"],
            ["Zahlungsmoral", `${payGood}/${valid.length} komplett bezahlt (${payRate}%)`],
            ["Ø Zusammenarbeit", `${avgZus} / 10`],
            ["Ø Ergebnis", `${avgErg} / 10`],
            ...(avgCloseToOnb !== null ? [["Ø Close → Onboarding", `${avgCloseToOnb} Tage`]] : []),
            ...(avgOnbToProj !== null ? [["Ø Onboarding → Projekt", `${avgOnbToProj} Tage`]] : []),
            ...(avgFulfillment !== null ? [["Ø Fulfillment-Dauer", `${avgFulfillment} Tage`]] : []),
            ...(avgCloseToProj !== null ? [["Ø Close → Projekt-Start", `${avgCloseToProj} Tage`]] : []),
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[160px_1fr] gap-2 py-2.5 border-b border-border/40 text-sm">
              <span className="text-muted-foreground font-medium text-xs">{k}</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Kunden analysiert", value: String(valid.length), color: "text-primary" },
          { label: "Ø Deal-Value", value: `€${avgDeal.toLocaleString("de-DE")}`, color: "text-green-600 dark:text-green-400" },
          { label: "Zahlungsquote", value: `${payRate}%`, color: payRate >= 70 ? "text-green-600 dark:text-green-400" : payRate >= 40 ? "text-yellow-600" : "text-destructive" },
          { label: "Non-Payment", value: String(payBad), color: payBad === 0 ? "text-green-600 dark:text-green-400" : "text-destructive" },
        ].map(s => (
          <div key={s.label} className="rounded-lg bg-muted/50 p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className={`text-xl font-bold font-mono mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Ranking */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-primary" />
            <h4 className="font-bold text-sm">Kunden-Ranking</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border">
                  {["#", "Firma", "Branche", "Deal €", "Bezahlt", "Close", "Score"].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider py-2 px-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scored.map((c, i) => {
                  const pct = Math.round(c.score / maxScore * 100);
                  return (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 px-2 text-sm">{medals[i] || <span className="text-muted-foreground">{i + 1}</span>}</td>
                      <td className={`py-2 px-2 text-xs ${i < 3 ? "font-bold" : "font-medium"}`}>{c.firma}</td>
                      <td className="py-2 px-2 text-xs">{c.branche}</td>
                      <td className="py-2 px-2 text-xs">€{(parseFloat(c.dealValue) || 0).toLocaleString("de-DE")}</td>
                      <td className="py-2 px-2">
                        <Badge variant={c.gezahlt === "Ja, komplett" ? "default" : c.gezahlt === "Nein" ? "destructive" : "secondary"} className="text-[10px]">
                          {c.gezahlt || "—"}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-xs">{c.closeDauer || "—"}</td>
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
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-primary" />
            <h4 className="font-bold text-sm">Branchen-Verteilung</h4>
          </div>
          <div className="space-y-0">
            {branchen.map(([b, n]) => (
              <div key={b} className="flex items-center gap-3 py-2 border-b border-border/30">
                <span className="flex-shrink-0 w-36 text-sm font-medium truncate">{b}</span>
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
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Rocket className="h-4 w-4 text-primary" />
            <h4 className="font-bold text-sm">Nächste Schritte</h4>
          </div>
          {[
            `Fokussiere dein Marketing auf <strong>${branchen[0]?.[0] || "—"}</strong> mit <strong>${maTop[0]?.[0] || "—"}</strong> Mitarbeitern`,
            `Nutze primär <strong>${quelleTop[0]?.[0] || "—"}</strong> als Lead-Quelle`,
            `Setze deinen Mindest-Deal-Value auf <strong>€${Math.round(avgDeal * 0.8).toLocaleString("de-DE")}</strong>`,
            `Qualifiziere härter: Wenn nach <strong>2 Calls kein Close</strong>, ist der Prospect wahrscheinlich kein Fit`,
          ].map((text, i) => (
            <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-muted/50 text-sm">
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{i + 1}</div>
              <div dangerouslySetInnerHTML={{ __html: text }} className="leading-relaxed" />
            </div>
          ))}
          {payBad > 0 && (
            <div className="flex gap-3 items-start p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-destructive text-destructive-foreground flex items-center justify-center font-bold">!</div>
              <div><strong>{payBad} Kunde(n)</strong> haben nicht bezahlt – prüfe dein Onboarding und deine Zahlungsbedingungen</div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="outline" onClick={onBack}>← Zurück zum Formular</Button>
      </div>
    </div>
  );
}

// Needed for lucide import
import { Target } from "lucide-react";

interface ICPAnalysisStepProps {
  clients: ICPClient[];
  setClients: (clients: ICPClient[]) => void;
  showResults: boolean;
  setShowResults: (v: boolean) => void;
}

export default function ICPAnalysisStep({ clients, setClients, showResults, setShowResults }: ICPAnalysisStepProps) {
  const [openCard, setOpenCard] = useState(0);

  const updateClient = (index: number, key: keyof ICPClient, value: any) => {
    setClients(clients.map((c, i) => i === index ? { ...c, [key]: value } : c));
  };

  const filled = clients.filter(c => c.firma && c.branche).length;

  if (showResults) {
    return <ICPResults clients={clients} onBack={() => setShowResults(false)} />;
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">ICP-Analyse – Letzte 10 Kunden</h3>
      <p className="text-sm text-muted-foreground">
        Trage deine letzten 10 Kunden ein, um deinen idealen Wunschkunden zu ermitteln.
      </p>

      {/* Progress */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground font-mono text-center">{filled} / 10 Kunden eingetragen</p>
        <div className="flex gap-1">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i < filled ? "bg-primary shadow-sm shadow-primary/30" : "bg-muted"}`} />
          ))}
        </div>
      </div>

      {/* Client Cards */}
      <div className="space-y-2">
        {clients.map((c, i) => (
          <ClientCard key={i} index={i} client={c}
            update={(k, v) => updateClient(i, k, v)}
            isOpen={openCard === i}
            toggle={() => setOpenCard(openCard === i ? -1 : i)} />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-3 pt-2">
        <Button variant="outline" size="sm" onClick={() => {
          if (confirm("Wirklich zurücksetzen?")) {
            setClients(Array.from({ length: 10 }, emptyICPClient));
            setOpenCard(0);
          }
        }}>
          ↺ Zurücksetzen
        </Button>
        <Button size="sm" disabled={filled < 3} onClick={() => setShowResults(true)} className="gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" /> Analyse starten
        </Button>
      </div>
    </div>
  );
}
