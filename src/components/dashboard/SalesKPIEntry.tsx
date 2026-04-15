import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, TrendingUp, Phone, Target, Handshake, MessageSquare, Mail } from "lucide-react";

interface Props {
  tenantId: string;
  onEntryAdded: () => void;
}

const defaultSales = {
  entry_date: new Date().toISOString().split("T")[0],
  calls_made: "",
  calls_reached: "",
  calls_interested: "",
  appointments: "",
  settings_planned: "",
  settings_held: "",
  closings_planned: "",
  closings_held: "",
  deals: "",
  cash_collected: "",
  deal_volume: "",
  
  dms_sent: "",
  dms_replies: "",
  words_spoken: "",
  cold_emails_sent: "",
  cold_emails_replies: "",
};

export function SalesKPIEntry({ tenantId, onEntryAdded }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(defaultSales);
  const [existingId, setExistingId] = useState<number | null>(null);

  useEffect(() => { loadExisting(form.entry_date); }, [tenantId]);

  const loadExisting = async (date: string) => {
    const { data } = await supabase
      .from("metrics_snapshot")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("period_date", date)
      .maybeSingle();

    if (data) {
      setExistingId(data.id);
      setForm(prev => ({
        ...prev,
        calls_made: data.calls_made ? String(data.calls_made) : "",
        calls_reached: data.calls_reached ? String(data.calls_reached) : "",
        calls_interested: data.calls_interested ? String(data.calls_interested) : "",
        appointments: data.appointments ? String(data.appointments) : "",
        settings_planned: data.settings_planned ? String(data.settings_planned) : "",
        settings_held: data.settings_held ? String(data.settings_held) : "",
        closings_planned: data.closings_planned ? String(data.closings_planned) : "",
        closings_held: data.closings_held ? String(data.closings_held) : "",
        deals: data.deals ? String(data.deals) : "",
        cash_collected: data.cash_collected ? String(data.cash_collected) : "",
        deal_volume: data.deal_volume ? String(data.deal_volume) : "",
        
        dms_sent: data.dms_sent ? String(data.dms_sent) : "",
        dms_replies: (data as any).dms_replies ? String((data as any).dms_replies) : "",
        words_spoken: data.words_spoken ? String(data.words_spoken) : "",
        cold_emails_sent: (data as any).cold_emails_sent ? String((data as any).cold_emails_sent) : "",
        cold_emails_replies: (data as any).cold_emails_replies ? String((data as any).cold_emails_replies) : "",
      }));
    } else {
      setExistingId(null);
      setForm(prev => ({ ...defaultSales, entry_date: prev.entry_date }));
    }
  };

  const n = (field: string, raw: string) =>
    setForm(prev => ({ ...prev, [field]: raw }));

  const num = (v: string) => parseFloat(v) || 0;

  // Live calculations
  const reachRate = num(form.calls_made) > 0 ? ((num(form.calls_reached) / num(form.calls_made)) * 100).toFixed(1) : "–";
  const interestRate = num(form.calls_reached) > 0 ? ((num(form.calls_interested) / num(form.calls_reached)) * 100).toFixed(1) : "–";
  const settingShowRate = num(form.settings_planned) > 0 ? ((num(form.settings_held) / num(form.settings_planned)) * 100).toFixed(1) : "–";
  const closingShowRate = num(form.closings_planned) > 0 ? ((num(form.closings_held) / num(form.closings_planned)) * 100).toFixed(1) : "–";
  const closingRate = num(form.closings_held) > 0 ? ((num(form.deals) / num(form.closings_held)) * 100).toFixed(1) : "–";
  const dmReplyRate = num(form.dms_sent) > 0 ? ((num(form.dms_replies) / num(form.dms_sent)) * 100).toFixed(1) : "–";
  const coldEmailReplyRate = num(form.cold_emails_sent) > 0 ? ((num(form.cold_emails_replies) / num(form.cold_emails_sent)) * 100).toFixed(1) : "–";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const salesPayload = {
      calls_made: parseInt(form.calls_made) || 0,
      calls_reached: parseInt(form.calls_reached) || 0,
      calls_interested: parseInt(form.calls_interested) || 0,
      appointments: parseInt(form.appointments) || 0,
      settings_planned: parseInt(form.settings_planned) || 0,
      settings_held: parseInt(form.settings_held) || 0,
      closings: parseInt(form.closings_held) || 0,
      closings_planned: parseInt(form.closings_planned) || 0,
      closings_held: parseInt(form.closings_held) || 0,
      deals: parseInt(form.deals) || 0,
      cash_collected: parseFloat(form.cash_collected) || 0,
      revenue: parseFloat(form.cash_collected) || 0,
      deal_volume: parseFloat(form.deal_volume) || 0,
      
      dms_sent: parseInt(form.dms_sent) || 0,
      dms_replies: parseInt(form.dms_replies) || 0,
      words_spoken: parseInt(form.words_spoken) || 0,
      cold_emails_sent: parseInt(form.cold_emails_sent) || 0,
      cold_emails_replies: parseInt(form.cold_emails_replies) || 0,
    };

    let error;
    if (existingId) {
      ({ error } = await supabase
        .from("metrics_snapshot")
        .update(salesPayload)
        .eq("id", existingId));
    } else {
      ({ error } = await supabase
        .from("metrics_snapshot")
        .insert({
          tenant_id: tenantId,
          period_date: form.entry_date,
          period_type: "daily",
          ...salesPayload,
        }));
    }

    setLoading(false);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Gespeichert ✓", description: `Sales-KPIs für ${new Date(form.entry_date).toLocaleDateString("de-DE")} gespeichert` });
      onEntryAdded();
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          Tägliche Sales-KPIs
        </CardTitle>
        <CardDescription>Erfasse alle Aktivitäten aus Cold Calling, Outreach, Setting und Closing für heute.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datum */}
          <div className="space-y-1.5 max-w-[200px]">
            <Label className="text-xs font-medium">Datum</Label>
            <Input type="date" max={new Date().toISOString().split("T")[0]}
              value={form.entry_date}
              onChange={e => { setForm(p => ({ ...p, entry_date: e.target.value })); loadExisting(e.target.value); }} />
          </div>

          {/* Cold Calling */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              <Phone className="h-4 w-4" /> Cold Calling – Anwahlen
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field id="calls_made" label="Anwahlen gemacht" value={form.calls_made} onChange={v => n("calls_made", v)} />
              <Field id="calls_reached" label="Entscheider Erreicht" value={form.calls_reached} onChange={v => n("calls_reached", v)} />
              <Field id="calls_interested" label="Gatekeeper Erreicht" value={form.calls_interested} onChange={v => n("calls_interested", v)} />
              <Field id="appointments" label="Termine gelegt" value={form.appointments} onChange={v => n("appointments", v)} />
              <Field id="words_spoken" label="Gesprächszeit (Min.)" value={form.words_spoken} onChange={v => n("words_spoken", v)} />
            </div>
            {num(form.calls_made) > 0 && (
              <div className="flex flex-wrap gap-4 text-xs bg-muted/40 rounded-lg px-3 py-2 text-muted-foreground">
                <span>Erreichungsquote: <strong className="text-foreground">{reachRate}%</strong></span>
                <span>Interesse-Rate: <strong className="text-foreground">{interestRate}%</strong></span>
              </div>
            )}
          </section>

          {/* Outreach – DMs */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Outreach – DMs & Nachrichten
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field id="dms_sent" label="DMs versendet" value={form.dms_sent} onChange={v => n("dms_sent", v)} />
              <Field id="dms_replies" label="Antworten erhalten" value={form.dms_replies} onChange={v => n("dms_replies", v)} />
            </div>
            {num(form.dms_sent) > 0 && (
              <div className="flex flex-wrap gap-4 text-xs bg-muted/40 rounded-lg px-3 py-2 text-muted-foreground">
                <span>Antwort-Quote: <strong className="text-foreground">{dmReplyRate}%</strong></span>
              </div>
            )}
          </section>

          {/* Cold Mail Outreach (optional) */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              <Mail className="h-4 w-4" /> Cold Mail Outreach <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field id="cold_emails_sent" label="Cold Mails versendet" value={form.cold_emails_sent} onChange={v => n("cold_emails_sent", v)} />
              <Field id="cold_emails_replies" label="Antworten erhalten" value={form.cold_emails_replies} onChange={v => n("cold_emails_replies", v)} />
            </div>
            {num(form.cold_emails_sent) > 0 && (
              <div className="flex flex-wrap gap-4 text-xs bg-muted/40 rounded-lg px-3 py-2 text-muted-foreground">
                <span>Antwort-Quote: <strong className="text-foreground">{coldEmailReplyRate}%</strong></span>
              </div>
            )}
          </section>
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              <Target className="h-4 w-4" /> Opening – Terminierung
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field id="settings_planned" label="Settings geplant heute" value={form.settings_planned} onChange={v => n("settings_planned", v)} />
              <Field id="settings_held" label="Settings stattgefunden heute" value={form.settings_held}
                onChange={v => n("settings_held", v)} />
            </div>
            {num(form.settings_planned) > 0 && (
              <div className="flex flex-wrap gap-4 text-xs bg-muted/40 rounded-lg px-3 py-2 text-muted-foreground">
                <span>Setting Show-Rate: <strong className="text-foreground">{settingShowRate}%</strong></span>
              </div>
            )}
          </section>

          {/* Closing */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              <Handshake className="h-4 w-4" /> Closing – Abschlüsse
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field id="closings_planned" label="Closings geplant" value={form.closings_planned} onChange={v => n("closings_planned", v)} />
              <Field id="closings_held" label="Closings stattgefunden" value={form.closings_held}
                onChange={v => n("closings_held", v)} />
              <Field id="deals" label="Deals abgeschlossen" value={form.deals} onChange={v => n("deals", v)} />
              <Field id="cash_collected" label="Cash Collected" value={form.cash_collected}
                onChange={v => n("cash_collected", v)} decimal prefix="€" />
              <Field id="deal_volume" label="Auftragsvolumen" value={form.deal_volume}
                onChange={v => n("deal_volume", v)} decimal prefix="€" />
            </div>
            {num(form.closings_planned) > 0 && (
              <div className="flex flex-wrap gap-4 text-xs bg-muted/40 rounded-lg px-3 py-2 text-muted-foreground">
                <span>Closing Show-Rate: <strong className="text-foreground">{closingShowRate}%</strong></span>
                <span>Closing-Rate: <strong className="text-foreground">{closingRate}%</strong></span>
              </div>
            )}
          </section>

          {/* Live Calc */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> Berechnete Kennzahlen (live)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Erreichungsquote", value: reachRate, suffix: "%" },
                { label: "Interesse-Rate", value: interestRate, suffix: "%" },
                { label: "DM-Antwort-Quote", value: dmReplyRate, suffix: "%" },
                { label: "Cold Mail Reply", value: coldEmailReplyRate, suffix: "%" },
                { label: "Setting Show-Rate", value: settingShowRate, suffix: "%" },
                { label: "Closing Show-Rate", value: closingShowRate, suffix: "%" },
                { label: "Closing-Rate", value: closingRate, suffix: "%" },
              ].map(k => (
                <div key={k.label} className="bg-background rounded-md p-3 text-center">
                  <div className="text-xs text-muted-foreground">{k.label}</div>
                  <div className="text-lg font-bold text-primary">{k.value === "–" ? "–" : `${k.value}${k.suffix}`}</div>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Wird gespeichert..." : existingId ? "Sales-KPIs aktualisieren" : "Sales-KPIs speichern"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ id, label, value, onChange, decimal, prefix }: {
  id: string; label: string; value: string; onChange: (v: string) => void; decimal?: boolean; prefix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium">{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{prefix}</span>}
        <Input id={id} type="number" min="0" step={decimal ? "0.01" : "1"}
          inputMode={decimal ? "decimal" : "numeric"}
          className={prefix ? "pl-7" : ""}
          value={value} onChange={e => onChange(e.target.value)} />
      </div>
    </div>
  );
}
