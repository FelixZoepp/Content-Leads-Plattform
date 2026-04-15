import { CalendarDays, Plus } from "lucide-react";

const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const now = new Date();

export default function Calendar() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kalender</h1>
        <button className="flex items-center gap-2 bg-[#2E86AB] hover:bg-[#246E8F] text-white font-medium px-4 py-2 rounded-lg transition text-sm">
          <Plus className="w-4 h-4" /> Neuer Termin
        </button>
      </div>
      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6">
        <div className="text-center mb-6">
          <h2 className="text-lg font-medium text-white">{now.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}</h2>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {days.map(d => (
            <div key={d} className="text-center text-xs text-[#64748B] py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => {
            const day = i - (new Date(now.getFullYear(), now.getMonth(), 1).getDay() || 7) + 2;
            const isToday = day === now.getDate();
            const inMonth = day > 0 && day <= new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            return (
              <div key={i} className={`aspect-square flex items-center justify-center rounded-lg text-sm cursor-pointer transition ${
                isToday ? "bg-[#2E86AB] text-white font-semibold" :
                inMonth ? "text-[#94A3B8] hover:bg-[#1A2235]" : "text-[#1E293B]"
              }`}>
                {inMonth ? day : ""}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
