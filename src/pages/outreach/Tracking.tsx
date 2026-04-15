import { useState } from "react";
import { CalendarDays, Filter } from "lucide-react";

const kpis = [
  { label: "Einladungen", value: 0, sub: "Einladungen: 0 · Neue Kontakte: 0", pct: 0 },
  { label: "Neue Chats", value: 0, sub: "100% Acceptance", pct: 100 },
  { label: "Geantwortet", value: 0, sub: "0% Antwortrate", pct: 0 },
  { label: "Termine gelegt", value: 0, sub: "0% Terminquote", pct: 0 },
  { label: "Abschlüsse", value: 0, sub: "0% Abschlussrate", pct: 0 },
];

function DonutChart({ pct, size = 48 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1E293B" strokeWidth={3} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#2E86AB" strokeWidth={3} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  );
}

export default function Tracking() {
  const [tab, setTab] = useState("overview");

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Outreach-Tracking</h1>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 bg-[#111827] border border-[#1E293B] rounded-lg text-sm text-[#94A3B8] hover:border-[#2E86AB]/30 transition">
            <CalendarDays className="w-4 h-4" />
            15.03.2026 – 14.04.2026
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-[#111827] border border-[#1E293B] rounded-lg text-sm text-[#94A3B8] hover:border-[#2E86AB]/30 transition">
            <Filter className="w-4 h-4" />
            Labels filtern
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-3">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-[#111827] border border-[#1E293B] rounded-2xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-[#94A3B8] mb-1">{kpi.label}</p>
                <p className="text-3xl font-bold text-white">{kpi.value}</p>
              </div>
              <DonutChart pct={kpi.pct} />
            </div>
            <p className="text-xs text-[#94A3B8] mt-2">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1E293B]">
        {["Übersicht", "Team"].map(t => (
          <button key={t} onClick={() => setTab(t.toLowerCase())}
            className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
              tab === t.toLowerCase() ? "border-[#2E86AB] text-[#2E86AB]" : "border-transparent text-[#94A3B8] hover:text-white"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Stats Table */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1E293B]">
              {["Kanal", "Einladungen", "Neue Kontakte", "Akzeptanzrate", "Neue Chats", "Antworten", "Antwortquote", "Meetings", "Meetingrate", "Abschlüsse", "Abschlussrate"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#94A3B8]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#1E293B]/50 hover:bg-[#1A2235]">
              <td className="px-4 py-3 text-white font-medium">LinkedIn</td>
              {Array.from({ length: 10 }).map((_, i) => (
                <td key={i} className="px-4 py-3 text-[#94A3B8]">{i % 2 === 0 ? "0" : "0%"}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
