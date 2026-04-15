import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SURVEYS, type SurveyConfig, type SurveyQuestion } from "@/lib/surveyConfig";
import { MessageSquare, CheckCircle, ArrowLeft, ArrowRight, Check, Star, X } from "lucide-react";

interface Props {
  tenantId: string;
  onboardingCompletedAt: string | null; // ISO date string
}

// ─── Scale Question ────────────────────────────────────────
function ScaleInput({ question, value, onChange }: { question: SurveyQuestion; value: number | undefined; onChange: (v: number) => void }) {
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  
  const getVariant = (n: number): "default" | "outline" => value === n ? "default" : "outline";
  const getClass = (n: number) => {
    if (value !== n) return "border-border/50 text-muted-foreground hover:bg-secondary/60";
    if (n <= 3) return "bg-destructive text-destructive-foreground border-destructive";
    if (n <= 5) return "bg-warning text-warning-foreground border-warning";
    if (n <= 7) return "bg-primary text-primary-foreground border-primary";
    return "bg-success text-success-foreground border-success";
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 justify-center flex-wrap">
        {nums.map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`w-10 h-10 rounded-xl border-2 font-bold text-sm transition-all ${getClass(n)}`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between px-1">
        <span className="text-xs text-muted-foreground">{question.lo}</span>
        <span className="text-xs text-muted-foreground">{question.hi}</span>
      </div>
    </div>
  );
}

// ─── Choice Question ───────────────────────────────────────
function ChoiceInput({ question, value, onChange }: { question: SurveyQuestion; value: string | undefined; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {question.opts?.map(o => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left text-sm transition-all ${
            value === o.v
              ? "border-primary bg-primary/10 font-semibold text-foreground"
              : "border-border/50 bg-secondary/20 text-foreground/80 hover:bg-secondary/40"
          }`}
        >
          <span className="text-lg shrink-0">{o.icon || "○"}</span>
          <span>{o.l}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Text Question ─────────────────────────────────────────
function TextInput({ question, value, onChange }: { question: SurveyQuestion; value: string | undefined; onChange: (v: string) => void }) {
  return (
    <Textarea
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={question.ph}
      rows={4}
      className="bg-secondary/30 border-border/50 rounded-xl resize-none"
    />
  );
}

// ─── Review Screen ─────────────────────────────────────────
function ReviewScreen({ onChoice }: { onChoice: (v: string | null) => void }) {
  return (
    <div className="text-center space-y-4 py-4">
      <div className="text-5xl">⭐</div>
      <h3 className="text-lg font-bold text-foreground">Du bist begeistert – das freut uns riesig!</h3>
      <p className="text-sm text-muted-foreground">Hilf anderen mit einer kurzen Bewertung.</p>
      <div className="flex flex-col gap-2">
        <Button variant="outline" className="rounded-xl border-primary/40 text-primary" onClick={() => onChoice("google")}>
          ⭐ Google-Bewertung schreiben
        </Button>
        <Button variant="outline" className="rounded-xl border-accent/40 text-accent-foreground" onClick={() => onChoice("trustpilot")}>
          ⭐ Trustpilot-Bewertung
        </Button>
        <Button variant="outline" className="rounded-xl border-success/40 text-success" onClick={() => onChoice("video")}>
          🎬 Video-Testimonial
        </Button>
        <Button variant="ghost" className="text-muted-foreground text-xs" onClick={() => onChoice(null)}>
          Später
        </Button>
      </div>
    </div>
  );
}

// ─── Survey Modal ──────────────────────────────────────────
function SurveyModal({
  survey,
  tenantId,
  onComplete,
  onDismiss,
}: {
  survey: SurveyConfig;
  tenantId: string;
  onComplete: () => void;
  onDismiss: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const questions = useMemo(() => {
    return survey.questions.filter(q => {
      if (!q.showIf) return true;
      if (q.showIf === "has_scale_signal") {
        return Object.entries(answers).some(([, a]) => {
          if (typeof a !== "string") return false;
          return survey.questions.flatMap(sq => sq.opts || []).some(o => o.v === a && o.tag === "scale_signal");
        });
      }
      return true;
    });
  }, [survey.questions, answers]);

  const cur = questions[step];
  const isLast = step === questions.length - 1;
  const progressPct = ((step + 1) / questions.length) * 100;

  const npsVal = answers.weiterempfehlung || answers.recommendation;
  const isPromoter = typeof npsVal === "number" && npsVal >= 9;

  const canNext = cur
    ? cur.type === "text"
      ? !cur.req || (answers[cur.id] || "").trim().length > 0
      : answers[cur.id] !== undefined
    : true;

  const buildResult = (reviewClicked: string | null = null) => {
    const tags: string[] = [];
    const testimonials: { qId: string; text: string }[] = [];
    let totalScore = 0;
    let scaleCount = 0;
    survey.questions.forEach(q => {
      const a = answers[q.id];
      if (q.type === "scale" && typeof a === "number") { totalScore += a; scaleCount++; }
      if (q.type === "choice" && typeof a === "string") {
        const opt = q.opts?.find(o => o.v === a);
        if (opt?.tag) tags.push(opt.tag);
      }
      if (q.testimonial && a) testimonials.push({ qId: q.id, text: a });
    });
    return {
      survey_id: survey.id,
      tenant_id: tenantId,
      answers,
      tags,
      testimonials,
      nps: typeof npsVal === "number" ? npsVal : null,
      avg_score: scaleCount > 0 ? +(totalScore / scaleCount).toFixed(1) : null,
      total_score: totalScore,
      review_clicked: reviewClicked,
    };
  };

  const submitResult = async (reviewClicked: string | null = null) => {
    setSubmitting(true);
    try {
      const result = buildResult(reviewClicked);
      const { error } = await supabase.from("survey_responses" as any).insert(result);
      if (error) throw error;
      toast({ title: "Danke! 🙌", description: "Dein Feedback wurde gespeichert." });
      onComplete();
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const goNext = () => {
    if (isLast) {
      if (isPromoter && !showReview) { setShowReview(true); return; }
      submitResult();
      return;
    }
    setStep(s => s + 1);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onDismiss(); }}>
      <DialogContent className="max-w-lg rounded-2xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 space-y-3">
          <DialogTitle className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">{survey.title}</h2>
              <p className="text-xs text-muted-foreground font-normal">{survey.sub}</p>
            </div>
          </DialogTitle>
          <div className="space-y-1">
            <Progress value={progressPct} className="h-1.5" />
            <span className="text-[11px] text-muted-foreground">{step + 1} / {questions.length}</span>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          {showReview ? (
            <ReviewScreen onChoice={(v) => submitResult(v)} />
          ) : cur ? (
            <div className="space-y-5">
              <h3 className="text-[15px] font-semibold text-foreground leading-relaxed">{cur.q}</h3>
              {cur.type === "scale" && <ScaleInput question={cur} value={answers[cur.id]} onChange={v => setAnswers(a => ({ ...a, [cur.id]: v }))} />}
              {cur.type === "choice" && <ChoiceInput question={cur} value={answers[cur.id]} onChange={v => setAnswers(a => ({ ...a, [cur.id]: v }))} />}
              {cur.type === "text" && <TextInput question={cur} value={answers[cur.id]} onChange={v => setAnswers(a => ({ ...a, [cur.id]: v }))} />}

              <div className="flex justify-between gap-3 pt-2">
                {step > 0 && (
                  <Button variant="outline" onClick={() => setStep(s => s - 1)} className="rounded-xl gap-1.5">
                    <ArrowLeft className="h-4 w-4" /> Zurück
                  </Button>
                )}
                <Button
                  onClick={goNext}
                  disabled={!canNext || submitting}
                  className="rounded-xl gap-1.5 ml-auto glow-primary"
                >
                  {isLast ? (
                    <><Check className="h-4 w-4" /> Abschließen</>
                  ) : (
                    <>Weiter <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Export ────────────────────────────────────────────
export function SurveyEngine({ tenantId, onboardingCompletedAt }: Props) {
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const loadResponses = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("survey_responses" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });
    setResponses((data as any[]) || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { loadResponses(); }, [loadResponses]);

  const daysSinceOnboarding = useMemo(() => {
    if (!onboardingCompletedAt) return null;
    return Math.floor((Date.now() - new Date(onboardingCompletedAt).getTime()) / 86400000);
  }, [onboardingCompletedAt]);

  const pendingSurvey = useMemo(() => {
    if (daysSinceOnboarding === null) return null;

    // Day 7
    if (daysSinceOnboarding >= 7 && daysSinceOnboarding < 21) {
      if (!responses.find(r => r.survey_id === "day7") && !dismissed.includes("day7")) return SURVEYS.day7;
    }
    // Day 21
    if (daysSinceOnboarding >= 21 && daysSinceOnboarding < 30) {
      if (!responses.find(r => r.survey_id === "day21") && !dismissed.includes("day21")) return SURVEYS.day21;
    }
    // Day 30+ recurring
    if (daysSinceOnboarding >= 30) {
      // Also show day7/day21 if not done
      if (!responses.find(r => r.survey_id === "day7") && !dismissed.includes("day7")) return SURVEYS.day7;
      if (!responses.find(r => r.survey_id === "day21") && !dismissed.includes("day21")) return SURVEYS.day21;

      const recurringCount = responses.filter(r => r.survey_id === "recurring").length;
      const expectedCount = Math.floor((daysSinceOnboarding - 30) / 30) + 1;
      if (recurringCount < expectedCount && !dismissed.includes("recurring_" + expectedCount)) return SURVEYS.recurring;
    }
    return null;
  }, [daysSinceOnboarding, responses, dismissed]);

  const handleDismiss = (surveyId: string) => {
    const recurringCount = responses.filter(r => r.survey_id === "recurring").length;
    const dismissId = surveyId === "recurring" ? "recurring_" + (recurringCount + 1) : surveyId;
    setDismissed(prev => [...prev, dismissId]);
    setShowModal(false);
  };

  if (loading) return null;

  return (
    <>
      {/* Banner */}
      {pendingSurvey && !showModal && (
        <Card className="border-2 border-primary/40 glow-primary overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 animate-pulse shrink-0">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wide">📊 Feedback</p>
                <p className="text-sm font-bold text-foreground">{pendingSurvey.title}</p>
                <p className="text-xs text-muted-foreground">{pendingSurvey.sub}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowModal(true)} className="rounded-xl glow-primary gap-1.5" size="sm">
                Jetzt ausfüllen <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleDismiss(pendingSurvey.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed status */}
      {!pendingSurvey && responses.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle className="text-base">Alle Feedbacks abgegeben ✓</CardTitle>
                <CardDescription>
                  {responses.length} Check-In{responses.length > 1 ? "s" : ""} ausgefüllt
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Past responses list */}
      {responses.length > 0 && (
        <Card className="glass-card mt-4">
          <CardHeader>
            <CardTitle className="text-base">Deine bisherigen Check-Ins</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {responses.map((r: any, i: number) => (
              <div key={r.id || i} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {SURVEYS[r.survey_id]?.title || r.survey_id}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString("de-DE") : ""}
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  {r.avg_score > 0 && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      r.avg_score >= 8 ? "bg-success/15 text-success" :
                      r.avg_score >= 6 ? "bg-primary/15 text-primary" :
                      "bg-warning/15 text-warning"
                    }`}>
                      Ø {r.avg_score}
                    </span>
                  )}
                  {r.tags?.includes("upsell_hot") && (
                    <span className="text-[11px] bg-warning/15 text-warning font-bold px-2 py-0.5 rounded-md">🔥 Upsell</span>
                  )}
                  {r.review_clicked && (
                    <span className="text-[11px] bg-success/15 text-success font-bold px-2 py-0.5 rounded-md">⭐ Review</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      {showModal && pendingSurvey && (
        <SurveyModal
          survey={pendingSurvey}
          tenantId={tenantId}
          onComplete={() => { setShowModal(false); loadResponses(); }}
          onDismiss={() => handleDismiss(pendingSurvey.id)}
        />
      )}
    </>
  );
}
