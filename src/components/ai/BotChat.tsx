import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Loader2, BookmarkPlus, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ReactMarkdown from "react-markdown";

export type BotType = "tone_of_voice" | "lead_post" | "content_post" | "sales_script" | "profile_optimization";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface BotChatProps {
  botType: BotType;
  /** Extra context injected into the system prompt (e.g. ToV profile) */
  contextBlock?: string;
  /** Placeholder text for the input field */
  placeholder?: string;
  /** Called when a message is saved to the content library */
  onSaved?: () => void;
  /** Optional initial greeting to override the default */
  greeting?: string;
}

// ── Default system prompts per bot type ────────────────────────────────────
const DEFAULT_PROMPTS: Record<BotType, string> = {
  tone_of_voice: `Du bist ein Tone-of-Voice-Coach für LinkedIn. Deine Aufgabe ist es, durch ein strukturiertes Interview den individuellen Kommunikationsstil des Nutzers herauszuarbeiten.

Führe ein freundliches, professionelles Interview auf Deutsch. Stelle jeweils eine Frage auf einmal. Frage nach:
1. Beruf & Expertise (womit beschäftigt sich der Nutzer?)
2. Zielgruppe (wen möchte er auf LinkedIn erreichen?)
3. Tonalität (eher formal oder locker? Duzen oder Siezen?)
4. Themengebiete (über was postet er gerne?)
5. No-Gos (was möchte er NICHT kommunizieren?)
6. Stil-Vorbilder (LinkedIn-Profile, die ihm gefallen)
7. Beispiel-Post (gerne einen kurzen Post teilen, der gut ankam)

Wenn der Nutzer alle Fragen beantwortet hat oder "fertig" / "done" / "abschließen" schreibt, erstelle eine strukturierte Zusammenfassung mit folgendem Format:

**TONE-OF-VOICE PROFIL**

**Tonalität:** [Beschreibung]
**Zielgruppe:** [Beschreibung]
**Themen:** [Liste]
**No-Gos:** [Liste]
**Stil:** [Beschreibung]
**Beispiel-Posts:** [Zusammenfassung]

Beginne das Interview direkt mit der ersten Frage.`,

  lead_post: `Du bist ein LinkedIn-Content-Stratege der Content-Leads GmbH und hilfst dabei, hochkonvertierende Lead-Posts zu erstellen.

Ein Lead-Post hat immer einen konkreten CTA (Call-to-Action) am Ende, der Reaktionen, DMs oder Kommentare erzeugt. Folge der bewährten Formel:
- Hook (erste Zeile = Aufmerksamkeit)
- Problem/Situation (Identifikation)
- Lösung/Mehrwert
- CTA (konkret: "Schreib mir X", "Kommentiere Y", "Schick mir X")

Stelle zunächst Fragen zum Thema, zur Zielgruppe und zum gewünschten CTA. Erstelle dann 2-3 Varianten des Posts.

Antworte auf Deutsch, Du-Form, direkt und ohne Floskeln.`,

  content_post: `Du bist ein LinkedIn-Content-Stratege der Content-Leads GmbH und hilfst dabei, reichweitenstarke Content-Posts zu erstellen.

Content-Posts erzeugen Sichtbarkeit, Vertrauen und Engagement – ohne direkten Verkauf. Gute Content-Posts:
- Erzählen eine persönliche Geschichte oder geben echten Mehrwert
- Sind meinungsstark und positionieren klar
- Enden mit einer offenen Frage oder einem Thought-Provoking Statement

Frage zunächst nach: Thema, konkretes Erlebnis oder Insight, gewünschte Botschaft. Erstelle dann 2 Varianten.

Antworte auf Deutsch, Du-Form, direkt und ohne Floskeln.`,

  sales_script: `Du bist ein Sales-Coach der Content-Leads GmbH und hilfst dabei, Outreach-Skripte und Gesprächsleitfäden für LinkedIn zu erstellen.

Fokus auf:
- Vernetzungsnachrichten (kurz, kein Pitch, Neugier wecken)
- Follow-Up-Sequenzen (Tag 1, 3, 7)
- DM-Skripte nach Kommentar/Like
- Gesprächsleitfäden für Discovery-Calls

Frage zunächst: Zielgruppe, bisherige Erfahrungen, spezifische Situation. Erstelle dann das passende Skript.

Antworte auf Deutsch, Du-Form, direkt und ohne Floskeln.`,

  profile_optimization: `Du bist ein LinkedIn-Profil-Optimierer der Content-Leads GmbH.

Du analysierst und verbesserst LinkedIn-Profile für maximale Conversion:
- Headline (wer bist du + welchen Mehrwert bietest du?)
- About-Sektion (Storytelling + Social Proof + CTA)
- Erfahrungen (ergebnisorientiert formuliert)
- Banner & Profilbild-Empfehlungen

Frage zunächst nach: aktueller Headline, About-Text, Zielgruppe, Hauptangebot. Gib dann konkrete Verbesserungsvorschläge.

Antworte auf Deutsch, Du-Form, direkt und ohne Floskeln.`,
};

const DEFAULT_GREETINGS: Record<BotType, string> = {
  tone_of_voice:
    "Hallo! Ich bin dein Tone-of-Voice-Coach. Ich werde dir ein paar Fragen stellen, um deinen individuellen Kommunikationsstil herauszuarbeiten. Lass uns anfangen!\n\n**Womit beschäftigst du dich beruflich und was ist dein Hauptangebot?**",
  lead_post:
    "Hey! Ich helfe dir dabei, einen starken Lead-Post zu erstellen der Anfragen generiert. **Über welches Thema möchtest du einen Post schreiben?**",
  content_post:
    "Hey! Ich helfe dir, einen reichweitenstarken Content-Post zu erstellen. **Welche Geschichte, Erkenntnis oder welches Thema möchtest du teilen?**",
  sales_script:
    "Hey! Ich helfe dir mit einem Outreach-Skript. **Für welche Situation brauchst du ein Skript?** (z.B. Vernetzungsnachricht, Follow-Up, DM nach Kommentar...)",
  profile_optimization:
    "Hey! Ich helfe dir, dein LinkedIn-Profil zu optimieren. **Teile mir bitte deine aktuelle Headline mit – oder schreib \"neu\" wenn du noch keine hast.**",
};

// Map bot type to content_type for generated_content table
const CONTENT_TYPE_MAP: Record<BotType, string> = {
  tone_of_voice: "tone_of_voice",
  lead_post: "lead_post",
  content_post: "content_post",
  sales_script: "sales_script",
  profile_optimization: "profile_optimization",
};

export function BotChat({ botType, contextBlock, placeholder, onSaved, greeting }: BotChatProps) {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Load or create bot session ────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const initSession = async () => {
      // Look for an existing open session for this bot type
      const { data: existing } = await supabase
        .from("bot_sessions" as any)
        .select("id, messages")
        .eq("user_id", user.id)
        .eq("bot_type", botType)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        setSessionId(existing.id);
        const storedMessages = Array.isArray(existing.messages) ? (existing.messages as Message[]) : [];
        if (storedMessages.length > 0) {
          setMessages(storedMessages);
          return;
        }
      }

      // No session or empty — create one with greeting
      const initialGreeting = greeting ?? DEFAULT_GREETINGS[botType];
      const initialMessages: Message[] = [{ role: "assistant", content: initialGreeting }];

      const { data: newSession } = await supabase
        .from("bot_sessions" as any)
        .insert({
          user_id: user.id,
          bot_type: botType,
          status: "active",
          messages: initialMessages as any,
        })
        .select("id")
        .single();

      if (newSession) setSessionId(newSession.id);
      setMessages(initialMessages);
    };

    initSession();
  }, [user, botType, greeting]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Auto-resize textarea ──────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  // ── Persist messages to bot_sessions ─────────────────────────────────────
  const persistMessages = useCallback(
    async (msgs: Message[]) => {
      if (!sessionId) return;
      await supabase
        .from("bot_sessions" as any)
        .update({ messages: msgs as any, updated_at: new Date().toISOString() })
        .eq("id", sessionId);
    },
    [sessionId]
  );

  // ── Load system prompt from DB (or fall back to default) ──────────────────
  const loadSystemPrompt = useCallback(async (): Promise<string> => {
    try {
      const { data } = await supabase
        .from("prompt_templates" as any)
        .select("content")
        .eq("name", botType)
        .eq("is_active", true)
        .maybeSingle();

      if (data?.content) return data.content as string;
    } catch {
      // fall through to default
    }
    return DEFAULT_PROMPTS[botType];
  }, [botType]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const systemPrompt = await loadSystemPrompt();
      const fullPrompt = contextBlock
        ? `${systemPrompt}\n\n---\nKONTEXT DES NUTZERS:\n${contextBlock}`
        : systemPrompt;

      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          message: userMsg.content,
          history: updatedMessages.slice(-12).slice(0, -1), // last messages excl. current
          userId: user?.id,
          systemPrompt: fullPrompt,
        },
      });

      if (error) throw error;

      const aiMsg: Message = {
        role: "assistant",
        content: data?.reply || "Entschuldige, ich konnte keine Antwort generieren.",
      };

      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);
      await persistMessages(finalMessages);
    } catch (err: any) {
      const errMsg: Message = {
        role: "assistant",
        content: "Fehler: " + (err.message || "Verbindung fehlgeschlagen. Bitte versuche es erneut."),
      };
      const finalMessages = [...updatedMessages, errMsg];
      setMessages(finalMessages);
      await persistMessages(finalMessages);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, user, contextBlock, loadSystemPrompt, persistMessages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Save to content library ───────────────────────────────────────────────
  const saveToLibrary = useCallback(
    async (content: string, index: number) => {
      if (!user || savingIndex !== null) return;
      setSavingIndex(index);

      try {
        // Extract a title from the first 80 characters
        const title = content.replace(/[#*_`]/g, "").trim().slice(0, 80);

        await supabase.from("generated_content" as any).insert({
          user_id: user.id,
          content_type: CONTENT_TYPE_MAP[botType],
          title,
          content,
          bot_session_id: sessionId,
        });

        setSavedIndices((prev) => new Set(prev).add(index));
        onSaved?.();
      } catch (err) {
        console.error("Save error:", err);
      } finally {
        setSavingIndex(null);
      }
    },
    [user, botType, sessionId, savingIndex, onSaved]
  );

  // ── Clear / new session ───────────────────────────────────────────────────
  const startNewSession = useCallback(async () => {
    if (!user) return;
    // Mark old session completed
    if (sessionId) {
      await supabase
        .from("bot_sessions" as any)
        .update({ status: "completed" })
        .eq("id", sessionId);
    }
    setSessionId(null);
    setSavedIndices(new Set());
    const initialGreeting = greeting ?? DEFAULT_GREETINGS[botType];
    const initialMessages: Message[] = [{ role: "assistant", content: initialGreeting }];

    const { data: newSession } = await supabase
      .from("bot_sessions" as any)
      .insert({
        user_id: user.id,
        bot_type: botType,
        status: "active",
        messages: initialMessages as any,
      })
      .select("id")
      .single();

    if (newSession) setSessionId(newSession.id);
    setMessages(initialMessages);
  }, [user, botType, sessionId, greeting]);

  return (
    <div className="flex flex-col h-[calc(100vh-18rem)] min-h-[400px]">
      {/* Header row with "Neues Gespräch" button */}
      <div className="flex items-center justify-end pb-3 border-b border-[rgba(249,249,249,0.08)]">
        <button
          onClick={startNewSession}
          className="text-[11px] text-[rgba(249,249,249,0.4)] hover:text-[rgba(249,249,249,0.7)] transition px-3 py-1 rounded-lg border border-[rgba(249,249,249,0.08)] hover:border-[rgba(249,249,249,0.2)]"
        >
          Neues Gespräch
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {/* Avatar */}
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                msg.role === "user"
                  ? "bg-[#C5A059]/20 border border-[#C5A059]/30"
                  : "bg-[rgba(249,249,249,0.06)] border border-[rgba(249,249,249,0.08)]"
              }`}
            >
              {msg.role === "user" ? (
                <User className="w-3.5 h-3.5 text-[#C5A059]" />
              ) : (
                <Bot className="w-3.5 h-3.5 text-[#C5A059]" />
              )}
            </div>

            {/* Bubble */}
            <div className="flex flex-col gap-1 max-w-[78%]">
              <div
                className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#C5A059]/15 border border-[#C5A059]/20 text-[#F9F9F9] rounded-tr-sm"
                    : "bg-[rgba(249,249,249,0.05)] border border-[rgba(249,249,249,0.08)] text-[rgba(249,249,249,0.9)] rounded-tl-sm"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-invert prose-sm max-w-none [&_p]:mb-2 [&_ul]:mb-2 [&_li]:mb-0.5 [&_strong]:text-white [&_a]:text-[#C5A059] [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>

              {/* Save button for assistant messages (not the greeting) */}
              {msg.role === "assistant" && i > 0 && (
                <div className="flex justify-start pl-1">
                  <button
                    onClick={() => saveToLibrary(msg.content, i)}
                    disabled={savedIndices.has(i) || savingIndex === i}
                    className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border transition ${
                      savedIndices.has(i)
                        ? "border-[#7FC29B]/30 text-[#7FC29B] bg-[#7FC29B]/10 cursor-default"
                        : "border-[rgba(249,249,249,0.1)] text-[rgba(249,249,249,0.4)] hover:text-[#C5A059] hover:border-[#C5A059]/30 hover:bg-[#C5A059]/8"
                    }`}
                  >
                    {savedIndices.has(i) ? (
                      <>
                        <Check className="w-3 h-3" />
                        Gespeichert
                      </>
                    ) : savingIndex === i ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <BookmarkPlus className="w-3 h-3" />
                        In Bibliothek speichern
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-[rgba(249,249,249,0.06)] border border-[rgba(249,249,249,0.08)] flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-[#C5A059]" />
            </div>
            <div className="bg-[rgba(249,249,249,0.05)] border border-[rgba(249,249,249,0.08)] rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center">
                <div className="w-2 h-2 rounded-full bg-[#C5A059]/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-[#C5A059]/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-[#C5A059]/50 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[rgba(249,249,249,0.08)] pt-4">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? "Schreib deine Antwort..."}
            rows={1}
            className="flex-1 bg-[rgba(249,249,249,0.04)] border border-[rgba(249,249,249,0.08)] rounded-xl px-4 py-3 text-[13px] text-white placeholder:text-[rgba(249,249,249,0.3)] focus:outline-none focus:border-[#C5A059]/40 resize-none transition"
            style={{ minHeight: "44px", maxHeight: "120px" }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-4 py-3 bg-[#C5A059] hover:bg-[#E9CB8B] disabled:opacity-30 text-black rounded-xl transition flex items-center justify-center flex-shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-[rgba(249,249,249,0.3)] mt-2 text-center">
          Cmd+Enter zum Senden
        </p>
      </div>
    </div>
  );
}
