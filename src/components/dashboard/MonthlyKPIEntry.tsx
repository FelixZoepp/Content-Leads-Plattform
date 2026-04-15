import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, Calculator, ChevronDown, ChevronUp } from "lucide-react";

const MONTHS_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];

interface Props {
  tenantId: string;
  onSaved?: () => void;
}

interface MonthData {
  // Marketing
  impressions: string;
  likes: string;
  comments: string;
  link_clicks: string;
  new_followers: string;
  followers_current: string;
  dms_sent: string;
  post_type: string;
  // Sales
  leads_total: string;
  leads_qualified: string;
  calls_made: string;
  calls_reached: string;
  calls_interested: string;
  appointments: string;
  settings_planned: string;
  settings_held: string;
  closings_planned: string;
  closings_held: string;
  deals: string;
  // Finance
  cash_collected: string;
  deal_volume: string;
  monthly_retainer: string;
  revenue: string;
  words_spoken: string;
}

const emptyMonth = (): MonthData => ({
  impressions: "", likes: "", comments: "", link_clicks: "", new_followers: "",
  followers_current: "", dms_sent: "", post_type: "content",
  leads_total: "", leads_qualified: "", calls_made: "", calls_reached: "",
  calls_interested: "", appointments: "", settings_planned: "", settings_held: "",
  closings_planned: "", closings_held: "", deals: "",
  cash_collected: "", deal_volume: "", monthly_retainer: "", revenue: "", words_spoken: "",
});

function parseNum(v: string): number | null {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function Field({ label, fieldKey, unit, data, onChange, hint }: {
  label: string;
  fieldKey: keyof MonthData;
  unit?: string;
  data: MonthData;
  onChange: (key: keyof MonthData, value: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">
        {label}
        {unit && <span className="text-muted-foreground ml-1">({unit})</span>}
      </Label>
      <Input
        type="number"
        step="any"
        value={data[fieldKey]}
        onChange={e => onChange(fieldKey, e.target.value)}
        placeholder="0"
        className="h-8 text-sm"
      />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function MonthlyKPIEntry({ tenantId, onSaved }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [data, setData] = useState<MonthData>(emptyMonth());
  const [loading, setLoading] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const { toast } = useToast();

  const upd = (key: keyof MonthData, value: string) =>
    setData(prev => ({ ...prev, [key]: value }));

  // Auto-berechnete KPIs
  const leadQualityRate = (() => {
    const total = parseNum(data.leads_total);
    const qual = parseNum(data.leads_qualified);
    return total && qual && total > 0 ? ((qual / total) * 100).toFixed(1) : null;
  })();
  const reachRate = (() => {
    const made = parseNum(data.calls_made);
    const reached = parseNum(data.calls_reached);
    return made && reached && made > 0 ? ((reached / made) * 100).toFixed(1) : null;
  })();
  const interestRate = (() => {
    const reached = parseNum(data.calls_reached);
    const interested = parseNum(data.calls_interested);
    return reached && interested && reached > 0 ? ((interested / reached) * 100).toFixed(1) : null;
  })();
  const settingShowRate = (() => {
    const planned = parseNum(data.settings_planned);
    const held = parseNum(data.settings_held);
    return planned && held && planned > 0 ? ((held / planned) * 100).toFixed(1) : null;
  })();
  const closingShowRate = (() => {
    const planned = parseNum(data.closings_planned);
    const held = parseNum(data.closings_held);
    return planned && held && planned > 0 ? ((held / planned) * 100).toFixed(1) : null;
  })();
  const closingRate = (() => {
    const held = parseNum(data.closings_held);
    const deals = parseNum(data.deals);
    return held && deals && held > 0 ? ((deals / held) * 100).toFixed(1) : null;
  })();
  const revenuePerLead = (() => {
    const revenue = parseNum(data.cash_collected);
    const leads = parseNum(data.leads_total);
    return revenue && leads && leads > 0 ? (revenue / leads).toFixed(0) : null;
  })();

  const handleSave = async () => {
    if (!tenantId) return;
    setLoading(true);

    // We save one entry per month (use the 1st of the month as period_date)
    const periodDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;

    const row = {
      tenant_id: tenantId,
      period_date: periodDate,
      period_type: "monthly_summary",
      post_type: data.post_type || null,
      impressions: parseNum(data.impressions),
      likes: parseNum(data.likes),
      comments: parseNum(data.comments),
      link_clicks: parseNum(data.link_clicks),
      new_followers: parseNum(data.new_followers),
      followers_current: parseNum(data.followers_current),
      dms_sent: parseNum(data.dms_sent),
      leads_total: parseNum(data.leads_total),
      leads_qualified: parseNum(data.leads_qualified),
      calls_made: parseNum(data.calls_made),
      calls_reached: parseNum(data.calls_reached),
      calls_interested: parseNum(data.calls_interested),
      appointments: parseNum(data.appointments),
      settings_planned: parseNum(data.settings_planned),
      settings_held: parseNum(data.settings_held),
      closings_planned: parseNum(data.closings_planned),
      closings_held: parseNum(data.closings_held),
      deals: parseNum(data.deals),
      cash_collected: parseNum(data.cash_collected),
      deal_volume: parseNum(data.deal_volume),
      monthly_retainer: parseNum(data.monthly_retainer),
      revenue: parseNum(data.revenue),
      words_spoken: parseNum(data.words_spoken),
    };

    const { error } = await supabase
      .from("metrics_snapshot")
      .insert(row as any);

    setLoading(false);
    if (error) {
      toast({ title: "Fehler beim Speichern", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${MONTHS_DE[month]} ${year} gespeichert ✓`, description: "KPI-Daten wurden eingetragen." });
      onSaved?.();
      // Move to previous month for convenience
      let newMonth = month - 1;
      let newYear = year;
      if (newMonth < 0) { newMonth = 11; newYear--; }
      setMonth(newMonth);
      setYear(newYear);
      setData(emptyMonth());
    }
  };

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Monatliche KPIs eintragen
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={String(month)} onValueChange={v => setMonth(parseInt(v))}>
              <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS_DE.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
              <SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Eintrag für: <span className="font-medium text-foreground">{MONTHS_DE[month]} {year}</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="marketing">
          <TabsList className="grid grid-cols-3 h-8 text-xs">
            <TabsTrigger value="marketing" className="text-xs">📱 Marketing</TabsTrigger>
            <TabsTrigger value="sales" className="text-xs">📞 Sales</TabsTrigger>
            <TabsTrigger value="finance" className="text-xs">💶 Finanzen</TabsTrigger>
          </TabsList>

          {/* ── MARKETING ── */}
          <TabsContent value="marketing" className="pt-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Impressionen" fieldKey="impressions" data={data} onChange={upd} />
              <Field label="Likes" fieldKey="likes" data={data} onChange={upd} />
              <Field label="Kommentare" fieldKey="comments" data={data} onChange={upd} />
              <Field label="Link-Klicks" fieldKey="link_clicks" data={data} onChange={upd} />
              <Field label="Neue Follower" fieldKey="new_followers" data={data} onChange={upd} />
              <Field label="Follower gesamt" fieldKey="followers_current" data={data} onChange={upd} />
              <Field label="DMs gesendet" fieldKey="dms_sent" data={data} onChange={upd} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Post-Typ (dominant)</Label>
              <Select value={data.post_type} onValueChange={v => upd("post_type", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="content">📝 Content</SelectItem>
                  <SelectItem value="lead">🎯 Lead-Gen</SelectItem>
                  <SelectItem value="mixed">🔀 Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* ── SALES ── */}
          <TabsContent value="sales" className="pt-4 space-y-4">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Leads</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="Leads gesamt" fieldKey="leads_total" data={data} onChange={upd} />
                <Field label="MQL (qualifiziert)" fieldKey="leads_qualified" data={data} onChange={upd} />
              </div>

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Anwahlphase (Calling)</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="Anwahlversuche" fieldKey="calls_made" data={data} onChange={upd} />
                <Field label="Erreicht" fieldKey="calls_reached" data={data} onChange={upd} />
                <Field label="Interessiert" fieldKey="calls_interested" data={data} onChange={upd} />
                <Field label="Termine vereinbart" fieldKey="appointments" data={data} onChange={upd} />
              </div>

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Setting-Calls</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="Settings geplant" fieldKey="settings_planned" data={data} onChange={upd} />
                <Field label="Settings gehalten" fieldKey="settings_held" data={data} onChange={upd} />
              </div>

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Closing-Calls</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="Closings geplant" fieldKey="closings_planned" data={data} onChange={upd} />
                <Field label="Closings gehalten" fieldKey="closings_held" data={data} onChange={upd} />
                <Field label="Deals abgeschlossen" fieldKey="deals" data={data} onChange={upd} />
              </div>
              <Field label="Gesprochene Wörter" fieldKey="words_spoken" data={data} onChange={upd} hint="Gesamte Wörter aus Calls dieses Monats" />
            </div>
          </TabsContent>

          {/* ── FINANZEN ── */}
          <TabsContent value="finance" className="pt-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Cash Collected" fieldKey="cash_collected" unit="€ netto" data={data} onChange={upd} hint="Tatsächlich eingegangene Zahlungen" />
              <Field label="Deal-Volumen" fieldKey="deal_volume" unit="€ netto" data={data} onChange={upd} hint="Vertragsvolumen aller neuen Deals" />
              <Field label="Monthly Retainer" fieldKey="monthly_retainer" unit="€ netto" data={data} onChange={upd} hint="Wiederkehrender Monatsbeitrag" />
              <Field label="Umsatz gesamt" fieldKey="revenue" unit="€ netto" data={data} onChange={upd} hint="Gesamtumsatz dieses Monats" />
            </div>
          </TabsContent>
        </Tabs>

        {/* Auto-berechnete Werte */}
        {(leadQualityRate || reachRate || closingRate || revenuePerLead) && (
          <div className="border border-border/40 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowCalc(p => !p)}
              className="w-full flex items-center justify-between p-3 text-xs font-semibold text-muted-foreground hover:bg-muted/30 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Calculator className="h-3.5 w-3.5 text-primary" />
                Automatisch berechnete Raten
              </span>
              {showCalc ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showCalc && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/20 border-t border-border/30">
                {[
                  { label: "MQL-Rate", value: leadQualityRate, unit: "%" },
                  { label: "Erreichungsrate", value: reachRate, unit: "%" },
                  { label: "Interessenrate", value: interestRate, unit: "%" },
                  { label: "Setting Show-Rate", value: settingShowRate, unit: "%" },
                  { label: "Closing Show-Rate", value: closingShowRate, unit: "%" },
                  { label: "Closing-Rate", value: closingRate, unit: "%" },
                  { label: "Umsatz / Lead", value: revenuePerLead, unit: "€" },
                ].filter(r => r.value !== null).map(r => (
                  <div key={r.label} className="text-center">
                    <p className="text-[10px] text-muted-foreground">{r.label}</p>
                    <p className="text-sm font-bold text-primary">{r.value}{r.unit}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {MONTHS_DE[month]} {year} speichern
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
