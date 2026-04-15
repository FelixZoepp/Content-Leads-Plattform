import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Users, MessageSquare, CalendarDays, Video, ArrowRight, CheckCircle2, X, Pin } from "lucide-react";

const quickStartSteps = [
  { icon: BookOpen, title: "Training starten", desc: "Starte deinen ersten Sprint", done: false, color: "bg-[#0A66C2]", cta: "Zum Training →", ctaColor: "text-[#0A66C2]" },
  { icon: Users, title: "Community beitreten", desc: "Vernetze dich mit anderen", done: false, color: "bg-[#8B5CF6]", cta: "Jetzt posten →", ctaColor: "text-[#8B5CF6]" },
  { icon: MessageSquare, title: "Erste Nachricht", desc: "Sende deine erste DM", done: false, color: "bg-[#10B981]", cta: "Nachricht senden →", ctaColor: "text-[#10B981]" },
  { icon: CalendarDays, title: "Meeting buchen", desc: "Buche dein Onboarding", done: false, color: "bg-[#F59E0B]", cta: "Zum Kalender →", ctaColor: "text-[#F59E0B]" },
  { icon: Video, title: "Live-Call besuchen", desc: "Besuche einen Live-Call", done: false, color: "bg-[#EF4444]", cta: "Zum Kalender →", ctaColor: "text-[#EF4444]" },
];

function ProgressRing({ pct, size = 48 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1E293B" strokeWidth={3} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#0A66C2" strokeWidth={3} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
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
      {/* Greeting */}
      <div className="pt-2">
        <h1 className="text-4xl font-black tracking-tight">
          <span className="text-[#0A66C2]">Hallo</span> <span className="italic">{name}</span>,
        </h1>
        <p className="text-4xl font-black tracking-tight mt-0.5">
          <span className="italic font-normal text-[#94A3B8]">schön</span><span className="text-[#94A3B8]">, dass Du hier bist</span><span className="text-[#0A66C2]">.</span>
        </p>
      </div>

      {/* Quick Start Roadmap */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-xs italic text-[#94A3B8] mb-0.5">Willkommen</p>
            <h2 className="text-lg font-black tracking-tight">Dein Schnellstart</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="p-1.5 rounded-lg text-[#475569] hover:bg-[#1A2235] hover:text-white transition">
              <Pin className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 rounded-lg text-[#475569] hover:bg-[#1A2235] hover:text-white transition">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-[13px] text-[#94A3B8] mb-4">Erledige diese Schritte um das Beste aus deinem Sprint herauszuholen<span className="text-[#0A66C2]">.</span></p>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-1.5 bg-[#1E293B] rounded-full">
            <div className="h-full bg-[#0A66C2] rounded-full transition-all" style={{ width: `${(completedSteps / quickStartSteps.length) * 100}%` }} />
          </div>
          <span className="text-xs font-bold text-[#94A3B8]">{completedSteps}/{quickStartSteps.length}</span>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {quickStartSteps.map((step, i) => (
            <div key={i} className="bg-[#0A0A14] border border-[#1E293B] rounded-xl p-4 hover:border-[#0A66C2]/30 transition group min-w-0">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${step.done ? "bg-[#10B981]" : step.color}`}>
                {step.done ? <CheckCircle2 className="w-6 h-6 text-white" /> : <step.icon className="w-6 h-6 text-white" />}
              </div>
              <h3 className="text-[13px] font-bold text-white mb-1">{step.title}</h3>
              <p className="text-[11px] text-[#94A3B8] mb-3 leading-relaxed">{step.desc}</p>
              {step.done ? (
                <span className="text-[11px] text-[#10B981] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Erledigt!
                </span>
              ) : (
                <button className={`text-[11px] ${step.ctaColor} font-semibold flex items-center gap-1 hover:opacity-80 transition`}>
                  {step.cta}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Outreach / Angefangene Chats - Blue Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0A66C2] to-[#111827] border border-[#0A66C2]/20 rounded-2xl p-5">
          <div className="flex items-center gap-1.5 mb-4">
            <span className="text-xs text-white/60">Outreach</span>
            <span className="text-xs text-white/40">/</span>
            <span className="text-[13px] font-semibold text-white">Angefangene Chats</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <span className="text-5xl font-black tracking-tight text-white">+0</span>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span className="text-xs text-white/70">0 Chats letzte 30 Tage</span>
              </div>
            </div>
            <div className="flex gap-[3px] items-end h-12">
              {[3,5,4,7,6,8,5,9,7,6,8,10,7,9].map((h, i) => (
                <div key={i} className="w-[6px] rounded-t-sm bg-white/20" style={{ height: `${h * 4}px` }} />
              ))}
            </div>
          </div>
        </div>

        {/* Outreach / Streak - Orange Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#D4783C] to-[#111827] border border-[#D4783C]/20 rounded-2xl p-5">
          <span className="absolute top-4 right-4 text-4xl opacity-20">🔥</span>
          <div className="flex items-center gap-1.5 mb-4">
            <span className="text-xs text-white/60">Outreach</span>
            <span className="text-xs text-white/40">/</span>
            <span className="text-[13px] font-semibold text-white">Streak</span>
          </div>
          <div className="mb-4">
            <span className="text-5xl font-black tracking-tight text-white">+1</span>
            <span className="text-xl font-bold text-white/80 ml-2">Tage</span>
          </div>
          <div className="grid grid-cols-7 gap-2 mb-3">
            {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d, i) => (
              <div key={d} className="text-center">
                <span className="text-[9px] text-white/40 font-medium">{d}</span>
                <div className={`w-full aspect-square rounded-full mt-1 ${i === 0 ? "bg-[#D4783C]" : "bg-white/10"}`} />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-white/50 italic">Gut gemacht! Du bist auf dem richtigen Weg.</p>
        </div>

        {/* Outreach / Gebuchte Meetings - Green Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#10B981] to-[#111827] border border-[#10B981]/20 rounded-2xl p-5">
          <div className="flex items-center gap-1.5 mb-4">
            <span className="text-xs text-white/60">Outreach</span>
            <span className="text-xs text-white/40">/</span>
            <span className="text-[13px] font-semibold text-white">Gebuchte Meetings</span>
          </div>
          <div className="mb-2">
            <span className="text-5xl font-black tracking-tight text-white">0</span>
          </div>
          <p className="text-sm font-bold text-white/80 mb-1">Auf geht's!</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white/30" />
            <span className="text-xs text-white/50">Bisher noch 0 · Meetings letzte 30 Tage</span>
          </div>
        </div>

        {/* Training / Sprint Roadmap - Flat with Progress Ring */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#94A3B8]">Training</span>
              <span className="text-xs text-[#475569]">/</span>
              <span className="text-[13px] font-semibold text-white">Sprint Roadmap</span>
            </div>
            <ProgressRing pct={0} />
          </div>
          <h3 className="text-lg font-black tracking-tight text-white mb-1">Trainingsfortschritt</h3>
          <div className="w-full h-1.5 bg-[#1E293B] rounded-full mb-3">
            <div className="h-full bg-[#0A66C2] rounded-full" style={{ width: "0%" }} />
          </div>
          <p className="text-xs text-[#94A3B8] mb-4">Letzte Lektion: <span className="text-white font-medium">Willkommen zum Sprint</span></p>
          <button className="text-[12px] font-bold text-[#0A66C2] hover:text-[#1A8CD8] flex items-center gap-1 transition">
            Jetzt weitermachen <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Kalender / Heute */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#94A3B8]">Kalender</span>
              <span className="text-xs text-[#475569]">/</span>
              <span className="text-[13px] font-semibold text-white">Heute</span>
            </div>
            <span className="text-xs font-semibold text-[#0A66C2] bg-[#0A66C2]/10 px-3 py-1 rounded-full">
              {now.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "2-digit" })}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {["9:00", "10:00", "11:00", "12:00"].map(time => (
              <div key={time} className="flex items-center gap-3 p-3 bg-[#0A0A14] rounded-lg border border-[#1E293B] hover:border-[#1E293B]/80 transition">
                <span className="text-xs font-mono text-[#475569] w-10">{time}</span>
                <div className="w-px h-6 bg-[#1E293B]" />
                <span className="text-xs text-[#475569]">Frei</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
