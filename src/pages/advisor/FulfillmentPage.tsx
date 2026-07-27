// CL-138: 1-Click Fulfillment UI
// Route: /dashboard/advisor/fulfillment/:userId
// Advisors trigger fulfillment for a customer's active products.
// TODO(STUB): Actual job execution via queue — jobs stay in "queued" status.

import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  PlayCircle,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  Package,
  Layers,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  Image as ImageIcon,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CustomerProduct {
  id: string;
  user_id: string;
  product_id: string;
  status: string;
  product: {
    id: string;
    slug: string;
    name: string;
  };
}

interface DeliverableSetItem {
  id: string;
  set_id: string;
  output_type: string;
  format_id: string | null;
  template_category: string | null;
  variant_count: number;
  config_json: Record<string, unknown> | null;
  order: number;
}

interface DeliverableSet {
  id: string;
  product_id: string;
  slug: string;
  name: string;
  description: string | null;
  items: DeliverableSetItem[];
}

type JobStatus = "queued" | "running" | "done" | "failed";

interface FulfillmentJob {
  id: string;
  order_id: string;
  set_item_id: string;
  status: JobStatus;
  error: string | null;
  result_json: Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
}

interface FulfillmentOrder {
  id: string;
  user_id: string;
  deliverable_set_id: string;
  status: string;
  idempotency_key: string;
  jobs: FulfillmentJob[];
}

interface Asset {
  id: string;
  status: string;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

// ── Dossier completeness check ────────────────────────────────────────────────

const REQUIRED_DOSSIER_KEYS = [
  "angebot",
  "branche",
  "rolle",
  "schmerz",
  "tonalitaet",
  "farben",
];

const FIELD_LABELS: Record<string, string> = {
  angebot: "Angebot",
  preismodell: "Preismodell",
  ergebnisse: "Ergebnisse",
  branche: "Branche",
  rolle: "Zielrolle",
  groesse: "Unternehmensgröße",
  trigger: "Trigger",
  schmerz: "Schmerz / Problem",
  tonalitaet: "Tonalität",
  themen: "Themen",
  no_gos: "No-Gos",
  beispiel_posts: "Beispiel-Posts",
  kommunikationsstil: "Kommunikationsstil",
  farben: "Farben",
  fonts: "Fonts",
  logo: "Logo",
  bildstil: "Bildstil",
  claim: "Claim",
  content_saeulen: "Content-Säulen",
  cta_ziel: "CTA-Ziel",
};

const ALL_DOSSIER_KEYS = Object.keys(FIELD_LABELS);

// ── Status visuals ────────────────────────────────────────────────────────────

function JobStatusBadge({ status }: { status: JobStatus }) {
  const map: Record<JobStatus, { label: string; color: string; icon: React.ReactNode }> = {
    queued: {
      label: "Wartet",
      color: "rgba(249,249,249,0.4)",
      icon: <Clock className="w-3 h-3" />,
    },
    running: {
      label: "Läuft",
      color: "#E9CB8B",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    done: {
      label: "Fertig",
      color: "#7FC29B",
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    failed: {
      label: "Fehler",
      color: "#E87467",
      icon: <XCircle className="w-3 h-3" />,
    },
  };
  const cfg = map[status] ?? map.queued;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.1em]"
      style={{
        color: cfg.color,
        background: `${cfg.color}18`,
        border: `1px solid ${cfg.color}40`,
      }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ── Idempotency key ───────────────────────────────────────────────────────────

function buildIdempotencyKey(userId: string, productSlug: string): string {
  const isoDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `${userId}_${productSlug}_${isoDate}`;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FulfillmentPage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();

  const [customerName, setCustomerName] = useState<string>("");
  const [products, setProducts] = useState<CustomerProduct[]>([]);
  const [deliverableSets, setDeliverableSets] = useState<Record<string, DeliverableSet[]>>({});
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [dossierCompleteness, setDossierCompleteness] = useState<number>(0);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [startingFor, setStartingFor] = useState<string | null>(null); // set_id being started

  // Collapsed product cards
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      // Customer name
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .maybeSingle();
      setCustomerName(profile?.full_name || profile?.email || userId.slice(0, 8));

      // Active customer products
      const { data: cpRows, error: cpErr } = await (supabase as any)
        .from("customer_products")
        .select("id, user_id, product_id, status, product:products(id, slug, name)")
        .eq("user_id", userId)
        .in("status", ["active", "onboarding"]);
      if (cpErr) throw cpErr;
      setProducts((cpRows as CustomerProduct[]) ?? []);

      // Load deliverable sets for each product
      const productIds = ((cpRows as CustomerProduct[]) ?? []).map((cp) => cp.product_id);
      if (productIds.length > 0) {
        const { data: setRows, error: setErr } = await (supabase as any)
          .from("deliverable_sets")
          .select(`
            id, product_id, slug, name, description,
            items:deliverable_set_items(id, set_id, output_type, format_id, template_category, variant_count, config_json, order)
          `)
          .in("product_id", productIds);
        if (setErr) throw setErr;

        const byProduct: Record<string, DeliverableSet[]> = {};
        for (const s of (setRows as DeliverableSet[]) ?? []) {
          if (!byProduct[s.product_id]) byProduct[s.product_id] = [];
          byProduct[s.product_id].push(s);
        }
        setDeliverableSets(byProduct);
      }

      // Load existing fulfillment orders + jobs
      const { data: orderRows, error: orderErr } = await (supabase as any)
        .from("fulfillment_orders")
        .select(`
          id, user_id, deliverable_set_id, status, idempotency_key,
          jobs:fulfillment_jobs(id, order_id, set_item_id, status, error, result_json, started_at, completed_at)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (orderErr) throw orderErr;
      setOrders((orderRows as FulfillmentOrder[]) ?? []);

      // Load completed assets for review
      const { data: assetRows, error: assetErr } = await (supabase as any)
        .from("assets")
        .select("id, status, metadata_json, created_at")
        .eq("user_id", userId)
        .in("status", ["draft", "approved"])
        .order("created_at", { ascending: false })
        .limit(20);
      if (assetErr) throw assetErr;
      setAssets((assetRows as Asset[]) ?? []);

      // Dossier completeness
      const { data: dos } = await (supabase as any)
        .from("dossiers")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dos) {
        const { data: flds } = await (supabase as any)
          .from("dossier_fields")
          .select("field_key, value_text")
          .eq("dossier_id", dos.id);

        const filledKeys = new Set(
          ((flds as { field_key: string; value_text: string | null }[]) ?? [])
            .filter((f) => f.value_text?.trim())
            .map((f) => f.field_key),
        );

        const score = Math.round((filledKeys.size / ALL_DOSSIER_KEYS.length) * 100);
        setDossierCompleteness(score);

        const missing = REQUIRED_DOSSIER_KEYS.filter((k) => !filledKeys.has(k));
        setMissingFields(missing);
      } else {
        setDossierCompleteness(0);
        setMissingFields(REQUIRED_DOSSIER_KEYS);
      }
    } catch (err: any) {
      setError(err?.message || "Fehler beim Laden.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Start fulfillment ─────────────────────────────────────────────────────

  async function startFulfillment(set: DeliverableSet, productSlug: string) {
    if (!userId || !user) return;

    // Gate: dossier must be ≥ 80% complete
    if (dossierCompleteness < 80) {
      setError(
        `Dossier unvollständig (${dossierCompleteness}%). Mindestens 80% erforderlich. ` +
          `Fehlende Pflichtfelder: ${missingFields
            .map((k) => FIELD_LABELS[k] ?? k)
            .join(", ")}.`,
      );
      return;
    }

    setStartingFor(set.id);
    setError(null);

    try {
      const idempotencyKey = buildIdempotencyKey(userId, productSlug);

      // Check if order already exists for today (idempotency)
      const { data: existing } = await (supabase as any)
        .from("fulfillment_orders")
        .select("id")
        .eq("user_id", userId)
        .eq("deliverable_set_id", set.id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      let orderId: string;

      if (existing) {
        orderId = existing.id;
        flash("Auftrag für heute existiert bereits — Jobs werden angezeigt.");
      } else {
        // Create order
        const { data: newOrder, error: orderErr } = await (supabase as any)
          .from("fulfillment_orders")
          .insert({
            user_id: userId,
            deliverable_set_id: set.id,
            status: "queued",
            idempotency_key: idempotencyKey,
            created_by: user.id,
          })
          .select("id")
          .single();
        if (orderErr) throw orderErr;
        orderId = newOrder.id;

        // Create one job per set item
        const jobInserts = set.items.map((item) => ({
          order_id: orderId,
          set_item_id: item.id,
          status: "queued",
          max_attempts: 3,
          // TODO(STUB): actual job dispatch via pg_net / queue worker
        }));

        if (jobInserts.length > 0) {
          const { error: jobErr } = await (supabase as any)
            .from("fulfillment_jobs")
            .insert(jobInserts);
          if (jobErr) throw jobErr;
        }

        flash(`Fulfillment gestartet: ${set.items.length} Jobs in der Warteschlange.`);
      }

      await load();
    } catch (err: any) {
      setError(err?.message || "Fehler beim Starten.");
    } finally {
      setStartingFor(null);
    }
  }

  // ── Batch approve ─────────────────────────────────────────────────────────

  async function approveAllAssets() {
    if (!userId) return;
    const draftIds = assets.filter((a) => a.status === "draft").map((a) => a.id);
    if (draftIds.length === 0) return;

    try {
      const { error: upErr } = await (supabase as any)
        .from("assets")
        .update({ status: "approved" })
        .in("id", draftIds);
      if (upErr) throw upErr;
      flash(`${draftIds.length} Assets freigegeben.`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Fehler beim Freigeben.");
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  }

  function toggleProduct(productId: string) {
    setCollapsed((prev) => ({ ...prev, [productId]: !prev[productId] }));
  }

  function getOrderForSet(setId: string): FulfillmentOrder | undefined {
    return orders.find((o) => o.deliverable_set_id === setId);
  }

  function calcProgress(order: FulfillmentOrder): { done: number; total: number; pct: number } {
    const total = order.jobs?.length ?? 0;
    const done = order.jobs?.filter((j) => j.status === "done").length ?? 0;
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const draftAssets = assets.filter((a) => a.status === "draft");
  const approvedAssets = assets.filter((a) => a.status === "approved");
  const completenessColor =
    dossierCompleteness >= 80
      ? "#7FC29B"
      : dossierCompleteness >= 40
        ? "#E9CB8B"
        : "#E87467";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-3xl">

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
              Berater · Fulfillment
            </span>
            <h1 className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>
              {customerName}<span className="text-[#C5A059]">.</span>
            </h1>
            <p className="text-[13px] text-[rgba(249,249,249,0.5)] mt-1">
              1-Klick Content-Fulfillment
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

        {/* Dossier completeness bar */}
        <div className="relative z-[2] mt-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[rgba(249,249,249,0.35)]">
              Dossier-Vollständigkeit
            </span>
            <span
              className="text-[11px] font-semibold"
              style={{ color: completenessColor }}
            >
              {dossierCompleteness}%
              {dossierCompleteness < 80 && (
                <span className="ml-1 font-normal text-[rgba(249,249,249,0.4)]">
                  (mind. 80% für Fulfillment)
                </span>
              )}
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: "rgba(249,249,249,0.08)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${dossierCompleteness}%`,
                background:
                  dossierCompleteness >= 80
                    ? "linear-gradient(90deg,#7FC29B,#A8D4BC)"
                    : dossierCompleteness >= 40
                      ? "linear-gradient(90deg,#C5A059,#E9CB8B)"
                      : "linear-gradient(90deg,#E87467,#F0A09A)",
              }}
            />
          </div>
          {missingFields.length > 0 && dossierCompleteness < 80 && (
            <p className="mt-1.5 text-[11px]" style={{ color: "#E87467" }}>
              Fehlend:{" "}
              {missingFields.map((k) => FIELD_LABELS[k] ?? k).join(", ")}
            </p>
          )}
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

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {products.length === 0 && (
        <div className="glass-panel fade-up text-center py-14">
          <div className="relative z-[2]">
            <Package className="w-12 h-12 text-[rgba(249,249,249,0.07)] mx-auto mb-3" />
            <p className="text-[14px] text-[rgba(249,249,249,0.5)]">Keine aktiven Produkte</p>
            <p className="text-[11px] text-[rgba(249,249,249,0.3)] mt-1">
              Dieser Kunde hat keine aktiven Buchungen.
            </p>
          </div>
        </div>
      )}

      {/* ── Products & Deliverable Sets ──────────────────────────────────────── */}
      {products.map((cp, cpIdx) => {
        const sets = deliverableSets[cp.product_id] ?? [];
        const isOpen = !collapsed[cp.product_id];

        return (
          <div
            key={cp.id}
            className="glass-panel fade-up"
            style={{ animationDelay: `${cpIdx * 60}ms` }}
          >
            {/* Product header */}
            <button
              onClick={() => toggleProduct(cp.product_id)}
              className="relative z-[2] w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-[#C5A059]" />
                <div>
                  <span
                    className="text-[15px] font-semibold text-white"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {cp.product?.name ?? cp.product_id}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-[9px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded"
                      style={{
                        color: cp.status === "active" ? "#7FC29B" : "#E9CB8B",
                        background:
                          cp.status === "active"
                            ? "rgba(127,194,155,0.1)"
                            : "rgba(233,203,139,0.1)",
                        border: `1px solid ${cp.status === "active" ? "#7FC29B40" : "#E9CB8B40"}`,
                      }}
                    >
                      {cp.status}
                    </span>
                    <span className="text-[10px] text-[rgba(249,249,249,0.3)]">
                      {sets.length} Deliverable-{sets.length === 1 ? "Set" : "Sets"}
                    </span>
                  </div>
                </div>
              </div>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-[rgba(249,249,249,0.3)]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[rgba(249,249,249,0.3)]" />
              )}
            </button>

            {/* Deliverable sets */}
            {isOpen && (
              <div className="relative z-[2] mt-4 space-y-4">
                {sets.length === 0 && (
                  <p className="text-[12px] text-[rgba(249,249,249,0.3)] italic py-2">
                    Keine Deliverable Sets für dieses Produkt definiert.
                  </p>
                )}

                {sets.map((set) => {
                  const order = getOrderForSet(set.id);
                  const isStarting = startingFor === set.id;

                  return (
                    <div
                      key={set.id}
                      className="rounded-xl p-4"
                      style={{
                        background: "rgba(249,249,249,0.025)",
                        border: "1px solid rgba(249,249,249,0.06)",
                      }}
                    >
                      {/* Set header */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-white">
                            {set.name}
                          </p>
                          {set.description && (
                            <p className="text-[11px] text-[rgba(249,249,249,0.4)] mt-0.5">
                              {set.description}
                            </p>
                          )}
                        </div>

                        {/* Start button */}
                        <button
                          onClick={() => startFulfillment(set, cp.product?.slug ?? cp.product_id)}
                          disabled={isStarting || dossierCompleteness < 80}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all flex-shrink-0"
                          style={{
                            background:
                              dossierCompleteness < 80
                                ? "rgba(249,249,249,0.05)"
                                : "linear-gradient(135deg, #C5A059, #E9CB8B)",
                            color: dossierCompleteness < 80 ? "rgba(249,249,249,0.25)" : "#0A0B0B",
                            cursor:
                              dossierCompleteness < 80 || isStarting
                                ? "not-allowed"
                                : "pointer",
                            opacity: isStarting ? 0.7 : 1,
                          }}
                          title={
                            dossierCompleteness < 80
                              ? `Dossier unvollständig (${dossierCompleteness}% — mind. 80% erforderlich)`
                              : "Fulfillment starten"
                          }
                        >
                          {isStarting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <PlayCircle className="w-3.5 h-3.5" />
                          )}
                          {isStarting ? "Startet…" : "Fulfillment starten"}
                        </button>
                      </div>

                      {/* Set items */}
                      <div className="mt-3 space-y-1.5">
                        {set.items
                          .sort((a, b) => a.order - b.order)
                          .map((item) => {
                            const job = order?.jobs?.find((j) => j.set_item_id === item.id);
                            return (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg"
                                style={{
                                  background: "rgba(249,249,249,0.02)",
                                  border: "1px solid rgba(249,249,249,0.04)",
                                }}
                              >
                                <div className="flex-1 min-w-0">
                                  <span className="text-[12px] text-[rgba(249,249,249,0.7)]">
                                    {item.output_type}
                                    {item.template_category && (
                                      <span className="ml-1 text-[rgba(249,249,249,0.35)]">
                                        · {item.template_category}
                                      </span>
                                    )}
                                  </span>
                                  {item.variant_count > 1 && (
                                    <span className="ml-2 text-[10px] text-[rgba(249,249,249,0.3)]">
                                      ×{item.variant_count}
                                    </span>
                                  )}
                                </div>
                                {job ? (
                                  <JobStatusBadge status={job.status} />
                                ) : (
                                  <span className="text-[10px] text-[rgba(249,249,249,0.2)]">
                                    —
                                  </span>
                                )}
                              </div>
                            );
                          })}
                      </div>

                      {/* Order progress */}
                      {order && (
                        <div className="mt-4">
                          {(() => {
                            const { done, total, pct } = calcProgress(order);
                            const orderColor =
                              pct === 100
                                ? "#7FC29B"
                                : pct > 0
                                  ? "#E9CB8B"
                                  : "rgba(249,249,249,0.3)";
                            return (
                              <>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-[rgba(249,249,249,0.3)]">
                                    Fortschritt
                                  </span>
                                  <span
                                    className="text-[11px] font-semibold"
                                    style={{ color: orderColor }}
                                  >
                                    {done} / {total} Jobs · {pct}%
                                  </span>
                                </div>
                                <div
                                  className="h-1 rounded-full overflow-hidden"
                                  style={{ background: "rgba(249,249,249,0.08)" }}
                                >
                                  <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{
                                      width: `${pct}%`,
                                      background:
                                        pct === 100
                                          ? "linear-gradient(90deg,#7FC29B,#A8D4BC)"
                                          : "linear-gradient(90deg,#C5A059,#E9CB8B)",
                                    }}
                                  />
                                </div>
                                {/* Failed job errors */}
                                {order.jobs
                                  ?.filter((j) => j.status === "failed" && j.error)
                                  .map((j) => (
                                    <p
                                      key={j.id}
                                      className="mt-1 text-[11px]"
                                      style={{ color: "#E87467" }}
                                    >
                                      Job {j.id.slice(0, 8)}: {j.error}
                                    </p>
                                  ))}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Review Section ───────────────────────────────────────────────────── */}
      {assets.length > 0 && (
        <div className="glass-panel fade-up" style={{ animationDelay: "200ms" }}>
          <div className="relative z-[2]">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#C5A059]" />
                <span
                  className="text-[15px] font-semibold text-white"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Asset-Review
                </span>
                {draftAssets.length > 0 && (
                  <span
                    className="text-[9px] font-bold tracking-[0.1em] px-1.5 py-0.5 rounded uppercase"
                    style={{
                      color: "#E9CB8B",
                      background: "rgba(233,203,139,0.1)",
                      border: "1px solid rgba(233,203,139,0.3)",
                    }}
                  >
                    {draftAssets.length} Entwurf{draftAssets.length !== 1 ? "e" : ""}
                  </span>
                )}
              </div>

              {draftAssets.length > 0 && (
                <button
                  onClick={approveAllAssets}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all"
                  style={{
                    background: "linear-gradient(135deg, #C5A059, #E9CB8B)",
                    color: "#0A0B0B",
                    boxShadow: "0 4px 16px rgba(197,160,89,0.25)",
                  }}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Alle freigeben
                </button>
              )}
            </div>

            {/* Asset grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              {assets.map((asset) => {
                const meta = asset.metadata_json ?? {};
                const isApproved = asset.status === "approved";
                return (
                  <div
                    key={asset.id}
                    className="rounded-xl p-3"
                    style={{
                      background: "rgba(249,249,249,0.025)",
                      border: `1px solid ${isApproved ? "rgba(127,194,155,0.2)" : "rgba(249,249,249,0.06)"}`,
                    }}
                  >
                    {/* Placeholder preview */}
                    <div
                      className="rounded-lg mb-3 flex items-center justify-center"
                      style={{
                        height: 80,
                        background: "rgba(249,249,249,0.03)",
                        border: "1px solid rgba(249,249,249,0.06)",
                      }}
                    >
                      <ImageIcon className="w-6 h-6 text-[rgba(249,249,249,0.1)]" />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] text-[rgba(249,249,249,0.6)] truncate">
                          {(meta.format_slug as string) ?? "Unbekannt"}
                        </p>
                        <p className="text-[10px] text-[rgba(249,249,249,0.3)] mt-0.5">
                          {new Date(asset.created_at).toLocaleDateString("de-DE")}
                        </p>
                      </div>
                      <span
                        className="text-[9px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{
                          color: isApproved ? "#7FC29B" : "#E9CB8B",
                          background: isApproved
                            ? "rgba(127,194,155,0.1)"
                            : "rgba(233,203,139,0.1)",
                          border: `1px solid ${isApproved ? "#7FC29B40" : "#E9CB8B40"}`,
                        }}
                      >
                        {isApproved ? "Freigegeben" : "Entwurf"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {approvedAssets.length > 0 && draftAssets.length === 0 && (
              <div
                className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{
                  background: "rgba(127,194,155,0.06)",
                  border: "1px solid rgba(127,194,155,0.2)",
                }}
              >
                <CheckCircle2 className="w-4 h-4 text-[#7FC29B] flex-shrink-0" />
                <p className="text-[12px] text-[#7FC29B]">
                  Alle {approvedAssets.length} Assets freigegeben.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
