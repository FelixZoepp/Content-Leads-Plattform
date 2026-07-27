import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Save, Loader2, X, ChevronUp, ChevronDown,
  BarChart2, Sigma, Lock, Edit2
} from "lucide-react";

interface MetricDef {
  id: string;
  slug: string;
  label: string;
  unit: string;
  type: string;
  is_derived: boolean;
  formula: string | null;
  interval: string;
  is_mandatory: boolean;
  order: number;
}

type DraftMetric = Partial<MetricDef>;

const METRIC_TYPES = ["number", "percentage", "currency", "boolean"];
const METRIC_INTERVALS = ["daily", "weekly", "monthly"];

const INPUT = "w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm placeholder-[rgba(249,249,249,0.25)] focus:outline-none focus:border-[rgba(197,160,89,0.5)] transition";
const LABEL = "block text-[11px] font-semibold tracking-wider uppercase text-[rgba(249,249,249,0.35)] mb-1";
const SELECT = "w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[rgba(197,160,89,0.5)] transition";

function emptyDraft(): DraftMetric {
  return {
    slug: "",
    label: "",
    unit: "",
    type: "number",
    is_derived: false,
    formula: null,
    interval: "daily",
    is_mandatory: false,
    order: 999,
  };
}

export default function MetricRegistryPage() {
  const nav = useNavigate();
  const [metrics, setMetrics] = useState<MetricDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<DraftMetric | null>(null);
  const [reordering, setReordering] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("metric_definitions")
      .select("*")
      .order("order");
    setMetrics(data || []);
    setLoading(false);
  }

  function openNew() {
    const maxOrder = metrics.reduce((m, x) => Math.max(m, x.order), 0);
    setModal({ ...emptyDraft(), order: maxOrder + 1 });
  }

  function openEdit(m: MetricDef) {
    setModal({ ...m });
  }

  function closeModal() {
    setModal(null);
  }

  async function save() {
    if (!modal?.slug || !modal?.label) return;
    setSaving(true);

    const payload = {
      slug: modal.slug,
      label: modal.label,
      unit: modal.unit || "",
      type: modal.type || "number",
      is_derived: modal.is_derived ?? false,
      formula: modal.is_derived ? (modal.formula || null) : null,
      interval: modal.interval || "daily",
      is_mandatory: modal.is_mandatory ?? false,
      order: modal.order ?? 999,
    };

    if ((modal as MetricDef).id) {
      await (supabase as any)
        .from("metric_definitions")
        .update(payload)
        .eq("id", (modal as MetricDef).id);
    } else {
      await (supabase as any)
        .from("metric_definitions")
        .insert(payload);
    }

    setSaving(false);
    closeModal();
    await load();
  }

  async function moveMetric(idx: number, direction: -1 | 1) {
    const target = idx + direction;
    if (target < 0 || target >= metrics.length) return;
    setReordering(true);

    const updated = [...metrics];
    const aOrder = updated[idx].order;
    const bOrder = updated[target].order;

    // Swap orders
    await Promise.all([
      (supabase as any)
        .from("metric_definitions")
        .update({ order: bOrder })
        .eq("id", updated[idx].id),
      (supabase as any)
        .from("metric_definitions")
        .update({ order: aOrder })
        .eq("id", updated[target].id),
    ]);

    setReordering(false);
    await load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#C5A059]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => nav("/dashboard/admin")}
            className="flex items-center gap-2 text-sm text-[rgba(249,249,249,0.4)] hover:text-white transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Admin Dashboard
          </button>
          <h1 className="text-2xl font-bold text-white">Metrik-Registry</h1>
          <p className="text-sm text-[rgba(249,249,249,0.4)] mt-1">
            {metrics.length} Metriken definiert &middot; Reihenfolge bestimmt die Eingabe-Abfolge
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-[#D4A22A] text-black font-semibold rounded-lg hover:bg-[#B88B1F] transition text-sm"
        >
          <Plus className="w-4 h-4" /> Neue Metrik
        </button>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: 0 }}>
        <div className="relative z-[2]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(249,249,249,0.06)]">
                  {["#", "Slug", "Label", "Einheit", "Typ", "Interval", "Pflichtfeld", "Abgeleitet", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold tracking-wider uppercase text-[rgba(249,249,249,0.25)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, idx) => (
                  <tr
                    key={m.id}
                    className="border-b border-[rgba(249,249,249,0.03)] hover:bg-[rgba(249,249,249,0.02)] transition"
                  >
                    {/* Order controls */}
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveMetric(idx, -1)}
                          disabled={idx === 0 || reordering}
                          className="p-0.5 rounded hover:bg-[rgba(249,249,249,0.06)] disabled:opacity-20 transition"
                        >
                          <ChevronUp className="w-3 h-3 text-[rgba(249,249,249,0.4)]" />
                        </button>
                        <button
                          onClick={() => moveMetric(idx, 1)}
                          disabled={idx === metrics.length - 1 || reordering}
                          className="p-0.5 rounded hover:bg-[rgba(249,249,249,0.06)] disabled:opacity-20 transition"
                        >
                          <ChevronDown className="w-3 h-3 text-[rgba(249,249,249,0.4)]" />
                        </button>
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-[11px] text-[#E9CB8B] bg-[rgba(197,160,89,0.08)] px-2 py-0.5 rounded">
                        {m.slug}
                      </span>
                    </td>

                    {/* Label */}
                    <td className="px-4 py-2.5 text-[13px] text-white font-medium whitespace-nowrap">
                      {m.label}
                    </td>

                    {/* Unit */}
                    <td className="px-4 py-2.5 text-[12px] text-[rgba(249,249,249,0.5)]">
                      {m.unit || <span className="text-[rgba(249,249,249,0.2)]">—</span>}
                    </td>

                    {/* Type */}
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1 text-[11px] text-[rgba(249,249,249,0.6)]">
                        <BarChart2 className="w-3 h-3" />
                        {m.type}
                      </span>
                    </td>

                    {/* Interval */}
                    <td className="px-4 py-2.5 text-[12px] text-[rgba(249,249,249,0.5)]">
                      {m.interval}
                    </td>

                    {/* Mandatory */}
                    <td className="px-4 py-2.5">
                      {m.is_mandatory ? (
                        <span className="text-[10px] font-semibold text-[#E87467] bg-[rgba(232,116,103,0.1)] px-2 py-0.5 rounded">
                          Pflicht
                        </span>
                      ) : (
                        <span className="text-[10px] text-[rgba(249,249,249,0.2)]">optional</span>
                      )}
                    </td>

                    {/* Derived */}
                    <td className="px-4 py-2.5">
                      {m.is_derived ? (
                        <div>
                          <span className="flex items-center gap-1 text-[11px] text-[#7FC29B]">
                            <Sigma className="w-3 h-3" /> abgeleitet
                          </span>
                          {m.formula && (
                            <span className="text-[10px] font-mono text-[rgba(249,249,249,0.3)] block mt-0.5 max-w-[200px] truncate" title={m.formula}>
                              {m.formula}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[rgba(249,249,249,0.2)]">manuell</span>
                      )}
                    </td>

                    {/* Edit */}
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => openEdit(m)}
                        className="flex items-center gap-1 text-[11px] text-[#C5A059] hover:text-white transition px-2 py-0.5 rounded border border-[rgba(197,160,89,0.2)] hover:border-[rgba(197,160,89,0.5)]"
                      >
                        <Edit2 className="w-3 h-3" /> Bearbeiten
                      </button>
                    </td>
                  </tr>
                ))}

                {metrics.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[rgba(249,249,249,0.3)] text-sm">
                      Noch keine Metriken definiert. Klicke auf "Neue Metrik".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit / Add Modal */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-[#111827] border border-[#1E293B] rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {(modal as MetricDef).id ? "Metrik bearbeiten" : "Neue Metrik"}
              </h2>
              <button onClick={closeModal}>
                <X className="w-5 h-5 text-[rgba(249,249,249,0.4)]" />
              </button>
            </div>

            {/* Derived read-only hint */}
            {modal.is_derived && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(127,194,155,0.06)] border border-[rgba(127,194,155,0.15)]">
                <Lock className="w-3.5 h-3.5 text-[#7FC29B]" />
                <span className="text-[11px] text-[#7FC29B]">
                  Abgeleitete Metrik — Wert wird automatisch berechnet, kein manueller Eintrag.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Slug</label>
                <input
                  value={modal.slug || ""}
                  onChange={e => setModal(m => m ? { ...m, slug: e.target.value } : m)}
                  disabled={!!(modal as MetricDef).id}
                  placeholder="z.B. dms_sent"
                  className={INPUT + ((modal as MetricDef).id ? " opacity-50 cursor-not-allowed" : "")}
                />
              </div>
              <div>
                <label className={LABEL}>Label</label>
                <input
                  value={modal.label || ""}
                  onChange={e => setModal(m => m ? { ...m, label: e.target.value } : m)}
                  placeholder="z.B. DMs gesendet"
                  className={INPUT}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={LABEL}>Einheit</label>
                <input
                  value={modal.unit || ""}
                  onChange={e => setModal(m => m ? { ...m, unit: e.target.value } : m)}
                  placeholder="z.B. EUR, %, #"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Typ</label>
                <select
                  value={modal.type || "number"}
                  onChange={e => setModal(m => m ? { ...m, type: e.target.value } : m)}
                  className={SELECT}
                >
                  {METRIC_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>Interval</label>
                <select
                  value={modal.interval || "daily"}
                  onChange={e => setModal(m => m ? { ...m, interval: e.target.value } : m)}
                  className={SELECT}
                >
                  {METRIC_INTERVALS.map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Reihenfolge</label>
                <input
                  type="number"
                  value={modal.order ?? ""}
                  onChange={e => setModal(m => m ? { ...m, order: parseInt(e.target.value) || 0 } : m)}
                  placeholder="0"
                  className={INPUT}
                />
              </div>
              <div className="flex flex-col gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modal.is_mandatory ?? false}
                    onChange={e => setModal(m => m ? { ...m, is_mandatory: e.target.checked } : m)}
                    className="w-4 h-4 rounded accent-[#C5A059]"
                  />
                  <span className="text-[12px] text-white">Pflichtfeld</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modal.is_derived ?? false}
                    onChange={e => setModal(m => m ? { ...m, is_derived: e.target.checked } : m)}
                    className="w-4 h-4 rounded accent-[#7FC29B]"
                  />
                  <span className="text-[12px] text-white">Abgeleitet (auto-kalkuliert)</span>
                </label>
              </div>
            </div>

            {modal.is_derived && (
              <div>
                <label className={LABEL}>Formel</label>
                <input
                  value={modal.formula || ""}
                  onChange={e => setModal(m => m ? { ...m, formula: e.target.value } : m)}
                  placeholder="z.B. dm_replies / dms_sent * 100"
                  className={INPUT + " font-mono"}
                />
                <p className="text-[10px] text-[rgba(249,249,249,0.3)] mt-1">
                  Referenz auf andere Slugs. Wird serverseitig ausgewertet.
                </p>
              </div>
            )}

            <button
              onClick={save}
              disabled={saving || !modal.slug || !modal.label}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D4A22A] text-black font-semibold rounded-lg hover:bg-[#B88B1F] transition disabled:opacity-50 text-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Speichern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
