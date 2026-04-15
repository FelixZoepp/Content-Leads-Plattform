import { useState } from "react";
import { Search, Filter, Send, Smile, Paperclip, Video, Phone } from "lucide-react";

const mockContacts = [
  { id: 1, name: "Max Mustermann", title: "CEO bei Firma GmbH", connected: "1 Woche", avatar: "MM" },
  { id: 2, name: "Lisa Schmidt", title: "Head of Sales", connected: "3 Tage", avatar: "LS" },
  { id: 3, name: "Tom Weber", title: "Founder @ StartupXY", connected: "2 Wochen", avatar: "TW" },
];

export default function LinkedIn() {
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  return (
    <div className="flex h-[calc(100vh-5rem)] -m-6 border-t border-[#1E293B]">
      {/* Left: Conversations */}
      <div className="w-80 border-r border-[#1E293B] flex flex-col bg-[#0B0E14]">
        <div className="p-3 border-b border-[#1E293B]">
          <div className="flex gap-2 mb-3">
            <span className="px-2.5 py-1 bg-[#2E86AB]/15 text-[#2E86AB] text-xs font-medium rounded-full">LinkedIn Einladungen <span className="ml-1 font-bold">0</span></span>
            <span className="px-2.5 py-1 bg-[#111827] text-[#94A3B8] text-xs rounded-full">Kontakte</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748B]" />
            <input placeholder="Konversationen durchsuchen" className="w-full bg-[#111827] border border-[#1E293B] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#2E86AB]/50" />
          </div>
        </div>
        <div className="flex gap-2 px-3 py-2 border-b border-[#1E293B]">
          {["Ordner", "Posteingang", "Filter"].map(f => (
            <button key={f} className="px-2 py-1 text-[10px] text-[#94A3B8] bg-[#111827] rounded hover:bg-[#1A2235] transition">{f}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 text-center text-sm text-[#64748B]">
            Keine Konversationen vorhanden
          </div>
        </div>
      </div>

      {/* Middle: Chat */}
      <div className="flex-1 flex flex-col bg-[#0B0E14]">
        {selected === null ? (
          <div className="flex-1 flex items-center justify-center text-[#64748B]">
            <p className="text-sm">Wähle eine Konversation aus</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-[#1E293B] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#2E86AB]/20 flex items-center justify-center text-xs text-[#2E86AB] font-semibold">MM</div>
                <div>
                  <p className="text-sm font-medium text-white">Max Mustermann</p>
                  <p className="text-xs text-[#94A3B8]">CEO bei Firma GmbH</p>
                </div>
              </div>
            </div>
            <div className="flex-1" />
            <div className="p-3 border-t border-[#1E293B]">
              <div className="flex gap-2 mb-2">
                {["F1", "F2", "M1", "M2"].map(t => (
                  <button key={t} className="px-2 py-1 text-[10px] bg-[#111827] border border-[#1E293B] rounded text-[#94A3B8] hover:border-[#2E86AB]/30 transition">{t}</button>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Nachricht schreiben..." className="flex-1 bg-[#111827] border border-[#1E293B] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#2E86AB]/50" />
                <button className="p-2.5 text-[#94A3B8] hover:text-white transition"><Smile className="w-4 h-4" /></button>
                <button className="p-2.5 text-[#94A3B8] hover:text-white transition"><Paperclip className="w-4 h-4" /></button>
                <button className="p-2.5 bg-[#2E86AB] hover:bg-[#246E8F] text-white rounded-lg transition"><Send className="w-4 h-4" /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right: Contacts */}
      <div className="w-72 border-l border-[#1E293B] flex flex-col bg-[#0B0E14]">
        <div className="p-3 border-b border-[#1E293B]">
          <label className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <input type="checkbox" className="rounded border-[#1E293B] bg-[#111827]" />
            Nur nicht kontaktierte
          </label>
        </div>
        <div className="flex-1 overflow-y-auto">
          {mockContacts.map(c => (
            <div key={c.id} className="p-3 border-b border-[#1E293B]/50 hover:bg-[#1A2235] transition cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#2E86AB]/20 flex items-center justify-center text-[10px] text-[#2E86AB] font-semibold flex-shrink-0">{c.avatar}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.name}</p>
                  <p className="text-xs text-[#94A3B8] truncate">{c.title}</p>
                  <p className="text-[10px] text-[#64748B] mt-0.5">Verbunden vor {c.connected}</p>
                </div>
                <div className="flex gap-1">
                  <button className="p-1 text-[#64748B] hover:text-[#2E86AB] transition"><Video className="w-3.5 h-3.5" /></button>
                  <button className="p-1 text-[#64748B] hover:text-[#2E86AB] transition"><Phone className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
