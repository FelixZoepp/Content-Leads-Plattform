import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2, RotateCcw, ChevronDown } from "lucide-react";

interface DraftRevisionChatProps {
  contentItemId: string;
  currentBody: string;
  onUpdated: (newBody: string) => void;
}

export function DraftRevisionChat({ contentItemId, currentBody, onUpdated }: DraftRevisionChatProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [versions, setVersions] = useState<string[]>([currentBody]);
  const [showVersions, setShowVersions] = useState(false);

  async function revise() {
    if (!input.trim() || sending) return;
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          message: `Hier ist ein LinkedIn-Post-Entwurf. Bitte überarbeite ihn nach folgender Anweisung:

ANWEISUNG: ${input}

AKTUELLER ENTWURF:
${currentBody}

Gib NUR den überarbeiteten Text zurück, keine Erklärung.`,
          systemPrompt: "Du bist ein LinkedIn-Content-Editor. Überarbeite den gegebenen Text gemäß der Anweisung. Gib nur den neuen Text zurück.",
        },
      });

      if (error) throw error;
      const newBody = data?.reply || data?.response || currentBody;

      // Save version
      setVersions(prev => [...prev, newBody]);

      // Update content_item
      const metadata = { versions: [...versions, newBody].map((v, i) => ({ version: i, text: v.slice(0, 50) })) };
      await (supabase as any).from("content_items").update({ body: newBody, metadata_json: metadata, updated_at: new Date().toISOString() }).eq("id", contentItemId);

      onUpdated(newBody);
    } catch (err: any) {
      console.error("Revision error:", err);
    } finally {
      setSending(false);
      setInput("");
    }
  }

  function revert(versionIndex: number) {
    const oldBody = versions[versionIndex];
    if (!oldBody) return;
    onUpdated(oldBody);
    (supabase as any).from("content_items").update({ body: oldBody, updated_at: new Date().toISOString() }).eq("id", contentItemId);
  }

  return (
    <div className="border-t border-[rgba(249,249,249,0.06)] pt-3 mt-3 space-y-2">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && revise()}
          placeholder="z.B. 'Hook härter', 'kürzer', 'mehr Social Proof'..."
          className="flex-1 bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3 py-2 text-[12px] text-white placeholder:text-[rgba(249,249,249,0.15)] outline-none focus:border-[rgba(197,160,89,0.3)] transition"
        />
        <button onClick={revise} disabled={!input.trim() || sending} className="px-3 py-2 rounded-lg transition disabled:opacity-30" style={{ background: "linear-gradient(135deg, #C5A059, #775A19)" }}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
        </button>
      </div>

      {versions.length > 1 && (
        <div className="flex items-center gap-2">
          <button onClick={() => setShowVersions(!showVersions)} className="flex items-center gap-1 text-[10px] text-[rgba(249,249,249,0.3)] hover:text-white transition">
            <ChevronDown className={`w-3 h-3 transition ${showVersions ? "rotate-180" : ""}`} />
            {versions.length} Versionen
          </button>
          <button onClick={() => revert(0)} className="flex items-center gap-1 text-[10px] text-[rgba(249,249,249,0.3)] hover:text-[#E87467] transition">
            <RotateCcw className="w-3 h-3" /> Original
          </button>
        </div>
      )}

      {showVersions && versions.length > 1 && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {versions.map((v, i) => (
            <button key={i} onClick={() => revert(i)} className="w-full text-left px-2 py-1 rounded text-[10px] text-[rgba(249,249,249,0.4)] hover:bg-[rgba(249,249,249,0.04)] transition truncate">
              v{i}: {v.slice(0, 60)}...
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
