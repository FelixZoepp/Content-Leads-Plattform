import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  Save,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  ListOrdered,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  slug: string;
}

interface Feature {
  id: string;
  name: string;
  key: string;
}

interface OnboardingStep {
  id: string;
  track_id: string;
  type: string;
  title: string;
  description: string | null;
  config_json: any;
  required: boolean;
  order: number;
  unlocks_features: string[] | null;
}

interface OnboardingTrack {
  id: string;
  product_id: string | null;
  name: string;
  created_at: string;
  product?: Product | null;
  steps?: OnboardingStep[];
}

const STEP_TYPES = [
  { value: "form", label: "Formular" },
  { value: "video", label: "Video" },
  { value: "booking", label: "Buchung" },
  { value: "recording", label: "Aufnahme" },
  { value: "upload", label: "Datei-Upload" },
  { value: "approval", label: "Freigabe" },
  { value: "confirm", label: "Bestätigung" },
];

// ── Sortable Step Row ──────────────────────────────────────────────────────
function SortableStep({
  step,
  features,
  onEdit,
  onDelete,
}: {
  step: OnboardingStep;
  features: Feature[];
  onEdit: (s: OnboardingStep) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeLabel = STEP_TYPES.find((t) => t.value === step.type)?.label ?? step.type;
  const unlockedNames = (step.unlocks_features ?? [])
    .map((fid) => features.find((f) => f.id === fid)?.name ?? fid)
    .join(", ");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-xl border border-[rgba(249,249,249,0.08)] bg-[rgba(249,249,249,0.03)]"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-[rgba(249,249,249,0.2)] hover:text-[rgba(249,249,249,0.5)] transition flex-shrink-0"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-bold tracking-[0.2em] uppercase px-2 py-0.5 rounded-full"
            style={{ background: "rgba(197,160,89,0.15)", color: "#E9CB8B" }}
          >
            {typeLabel}
          </span>
          {step.required && (
            <span className="text-[9px] font-bold tracking-[0.2em] uppercase px-2 py-0.5 rounded-full bg-[rgba(232,116,103,0.15)] text-[#E87467]">
              Pflicht
            </span>
          )}
        </div>
        <p className="text-[13px] text-white font-medium mt-1">{step.title}</p>
        {step.description && (
          <p className="text-[11px] text-[rgba(249,249,249,0.4)] truncate mt-0.5">{step.description}</p>
        )}
        {unlockedNames && (
          <p className="text-[10px] text-[#7FC29B] mt-0.5">Schaltet frei: {unlockedNames}</p>
        )}
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => onEdit(step)}
          className="p-1.5 rounded-lg text-[rgba(249,249,249,0.3)] hover:text-[#E9CB8B] hover:bg-[rgba(197,160,89,0.08)] border border-transparent hover:border-[rgba(197,160,89,0.2)] transition"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(step.id)}
          className="p-1.5 rounded-lg text-[rgba(249,249,249,0.3)] hover:text-[#E87467] hover:bg-[rgba(232,116,103,0.08)] border border-transparent hover:border-[rgba(232,116,103,0.2)] transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Step Editor Modal ─────────────────────────────────────────────────────
function StepModal({
  step,
  features,
  onSave,
  onClose,
}: {
  step: Partial<OnboardingStep>;
  features: Feature[];
  onSave: (s: Partial<OnboardingStep>) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Partial<OnboardingStep>>(step);
  const [configText, setConfigText] = useState(
    step.config_json ? JSON.stringify(step.config_json, null, 2) : "{}"
  );
  const [configError, setConfigError] = useState("");

  function toggleFeature(fid: string) {
    const cur = draft.unlocks_features ?? [];
    setDraft((d) => ({
      ...d,
      unlocks_features: cur.includes(fid) ? cur.filter((x) => x !== fid) : [...cur, fid],
    }));
  }

  function handleSave() {
    let parsedConfig: any = {};
    try {
      parsedConfig = JSON.parse(configText);
      setConfigError("");
    } catch {
      setConfigError("Ungültiges JSON");
      return;
    }
    onSave({ ...draft, config_json: parsedConfig });
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative z-[2]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-white" style={{ fontFamily: "var(--font-serif)" }}>
              {draft.id ? "Schritt bearbeiten" : "Neuer Schritt"}
            </h2>
            <button onClick={onClose} className="text-[rgba(249,249,249,0.3)] hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Type */}
            <div>
              <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-1.5">
                Typ
              </label>
              <select
                value={draft.type ?? "form"}
                onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
                className="w-full bg-[rgba(10,11,11,0.6)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3 py-2.5 text-[13px] text-white outline-none focus:border-[rgba(197,160,89,0.3)] transition"
              >
                {STEP_TYPES.map((t) => (
                  <option key={t.value} value={t.value} className="bg-[#141616]">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-1.5">
                Titel
              </label>
              <input
                value={draft.title ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                className="w-full bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-[rgba(249,249,249,0.2)] outline-none focus:border-[rgba(197,160,89,0.3)] transition"
                placeholder="z.B. Profil ausfüllen"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-1.5">
                Beschreibung
              </label>
              <textarea
                value={draft.description ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                rows={2}
                className="w-full bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-[rgba(249,249,249,0.2)] outline-none focus:border-[rgba(197,160,89,0.3)] transition resize-none"
                placeholder="Kurze Erklärung für den Kunden"
              />
            </div>

            {/* Config JSON */}
            <div>
              <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-1.5">
                Konfiguration (JSON)
              </label>
              <textarea
                value={configText}
                onChange={(e) => setConfigText(e.target.value)}
                rows={5}
                className={`w-full bg-[rgba(10,11,11,0.6)] border rounded-lg px-3 py-2.5 text-[12px] text-white font-mono placeholder:text-[rgba(249,249,249,0.2)] outline-none transition resize-y ${
                  configError
                    ? "border-[rgba(232,116,103,0.5)]"
                    : "border-[rgba(249,249,249,0.08)] focus:border-[rgba(197,160,89,0.3)]"
                }`}
                placeholder='{"url": "...", "fields": [...]}'
              />
              {configError && (
                <p className="text-[11px] text-[#E87467] mt-1">{configError}</p>
              )}
            </div>

            {/* Pflicht */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setDraft((d) => ({ ...d, required: !d.required }))}
                className={`w-10 h-5 rounded-full transition relative flex-shrink-0 ${
                  draft.required ? "bg-[#C5A059]" : "bg-[rgba(249,249,249,0.1)]"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    draft.required ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </div>
              <span className="text-[13px] text-[rgba(249,249,249,0.7)]">Pflichtschritt</span>
            </label>

            {/* Unlocks Features */}
            {features.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-2">
                  Schaltet Features frei
                </label>
                <div className="space-y-1.5">
                  {features.map((f) => (
                    <label key={f.id} className="flex items-center gap-2.5 cursor-pointer">
                      <div
                        onClick={() => toggleFeature(f.id)}
                        className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                          (draft.unlocks_features ?? []).includes(f.id)
                            ? "bg-[#C5A059] border-[#C5A059]"
                            : "border-[rgba(249,249,249,0.2)] bg-transparent"
                        }`}
                      >
                        {(draft.unlocks_features ?? []).includes(f.id) && (
                          <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 12 12">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className="text-[12px] text-[rgba(249,249,249,0.7)]">{f.name}</span>
                      <span className="text-[10px] text-[rgba(249,249,249,0.3)]">{f.key}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-[rgba(249,249,249,0.08)] rounded-lg text-[12px] text-[rgba(249,249,249,0.5)] hover:bg-[rgba(249,249,249,0.04)] transition"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={!draft.title}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-semibold text-white transition disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #C5A059, #775A19)" }}
              >
                <Save className="w-3.5 h-3.5" />
                Speichern
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function OnboardingTrackEditor() {
  const nav = useNavigate();
  const [tracks, setTracks] = useState<OnboardingTrack[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Track being edited (null = list view)
  const [selectedTrack, setSelectedTrack] = useState<OnboardingTrack | null>(null);
  const [expandedTrack, setExpandedTrack] = useState<string | null>(null);

  // New track form
  const [showNewTrack, setShowNewTrack] = useState(false);
  const [newName, setNewName] = useState("");
  const [newProductId, setNewProductId] = useState("");

  // Step editing
  const [editingStep, setEditingStep] = useState<Partial<OnboardingStep> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [tracksRes, productsRes, featuresRes] = await Promise.all([
      (supabase as any)
        .from("onboarding_tracks")
        .select("*, product:products(id, name, slug), steps:onboarding_steps(*)")
        .order("created_at"),
      (supabase as any).from("products").select("id, name, slug").order("name"),
      (supabase as any).from("features").select("id, name, key").order("name"),
    ]);

    const processed = (tracksRes.data || []).map((t: any) => ({
      ...t,
      steps: (t.steps || []).sort((a: any, b: any) => a.order - b.order),
    }));
    setTracks(processed);
    setProducts(productsRes.data || []);
    setFeatures(featuresRes.data || []);
    setLoading(false);
  }

  async function createTrack() {
    if (!newName.trim()) return;
    setSaving(true);
    await (supabase as any).from("onboarding_tracks").insert({
      name: newName.trim(),
      product_id: newProductId || null,
    });
    setNewName("");
    setNewProductId("");
    setShowNewTrack(false);
    await loadAll();
    setSaving(false);
  }

  async function deleteTrack(id: string) {
    if (!confirm("Track und alle Schritte löschen?")) return;
    await (supabase as any).from("onboarding_tracks").delete().eq("id", id);
    setSelectedTrack(null);
    await loadAll();
  }

  // ── Step CRUD ───────────────────────────────────────────────────────────
  async function saveStep(draft: Partial<OnboardingStep>, trackId: string) {
    setSaving(true);
    const trackSteps = tracks.find((t) => t.id === trackId)?.steps ?? [];
    if (draft.id) {
      await (supabase as any)
        .from("onboarding_steps")
        .update({
          type: draft.type,
          title: draft.title,
          description: draft.description,
          config_json: draft.config_json,
          required: draft.required ?? false,
          unlocks_features: draft.unlocks_features ?? [],
        })
        .eq("id", draft.id);
    } else {
      const maxOrder = trackSteps.length > 0 ? Math.max(...trackSteps.map((s) => s.order)) : -1;
      await (supabase as any).from("onboarding_steps").insert({
        track_id: trackId,
        type: draft.type ?? "form",
        title: draft.title,
        description: draft.description ?? null,
        config_json: draft.config_json ?? {},
        required: draft.required ?? false,
        order: maxOrder + 1,
        unlocks_features: draft.unlocks_features ?? [],
      });
    }
    setEditingStep(null);
    await loadAll();
    setSaving(false);
  }

  async function deleteStep(stepId: string) {
    if (!confirm("Schritt löschen?")) return;
    await (supabase as any).from("onboarding_steps").delete().eq("id", stepId);
    await loadAll();
  }

  async function handleDragEnd(event: DragEndEvent, trackId: string) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const track = tracks.find((t) => t.id === trackId);
    if (!track?.steps) return;

    const oldIndex = track.steps.findIndex((s) => s.id === active.id);
    const newIndex = track.steps.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(track.steps, oldIndex, newIndex);

    // Optimistic update
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, steps: reordered } : t))
    );

    // Persist new order
    await Promise.all(
      reordered.map((s, i) =>
        (supabase as any).from("onboarding_steps").update({ order: i }).eq("id", s.id)
      )
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="glass-panel fade-up">
        <div className="relative z-[2] flex items-center justify-between">
          <div>
            <button
              onClick={() => nav("/dashboard/admin")}
              className="flex items-center gap-2 text-[12px] text-[rgba(249,249,249,0.4)] hover:text-white transition mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Admin Dashboard
            </button>
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">
              Administration
            </span>
            <h1 className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>
              Onboarding Tracks
            </h1>
            <p className="text-[13px] text-[rgba(249,249,249,0.5)] mt-0.5">
              {tracks.length} Track{tracks.length !== 1 ? "s" : ""} konfiguriert
            </p>
          </div>
          <button
            onClick={() => setShowNewTrack(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold text-white transition"
            style={{ background: "linear-gradient(135deg, #C5A059, #775A19)", boxShadow: "0 0 18px rgba(197,160,89,0.35)" }}
          >
            <Plus className="w-4 h-4" /> Neuer Track
          </button>
        </div>
      </div>

      {/* Tracks List */}
      <div className="space-y-4">
        {tracks.length === 0 && (
          <div className="glass-panel text-center py-12">
            <div className="relative z-[2]">
              <ListOrdered className="w-10 h-10 text-[rgba(249,249,249,0.1)] mx-auto mb-3" />
              <p className="text-[13px] text-[rgba(249,249,249,0.5)]">Noch keine Tracks angelegt</p>
              <p className="text-[11px] text-[rgba(249,249,249,0.3)] mt-1">
                Erstelle deinen ersten Onboarding-Track
              </p>
            </div>
          </div>
        )}

        {tracks.map((track, ti) => {
          const isExpanded = expandedTrack === track.id;
          const productName = track.product?.name ?? "Kein Produkt";
          const steps = track.steps ?? [];

          return (
            <div key={track.id} className="glass-panel fade-up" style={{ animationDelay: `${ti * 60}ms` }}>
              <div className="relative z-[2]">
                {/* Track header */}
                <div
                  className="flex items-center gap-4 cursor-pointer"
                  onClick={() => setExpandedTrack(isExpanded ? null : track.id)}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(197,160,89,0.15)", border: "1px solid rgba(197,160,89,0.25)" }}
                  >
                    <ListOrdered className="w-5 h-5 text-[#E9CB8B]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-white">{track.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-[rgba(249,249,249,0.4)]">{productName}</span>
                      <span className="text-[10px] text-[rgba(249,249,249,0.25)]">·</span>
                      <span className="text-[11px] text-[rgba(249,249,249,0.4)]">
                        {steps.length} Schritt{steps.length !== 1 ? "e" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTrack(track.id);
                      }}
                      className="p-1.5 rounded-lg text-[rgba(249,249,249,0.2)] hover:text-[#E87467] hover:bg-[rgba(232,116,103,0.08)] transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[rgba(249,249,249,0.3)]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[rgba(249,249,249,0.3)]" />
                    )}
                  </div>
                </div>

                {/* Expanded step editor */}
                {isExpanded && (
                  <div className="mt-5 pt-5 border-t border-[rgba(249,249,249,0.08)]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[12px] font-bold tracking-[0.15em] uppercase text-[rgba(249,249,249,0.4)]">
                        Schritte ({steps.length})
                      </h3>
                      <button
                        onClick={() =>
                          setEditingStep({
                            track_id: track.id,
                            type: "form",
                            title: "",
                            description: "",
                            config_json: {},
                            required: false,
                            unlocks_features: [],
                          })
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-[#E9CB8B] border border-[rgba(197,160,89,0.3)] hover:bg-[rgba(197,160,89,0.08)] transition"
                      >
                        <Plus className="w-3.5 h-3.5" /> Schritt hinzufügen
                      </button>
                    </div>

                    {steps.length === 0 ? (
                      <p className="text-[12px] text-[rgba(249,249,249,0.3)] py-4 text-center">
                        Noch keine Schritte — füge den ersten hinzu
                      </p>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => handleDragEnd(e, track.id)}
                      >
                        <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-2">
                            {steps.map((step) => (
                              <SortableStep
                                key={step.id}
                                step={step}
                                features={features}
                                onEdit={(s) => setEditingStep(s)}
                                onDelete={deleteStep}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Track Modal */}
      {showNewTrack && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowNewTrack(false)}
        >
          <div
            className="glass-panel w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative z-[2]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold text-white" style={{ fontFamily: "var(--font-serif)" }}>
                  Neuen Track erstellen
                </h2>
                <button
                  onClick={() => setShowNewTrack(false)}
                  className="text-[rgba(249,249,249,0.3)] hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-1.5">
                    Track-Name
                  </label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-[rgba(249,249,249,0.2)] outline-none focus:border-[rgba(197,160,89,0.3)] transition"
                    placeholder="z.B. LinkedIn Profiloptimierung Onboarding"
                    onKeyDown={(e) => e.key === "Enter" && createTrack()}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-1.5">
                    Produkt (optional)
                  </label>
                  <select
                    value={newProductId}
                    onChange={(e) => setNewProductId(e.target.value)}
                    className="w-full bg-[rgba(10,11,11,0.6)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3 py-2.5 text-[13px] text-white outline-none focus:border-[rgba(197,160,89,0.3)] transition"
                  >
                    <option value="" className="bg-[#141616]">Kein Produkt</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#141616]">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setShowNewTrack(false)}
                    className="flex-1 px-4 py-2.5 border border-[rgba(249,249,249,0.08)] rounded-lg text-[12px] text-[rgba(249,249,249,0.5)] hover:bg-[rgba(249,249,249,0.04)] transition"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={createTrack}
                    disabled={saving || !newName.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-semibold text-white transition disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #C5A059, #775A19)" }}
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Erstellen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step Edit Modal */}
      {editingStep && (
        <StepModal
          step={editingStep}
          features={features}
          onSave={(draft) => {
            const trackId = draft.track_id ?? editingStep.track_id ?? "";
            saveStep(draft, trackId);
          }}
          onClose={() => setEditingStep(null)}
        />
      )}
    </div>
  );
}
