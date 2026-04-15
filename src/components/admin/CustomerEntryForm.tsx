import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface CustomerEntry {
  name: string;
  industry: string;
  size: number;
  age: number;
  duration: string;
  source: string;
  salesCycleDays: number;
  cltv: number;
  pages: number;
  cohort: "früh" | "aktuell";
  contractStart?: string;
  notes?: string;
}

interface Props {
  onAdd: (entry: CustomerEntry) => void;
}

const SOURCES = ["Cold Call (CC)", "Ads", "Empfehlung", "Andere"];
const DURATIONS = ["1 Monat", "2 Monate", "3 Monate", "4 Monate", "6 Monate", "12 Monate", "16 Monate", "24 Monate"];
const INDUSTRIES = [
  "Handwerk", "Beratung", "Reinigung", "Recruiting", "SaaS / Software",
  "E-Commerce", "Medizin", "Immobilien", "Coaching", "Sonstige"
];

const empty = (): CustomerEntry => ({
  name: "", industry: "", size: 0, age: 0, duration: "1 Monat",
  source: "Cold Call (CC)", salesCycleDays: 0, cltv: 0, pages: 1,
  cohort: "aktuell", contractStart: "", notes: "",
});

export function CustomerEntryForm({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CustomerEntry>(empty());
  const { toast } = useToast();

  const upd = (key: keyof CustomerEntry, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Kundenname erforderlich", variant: "destructive" });
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 300)); // slight delay for UX
    onAdd(form);
    toast({ title: "Kunde hinzugefügt", description: form.name });
    setForm(empty());
    setOpen(false);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Kunde eintragen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neuen Kunden eintragen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Grunddaten */}
          <div className="space-y-1.5">
            <Label>Kundenname *</Label>
            <Input value={form.name} onChange={e => upd("name", e.target.value)} placeholder="Mustermann GmbH" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Branche</Label>
              <Select value={form.industry} onValueChange={v => upd("industry", v)}>
                <SelectTrigger><SelectValue placeholder="Wählen" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Mitarbeiteranzahl</Label>
              <Input type="number" value={form.size || ""} onChange={e => upd("size", parseInt(e.target.value) || 0)} placeholder="5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>LinkedIn-Alter (Monate)</Label>
              <Input type="number" value={form.age || ""} onChange={e => upd("age", parseInt(e.target.value) || 0)} placeholder="12" />
            </div>
            <div className="space-y-1.5">
              <Label>Vertragsbeginn</Label>
              <Input type="date" value={form.contractStart || ""} onChange={e => upd("contractStart", e.target.value)} />
            </div>
          </div>

          {/* Vertrag & Sales */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Laufzeit</Label>
              <Select value={form.duration} onValueChange={v => upd("duration", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Leadquelle</Label>
              <Select value={form.source} onValueChange={v => upd("source", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Sales-Cycle (Tage)</Label>
              <Input type="number" value={form.salesCycleDays || ""} onChange={e => upd("salesCycleDays", parseInt(e.target.value) || 0)} placeholder="7" />
            </div>
            <div className="space-y-1.5">
              <Label>CLTV (€)</Label>
              <Input type="number" value={form.cltv || ""} onChange={e => upd("cltv", parseFloat(e.target.value) || 0)} placeholder="5000" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Gebuchte Seiten</Label>
              <Input type="number" value={form.pages || ""} onChange={e => upd("pages", parseInt(e.target.value) || 0)} placeholder="3" />
            </div>
            <div className="space-y-1.5">
              <Label>Kohorte</Label>
              <Select value={form.cohort} onValueChange={v => upd("cohort", v as "früh" | "aktuell")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktuell">Aktuell (letzte 6 Mo.)</SelectItem>
                  <SelectItem value="früh">Früher</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Speichern
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
