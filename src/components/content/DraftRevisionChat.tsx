// CL-145: Chat Revision on Drafts
// Reusable component shown on each content_item draft.
// Sends revision instructions to ai-chat and saves result back to content_items.

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare,
  Send,
  Check,
  RotateCcw,
  ChevronDown,
  Loader2,
  Clock,
  X,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ContentVersion {
  body: string;
  savedAt: string;
  instruction?: string;
}

export interface DraftRevisionChatProps {
  contentItemId: string;
  /** Called after a successful "Übernehmen" so parent can refresh */
  onBodyUpdated?: (newBody: string) => void;
}

// ── Quick-action chips ────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  "Hook härter",
  "Kürzer",
  "Mehr Social Proof",
  "CTA stärker",
  "Persönlicher",
  "Konkreter",
  "Weniger Floskeln",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DraftRevisionChat({ contentItemId, onBodyUpdated }: DraftRevisionChatProps) {
  const [currentBody, setCurrentBody] = useState<string | null>(null);
  const [originalBody, setOriginalBody] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Chat state
  const [input, setInput] = useState("");
  const [pendingRevision, setPendingRevision] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastInstruction, setLastInstruction] = useState("");

  // Version history stored in metadata
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Load item ───────────────────────────────────────────────────────────────

  useEffect(() => {
    let active = true;

    async function loadItem() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await (supabase as any)
          .from("content_items")
          .select("body, metadata")
          .eq("id", contentItemId)
          .single();

        if (err) throw err;
        if (!active) return;

        const body = (data?.body as string) ?? "";
        setCurrentBody(body);

        const meta = (data?.metadata as Record<string, unknown>) ?? {};
        const storedVersions = (meta.revision_history as ContentVersion[]) ?? [];
        setVersions(storedVersions);

        // Original = body before any revisions (index 0 version), else current body
        const orig = storedVersions.length > 0 ? storedVersions[0].body : body;
        setOriginalBody(orig);
      } catch (err: any) {
        if (active) setError(err?.message || "Fehler beim Laden.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadItem();
    return () => { active = false; };
  }, [contentItemId]);

  // ── Generate revision ───────────────────────────────────────────────────────

  async function generateRevision(instruction: string) {
    if (!currentBody || !instruction.trim()) return;
    setIsGenerating(true);
    setError(null);
    setPendingRevision(null);
    setLastInstruction(instruction.trim());

    try {
      const systemPrompt =
        "Du bist ein LinkedIn-Content-Experte und überarbeitest Posts auf Anweisung. " +
        "Antworte NUR mit dem überarbeiteten Post-Text — keine Erklärung, kein Kommentar, kein Titel. " +
        "Halte Länge und Struktur ähnlich, außer die Anweisung verlangt explizit etwas anderes.";

      const userMessage = `AKTUELLER POST:\n${currentBody}\n\nANWEISUNG: ${instruction}`;

      const { data, error: fnErr } = await (supabase as any).functions.invoke("ai-chat", {
        body: { message: userMessage, history: [], systemPrompt },
      });

      if (fnErr) throw fnErr;

      const reply = (data?.reply as string | undefined)?.trim();
      if (!reply) throw new Error("Keine Antwort von der KI.");

      setPendingRevision(reply);
    } catch (err: any) {
      setError(err?.message || "KI-Fehler. Bitte erneut versuchen.");
    } finally {
      setIsGenerating(false);
      setInput("");
    }
  }

  // ── Accept revision ─────────────────────────────────────────────────────────

  async function acceptRevision() {
    if (!pendingRevision) return;
    setIsSaving(true);
    setError(null);

    try {
      const { data: row } = await (supabase as any)
        .from("content_items")
        .select("metadata")
        .eq("id", contentItemId)
        .single();

      const meta = ((row?.metadata as Record<string, unknown>) ?? {}) as Record<string, unknown>;

      // Push the current (pre-revision) body into history
      const newVersion: ContentVersion = {
        body: currentBody ?? "",
        savedAt: new Date().toISOString(),
        instruction: lastInstruction || undefined,
      };
      const updatedVersions: ContentVersion[] = [...versions, newVersion];

      const { error: updateErr } = await (supabase as any)
        .from("content_items")
        .update({
          body: pendingRevision,
          metadata: { ...meta, revision_history: updatedVersions },
        })
        .eq("id", contentItemId);

      if (updateErr) throw updateErr;

      setCurrentBody(pendingRevision);
      setVersions(updatedVersions);
      setPendingRevision(null);
      onBodyUpdated?.(pendingRevision);
      flash("Revision übernommen.");
    } catch (err: any) {
      setError(err?.message || "Fehler beim Speichern.");
    } finally {
      setIsSaving(false);
    }
  }

  // ── Revert to original ──────────────────────────────────────────────────────

  async function revertToOriginal() {
    if (!originalBody) return;
    setIsSaving(true);
    setError(null);

    try {
      const { data: row } = await (supabase as any)
        .from("content_items")
        .select("metadata")
        .eq("id", contentItemId)
        .single();

      const meta = ((row?.metadata as Record<string, unknown>) ?? {}) as Record<string, unknown>;

      const { error: updateErr } = await (supabase as any)
        .from("content_items")
        .update({ body: originalBody, metadata: { ...meta, revision_history: [] } })
        .eq("id", contentItemId);

      if (updateErr) throw updateErr;

      setCurrentBody(originalBody);
      setVersions([]);
      setPendingRevision(null);
      onBodyUpdated?.(originalBody);
      flash("Auf Original zurückgesetzt.");
    } catch (err: any) {
      setError(err?.message || "Fehler beim Zurücksetzen.");
    } finally {
      setIsSaving(false);
    }
  }

  // ── Restore a version ────────────────────────────────────────────────────────

  async function restoreVersion(version: ContentVersion) {
    setIsSaving(true);
    setError(null);
    setShowVersions(false);

    try {
      const { data: row } = await (supabase as any)
        .from("content_items")
        .select("metadata")
        .eq("id", contentItemId)
        .single();

      const meta = ((row?.metadata as Record<string, unknown>) ?? {}) as Record<string, unknown>;

      const { error: updateErr } = await (supabase as any)
        .from("content_items")
        .update({ body: version.body, metadata: { ...meta } })
        .eq("id", contentItemId);

      if (updateErr) throw updateErr;

      setCurrentBody(version.body);
      setPendingRevision(null);
      onBodyUpdated?.(version.body);
      flash("Version wiederhergestellt.");
    } catch (err: any) {
      setError(err?.message || "Fehler beim Wiederherstellen.");
    } finally {
      setIsSaving(false);
    }
  }

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim()) generateRevision(input.trim());
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) generateRevision(input.trim());
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-6 h-6 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasRevisions = versions.length > 0;
  const isModified = currentBody !== originalBody;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#C5A059]" />
          <span
            className="text-[14px] font-semibold text-white"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            KI-Revision
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Version history dropdown */}
          {hasRevisions && (
            <div className="relative">
              <button
                onClick={() => setShowVersions((p) => !p)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                style={{
                  background: "rgba(139,182,232,0.08)",
                  border: "1px solid rgba(139,182,232,0.2)",
                  color: "#8BB6E8",
                }}
              >
                <Clock className="w-3 h-3" />
                {versions.length} Version{versions.length !== 1 ? "en" : ""}
                <ChevronDown
                  className="w-3 h-3 transition-transform"
                  style={{ transform: showVersions ? "rotate(180deg)" : "none" }}
                />
              </button>

              {showVersions && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-64 rounded-xl z-20 overflow-hidden"
                  style={{
                    background: "rgba(14,15,15,0.98)",
                    border: "1px solid rgba(249,249,249,0.1)",
                    boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
                  }}
                >
                  <div className="px-3 py-2 border-b border-[rgba(249,249,249,0.07)] flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[rgba(249,249,249,0.35)]">
                      Versionshistorie
                    </span>
                    <button onClick={() => setShowVersions(false)}>
                      <X className="w-3.5 h-3.5 text-[rgba(249,249,249,0.3)] hover:text-white" />
                    </button>
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {versions.map((v, idx) => (
                      <button
                        key={idx}
                        onClick={() => restoreVersion(v)}
                        className="w-full text-left px-3 py-2.5 hover:bg-[rgba(249,249,249,0.04)] transition-colors border-b border-[rgba(249,249,249,0.04)] last:border-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-[rgba(249,249,249,0.65)]">
                            {v.instruction
                              ? `"${v.instruction.slice(0, 28)}${v.instruction.length > 28 ? "…" : ""}"`
                              : `Version ${idx + 1}`}
                          </span>
                          <span className="text-[10px] text-[rgba(249,249,249,0.3)] flex-shrink-0">
                            {formatTime(v.savedAt)}
                          </span>
                        </div>
                        <p className="text-[10px] text-[rgba(249,249,249,0.3)] mt-0.5 truncate">
                          {v.body.slice(0, 58)}…
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reset to original */}
          {isModified && (
            <button
              onClick={revertToOriginal}
              disabled={isSaving}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
              style={{
                background: "rgba(232,116,103,0.08)",
                border: "1px solid rgba(232,116,103,0.2)",
                color: "#E87467",
                opacity: isSaving ? 0.6 : 1,
              }}
            >
              <RotateCcw className="w-3 h-3" />
              Zurücksetzen
            </button>
          )}
        </div>
      </div>

      {/* ── Current body preview ────────────────────────────────────────────── */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "rgba(249,249,249,0.025)",
          border: "1px solid rgba(249,249,249,0.07)",
        }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[rgba(249,249,249,0.35)] mb-2">
          Aktueller Entwurf
        </p>
        <p className="text-[13px] text-[rgba(249,249,249,0.8)] leading-relaxed whitespace-pre-wrap">
          {currentBody || (
            <span className="italic text-[rgba(249,249,249,0.3)]">Kein Inhalt vorhanden.</span>
          )}
        </p>
      </div>

      {/* ── Pending revision preview ─────────────────────────────────────────── */}
      {pendingRevision && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: "rgba(197,160,89,0.06)",
            border: "1px solid rgba(197,160,89,0.25)",
          }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#E9CB8B]">
            KI-Vorschlag
          </p>
          <p className="text-[13px] text-[rgba(249,249,249,0.85)] leading-relaxed whitespace-pre-wrap">
            {pendingRevision}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={acceptRevision}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, #C5A059, #E9CB8B)",
                color: "#0A0B0B",
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Übernehmen
            </button>
            <button
              onClick={() => setPendingRevision(null)}
              className="px-4 py-2 rounded-xl text-[12px] font-semibold transition-colors"
              style={{
                background: "rgba(249,249,249,0.06)",
                border: "1px solid rgba(249,249,249,0.1)",
                color: "rgba(249,249,249,0.5)",
              }}
            >
              Verwerfen
            </button>
          </div>
        </div>
      )}

      {/* ── Messages ───────────────────────────────────────────────────────── */}
      {error && (
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-[12px]"
          style={{
            background: "rgba(232,116,103,0.08)",
            border: "1px solid rgba(232,116,103,0.2)",
            color: "#E87467",
          }}
        >
          {error}
        </div>
      )}

      {successMsg && (
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px]"
          style={{
            background: "rgba(127,194,155,0.08)",
            border: "1px solid rgba(127,194,155,0.2)",
            color: "#7FC29B",
          }}
        >
          <Check className="w-3.5 h-3.5 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* ── Quick actions ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action}
            onClick={() => generateRevision(action)}
            disabled={isGenerating || isSaving}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
            style={{
              background: "rgba(197,160,89,0.06)",
              border: "1px solid rgba(197,160,89,0.18)",
              color: isGenerating || isSaving ? "rgba(197,160,89,0.4)" : "#E9CB8B",
              cursor: isGenerating || isSaving ? "not-allowed" : "pointer",
            }}
          >
            {action}
          </button>
        ))}
      </div>

      {/* ── Chat input ──────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit}>
        <div
          className="flex gap-2 rounded-xl p-2"
          style={{
            background: "rgba(249,249,249,0.04)",
            border: "1px solid rgba(249,249,249,0.09)",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='z.B. "Hook härter machen" oder "mehr Zahlen einbauen"'
            rows={2}
            disabled={isGenerating}
            className="flex-1 bg-transparent text-[13px] text-white placeholder-[rgba(249,249,249,0.25)] outline-none resize-none py-1 px-1"
          />
          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="w-9 h-9 self-end rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background:
                !input.trim() || isGenerating
                  ? "rgba(249,249,249,0.06)"
                  : "linear-gradient(135deg, #C5A059, #E9CB8B)",
              color:
                !input.trim() || isGenerating ? "rgba(249,249,249,0.25)" : "#0A0B0B",
              cursor: !input.trim() || isGenerating ? "not-allowed" : "pointer",
            }}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-[rgba(249,249,249,0.25)]">
          Enter zum Senden · Shift+Enter für Zeilenumbruch
        </p>
      </form>
    </div>
  );
}
