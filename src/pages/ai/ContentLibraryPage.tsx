import { useState, useEffect, useCallback } from "react";
import {
  Library, Copy, Trash2, ChevronDown, ChevronUp, Check, Loader2, RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ContentItem {
  id: string;
  content_type: string;
  title: string | null;
  content: string;
  created_at: string;
}

type FilterTab = "all" | "lead_post" | "content_post" | "sales_script" | "tone_of_voice" | "profile_optimization";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "lead_post", label: "Lead-Posts" },
  { key: "content_post", label: "Content-Posts" },
  { key: "sales_script", label: "Sales-Skripte" },
  { key: "tone_of_voice", label: "Tone-of-Voice" },
  { key: "profile_optimization", label: "Profiloptimierung" },
];

const TYPE_LABELS: Record<string, string> = {
  lead_post: "Lead-Post",
  content_post: "Content-Post",
  sales_script: "Sales-Skript",
  tone_of_voice: "Tone-of-Voice",
  profile_optimization: "Profiloptimierung",
};

const TYPE_COLORS: Record<string, string> = {
  lead_post: "bg-[#C5A059]/12 border-[#C5A059]/25 text-[#E9CB8B]",
  content_post: "bg-[#8BB6E8]/12 border-[#8BB6E8]/25 text-[#8BB6E8]",
  sales_script: "bg-[#B49AE8]/12 border-[#B49AE8]/25 text-[#B49AE8]",
  tone_of_voice: "bg-[#7FC29B]/12 border-[#7FC29B]/25 text-[#7FC29B]",
  profile_optimization: "bg-[rgba(249,249,249,0.06)] border-[rgba(249,249,249,0.12)] text-[rgba(249,249,249,0.6)]",
};

export default function ContentLibraryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from("generated_content" as any)
      .select("id, content_type, title, content, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setItems((data as ContentItem[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const filtered =
    activeFilter === "all" ? items : items.filter((item) => item.content_type === activeFilter);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = async (item: ContentItem) => {
    try {
      await navigator.clipboard.writeText(item.content);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = item.content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const deleteItem = async (id: string) => {
    setDeletingId(id);
    await supabase.from("generated_content" as any).delete().eq("id", id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    setDeletingId(null);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Content-Bibliothek</h1>
          <p className="text-[rgba(249,249,249,0.5)] mt-1 text-sm">
            {items.length} gespeicherte{items.length === 1 ? "r Inhalt" : " Inhalte"}
          </p>
        </div>
        <button
          onClick={loadItems}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 border border-[rgba(249,249,249,0.08)] text-[rgba(249,249,249,0.45)] hover:text-white hover:border-[rgba(249,249,249,0.2)] rounded-xl transition text-[12px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {FILTER_TABS.map((tab) => {
          const count = tab.key === "all" ? items.length : items.filter((i) => i.content_type === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition ${
                activeFilter === tab.key
                  ? "bg-[#C5A059] border-[#C5A059] text-black"
                  : "bg-[rgba(249,249,249,0.04)] border-[rgba(249,249,249,0.08)] text-[rgba(249,249,249,0.55)] hover:text-white hover:border-[rgba(249,249,249,0.2)]"
              }`}
            >
              {tab.label}
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeFilter === tab.key
                    ? "bg-black/20 text-black"
                    : "bg-[rgba(249,249,249,0.08)] text-[rgba(249,249,249,0.4)]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-[#C5A059] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Library className="w-10 h-10 text-[rgba(249,249,249,0.15)]" />
          <p className="text-[rgba(249,249,249,0.45)] text-sm">
            {activeFilter === "all"
              ? "Noch keine Inhalte gespeichert."
              : `Noch keine ${FILTER_TABS.find((t) => t.key === activeFilter)?.label ?? "Inhalte"} gespeichert.`}
          </p>
          <a
            href="/dashboard/ai/content-generator"
            className="text-[#C5A059] hover:underline text-[13px]"
          >
            Jetzt Content erstellen →
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isExpanded = expandedIds.has(item.id);
            const preview = item.content.replace(/[#*_`]/g, "").trim();
            const displayTitle = item.title || preview.slice(0, 80) + (preview.length > 80 ? "…" : "");
            const typeColor = TYPE_COLORS[item.content_type] ?? TYPE_COLORS.profile_optimization;
            const typeLabel = TYPE_LABELS[item.content_type] ?? item.content_type;

            return (
              <div
                key={item.id}
                className="glass-card rounded-xl border border-[rgba(249,249,249,0.08)] overflow-hidden"
              >
                {/* Card header — always visible */}
                <div
                  className="flex items-start gap-3 px-4 py-3.5 cursor-pointer hover:bg-[rgba(249,249,249,0.02)] transition"
                  onClick={() => toggleExpand(item.id)}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-[13px] font-medium text-white leading-snug truncate">
                      {displayTitle}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] border font-medium ${typeColor}`}>
                        {typeLabel}
                      </span>
                      <span className="text-[11px] text-[rgba(249,249,249,0.35)]">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                    {/* Copy */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(item);
                      }}
                      className="p-2 rounded-lg text-[rgba(249,249,249,0.35)] hover:text-[#C5A059] hover:bg-[#C5A059]/10 transition"
                      title="Kopieren"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-[#7FC29B]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {/* Delete */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteItem(item.id);
                      }}
                      disabled={deletingId === item.id}
                      className="p-2 rounded-lg text-[rgba(249,249,249,0.35)] hover:text-[#E87467] hover:bg-[#E87467]/10 transition"
                      title="Löschen"
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {/* Expand toggle */}
                    <div className="p-2 text-[rgba(249,249,249,0.25)]">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-[rgba(249,249,249,0.06)] px-4 py-4 bg-[rgba(0,0,0,0.15)]">
                    <pre className="text-[13px] text-[rgba(249,249,249,0.8)] leading-relaxed whitespace-pre-wrap font-sans">
                      {item.content}
                    </pre>
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={() => copyToClipboard(item)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border transition ${
                          copiedId === item.id
                            ? "border-[#7FC29B]/30 text-[#7FC29B] bg-[#7FC29B]/10"
                            : "border-[rgba(249,249,249,0.1)] text-[rgba(249,249,249,0.45)] hover:text-[#C5A059] hover:border-[#C5A059]/30"
                        }`}
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="w-3 h-3" /> Kopiert!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> In Zwischenablage
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
