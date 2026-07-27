import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Check, Loader2, Star, MessageSquare } from "lucide-react";

/**
 * CL-154: Public survey response page — accessible via token link without login.
 * URL: /survey?token=xxx
 */

interface Question {
  id: string;
  type: "text" | "nps" | "scale";
  question: string;
  required: boolean;
}

export default function SurveyResponsePage() {
  const [params] = useSearchParams();
  const token = params.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [survey, setSurvey] = useState<any>(null);
  const [send, setSend] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (token) loadSurvey();
    else setError("Kein gültiger Umfrage-Link.");
  }, [token]);

  async function loadSurvey() {
    setLoading(true);

    // Find survey_send by token
    const { data: sendData, error: sendErr } = await (supabase as any)
      .from("survey_sends")
      .select("*, surveys(*)")
      .eq("token", token)
      .maybeSingle();

    if (sendErr || !sendData) {
      setError("Dieser Umfrage-Link ist ungültig oder abgelaufen.");
      setLoading(false);
      return;
    }

    if (sendData.status === "completed") {
      setSubmitted(true);
      setLoading(false);
      return;
    }

    if (sendData.status === "expired") {
      setError("Diese Umfrage ist abgelaufen.");
      setLoading(false);
      return;
    }

    setSend(sendData);
    setSurvey(sendData.surveys);

    // Mark as opened
    if (sendData.status === "sent") {
      await (supabase as any).from("survey_sends").update({ status: "opened", opened_at: new Date().toISOString() }).eq("id", sendData.id);
    }

    setLoading(false);
  }

  async function submit() {
    if (!send || !survey) return;
    setSubmitting(true);

    // Save response
    await (supabase as any).from("survey_response_entries").insert({
      survey_id: survey.id,
      user_id: send.user_id,
      org_id: send.org_id || null,
      answers,
      nps_score: npsScore,
    });

    // Mark send as completed
    await (supabase as any).from("survey_sends").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", send.id);

    setSubmitted(true);
    setSubmitting(false);
  }

  const questions: Question[] = survey?.questions || [];
  const allRequiredFilled = questions.filter(q => q.required).every(q => {
    if (q.type === "nps") return npsScore !== null;
    return answers[q.id] !== undefined && answers[q.id] !== "";
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0B0B" }}>
        <Loader2 className="w-8 h-8 animate-spin text-[#C5A059]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0B0B" }}>
        <div className="text-center">
          <MessageSquare className="w-12 h-12 text-[rgba(249,249,249,0.1)] mx-auto mb-4" />
          <p className="text-[15px] text-[rgba(249,249,249,0.5)]">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0B0B" }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(127,194,155,0.15)" }}>
            <Check className="w-8 h-8 text-[#7FC29B]" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Vielen Dank!</h1>
          <p className="text-[rgba(249,249,249,0.5)]">Dein Feedback wurde gespeichert.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: "#0A0B0B" }}>
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "linear-gradient(135deg, #E9CB8B, #C5A059)" }}>
            <span className="text-white font-bold text-lg" style={{ fontFamily: "var(--font-serif, Georgia)" }}>C</span>
          </div>
          <h1 className="text-xl font-bold text-white">{survey?.title || "Umfrage"}</h1>
          <p className="text-[13px] text-[rgba(249,249,249,0.4)] mt-1">Content-Leads</p>
        </div>

        {questions.map((q, i) => (
          <div key={q.id || i} className="rounded-2xl p-5 border border-[rgba(249,249,249,0.08)]" style={{ background: "rgba(249,249,249,0.03)" }}>
            <label className="block text-[14px] font-medium text-white mb-3">
              {q.question}
              {q.required && <span className="text-[#E87467] ml-1">*</span>}
            </label>

            {q.type === "nps" && (
              <div className="flex gap-1 justify-between">
                {Array.from({ length: 11 }, (_, n) => (
                  <button
                    key={n}
                    onClick={() => setNpsScore(n)}
                    className={`w-9 h-9 rounded-lg text-[13px] font-medium transition ${npsScore === n
                      ? n <= 6 ? "bg-[#E87467] text-white" : n <= 8 ? "bg-[#E9CB8B] text-black" : "bg-[#7FC29B] text-white"
                      : "bg-[rgba(249,249,249,0.06)] text-[rgba(249,249,249,0.5)] hover:bg-[rgba(249,249,249,0.1)]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}

            {q.type === "scale" && (
              <div className="flex gap-1">
                {Array.from({ length: 10 }, (_, n) => (
                  <button
                    key={n + 1}
                    onClick={() => setAnswers(a => ({ ...a, [q.id]: n + 1 }))}
                    className={`flex-1 h-10 rounded-lg text-[13px] font-medium transition ${Number(answers[q.id]) === n + 1
                      ? "bg-[#C5A059] text-white"
                      : "bg-[rgba(249,249,249,0.06)] text-[rgba(249,249,249,0.5)] hover:bg-[rgba(249,249,249,0.1)]"
                    }`}
                  >
                    {n + 1}
                  </button>
                ))}
              </div>
            )}

            {q.type === "text" && (
              <textarea
                value={(answers[q.id] as string) || ""}
                onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                rows={3}
                className="w-full bg-[rgba(10,11,11,0.5)] border border-[rgba(249,249,249,0.08)] rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-[rgba(249,249,249,0.2)] outline-none focus:border-[rgba(197,160,89,0.3)] transition resize-y"
                placeholder="Deine Antwort..."
              />
            )}
          </div>
        ))}

        <button
          onClick={submit}
          disabled={submitting || !allRequiredFilled}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[14px] font-semibold text-white transition disabled:opacity-30"
          style={{ background: allRequiredFilled ? "linear-gradient(135deg, #C5A059, #775A19)" : undefined, boxShadow: allRequiredFilled ? "0 0 24px rgba(197,160,89,0.3)" : undefined }}
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
          {submitting ? "Wird gesendet..." : "Absenden"}
        </button>
      </div>
    </div>
  );
}
