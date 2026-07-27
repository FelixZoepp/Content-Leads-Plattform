import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Loader2, ChevronRight, Sparkles,
  BarChart2, MessageSquare, ToggleLeft, ToggleRight, X, Save,
  TrendingUp, PieChart, Bell,
} from "lucide-react";
import { SurveyQuestionBuilder, SurveyQuestion } from "@/components/admin/SurveyQuestionBuilder";
import {
  LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { checkSurveyForAlerts } from "@/_shared/alerts";

// ─── Types ────────────────────────────────────────────────────────────────────

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
type DetailTab = "responses" | "trends";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function npsCategory(score: number): "promoter" | "passive" | "detractor" {
  if (score >= 9) return "promoter";
  if (score >= 7) return "passive";
  return "detractor";
}

const SENTIMENT_COLORS: Record<string, string> = {
  positiv: "#7FC29B",
  neutral: "#E9CB8B",
  negativ: "#E87467",
};

// Custom recharts tooltip styled for the dark theme
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-[11px] text-white"
      style={{ background: "rgba(20,22,22,0.95)", border: "1px solid rgba(249,249,249,0.1)" }}
    >
      {label && <p className="text-[rgba(249,249,249,0.4)] mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || "#E9CB8B" }}>
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SurveyManager() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("list");
  const [detailTab, setDetailTab] = useState<DetailTab>("responses");
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [alertsTriggered, setAlertsTriggered] = useState(false);

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
    setDetailTab("responses");
    setAlertsTriggered(false);
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

  // ── CL-160: AI Analysis v2 ───────────────────────────────────────────────

  async function runAiAnalysis() {
    if (!selectedSurvey || responses.length === 0) return;
    setAnalyzing(true);
    setAiInsight("");
    setAlertsTriggered(false);

    try {
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
5. Pro Antwort: Sentiment (positiv/neutral/negativ) und Theme-Tags im JSON-Block am Ende:
   RESPONSE_SENTIMENTS_JSON: [{"id":"<response_id>","sentiment":"positiv","theme_tags":["Tag1","Tag2"]},...]

Antworte auf Deutsch, strukturiert und prägnant.`;

      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          systemPrompt,
          messages: [
            {
              role: "user",
              content: `Umfrage: "${selectedSurvey.title}"\n${responses.length} Antworten insgesamt\nResponse-IDs: ${responses.slice(0, 50).map(r => r.id).join(", ")}\n\n${responseSummary}`,
            },
          ],
        },
      });

      if (error) throw error;
      const insight = data?.response || data?.message || "Keine Analyse verfügbar.";

      // Parse per-response sentiment/tags from the JSON block
      const jsonMatch = insight.match(/RESPONSE_SENTIMENTS_JSON:\s*(\[[\s\S]*?\])/);
      let perResponseData: Array<{ id: string; sentiment: string; theme_tags: string[] }> = [];
      if (jsonMatch) {
        try {
          perResponseData = JSON.parse(jsonMatch[1]);
        } catch {
          // ignore parse errors
        }
      }

      // Strip the JSON block from the displayed insight
      const cleanInsight = insight.replace(/RESPONSE_SENTIMENTS_JSON:\s*\[[\s\S]*?\]/, "").trim();
      setAiInsight(cleanInsight);

      // Save per-response sentiment + theme_tags back to DB
      if (perResponseData.length > 0) {
        const updates = perResponseData.map(pr =>
          (supabase as any)
            .from("survey_response_entries")
            .update({ sentiment: pr.sentiment, theme_tags: pr.theme_tags })
            .eq("id", pr.id)
            .catch(() => null)
        );
        await Promise.allSettled(updates);

        // Update local state immediately
        setResponses(prev =>
          prev.map(r => {
            const match = perResponseData.find(pr => pr.id === r.id);
            return match ? { ...r, sentiment: match.sentiment, theme_tags: match.theme_tags } : r;
          })
        );

        // CL-160: Check for critical responses and trigger alerts
        const alertPayloads = perResponseData
          .map(pr => {
            const r = responses.find(x => x.id === pr.id);
            if (!r) return null;
            return {
              survey_id: selectedSurvey.id,
              survey_title: selectedSurvey.title,
              tenant_id: r.tenant_id,
              company_name: r.tenants?.company_name || "Unbekannt",
              response_id: pr.id,
              sentiment: pr.sentiment,
              theme_tags: pr.theme_tags,
              answers: r.answers,
            };
          })
          .filter(Boolean) as any[];

        await checkSurveyForAlerts(alertPayloads);
        setAlertsTriggered(true);
      }

      // Persist overall insight to ai_insights table
      await (supabase as any).from("ai_insights").insert({
        survey_id: selectedSurvey.id,
        content: cleanInsight,
        type: "survey_analysis",
        created_at: new Date().toISOString(),
      }).catch(() => null);
    } catch (e: any) {
      setAiInsight(`Fehler bei der Analyse: ${e.message}`);
    } finally {
      setAnalyzing(false);
    }
  }

  // ── NPS helpers ───────────────────────────────────────────────────────────

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
    return { promoters, passives, detractors, total, score, raw: npsAnswers };
  }

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

  // ── CL-159: Trend data builders ───────────────────────────────────────────

  function getNpsTrendData() {
    if (!selectedSurvey) return [];

    // Group responses by week
    const byWeek: Record<string, { promoters: number; detractors: number; total: number }> = {};

    for (const r of responses) {
      const date = new Date(r.submitted_at);
      // ISO week label: "KW WW YYYY"
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1); // Monday
      const label = weekStart.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });

      if (!byWeek[label]) byWeek[label] = { promoters: 0, detractors: 0, total: 0 };

      for (const q of selectedSurvey.questions) {
        if (q.type === "nps" && r.answers?.[q.id] !== undefined) {
          const v = Number(r.answers[q.id]);
          if (!isNaN(v)) {
            byWeek[label].total++;
            if (v >= 9) byWeek[label].promoters++;
            if (v <= 6) byWeek[label].detractors++;
          }
        }
      }
    }

    return Object.entries(byWeek)
      .map(([week, d]) => ({
        week,
        nps: d.total > 0 ? Math.round(((d.promoters - d.detractors) / d.total) * 100) : 0,
        responses: d.total,
      }))
      .reverse();
  }

  function getSentimentPieData() {
    const counts = getSentimentCounts();
    return [
      { name: "Positiv", value: counts.positiv, color: SENTIMENT_COLORS.positiv },
      { name: "Neutral", value: counts.neutral, color: SENTIMENT_COLORS.neutral },
      { name: "Negativ", value: counts.negativ, color: SENTIMENT_COLORS.negativ },
    ].filter(d => d.value > 0);
  }

  function getThemeBarData() {
    return getTopThemes().slice(0, 5).map(([tag, count]) => ({ tag, count }));
  }

  function getResponseRateData() {
    // Group responses by survey (for multi-survey comparison in future),
    // here just show response count over time as a simple bar
    const byMonth: Record<string, number> = {};
    for (const r of responses) {
      const label = new Date(r.submitted_at).toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
      byMonth[label] = (byMonth[label] || 0) + 1;
    }
    return Object.entries(byMonth)
      .map(([month, count]) => ({ month, count }))
      .reverse();
  }

  // ── Theme cloud from all tagged responses ─────────────────────────────────
  function getAllThemeTags() {
    const tagCounts: Record<string, number> = {};
    for (const r of responses) {
      for (const tag of r.theme_tags || []) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    const max = Math.max(1, ...Object.values(tagCounts));
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count, weight: count / max }));
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
    const themeTags = getAllThemeTags();
    const npsTrend = getNpsTrendData();
    const sentimentPie = getSentimentPieData();
    const themeBar = getThemeBarData();
    const responseRate = getResponseRateData();

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

        {/* AI Insight (CL-160) */}
        {aiInsight && (
          <div className="glass-panel" style={{ borderColor: "rgba(197,160,89,0.2)" }}>
            <div className="relative z-[2]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#E9CB8B]" />
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#E9CB8B]">KI-Analyse</span>
                </div>
                {alertsTriggered && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-semibold text-[#E87467] bg-[rgba(232,116,103,0.1)] border border-[rgba(232,116,103,0.2)]">
                    <Bell className="w-3 h-3" />
                    Alerts ausgelöst
                  </div>
                )}
              </div>
              <p className="text-[13px] text-[rgba(249,249,249,0.8)] whitespace-pre-wrap leading-relaxed">{aiInsight}</p>

              {/* CL-160: Theme cloud */}
              {themeTags.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[rgba(249,249,249,0.05)]">
                  <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.3)] mb-3">
                    Theme Cloud
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {themeTags.map(({ tag, count, weight }) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-full font-medium border"
                        style={{
                          fontSize: `${Math.round(9 + weight * 5)}px`,
                          color: weight > 0.6 ? "#E9CB8B" : weight > 0.3 ? "rgba(233,203,139,0.7)" : "rgba(249,249,249,0.35)",
                          borderColor: weight > 0.6 ? "rgba(197,160,89,0.4)" : weight > 0.3 ? "rgba(197,160,89,0.2)" : "rgba(249,249,249,0.08)",
                          background: weight > 0.6 ? "rgba(197,160,89,0.1)" : "transparent",
                        }}
                      >
                        {tag}
                        <span className="ml-1 opacity-60 text-[9px]">{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <div className="flex gap-1 border-b border-[rgba(249,249,249,0.06)] pb-0">
          {[
            { id: "responses" as DetailTab, label: "Antworten", icon: <MessageSquare className="w-3.5 h-3.5" /> },
            { id: "trends" as DetailTab, label: "Trends", icon: <TrendingUp className="w-3.5 h-3.5" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setDetailTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium transition border-b-2 -mb-px"
              style={{
                color: detailTab === tab.id ? "#E9CB8B" : "rgba(249,249,249,0.35)",
                borderBottomColor: detailTab === tab.id ? "#E9CB8B" : "transparent",
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── CL-159: Trends tab ──────────────────────────────────────────── */}
        {detailTab === "trends" && (
          <div className="space-y-5">
            {responses.length === 0 ? (
              <div className="glass-panel text-center py-16">
                <div className="relative z-[2]">
                  <PieChart className="w-10 h-10 text-[rgba(249,249,249,0.08)] mx-auto mb-3" />
                  <p className="text-[12px] text-[rgba(249,249,249,0.3)]">Noch keine Antworten für Trend-Analyse</p>
                </div>
              </div>
            ) : (
              <>
                {/* NPS trend line chart */}
                {npsTrend.length > 1 && (
                  <div className="glass-panel">
                    <div className="relative z-[2]">
                      <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-4">
                        NPS Trend (wöchentlich)
                      </p>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={npsTrend}>
                          <XAxis
                            dataKey="week"
                            tick={{ fill: "rgba(249,249,249,0.3)", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            domain={[-100, 100]}
                            tick={{ fill: "rgba(249,249,249,0.3)", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip content={<DarkTooltip />} />
                          <Line
                            type="monotone"
                            dataKey="nps"
                            name="NPS"
                            stroke="#E9CB8B"
                            strokeWidth={2}
                            dot={{ fill: "#E9CB8B", r: 3, strokeWidth: 0 }}
                            activeDot={{ r: 5, fill: "#E9CB8B" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Sentiment pie */}
                  {sentimentPie.length > 0 && (
                    <div className="glass-panel">
                      <div className="relative z-[2]">
                        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-4">
                          Sentiment Verteilung
                        </p>
                        <ResponsiveContainer width="100%" height={180}>
                          <RechartsPie>
                            <Pie
                              data={sentimentPie}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={70}
                              paddingAngle={3}
                              dataKey="value"
                              nameKey="name"
                              label={({ name, percent }) =>
                                `${name} ${Math.round(percent * 100)}%`
                              }
                              labelLine={false}
                            >
                              {sentimentPie.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<DarkTooltip />} />
                          </RechartsPie>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-4 mt-2">
                          {sentimentPie.map(s => (
                            <div key={s.name} className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                              <span className="text-[10px] text-[rgba(249,249,249,0.4)]">{s.name}: {s.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Top 5 themes bar chart */}
                  {themeBar.length > 0 && (
                    <div className="glass-panel">
                      <div className="relative z-[2]">
                        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-4">
                          Top 5 Themen
                        </p>
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={themeBar} layout="vertical" margin={{ left: 0, right: 16 }}>
                            <XAxis
                              type="number"
                              tick={{ fill: "rgba(249,249,249,0.3)", fontSize: 10 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              type="category"
                              dataKey="tag"
                              width={90}
                              tick={{ fill: "rgba(249,249,249,0.5)", fontSize: 10 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip content={<DarkTooltip />} />
                            <Bar dataKey="count" name="Nennungen" fill="#E9CB8B" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>

                {/* Response rate per month */}
                {responseRate.length > 0 && (
                  <div className="glass-panel">
                    <div className="relative z-[2]">
                      <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-4">
                        Antworten pro Monat
                      </p>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={responseRate}>
                          <XAxis
                            dataKey="month"
                            tick={{ fill: "rgba(249,249,249,0.3)", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: "rgba(249,249,249,0.3)", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                          />
                          <Tooltip content={<DarkTooltip />} />
                          <Bar dataKey="count" name="Antworten" fill="#7FC29B" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Responses tab ──────────────────────────────────────────────── */}
        {detailTab === "responses" && (
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
                          {/* CL-160: sentiment badge */}
                          {r.sentiment && (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide ${
                              r.sentiment.toLowerCase() === "positiv"
                                ? "text-[#7FC29B] bg-[rgba(127,194,155,0.1)] border border-[rgba(127,194,155,0.2)]"
                                : r.sentiment.toLowerCase() === "negativ"
                                ? "text-[#E87467] bg-[rgba(232,116,103,0.1)] border border-[rgba(232,116,103,0.2)]"
                                : "text-[#E9CB8B] bg-[rgba(233,203,139,0.1)] border border-[rgba(233,203,139,0.2)]"
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
                      {/* CL-160: theme tags per response */}
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
        )}
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
