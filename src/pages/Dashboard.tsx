import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Users, MessageSquare, CalendarDays, Video, ArrowRight, CheckCircle2, X, Pin } from "lucide-react";

const quickStartSteps = [
  { icon: BookOpen, title: "Training starten", desc: "Starte deinen ersten Sprint", done: false, color: "#C5A059", cta: "Zum Training" },
  { icon: Users, title: "Community beitreten", desc: "Vernetze dich mit anderen", done: false, color: "#B49AE8", cta: "Jetzt posten" },
  { icon: MessageSquare, title: "Erste Nachricht", desc: "Sende deine erste DM", done: false, color: "#7FC29B", cta: "Nachricht senden" },
  { icon: CalendarDays, title: "Meeting buchen", desc: "Buche dein Onboarding", done: false, color: "#E9CB8B", cta: "Zum Kalender" },
  { icon: Video, title: "Live-Call besuchen", desc: "Besuche einen Live-Call", done: false, color: "#E87467", cta: "Zum Kalender" },
];

function ProgressRing({ pct, size = 48 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(249,249,249,0.08)" strokeWidth={3} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#C5A059" strokeWidth={3} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">{pct}%</span>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const name = user?.user_metadata?.name || "dort";
  const completedSteps = quickStartSteps.filter(s => s.done).length;
  const now = new Date();

  return (
    <div className="space-y-6 max-w-6xl">

      {/* ── Quick Start Roadmap ── */}
      <div className="glass-panel fade-up" style={{ animationDelay: "60ms" }}>
        <div className="relative z-[2]">
          <div className="flex items-start justify-between mb-1">
            <div>
              <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">Willkommen</span>
              <h2 className="text-lg text-white" style={{ fontFamily: "var(--font-serif)" }}>Dein Schnellstart</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="p-1.5 rounded-lg text-[rgba(249,249,249,0.3)] hover:bg-[rgba(249,249,249,0.04)] hover:text-white transition">
                <Pin className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded-lg text-[rgba(249,249,249,0.3)] hover:bg-[rgba(249,249,249,0.04)] hover:text-white transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-[13px] text-[rgba(249,249,249,0.5)] mb-4">
            Erledige diese Schritte um das Beste aus deinem Sprint herauszuholen<span className="text-[#C5A059]">.</span>
          </p>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-1.5 bg-[rgba(249,249,249,0.06)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(completedSteps / quickStartSteps.length) * 100}%`,
                  background: "linear-gradient(90deg, #775A19, #C5A059)",
                  boxShadow: "0 0 12px rgba(197,160,89,0.4)",
                }}
              />
            </div>
            <span className="text-xs font-bold text-[rgba(249,249,249,0.5)]">{completedSteps}/{quickStartSteps.length}</span>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {quickStartSteps.map((step, i) => (
              <div
                key={i}
                className="rounded-xl p-4 border border-[rgba(249,249,249,0.08)] hover:border-[rgba(197,160,89,0.25)] transition group min-w-0"
                style={{ background: "rgba(249,249,249,0.03)" }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                  style={{
                    background: step.done
                      ? "#7FC29B"
                      : `linear-gradient(135deg, ${step.color}33, ${step.color}15)`,
                    border: `1px solid ${step.color}40`,
                  }}
                >
                  {step.done ? (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  ) : (
                    <step.icon className="w-6 h-6" style={{ color: step.color }} />
                  )}
                </div>
                <h3 className="text-[13px] font-bold text-white mb-1">{step.title}</h3>
                <p className="text-[11px] text-[rgba(249,249,249,0.5)] mb-3 leading-relaxed">{step.desc}</p>
                {step.done ? (
                  <span className="text-[11px] text-[#7FC29B] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Erledigt!
                  </span>
                ) : (
                  <button className="text-[11px] font-semibold flex items-center gap-1 hover:opacity-80 transition" style={{ color: step.color }}>
                    {step.cta} <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI Widget Grid ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Angefangene Chats */}
        <div
          className="glass-panel fade-up overflow-hidden"
          style={{
            animationDelay: "140ms",
            background: "linear-gradient(135deg, rgba(197,160,89,0.14), rgba(10,11,11,0.6))",
            borderColor: "rgba(197,160,89,0.2)",
          }}
        >
          <div className="relative z-[2]">
            <div className="flex items-center gap-1.5 mb-4">
              <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B]">Outreach</span>
              <span className="text-xs text-[rgba(249,249,249,0.3)]">/</span>
              <span className="text-[13px] font-semibold text-white">Angefangene Chats</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-5xl text-white" style={{ fontFamily: "var(--font-serif)", letterSpacing: "-0.03em" }}>
                  +0
                </span>
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-2 h-2 rounded-full bg-[#7FC29B]" style={{ boxShadow: "0 0 8px #7FC29B" }} />
                  <span className="text-xs text-[rgba(249,249,249,0.5)]">0 Chats letzte 30 Tage</span>
                </div>
              </div>
              <div className="flex gap-[3px] items-end h-12">
                {[3, 5, 4, 7, 6, 8, 5, 9, 7, 6, 8, 10, 7, 9].map((h, i) => (
                  <div
                    key={i}
                    className="w-[6px] rounded-t-sm"
                    style={{
                      height: `${h * 4}px`,
                      background: `rgba(197,160,89,${0.2 + (i / 14) * 0.5})`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Streak */}
        <div
          className="glass-panel fade-up overflow-hidden"
          style={{
            animationDelay: "220ms",
            background: "linear-gradient(135deg, rgba(232,116,103,0.12), rgba(10,11,11,0.6))",
            borderColor: "rgba(232,116,103,0.15)",
          }}
        >
          <div className="relative z-[2]">
            <span className="absolute top-0 right-0 text-4xl opacity-10">🔥</span>
            <div className="flex items-center gap-1.5 mb-4">
              <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B]">Outreach</span>
              <span className="text-xs text-[rgba(249,249,249,0.3)]">/</span>
              <span className="text-[13px] font-semibold text-white">Streak</span>
            </div>
            <div className="mb-4">
              <span className="text-5xl text-white" style={{ fontFamily: "var(--font-serif)", letterSpacing: "-0.03em" }}>
                +1
              </span>
              <span className="text-xl text-[rgba(249,249,249,0.6)] ml-2" style={{ fontFamily: "var(--font-serif)" }}>
                Tage
              </span>
            </div>
            <div className="grid grid-cols-7 gap-2 mb-3">
              {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d, i) => (
                <div key={d} className="text-center">
                  <span className="text-[9px] text-[rgba(249,249,249,0.3)] font-medium">{d}</span>
                  <div
                    className="w-full aspect-square rounded-full mt-1"
                    style={{
                      background: i === 0
                        ? "linear-gradient(135deg, #E9CB8B, #C5A059)"
                        : "rgba(249,249,249,0.06)",
                      boxShadow: i === 0 ? "0 0 12px rgba(197,160,89,0.4)" : "none",
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[rgba(249,249,249,0.4)] italic" style={{ fontFamily: "var(--font-serif)" }}>
              Gut gemacht! Du bist auf dem richtigen Weg.
            </p>
          </div>
        </div>

        {/* Gebuchte Meetings */}
        <div
          className="glass-panel fade-up overflow-hidden"
          style={{
            animationDelay: "300ms",
            background: "linear-gradient(135deg, rgba(127,194,155,0.12), rgba(10,11,11,0.6))",
            borderColor: "rgba(127,194,155,0.15)",
          }}
        >
          <div className="relative z-[2]">
            <div className="flex items-center gap-1.5 mb-4">
              <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B]">Outreach</span>
              <span className="text-xs text-[rgba(249,249,249,0.3)]">/</span>
              <span className="text-[13px] font-semibold text-white">Gebuchte Meetings</span>
            </div>
            <div className="mb-2">
              <span className="text-5xl text-white" style={{ fontFamily: "var(--font-serif)", letterSpacing: "-0.03em" }}>
                0
              </span>
            </div>
            <p className="text-sm font-bold text-[rgba(249,249,249,0.6)] mb-1">Auf geht's!</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[rgba(249,249,249,0.2)]" />
              <span className="text-xs text-[rgba(249,249,249,0.4)]">Bisher noch 0 · Meetings letzte 30 Tage</span>
            </div>
          </div>
        </div>

        {/* Sprint Roadmap */}
        <div className="glass-panel fade-up" style={{ animationDelay: "380ms" }}>
          <div className="relative z-[2]">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B]">Training</span>
                <span className="text-xs text-[rgba(249,249,249,0.3)]">/</span>
                <span className="text-[13px] font-semibold text-white">Sprint Roadmap</span>
              </div>
              <ProgressRing pct={0} />
            </div>
            <h3 className="text-lg text-white mb-1" style={{ fontFamily: "var(--font-serif)" }}>Trainingsfortschritt</h3>
            <div className="w-full h-1.5 bg-[rgba(249,249,249,0.06)] rounded-full mb-3 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: "0%",
                  background: "linear-gradient(90deg, #775A19, #C5A059)",
                }}
              />
            </div>
            <p className="text-xs text-[rgba(249,249,249,0.5)] mb-4">
              Letzte Lektion: <span className="text-white font-medium">Willkommen zum Sprint</span>
            </p>
            <button className="text-[12px] font-bold text-[#E9CB8B] hover:text-[#C5A059] flex items-center gap-1 transition">
              Jetzt weitermachen <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Kalender / Heute */}
        <div className="glass-panel fade-up col-span-2" style={{ animationDelay: "460ms" }}>
          <div className="relative z-[2]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B]">Kalender</span>
                <span className="text-xs text-[rgba(249,249,249,0.3)]">/</span>
                <span className="text-[13px] font-semibold text-white">Heute</span>
              </div>
              <span
                className="text-xs font-semibold text-[#E9CB8B] px-3 py-1 rounded-full"
                style={{
                  background: "rgba(197,160,89,0.1)",
                  border: "1px solid rgba(197,160,89,0.2)",
                }}
              >
                {now.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "2-digit" })}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {["9:00", "10:00", "11:00", "12:00"].map(time => (
                <div
                  key={time}
                  className="flex items-center gap-3 p-3 rounded-lg border border-[rgba(249,249,249,0.08)] hover:border-[rgba(197,160,89,0.2)] transition"
                  style={{ background: "rgba(249,249,249,0.03)" }}
                >
                  <span className="text-xs font-mono text-[rgba(249,249,249,0.3)] w-10">{time}</span>
                  <div className="w-px h-6 bg-[rgba(249,249,249,0.08)]" />
                  <span className="text-xs text-[rgba(249,249,249,0.4)]">Frei</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
