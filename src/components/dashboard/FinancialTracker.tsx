import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Edit2, TrendingUp, TrendingDown, ArrowRight, ArrowLeft } from "lucide-react";

interface Props {
  tenantId: string;
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  return mon;
}

function weekLabel(mondayStr: string): string {
  const mon = new Date(mondayStr);
  const sun = new Date(mondayStr);
  sun.setDate(sun.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  return `KW ${getKW(mon)} · ${fmt(mon)}–${fmt(sun)} ${sun.getFullYear()}`;
}

function getKW(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function FinancialTracker({ tenantId }: Props) {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [prevData, setPrevData] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentWeek, setCurrentWeek] = useState(
    getMonday(new Date()).toISOString().slice(0, 10)
  );

  const [form, setForm] = useState({
    revenue_recurring: "",
    revenue_onetime: "",
    costs_ads: "",
    costs_tools: "",
    costs_personnel: "",
    costs_other: "",
    invoices_open_count: "",
    invoices_open_amount: "",
    invoices_overdue_count: "",
    invoices_overdue_amount: "",
    notes: "",
  });

  useEffect(() => { loadData(); }, [tenantId, currentWeek]);

  const loadData = async () => {
    setLoading(true);
    const { data: row } = await supabase
      .from("financial_tracking")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("period_month", currentWeek)
      .maybeSingle();

    const prevMon = new Date(currentWeek);
    prevMon.setDate(prevMon.getDate() - 7);
    const prevStr = prevMon.toISOString().slice(0, 10);
    const { data: prev } = await supabase
      .from("financial_tracking")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("period_month", prevStr)
      .maybeSingle();
    setPrevData(prev);

    if (row) {
      setData(row);
      setForm({
        revenue_recurring: row.revenue_recurring ? String(row.revenue_recurring) : "",
        revenue_onetime: row.revenue_onetime ? String(row.revenue_onetime) : "",
        costs_ads: row.costs_ads ? String(row.costs_ads) : "",
        costs_tools: row.costs_tools ? String(row.costs_tools) : "",
        costs_personnel: row.costs_personnel ? String(row.costs_personnel) : "",
        costs_other: row.costs_other ? String(row.costs_other) : "",
        invoices_open_count: row.invoices_open_count ? String(row.invoices_open_count) : "",
        invoices_open_amount: row.invoices_open_amount ? String(row.invoices_open_amount) : "",
        invoices_overdue_count: row.invoices_overdue_count ? String(row.invoices_overdue_count) : "",
        invoices_overdue_amount: row.invoices_overdue_amount ? String(row.invoices_overdue_amount) : "",
        notes: row.notes || "",
      });
    } else {
      setData(null);
      setForm({
        revenue_recurring: "", revenue_onetime: "",
        costs_ads: "", costs_tools: "", costs_personnel: "", costs_other: "",
        invoices_open_count: "", invoices_open_amount: "",
        invoices_overdue_count: "", invoices_overdue_amount: "",
        notes: "",
      });
    }
    setLoading(false);
  };

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));
  const num = (v: string) => parseFloat(v) || 0;

  // Cash Collected = recurring + onetime (auto-calculated)
  const cashCollected = num(form.revenue_recurring) + num(form.revenue_onetime);
  const totalCosts = num(form.costs_ads) + num(form.costs_tools) + num(form.costs_personnel) + num(form.costs_other);
  const cashflow = cashCollected - totalCosts;
  const margin = cashCollected > 0 ? ((cashflow / cashCollected) * 100).toFixed(1) : "–";

  const prevCashflow = prevData
    ? ((parseFloat(prevData.revenue_recurring) || 0) + (parseFloat(prevData.revenue_onetime) || 0)) -
      ((parseFloat(prevData.costs_ads) || 0) + (parseFloat(prevData.costs_tools) || 0) +
       (parseFloat(prevData.costs_personnel) || 0) + (parseFloat(prevData.costs_other) || 0))
    : null;

  const navigateWeek = (dir: number) => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() + dir * 7);
    setCurrentWeek(d.toISOString().slice(0, 10));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload: any = {
      tenant_id: tenantId,
      period_month: currentWeek,
      cash_collected: cashCollected,
      revenue_recurring: num(form.revenue_recurring),
      revenue_onetime: num(form.revenue_onetime),
      costs_ads: num(form.costs_ads),
      costs_tools: num(form.costs_tools),
      costs_personnel: num(form.costs_personnel),
      costs_other: num(form.costs_other),
      invoices_open_count: parseInt(form.invoices_open_count) || 0,
      invoices_open_amount: num(form.invoices_open_amount),
      invoices_overdue_count: parseInt(form.invoices_overdue_count) || 0,
      invoices_overdue_amount: num(form.invoices_overdue_amount),
      avg_days_to_payment: 0,
      notes: form.notes,
    };

    const { error } = data
      ? await supabase.from("financial_tracking").update(payload).eq("id", data.id)
      : await supabase.from("financial_tracking").insert(payload);

    setSaving(false);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Gespeichert ✓", description: `Finanzen für ${weekLabel(currentWeek)} gespeichert` });
      setEditing(false);
      loadData();
    }
  };

  if (loading) return null;

  // Summary view
  if (!editing && data) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">💰 Finanzen</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateWeek(-1)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[160px] text-center">{weekLabel(currentWeek)}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateWeek(1)}>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit2 className="h-3.5 w-3.5 mr-1" /> Bearbeiten
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <KPICard label="Cash Collected" value={`${cashCollected.toLocaleString("de-DE")}€`} />
            <KPICard label="Wiederkehrend" value={`${num(form.revenue_recurring).toLocaleString("de-DE")}€`} />
            <KPICard label="Einmalig" value={`${num(form.revenue_onetime).toLocaleString("de-DE")}€`} />
            <KPICard label="Gesamtkosten" value={`${totalCosts.toLocaleString("de-DE")}€`} />
            <KPICard label="Cashflow" value={`${cashflow.toLocaleString("de-DE")}€`}
              trend={cashflow >= 0 ? "up" : "down"} />
            <KPICard label="Marge" value={margin === "–" ? "–" : `${margin}%`}
              trend={parseFloat(margin as string) >= 0 ? "up" : "down"} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard label="Ads" value={`${num(form.costs_ads).toLocaleString("de-DE")}€`} small />
            <KPICard label="Tools" value={`${num(form.costs_tools).toLocaleString("de-DE")}€`} small />
            <KPICard label="Personal" value={`${num(form.costs_personnel).toLocaleString("de-DE")}€`} small />
            <KPICard label="Sonstige" value={`${num(form.costs_other).toLocaleString("de-DE")}€`} small />
          </div>

          {/* Außenstände */}
          <div className="flex flex-wrap gap-3">
            {parseInt(form.invoices_open_count) > 0 && (
              <Badge variant="outline">
                {form.invoices_open_count} offene Kundenrechnungen ({num(form.invoices_open_amount).toLocaleString("de-DE")}€ Außenstand)
              </Badge>
            )}
            {parseInt(form.invoices_overdue_count) > 0 && (
              <Badge variant="outline" className="border-destructive/50 text-destructive">
                {form.invoices_overdue_count} überfällig ({num(form.invoices_overdue_amount).toLocaleString("de-DE")}€)
              </Badge>
            )}
          </div>

          {prevCashflow !== null && (
            <div className="text-xs text-muted-foreground bg-muted/30 rounded px-3 py-2">
              Vorwoche Cashflow: <strong className="text-foreground">{prevCashflow.toLocaleString("de-DE")}€</strong>
              {" → "}
              <span className={cashflow > prevCashflow ? "text-green-600" : cashflow < prevCashflow ? "text-destructive" : ""}>
                {cashflow > prevCashflow ? "↑" : cashflow < prevCashflow ? "↓" : "="} {Math.abs(cashflow - prevCashflow).toLocaleString("de-DE")}€
              </span>
            </div>
          )}

          {form.notes && (
            <p className="text-sm text-muted-foreground bg-muted/30 rounded p-3">{form.notes}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Edit/Create form
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">💰 Finanzen – {weekLabel(currentWeek)}</CardTitle>
            <CardDescription>Wöchentliche Einnahmen, Kosten und Außenstände</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateWeek(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateWeek(1)}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Revenue */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-primary">📥 Einnahmen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <NumField id="revenue_recurring" label="Wiederkehrende Einnahmen (MRR)" value={form.revenue_recurring}
                onChange={(v) => set("revenue_recurring", v)} prefix="€" />
              <NumField id="revenue_onetime" label="Einmalige Einnahmen" value={form.revenue_onetime}
                onChange={(v) => set("revenue_onetime", v)} prefix="€" />
            </div>
            <div className="text-xs bg-muted/40 rounded-lg px-3 py-2 text-muted-foreground">
              Cash Collected (Summe): <strong className="text-foreground">{cashCollected.toLocaleString("de-DE")}€</strong>
            </div>
          </div>

          {/* Costs */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-primary">📤 Kosten</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <NumField id="costs_ads" label="Werbung / Ads" value={form.costs_ads}
                onChange={(v) => set("costs_ads", v)} prefix="€" />
              <NumField id="costs_tools" label="Tools / Software" value={form.costs_tools}
                onChange={(v) => set("costs_tools", v)} prefix="€" />
              <NumField id="costs_personnel" label="Personal" value={form.costs_personnel}
                onChange={(v) => set("costs_personnel", v)} prefix="€" />
              <NumField id="costs_other" label="Sonstiges" value={form.costs_other}
                onChange={(v) => set("costs_other", v)} prefix="€" />
            </div>
          </div>

          {/* Außenstände */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-primary">🧾 Außenstände (Kundenrechnungen)</h3>
            <p className="text-xs text-muted-foreground -mt-1">Wie viel steht bei deinen Kunden noch offen?</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <NumField id="invoices_open_count" label="Offene Rechnungen (Anzahl)" value={form.invoices_open_count}
                onChange={(v) => set("invoices_open_count", v)} />
              <NumField id="invoices_open_amount" label="Offener Gesamtbetrag" value={form.invoices_open_amount}
                onChange={(v) => set("invoices_open_amount", v)} prefix="€" />
              <NumField id="invoices_overdue_count" label="Überfällige Rechnungen" value={form.invoices_overdue_count}
                onChange={(v) => set("invoices_overdue_count", v)} />
              <NumField id="invoices_overdue_amount" label="Überfälliger Betrag" value={form.invoices_overdue_amount}
                onChange={(v) => set("invoices_overdue_amount", v)} prefix="€" />
            </div>
          </div>

          {/* Live Cashflow */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              {cashflow >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              Berechnete Kennzahlen (live)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-background rounded-md p-3 text-center">
                <div className="text-xs text-muted-foreground">Cash Collected</div>
                <div className="text-lg font-bold text-primary">{cashCollected.toLocaleString("de-DE")}€</div>
              </div>
              <div className="bg-background rounded-md p-3 text-center">
                <div className="text-xs text-muted-foreground">Gesamtkosten</div>
                <div className="text-lg font-bold text-primary">{totalCosts.toLocaleString("de-DE")}€</div>
              </div>
              <div className="bg-background rounded-md p-3 text-center">
                <div className="text-xs text-muted-foreground">Cashflow</div>
                <div className={`text-lg font-bold ${cashflow >= 0 ? "text-green-600" : "text-destructive"}`}>
                  {cashflow.toLocaleString("de-DE")}€
                </div>
              </div>
              <div className="bg-background rounded-md p-3 text-center">
                <div className="text-xs text-muted-foreground">Marge</div>
                <div className={`text-lg font-bold ${parseFloat(margin as string) >= 0 ? "text-green-600" : "text-destructive"}`}>
                  {margin === "–" ? "–" : `${margin}%`}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Notizen</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)}
              placeholder="Besonderheiten, ausstehende Zahlungen..." rows={2} />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Wird gespeichert..." : "Finanzen speichern"}
            </Button>
            {data && (
              <Button variant="outline" onClick={() => setEditing(false)}>Abbrechen</Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NumField({ id, label, value, onChange, prefix }: {
  id: string; label: string; value: string; onChange: (v: string) => void; prefix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium">{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{prefix}</span>}
        <Input id={id} type="number" min="0" step="0.01"
          inputMode="decimal"
          className={prefix ? "pl-7" : ""}
          value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

function KPICard({ label, value, trend, small }: { label: string; value: string; trend?: "up" | "down"; small?: boolean }) {
  return (
    <div className={`bg-muted/50 rounded-lg ${small ? "p-2" : "p-3"} text-center`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-bold ${small ? "text-sm" : "text-lg"} ${
        trend === "up" ? "text-green-600" : trend === "down" ? "text-destructive" : "text-primary"
      }`}>
        {value}
      </div>
    </div>
  );
}
