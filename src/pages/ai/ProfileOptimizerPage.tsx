import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ReactMarkdown from "react-markdown";
import {
  Send, Bot, User as UserIcon, Loader2, BookmarkPlus, Check,
  Linkedin, Copy, ChevronDown, ChevronUp, AlertCircle, CheckCircle2,
  Type, FileText, Briefcase, Star, Image, Award
} from "lucide-react";

// LinkedIn Zeichenlimits (Stand 2026)
const SECTIONS = [
  { key: "headline", label: "Headline", icon: Type, maxChars: 220, placeholder: "z.B. Geschäftsführer bei Firma XY | Experte für LinkedIn Marketing", tip: "Erste Zeile unter deinem Namen. Nutze Keywords + Mehrwert-Versprechen." },
  { key: "about", label: "Info / About", icon: FileText, maxChars: 2600, placeholder: "Dein About-Text...", tip: "Erzähle deine Story in 3-5 Absätzen. Erste 3 Zeilen sind am wichtigsten (vor 'Mehr anzeigen')." },
  { key: "experience", label: "Aktuelle Position", icon: Briefcase, maxChars: 2000, placeholder: "Beschreibung deiner aktuellen Position...", tip: "Nicht nur Aufgaben — zeige Ergebnisse und Zahlen." },
  { key: "featured", label: "Im Fokus / Featured", icon: Star, maxChars: null, placeholder: "URLs oder Beschreibungen deiner Featured-Inhalte (1 pro Zeile)", tip: "Beste Posts, Artikel, Website, Lead-Magnet. Max 3-5 Items." },
  { key: "banner", label: "Banner-Bild", icon: Image, maxChars: null, placeholder: "Beschreibe dein aktuelles Banner (oder 'keins')", tip: "1584×396px. Zeige Angebot, Social Proof oder Kontakt-CTA." },
  { key: "skills", label: "Kompetenzen / Skills", icon: Award, maxChars: null, placeholder: "Deine Top-Skills (kommasepariert)", tip: "Top 3 Skills werden prominent angezeigt. Wähle Keywords die deine Zielgruppe sucht." },
] as const;

type SectionKey = typeof SECTIONS[number]["key"];

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `Du bist ein LinkedIn-Profiloptimierungs-Experte. Du analysierst LinkedIn-Profile sektionsweise und gibst konkrete, umsetzbare Verbesserungsvorschläge.

WICHTIG — Zeichenlimits beachten:
- Headline: max 220 Zeichen
- About/Info: max 2.600 Zeichen (erste 3 Zeilen vor "Mehr anzeigen" sind entscheidend)
- Positions-Beschreibung: max 2.000 Zeichen
- Featured: 3-5 Items empfohlen

Für JEDE Sektion die der Nutzer eingibt:
1. **Bewertung** (1-10) mit kurzer Begründung
2. **Optimierter Vorschlag** — komplett ausformuliert, sofort kopierbar
3. **Zeichenanzahl** des Vorschlags in Klammern
4. **Warum besser** — 2-3 Bullet Points was sich verbessert

Schreibe den optimierten Text so, dass er:
- Keywords für die Zielgruppe enthält
- Social Proof einbaut wo möglich
- Einen klaren CTA oder Mehrwert kommuniziert
- Professionell aber nahbar klingt
- Die Zeichenlimits einhält

Antworte immer auf Deutsch. Formatiere mit Markdown.`;

export default function ProfileOptimizerPage() {
  const { user } = useAuth();
  const [sections, setSections] = useState<Record<SectionKey, string>>({
    headline: "", about: "", experience: "", featured: "", banner: "", skills: "",
  });
  const [expandedSection, setExpandedSection] = useState<SectionKey | null>("headline");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<"input" | "chat">("input");
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [targetAudience, setTargetAudience] = useState("");
  const [goal, setGoal] = useState("");

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function charCount(key: SectionKey) {
    return sections[key]?.length || 0;
  }

  function charStatus(key: SectionKey, max: number | null) {
    if (!max) return null;
    const count = charCount(key);
    if (count === 0) return null;
    const pct = count / max;
    if (pct > 1) return "over";
    if (pct > 0.9) return "warn";
    return "ok";
  }

  async function analyzeProfile() {
    const filledSections = SECTIONS
      .filter(s => sections[s.key].trim())
      .map(s => `### ${s.label}${s.maxChars ? ` (max ${s.maxChars} Zeichen)` : ""}\n\`\`\`\n${sections[s.key].trim()}\n\`\`\`\nAktuelle Zeichenanzahl: ${sections[s.key].trim().length}`)
      .join("\n\n");

    if (!filledSections) return;

    const userMessage = `Bitte analysiere und optimiere mein LinkedIn-Profil:

${targetAudience ? `**Zielgruppe:** ${targetAudience}` : ""}
${goal ? `**Ziel:** ${goal}` : ""}

${filledSections}

Gib mir für jede Sektion eine Bewertung, einen optimierten Vorschlag (mit Zeichenanzahl) und erkläre was sich verbessert.`;

    setMode("chat");
    setMessages([{ role: "user", content: userMessage }]);
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: [{ role: "user", content: userMessage }],
          systemPrompt: SYSTEM_PROMPT,
        },
      });

      if (error) throw error;
      const reply = data?.response || data?.message || data?.content || "Keine Antwort erhalten.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `Fehler: ${err.message}` }]);
    } finally {
      setSending(false);
    }
  }

  async function sendFollowUp() {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setSending(true);

    try {
      const allMessages = [...messages, { role: "user" as const, content: userMsg }];
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          systemPrompt: SYSTEM_PROMPT,
        },
      });

      if (error) throw error;
      const reply = data?.response || data?.message || data?.content || "Keine Antwort erhalten.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `Fehler: ${err.message}` }]);
    } finally {
      setSending(false);
    }
  }

  async function saveToLibrary(idx: number) {
    if (!user) return;
    const msg = messages[idx];
    if (!msg || msg.role !== "assistant") return;

    await (supabase as any).from("generated_content").insert({
      user_id: user.id,
      type: "profile_optimization",
      title: `LinkedIn-Profiloptimierung ${new Date().toLocaleDateString("de-DE")}`,
      body: msg.content,
      metadata: { sections: Object.keys(sections).filter(k => sections[k as SectionKey].trim()) },
    });

    setSaved(prev => new Set(prev).add(idx));
  }

  // ── INPUT MODE ──
  if (mode === "input") {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Linkedin className="w-6 h-6 text-[#0A66C2]" />
            <h1 className="text-2xl font-bold text-white">LinkedIn-Profiloptimierung</h1>
          </div>
          <p className="text-sm text-[rgba(249,249,249,0.5)]">
            Füge deine aktuellen Profil-Texte ein. Die KI analysiert jede Sektion und gibt dir optimierte Vorschläge mit korrekten Zeichenlimits.
          </p>
        </div>

        {/* Context */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-1.5">Zielgruppe</label>
            <input
              value={targetAudience}
              onChange={e => setTargetAudience(e.target.value)}
              className="w-full bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-[rgba(249,249,249,0.2)] outline-none focus:border-[rgba(197,160,89,0.3)] transition"
              placeholder="z.B. B2B SaaS-Entscheider, 50-500 MA"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-1.5">Ziel</label>
            <input
              value={goal}
              onChange={e => setGoal(e.target.value)}
              className="w-full bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-[rgba(249,249,249,0.2)] outline-none focus:border-[rgba(197,160,89,0.3)] transition"
              placeholder="z.B. Mehr Inbound-Leads über LinkedIn"
            />
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {SECTIONS.map(section => {
            const Icon = section.icon;
            const isExpanded = expandedSection === section.key;
            const status = charStatus(section.key, section.maxChars);
            const count = charCount(section.key);

            return (
              <div key={section.key} className="glass-panel" style={{ padding: 0 }}>
                <div className="relative z-[2]">
                  <button
                    onClick={() => setExpandedSection(isExpanded ? null : section.key)}
                    className="w-full flex items-center gap-3 px-5 py-4 text-left"
                  >
                    <Icon className="w-4.5 h-4.5 text-[#E9CB8B] flex-shrink-0" />
                    <span className="text-[13px] font-medium text-white flex-1">{section.label}</span>
                    {count > 0 && (
                      <span className={`text-[11px] font-mono ${
                        status === "over" ? "text-red-400" :
                        status === "warn" ? "text-amber-400" :
                        "text-[rgba(249,249,249,0.3)]"
                      }`}>
                        {count}{section.maxChars ? `/${section.maxChars}` : ""}
                      </span>
                    )}
                    {count > 0 && (
                      <CheckCircle2 className="w-4 h-4 text-[#7FC29B] flex-shrink-0" />
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-[rgba(249,249,249,0.3)]" /> : <ChevronDown className="w-4 h-4 text-[rgba(249,249,249,0.3)]" />}
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-4 space-y-2">
                      <div className="flex items-start gap-2 text-[11px] text-[rgba(249,249,249,0.4)] bg-[rgba(249,249,249,0.02)] rounded-lg px-3 py-2">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#E9CB8B]" />
                        {section.tip}
                      </div>
                      <textarea
                        value={sections[section.key]}
                        onChange={e => setSections(prev => ({ ...prev, [section.key]: e.target.value }))}
                        rows={section.key === "about" ? 8 : section.key === "experience" ? 6 : 3}
                        className="w-full bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-[rgba(249,249,249,0.2)] outline-none focus:border-[rgba(197,160,89,0.3)] transition resize-y font-mono"
                        placeholder={section.placeholder}
                      />
                      {section.maxChars && (
                        <div className="flex items-center justify-between">
                          <div className="h-1.5 flex-1 bg-[rgba(249,249,249,0.06)] rounded-full overflow-hidden mr-3">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(100, (count / section.maxChars) * 100)}%`,
                                background: status === "over" ? "#E87467" : status === "warn" ? "#E9CB8B" : "linear-gradient(90deg, #C5A059, #E9CB8B)",
                              }}
                            />
                          </div>
                          <span className={`text-[10px] font-mono ${
                            status === "over" ? "text-red-400" : "text-[rgba(249,249,249,0.3)]"
                          }`}>
                            {count} / {section.maxChars}
                            {status === "over" && ` (+${count - section.maxChars})`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Analyze Button */}
        <button
          onClick={analyzeProfile}
          disabled={!SECTIONS.some(s => sections[s.key].trim())}
          className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl text-[14px] font-semibold text-white transition disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #C5A059, #775A19)", boxShadow: "0 0 24px rgba(197,160,89,0.35)" }}
        >
          <Bot className="w-5 h-5" />
          Profil analysieren & optimieren
        </button>
      </div>
    );
  }

  // ── CHAT MODE ──
  return (
    <div className="max-w-3xl mx-auto p-6 flex flex-col" style={{ height: "calc(100vh - 80px)" }}>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setMode("input")}
          className="text-sm text-[rgba(249,249,249,0.4)] hover:text-white transition"
        >
          ← Profil bearbeiten
        </button>
        <div className="flex-1" />
        <Linkedin className="w-5 h-5 text-[#0A66C2]" />
        <h2 className="text-[15px] font-medium text-white">Profiloptimierung</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #0A66C2, #004182)" }}>
                <Linkedin className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === "user"
                ? "bg-[rgba(197,160,89,0.15)] border border-[rgba(197,160,89,0.2)] text-white"
                : "bg-[rgba(249,249,249,0.04)] border border-[rgba(249,249,249,0.08)] text-[rgba(249,249,249,0.85)]"
            }`}>
              {msg.role === "assistant" ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-[13px] whitespace-pre-wrap">{msg.content.length > 500 ? msg.content.slice(0, 500) + "..." : msg.content}</p>
              )}

              {msg.role === "assistant" && (
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[rgba(249,249,249,0.06)]">
                  <button
                    onClick={() => navigator.clipboard.writeText(msg.content)}
                    className="flex items-center gap-1 text-[11px] text-[rgba(249,249,249,0.3)] hover:text-white transition"
                  >
                    <Copy className="w-3.5 h-3.5" /> Kopieren
                  </button>
                  <button
                    onClick={() => saveToLibrary(i)}
                    disabled={saved.has(i)}
                    className="flex items-center gap-1 text-[11px] text-[#E9CB8B] hover:text-white transition disabled:text-[#7FC29B]"
                  >
                    {saved.has(i) ? <Check className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                    {saved.has(i) ? "Gespeichert" : "In Bibliothek"}
                  </button>
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #E9CB8B, #C5A059)" }}>
                <UserIcon className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #0A66C2, #004182)" }}>
              <Linkedin className="w-4 h-4 text-white" />
            </div>
            <div className="bg-[rgba(249,249,249,0.04)] border border-[rgba(249,249,249,0.08)] rounded-2xl px-4 py-3">
              <Loader2 className="w-5 h-5 animate-spin text-[#E9CB8B]" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Follow-up Input */}
      <div className="flex gap-3 items-end">
        <div className="flex-1 bg-[rgba(10,11,11,0.6)] border border-[rgba(249,249,249,0.08)] rounded-xl px-4 py-3 focus-within:border-[rgba(197,160,89,0.3)] transition">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendFollowUp()}
            placeholder="Nachfrage stellen, z.B. 'Mach die Headline kürzer' oder 'Mehr Social Proof im About'..."
            className="w-full bg-transparent text-[13px] text-white placeholder:text-[rgba(249,249,249,0.2)] outline-none"
          />
        </div>
        <button
          onClick={sendFollowUp}
          disabled={!input.trim() || sending}
          className="w-11 h-11 rounded-xl flex items-center justify-center transition disabled:opacity-30"
          style={{ background: "linear-gradient(135deg, #C5A059, #775A19)" }}
        >
          <Send className="w-4.5 h-4.5 text-white" />
        </button>
      </div>
    </div>
  );
}
