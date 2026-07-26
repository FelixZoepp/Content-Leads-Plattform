import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Users, TrendingUp, TrendingDown, Minus,
  BarChart3, ChevronRight, RefreshCw
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CustomerRow {
  customer_user_id: string;
  full_name: string | null;
  email: string | null;
  tenantId: string | null;
  latest: MetricsRow | null;
  previous: MetricsRow | null;
}

interface MetricsRow {
  period_date: string;
  posts: string | null;
  leads_total: number | null;
  calls_made: number | null;
  deals: number | null;
  revenue: number | null;
  impressions: number | null;
  dms_sent: number | null;
  source?: string | null; // not yet in DB schema, soft-handled
}

// ── Benchmark thresholds (weekly) ────────────────────────────────────────────
const BENCHMARKS: Record<string, { green: number; amber: number }> = {
  posts: { green: 3, amber: 1 },
  leads_total: { green: 10, amber: 3 },
  calls_made: { green: 20, amber: 5 },
  deals: { green: 2, amber: 1 },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function numVal(v: number | null | undefined): number {
  return typeof v === "number" ? v : 0;
}

function postsCount(raw: string | null): number {
  if (!raw) return 0;
  // stored as comma-separated URLs or a plain count string
  if (!raw.includes(",") && !isNaN(Number(raw))) return Number(raw);
  return raw.split(",").filter(Boolean).length;
}

type Status = "green" | "amber" | "red" | "neutral";

function benchmarkStatus(key: string, value: number): Status {
  const b = BENCHMARKS[key];
  if (!b) return "neutral";
  if (value >= b.green) return "green";
  if (value >= b.amber) return "amber";
  return "red";
}

function statusColor(s: Status): string {
  return s === "green" ? "#7FC29B" : s === "amber" ? "#E9CB8B" : s === "red" ? "#E87467" : "rgba(249,249,249,0.3)";
}

function statusBg(s: Status): string {
  return s === "green"
    ? "rgba(127,194,155,0.12)"
    : s === "amber"
    ? "rgba(233,203,139,0.12)"
    : s === "red"
    ? "rgba(232,116,103,0.12)"
    : "rgba(249,249,249,0.04)";
}

interface TrendProps {
  current: number;
  previous: number;
}
function Trend({ current, previous }: TrendProps) {
  if (previous === 0 && current === 0) {
    return <Minus className="w-3.5 h-3.5 text-[rgba(249,249,249,0.2)]" />;
  }
  if (current > previous) {
    return <TrendingUp className="w-3.5 h-3.5 text-[#7FC29B]" />;
  }
  if (current < previous) {
    return <TrendingDown className="w-3.5 h-3.5 text-[#E87467]" />;
  }
  return <Minus className="w-3.5 h-3.5 text-[rgba(249,249,249,0.3)]" />;
}

interface SourceBadgeProps {
  source?: string | null;
}
function SourceBadge({ source }: SourceBadgeProps) {
  if (!source) return null;
  const label =
    source === "api_heyreach"
      ? "HeyReach"
      : source === "api_sheet"
      ? "Sheet"
      : "Manuell";
  const color =
    source === "api_heyreach"
      ? "#8BB6E8"
      : source === "api_sheet"
      ? "#B49AE8"
      : "rgba(249,249,249,0.35)";
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-[0.08em] uppercase"
      style={{ color, background: `${color}18`, border: `1px solid ${color}40` }}
    >
      {label}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdvisorKPIPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const advisorName = user?.user_metadata?.name?.split(" ")[0] || "Berater";

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData(isRefresh = false) {
    if (!user) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);

    try {
      // 1. Get all assignments for this advisor
      const { data: assignments, error: aErr } = await (supabase as any)
        .from("advisor_assignments")
        .select("customer_user_id")
        .eq("advisor_user_id", user.id);

      if (aErr) throw aErr;
      if (!assignments?.length) {
        setRows([]);
        return;
      }

      const customerUserIds: string[] = assignments.map((a: any) => a.customer_user_id);

      // 2. Fetch profiles for display names
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, email")
        .in("id", customerUserIds);

      const profileMap: Record<string, { full_name: string | null; email: string | null }> = {};
      for (const p of profiles || []) profileMap[p.id] = p;

      // 3. Fetch tenants to get tenant_id (metrics_snapshot links to tenant not user)
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, user_id")
        .in("user_id", customerUserIds);

      const tenantMap: Record<string, string> = {};
      for (const t of tenants || []) tenantMap[t.user_id] = t.id;

      // 4. For each customer load latest 2 metrics_snapshot rows
      const enriched: CustomerRow[] = await Promise.all(
        customerUserIds.map(async (uid: string) => {
          const profile = profileMap[uid] || { full_name: null, email: null };
          const tid = tenantMap[uid] || null;

          let latest: MetricsRow | null = null;
          let previous: MetricsRow | null = null;

          if (tid) {
            const { data: snaps } = await supabase
              .from("metrics_snapshot")
              .select(
                "period_date,posts,leads_total,calls_made,deals,revenue,impressions,dms_sent"
              )
              .eq("tenant_id", tid)
              .order("period_date", { ascending: false })
              .limit(2);

            if (snaps && snaps.length > 0) latest = snaps[0] as MetricsRow;
            if (snaps && snaps.length > 1) previous = snaps[1] as MetricsRow;
          }

          return {
            customer_user_id: uid,
            full_name: profile.full_name,
            email: profile.email,
            tenantId: tid,
            latest,
            previous,
          };
        })
      );

      setRows(enriched);
    } catch (err: any) {
      console.error("AdvisorKPIPage load error:", err);
      setError(err?.message || "Fehler beim Laden.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Derived stats
  const withData = rows.filter((r) => r.latest !== null).length;
  const noData = rows.length - withData;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="glass-panel fade-up"
        style={{
          background: "linear-gradient(135deg, rgba(197,160,89,0.14), rgba(10,11,11,0.6))",
          borderColor: "rgba(197,160,89,0.2)",
        }}
      >
        <div className="relative z-[2] flex items-start justify-between">
          <div>
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">
              Berater · KPI-Übersicht
            </span>
            <h1
              className="text-2xl text-white"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Kunden-KPIs<span className="text-[#C5A059]">.</span>
            </h1>
            <p className="text-[13px] text-[rgba(249,249,249,0.5)] mt-1">
              {rows.length} zugewiesene Kunden · {withData} mit Daten ·{" "}
              {noData} ohne Eintrag
            </p>
          </div>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-[rgba(249,249,249,0.5)] hover:text-white border border-[rgba(249,249,249,0.08)] hover:border-[rgba(197,160,89,0.25)] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Aktualisieren
          </button>
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div
          className="glass-panel"
          style={{ borderColor: "rgba(232,116,103,0.3)", background: "rgba(232,116,103,0.06)" }}
        >
          <p className="relative z-[2] text-[13px] text-[#E87467]">{error}</p>
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {rows.length === 0 && !error && (
        <div className="glass-panel fade-up text-center py-14">
          <div className="relative z-[2]">
            <Users className="w-12 h-12 text-[rgba(249,249,249,0.07)] mx-auto mb-3" />
            <p className="text-[14px] text-[rgba(249,249,249,0.5)]">
              Noch keine Kunden zugewiesen
            </p>
            <p className="text-[11px] text-[rgba(249,249,249,0.3)] mt-1">
              Kunden werden dir vom Admin in <code>advisor_assignments</code> zugeordnet
            </p>
          </div>
        </div>
      )}

      {/* ── KPI Table ──────────────────────────────────────────────────────── */}
      {rows.length > 0 && (
        <div className="glass-panel fade-up" style={{ animationDelay: "80ms" }}>
          <div className="relative z-[2]">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 className="w-4 h-4 text-[#C5A059]" />
              <span
                className="text-[15px] font-semibold text-white"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Letzte Snapshot-Periode
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[rgba(249,249,249,0.07)]">
                    <th className="text-left pb-3 text-[9px] font-bold tracking-[0.25em] uppercase text-[rgba(249,249,249,0.35)] pr-4 min-w-[160px]">
                      Kunde
                    </th>
                    <th className="text-right pb-3 text-[9px] font-bold tracking-[0.25em] uppercase text-[rgba(249,249,249,0.35)] px-3">
                      Posts
                    </th>
                    <th className="text-right pb-3 text-[9px] font-bold tracking-[0.25em] uppercase text-[rgba(249,249,249,0.35)] px-3">
                      Leads
                    </th>
                    <th className="text-right pb-3 text-[9px] font-bold tracking-[0.25em] uppercase text-[rgba(249,249,249,0.35)] px-3">
                      Calls
                    </th>
                    <th className="text-right pb-3 text-[9px] font-bold tracking-[0.25em] uppercase text-[rgba(249,249,249,0.35)] px-3">
                      Deals
                    </th>
                    <th className="text-right pb-3 text-[9px] font-bold tracking-[0.25em] uppercase text-[rgba(249,249,249,0.35)] px-3">
                      Periode
                    </th>
                    <th className="text-right pb-3 text-[9px] font-bold tracking-[0.25em] uppercase text-[rgba(249,249,249,0.35)] pl-3">
                      Quelle
                    </th>
                    <th className="pb-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const displayName =
                      row.full_name || row.email || row.customer_user_id.slice(0, 8);
                    const initials = displayName.substring(0, 2).toUpperCase();

                    const l = row.latest;
                    const p = row.previous;

                    const curPosts = postsCount(l?.posts ?? null);
                    const prevPosts = postsCount(p?.posts ?? null);
                    const curLeads = numVal(l?.leads_total);
                    const prevLeads = numVal(p?.leads_total);
                    const curCalls = numVal(l?.calls_made);
                    const prevCalls = numVal(p?.calls_made);
                    const curDeals = numVal(l?.deals);
                    const prevDeals = numVal(p?.deals);

                    const postsSt = benchmarkStatus("posts", curPosts);
                    const leadsSt = benchmarkStatus("leads_total", curLeads);
                    const callsSt = benchmarkStatus("calls_made", curCalls);
                    const dealsSt = benchmarkStatus("deals", curDeals);

                    return (
                      <tr
                        key={row.customer_user_id}
                        className="border-b border-[rgba(249,249,249,0.05)] hover:bg-[rgba(249,249,249,0.02)] transition-colors"
                        style={{ animationDelay: `${i * 40}ms` }}
                      >
                        {/* Kunde */}
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold text-[#E9CB8B] flex-shrink-0"
                              style={{
                                background:
                                  "linear-gradient(135deg, rgba(197,160,89,0.2), rgba(119,90,25,0.1))",
                                border: "1px solid rgba(197,160,89,0.2)",
                              }}
                            >
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[13px] font-semibold text-white truncate max-w-[120px]">
                                {displayName}
                              </div>
                              {!l && (
                                <span className="text-[10px] text-[rgba(249,249,249,0.25)] italic">
                                  kein Eintrag
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Posts */}
                        <td className="py-3 px-3 text-right">
                          {l ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Trend current={curPosts} previous={prevPosts} />
                              <span
                                className="px-2 py-0.5 rounded-md text-[12px] font-semibold"
                                style={{
                                  color: statusColor(postsSt),
                                  background: statusBg(postsSt),
                                }}
                              >
                                {curPosts}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[rgba(249,249,249,0.18)]">—</span>
                          )}
                        </td>

                        {/* Leads */}
                        <td className="py-3 px-3 text-right">
                          {l ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Trend current={curLeads} previous={prevLeads} />
                              <span
                                className="px-2 py-0.5 rounded-md text-[12px] font-semibold"
                                style={{
                                  color: statusColor(leadsSt),
                                  background: statusBg(leadsSt),
                                }}
                              >
                                {curLeads}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[rgba(249,249,249,0.18)]">—</span>
                          )}
                        </td>

                        {/* Calls */}
                        <td className="py-3 px-3 text-right">
                          {l ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Trend current={curCalls} previous={prevCalls} />
                              <span
                                className="px-2 py-0.5 rounded-md text-[12px] font-semibold"
                                style={{
                                  color: statusColor(callsSt),
                                  background: statusBg(callsSt),
                                }}
                              >
                                {curCalls}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[rgba(249,249,249,0.18)]">—</span>
                          )}
                        </td>

                        {/* Deals */}
                        <td className="py-3 px-3 text-right">
                          {l ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Trend current={curDeals} previous={prevDeals} />
                              <span
                                className="px-2 py-0.5 rounded-md text-[12px] font-semibold"
                                style={{
                                  color: statusColor(dealsSt),
                                  background: statusBg(dealsSt),
                                }}
                              >
                                {curDeals}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[rgba(249,249,249,0.18)]">—</span>
                          )}
                        </td>

                        {/* Periode */}
                        <td className="py-3 px-3 text-right text-[11px] text-[rgba(249,249,249,0.35)]">
                          {l?.period_date
                            ? new Date(l.period_date).toLocaleDateString("de-DE", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "2-digit",
                              })
                            : "—"}
                        </td>

                        {/* Quelle */}
                        <td className="py-3 pl-3 text-right">
                          <SourceBadge source={(l as any)?.source} />
                        </td>

                        {/* Link */}
                        <td className="py-3 pl-2 text-right">
                          <Link
                            to={`/dashboard/advisor`}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors ml-auto"
                            style={{
                              background: "rgba(249,249,249,0.03)",
                              border: "1px solid rgba(249,249,249,0.07)",
                              color: "rgba(249,249,249,0.3)",
                            }}
                            title="Kundendetails"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-[rgba(249,249,249,0.06)] flex items-center gap-5 flex-wrap">
              <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-[rgba(249,249,249,0.2)]">
                Benchmark
              </span>
              {[
                { label: "Erreicht", color: "#7FC29B", bg: "rgba(127,194,155,0.12)" },
                { label: "Achtung", color: "#E9CB8B", bg: "rgba(233,203,139,0.12)" },
                { label: "Kritisch", color: "#E87467", bg: "rgba(232,116,103,0.12)" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm inline-block"
                    style={{ background: s.bg, border: `1px solid ${s.color}40` }}
                  />
                  <span className="text-[10px] text-[rgba(249,249,249,0.35)]">{s.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-3 ml-auto text-[rgba(249,249,249,0.2)] text-[10px]">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-[#7FC29B]" /> vs. Vorperiode gestiegen
                </span>
                <span className="flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-[#E87467]" /> gesunken
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
