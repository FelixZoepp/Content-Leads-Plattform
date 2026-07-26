import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Save, Loader2, X, Image, Type, ShieldCheck } from "lucide-react";

interface FormatEntry {
  id: string;
  slug: string;
  name: string;
  category: string;
  width: number | null;
  height: number | null;
  aspect_ratio: string | null;
  safe_zone: string | null;
  text_limits: Record<string, unknown> | null;
  notes: string | null;
  verified_at: string | null;
  created_at: string;
}

const emptyDraft = (): Partial<FormatEntry> => ({
  slug: "",
  name: "",
  category: "image",
  width: null,
  height: null,
  aspect_ratio: "",
  safe_zone: "",
  text_limits: null,
  notes: "",
  verified_at: null,
});

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const INPUT = "w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm placeholder-[rgba(249,249,249,0.25)] focus:outline-none focus:border-[rgba(197,160,89,0.5)]";
const LABEL = "block text-[11px] font-semibold tracking-wider uppercase text-[rgba(249,249,249,0.35)] mb-1";

export default function FormatRegistryPage() {
  const nav = useNavigate();
  const [entries, setEntries] = useState<FormatEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<FormatEntry> | null>(null);
  const [saving, setSaving] = useState(false);
  const [textLimitsRaw, setTextLimitsRaw] = useState("");
  const [jsonError, setJsonError] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("format_registry")
      .select("*")
      .order("category")
      .order("name");
    setEntries(data || []);
    setLoading(false);
  }

  function openNew() {
    const draft = emptyDraft();
    setModal(draft);
    setTextLimitsRaw("");
    setJsonError("");
  }

  function openEdit(entry: FormatEntry) {
    setModal({ ...entry });
    setTextLimitsRaw(entry.text_limits ? JSON.stringify(entry.text_limits, null, 2) : "");
    setJsonError("");
  }

  function closeModal() {
    setModal(null);
    setJsonError("");
  }

  async function save() {
    if (!modal?.slug || !modal?.name) return;
    setJsonError("");

    let parsed: Record<string, unknown> | null = null;
    if (textLimitsRaw.trim()) {
      try {
        parsed = JSON.parse(textLimitsRaw);
      } catch {
        setJsonError("Ungültiges JSON in text_limits");
        return;
      }
    }

    setSaving(true);
    const payload = {
      slug: modal.slug,
      name: modal.name,
      category: modal.category || "image",
      width: modal.width || null,
      height: modal.height || null,
      aspect_ratio: modal.aspect_ratio || null,
      safe_zone: modal.safe_zone || null,
      text_limits: parsed,
      notes: modal.notes || null,
      verified_at: new Date().toISOString(),
    };

    if ((modal as FormatEntry).id) {
      await (supabase as any)
        .from("format_registry")
        .update(payload)
        .eq("id", (modal as FormatEntry).id);
    } else {
      await (supabase as any).from("format_registry").insert(payload);
    }

    setSaving(false);
    closeModal();
    await load();
  }

  const categories = [...new Set(entries.map(e => e.category))].sort();

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
          <h1 className="text-2xl font-bold text-white">Format-Registry</h1>
          <p className="text-sm text-[rgba(249,249,249,0.4)] mt-1">
            {entries.length} LinkedIn-Formate registriert
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-[#D4A22A] text-black font-semibold rounded-lg hover:bg-[#B88B1F] transition text-sm"
        >
          <Plus className="w-4 h-4" /> Neues Format
        </button>
      </div>

      {/* Grouped by category */}
      {categories.map(cat => {
        const catEntries = entries.filter(e => e.category === cat);
        const Icon = cat === "image" ? Image : Type;
        return (
          <div key={cat} className="glass-panel" style={{ padding: 0 }}>
            <div className="relative z-[2]">
              {/* Category header */}
              <div className="px-5 py-3 border-b border-[rgba(249,249,249,0.06)] flex items-center gap-2">
                <Icon className="w-4 h-4 text-[#E9CB8B]" />
                <span className="text-[13px] font-bold tracking-wider uppercase text-[#E9CB8B]">{cat}</span>
                <span className="text-[11px] text-[rgba(249,249,249,0.3)] ml-1">({catEntries.length})</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(249,249,249,0.06)]">
                      {["Slug", "Name", "Dimensionen", "Seitenverhältnis", "Safe Zone", "Text-Limits", "Notizen", "Verifiziert", ""].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold tracking-wider uppercase text-[rgba(249,249,249,0.25)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {catEntries.map(entry => (
                      <tr key={entry.id} className="border-b border-[rgba(249,249,249,0.03)] hover:bg-[rgba(249,249,249,0.02)] transition">
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-[11px] text-[#E9CB8B] bg-[rgba(197,160,89,0.08)] px-2 py-0.5 rounded">
                            {entry.slug}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-[13px] text-white font-medium whitespace-nowrap">{entry.name}</td>
                        <td className="px-4 py-2.5 text-[12px] text-[rgba(249,249,249,0.6)] whitespace-nowrap">
                          {entry.width && entry.height ? `${entry.width} × ${entry.height}` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-[rgba(249,249,249,0.6)]">{entry.aspect_ratio || "—"}</td>
                        <td className="px-4 py-2.5 text-[12px] text-[rgba(249,249,249,0.6)] max-w-[120px] truncate" title={entry.safe_zone || ""}>
                          {entry.safe_zone || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-[rgba(249,249,249,0.6)]">
                          {entry.text_limits
                            ? <span className="text-[10px] bg-[rgba(249,249,249,0.06)] px-2 py-0.5 rounded font-mono">{Object.keys(entry.text_limits).join(", ")}</span>
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-[rgba(249,249,249,0.5)] max-w-[150px] truncate" title={entry.notes || ""}>
                          {entry.notes || "—"}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {entry.verified_at
                            ? <span className="flex items-center gap-1 text-[11px] text-green-400"><ShieldCheck className="w-3 h-3" />{formatDate(entry.verified_at)}</span>
                            : <span className="text-[11px] text-[rgba(249,249,249,0.25)]">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => openEdit(entry)}
                            className="text-[11px] text-[#C5A059] hover:text-white transition px-2 py-0.5 rounded border border-[rgba(197,160,89,0.2)] hover:border-[rgba(197,160,89,0.5)]"
                          >
                            Bearbeiten
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}

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
                {(modal as FormatEntry).id ? "Format bearbeiten" : "Neues Format"}
              </h2>
              <button onClick={closeModal}><X className="w-5 h-5 text-[rgba(249,249,249,0.4)]" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Slug</label>
                <input
                  value={modal.slug || ""}
                  onChange={e => setModal(m => m ? { ...m, slug: e.target.value } : m)}
                  disabled={!!(modal as FormatEntry).id}
                  placeholder="z.B. linkedin_post_square"
                  className={INPUT + ((modal as FormatEntry).id ? " opacity-50 cursor-not-allowed" : "")}
                />
              </div>
              <div>
                <label className={LABEL}>Kategorie</label>
                <select
                  value={modal.category || "image"}
                  onChange={e => setModal(m => m ? { ...m, category: e.target.value } : m)}
                  className={INPUT}
                >
                  <option value="image">image</option>
                  <option value="text">text</option>
                  <option value="video">video</option>
                  <option value="document">document</option>
                </select>
              </div>
            </div>

            <div>
              <label className={LABEL}>Name</label>
              <input
                value={modal.name || ""}
                onChange={e => setModal(m => m ? { ...m, name: e.target.value } : m)}
                placeholder="z.B. LinkedIn Post (1:1)"
                className={INPUT}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={LABEL}>Breite (px)</label>
                <input
                  type="number"
                  value={modal.width ?? ""}
                  onChange={e => setModal(m => m ? { ...m, width: e.target.value ? Number(e.target.value) : null } : m)}
                  placeholder="1080"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Höhe (px)</label>
                <input
                  type="number"
                  value={modal.height ?? ""}
                  onChange={e => setModal(m => m ? { ...m, height: e.target.value ? Number(e.target.value) : null } : m)}
                  placeholder="1080"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Seitenverhältnis</label>
                <input
                  value={modal.aspect_ratio || ""}
                  onChange={e => setModal(m => m ? { ...m, aspect_ratio: e.target.value } : m)}
                  placeholder="1:1"
                  className={INPUT}
                />
              </div>
            </div>

            <div>
              <label className={LABEL}>Safe Zone</label>
              <input
                value={modal.safe_zone || ""}
                onChange={e => setModal(m => m ? { ...m, safe_zone: e.target.value } : m)}
                placeholder="z.B. 80px alle Seiten"
                className={INPUT}
              />
            </div>

            <div>
              <label className={LABEL}>Text-Limits (JSON)</label>
              <textarea
                value={textLimitsRaw}
                onChange={e => { setTextLimitsRaw(e.target.value); setJsonError(""); }}
                rows={3}
                placeholder={'{"headline": 150, "body": 700}'}
                className={INPUT + " font-mono resize-y"}
              />
              {jsonError && <p className="text-[11px] text-red-400 mt-1">{jsonError}</p>}
            </div>

            <div>
              <label className={LABEL}>Notizen</label>
              <textarea
                value={modal.notes || ""}
                onChange={e => setModal(m => m ? { ...m, notes: e.target.value } : m)}
                rows={2}
                placeholder="Hinweise zur Verwendung..."
                className={INPUT + " resize-y"}
              />
            </div>

            <p className="text-[11px] text-[rgba(249,249,249,0.3)]">
              verified_at wird beim Speichern automatisch auf jetzt gesetzt.
            </p>

            <button
              onClick={save}
              disabled={saving || !modal.slug || !modal.name}
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
