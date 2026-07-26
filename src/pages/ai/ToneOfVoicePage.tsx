import { useState, useEffect } from "react";
import { Mic, Edit3, Sparkles, ChevronRight, User, Target, Hash, AlertCircle, Palette, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BotChat } from "@/components/ai/BotChat";

interface ToneOfVoiceProfile {
  id: string;
  tonality: string | null;
  topics: string[] | null;
  no_gos: string[] | null;
  target_audience: string | null;
  style: string | null;
  example_posts: string | null;
  raw_summary: string | null;
  created_at: string;
  updated_at: string;
}

type ViewState = "loading" | "intro" | "interview" | "profile";

export default function ToneOfVoicePage() {
  const { user } = useAuth();
  const [view, setView] = useState<ViewState>("loading");
  const [profile, setProfile] = useState<ToneOfVoiceProfile | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  // ── Load existing ToV profile ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      const { data } = await supabase
        .from("tone_of_voice_profiles" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setProfile(data as ToneOfVoiceProfile);
        setView("profile");
      } else {
        setView("intro");
      }
    };

    loadProfile();
  }, [user, savedCount]);

  // When something is saved from BotChat, re-check for a new profile
  const handleSaved = () => setSavedCount((n) => n + 1);

  // ── Intro screen ──────────────────────────────────────────────────────────
  if (view === "loading") {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (view === "intro") {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Tone-of-Voice Interview</h1>
          <p className="text-[rgba(249,249,249,0.5)] mt-1 text-sm">
            Dein persönlicher Kommunikationsstil für LinkedIn
          </p>
        </div>

        <div className="glass-panel space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#C5A059]/15 border border-[#C5A059]/25 flex items-center justify-center flex-shrink-0">
              <Mic className="w-6 h-6 text-[#C5A059]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Was ist ein Tone-of-Voice Profil?</h2>
              <p className="text-sm text-[rgba(249,249,249,0.6)] mt-1 leading-relaxed">
                Dein Tone-of-Voice Profil legt fest, wie du auf LinkedIn kommunizierst — welche Themen du besprichst,
                welchen Ton du verwendest, wen du ansprechen willst und was du vermeiden möchtest.
              </p>
            </div>
          </div>

          <div className="border-t border-[rgba(249,249,249,0.06)] pt-5 grid grid-cols-2 gap-3">
            {[
              { icon: <Palette className="w-4 h-4" />, label: "Tonalität & Stil", desc: "Formal, locker, humorvoll?" },
              { icon: <Target className="w-4 h-4" />, label: "Zielgruppe", desc: "Wen möchtest du erreichen?" },
              { icon: <Hash className="w-4 h-4" />, label: "Themen", desc: "Über was postest du gerne?" },
              { icon: <AlertCircle className="w-4 h-4" />, label: "No-Gos", desc: "Was willst du vermeiden?" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-3 p-3 rounded-xl bg-[rgba(249,249,249,0.03)] border border-[rgba(249,249,249,0.06)]"
              >
                <div className="text-[#C5A059] mt-0.5">{item.icon}</div>
                <div>
                  <div className="text-[13px] font-semibold text-white">{item.label}</div>
                  <div className="text-[11px] text-[rgba(249,249,249,0.45)]">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-[rgba(249,249,249,0.06)] pt-5">
            <p className="text-[13px] text-[rgba(249,249,249,0.5)] mb-4">
              Der KI-Bot stellt dir 7 kurze Fragen. Das dauert ca. <strong className="text-white">5 Minuten</strong>.
              Danach wird dein Profil automatisch gespeichert und bei der Content-Erstellung verwendet.
            </p>
            <button
              onClick={() => setView("interview")}
              className="flex items-center gap-2 px-6 py-3 bg-[#C5A059] hover:bg-[#E9CB8B] text-black font-semibold rounded-xl transition text-sm"
            >
              <Sparkles className="w-4 h-4" />
              Interview starten
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "interview") {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Tone-of-Voice Interview</h1>
            <p className="text-[rgba(249,249,249,0.5)] mt-1 text-sm">
              Beantworte die Fragen des Bots — er erstellt am Ende dein Profil
            </p>
          </div>
          <button
            onClick={() => setView("intro")}
            className="text-[12px] text-[rgba(249,249,249,0.4)] hover:text-[rgba(249,249,249,0.7)] transition"
          >
            Abbrechen
          </button>
        </div>

        <div className="glass-panel">
          <BotChat
            botType="tone_of_voice"
            placeholder="Deine Antwort..."
            onSaved={handleSaved}
          />
        </div>

        <p className="text-[11px] text-[rgba(249,249,249,0.3)] text-center">
          Wenn der Bot dein Profil zusammengefasst hat, klicke auf "In Bibliothek speichern" um es zu sichern.
        </p>
      </div>
    );
  }

  // ── Profile view ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Dein Tone-of-Voice Profil</h1>
          <p className="text-[rgba(249,249,249,0.5)] mt-1 text-sm">
            Zuletzt aktualisiert:{" "}
            {profile?.updated_at
              ? new Date(profile.updated_at).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })
              : "—"}
          </p>
        </div>
        <button
          onClick={() => setView("interview")}
          className="flex items-center gap-2 px-4 py-2 border border-[rgba(249,249,249,0.12)] text-[rgba(249,249,249,0.6)] hover:text-white hover:border-[#C5A059]/40 rounded-xl transition text-sm"
        >
          <Edit3 className="w-4 h-4" />
          Aktualisieren
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {profile?.tonality && (
          <ProfileCard
            icon={<Palette className="w-4 h-4" />}
            title="Tonalität"
            content={profile.tonality}
          />
        )}

        {profile?.target_audience && (
          <ProfileCard
            icon={<Target className="w-4 h-4" />}
            title="Zielgruppe"
            content={profile.target_audience}
          />
        )}

        {profile?.topics && profile.topics.length > 0 && (
          <div className="glass-panel space-y-3">
            <div className="flex items-center gap-2 text-[rgba(249,249,249,0.5)] text-[11px] uppercase tracking-widest font-semibold">
              <Hash className="w-4 h-4 text-[#C5A059]" />
              Themen
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.topics.map((topic) => (
                <span
                  key={topic}
                  className="px-3 py-1 rounded-full text-[12px] bg-[#C5A059]/12 border border-[#C5A059]/25 text-[#E9CB8B]"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {profile?.no_gos && profile.no_gos.length > 0 && (
          <div className="glass-panel space-y-3">
            <div className="flex items-center gap-2 text-[rgba(249,249,249,0.5)] text-[11px] uppercase tracking-widest font-semibold">
              <AlertCircle className="w-4 h-4 text-[#E87467]" />
              No-Gos
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.no_gos.map((item) => (
                <span
                  key={item}
                  className="px-3 py-1 rounded-full text-[12px] bg-[#E87467]/10 border border-[#E87467]/25 text-[#E87467]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {profile?.style && (
          <ProfileCard
            icon={<User className="w-4 h-4" />}
            title="Schreibstil"
            content={profile.style}
          />
        )}

        {profile?.example_posts && (
          <ProfileCard
            icon={<FileText className="w-4 h-4" />}
            title="Beispiel-Posts / Referenzen"
            content={profile.example_posts}
          />
        )}

        {/* Raw summary fallback if structured fields are empty */}
        {profile?.raw_summary &&
          !profile.tonality &&
          !profile.target_audience && (
            <ProfileCard
              icon={<Sparkles className="w-4 h-4" />}
              title="Profil-Zusammenfassung"
              content={profile.raw_summary}
            />
          )}
      </div>

      {/* Re-do interview CTA at bottom */}
      <div className="glass-panel flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Profil aktualisieren</p>
          <p className="text-[12px] text-[rgba(249,249,249,0.45)] mt-0.5">
            Dein Stil hat sich verändert? Starte das Interview neu.
          </p>
        </div>
        <button
          onClick={() => setView("interview")}
          className="flex items-center gap-2 px-4 py-2 bg-[#C5A059]/15 hover:bg-[#C5A059]/25 border border-[#C5A059]/25 text-[#E9CB8B] rounded-xl transition text-sm font-medium"
        >
          <Edit3 className="w-4 h-4" />
          Neu starten
        </button>
      </div>
    </div>
  );
}

function ProfileCard({
  icon,
  title,
  content,
}: {
  icon: React.ReactNode;
  title: string;
  content: string;
}) {
  return (
    <div className="glass-panel space-y-2">
      <div className="flex items-center gap-2 text-[rgba(249,249,249,0.5)] text-[11px] uppercase tracking-widest font-semibold">
        <span className="text-[#C5A059]">{icon}</span>
        {title}
      </div>
      <p className="text-[13px] text-[rgba(249,249,249,0.8)] leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  );
}
