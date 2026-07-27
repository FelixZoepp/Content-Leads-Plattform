import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, RefreshCw, RotateCcw, Loader2,
  CheckCircle2, Clock, XCircle, Play, AlertCircle,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

type JobStatus = "queued" | "running" | "done" | "failed" | "all";

interface FulfillmentJob {
  id: string;
  status: string;
  provider: string | null;
  attempts: number;
  error: string | null;
  cost: number | null;
  duration_ms: number | null;
  created_at: string;
  updated_at: string;
}

interface SyncJob {
  id: string;
  name: string;
  status: string;
  last_run: string | null;
  next_run: string | null;
  error: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const STATUS_FILTERS: { label: string; value: JobStatus }[] = [
  { label: "Alle", value: "all" },
  { label: "Warteschlange", value: "queued" },
  { label: "Läuft", value: "running" },
  { label: "Erledigt", value: "done" },
  { label: "Fehlgeschlagen", value: "failed" },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; cls: string }> = {
    queued:  { icon: <Clock className="w-3 h-3" />,        cls: "text-blue-400 bg-blue-400/10" },
    running: { icon: <Play className="w-3 h-3" />,         cls: "text-yellow-400 bg-yellow-400/10" },
    done:    { icon: <CheckCircle2 className="w-3 h-3" />, cls: "text-green-400 bg-green-400/10" },
    failed:  { icon: <XCircle className="w-3 h-3" />,      cls: "text-red-400 bg-red-400/10" },
  };
  const s = map[status] ?? { icon: <AlertCircle className="w-3 h-3" />, cls: "text-gray-400 bg-gray-400/10" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${s.cls}`}>
      {s.icon}{status}
    </span>
  );
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function dur(ms: number | null) {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const TH = "px-4 py-2.5 text-left text-[10px] font-bold tracking-wider uppercase text-[rgba(249,249,249,0.25)]";
const TD = "px-4 py-2.5 text-[12px] text-[rgba(249,249,249,0.7)]";

// ─── Component ─────────────────────────────────────────────────────────────

export default function JobMonitor() {
  const nav = useNavigate();
  const [fulfillmentJobs, setFulfillmentJobs] = useState<FulfillmentJob[]>([]);
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<JobStatus>("all");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const load = useCallback(async () => {
    const [{ data: fj }, { data: sj }] = await Promise.all([
      (supabase as any).from("fulfillment_jobs").select("*").order("created_at", { ascending: false }).limit(100),
      (supabase as any).from("sync_jobs").select("*").order("updated_at", { ascending: false }).limit(100),
    ]);
    setFulfillmentJobs(fj || []);
    setSyncJobs(sj || []);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  // Initial load + auto-refresh every 10s
  useEffect(() => {
    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [load]);

  async function retryFulfillmentJob(id: string, currentAttempts: number) {
    setRetrying(id);
    await (supabase as any)
      .from("fulfillment_jobs")
      .update({ status: "queued", attempts: currentAttempts + 1, error: null })
      .eq("id", id);
    await load();
    setRetrying(null);
  }

  async function retrySyncJob(id: string, currentRetries: number) {
    setRetrying(id);
    await (supabase as any)
      .from("sync_jobs")
      .update({ status: "queued", retry_count: currentRetries + 1, error: null })
      .eq("id", id);
    await load();
    setRetrying(null);
  }

  function filterJobs<T extends { status: string }>(jobs: T[]): T[] {
    if (statusFilter === "all") return jobs;
    return jobs.filter(j => j.status === statusFilter);
  }

  const filteredFJ = filterJobs(fulfillmentJobs);
  const filteredSJ = filterJobs(syncJobs);

  // Status counts for filter bar
  const allJobs = [...fulfillmentJobs, ...syncJobs];
  const counts: Record<string, number> = { all: allJobs.length };
  for (const s of ["queued", "running", "done", "failed"]) {
    counts[s] = allJobs.filter(j => j.status === s).length;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#C5A059]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => nav("/dashboard/admin")}
            className="flex items-center gap-2 text-sm text-[rgba(249,249,249,0.4)] hover:text-white transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Admin Dashboard
          </button>
          <h1 className="text-2xl font-bold text-white">Job Monitor</h1>
          <p className="text-sm text-[rgba(249,249,249,0.4)] mt-1">
            Zuletzt aktualisiert: {lastRefresh.toLocaleTimeString("de-DE")} · Auto-Refresh alle 10s
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); load(); }}
          className="flex items-center gap-2 px-4 py-2 border border-[rgba(197,160,89,0.3)] text-[#C5A059] hover:text-white hover:border-[rgba(197,160,89,0.6)] transition rounded-lg text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Aktualisieren
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition border ${
              statusFilter === f.value
                ? "bg-[rgba(197,160,89,0.15)] border-[rgba(197,160,89,0.4)] text-[#E9CB8B]"
                : "border-[rgba(249,249,249,0.08)] text-[rgba(249,249,249,0.5)] hover:border-[rgba(249,249,249,0.15)] hover:text-white"
            }`}
          >
            {f.label}
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusFilter === f.value ? "bg-[rgba(197,160,89,0.2)] text-[#E9CB8B]" : "bg-[rgba(249,249,249,0.06)] text-[rgba(249,249,249,0.4)]"}`}>
              {counts[f.value] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Fulfillment Jobs */}
      <div className="glass-panel" style={{ padding: 0 }}>
        <div className="relative z-[2]">
          <div className="px-5 py-3 border-b border-[rgba(249,249,249,0.06)] flex items-center gap-2">
            <Play className="w-4 h-4 text-[#E9CB8B]" />
            <h2 className="text-[14px] font-bold text-white">Fulfillment Jobs</h2>
            <span className="text-[11px] text-[rgba(249,249,249,0.3)] ml-1">({filteredFJ.length})</span>
          </div>

          {filteredFJ.length === 0 ? (
            <p className="px-5 py-8 text-sm text-[rgba(249,249,249,0.3)] text-center">Keine Jobs gefunden</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(249,249,249,0.06)]">
                    <th className={TH}>Status</th>
                    <th className={TH}>Provider</th>
                    <th className={TH}>Versuche</th>
                    <th className={TH}>Fehler</th>
                    <th className={TH}>Kosten</th>
                    <th className={TH}>Dauer</th>
                    <th className={TH}>Erstellt</th>
                    <th className={TH}>Aktualisiert</th>
                    <th className={TH}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFJ.map(job => (
                    <tr key={job.id} className="border-b border-[rgba(249,249,249,0.03)] hover:bg-[rgba(249,249,249,0.02)] transition">
                      <td className={TD}><StatusBadge status={job.status} /></td>
                      <td className={TD}>
                        {job.provider
                          ? <span className="font-mono text-[11px] bg-[rgba(249,249,249,0.06)] px-2 py-0.5 rounded">{job.provider}</span>
                          : "—"}
                      </td>
                      <td className={TD}>{job.attempts}</td>
                      <td className={TD + " max-w-[200px]"}>
                        {job.error
                          ? <span className="text-red-400 text-[11px] truncate block" title={job.error}>{job.error}</span>
                          : "—"}
                      </td>
                      <td className={TD}>{job.cost !== null ? `€${job.cost.toFixed(4)}` : "—"}</td>
                      <td className={TD}>{dur(job.duration_ms)}</td>
                      <td className={TD + " whitespace-nowrap"}>{fmt(job.created_at)}</td>
                      <td className={TD + " whitespace-nowrap"}>{fmt(job.updated_at)}</td>
                      <td className="px-4 py-2.5">
                        {job.status === "failed" && (
                          <button
                            onClick={() => retryFulfillmentJob(job.id, job.attempts)}
                            disabled={retrying === job.id}
                            className="flex items-center gap-1 text-[11px] text-[#C5A059] hover:text-white transition px-2 py-1 rounded border border-[rgba(197,160,89,0.25)] hover:border-[rgba(197,160,89,0.5)] disabled:opacity-50 whitespace-nowrap"
                          >
                            {retrying === job.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <RotateCcw className="w-3 h-3" />}
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sync Jobs */}
      <div className="glass-panel" style={{ padding: 0 }}>
        <div className="relative z-[2]">
          <div className="px-5 py-3 border-b border-[rgba(249,249,249,0.06)] flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-[#E9CB8B]" />
            <h2 className="text-[14px] font-bold text-white">Sync Jobs</h2>
            <span className="text-[11px] text-[rgba(249,249,249,0.3)] ml-1">({filteredSJ.length})</span>
          </div>

          {filteredSJ.length === 0 ? (
            <p className="px-5 py-8 text-sm text-[rgba(249,249,249,0.3)] text-center">Keine Jobs gefunden</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(249,249,249,0.06)]">
                    <th className={TH}>Name</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Letzter Lauf</th>
                    <th className={TH}>Nächster Lauf</th>
                    <th className={TH}>Fehler</th>
                    <th className={TH}>Wiederholungen</th>
                    <th className={TH}>Aktualisiert</th>
                    <th className={TH}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSJ.map(job => (
                    <tr key={job.id} className="border-b border-[rgba(249,249,249,0.03)] hover:bg-[rgba(249,249,249,0.02)] transition">
                      <td className={TD}>
                        <span className="text-white font-medium text-[13px]">{job.name}</span>
                      </td>
                      <td className={TD}><StatusBadge status={job.status} /></td>
                      <td className={TD + " whitespace-nowrap"}>{fmt(job.last_run)}</td>
                      <td className={TD + " whitespace-nowrap"}>
                        {job.next_run
                          ? <span className={new Date(job.next_run) < new Date() ? "text-yellow-400" : ""}>{fmt(job.next_run)}</span>
                          : "—"}
                      </td>
                      <td className={TD + " max-w-[200px]"}>
                        {job.error
                          ? <span className="text-red-400 text-[11px] truncate block" title={job.error}>{job.error}</span>
                          : "—"}
                      </td>
                      <td className={TD}>{job.retry_count}</td>
                      <td className={TD + " whitespace-nowrap"}>{fmt(job.updated_at)}</td>
                      <td className="px-4 py-2.5">
                        {job.status === "failed" && (
                          <button
                            onClick={() => retrySyncJob(job.id, job.retry_count)}
                            disabled={retrying === job.id}
                            className="flex items-center gap-1 text-[11px] text-[#C5A059] hover:text-white transition px-2 py-1 rounded border border-[rgba(197,160,89,0.25)] hover:border-[rgba(197,160,89,0.5)] disabled:opacity-50 whitespace-nowrap"
                          >
                            {retrying === job.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <RotateCcw className="w-3 h-3" />}
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
