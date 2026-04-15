import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, TrendingUp, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface KPIEntryFormProps {
  tenantId: string;
  onEntryAdded: () => void;
}

const defaultForm = {
  entry_date: new Date().toISOString().split("T")[0],
  post_url: "",
  post_type: "content" as "lead" | "content",
  impressions: 0,
  likes: 0,
  comments: 0,
  link_clicks: 0,
  followers_current: 0,
  dms_sent: 0,
  leads_total: 0,
  leads_qualified: 0,
  appointments: 0,
  calls_made: 0,
  calls_reached: 0,
  calls_interested: 0,
  settings_planned: 0,
  settings_held: 0,
  closings_planned: 0,
  closings_held: 0,
  deals: 0,
  cash_collected: 0,
  deal_volume: 0,
  monthly_retainer: 0,
  words_spoken: 0,
};

export const KPIEntryForm = ({ tenantId, onEntryAdded }: KPIEntryFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(defaultForm);
  const [lastEntry, setLastEntry] = useState<any>(null);

  useEffect(() => {
    loadLastEntry();
  }, [tenantId]);

  const loadLastEntry = async () => {
    const { data } = await supabase
      .from("metrics_snapshot")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("period_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setLastEntry(data);
      setFormData(prev => ({
        ...prev,
        monthly_retainer: parseFloat(String(data.monthly_retainer)) || 0,
        followers_current: data.followers_current || 0,
      }));
    }
  };

  const set = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));
  const setNum = (field: string, raw: string, decimal = false) =>
    set(field, decimal ? (parseFloat(raw) || 0) : (parseInt(raw) || 0));

  // Calculated KPIs
  const leadQualityRate = formData.leads_total > 0
    ? ((formData.leads_qualified / formData.leads_total) * 100).toFixed(1) : "–";
  const reachRate = formData.calls_made > 0
    ? ((formData.calls_reached / formData.calls_made) * 100).toFixed(1) : "–";
  const interestRate = formData.calls_reached > 0
    ? ((formData.calls_interested / formData.calls_reached) * 100).toFixed(1) : "–";
  const settingShowRate = formData.settings_planned > 0
    ? ((formData.settings_held / formData.settings_planned) * 100).toFixed(1) : "–";
  const closingShowRate = formData.closings_planned > 0
    ? ((formData.closings_held / formData.closings_planned) * 100).toFixed(1) : "–";
  const closingRate = formData.closings_held > 0
    ? ((formData.deals / formData.closings_held) * 100).toFixed(1) : "–";
  const revenuePerLead = formData.leads_total > 0
    ? (formData.cash_collected / formData.leads_total).toFixed(2) : "–";
  const costPerLead = formData.leads_total > 0 && formData.monthly_retainer > 0
    ? (formData.monthly_retainer / formData.leads_total).toFixed(2) : "–";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload: any = {
      tenant_id: tenantId,
      period_date: formData.entry_date,
      period_type: "daily",
      post_url: formData.post_url || null,
      post_type: formData.post_type,
      posts: formData.post_url ? "1" : "0",
      impressions: formData.impressions,
      likes: formData.likes,
      comments: formData.comments,
      link_clicks: formData.link_clicks,
      new_followers: lastEntry ? Math.max(0, formData.followers_current - (lastEntry.followers_current || 0)) : 0,
      followers_current: formData.followers_current,
      leads_total: formData.leads_total,
      leads_qualified: formData.leads_qualified,
      appointments: formData.appointments,
      calls_made: formData.calls_made,
      calls_reached: formData.calls_reached,
      calls_interested: formData.calls_interested,
      settings_planned: formData.settings_planned,
      settings_held: formData.settings_held,
      closings_planned: formData.closings_planned,
      closings_held: formData.closings_held,
      closings: formData.closings_held,
      deals: formData.deals,
      revenue: formData.cash_collected,
      cash_collected: formData.cash_collected,
      deal_volume: formData.deal_volume,
      monthly_retainer: formData.monthly_retainer,
      words_spoken: formData.words_spoken,
      dms_sent: formData.dms_sent,
    };

    const { error } = await supabase.from("metrics_snapshot").upsert(payload as any, {
      onConflict: "tenant_id,period_date",
    });

    setLoading(false);
    if (error) {
      console.error("KPI entry error:", error);
      toast({ title: "Fehler", description: "KPI-Eintrag konnte nicht gespeichert werden: " + error.message, variant: "destructive" });
    } else {
      toast({ title: "Gespeichert ✓", description: `KPIs für ${new Date(formData.entry_date).toLocaleDateString("de-DE")} erfasst` });
      onEntryAdded();
    }
  };

  const FieldInfo = ({ text }: { text: string }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3.5 w-3.5 text-muted-foreground inline ml-1 cursor-help" />
        </TooltipTrigger>
        <TooltipContent><p className="max-w-xs text-xs">{text}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const NumField = ({ id, label, value, onChange, info, decimal, prefix }: {
    id: string; label: string; value: number; onChange: (v: string) => void;
    info?: string; decimal?: boolean; prefix?: string;
  }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}{info && <FieldInfo text={info} />}
      </Label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{prefix}</span>}
        <Input
          id={id} type="number" min="0" inputMode={decimal ? "decimal" : "numeric"}
          step={decimal ? "0.01" : "1"}
          className={prefix ? "pl-7" : ""}
          value={value} onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">📊 Tägliche KPI-Erfassung</CardTitle>
        <CardDescription>
          Erfasse deine heutigen Zahlen – alle Kennzahlen werden automatisch berechnet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="entry_date" className="text-xs font-medium">Datum</Label>
            <Input id="entry_date" type="date" max={new Date().toISOString().split("T")[0]}
              value={formData.entry_date} onChange={(e) => set("entry_date", e.target.value)} required />
          </div>

          {/* LinkedIn Content */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">🔗 LinkedIn Content</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="post_url" className="text-xs font-medium">Post-URL (optional)</Label>
                <Input id="post_url" type="url" placeholder="https://linkedin.com/posts/..."
                  value={formData.post_url} onChange={(e) => set("post_url", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Posttyp</Label>
                <Select value={formData.post_type} onValueChange={(v) => set("post_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">🎯 Lead-Post</SelectItem>
                    <SelectItem value="content">📝 Content-Post</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Marketing Metrics */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              📈 Marketing & LinkedIn
              <span className="text-xs font-normal text-muted-foreground">(kumulativer Stand – Tageszuwachs wird berechnet)</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <NumField id="impressions" label="Impressionen" value={formData.impressions}
                onChange={(v) => setNum("impressions", v)} info="Aktueller Gesamtstand deines Posts" />
              <NumField id="likes" label="Likes" value={formData.likes}
                onChange={(v) => setNum("likes", v)} />
              <NumField id="comments" label="Kommentare" value={formData.comments}
                onChange={(v) => setNum("comments", v)} />
              <NumField id="link_clicks" label="Link-Klicks" value={formData.link_clicks}
                onChange={(v) => setNum("link_clicks", v)} info="Tägliche Link-Klicks" />
              <NumField id="dms_sent" label="DMs rausgesendet" value={formData.dms_sent}
                onChange={(v) => setNum("dms_sent", v)} info="Anzahl versendeter Direktnachrichten" />
              <NumField id="followers_current" label="Follower (aktuell)" value={formData.followers_current}
                onChange={(v) => setNum("followers_current", v)}
                info={lastEntry ? `Gestern: ${lastEntry.followers_current || 0}` : undefined} />
              <NumField id="words_spoken" label="Geführte Worte" value={formData.words_spoken}
                onChange={(v) => setNum("words_spoken", v)} />
            </div>
          </div>

          {/* Lead Generation */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">🎯 Lead-Generierung</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <NumField id="leads_total" label="Leads generiert" value={formData.leads_total}
                onChange={(v) => setNum("leads_total", v)} />
              <NumField id="leads_qualified" label="Marketing Qualified Leads" value={formData.leads_qualified}
                onChange={(v) => {
                  const val = parseInt(v) || 0;
                  set("leads_qualified", Math.min(val, formData.leads_total));
                }}
                info="MQL = Telefonnummer vorhanden & kein Mitbewerber" />
            </div>
            {formData.leads_total > 0 && (
              <div className="flex gap-4 text-xs text-muted-foreground bg-muted/30 rounded px-3 py-2">
                <span>MQL-Quote: <strong className="text-foreground">{leadQualityRate}%</strong></span>
              </div>
            )}
          </div>

          {/* Sales – Setting */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">📞 Sales – Setting</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <NumField id="calls_made" label="Anwahlen gemacht" value={formData.calls_made}
                onChange={(v) => setNum("calls_made", v)} />
              <NumField id="calls_reached" label="Erreicht" value={formData.calls_reached}
                onChange={(v) => setNum("calls_reached", v)} />
              <NumField id="calls_interested" label="Interessiert" value={formData.calls_interested}
                onChange={(v) => setNum("calls_interested", v)} />
              <NumField id="appointments" label="Termine gelegt" value={formData.appointments}
                onChange={(v) => setNum("appointments", v)} />
              <NumField id="settings_planned" label="Settings geplant" value={formData.settings_planned}
                onChange={(v) => setNum("settings_planned", v)} />
              <NumField id="settings_held" label="Settings stattgefunden" value={formData.settings_held}
                onChange={(v) => {
                  const val = parseInt(v) || 0;
                  set("settings_held", Math.min(val, formData.settings_planned));
                }} />
            </div>
            {formData.settings_planned > 0 && (
              <div className="flex gap-4 text-xs text-muted-foreground bg-muted/30 rounded px-3 py-2">
                <span>Erreichungsquote: <strong className="text-foreground">{reachRate}%</strong></span>
                <span>Interesse-Rate: <strong className="text-foreground">{interestRate}%</strong></span>
                <span>Setting Show-Rate: <strong className="text-foreground">{settingShowRate}%</strong></span>
              </div>
            )}
          </div>

          {/* Sales – Closing */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">🤝 Sales – Closing</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <NumField id="closings_planned" label="Closings geplant" value={formData.closings_planned}
                onChange={(v) => setNum("closings_planned", v)} />
              <NumField id="closings_held" label="Closings stattgefunden" value={formData.closings_held}
                onChange={(v) => {
                  const val = parseInt(v) || 0;
                  set("closings_held", Math.min(val, formData.closings_planned));
                }} />
              <NumField id="deals" label="Deals abgeschlossen" value={formData.deals}
                onChange={(v) => setNum("deals", v)} />
              <NumField id="cash_collected" label="Cash Collected" value={formData.cash_collected}
                onChange={(v) => setNum("cash_collected", v, true)} decimal prefix="€" />
              <NumField id="deal_volume" label="Auftragsvolumen" value={formData.deal_volume}
                onChange={(v) => setNum("deal_volume", v, true)} decimal prefix="€" />
            </div>
            {formData.closings_planned > 0 && (
              <div className="flex gap-4 text-xs text-muted-foreground bg-muted/30 rounded px-3 py-2">
                <span>Closing Show-Rate: <strong className="text-foreground">{closingShowRate}%</strong></span>
                <span>Closing-Rate: <strong className="text-foreground">{closingRate}%</strong></span>
              </div>
            )}
          </div>

          {/* Finance */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">💰 Finanzen</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <NumField id="cash_collected" label="Cash Collected" value={formData.cash_collected}
                onChange={(v) => setNum("cash_collected", v, true)} decimal prefix="€" />
              <NumField id="deal_volume" label="Abschlussvolumen" value={formData.deal_volume}
                onChange={(v) => setNum("deal_volume", v, true)} decimal prefix="€" />
              <NumField id="monthly_retainer" label="Monatlicher Retainer" value={formData.monthly_retainer}
                onChange={(v) => setNum("monthly_retainer", v, true)} decimal prefix="€"
                info="Wird für Kosten-pro-Lead Berechnung verwendet" />
            </div>
          </div>

          {/* Calculated KPIs */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Berechnete Kennzahlen (live)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { label: "MQL-Quote", value: leadQualityRate, suffix: "%" },
                { label: "Erreichungsquote", value: reachRate, suffix: "%" },
                { label: "Interesse-Rate", value: interestRate, suffix: "%" },
                { label: "Setting Show-Rate", value: settingShowRate, suffix: "%" },
                { label: "Closing Show-Rate", value: closingShowRate, suffix: "%" },
                { label: "Closing-Rate", value: closingRate, suffix: "%" },
                { label: "Umsatz/Lead", value: revenuePerLead, suffix: " €" },
                { label: "Kosten/Lead", value: costPerLead, suffix: " €" },
              ].map(kpi => (
                <div key={kpi.label} className="bg-background rounded-md p-3 text-center">
                  <div className="text-xs text-muted-foreground">{kpi.label}</div>
                  <div className="text-lg font-bold text-primary">
                    {kpi.value === "–" ? "–" : `${kpi.value}${kpi.suffix}`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Wird gespeichert..." : "KPIs speichern"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
