import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  CheckCircle2,
  Edit3,
  Save,
  X,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Layers,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Dossier {
  id: string;
  user_id: string;
  status: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DossierField {
  id: string;
  dossier_id: string;
  field_key: string;
  value_text: string | null;
  source: string | null;
  confidence: number | null;
  updated_at: string;
}

interface TovProfile {
  tonality: string | null;
  topics: string[] | null;
  no_gos: string[] | null;
  style: string | null;
  example_posts: string | null;
}

// ── Category definitions ──────────────────────────────────────────────────────

interface Category {
  label: string;
  keys: string[];
}

const CATEGORIES: Category[] = [
  { label: "Angebot", keys: ["angebot", "preismodell", "ergebnisse"] },
  { label: "ICP", keys: ["branche", "rolle", "groesse", "trigger", "schmerz"] },
  {
    label: "Kommunikation",
    keys: ["tonalitaet", "themen", "no_gos", "beispiel_posts", "kommunikationsstil"],
  },
  { label: "Visuell", keys: ["farben", "fonts", "logo", "bildstil", "claim"] },
  { label: "Content", keys: ["content_saeulen", "cta_ziel"] },
];

const ALL_KEYS = CATEGORIES.flatMap((c) => c.keys);

// human-readable field labels
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

// ── Source badge ──────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return null;
  const map: Record<string, { label: string; color: string }> = {
    form: { label: "Formular", color: "#8BB6E8" },
    transcript: { label: "Transkript", color: "#B49AE8" },
    manual: { label: "Manuell", color: "rgba(249,249,249,0.45)" },
    tov_interview: { label: "ToV-Interview", color: "#E9CB8B" },
  };
  const cfg = map[source] ?? { label: source, color: "rgba(249,249,249,0.3)" };
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-[0.08em] uppercase"
      style={{
        color: cfg.color,
        background: `${cfg.color}18`,
        border: `1px solid ${cfg.color}40`,
      }}
    >
      {cfg.label}
    </span>
  );
}

// ── Confidence bar ────────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number | null }) {
  if (value === null) return null;
  const pct = Math.round(value * 100);
  const color = pct >= 75 ? "#7FC29B" : pct >= 40 ? "#E9CB8B" : "#E87467";
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="h-1 rounded-full overflow-hidden"
        style={{ width: 48, background: "rgba(249,249,249,0.08)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[9px]" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DossierPage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();

  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [fields, setFields] = useState<DossierField[]>([]);
  const [customerName, setCustomerName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [importingTov, setImportingTov] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // per-field edit state: fieldKey → draft value
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<string>("");

  // collapsed categories
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // ── Load data ───────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      // customer name
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .maybeSingle();
      setCustomerName(profile?.full_name || profile?.email || userId.slice(0, 8));

      // latest dossier for user
      const { data: dos, error: dosErr } = await (supabase as any)
        .from("dossiers")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dosErr) throw dosErr;

      if (!dos) {
        setDossier(null);
        setFields([]);
        setLoading(false);
        return;
      }

      setDossier(dos as Dossier);

      // load fields
      const { data: flds, error: fldsErr } = await (supabase as any)
        .from("dossier_fields")
        .select("*")
        .eq("dossier_id", dos.id);

      if (fldsErr) throw fldsErr;
      setFields((flds as DossierField[]) ?? []);
    } catch (err: any) {
      setError(err?.message || "Fehler beim Laden.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Completeness score ──────────────────────────────────────────────────────

  const filledCount = ALL_KEYS.filter((k) =>
    fields.some((f) => f.field_key === k && f.value_text?.trim())
  ).length;
  const completeness = Math.round((filledCount / ALL_KEYS.length) * 100);

  // ── Create dossier ──────────────────────────────────────────────────────────

  async function createDossier() {
    if (!userId || !user) return;
    setSaving(true);
    setError(null);
    try {
      const { data, error: err } = await (supabase as any)
        .from("dossiers")
        .insert({ user_id: userId, status: "draft" })
        .select()
        .single();
      if (err) throw err;
      setDossier(data as Dossier);
      setFields([]);
    } catch (err: any) {
      setError(err?.message || "Fehler beim Erstellen.");
    } finally {
      setSaving(false);
    }
  }

  // ── Save field ──────────────────────────────────────────────────────────────

  async function saveField(fieldKey: string, value: string) {
    if (!dossier) return;
    setSaving(true);
    try {
      const existing = fields.find((f) => f.field_key === fieldKey);
      if (existing) {
        const { data, error: err } = await (supabase as any)
          .from("dossier_fields")
          .update({ value_text: value, source: "manual", updated_at: new Date().toISOString() })
          .eq("id", existing.id)
          .select()
          .single();
        if (err) throw err;
        setFields((prev) =>
          prev.map((f) => (f.id === existing.id ? (data as DossierField) : f))
        );
      } else {
        const { data, error: err } = await (supabase as any)
          .from("dossier_fields")
          .insert({
            dossier_id: dossier.id,
            field_key: fieldKey,
            value_text: value,
            source: "manual",
          })
          .select()
          .single();
        if (err) throw err;
        setFields((prev) => [...prev, data as DossierField]);
      }
    } catch (err: any) {
      setError(err?.message || "Fehler beim Speichern.");
    } finally {
      setSaving(false);
      setEditingKey(null);
    }
  }

  // ── Approve dossier ─────────────────────────────────────────────────────────

  async function approveDossier() {
    if (!dossier || !user) return;
    setApproving(true);
    setError(null);
    try {
      const { data, error: err } = await (supabase as any)
        .from("dossiers")
        .update({
          status: "approved",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", dossier.id)
        .select()
        .single();
      if (err) throw err;
      setDossier(data as Dossier);
      flash("Dossier freigegeben.");
    } catch (err: any) {
      setError(err?.message || "Fehler beim Freigeben.");
    } finally {
      setApproving(false);
    }
  }

  // ── Import from ToV profile ─────────────────────────────────────────────────

  async function importFromTov() {
    if (!dossier || !userId) return;
    setImportingTov(true);
    setError(null);
    try {
      const { data: tov, error: tovErr } = await (supabase as any)
        .from("tone_of_voice_profiles")
        .select("tonality, topics, no_gos, style, example_posts")
        .eq("user_id", userId)
        .maybeSingle();

      if (tovErr) throw tovErr;
      if (!tov) {
        setError("Kein ToV-Profil für diesen Nutzer gefunden.");
        return;
      }

      const profile = tov as TovProfile;
      const mapping: Array<{ key: string; value: string | null }> = [
        { key: "tonalitaet", value: profile.tonality },
        {
          key: "themen",
          value: Array.isArray(profile.topics) ? profile.topics.join(", ") : profile.topics,
        },
        {
          key: "no_gos",
          value: Array.isArray(profile.no_gos) ? profile.no_gos.join(", ") : profile.no_gos,
        },
        { key: "kommunikationsstil", value: profile.style },
        { key: "beispiel_posts", value: profile.example_posts },
      ];

      for (const { key, value } of mapping) {
        if (!value) continue;
        const existing = fields.find((f) => f.field_key === key);
        if (existing) {
          await (supabase as any)
            .from("dossier_fields")
            .update({ value_text: value, source: "tov_interview", updated_at: new Date().toISOString() })
            .eq("id", existing.id);
        } else {
          await (supabase as any)
            .from("dossier_fields")
            .insert({
              dossier_id: dossier.id,
              field_key: key,
              value_text: value,
              source: "tov_interview",
            });
        }
      }

      await load();
      flash("ToV-Profil übernommen.");
    } catch (err: any) {
      setError(err?.message || "Fehler beim Importieren.");
    } finally {
      setImportingTov(false);
    }
  }

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  function toggleCategory(label: string) {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (!dossier) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div
          className="glass-panel fade-up"
          style={{
            background: "linear-gradient(135deg, rgba(197,160,89,0.14), rgba(10,11,11,0.6))",
            borderColor: "rgba(197,160,89,0.2)",
          }}
        >
          <div className="relative z-[2]">
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">
              Berater · Dossier
            </span>
            <h1 className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>
              Dossier<span className="text-[#C5A059]">.</span>
            </h1>
            <p className="text-[13px] text-[rgba(249,249,249,0.5)] mt-1">{customerName}</p>
          </div>
        </div>

        {error && (
          <div
            className="glass-panel"
            style={{ borderColor: "rgba(232,116,103,0.3)", background: "rgba(232,116,103,0.06)" }}
          >
            <p className="relative z-[2] text-[13px] text-[#E87467]">{error}</p>
          </div>
        )}

        <div className="glass-panel fade-up text-center py-14">
          <div className="relative z-[2]">
            <FileText className="w-12 h-12 text-[rgba(249,249,249,0.07)] mx-auto mb-3" />
            <p className="text-[14px] text-[rgba(249,249,249,0.5)]">Kein Dossier vorhanden</p>
            <p className="text-[11px] text-[rgba(249,249,249,0.3)] mt-1 mb-6">
              Erstelle ein neues Dossier für diesen Kunden
            </p>
            <button
              onClick={createDossier}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, #C5A059, #E9CB8B)",
                color: "#0A0B0B",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Erstelle…" : "Dossier erstellen"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Dossier view ────────────────────────────────────────────────────────────

  const isApproved = dossier.status === "approved";

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
              Berater · Dossier
            </span>
            <h1 className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>
              {customerName}<span className="text-[#C5A059]">.</span>
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-[0.1em]"
                style={{
                  color: isApproved ? "#7FC29B" : "#E9CB8B",
                  background: isApproved ? "rgba(127,194,155,0.12)" : "rgba(233,203,139,0.1)",
                  border: `1px solid ${isApproved ? "#7FC29B40" : "#E9CB8B40"}`,
                }}
              >
                {isApproved ? "Freigegeben" : "Entwurf"}
              </span>
              {dossier.approved_at && (
                <span className="text-[11px] text-[rgba(249,249,249,0.3)]">
                  {new Date(dossier.approved_at).toLocaleDateString("de-DE")}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => load()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] text-[rgba(249,249,249,0.5)] hover:text-white border border-[rgba(249,249,249,0.08)] hover:border-[rgba(197,160,89,0.25)] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Neu laden
            </button>

            <button
              onClick={importFromTov}
              disabled={importingTov}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium border transition-colors"
              style={{
                color: "#E9CB8B",
                border: "1px solid rgba(233,203,139,0.25)",
                background: "rgba(233,203,139,0.06)",
                opacity: importingTov ? 0.6 : 1,
              }}
            >
              <Layers className="w-3.5 h-3.5" />
              {importingTov ? "Importiere…" : "Aus ToV-Profil übernehmen"}
            </button>

            {!isApproved && (
              <button
                onClick={approveDossier}
                disabled={approving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all"
                style={{
                  background: "linear-gradient(135deg, #C5A059, #E9CB8B)",
                  color: "#0A0B0B",
                  opacity: approving ? 0.6 : 1,
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {approving ? "Freigeben…" : "Dossier freigeben"}
              </button>
            )}
          </div>
        </div>

        {/* Completeness bar */}
        <div className="relative z-[2] mt-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[rgba(249,249,249,0.35)]">
              Vollständigkeit
            </span>
            <span
              className="text-[11px] font-semibold"
              style={{ color: completeness >= 75 ? "#7FC29B" : completeness >= 40 ? "#E9CB8B" : "#E87467" }}
            >
              {filledCount} / {ALL_KEYS.length} Felder · {completeness}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(249,249,249,0.08)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${completeness}%`,
                background:
                  completeness >= 75
                    ? "linear-gradient(90deg,#7FC29B,#A8D4BC)"
                    : completeness >= 40
                    ? "linear-gradient(90deg,#C5A059,#E9CB8B)"
                    : "linear-gradient(90deg,#E87467,#F0A09A)",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────────────────── */}
      {error && (
        <div
          className="glass-panel"
          style={{ borderColor: "rgba(232,116,103,0.3)", background: "rgba(232,116,103,0.06)" }}
        >
          <div className="relative z-[2] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#E87467] flex-shrink-0" />
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

      {/* ── Categories ─────────────────────────────────────────────────────── */}
      {CATEGORIES.map((cat, catIdx) => {
        const isOpen = !collapsed[cat.label];
        const catFilled = cat.keys.filter((k) =>
          fields.some((f) => f.field_key === k && f.value_text?.trim())
        ).length;

        return (
          <div
            key={cat.label}
            className="glass-panel fade-up"
            style={{ animationDelay: `${catIdx * 60}ms` }}
          >
            {/* Category header */}
            <button
              onClick={() => toggleCategory(cat.label)}
              className="relative z-[2] w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span
                  className="text-[15px] font-semibold text-white"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {cat.label}
                </span>
                <span
                  className="text-[9px] font-bold tracking-[0.15em] px-1.5 py-0.5 rounded"
                  style={{
                    color: catFilled === cat.keys.length ? "#7FC29B" : "rgba(249,249,249,0.35)",
                    background:
                      catFilled === cat.keys.length
                        ? "rgba(127,194,155,0.1)"
                        : "rgba(249,249,249,0.05)",
                  }}
                >
                  {catFilled}/{cat.keys.length}
                </span>
              </div>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-[rgba(249,249,249,0.3)]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[rgba(249,249,249,0.3)]" />
              )}
            </button>

            {/* Fields */}
            {isOpen && (
              <div className="relative z-[2] mt-4 space-y-3">
                {cat.keys.map((fieldKey) => {
                  const field = fields.find((f) => f.field_key === fieldKey);
                  const isEditing = editingKey === fieldKey;

                  return (
                    <div
                      key={fieldKey}
                      className="rounded-xl p-3 transition-colors"
                      style={{
                        background: isEditing
                          ? "rgba(197,160,89,0.06)"
                          : "rgba(249,249,249,0.025)",
                        border: `1px solid ${isEditing ? "rgba(197,160,89,0.25)" : "rgba(249,249,249,0.06)"}`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[rgba(249,249,249,0.4)]">
                              {FIELD_LABELS[fieldKey] ?? fieldKey}
                            </span>
                            {field && <SourceBadge source={field.source} />}
                            {field && <ConfidenceBar value={field.confidence} />}
                          </div>

                          {isEditing ? (
                            <textarea
                              autoFocus
                              value={editDraft}
                              onChange={(e) => setEditDraft(e.target.value)}
                              onBlur={() => {
                                if (editDraft !== (field?.value_text ?? "")) {
                                  saveField(fieldKey, editDraft);
                                } else {
                                  setEditingKey(null);
                                }
                              }}
                              rows={3}
                              className="w-full bg-transparent text-[13px] text-white resize-none outline-none"
                              style={{
                                border: "none",
                                color: "rgba(249,249,249,0.9)",
                              }}
                            />
                          ) : (
                            <p
                              className="text-[13px] leading-relaxed"
                              style={{
                                color: field?.value_text
                                  ? "rgba(249,249,249,0.8)"
                                  : "rgba(249,249,249,0.2)",
                                fontStyle: field?.value_text ? "normal" : "italic",
                              }}
                            >
                              {field?.value_text || "—"}
                            </p>
                          )}
                        </div>

                        {/* Edit / Save / Cancel */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isEditing ? (
                            <>
                              <button
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  saveField(fieldKey, editDraft);
                                }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                                style={{
                                  background: "rgba(127,194,155,0.12)",
                                  border: "1px solid rgba(127,194,155,0.3)",
                                  color: "#7FC29B",
                                }}
                                title="Speichern"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setEditingKey(null);
                                }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                                style={{
                                  background: "rgba(249,249,249,0.04)",
                                  border: "1px solid rgba(249,249,249,0.08)",
                                  color: "rgba(249,249,249,0.4)",
                                }}
                                title="Abbrechen"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingKey(fieldKey);
                                setEditDraft(field?.value_text ?? "");
                              }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                              style={{
                                background: "rgba(249,249,249,0.03)",
                                border: "1px solid rgba(249,249,249,0.07)",
                                color: "rgba(249,249,249,0.3)",
                              }}
                              title="Bearbeiten"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {saving && editingKey === fieldKey && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <div className="w-3 h-3 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
                          <span className="text-[10px] text-[rgba(249,249,249,0.3)]">Speichern…</span>
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
    </div>
  );
}
