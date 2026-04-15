import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ContentLeadsChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hallo! Ich bin die **Content-Leads AI**. Ich helfe dir mit allem rund um LinkedIn-Outreach, Content-Strategie und Kundengewinnung. Was kann ich für dich tun?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          message: userMsg.content,
          history: messages.slice(-10),
          userId: user?.id,
        },
      });

      if (error) throw error;
      const aiMsg: Message = { role: "assistant", content: data?.reply || "Entschuldige, ich konnte keine Antwort generieren." };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: "Fehler: " + (err.message || "Verbindung fehlgeschlagen. Bitte versuche es erneut.") }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
              msg.role === "user" ? "bg-[#0A66C2]" : "bg-[#1A2235]"
            }`}>
              {msg.role === "user" ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-[#0A66C2]" />}
            </div>
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
              msg.role === "user"
                ? "bg-[#0A66C2] text-white rounded-tr-sm"
                : "bg-[#1A2235] text-[#F1F5F9] border border-[#1E293B] rounded-tl-sm"
            }`}>
              {msg.role === "assistant" ? (
                <div className="prose prose-invert prose-sm max-w-none [&_p]:mb-2 [&_ul]:mb-2 [&_li]:mb-0.5 [&_strong]:text-white [&_a]:text-[#0A66C2]">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#1A2235] flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-[#0A66C2]" />
            </div>
            <div className="bg-[#1A2235] border border-[#1E293B] rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#475569] animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-[#475569] animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-[#475569] animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#1E293B] pt-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Frage die Content-Leads AI..."
            rows={1}
            className="flex-1 bg-[#111827] border border-[#1E293B] rounded-xl px-4 py-3 text-[13px] text-white placeholder:text-[#475569] focus:outline-none focus:border-[#0A66C2]/40 resize-none"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-4 bg-[#0A66C2] hover:bg-[#1A8CD8] disabled:opacity-30 text-white rounded-xl transition flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-[#475569] mt-2 text-center">Cmd+Enter zum Senden</p>
      </div>
    </div>
  );
}
