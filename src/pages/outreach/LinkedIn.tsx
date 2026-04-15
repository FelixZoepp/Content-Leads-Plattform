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
    <div className="flex h-[calc(100vh-5rem)] -m-6 border-t border-[#2A2A35]">
      {/* Left: Conversations */}
      <div className="w-80 border-r border-[#2A2A35] flex flex-col bg-[#0A0A0F]">
        <div className="p-3 border-b border-[#2A2A35]">
          <div className="flex gap-2 mb-3">
            <span className="px-2.5 py-1 bg-[#4A9FD9]/15 text-[#4A9FD9] text-xs font-medium rounded-full">LinkedIn Einladungen <span className="ml-1 font-bold">0</span></span>
            <span className="px-2.5 py-1 bg-[#12121A] text-[#8888AA] text-xs rounded-full">Kontakte</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555566]" />
            <input placeholder="Konversationen durchsuchen" className="w-full bg-[#12121A] border border-[#2A2A35] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-[#555566] focus:outline-none focus:border-[#4A9FD9]/50" />
          </div>
        </div>
        <div className="flex gap-2 px-3 py-2 border-b border-[#2A2A35]">
          {["Ordner", "Posteingang", "Filter"].map(f => (
            <button key={f} className="px-2 py-1 text-[10px] text-[#8888AA] bg-[#12121A] rounded hover:bg-[#1A1A25] transition">{f}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 text-center text-sm text-[#555566]">
            Keine Konversationen vorhanden
          </div>
        </div>
      </div>

      {/* Middle: Chat */}
      <div className="flex-1 flex flex-col bg-[#0A0A0F]">
        {selected === null ? (
          <div className="flex-1 flex items-center justify-center text-[#555566]">
            <p className="text-sm">Wähle eine Konversation aus</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-[#2A2A35] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#4A9FD9]/20 flex items-center justify-center text-xs text-[#4A9FD9] font-semibold">MM</div>
                <div>
                  <p className="text-sm font-medium text-white">Max Mustermann</p>
                  <p className="text-xs text-[#8888AA]">CEO bei Firma GmbH</p>
                </div>
              </div>
            </div>
            <div className="flex-1" />
            <div className="p-3 border-t border-[#2A2A35]">
              <div className="flex gap-2 mb-2">
                {["F1", "F2", "M1", "M2"].map(t => (
                  <button key={t} className="px-2 py-1 text-[10px] bg-[#12121A] border border-[#2A2A35] rounded text-[#8888AA] hover:border-[#4A9FD9]/30 transition">{t}</button>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Nachricht schreiben..." className="flex-1 bg-[#12121A] border border-[#2A2A35] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#555566] focus:outline-none focus:border-[#4A9FD9]/50" />
                <button className="p-2.5 text-[#8888AA] hover:text-white transition"><Smile className="w-4 h-4" /></button>
                <button className="p-2.5 text-[#8888AA] hover:text-white transition"><Paperclip className="w-4 h-4" /></button>
                <button className="p-2.5 bg-[#4A9FD9] hover:bg-[#2E7BB5] text-white rounded-lg transition"><Send className="w-4 h-4" /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right: Contacts */}
      <div className="w-72 border-l border-[#2A2A35] flex flex-col bg-[#0A0A0F]">
        <div className="p-3 border-b border-[#2A2A35]">
          <label className="flex items-center gap-2 text-xs text-[#8888AA]">
            <input type="checkbox" className="rounded border-[#2A2A35] bg-[#12121A]" />
            Nur nicht kontaktierte
          </label>
        </div>
        <div className="flex-1 overflow-y-auto">
          {mockContacts.map(c => (
            <div key={c.id} className="p-3 border-b border-[#2A2A35]/50 hover:bg-[#1A1A25] transition cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#4A9FD9]/20 flex items-center justify-center text-[10px] text-[#4A9FD9] font-semibold flex-shrink-0">{c.avatar}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.name}</p>
                  <p className="text-xs text-[#8888AA] truncate">{c.title}</p>
                  <p className="text-[10px] text-[#555566] mt-0.5">Verbunden vor {c.connected}</p>
                </div>
                <div className="flex gap-1">
                  <button className="p-1 text-[#555566] hover:text-[#4A9FD9] transition"><Video className="w-3.5 h-3.5" /></button>
                  <button className="p-1 text-[#555566] hover:text-[#4A9FD9] transition"><Phone className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
