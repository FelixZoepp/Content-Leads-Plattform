// CL-135: Deliverable Sets CMS
// Route: /dashboard/admin/deliverable-sets

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Save,
  Loader2,
  X,
  Layers,
  Package,
  ChevronDown,
  ChevronUp,
  Trash2,
  GripVertical,
  Edit3,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  slug: string;
  name: string;
}

interface FormatEntry {
  id: string;
  slug: string;
  name: string;
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

const OUTPUT_TYPES = ["text", "image", "carousel", "video", "document", "email"];

// ── Style helpers ──────────────────────────────────────────────────────────────

const INPUT =
  "w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm placeholder-[rgba(249,249,249,0.25)] focus:outline-none focus:border-[rgba(197,160,89,0.5)]";
const LABEL =
  "block text-[11px] font-semibold tracking-wider uppercase text-[rgba(249,249,249,0.35)] mb-1";

const emptySet = (productId = ""): Partial<DeliverableSet> => ({
  product_id: productId,
  slug: "",
  name: "",
  description: "",
});

const emptyItem = (setId: string): Partial<DeliverableSetItem> => ({
  set_id: setId,
  output_type: "text",
  format_id: null,
  template_category: "",
  variant_count: 1,
  config_json: null,
  order: 0,
});

// ── Set Modal ─────────────────────────────────────────────────────────────────

function SetModal({
  draft,
  products,
  onClose,
  onSaved,
}: {
  draft: Partial<DeliverableSet>;
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<DeliverableSet>>(draft);
  const [saving, setSaving] = useState(false);
  const isEdit = !!(draft as DeliverableSet).id;

  async function save() {
    if (!form.slug || !form.name || !form.product_id) return;
    setSaving(true);
    const payload = {
      product_id: form.product_id,
      slug: form.slug,
      name: form.name,
      description: form.description || null,
    };
    if (isEdit) {
      await (supabase as any)
        .from("deliverable_sets")
        .update(payload)
        .eq("id", (draft as DeliverableSet).id);
    } else {
      await (supabase as any).from("deliverable_sets").insert(payload);
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#111827] border border-[#1E293B] rounded-2xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {isEdit ? "Set bearbeiten" : "Neues Deliverable Set"}
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-[rgba(249,249,249,0.4)] hover:text-white transition" />
          </button>
        </div>

        <div>
          <label className={LABEL}>Produkt</label>
          <select
            value={form.product_id || ""}
            onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
            className={INPUT}
          >
            <option value="">— Produkt wählen —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Slug</label>
            <input
              value={form.slug || ""}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              disabled={isEdit}
              placeholder="z.B. weekly_content"
              className={INPUT + (isEdit ? " opacity-50 cursor-not-allowed" : "")}
            />
          </div>
          <div>
            <label className={LABEL}>Name</label>
            <input
              value={form.name || ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="z.B. Wöchentlicher Content"
              className={INPUT}
            />
          </div>
        </div>

        <div>
          <label className={LABEL}>Beschreibung</label>
          <textarea
            value={form.description || ""}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2}
            placeholder="Kurze Beschreibung..."
            className={INPUT + " resize-y"}
          />
        </div>

        <button
          onClick={save}
          disabled={saving || !form.slug || !form.name || !form.product_id}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D4A22A] text-black font-semibold rounded-lg hover:bg-[#B88B1F] transition disabled:opacity-50 text-sm"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Speichern
        </button>
      </div>
    </div>
  );
}

// ── Item Modal ────────────────────────────────────────────────────────────────

function ItemModal({
  draft,
  formats,
  onClose,
  onSaved,
}: {
  draft: Partial<DeliverableSetItem>;
  formats: FormatEntry[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<DeliverableSetItem>>(draft);
  const [saving, setSaving] = useState(false);
  const isEdit = !!(draft as DeliverableSetItem).id;

  async function save() {
    if (!form.output_type) return;
    setSaving(true);
    const payload = {
      set_id: form.set_id,
      output_type: form.output_type,
      format_id: form.format_id || null,
      template_category: form.template_category || null,
      variant_count: form.variant_count ?? 1,
      config_json: form.config_json || null,
      order: form.order ?? 0,
    };
    if (isEdit) {
      await (supabase as any)
        .from("deliverable_set_items")
        .update(payload)
        .eq("id", (draft as DeliverableSetItem).id);
    } else {
      await (supabase as any).from("deliverable_set_items").insert(payload);
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#111827] border border-[#1E293B] rounded-2xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {isEdit ? "Item bearbeiten" : "Neues Item"}
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-[rgba(249,249,249,0.4)] hover:text-white transition" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Output-Typ</label>
            <select
              value={form.output_type || "text"}
              onChange={(e) => setForm((f) => ({ ...f, output_type: e.target.value }))}
              className={INPUT}
            >
              {OUTPUT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Varianten</label>
            <input
              type="number"
              min={1}
              max={20}
              value={form.variant_count ?? 1}
              onChange={(e) =>
                setForm((f) => ({ ...f, variant_count: Number(e.target.value) }))
              }
              className={INPUT}
            />
          </div>
        </div>

        <div>
          <label className={LABEL}>Format (optional)</label>
          <select
            value={form.format_id || ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, format_id: e.target.value || null }))
            }
            className={INPUT}
          >
            <option value="">— kein Format —</option>
            {formats.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL}>Template-Kategorie (optional)</label>
          <input
            value={form.template_category || ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, template_category: e.target.value }))
            }
            placeholder="z.B. linkedin_post"
            className={INPUT}
          />
        </div>

        <div>
          <label className={LABEL}>Reihenfolge</label>
          <input
            type="number"
            min={0}
            value={form.order ?? 0}
            onChange={(e) =>
              setForm((f) => ({ ...f, order: Number(e.target.value) }))
            }
            className={INPUT}
          />
        </div>

        <button
          onClick={save}
          disabled={saving || !form.output_type}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D4A22A] text-black font-semibold rounded-lg hover:bg-[#B88B1F] transition disabled:opacity-50 text-sm"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Speichern
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DeliverableSetsCMS() {
  const nav = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [formats, setFormats] = useState<FormatEntry[]>([]);
  const [sets, setSets] = useState<DeliverableSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Modals
  const [setModal, setSetModal] = useState<Partial<DeliverableSet> | null>(null);
  const [itemModal, setItemModal] = useState<Partial<DeliverableSetItem> | null>(null);
  const [deletingItem, setDeletingItem] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: p }, { data: f }, { data: s }, { data: items }] =
      await Promise.all([
        (supabase as any).from("products").select("id, slug, name").order("name"),
        (supabase as any)
          .from("format_registry")
          .select("id, slug, name")
          .order("name"),
        (supabase as any)
          .from("deliverable_sets")
          .select("*")
          .order("product_id")
          .order("name"),
        (supabase as any)
          .from("deliverable_set_items")
          .select("*")
          .order("set_id")
          .order("order"),
      ]);

    const setsWithItems: DeliverableSet[] = (s || []).map((set: DeliverableSet) => ({
      ...set,
      items: (items || []).filter(
        (i: DeliverableSetItem) => i.set_id === set.id
      ),
    }));

    setProducts(p || []);
    setFormats(f || []);
    setSets(setsWithItems);
    setLoading(false);
  }

  async function deleteItem(id: string) {
    setDeletingItem(id);
    await (supabase as any).from("deliverable_set_items").delete().eq("id", id);
    setDeletingItem(null);
    await load();
  }

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
  const formatMap = Object.fromEntries(formats.map((f) => [f.id, f]));

  // Group sets by product
  const byProduct: Record<string, DeliverableSet[]> = {};
  for (const set of sets) {
    if (!byProduct[set.product_id]) byProduct[set.product_id] = [];
    byProduct[set.product_id].push(set);
  }

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
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => nav("/dashboard/admin")}
            className="flex items-center gap-2 text-sm text-[rgba(249,249,249,0.4)] hover:text-white transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Admin Dashboard
          </button>
          <h1 className="text-2xl font-bold text-white">Deliverable Sets CMS</h1>
          <p className="text-sm text-[rgba(249,249,249,0.4)] mt-1">
            {sets.length} Sets über {products.length} Produkte
          </p>
        </div>
        <button
          onClick={() => setSetModal(emptySet())}
          className="flex items-center gap-2 px-4 py-2 bg-[#D4A22A] text-black font-semibold rounded-lg hover:bg-[#B88B1F] transition text-sm"
        >
          <Plus className="w-4 h-4" /> Neues Set
        </button>
      </div>

      {/* Per-product groups */}
      {Object.entries(byProduct).map(([productId, productSets]) => {
        const product = productMap[productId];
        return (
          <div key={productId} className="space-y-3">
            {/* Product heading */}
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[#E9CB8B]" />
              <span className="text-[13px] font-bold tracking-wider uppercase text-[#E9CB8B]">
                {product?.name ?? productId}
              </span>
              <span className="text-[11px] text-[rgba(249,249,249,0.3)]">
                ({productSets.length} Set{productSets.length !== 1 ? "s" : ""})
              </span>
              <button
                onClick={() =>
                  setSetModal(emptySet(productId))
                }
                className="ml-auto flex items-center gap-1 text-[11px] text-[#C5A059] hover:text-white transition"
              >
                <Plus className="w-3.5 h-3.5" /> Set
              </button>
            </div>

            {productSets.map((set) => {
              const isOpen = !!expanded[set.id];
              return (
                <div key={set.id} className="glass-panel" style={{ padding: 0 }}>
                  <div className="relative z-[2]">
                    {/* Set header */}
                    <div className="px-5 py-3 flex items-center gap-3 border-b border-[rgba(249,249,249,0.06)]">
                      <button
                        onClick={() =>
                          setExpanded((e) => ({ ...e, [set.id]: !e[set.id] }))
                        }
                        className="flex items-center gap-2 flex-1 text-left"
                      >
                        <Layers className="w-4 h-4 text-[rgba(249,249,249,0.4)]" />
                        <span className="text-[14px] font-semibold text-white">
                          {set.name}
                        </span>
                        <span className="font-mono text-[11px] text-[rgba(249,249,249,0.35)] bg-[rgba(249,249,249,0.05)] px-2 py-0.5 rounded">
                          {set.slug}
                        </span>
                        {set.description && (
                          <span className="text-[12px] text-[rgba(249,249,249,0.4)] truncate hidden sm:block">
                            {set.description}
                          </span>
                        )}
                        <span className="ml-auto text-[11px] text-[rgba(249,249,249,0.3)]">
                          {set.items.length} Item{set.items.length !== 1 ? "s" : ""}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-[rgba(249,249,249,0.3)]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[rgba(249,249,249,0.3)]" />
                        )}
                      </button>
                      <button
                        onClick={() => setSetModal({ ...set })}
                        className="flex items-center gap-1 text-[11px] text-[#C5A059] hover:text-white transition px-2 py-0.5 rounded border border-[rgba(197,160,89,0.2)] hover:border-[rgba(197,160,89,0.5)] flex-shrink-0"
                      >
                        <Edit3 className="w-3 h-3" /> Bearbeiten
                      </button>
                    </div>

                    {/* Items list */}
                    {isOpen && (
                      <div>
                        {set.items.length === 0 ? (
                          <div className="px-5 py-4 text-[13px] text-[rgba(249,249,249,0.3)]">
                            Noch keine Items — füge das erste hinzu.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-[rgba(249,249,249,0.04)]">
                                  {[
                                    "",
                                    "Output-Typ",
                                    "Format",
                                    "Template-Kategorie",
                                    "Varianten",
                                    "Reihenfolge",
                                    "",
                                  ].map((h, i) => (
                                    <th
                                      key={i}
                                      className="px-4 py-2 text-left text-[10px] font-bold tracking-wider uppercase text-[rgba(249,249,249,0.2)]"
                                    >
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {set.items.map((item) => {
                                  const fmt = item.format_id
                                    ? formatMap[item.format_id]
                                    : null;
                                  return (
                                    <tr
                                      key={item.id}
                                      className="border-b border-[rgba(249,249,249,0.03)] hover:bg-[rgba(249,249,249,0.02)] transition"
                                    >
                                      <td className="px-4 py-2 text-[rgba(249,249,249,0.2)]">
                                        <GripVertical className="w-3.5 h-3.5" />
                                      </td>
                                      <td className="px-4 py-2">
                                        <span
                                          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide"
                                          style={{
                                            color: "#E9CB8B",
                                            background: "rgba(233,203,139,0.1)",
                                            border: "1px solid rgba(233,203,139,0.25)",
                                          }}
                                        >
                                          {item.output_type}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2 text-[12px] text-[rgba(249,249,249,0.5)]">
                                        {fmt ? (
                                          <span className="font-mono text-[11px] bg-[rgba(249,249,249,0.05)] px-1.5 py-0.5 rounded">
                                            {fmt.slug}
                                          </span>
                                        ) : (
                                          "—"
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-[12px] text-[rgba(249,249,249,0.5)]">
                                        {item.template_category || "—"}
                                      </td>
                                      <td className="px-4 py-2 text-[12px] text-[rgba(249,249,249,0.5)]">
                                        {item.variant_count}
                                      </td>
                                      <td className="px-4 py-2 text-[12px] text-[rgba(249,249,249,0.4)]">
                                        {item.order}
                                      </td>
                                      <td className="px-4 py-2">
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => setItemModal({ ...item })}
                                            className="text-[11px] text-[#C5A059] hover:text-white transition px-2 py-0.5 rounded border border-[rgba(197,160,89,0.2)] hover:border-[rgba(197,160,89,0.5)]"
                                          >
                                            Bearbeiten
                                          </button>
                                          <button
                                            onClick={() => deleteItem(item.id)}
                                            disabled={deletingItem === item.id}
                                            className="w-6 h-6 flex items-center justify-center rounded text-[rgba(232,116,103,0.6)] hover:text-[#E87467] transition border border-[rgba(232,116,103,0.15)] hover:border-[rgba(232,116,103,0.4)]"
                                          >
                                            {deletingItem === item.id ? (
                                              <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                              <Trash2 className="w-3 h-3" />
                                            )}
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {/* Add item button */}
                        <div className="px-5 py-3 border-t border-[rgba(249,249,249,0.04)]">
                          <button
                            onClick={() =>
                              setItemModal(emptyItem(set.id))
                            }
                            className="flex items-center gap-1.5 text-[12px] text-[#C5A059] hover:text-white transition"
                          >
                            <Plus className="w-3.5 h-3.5" /> Item hinzufügen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Empty state */}
      {sets.length === 0 && (
        <div className="glass-panel text-center py-14">
          <div className="relative z-[2]">
            <Layers className="w-10 h-10 text-[rgba(249,249,249,0.07)] mx-auto mb-3" />
            <p className="text-[14px] text-[rgba(249,249,249,0.4)]">
              Noch keine Deliverable Sets vorhanden
            </p>
          </div>
        </div>
      )}

      {/* Modals */}
      {setModal && (
        <SetModal
          draft={setModal}
          products={products}
          onClose={() => setSetModal(null)}
          onSaved={() => {
            setSetModal(null);
            load();
          }}
        />
      )}
      {itemModal && (
        <ItemModal
          draft={itemModal}
          formats={formats}
          onClose={() => setItemModal(null)}
          onSaved={() => {
            setItemModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}
