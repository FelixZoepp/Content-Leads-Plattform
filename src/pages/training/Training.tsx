import { BookOpen, CheckCircle2, Circle, PlayCircle } from "lucide-react";

const modules = [
  { num: 1, title: "Willkommen zum Sprint", desc: "Intro-Video und Überblick über den Sprint", status: "not_started" },
  { num: 2, title: "LinkedIn Profil Setup", desc: "Optimiere dein LinkedIn-Profil für maximale Wirkung", status: "not_started" },
  { num: 3, title: "Content Strategie", desc: "Was posten, wann, wie - dein Content-Fahrplan", status: "not_started" },
  { num: 4, title: "Outreach System", desc: "Vernetzungen, DMs und Follow-Up Automatisierung", status: "not_started" },
  { num: 5, title: "Sales Gespräche", desc: "Skripte, Einwandbehandlung und Closing-Techniken", status: "not_started" },
  { num: 6, title: "KI Tools", desc: "Claude, Automation und Effizienz-Tools im Alltag", status: "not_started" },
  { num: 7, title: "Skalierung", desc: "Team aufbauen, Prozesse optimieren, Upsells", status: "not_started" },
  { num: 8, title: "Abschluss & nächste Schritte", desc: "Zusammenfassung und wie es weitergeht", status: "not_started" },
];

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="w-5 h-5 text-[#10B981]" />;
  if (status === "in_progress") return <PlayCircle className="w-5 h-5 text-[#2E86AB]" />;
  return <Circle className="w-5 h-5 text-[#64748B]" />;
}

export default function Training() {
  const completed = modules.filter(m => m.status === "completed").length;
  const pct = Math.round((completed / modules.length) * 100);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Training / Dein Sprint</h1>
        <span className="text-sm text-[#94A3B8]">{pct}% abgeschlossen</span>
      </div>
      <div className="w-full h-2 bg-[#1E293B] rounded-full">
        <div className="h-full bg-[#2E86AB] rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="space-y-3">
        {modules.map(m => (
          <div key={m.num} className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 hover:border-[#2E86AB]/30 transition cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#0B0E14] border border-[#1E293B] flex items-center justify-center text-sm font-semibold text-[#94A3B8]">
                {m.num}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-white">{m.title}</h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">{m.desc}</p>
              </div>
              <StatusIcon status={m.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
