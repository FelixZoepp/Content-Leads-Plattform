import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Loader2, ChevronRight, Sparkles,
  BarChart2, MessageSquare, ToggleLeft, ToggleRight, X, Save,
} from "lucide-react";
import { SurveyQuestionBuilder, SurveyQuestion } from "@/components/admin/SurveyQuestionBuilder";

interface Survey {
  id: string;
  title: string;
  description: string | null;
  questions: SurveyQuestion[];
  is_active: boolean;
  created_at: string;
}

interface SurveyResponse {
  id: string;
  tenant_id: string;
  submitted_at: string;
  answers: Record<string, any>;
  sentiment?: string | null;
  theme_tags?: string[] | null;
  tenants?: { company_name: string };
}

type View = "list" | "create" | "detail";

function npsCategory(score: number): "promoter" | "passive" | "detractor" {
  if (score >= 9) return "promoter";
  if (score >= 7) return "passive";
  return "detractor";
}

export default function SurveyManager() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("list");
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // Create form state
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftQuestions, setDraftQuestions] = useState<SurveyQuestion[]>([]);

  useEffect(() => {
    loadSurveys();
  }, []);

  async function loadSurveys() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("surveys")
      .select("*")
      .order("created_at", { ascending: false });
    setSurveys(data || []);
    setLoading(false);
  }

  async function openDetail(survey: Survey) {
    setSelectedSurvey(survey);
    setAiInsight("");
    setLoadingResponses(true);
    setView("detail");

    const { data } = await (supabase as any)
      .from("survey_response_entries")
      .select("*, tenants(company_name)")
      .eq("survey_id", survey.id)
      .order("submitted_at", { ascending: false });
    setResponses(data || []);
    setLoadingResponses(false);
  }

  async function saveSurvey() {
    if (!draftTitle.trim() || draftQuestions.length === 0) return;
    setSaving(true);
    try {
      await (supabase as any).from("surveys").insert({
        title: draftTitle.trim(),
        description: draftDesc.trim() || null,
        questions: draftQuestions,
        is_active: true,
      });
      await loadSurveys();
      setDraftTitle("");
      setDraftDesc("");
      setDraftQuestions([]);
      setView("list");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(survey: Survey) {
    await (supabase as any)
      .from("surveys")
      .update({ is_active: !survey.is_active })
      .eq("id", survey.id);
    setSurveys(prev =>
      prev.map(s => s.id === survey.id ? { ...s, is_active: !s.is_active } : s)
    );
    if (selectedSurvey?.id === survey.id) {
      setSelectedSurvey(s => s ? { ...s, is_active: !s.is_active } : s);
    }
  }

  async function runAiAnalysis() {
    if (!selectedSurvey || responses.length === 0) return;
    setAnalyzing(true);
    setAiInsight("");

    try {
      // Build context from responses
      const responseSummary = responses.slice(0, 50).map((r, i) => {
        const lines = Object.entries(r.answers || {}).map(([qId, val]) => {
          const q = selectedSurvey.questions.find(q => q.id === qId);
          return `  ${q?.question || qId}: ${val}`;
        });
        return `Antwort ${i + 1} (${r.tenants?.company_name || "Unbekannt"}):\n${lines.join("\n")}`;
      }).join("\n\n");

      const systemPrompt = `Du bist ein Feedback-Analyst. Analysiere die folgenden Umfrage-Antworten und liefere:
1. Gesamt-Sentiment (positiv/neutral/negativ) mit kurzer Begründung
2. Top 3-5 Themen/Themenbereiche als Tags (z.B. "Onboarding", "Support", "Ergebnisse")
3. Konkrete Handlungsempfehlungen (max. 3 Punkte)
4. NPS-Zusammenfassung wenn NPS-Daten vorhanden

Antworte auf Deutsch, strukturiert und prägnant.`;

      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          systemPrompt,
          messages: [
            {
              role: "user",
              content: `Umfrage: "${selectedSurvey.title}"\n${responses.length} Antworten insgesamt\n\n${responseSummary}`,
            },
          ],
        },
      });

      if (error) throw error;
      const insight = data?.response || data?.message || "Keine Analyse verfügbar.";
      setAiInsight(insight);

      // Persist insight to ai_insights table
      await (supabase as any).from("ai_insights").insert({
        survey_id: selectedSurvey.id,
        content: insight,
        type: "survey_analysis",
        created_at: new Date().toISOString(),
      }).catch(() => null); // non-blocking, ignore if column mismatch
    } catch (e: any) {
      setAiInsight(`Fehler bei der Analyse: ${e.message}`);
    } finally {
      setAnalyzing(false);
    }
  }

  // ── NPS distribution from responses ──────────────────────────────────────
  function getNpsDistribution() {
    const npsAnswers: number[] = [];
    for (const r of responses) {
      for (const q of selectedSurvey?.questions || []) {
        if (q.type === "nps" && r.answers?.[q.id] !== undefined) {
          const v = Number(r.answers[q.id]);
          if (!isNaN(v)) npsAnswers.push(v);
        }
      }
    }
    const promoters = npsAnswers.filter(v => v >= 9).length;
    const passives = npsAnswers.filter(v => v >= 7 && v < 9).length;
    const detractors = npsAnswers.filter(v => v < 7).length;
    const total = npsAnswers.length;
    const score = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : null;
    return { promoters, passives, detractors, total, score };
  }

  // ── Sentiment summary from response metadata ─────────────────────────────
  function getSentimentCounts() {
    const counts: Record<string, number> = { positiv: 0, neutral: 0, negativ: 0 };
    for (const r of responses) {
      const s = r.sentiment?.toLowerCase();
      if (s && counts[s] !== undefined) counts[s]++;
    }
    return counts;
  }

  function getTopThemes() {
    const tagCounts: Record<string, number> = {};
    for (const r of responses) {
      for (const tag of r.theme_tags || []) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Create form
  // ─────────────────────────────────────────────────────────────────────────
  if (view === "create") {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <button
          onClick={() => setView("list")}
          className="flex items-center gap-2 text-sm text-[rgba(249,249,249,0.4)] hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Zur Übersicht
        </button>

        <div>
          <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">Neu</span>
          <h1 className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>Umfrage erstellen</h1>
        </div>

        <div className="glass-panel space-y-5">
          <div className="relative z-[2] space-y-5">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-1.5">
                Titel *
              </label>
              <input
                value={draftTitle}
                onChange={e => setDraftTitle(e.target.value)}
                placeholder="z.B. Monatlicher Check-In Oktober"
                className="w-full bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-[rgba(249,249,249,0.2)] outline-none focus:border-[rgba(197,160,89,0.3)] transition"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-1.5">
                Beschreibung
              </label>
              <textarea
                value={draftDesc}
                onChange={e => setDraftDesc(e.target.value)}
                rows={2}
                placeholder="Kurze Beschreibung der Umfrage…"
                className="w-full bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-[rgba(249,249,249,0.2)] outline-none focus:border-[rgba(197,160,89,0.3)] transition resize-none"
              />
            </div>

            <div className="border-t border-[rgba(249,249,249,0.05)] pt-5">
              <SurveyQuestionBuilder questions={draftQuestions} onChange={setDraftQuestions} />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={saveSurvey}
                disabled={saving || !draftTitle.trim() || draftQuestions.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-semibold text-white transition disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #C5A059, #775A19)" }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Umfrage speichern
              </button>
              <button
                onClick={() => setView("list")}
                className="px-4 py-2.5 border border-[rgba(249,249,249,0.08)] rounded-lg text-[12px] text-[rgba(249,249,249,0.5)] hover:bg-[rgba(249,249,249,0.04)] transition"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Detail view
  // ─────────────────────────────────────────────────────────────────────────
  if (view === "detail" && selectedSurvey) {
    const nps = getNpsDistribution();
    const sentiment = getSentimentCounts();
    const themes = getTopThemes();

    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <button
          onClick={() => setView("list")}
          className="flex items-center gap-2 text-sm text-[rgba(249,249,249,0.4)] hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Zur Übersicht
        </button>

        {/* Header */}
        <div className="glass-panel">
          <div className="relative z-[2] flex items-start justify-between">
            <div>
              <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">Umfrage</span>
              <h1 className="text-xl text-white" style={{ fontFamily: "var(--font-serif)" }}>{selectedSurvey.title}</h1>
              {selectedSurvey.description && (
                <p className="text-[12px] text-[rgba(249,249,249,0.4)] mt-1">{selectedSurvey.description}</p>
              )}
              <div className="flex items-center gap-3 mt-3">
                <span className="text-[10px] text-[rgba(249,249,249,0.3)]">
                  {selectedSurvey.questions.length} Fragen · {responses.length} Antworten
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleActive(selectedSurvey)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] border border-[rgba(249,249,249,0.08)] text-[rgba(249,249,249,0.5)] hover:bg-[rgba(249,249,249,0.04)] transition"
              >
                {selectedSurvey.is_active ? (
                  <><ToggleRight className="w-4 h-4 text-[#7FC29B]" /> Aktiv</>
                ) : (
                  <><ToggleLeft className="w-4 h-4 text-[rgba(249,249,249,0.3)]" /> Inaktiv</>
                )}
              </button>
              <button
                onClick={runAiAnalysis}
                disabled={analyzing || responses.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold text-white transition disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #C5A059, #775A19)", boxShadow: "0 0 18px rgba(197,160,89,0.35)" }}
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                KI-Analyse starten
              </button>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          <div className="glass-panel">
            <div className="relative z-[2]">
              <p className="text-[10px] text-[rgba(249,249,249,0.4)] tracking-[0.2em] uppercase mb-1">Antworten</p>
              <p className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>{responses.length}</p>
            </div>
          </div>
          {nps.total > 0 && (
            <div className="glass-panel">
              <div className="relative z-[2]">
                <p className="text-[10px] text-[rgba(249,249,249,0.4)] tracking-[0.2em] uppercase mb-1">NPS Score</p>
                <p className={`text-2xl font-semibold ${
                  nps.score !== null && nps.score >= 30 ? "text-[#7FC29B]" :
                  nps.score !== null && nps.score >= 0 ? "text-[#E9CB8B]" : "text-[#E87467]"
                }`} style={{ fontFamily: "var(--font-serif)" }}>
                  {nps.score !== null ? nps.score : "—"}
                </p>
                <p className="text-[10px] text-[rgba(249,249,249,0.3)] mt-0.5">
                  {nps.promoters}P · {nps.passives}N · {nps.detractors}D
                </p>
              </div>
            </div>
          )}
          {(sentiment.positiv + sentiment.neutral + sentiment.negativ) > 0 && (
            <div className="glass-panel">
              <div className="relative z-[2]">
                <p className="text-[10px] text-[rgba(249,249,249,0.4)] tracking-[0.2em] uppercase mb-2">Sentiment</p>
                <div className="space-y-1">
                  {[
                    { label: "Positiv", count: sentiment.positiv, color: "#7FC29B" },
                    { label: "Neutral", count: sentiment.neutral, color: "#E9CB8B" },
                    { label: "Negativ", count: sentiment.negativ, color: "#E87467" },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-[10px] text-[rgba(249,249,249,0.5)]">{s.label}</span>
                      <span className="text-[10px] font-semibold text-white ml-auto">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {themes.length > 0 && (
            <div className="glass-panel">
              <div className="relative z-[2]">
                <p className="text-[10px] text-[rgba(249,249,249,0.4)] tracking-[0.2em] uppercase mb-2">Top Themen</p>
                <div className="flex flex-wrap gap-1">
                  {themes.slice(0, 4).map(([tag, count]) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full text-[9px] font-medium text-[#E9CB8B] border border-[rgba(197,160,89,0.3)]">
                      {tag} ({count})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* NPS distribution bar */}
        {nps.total > 0 && (
          <div className="glass-panel">
            <div className="relative z-[2]">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-3">NPS Verteilung</p>
              <div className="flex rounded-lg overflow-hidden h-5">
                {nps.promoters > 0 && (
                  <div
                    className="flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ width: `${(nps.promoters / nps.total) * 100}%`, background: "#7FC29B" }}
                    title={`Promotoren: ${nps.promoters}`}
                  >
                    {nps.promoters}
                  </div>
                )}
                {nps.passives > 0 && (
                  <div
                    className="flex items-center justify-center text-[9px] font-bold text-[#141616]"
                    style={{ width: `${(nps.passives / nps.total) * 100}%`, background: "#E9CB8B" }}
                    title={`Passive: ${nps.passives}`}
                  >
                    {nps.passives}
                  </div>
                )}
                {nps.detractors > 0 && (
                  <div
                    className="flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ width: `${(nps.detractors / nps.total) * 100}%`, background: "#E87467" }}
                    title={`Detraktoren: ${nps.detractors}`}
                  >
                    {nps.detractors}
                  </div>
                )}
              </div>
              <div className="flex gap-4 mt-2">
                {[
                  { label: "Promotoren (9–10)", color: "#7FC29B" },
                  { label: "Passive (7–8)", color: "#E9CB8B" },
                  { label: "Detraktoren (0–6)", color: "#E87467" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                    <span className="text-[10px] text-[rgba(249,249,249,0.4)]">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI Insight */}
        {aiInsight && (
          <div className="glass-panel" style={{ borderColor: "rgba(197,160,89,0.2)" }}>
            <div className="relative z-[2]">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[#E9CB8B]" />
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#E9CB8B]">KI-Analyse</span>
              </div>
              <p className="text-[13px] text-[rgba(249,249,249,0.8)] whitespace-pre-wrap leading-relaxed">{aiInsight}</p>
            </div>
          </div>
        )}

        {/* Responses table */}
        <div className="glass-panel" style={{ padding: 0 }}>
          <div className="relative z-[2]">
            <div className="px-5 py-4 border-b border-[rgba(249,249,249,0.08)] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#E9CB8B]" />
              <h2 className="text-[13px] font-medium text-white">
                Antworten ({responses.length})
              </h2>
            </div>
            {loadingResponses ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[rgba(249,249,249,0.3)]" />
              </div>
            ) : responses.length === 0 ? (
              <div className="py-12 text-center">
                <MessageSquare className="w-10 h-10 text-[rgba(249,249,249,0.08)] mx-auto mb-3" />
                <p className="text-[12px] text-[rgba(249,249,249,0.3)]">Noch keine Antworten für diese Umfrage</p>
              </div>
            ) : (
              <div className="divide-y divide-[rgba(249,249,249,0.05)]">
                {responses.map((r) => (
                  <div key={r.id} className="px-5 py-4 hover:bg-[rgba(249,249,249,0.02)] transition">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-medium text-white">
                          {r.tenants?.company_name || "Unbekannt"}
                        </span>
                        {r.sentiment && (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide ${
                            r.sentiment.toLowerCase() === "positiv" ? "text-[#7FC29B] bg-[rgba(127,194,155,0.1)]" :
                            r.sentiment.toLowerCase() === "negativ" ? "text-[#E87467] bg-[rgba(232,116,103,0.1)]" :
                            "text-[#E9CB8B] bg-[rgba(233,203,139,0.1)]"
                          }`}>
                            {r.sentiment}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[rgba(249,249,249,0.3)]">
                        {new Date(r.submitted_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {selectedSurvey.questions.map(q => {
                        const val = r.answers?.[q.id];
                        if (val === undefined || val === null) return null;
                        return (
                          <div key={q.id} className="flex gap-3 text-[12px]">
                            <span className="text-[rgba(249,249,249,0.35)] shrink-0 max-w-[240px] truncate">{q.question}</span>
                            <span className="text-[rgba(249,249,249,0.7)] font-medium">
                              {String(val)}
                              {q.type === "nps" && (
                                <span className={`ml-1.5 text-[9px] ${
                                  npsCategory(Number(val)) === "promoter" ? "text-[#7FC29B]" :
                                  npsCategory(Number(val)) === "passive" ? "text-[#E9CB8B]" : "text-[#E87467]"
                                }`}>
                                  ({npsCategory(Number(val))})
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {r.theme_tags && r.theme_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {r.theme_tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 rounded-full text-[9px] text-[#E9CB8B] border border-[rgba(197,160,89,0.2)]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: List
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate("/dashboard/admin")}
            className="flex items-center gap-2 text-sm text-[rgba(249,249,249,0.4)] hover:text-white transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Admin Dashboard
          </button>
          <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">CL-029</span>
          <h1 className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>Umfragen</h1>
          <p className="text-[12px] text-[rgba(249,249,249,0.4)] mt-0.5">
            {surveys.length} Umfragen · {surveys.filter(s => s.is_active).length} aktiv
          </p>
        </div>
        <button
          onClick={() => setView("create")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold text-white transition"
          style={{ background: "linear-gradient(135deg, #C5A059, #775A19)", boxShadow: "0 0 18px rgba(197,160,89,0.35)" }}
        >
          <Plus className="w-4 h-4" /> Neue Umfrage
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[rgba(249,249,249,0.3)]" />
        </div>
      ) : surveys.length === 0 ? (
        <div className="glass-panel text-center py-16">
          <div className="relative z-[2]">
            <BarChart2 className="w-12 h-12 text-[rgba(249,249,249,0.08)] mx-auto mb-3" />
            <p className="text-[13px] text-[rgba(249,249,249,0.4)]">Noch keine Umfragen erstellt.</p>
            <button
              onClick={() => setView("create")}
              className="mt-4 text-[12px] text-[#E9CB8B] hover:underline"
            >
              Erste Umfrage erstellen →
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {surveys.map(survey => (
            <div
              key={survey.id}
              onClick={() => openDetail(survey)}
              className="glass-panel cursor-pointer hover:border-[rgba(197,160,89,0.3)] transition group"
            >
              <div className="relative z-[2] flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(197,160,89,0.12)", border: "1px solid rgba(197,160,89,0.2)" }}>
                  <BarChart2 className="w-5 h-5 text-[#E9CB8B]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold text-white truncate">{survey.title}</p>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide ${
                      survey.is_active
                        ? "text-[#7FC29B] bg-[rgba(127,194,155,0.1)]"
                        : "text-[rgba(249,249,249,0.3)] bg-[rgba(249,249,249,0.05)]"
                    }`}>
                      {survey.is_active ? "Aktiv" : "Inaktiv"}
                    </span>
                  </div>
                  {survey.description && (
                    <p className="text-[11px] text-[rgba(249,249,249,0.4)] truncate mt-0.5">{survey.description}</p>
                  )}
                  <p className="text-[10px] text-[rgba(249,249,249,0.25)] mt-1">
                    {survey.questions.length} Fragen · erstellt {new Date(survey.created_at).toLocaleDateString("de-DE")}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); toggleActive(survey); }}
                    className="p-1.5 rounded-lg text-[rgba(249,249,249,0.2)] hover:text-[#E9CB8B] hover:bg-[rgba(197,160,89,0.08)] border border-transparent hover:border-[rgba(197,160,89,0.2)] transition"
                    title={survey.is_active ? "Deaktivieren" : "Aktivieren"}
                  >
                    {survey.is_active
                      ? <ToggleRight className="w-4 h-4 text-[#7FC29B]" />
                      : <ToggleLeft className="w-4 h-4" />
                    }
                  </button>
                  <ChevronRight className="w-4 h-4 text-[rgba(249,249,249,0.2)] group-hover:text-[#E9CB8B] transition" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
