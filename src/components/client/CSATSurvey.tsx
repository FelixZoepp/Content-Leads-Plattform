import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, CheckCircle, Clock } from "lucide-react";

interface Props {
  tenantId: string;
}

const INTERVAL_DAYS = 14;

export function CSATSurvey({ tenantId }: Props) {
  const { toast } = useToast();
  const [csat, setCSAT] = useState<number | null>(null);
  const [nps, setNPS] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    loadLastResponse();
  }, [tenantId]);

  const loadLastResponse = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("csat_responses")
      .select("created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLastResponse(data?.created_at || null);
    setLoading(false);
  };

  const daysSinceLast = lastResponse
    ? Math.floor((Date.now() - new Date(lastResponse).getTime()) / 86400000)
    : null;

  const isDue = daysSinceLast === null || daysSinceLast >= INTERVAL_DAYS;
  const daysUntilNext = daysSinceLast !== null ? Math.max(0, INTERVAL_DAYS - daysSinceLast) : 0;

  const handleSubmit = async () => {
    if (!csat || nps === null) {
      toast({ title: "Fehlende Angaben", description: "Bitte bewerte sowohl CSAT als auch NPS", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("csat_responses").insert({
        tenant_id: tenantId,
        csat_1_5: csat,
        nps_0_10: nps,
        comment: comment || null,
      });
      if (error) throw error;

      toast({ title: "Feedback gespeichert", description: "Vielen Dank für deine Rückmeldung!" });
      setCSAT(null);
      setNPS(null);
      setComment("");
      setJustSubmitted(true);
      loadLastResponse();
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (loading) return null;

  // Not due yet — show status only
  if (!isDue || justSubmitted) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <CardTitle className="text-base">Feedback abgegeben ✓</CardTitle>
              <CardDescription>
                {justSubmitted
                  ? "Danke für dein Feedback! Das nächste Feedback ist in 14 Tagen fällig."
                  : `Nächstes Feedback in ${daysUntilNext} Tagen fällig`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // Due — show prominent survey
  return (
    <Card className="glass-card border-2 border-primary/40 glow-primary">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 animate-pulse">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">
              {daysSinceLast === null ? "Erstes Feedback abgeben" : "Feedback fällig!"}
            </CardTitle>
            <CardDescription>
              {daysSinceLast === null
                ? "Dein erstes Zufriedenheits-Feedback – dauert nur 30 Sekunden"
                : `Letztes Feedback vor ${daysSinceLast} Tagen – bitte gib dein 2-Wochen-Update ab`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-sm text-foreground/80">CSAT: Wie zufrieden bist du mit ContentLeads? (1-5)</Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(value => (
              <Button
                key={value}
                variant={csat === value ? "default" : "outline"}
                onClick={() => setCSAT(value)}
                className="w-12 rounded-xl"
              >
                {value}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-foreground/80">NPS: Würdest du ContentLeads weiterempfehlen? (0-10)</Label>
          <div className="flex gap-2 flex-wrap">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
              <Button
                key={value}
                variant={nps === value ? "default" : "outline"}
                onClick={() => setNPS(value)}
                className="w-10 rounded-xl"
                size="sm"
              >
                {value}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-foreground/80">Kommentar (optional)</Label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Was läuft gut? Was können wir verbessern?"
            rows={3}
            className="bg-secondary/40 border-border/50 rounded-xl"
          />
        </div>

        <Button onClick={handleSubmit} disabled={submitting} className="rounded-xl glow-primary">
          {submitting ? "Wird gesendet..." : "Feedback absenden"}
        </Button>
      </CardContent>
    </Card>
  );
}
