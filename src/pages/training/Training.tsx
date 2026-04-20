import { BookOpen, CheckCircle2, Circle, PlayCircle, ArrowRight, Lock } from "lucide-react";

const modules = [
  { num: 1, title: "Willkommen zum Sprint", desc: "Intro-Video und Überblick über den Sprint", status: "not_started" },
  { num: 2, title: "LinkedIn Profil Setup", desc: "Optimiere dein LinkedIn-Profil für maximale Wirkung", status: "not_started" },
  { num: 3, title: "Content Strategie", desc: "Was posten, wann, wie — dein Content-Fahrplan", status: "not_started" },
  { num: 4, title: "Outreach System", desc: "Vernetzungen, DMs und Follow-Up Automatisierung", status: "not_started" },
  { num: 5, title: "Sales Gespräche", desc: "Skripte, Einwandbehandlung und Closing-Techniken", status: "not_started" },
  { num: 6, title: "KI Tools", desc: "Claude, Automation und Effizienz-Tools im Alltag", status: "not_started" },
  { num: 7, title: "Skalierung", desc: "Team aufbauen, Prozesse optimieren, Upsells", status: "not_started" },
  { num: 8, title: "Abschluss & nächste Schritte", desc: "Zusammenfassung und wie es weitergeht", status: "not_started" },
];

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="w-5 h-5 text-[#7FC29B]" />;
  if (status === "in_progress") return <PlayCircle className="w-5 h-5 text-[#E9CB8B]" />;
  return <Circle className="w-5 h-5 text-[rgba(249,249,249,0.2)]" />;
}

export default function Training() {
  const completed = modules.filter(m => m.status === "completed").length;
  const pct = Math.round((completed / modules.length) * 100);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="glass-panel fade-up">
        <div className="relative z-[2]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">Training</span>
              <h1 className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>Dein Sprint</h1>
              <p className="text-[13px] text-[rgba(249,249,249,0.5)] mt-1">
                8 Module · {completed}/{modules.length} abgeschlossen
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl text-white" style={{ fontFamily: "var(--font-serif)" }}>
                {pct}<span className="text-lg text-[#E9CB8B]">%</span>
              </div>
              <div className="w-24 h-1.5 bg-[rgba(249,249,249,0.06)] rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: "linear-gradient(90deg, #775A19, #C5A059)",
                    boxShadow: "0 0 12px rgba(197,160,89,0.4)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-3">
        {modules.map((m, i) => {
          const isFirst = i === 0;
          const prevCompleted = i === 0 || modules[i - 1].status === "completed";

          return (
            <div
              key={m.num}
              className="glass-panel fade-up cursor-pointer group"
              style={{ animationDelay: `${(i + 1) * 60}ms`, padding: "18px 22px" }}
            >
              <div className="relative z-[2] flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-[13px] flex-shrink-0"
                  style={{
                    fontFamily: "var(--font-serif)",
                    background: m.status === "completed"
                      ? "rgba(127,194,155,0.12)"
                      : m.status === "in_progress"
                      ? "linear-gradient(135deg, rgba(197,160,89,0.2), rgba(119,90,25,0.1))"
                      : "rgba(249,249,249,0.04)",
                    border: `1px solid ${
                      m.status === "completed" ? "rgba(127,194,155,0.25)"
                      : m.status === "in_progress" ? "rgba(197,160,89,0.3)"
                      : "rgba(249,249,249,0.08)"
                    }`,
                    color: m.status === "completed" ? "#7FC29B"
                      : m.status === "in_progress" ? "#E9CB8B"
                      : "rgba(249,249,249,0.3)",
                  }}
                >
                  {m.num}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-semibold text-white">{m.title}</h3>
                  <p className="text-[12px] text-[rgba(249,249,249,0.4)] mt-0.5">{m.desc}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusIcon status={m.status} />
                  {m.status !== "completed" && (
                    <span className="text-[11px] text-[#E9CB8B] opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                      Starten <ArrowRight className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="text-center fade-up" style={{ animationDelay: "600ms" }}>
        <p className="text-[11px] text-[rgba(249,249,249,0.25)] tracking-[0.1em] uppercase">
          Trainings-Inhalte werden nach dem Onboarding freigeschaltet
        </p>
      </div>
    </div>
  );
}
