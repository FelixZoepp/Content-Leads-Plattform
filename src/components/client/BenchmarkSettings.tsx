import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Settings2, Save, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  tenantId: string;
}

const DEFAULT_BENCHMARKS = [
  { metric_key: "impressions", metric_label: "Impressionen", tier1_max: 500, tier2_max: 2000, unit: "number" },
  { metric_key: "leads_total", metric_label: "Leads gesamt", tier1_max: 2, tier2_max: 5, unit: "number" },
  { metric_key: "leads_qualified", metric_label: "MQL", tier1_max: 1, tier2_max: 3, unit: "number" },
  { metric_key: "lead_quality_rate", metric_label: "MQL-Quote", tier1_max: 30, tier2_max: 60, unit: "percent" },
  { metric_key: "calls_made", metric_label: "Anwahlen", tier1_max: 10, tier2_max: 25, unit: "number" },
  { metric_key: "calls_reached", metric_label: "Erreicht", tier1_max: 3, tier2_max: 8, unit: "number" },
  { metric_key: "appointments", metric_label: "Termine", tier1_max: 1, tier2_max: 3, unit: "number" },
  { metric_key: "setting_show_rate", metric_label: "Setting Show-Rate", tier1_max: 50, tier2_max: 75, unit: "percent" },
  { metric_key: "closing_show_rate", metric_label: "Closing Show-Rate", tier1_max: 50, tier2_max: 75, unit: "percent" },
  { metric_key: "closing_rate", metric_label: "Closing-Rate", tier1_max: 15, tier2_max: 30, unit: "percent" },
  { metric_key: "deals", metric_label: "Deals", tier1_max: 0, tier2_max: 2, unit: "number" },
  { metric_key: "cash_collected", metric_label: "Cash Collected", tier1_max: 1000, tier2_max: 5000, unit: "currency" },
];

export function BenchmarkSettings({ tenantId }: Props) {
  const { toast } = useToast();
  const [benchmarks, setBenchmarks] = useState<typeof DEFAULT_BENCHMARKS>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadBenchmarks(); }, [tenantId]);

  const loadBenchmarks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("benchmarks")
      .select("*")
      .eq("tenant_id", tenantId);

    if (data && data.length > 0) {
      setBenchmarks(data.map(d => ({
        metric_key: d.metric_key,
        metric_label: d.metric_label,
        tier1_max: Number(d.tier1_max),
        tier2_max: Number(d.tier2_max),
        unit: d.unit || "number",
      })));
    } else {
      setBenchmarks([...DEFAULT_BENCHMARKS]);
    }
    setLoading(false);
  };

  const update = (idx: number, field: "tier1_max" | "tier2_max", value: string) => {
    setBenchmarks(prev => prev.map((b, i) =>
      i === idx ? { ...b, [field]: parseFloat(value) || 0 } : b
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const b of benchmarks) {
        await supabase.from("benchmarks").upsert({
          tenant_id: tenantId,
          metric_key: b.metric_key,
          metric_label: b.metric_label,
          tier1_max: b.tier1_max,
          tier2_max: b.tier2_max,
          unit: b.unit,
        } as any, { onConflict: "tenant_id,metric_key" });
      }
      toast({ title: "Benchmarks gespeichert ✓" });
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="h-5 w-5 text-primary" />
          Benchmark-Einstellungen
        </CardTitle>
        <CardDescription>
          Definiere für jede Kennzahl 3 Stufen. Die KI klassifiziert deine Ergebnisse automatisch.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Legend */}
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5 text-destructive" /> Stufe 1: Unter Benchmark</span>
          <span className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-warning" /> Stufe 2: Im Rahmen</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Stufe 3: Über Benchmark</span>
        </div>

        <div className="space-y-2">
          {benchmarks.map((b, i) => (
            <motion.div
              key={b.metric_key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="grid grid-cols-[1fr_auto_auto] gap-3 items-center py-2 border-b border-border/30 last:border-0"
            >
              <Label className="text-sm font-medium">
                {b.metric_label}
                <span className="text-xs text-muted-foreground ml-1">
                  ({b.unit === "percent" ? "%" : b.unit === "currency" ? "€" : "#"})
                </span>
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-destructive" />
                  <Input
                    type="number" min="0" step={b.unit === "percent" ? "1" : "1"}
                    className="w-20 h-8 text-xs"
                    value={b.tier1_max}
                    onChange={(e) => update(i, "tier1_max", e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-warning" />
                  <Input
                    type="number" min="0" step={b.unit === "percent" ? "1" : "1"}
                    className="w-20 h-8 text-xs"
                    value={b.tier2_max}
                    onChange={(e) => update(i, "tier2_max", e.target.value)}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <Button onClick={handleSave} disabled={saving} className="rounded-xl w-full">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Wird gespeichert..." : "Benchmarks speichern"}
        </Button>
      </CardContent>
    </Card>
  );
}
