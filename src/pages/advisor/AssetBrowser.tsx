// CL-137: Asset Browser
// Route: /dashboard/advisor/assets/:userId

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  CheckCircle2,
  Archive,
  Download,
  Filter,
  X,
  Loader2,
  Image as ImageIcon,
  FileCode,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type AssetStatus = "draft" | "approved" | "published" | "archived";

interface AssetRow {
  id: string;
  user_id: string;
  status: AssetStatus;
  storage_url: string | null;
  format_id: string | null;
  template_id: string | null;
  cost_credits: number | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  // joined
  format_name?: string;
  format_category?: string;
  template_name?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  AssetStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  draft: {
    label: "Entwurf",
    color: "#E9CB8B",
    bg: "rgba(233,203,139,0.1)",
    border: "rgba(233,203,139,0.3)",
  },
  approved: {
    label: "Freigegeben",
    color: "#7FC29B",
    bg: "rgba(127,194,155,0.1)",
    border: "rgba(127,194,155,0.3)",
  },
  published: {
    label: "Publiziert",
    color: "#8BB6E8",
    bg: "rgba(139,182,232,0.1)",
    border: "rgba(139,182,232,0.3)",
  },
  archived: {
    label: "Archiviert",
    color: "rgba(249,249,249,0.3)",
    bg: "rgba(249,249,249,0.05)",
    border: "rgba(249,249,249,0.12)",
  },
};

function StatusBadge({ status }: { status: AssetStatus }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.draft;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.1em]"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Asset Card ────────────────────────────────────────────────────────────────

function AssetCard({
  asset,
  onApprove,
  onArchive,
  actionLoading,
}: {
  asset: AssetRow;
  onApprove: (id: string) => void;
  onArchive: (id: string) => void;
  actionLoading: string | null;
}) {
  const isImage =
    asset.format_category === "image" ||
    (asset.storage_url &&
      /\.(png|jpg|jpeg|webp|gif|svg)(\?|$)/i.test(asset.storage_url));
  const isLoading = actionLoading === asset.id;

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: "rgba(249,249,249,0.025)",
        border: "1px solid rgba(249,249,249,0.07)",
      }}
    >
      {/* Thumbnail */}
      <div
        className="relative flex items-center justify-center"
        style={{ height: 160, background: "rgba(249,249,249,0.03)" }}
      >
        {isImage && asset.storage_url ? (
          <img
            src={asset.storage_url}
            alt={asset.template_name ?? "Asset"}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <FileCode className="w-8 h-8 text-[rgba(249,249,249,0.15)]" />
            <span className="text-[10px] text-[rgba(249,249,249,0.3)] uppercase tracking-wider">
              {asset.format_category ?? "HTML"}
            </span>
          </div>
        )}
        {/* Status badge overlay */}
        <div className="absolute top-2 left-2">
          <StatusBadge status={asset.status} />
        </div>
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex-1">
          {asset.template_name && (
            <p className="text-[13px] font-medium text-white truncate">
              {asset.template_name}
            </p>
          )}
          {asset.format_name && (
            <p className="text-[11px] text-[rgba(249,249,249,0.4)] mt-0.5 truncate">
              {asset.format_name}
            </p>
          )}
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[11px] text-[rgba(249,249,249,0.3)]">
              {fmtDate(asset.created_at)}
            </span>
            {asset.cost_credits != null && (
              <span className="text-[11px] text-[#E9CB8B]">
                {asset.cost_credits} Credits
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-[rgba(249,249,249,0.05)]">
          {asset.status !== "approved" && asset.status !== "archived" && (
            <button
              onClick={() => onApprove(asset.id)}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex-1 justify-center"
              style={{
                background: "rgba(127,194,155,0.1)",
                border: "1px solid rgba(127,194,155,0.3)",
                color: "#7FC29B",
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3 h-3" />
              )}
              Freigeben
            </button>
          )}

          {asset.status !== "archived" && (
            <button
              onClick={() => onArchive(asset.id)}
              disabled={isLoading}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors flex-shrink-0"
              style={{
                background: "rgba(249,249,249,0.05)",
                border: "1px solid rgba(249,249,249,0.1)",
                color: "rgba(249,249,249,0.4)",
                opacity: isLoading ? 0.6 : 1,
              }}
              title="Archivieren"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          )}

          {asset.storage_url && (
            <a
              href={asset.storage_url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors flex-shrink-0"
              style={{
                background: "rgba(197,160,89,0.08)",
                border: "1px solid rgba(197,160,89,0.2)",
                color: "#C5A059",
              }}
              title="Herunterladen"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AssetBrowser() {
  const { userId } = useParams<{ userId: string }>();
  const nav = useNavigate();

  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>("");

  // Filters
  const [filterStatus, setFilterStatus] = useState<AssetStatus | "all">("all");
  const [filterFormat, setFilterFormat] = useState<string>("all");

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      // Load profile name
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .single();
      setCustomerName(
        profile?.full_name ?? profile?.email ?? userId.slice(0, 8)
      );

      // Load assets with format and template info
      const { data: rows, error: err } = await (supabase as any)
        .from("assets")
        .select(
          "id, user_id, status, storage_url, format_id, template_id, cost_credits, metadata_json, created_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (err) throw err;

      // Collect format IDs and template IDs
      const formatIds = [...new Set((rows ?? []).map((r: AssetRow) => r.format_id).filter(Boolean))];
      const templateIds = [...new Set((rows ?? []).map((r: AssetRow) => r.template_id).filter(Boolean))];

      const [{ data: fmts }, { data: tmplts }] = await Promise.all([
        formatIds.length > 0
          ? (supabase as any)
              .from("format_registry")
              .select("id, name, category")
              .in("id", formatIds)
          : Promise.resolve({ data: [] }),
        templateIds.length > 0
          ? (supabase as any)
              .from("templates")
              .select("id, name")
              .in("id", templateIds)
          : Promise.resolve({ data: [] }),
      ]);

      const fmtMap = Object.fromEntries((fmts ?? []).map((f: { id: string; name: string; category: string }) => [f.id, f]));
      const tmplMap = Object.fromEntries((tmplts ?? []).map((t: { id: string; name: string }) => [t.id, t]));

      const enriched: AssetRow[] = (rows ?? []).map((r: AssetRow) => ({
        ...r,
        format_name: r.format_id ? fmtMap[r.format_id]?.name : undefined,
        format_category: r.format_id ? fmtMap[r.format_id]?.category : undefined,
        template_name: r.template_id ? tmplMap[r.template_id]?.name : undefined,
      }));

      setAssets(enriched);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Fehler beim Laden.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(id: string) {
    setActionLoading(id);
    try {
      const { error: err } = await (supabase as any)
        .from("assets")
        .update({ status: "approved" })
        .eq("id", id);
      if (err) throw err;
      setAssets((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "approved" as AssetStatus } : a))
      );
      flash("Asset freigegeben.");
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Fehler.");
    } finally {
      setActionLoading(null);
    }
  }

  async function archive(id: string) {
    setActionLoading(id);
    try {
      const { error: err } = await (supabase as any)
        .from("assets")
        .update({ status: "archived" })
        .eq("id", id);
      if (err) throw err;
      setAssets((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "archived" as AssetStatus } : a))
      );
      flash("Asset archiviert.");
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Fehler.");
    } finally {
      setActionLoading(null);
    }
  }

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  }

  // Derived filter options
  const allFormats = Array.from(
    new Map(
      assets
        .filter((a) => a.format_name)
        .map((a) => [a.format_id!, a.format_name!])
    ).entries()
  );

  const filtered = assets.filter((a) => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (filterFormat !== "all" && a.format_id !== filterFormat) return false;
    return true;
  });

  const hasActiveFilter = filterStatus !== "all" || filterFormat !== "all";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#C5A059]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div
        className="glass-panel"
        style={{
          background: "linear-gradient(135deg, rgba(197,160,89,0.12), rgba(10,11,11,0.6))",
          borderColor: "rgba(197,160,89,0.2)",
        }}
      >
        <div className="relative z-[2] flex items-start justify-between gap-4 flex-wrap">
          <div>
            <button
              onClick={() => nav(-1)}
              className="flex items-center gap-2 text-sm text-[rgba(249,249,249,0.4)] hover:text-white transition mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Zurück
            </button>
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">
              Berater · Asset Browser
            </span>
            <h1 className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>
              {customerName}
              <span className="text-[#C5A059]">.</span>
            </h1>
            <p className="text-[13px] text-[rgba(249,249,249,0.4)] mt-1">
              {assets.length} Asset{assets.length !== 1 ? "s" : ""} gesamt
            </p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] text-[rgba(249,249,249,0.5)] hover:text-white border border-[rgba(249,249,249,0.08)] hover:border-[rgba(197,160,89,0.25)] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Neu laden
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div
          className="glass-panel"
          style={{ borderColor: "rgba(232,116,103,0.3)", background: "rgba(232,116,103,0.06)" }}
        >
          <div className="relative z-[2] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#E87467] flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-[#E87467]">{error}</p>
          </div>
        </div>
      )}
      {successMsg && (
        <div
          className="glass-panel"
          style={{ borderColor: "rgba(127,194,155,0.3)", background: "rgba(127,194,155,0.06)" }}
        >
          <div className="relative z-[2] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#7FC29B]" />
            <p className="text-[13px] text-[#7FC29B]">{successMsg}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-panel">
        <div className="relative z-[2] flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-[rgba(249,249,249,0.3)]" />

          {/* Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as AssetStatus | "all")}
            className="px-3 py-1.5 rounded-lg text-[12px] outline-none"
            style={{
              background: "rgba(249,249,249,0.06)",
              border: "1px solid rgba(249,249,249,0.1)",
              color: filterStatus !== "all" ? "#E9CB8B" : "rgba(249,249,249,0.6)",
            }}
          >
            <option value="all">Alle Status</option>
            <option value="draft">Entwurf</option>
            <option value="approved">Freigegeben</option>
            <option value="published">Publiziert</option>
            <option value="archived">Archiviert</option>
          </select>

          {/* Format */}
          {allFormats.length > 0 && (
            <select
              value={filterFormat}
              onChange={(e) => setFilterFormat(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-[12px] outline-none"
              style={{
                background: "rgba(249,249,249,0.06)",
                border: "1px solid rgba(249,249,249,0.1)",
                color: filterFormat !== "all" ? "#E9CB8B" : "rgba(249,249,249,0.6)",
              }}
            >
              <option value="all">Alle Formate</option>
              {allFormats.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          )}

          {hasActiveFilter && (
            <button
              onClick={() => {
                setFilterStatus("all");
                setFilterFormat("all");
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors"
              style={{
                color: "#E87467",
                background: "rgba(232,116,103,0.08)",
                border: "1px solid rgba(232,116,103,0.2)",
              }}
            >
              <X className="w-3 h-3" /> Zurücksetzen
            </button>
          )}

          <span className="ml-auto text-[11px] text-[rgba(249,249,249,0.3)]">
            {filtered.length} von {assets.length}
          </span>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="glass-panel text-center py-14">
          <div className="relative z-[2]">
            <ImageIcon className="w-10 h-10 text-[rgba(249,249,249,0.07)] mx-auto mb-3" />
            <p className="text-[14px] text-[rgba(249,249,249,0.4)]">
              {assets.length === 0 ? "Keine Assets vorhanden" : "Keine Treffer für diesen Filter"}
            </p>
          </div>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onApprove={approve}
              onArchive={archive}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}
