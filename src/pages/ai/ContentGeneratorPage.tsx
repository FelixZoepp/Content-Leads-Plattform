import { useState, useEffect } from "react";
import { Megaphone, FileText, MessageSquare, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BotChat, BotType } from "@/components/ai/BotChat";

interface TovProfile {
  tonality: string | null;
  topics: string[] | null;
  no_gos: string[] | null;
  target_audience: string | null;
  style: string | null;
}

type TabKey = "lead_post" | "content_post" | "sales_script";

const TABS: { key: TabKey; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    key: "lead_post",
    label: "Lead-Posts",
    icon: <Megaphone className="w-4 h-4" />,
    desc: "Posts mit CTA, die Anfragen und DMs generieren",
  },
  {
    key: "content_post",
    label: "Content-Posts",
    icon: <FileText className="w-4 h-4" />,
    desc: "Reichweitenstarke Posts für Sichtbarkeit & Vertrauen",
  },
  {
    key: "sales_script",
    label: "Sales-Skripte",
    icon: <MessageSquare className="w-4 h-4" />,
    desc: "Outreach-Nachrichten und Gesprächsleitfäden",
  },
];

function buildTovContext(tov: TovProfile): string {
  const lines: string[] = [];
  if (tov.tonality) lines.push(`Tonalität: ${tov.tonality}`);
  if (tov.target_audience) lines.push(`Zielgruppe: ${tov.target_audience}`);
  if (tov.topics?.length) lines.push(`Themen: ${tov.topics.join(", ")}`);
  if (tov.no_gos?.length) lines.push(`No-Gos (unbedingt vermeiden): ${tov.no_gos.join(", ")}`);
  if (tov.style) lines.push(`Schreibstil: ${tov.style}`);
  return lines.join("\n");
}

export default function ContentGeneratorPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("lead_post");
  const [tov, setTov] = useState<TovProfile | null>(null);
  const [loadingTov, setLoadingTov] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadTov = async () => {
      const { data } = await supabase
        .from("tone_of_voice_profiles" as any)
        .select("tonality, topics, no_gos, target_audience, style")
        .eq("user_id", user.id)
        .maybeSingle();

      setTov(data as TovProfile | null);
      setLoadingTov(false);
    };

    loadTov();
  }, [user]);

  const currentTab = TABS.find((t) => t.key === activeTab)!;
  const tovContext = tov ? buildTovContext(tov) : undefined;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white">Content Generator</h1>
        <p className="text-[rgba(249,249,249,0.5)] mt-1 text-sm">
          KI-gestützte Post- und Skript-Erstellung für LinkedIn
        </p>
      </div>

      {/* ToV context badge */}
      {!loadingTov && (
        <div
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[12px] ${
            tov
              ? "bg-[#7FC29B]/8 border-[#7FC29B]/20 text-[#7FC29B]"
              : "bg-[rgba(249,249,249,0.03)] border-[rgba(249,249,249,0.08)] text-[rgba(249,249,249,0.4)]"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
          {tov ? (
            <span>
              Dein <strong className="text-[#7FC29B]">Tone-of-Voice Profil</strong> wird automatisch als Kontext
              verwendet.
            </span>
          ) : (
            <span>
              Kein Tone-of-Voice Profil gefunden.{" "}
              <a href="/dashboard/ai/tone-of-voice" className="text-[#C5A059] hover:underline">
                Jetzt erstellen →
              </a>
            </span>
          )}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-[rgba(249,249,249,0.04)] border border-[rgba(249,249,249,0.08)] rounded-xl">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-lg text-[13px] font-medium transition ${
              activeTab === tab.key
                ? "bg-[#C5A059] text-black shadow-sm"
                : "text-[rgba(249,249,249,0.55)] hover:text-white hover:bg-[rgba(249,249,249,0.06)]"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab description */}
      <p className="text-[12px] text-[rgba(249,249,249,0.4)]">{currentTab.desc}</p>

      {/* Chat panel */}
      <div className="glass-panel">
        {/* Re-mount BotChat when tab changes so each tab has its own session */}
        {TABS.map((tab) =>
          tab.key === activeTab ? (
            <BotChat
              key={tab.key}
              botType={tab.key as BotType}
              contextBlock={tovContext}
              placeholder={`Beschreibe deinen ${tab.label}-Wunsch...`}
            />
          ) : null
        )}
      </div>
    </div>
  );
}
