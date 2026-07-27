import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, Loader2, Sparkles, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HealthScore {
  score: number;
  color: "green" | "amber" | "red";
  rationale_text: string | null;
  created_at: string;
}

interface AIInsight {
  id: string;
  insight_type: string;
  title: string;
  body: string;
  confidence: number;
  source_refs: SourceRef[];
  created_at: string;
}

interface SourceRef {
  table: string;
  field: string;
  value: string | number;
}

// ─── Color helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  green: {
    label: "Gut",
    ringColor: "#7FC29B",
    glowColor: "rgba(127,194,155,0.35)",
    bgColor: "rgba(127,194,155,0.1)",
    borderColor: "rgba(127,194,155,0.25)",
    textColor: "#7FC29B",
    icon: CheckCircle2,
  },
  amber: {
    label: "Achtung",
    ringColor: "#E9CB8B",
    glowColor: "rgba(233,203,139,0.35)",
    bgColor: "rgba(233,203,139,0.1)",
    borderColor: "rgba(233,203,139,0.25)",
    textColor: "#E9CB8B",
    icon: AlertTriangle,
  },
  red: {
    label: "Kritisch",
    ringColor: "#E87467",
    glowColor: "rgba(232,116,103,0.35)",
    bgColor: "rgba(232,116,103,0.1)",
    borderColor: "rgba(232,116,103,0.25)",
    textColor: "#E87467",
    icon: AlertTriangle,
  },
} as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreRing({ score, color }: { score: number; color: "green" | "amber" | "red" }) {
  const cfg = STATUS_CONFIG[color];
  const size = 72;
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(249,249,249,0.06)"
          strokeWidth={5}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={cfg.ringColor}
          strokeWidth={5}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${cfg.glowColor})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[18px] font-bold text-white leading-none"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {score}
        </span>
        <span className="text-[8px] font-semibold tracking-[0.15em] uppercase" style={{ color: cfg.textColor }}>
          {cfg.label}
        </span>
      </div>
    </div>
  );
}

function ComplianceBar({ pct }: { pct: number }) {
  const color = pct >= 70 ? "#7FC29B" : pct >= 40 ? "#E9CB8B" : "#E87467";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-[rgba(249,249,249,0.45)] tracking-wide">Compliance (30 Tage)</span>
        <span className="text-[11px] font-bold" style={{ color }}>
          {pct}%
        </span>
      </div>
      <div className="h-1 bg-[rgba(249,249,249,0.06)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(pct, 100)}%`,
            background: color,
            boxShadow: `0 0 8px ${color}60`,
          }}
        />
      </div>
    </div>
  );
}

function InsightRow({ insight }: { insight: AIInsight }) {
  const [expanded, setExpanded] = useState(false);
  const primaryRef = insight.source_refs?.[0];

  return (
    <div
      className="rounded-xl border p-3 cursor-pointer transition-all"
      style={{
        background: "rgba(249,249,249,0.02)",
        borderColor: expanded ? "rgba(197,160,89,0.25)" : "rgba(249,249,249,0.06)",
      }}
      onClick={() => setExpanded(v => !v)}
    >
      <div className="flex items-start gap-2.5">
        <TrendingUp className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[#C5A059]" />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-white leading-snug">{insight.title}</p>
          {primaryRef && (
            <span className="text-[10px] text-[rgba(249,249,249,0.35)] mt-0.5 block">
              {primaryRef.table}.{primaryRef.field}: {primaryRef.value}
            </span>
          )}
          {expanded && (
            <p className="text-[11px] text-[rgba(249,249,249,0.55)] mt-2 leading-relaxed">
              {insight.body}
            </p>
          )}
        </div>
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
          style={{
            color: "#C5A059",
            background: "rgba(197,160,89,0.12)",
          }}
        >
          {Math.round(insight.confidence * 100)}%
        </span>
      </div>
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export function HealthScoreWidget() {
  const { user } = useAuth();
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [complianceScore, setComplianceScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    setLoading(true);

    // Load latest health score (via tenant)
    const { data: tenantData } = await (supabase as any)
      .from("tenants")
      .select("id")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (tenantData?.id) {
      const { data: hs } = await (supabase as any)
        .from("health_scores")
        .select("score, color, rationale_text, created_at")
        .eq("tenant_id", tenantData.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (hs) setHealthScore(hs as HealthScore);
    }

    // Load top 3 latest AI insights of type 'need'
    const { data: insightData } = await (supabase as any)
      .from("ai_insights")
      .select("id, insight_type, title, body, confidence, source_refs, created_at")
      .eq("customer_user_id", user.id)
      .eq("insight_type", "need")
      .eq("dismissed", false)
      .order("created_at", { ascending: false })
      .limit(3);

    if (insightData) setInsights(insightData as AIInsight[]);

    // Calculate compliance (business days with kpi_entries in last 30d)
    const since30d = new Date();
    since30d.setDate(since30d.getDate() - 30);
    const { data: entries } = await (supabase as any)
      .from("kpi_entries")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", since30d.toISOString().split("T")[0]);

    if (entries) {
      const uniqueDays = new Set(entries.map((e: { date: string }) => e.date)).size;
      let businessDays = 0;
      for (let d = new Date(since30d); d <= new Date(); d.setDate(d.getDate() + 1)) {
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) businessDays++;
      }
      setComplianceScore(businessDays > 0 ? Math.round((uniqueDays / businessDays) * 100) : 0);
    }

    setLoading(false);
  }

  async function triggerAIConcierge() {
    if (!user) return;
    setRefreshing(true);
    try {
      await supabase.functions.invoke("ai-concierge", {
        body: { userId: user.id },
      });
      await loadData();
    } catch (err) {
      console.error("[HealthScoreWidget] ai-concierge error:", err);
    } finally {
      setRefreshing(false);
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="glass-panel fade-up">
        <div className="relative z-[2] flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // No data yet — prompt user to run analysis
  if (!healthScore && insights.length === 0) {
    return (
      <div className="glass-panel fade-up">
        <div className="relative z-[2]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">
                AI Analyse
              </span>
              <h2 className="text-[15px] text-white" style={{ fontFamily: "var(--font-serif)" }}>
                Health Score
              </h2>
            </div>
            <Sparkles className="w-5 h-5 text-[#C5A059]" />
          </div>
          <p className="text-[12px] text-[rgba(249,249,249,0.45)] mb-4">
            Noch keine Analyse verfügbar. Starte jetzt die KI-Auswertung deiner Daten.
          </p>
          <button
            onClick={triggerAIConcierge}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-[12px] font-semibold text-white transition disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #C5A059, #775A19)",
              boxShadow: "0 0 18px rgba(197,160,89,0.3)",
            }}
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Jetzt analysieren
          </button>
        </div>
      </div>
    );
  }

  const cfg = healthScore ? STATUS_CONFIG[healthScore.color] : null;
  const StatusIcon = cfg?.icon ?? Sparkles;

  return (
    <div className="glass-panel fade-up">
      <div className="relative z-[2] space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">
              AI Analyse
            </span>
            <h2 className="text-[15px] text-white" style={{ fontFamily: "var(--font-serif)" }}>
              Health Score
            </h2>
          </div>
          <button
            onClick={triggerAIConcierge}
            disabled={refreshing}
            title="Analyse aktualisieren"
            className="p-1.5 rounded-lg text-[rgba(249,249,249,0.3)] hover:bg-[rgba(249,249,249,0.05)] hover:text-[#C5A059] transition disabled:opacity-40"
          >
            {refreshing
              ? <Loader2 className="w-4 h-4 animate-spin text-[#C5A059]" />
              : <Sparkles className="w-4 h-4" />}
          </button>
        </div>

        {/* Score + Status row */}
        {healthScore && cfg && (
          <div
            className="flex items-center gap-4 rounded-xl p-3"
            style={{ background: cfg.bgColor, border: `1px solid ${cfg.borderColor}` }}
          >
            <ScoreRing score={healthScore.score} color={healthScore.color} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <StatusIcon className="w-3.5 h-3.5" style={{ color: cfg.textColor }} />
                <span className="text-[12px] font-bold" style={{ color: cfg.textColor }}>
                  {cfg.label}
                </span>
              </div>
              {healthScore.rationale_text && (
                <p className="text-[11px] text-[rgba(249,249,249,0.5)] leading-snug line-clamp-2">
                  {healthScore.rationale_text}
                </p>
              )}
              <p className="text-[10px] text-[rgba(249,249,249,0.25)] mt-1">
                {new Date(healthScore.created_at).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        )}

        {/* Compliance bar */}
        {complianceScore !== null && (
          <ComplianceBar pct={complianceScore} />
        )}

        {/* AI Insights */}
        {insights.length > 0 && (
          <div className="space-y-2">
            <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-[rgba(249,249,249,0.3)]">
              Top Handlungsfelder
            </span>
            {insights.map(insight => (
              <InsightRow key={insight.id} insight={insight} />
            ))}
          </div>
        )}

        {/* Details link */}
        <Link
          to="/dashboard/health"
          className="flex items-center justify-between w-full text-[11px] font-semibold text-[#C5A059] hover:text-[#E9CB8B] transition group"
        >
          <span>Vollständige Analyse anzeigen</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
