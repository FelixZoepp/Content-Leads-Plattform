import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Loader2, TrendingUp, CheckCircle2, XCircle,
  Zap, AlertCircle, Filter, Search, ChevronDown, ChevronUp,
  ExternalLink, Sparkles,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SignalStatus = "new" | "confirmed" | "dismissed" | "acted_on";

interface UpsellSignal {
  id: string;
  tenant_id: string;
  signal_type: string;
  recommended_offer: string | null;
  rationale: string | null;
  counter_indication: string | null;
  status: SignalStatus;
  created_at: string;
  updated_at: string | null;
  ai_insight_id: string | null;
  tenants?: { company_name: string };
  ai_insights?: { content: string } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SignalStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  new: {
    label: "Neu",
    color: "#E9CB8B",
    bg: "rgba(233,203,139,0.12)",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  confirmed: {
    label: "Bestätigt",
    color: "#7FC29B",
    bg: "rgba(127,194,155,0.12)",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  dismissed: {
    label: "Abgelehnt",
    color: "rgba(249,249,249,0.3)",
    bg: "rgba(249,249,249,0.05)",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  acted_on: {
    label: "Umgesetzt",
    color: "#A78BFA",
    bg: "rgba(167,139,250,0.12)",
    icon: <Zap className="w-3.5 h-3.5" />,
  },
};

const STATUS_ORDER: SignalStatus[] = ["new", "confirmed", "acted_on", "dismissed"];

// ─── Component ────────────────────────────────────────────────────────────────

export default function UpsellSignalsPage() {
  const navigate = useNavigate();
  const [signals, setSignals] = useState<UpsellSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [searchCustomer, setSearchCustomer] = useState("");
  const [filterStatus, setFilterStatus] = useState<SignalStatus | "all">("all");

  useEffect(() => {
    loadSignals();
  }, []);

  async function loadSignals() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("upsell_signals")
      .select("*, tenants(company_name), ai_insights(content)")
      .order("created_at", { ascending: false });
    setSignals(data || []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: SignalStatus) {
    setUpdating(id);
    await (supabase as any)
      .from("upsell_signals")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    setSignals(prev =>
      prev.map(s => s.id === id ? { ...s, status, updated_at: new Date().toISOString() } : s)
    );
    setUpdating(null);
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return signals.filter(s => {
      const matchCustomer = searchCustomer.trim() === "" ||
        (s.tenants?.company_name || "").toLowerCase().includes(searchCustomer.toLowerCase());
      const matchStatus = filterStatus === "all" || s.status === filterStatus;
      return matchCustomer && matchStatus;
    });
  }, [signals, searchCustomer, filterStatus]);

  const grouped = useMemo(() => {
    const map: Partial<Record<SignalStatus, UpsellSignal[]>> = {};
    for (const status of STATUS_ORDER) {
      const items = filtered.filter(s => s.status === status);
      if (items.length > 0) map[status] = items;
    }
    return map;
  }, [filtered]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: signals.length };
    for (const s of STATUS_ORDER) c[s] = signals.filter(x => x.status === s).length;
    return c;
  }, [signals]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate("/dashboard/admin")}
          className="flex items-center gap-2 text-sm text-[rgba(249,249,249,0.4)] hover:text-white transition mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Admin Dashboard
        </button>
        <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">CL-157</span>
        <h1 className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>Upsell Signals</h1>
        <p className="text-[12px] text-[rgba(249,249,249,0.4)] mt-0.5">
          {counts.all} Signale gesamt · {counts.new || 0} neu
        </p>
      </div>

      {/* Filter bar */}
      <div className="glass-panel">
        <div className="relative z-[2] flex flex-col sm:flex-row gap-3">
          {/* Customer search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgba(249,249,249,0.25)]" />
            <input
              value={searchCustomer}
              onChange={e => setSearchCustomer(e.target.value)}
              placeholder="Kunde suchen…"
              className="w-full pl-8 pr-3 py-2 bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.08)] rounded-lg text-[12px] text-white placeholder:text-[rgba(249,249,249,0.2)] outline-none focus:border-[rgba(197,160,89,0.3)] transition"
            />
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-[rgba(249,249,249,0.3)] shrink-0" />
            {(["all", ...STATUS_ORDER] as const).map(s => {
              const active = filterStatus === s;
              const cfg = s !== "all" ? STATUS_CONFIG[s] : null;
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s as SignalStatus | "all")}
                  className="px-3 py-1 rounded-full text-[10px] font-semibold transition border"
                  style={{
                    background: active ? (cfg?.bg || "rgba(197,160,89,0.12)") : "transparent",
                    color: active ? (cfg?.color || "#E9CB8B") : "rgba(249,249,249,0.35)",
                    borderColor: active ? (cfg?.color || "#E9CB8B") + "55" : "rgba(249,249,249,0.08)",
                  }}
                >
                  {s === "all" ? `Alle (${counts.all})` : `${STATUS_CONFIG[s].label} (${counts[s] || 0})`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[rgba(249,249,249,0.3)]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel text-center py-16">
          <div className="relative z-[2]">
            <TrendingUp className="w-12 h-12 text-[rgba(249,249,249,0.08)] mx-auto mb-3" />
            <p className="text-[13px] text-[rgba(249,249,249,0.4)]">
              {signals.length === 0 ? "Noch keine Upsell-Signale vorhanden." : "Keine Signale für diesen Filter."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {STATUS_ORDER.map(status => {
            const items = grouped[status];
            if (!items) return null;
            const cfg = STATUS_CONFIG[status];
            return (
              <div key={status} className="space-y-2">
                {/* Group header */}
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ color: cfg.color }}>{cfg.icon}</span>
                  <span
                    className="text-[10px] font-bold tracking-[0.25em] uppercase"
                    style={{ color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                  <span className="text-[10px] text-[rgba(249,249,249,0.25)]">({items.length})</span>
                  <div className="flex-1 h-px bg-[rgba(249,249,249,0.05)]" />
                </div>

                {/* Signal cards */}
                {items.map(signal => {
                  const isExpanded = expandedId === signal.id;
                  const isUpdating = updating === signal.id;
                  return (
                    <div
                      key={signal.id}
                      className="glass-panel transition"
                      style={{ padding: 0 }}
                    >
                      {/* Main row */}
                      <div
                        className="relative z-[2] px-5 py-4 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : signal.id)}
                      >
                        <div className="flex items-start gap-4">
                          {/* Signal type icon */}
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                            style={{ background: cfg.bg, border: `1px solid ${cfg.color}33` }}
                          >
                            <TrendingUp className="w-4 h-4" style={{ color: cfg.color }} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[14px] font-semibold text-white">
                                {signal.tenants?.company_name || "Unbekannt"}
                              </span>
                              <span
                                className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide"
                                style={{ color: cfg.color, background: cfg.bg }}
                              >
                                {signal.signal_type}
                              </span>
                              {signal.ai_insight_id && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] text-[#E9CB8B] bg-[rgba(233,203,139,0.08)] border border-[rgba(233,203,139,0.15)]">
                                  <Sparkles className="w-2.5 h-2.5" /> KI-Insight
                                </span>
                              )}
                            </div>
                            {signal.recommended_offer && (
                              <p className="text-[12px] text-[rgba(249,249,249,0.6)] mt-0.5 truncate">
                                <span className="text-[rgba(249,249,249,0.3)]">Angebot: </span>
                                {signal.recommended_offer}
                              </p>
                            )}
                            <p className="text-[10px] text-[rgba(249,249,249,0.25)] mt-1">
                              {new Date(signal.created_at).toLocaleDateString("de-DE", {
                                day: "2-digit", month: "2-digit", year: "numeric",
                              })}
                            </p>
                          </div>

                          {/* Expand toggle */}
                          <div className="shrink-0 text-[rgba(249,249,249,0.2)]">
                            {isExpanded
                              ? <ChevronUp className="w-4 h-4" />
                              : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="relative z-[2] px-5 pb-5 border-t border-[rgba(249,249,249,0.05)] pt-4 space-y-4">
                          {/* Rationale & counter-indication */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {signal.rationale && (
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.3)]">
                                  Begründung
                                </p>
                                <p className="text-[12px] text-[rgba(249,249,249,0.7)] leading-relaxed">
                                  {signal.rationale}
                                </p>
                              </div>
                            )}
                            {signal.counter_indication && (
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.3)]">
                                  Gegenargument
                                </p>
                                <p className="text-[12px] text-[rgba(232,116,103,0.8)] leading-relaxed">
                                  {signal.counter_indication}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Linked AI insight */}
                          {signal.ai_insights?.content && (
                            <div
                              className="rounded-lg p-3 space-y-1"
                              style={{ background: "rgba(233,203,139,0.05)", border: "1px solid rgba(233,203,139,0.12)" }}
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                <Sparkles className="w-3 h-3 text-[#E9CB8B]" />
                                <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#E9CB8B]">
                                  KI-Insight
                                </span>
                              </div>
                              <p className="text-[11px] text-[rgba(249,249,249,0.6)] leading-relaxed line-clamp-3">
                                {signal.ai_insights.content}
                              </p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            {signal.status !== "confirmed" && (
                              <button
                                onClick={() => updateStatus(signal.id, "confirmed")}
                                disabled={isUpdating}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition disabled:opacity-50"
                                style={{ background: "rgba(127,194,155,0.15)", color: "#7FC29B", border: "1px solid rgba(127,194,155,0.25)" }}
                              >
                                {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                Bestätigen
                              </button>
                            )}
                            {signal.status !== "acted_on" && (
                              <button
                                onClick={() => updateStatus(signal.id, "acted_on")}
                                disabled={isUpdating}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition disabled:opacity-50"
                                style={{ background: "rgba(167,139,250,0.15)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.25)" }}
                              >
                                {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                                Umgesetzt
                              </button>
                            )}
                            {signal.status !== "dismissed" && (
                              <button
                                onClick={() => updateStatus(signal.id, "dismissed")}
                                disabled={isUpdating}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition disabled:opacity-50"
                                style={{ background: "rgba(249,249,249,0.05)", color: "rgba(249,249,249,0.4)", border: "1px solid rgba(249,249,249,0.08)" }}
                              >
                                {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                                Ablehnen
                              </button>
                            )}
                            <button
                              onClick={() => navigate("/dashboard/admin/pitch-generator")}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white transition ml-auto"
                              style={{ background: "linear-gradient(135deg, #C5A059, #775A19)", boxShadow: "0 0 14px rgba(197,160,89,0.3)" }}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Pitch erstellen
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
