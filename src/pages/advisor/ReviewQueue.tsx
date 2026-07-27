// CL-139: Review Queue
// Route: /dashboard/advisor/review
// Shows all pending content_items (draft/review) across assigned customers,
// grouped by customer with batch-approve and per-item actions.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  CheckCircle2,
  CheckCheck,
  XCircle,
  Edit3,
  RefreshCw,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Filter,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Calendar,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ContentStatus = "draft" | "review" | "approved" | "idea";

interface ContentItemRow {
  id: string;
  user_id: string;
  title: string | null;
  body: string | null;
  content_type: string | null;
  content_pillar: string | null;
  status: ContentStatus;
  scheduled_date: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  // joined
  customer_name?: string;
  customer_email?: string;
}

interface AssetRow {
  id: string;
  user_id: string;
  status: string;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  customer_name?: string;
  customer_email?: string;
}

interface GroupedContent {
  userId: string;
  customerName: string;
  items: ContentItemRow[];
  assets: AssetRow[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { color: string; bg: string; border: string; label: string }> = {
  draft: {
    color: "#E9CB8B",
    bg: "rgba(233,203,139,0.1)",
    border: "rgba(233,203,139,0.3)",
    label: "Entwurf",
  },
  review: {
    color: "#8BB6E8",
    bg: "rgba(139,182,232,0.1)",
    border: "rgba(139,182,232,0.3)",
    label: "Review",
  },
  approved: {
    color: "#7FC29B",
    bg: "rgba(127,194,155,0.1)",
    border: "rgba(127,194,155,0.3)",
    label: "Freigegeben",
  },
  idea: {
    color: "rgba(249,249,249,0.4)",
    bg: "rgba(249,249,249,0.05)",
    border: "rgba(249,249,249,0.12)",
    label: "Idee",
  },
};

const TYPE_COLORS: Record<string, string> = {
  lead_post: "#C5A059",
  content_post: "#8BB6E8",
  sales_script: "#B49AE8",
  linkedin_post: "#C5A059",
  carousel: "#7FC29B",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_COLORS[status] ?? STATUS_COLORS.draft;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.1em]"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  const color = TYPE_COLORS[type] ?? "rgba(249,249,249,0.45)";
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.08em]"
      style={{
        color,
        background: `${color}18`,
        border: `1px solid ${color}40`,
      }}
    >
      {type.replace(/_/g, " ")}
    </span>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{
          background: "rgba(14,15,15,0.98)",
          border: "1px solid rgba(197,160,89,0.25)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        <p className="text-[14px] text-[rgba(249,249,249,0.85)]">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-[12px] font-semibold transition-colors"
            style={{
              background: "rgba(249,249,249,0.06)",
              border: "1px solid rgba(249,249,249,0.1)",
              color: "rgba(249,249,249,0.6)",
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-[12px] font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, #C5A059, #E9CB8B)",
              color: "#0A0B0B",
            }}
          >
            Bestätigen
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────

function EditModal({
  item,
  onSave,
  onClose,
}: {
  item: ContentItemRow;
  onSave: (id: string, title: string, body: string) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(item.title ?? "");
  const [body, setBody] = useState(item.body ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(item.id, title, body);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div
        className="w-full max-w-lg rounded-2xl p-6 space-y-4"
        style={{
          background: "rgba(14,15,15,0.98)",
          border: "1px solid rgba(197,160,89,0.25)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        <div className="flex items-center justify-between">
          <h3
            className="text-[16px] font-semibold text-white"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Beitrag bearbeiten
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[rgba(249,249,249,0.4)] hover:text-white transition-colors"
            style={{ background: "rgba(249,249,249,0.06)" }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[rgba(249,249,249,0.4)] mb-1.5">
            Titel
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-[13px] text-white outline-none transition-colors"
            style={{
              background: "rgba(249,249,249,0.04)",
              border: "1px solid rgba(249,249,249,0.1)",
            }}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[rgba(249,249,249,0.4)] mb-1.5">
            Inhalt
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="w-full px-3 py-2.5 rounded-xl text-[13px] text-white outline-none resize-none transition-colors"
            style={{
              background: "rgba(249,249,249,0.04)",
              border: "1px solid rgba(249,249,249,0.1)",
            }}
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-[12px] font-semibold transition-colors"
            style={{
              background: "rgba(249,249,249,0.06)",
              border: "1px solid rgba(249,249,249,0.1)",
              color: "rgba(249,249,249,0.6)",
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, #C5A059, #E9CB8B)",
              color: "#0A0B0B",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReviewQueue() {
  const { user } = useAuth();

  const [contentItems, setContentItems] = useState<ContentItemRow[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [filterCustomer, setFilterCustomer] = useState<string>("all");
  const [filterPillar, setFilterPillar] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "review">("all");

  // UI state
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [editingItem, setEditingItem] = useState<ContentItemRow | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // Load content_items that need review — for all customers the advisor manages
      // We load items assigned to any user (advisor sees all)
      const { data: itemRows, error: itemErr } = await (supabase as any)
        .from("content_items")
        .select("id, user_id, title, body, content_type, content_pillar, status, scheduled_date, metadata, created_at")
        .in("status", ["draft", "review"])
        .order("scheduled_date", { ascending: true, nullsFirst: false });

      if (itemErr) throw itemErr;

      // Load draft assets from fulfillment_jobs
      const { data: assetRows, error: assetErr } = await (supabase as any)
        .from("assets")
        .select("id, user_id, status, metadata_json, created_at")
        .eq("status", "draft")
        .order("created_at", { ascending: false });

      if (assetErr) throw assetErr;

      // Collect all user_ids to fetch profiles
      const allUserIds = new Set<string>([
        ...((itemRows as ContentItemRow[]) ?? []).map((r) => r.user_id),
        ...((assetRows as AssetRow[]) ?? []).map((r) => r.user_id),
      ]);

      const profileMap: Record<string, { full_name: string | null; email: string | null }> = {};
      if (allUserIds.size > 0) {
        const { data: profiles } = await (supabase as any)
          .from("profiles")
          .select("id, full_name, email")
          .in("id", Array.from(allUserIds));
        for (const p of profiles ?? []) {
          profileMap[p.id] = { full_name: p.full_name, email: p.email };
        }
      }

      const enrichedItems: ContentItemRow[] = ((itemRows as ContentItemRow[]) ?? []).map((r) => ({
        ...r,
        customer_name: profileMap[r.user_id]?.full_name ?? profileMap[r.user_id]?.email ?? r.user_id.slice(0, 8),
        customer_email: profileMap[r.user_id]?.email ?? undefined,
      }));

      const enrichedAssets: AssetRow[] = ((assetRows as AssetRow[]) ?? []).map((r) => ({
        ...r,
        customer_name: profileMap[r.user_id]?.full_name ?? profileMap[r.user_id]?.email ?? r.user_id.slice(0, 8),
        customer_email: profileMap[r.user_id]?.email ?? undefined,
      }));

      setContentItems(enrichedItems);
      setAssets(enrichedAssets);
    } catch (err: any) {
      setError(err?.message || "Fehler beim Laden.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function approveItem(id: string) {
    setActionLoading(id);
    try {
      const { error: err } = await (supabase as any)
        .from("content_items")
        .update({ status: "approved" })
        .eq("id", id);
      if (err) throw err;
      setContentItems((prev) => prev.filter((i) => i.id !== id));
      flash("Beitrag freigegeben.");
    } catch (err: any) {
      setError(err?.message || "Fehler beim Freigeben.");
    } finally {
      setActionLoading(null);
    }
  }

  async function discardItem(id: string) {
    setActionLoading(id);
    try {
      const { error: err } = await (supabase as any)
        .from("content_items")
        .update({ status: "idea" })
        .eq("id", id);
      if (err) throw err;
      setContentItems((prev) => prev.filter((i) => i.id !== id));
      flash("Beitrag verworfen.");
    } catch (err: any) {
      setError(err?.message || "Fehler.");
    } finally {
      setActionLoading(null);
    }
  }

  async function editItem(id: string, title: string, body: string) {
    const { error: err } = await (supabase as any)
      .from("content_items")
      .update({ title, body })
      .eq("id", id);
    if (err) throw err;
    setContentItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, title, body } : i))
    );
    flash("Beitrag gespeichert.");
  }

  async function approveAllForCustomer(userId: string) {
    const ids = filteredItems
      .filter((i) => i.user_id === userId)
      .map((i) => i.id);
    if (ids.length === 0) return;

    setActionLoading(`batch_${userId}`);
    try {
      const { error: err } = await (supabase as any)
        .from("content_items")
        .update({ status: "approved" })
        .in("id", ids);
      if (err) throw err;
      setContentItems((prev) => prev.filter((i) => !ids.includes(i.id)));
      flash(`${ids.length} Beiträge freigegeben.`);
    } catch (err: any) {
      setError(err?.message || "Fehler beim Batch-Freigeben.");
    } finally {
      setActionLoading(null);
    }
  }

  async function approveAsset(id: string) {
    setActionLoading(`asset_${id}`);
    try {
      const { error: err } = await (supabase as any)
        .from("assets")
        .update({ status: "approved" })
        .eq("id", id);
      if (err) throw err;
      setAssets((prev) => prev.filter((a) => a.id !== id));
      flash("Asset freigegeben.");
    } catch (err: any) {
      setError(err?.message || "Fehler.");
    } finally {
      setActionLoading(null);
    }
  }

  // ── Filter options ───────────────────────────────────────────────────────────

  const allCustomers = Array.from(
    new Map(contentItems.map((i) => [i.user_id, i.customer_name ?? i.user_id])).entries()
  );
  const allPillars = Array.from(new Set(contentItems.map((i) => i.content_pillar).filter(Boolean))) as string[];

  const filteredItems = contentItems.filter((i) => {
    if (filterCustomer !== "all" && i.user_id !== filterCustomer) return false;
    if (filterPillar !== "all" && i.content_pillar !== filterPillar) return false;
    if (filterStatus !== "all" && i.status !== filterStatus) return false;
    return true;
  });

  // Group by customer
  const grouped: GroupedContent[] = [];
  const seenUsers = new Set<string>();

  for (const item of filteredItems) {
    if (!seenUsers.has(item.user_id)) {
      seenUsers.add(item.user_id);
      const customerAssets =
        filterCustomer === "all" || filterCustomer === item.user_id
          ? assets.filter((a) => a.user_id === item.user_id)
          : [];
      grouped.push({
        userId: item.user_id,
        customerName: item.customer_name ?? item.user_id,
        items: filteredItems.filter((i) => i.user_id === item.user_id),
        assets: customerAssets,
      });
    }
  }

  // Also add customers that only have assets (no content_items after filter)
  const assetOnlyUsers = assets.filter(
    (a) =>
      (filterCustomer === "all" || a.user_id === filterCustomer) &&
      !seenUsers.has(a.user_id)
  );
  for (const asset of assetOnlyUsers) {
    if (!seenUsers.has(asset.user_id)) {
      seenUsers.add(asset.user_id);
      grouped.push({
        userId: asset.user_id,
        customerName: asset.customer_name ?? asset.user_id,
        items: [],
        assets: assets.filter((a) => a.user_id === asset.user_id),
      });
    }
  }

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  }

  function toggleGroup(userId: string) {
    setCollapsedGroups((prev) => ({ ...prev, [userId]: !prev[userId] }));
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalPending = filteredItems.length + assets.filter((a) =>
    filterCustomer === "all" || a.user_id === filterCustomer
  ).length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Confirm dialog */}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={() => {
            confirmDialog.onConfirm();
            setConfirmDialog(null);
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Edit modal */}
      {editingItem && (
        <EditModal
          item={editingItem}
          onSave={editItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="glass-panel fade-up"
        style={{
          background: "linear-gradient(135deg, rgba(197,160,89,0.14), rgba(10,11,11,0.6))",
          borderColor: "rgba(197,160,89,0.2)",
        }}
      >
        <div className="relative z-[2] flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">
              Berater · Review
            </span>
            <h1 className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>
              Review Queue<span className="text-[#C5A059]">.</span>
            </h1>
            <p className="text-[13px] text-[rgba(249,249,249,0.5)] mt-1">
              {totalPending > 0
                ? `${totalPending} Elemente warten auf Freigabe`
                : "Alle Beiträge sind freigegeben"}
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

      {/* ── Messages ───────────────────────────────────────────────────────── */}
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
            <CheckCircle2 className="w-4 h-4 text-[#7FC29B] flex-shrink-0" />
            <p className="text-[13px] text-[#7FC29B]">{successMsg}</p>
          </div>
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="glass-panel fade-up" style={{ animationDelay: "60ms" }}>
        <div className="relative z-[2] flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-[rgba(249,249,249,0.3)] flex-shrink-0" />

          {/* Customer filter */}
          <select
            value={filterCustomer}
            onChange={(e) => setFilterCustomer(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-[12px] outline-none"
            style={{
              background: "rgba(249,249,249,0.06)",
              border: "1px solid rgba(249,249,249,0.1)",
              color: filterCustomer !== "all" ? "#E9CB8B" : "rgba(249,249,249,0.6)",
            }}
          >
            <option value="all">Alle Kunden</option>
            {allCustomers.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>

          {/* Pillar filter */}
          {allPillars.length > 0 && (
            <select
              value={filterPillar}
              onChange={(e) => setFilterPillar(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-[12px] outline-none"
              style={{
                background: "rgba(249,249,249,0.06)",
                border: "1px solid rgba(249,249,249,0.1)",
                color: filterPillar !== "all" ? "#E9CB8B" : "rgba(249,249,249,0.6)",
              }}
            >
              <option value="all">Alle Säulen</option>
              {allPillars.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "all" | "draft" | "review")}
            className="px-3 py-1.5 rounded-lg text-[12px] outline-none"
            style={{
              background: "rgba(249,249,249,0.06)",
              border: "1px solid rgba(249,249,249,0.1)",
              color: filterStatus !== "all" ? "#E9CB8B" : "rgba(249,249,249,0.6)",
            }}
          >
            <option value="all">Alle Status</option>
            <option value="draft">Entwurf</option>
            <option value="review">Review</option>
          </select>

          {/* Reset */}
          {(filterCustomer !== "all" || filterPillar !== "all" || filterStatus !== "all") && (
            <button
              onClick={() => {
                setFilterCustomer("all");
                setFilterPillar("all");
                setFilterStatus("all");
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors"
              style={{
                color: "#E87467",
                background: "rgba(232,116,103,0.08)",
                border: "1px solid rgba(232,116,103,0.2)",
              }}
            >
              <X className="w-3 h-3" />
              Zurücksetzen
            </button>
          )}
        </div>
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {grouped.length === 0 && (
        <div className="glass-panel fade-up text-center py-14">
          <div className="relative z-[2]">
            <CheckCheck className="w-12 h-12 text-[rgba(249,249,249,0.07)] mx-auto mb-3" />
            <p className="text-[14px] text-[rgba(249,249,249,0.5)]">Keine offenen Beiträge</p>
            <p className="text-[11px] text-[rgba(249,249,249,0.3)] mt-1">
              Alle Inhalte sind freigegeben oder der Filter zeigt keine Treffer.
            </p>
          </div>
        </div>
      )}

      {/* ── Customer groups ──────────────────────────────────────────────────── */}
      {grouped.map((group, groupIdx) => {
        const isOpen = !collapsedGroups[group.userId];
        const batchLoading = actionLoading === `batch_${group.userId}`;

        return (
          <div
            key={group.userId}
            className="glass-panel fade-up"
            style={{ animationDelay: `${groupIdx * 60}ms` }}
          >
            {/* Group header */}
            <div className="relative z-[2] flex items-center justify-between gap-3 flex-wrap">
              <button
                onClick={() => toggleGroup(group.userId)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[15px] font-semibold text-white"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {group.customerName}
                    </span>
                    <span
                      className="text-[9px] font-bold tracking-[0.1em] px-1.5 py-0.5 rounded uppercase"
                      style={{
                        color: "#E9CB8B",
                        background: "rgba(233,203,139,0.1)",
                        border: "1px solid rgba(233,203,139,0.3)",
                      }}
                    >
                      {group.items.length} Post{group.items.length !== 1 ? "s" : ""}
                      {group.assets.length > 0 &&
                        ` · ${group.assets.length} Asset${group.assets.length !== 1 ? "s" : ""}`}
                    </span>
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-[rgba(249,249,249,0.3)] flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[rgba(249,249,249,0.3)] flex-shrink-0" />
                )}
              </button>

              {/* Alle freigeben button */}
              {group.items.length > 0 && (
                <button
                  onClick={() =>
                    setConfirmDialog({
                      message: `Alle ${group.items.length} Beiträge von ${group.customerName} freigeben?`,
                      onConfirm: () => approveAllForCustomer(group.userId),
                    })
                  }
                  disabled={batchLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #C5A059, #E9CB8B)",
                    color: "#0A0B0B",
                    opacity: batchLoading ? 0.7 : 1,
                  }}
                >
                  {batchLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3.5 h-3.5" />
                  )}
                  Alle freigeben
                </button>
              )}
            </div>

            {/* Content items */}
            {isOpen && (
              <div className="relative z-[2] mt-4 space-y-3">
                {group.items.map((item) => {
                  const isLoading = actionLoading === item.id;
                  const preview = item.body
                    ? item.body.slice(0, 100) + (item.body.length > 100 ? "…" : "")
                    : null;

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl p-4"
                      style={{
                        background: "rgba(249,249,249,0.025)",
                        border: "1px solid rgba(249,249,249,0.07)",
                      }}
                    >
                      <div className="flex items-start gap-3 flex-wrap">
                        {/* Icon */}
                        <FileText className="w-4 h-4 text-[rgba(249,249,249,0.3)] flex-shrink-0 mt-0.5" />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {item.title && (
                              <span className="text-[13px] font-semibold text-white truncate">
                                {item.title}
                              </span>
                            )}
                            <StatusBadge status={item.status} />
                            <TypeBadge type={item.content_type} />
                          </div>

                          {preview && (
                            <p className="text-[12px] text-[rgba(249,249,249,0.55)] leading-relaxed mt-1">
                              {preview}
                            </p>
                          )}

                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {item.scheduled_date && (
                              <span className="flex items-center gap-1 text-[11px] text-[rgba(249,249,249,0.35)]">
                                <Calendar className="w-3 h-3" />
                                {new Date(item.scheduled_date).toLocaleDateString("de-DE", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            )}
                            {item.content_pillar && (
                              <span className="text-[11px] text-[rgba(249,249,249,0.3)]">
                                Säule: {item.content_pillar}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => approveItem(item.id)}
                            disabled={isLoading}
                            title="Freigeben"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
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

                          <button
                            onClick={() => setEditingItem(item)}
                            title="Ändern"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                            style={{
                              background: "rgba(197,160,89,0.08)",
                              border: "1px solid rgba(197,160,89,0.25)",
                              color: "#E9CB8B",
                            }}
                          >
                            <Edit3 className="w-3 h-3" />
                            Ändern
                          </button>

                          <button
                            onClick={() =>
                              setConfirmDialog({
                                message: `Beitrag "${item.title ?? "ohne Titel"}" verwerfen?`,
                                onConfirm: () => discardItem(item.id),
                              })
                            }
                            title="Verwerfen"
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                            style={{
                              background: "rgba(232,116,103,0.08)",
                              border: "1px solid rgba(232,116,103,0.2)",
                              color: "#E87467",
                            }}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Draft assets for this customer */}
                {group.assets.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ImageIcon className="w-3.5 h-3.5 text-[rgba(249,249,249,0.3)]" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[rgba(249,249,249,0.35)]">
                        Assets
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.assets.map((asset) => {
                        const isLoadingAsset = actionLoading === `asset_${asset.id}`;
                        const meta = asset.metadata_json ?? {};
                        return (
                          <div
                            key={asset.id}
                            className="flex items-center justify-between gap-3 rounded-xl p-3"
                            style={{
                              background: "rgba(249,249,249,0.02)",
                              border: "1px solid rgba(249,249,249,0.06)",
                            }}
                          >
                            <div className="min-w-0">
                              <p className="text-[12px] text-[rgba(249,249,249,0.65)] truncate">
                                {(meta.format_slug as string) ?? "Asset"}
                              </p>
                              <p className="text-[10px] text-[rgba(249,249,249,0.3)] mt-0.5">
                                {new Date(asset.created_at).toLocaleDateString("de-DE")}
                              </p>
                            </div>
                            <button
                              onClick={() => approveAsset(asset.id)}
                              disabled={isLoadingAsset}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold flex-shrink-0 transition-all"
                              style={{
                                background: "rgba(127,194,155,0.1)",
                                border: "1px solid rgba(127,194,155,0.3)",
                                color: "#7FC29B",
                                opacity: isLoadingAsset ? 0.6 : 1,
                              }}
                            >
                              {isLoadingAsset ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              Freigeben
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
