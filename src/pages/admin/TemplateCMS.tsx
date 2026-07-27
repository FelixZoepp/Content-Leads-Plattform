// CL-134: Template CMS
// Route: /dashboard/admin/templates

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Save,
  Loader2,
  X,
  Eye,
  Code2,
  FileCode,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormatEntry {
  id: string;
  slug: string;
  name: string;
  category: string;
}

interface Template {
  id: string;
  slug: string;
  name: string;
  category: string;
  format_id: string | null;
  html_template: string | null;
  variables_schema: Record<string, unknown> | null;
  created_at: string;
}

const CATEGORIES = ["image", "text", "carousel", "video", "document", "email"];

const emptyDraft = (): Partial<Template> => ({
  slug: "",
  name: "",
  category: "image",
  format_id: null,
  html_template: "",
  variables_schema: null,
});

// ── Style helpers ──────────────────────────────────────────────────────────────

const INPUT =
  "w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm placeholder-[rgba(249,249,249,0.25)] focus:outline-none focus:border-[rgba(197,160,89,0.5)]";
const LABEL =
  "block text-[11px] font-semibold tracking-wider uppercase text-[rgba(249,249,249,0.35)] mb-1";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Render HTML with simple {{variable}} substitution using sample values
function renderPreview(html: string, schema: Record<string, unknown> | null): string {
  if (!html) return "";
  let result = html;
  if (schema) {
    for (const [key, val] of Object.entries(schema)) {
      const sample =
        typeof val === "object" && val !== null && "sample" in val
          ? String((val as Record<string, unknown>).sample)
          : `[${key}]`;
      result = result.replaceAll(`{{${key}}}`, sample);
    }
  }
  return result;
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function TemplateModal({
  modal,
  formats,
  onClose,
  onSaved,
}: {
  modal: Partial<Template>;
  formats: FormatEntry[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Partial<Template>>(modal);
  const [schemaRaw, setSchemaRaw] = useState(
    modal.variables_schema ? JSON.stringify(modal.variables_schema, null, 2) : ""
  );
  const [jsonError, setJsonError] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isEdit = !!(modal as Template).id;

  // Update iframe content when preview mode toggles
  useEffect(() => {
    if (!previewMode || !iframeRef.current) return;
    let schema: Record<string, unknown> | null = null;
    if (schemaRaw.trim()) {
      try {
        schema = JSON.parse(schemaRaw);
      } catch {
        // ignore for preview
      }
    }
    const html = renderPreview(draft.html_template ?? "", schema);
    const doc = iframeRef.current.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }
  }, [previewMode, draft.html_template, schemaRaw]);

  async function save() {
    if (!draft.slug || !draft.name) return;
    setJsonError("");

    let parsedSchema: Record<string, unknown> | null = null;
    if (schemaRaw.trim()) {
      try {
        parsedSchema = JSON.parse(schemaRaw);
      } catch {
        setJsonError("Ungültiges JSON in variables_schema");
        return;
      }
    }

    setSaving(true);
    const payload = {
      slug: draft.slug,
      name: draft.name,
      category: draft.category || "image",
      format_id: draft.format_id || null,
      html_template: draft.html_template || null,
      variables_schema: parsedSchema,
    };

    if (isEdit) {
      await (supabase as any)
        .from("templates")
        .update(payload)
        .eq("id", (modal as Template).id);
    } else {
      await (supabase as any).from("templates").insert(payload);
    }

    setSaving(false);
    onSaved();
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#111827] border border-[#1E293B] rounded-2xl w-full max-w-3xl p-6 space-y-4 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {isEdit ? "Template bearbeiten" : "Neues Template"}
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-[rgba(249,249,249,0.4)] hover:text-white transition" />
          </button>
        </div>

        {/* Slug + Name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Slug</label>
            <input
              value={draft.slug || ""}
              onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
              disabled={isEdit}
              placeholder="z.B. linkedin_post_basic"
              className={INPUT + (isEdit ? " opacity-50 cursor-not-allowed" : "")}
            />
          </div>
          <div>
            <label className={LABEL}>Name</label>
            <input
              value={draft.name || ""}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="z.B. LinkedIn Post Basic"
              className={INPUT}
            />
          </div>
        </div>

        {/* Category + Format */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Kategorie</label>
            <select
              value={draft.category || "image"}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
              className={INPUT}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Format (optional)</label>
            <select
              value={draft.format_id || ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, format_id: e.target.value || null }))
              }
              className={INPUT}
            >
              <option value="">— kein Format —</option>
              {formats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.category})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* HTML/SVG Editor + Preview toggle */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={LABEL}>HTML / SVG Template</label>
            <button
              type="button"
              onClick={() => setPreviewMode((p) => !p)}
              className="flex items-center gap-1 text-[11px] text-[#C5A059] hover:text-white transition"
            >
              {previewMode ? (
                <>
                  <Code2 className="w-3.5 h-3.5" /> Code
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" /> Vorschau
                </>
              )}
            </button>
          </div>

          {previewMode ? (
            <div
              className="w-full rounded-lg overflow-hidden border border-[#1E293B]"
              style={{ height: 320 }}
            >
              <iframe
                ref={iframeRef}
                title="Template Preview"
                className="w-full h-full bg-white"
                sandbox="allow-scripts"
              />
            </div>
          ) : (
            <textarea
              value={draft.html_template || ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, html_template: e.target.value }))
              }
              rows={12}
              placeholder="<!DOCTYPE html>..."
              className={INPUT + " font-mono resize-y text-[12px]"}
              style={{ height: 320 }}
            />
          )}
        </div>

        {/* Variables Schema */}
        <div>
          <label className={LABEL}>variables_schema (JSON)</label>
          <textarea
            value={schemaRaw}
            onChange={(e) => {
              setSchemaRaw(e.target.value);
              setJsonError("");
            }}
            rows={5}
            placeholder={'{\n  "headline": { "type": "string", "sample": "Dein Titel hier" },\n  "body": { "type": "string", "sample": "Beispiel-Text..." }\n}'}
            className={INPUT + " font-mono resize-y text-[12px]"}
          />
          {jsonError && (
            <p className="text-[11px] text-red-400 mt-1">{jsonError}</p>
          )}
          <p className="text-[11px] text-[rgba(249,249,249,0.3)] mt-1">
            Nutze <code className="font-mono text-[#E9CB8B]">{"{{variable}}"}</code> im Template. Für die Vorschau: <code className="font-mono text-[#E9CB8B]">"sample"</code>-Wert pro Variable angeben.
          </p>
        </div>

        <button
          onClick={save}
          disabled={saving || !draft.slug || !draft.name}
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

export default function TemplateCMS() {
  const nav = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [formats, setFormats] = useState<FormatEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<Template> | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: t }, { data: f }] = await Promise.all([
      (supabase as any).from("templates").select("*").order("category").order("name"),
      (supabase as any)
        .from("format_registry")
        .select("id, slug, name, category")
        .order("name"),
    ]);
    setTemplates(t || []);
    setFormats(f || []);
    setLoading(false);
  }

  const formatMap = Object.fromEntries(formats.map((f) => [f.id, f]));
  const categories = [...new Set(templates.map((t) => t.category))].sort();

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
          <h1 className="text-2xl font-bold text-white">Template CMS</h1>
          <p className="text-sm text-[rgba(249,249,249,0.4)] mt-1">
            {templates.length} Templates registriert
          </p>
        </div>
        <button
          onClick={() => setModal(emptyDraft())}
          className="flex items-center gap-2 px-4 py-2 bg-[#D4A22A] text-black font-semibold rounded-lg hover:bg-[#B88B1F] transition text-sm"
        >
          <Plus className="w-4 h-4" /> Neues Template
        </button>
      </div>

      {/* Grouped by category */}
      {categories.length === 0 && (
        <div className="glass-panel text-center py-14">
          <div className="relative z-[2]">
            <FileCode className="w-10 h-10 text-[rgba(249,249,249,0.07)] mx-auto mb-3" />
            <p className="text-[14px] text-[rgba(249,249,249,0.4)]">
              Noch keine Templates vorhanden
            </p>
          </div>
        </div>
      )}

      {categories.map((cat) => {
        const catTemplates = templates.filter((t) => t.category === cat);
        return (
          <div key={cat} className="glass-panel" style={{ padding: 0 }}>
            <div className="relative z-[2]">
              {/* Category header */}
              <div className="px-5 py-3 border-b border-[rgba(249,249,249,0.06)] flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#E9CB8B]" />
                <span className="text-[13px] font-bold tracking-wider uppercase text-[#E9CB8B]">
                  {cat}
                </span>
                <span className="text-[11px] text-[rgba(249,249,249,0.3)] ml-1">
                  ({catTemplates.length})
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(249,249,249,0.06)]">
                      {["Slug", "Name", "Format", "Variablen", "Erstellt", ""].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-4 py-2.5 text-left text-[10px] font-bold tracking-wider uppercase text-[rgba(249,249,249,0.25)]"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {catTemplates.map((t) => {
                      const fmt = t.format_id ? formatMap[t.format_id] : null;
                      const varCount = t.variables_schema
                        ? Object.keys(t.variables_schema).length
                        : 0;
                      return (
                        <tr
                          key={t.id}
                          className="border-b border-[rgba(249,249,249,0.03)] hover:bg-[rgba(249,249,249,0.02)] transition"
                        >
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-[11px] text-[#E9CB8B] bg-[rgba(197,160,89,0.08)] px-2 py-0.5 rounded">
                              {t.slug}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-[13px] text-white font-medium whitespace-nowrap">
                            {t.name}
                          </td>
                          <td className="px-4 py-2.5 text-[12px] text-[rgba(249,249,249,0.55)]">
                            {fmt ? (
                              <span className="font-mono text-[11px] bg-[rgba(249,249,249,0.06)] px-2 py-0.5 rounded">
                                {fmt.slug}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-[12px] text-[rgba(249,249,249,0.5)]">
                            {varCount > 0 ? (
                              <span className="text-[11px] bg-[rgba(249,249,249,0.06)] px-2 py-0.5 rounded font-mono">
                                {varCount} var{varCount !== 1 ? "s" : ""}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-[12px] text-[rgba(249,249,249,0.4)] whitespace-nowrap">
                            {fmtDate(t.created_at)}
                          </td>
                          <td className="px-4 py-2.5">
                            <button
                              onClick={() => setModal({ ...t })}
                              className="text-[11px] text-[#C5A059] hover:text-white transition px-2 py-0.5 rounded border border-[rgba(197,160,89,0.2)] hover:border-[rgba(197,160,89,0.5)]"
                            >
                              Bearbeiten
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}

      {/* Modal */}
      {modal && (
        <TemplateModal
          modal={modal}
          formats={formats}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}
