import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Users, MessageCircle, CalendarDays, Video, Flame, ArrowRight, CheckCircle2, BarChart3 } from "lucide-react";

const quickStartSteps = [
  { icon: BookOpen, title: "Training starten", desc: "Starte deinen ersten Sprint", done: false },
  { icon: Users, title: "Community beitreten", desc: "Vernetze dich mit anderen", done: false },
  { icon: MessageCircle, title: "Erste Nachricht", desc: "Sende deine erste DM", done: false },
  { icon: CalendarDays, title: "Meeting buchen", desc: "Buche dein Onboarding", done: false },
  { icon: Video, title: "Live-Call", desc: "Besuche einen Live-Call", done: false },
];

export default function Dashboard() {
  const { user } = useAuth();
  const name = user?.user_metadata?.name || "dort";
  const completedSteps = quickStartSteps.filter(s => s.done).length;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Greeting */}
      <div className="pt-2">
        <h1 className="text-3xl font-light">
          <span className="text-[#2E86AB]">Hallo</span>{" "}
          <span className="italic font-normal">{name}</span>,
          <span className="text-[#94A3B8]"> schön dass du hier bist.</span>
        </h1>
      </div>

      {/* Quick Start Roadmap */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold">Willkommen / Dein Schnellstart</h2>
          <span className="text-sm text-[#94A3B8]">{completedSteps}/{quickStartSteps.length}</span>
        </div>
        <p className="text-sm text-[#94A3B8] mb-4">Erledige diese Schritte um das Beste aus deinem Sprint herauszuholen</p>
        <div className="w-full h-1.5 bg-[#1E293B] rounded-full mb-6">
          <div className="h-full bg-[#2E86AB] rounded-full transition-all" style={{ width: `${(completedSteps / quickStartSteps.length) * 100}%` }} />
        </div>
        <div className="grid grid-cols-5 gap-3">
          {quickStartSteps.map((step, i) => (
            <div key={i} className="bg-[#0B0E14] border border-[#1E293B] rounded-xl p-4 hover:border-[#2E86AB]/30 transition group">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${step.done ? "bg-[#10B981]/10" : "bg-[#2E86AB]/10"}`}>
                {step.done ? <CheckCircle2 className="w-5 h-5 text-[#10B981]" /> : <step.icon className="w-5 h-5 text-[#2E86AB]" />}
              </div>
              <h3 className="text-sm font-medium text-white mb-1">{step.title}</h3>
              <p className="text-xs text-[#94A3B8] mb-3">{step.desc}</p>
              {!step.done && (
                <button className="text-xs text-[#2E86AB] hover:text-[#4DA8CC] flex items-center gap-1 transition">
                  Starten <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Calendar Widget */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-4 h-4 text-[#2E86AB]" />
            <h3 className="text-sm font-medium">Kalender / Heute</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-[#0B0E14] rounded-lg border border-[#1E293B]">
              <div className="w-1 h-8 bg-[#2E86AB] rounded-full" />
              <div>
                <p className="text-sm text-white">Keine Termine heute</p>
                <p className="text-xs text-[#94A3B8]">Dein Tag ist frei</p>
              </div>
            </div>
          </div>
        </div>

        {/* Outreach Stats */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-[#2E86AB]" />
            <h3 className="text-sm font-medium">Outreach / Angefangene Chats</h3>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-white">0</span>
            <span className="text-sm text-[#10B981] mb-1">+0 diese Woche</span>
          </div>
          <div className="mt-4 flex gap-1 h-16">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="flex-1 bg-[#1E293B] rounded-sm" />
            ))}
          </div>
        </div>

        {/* Streak */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-[#D4783C]" />
            <h3 className="text-sm font-medium">Outreach / Streak</h3>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-4xl font-bold text-white">0</span>
            <span className="text-lg text-[#D4783C]">Tage 🔥</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(d => (
              <div key={d} className="text-center">
                <span className="text-[10px] text-[#64748B]">{d}</span>
                <div className="w-full aspect-square rounded bg-[#1E293B] mt-1" />
              </div>
            ))}
          </div>
        </div>

        {/* Training Progress */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-[#2E86AB]" />
            <h3 className="text-sm font-medium">Training / Sprint Roadmap</h3>
          </div>
          <div className="flex items-end gap-3 mb-2">
            <span className="text-4xl font-bold text-white">0%</span>
          </div>
          <div className="w-full h-2 bg-[#1E293B] rounded-full mb-3">
            <div className="h-full bg-[#2E86AB] rounded-full" style={{ width: "0%" }} />
          </div>
          <p className="text-xs text-[#94A3B8]">Letzte Lektion: Willkommen zum Sprint</p>
        </div>
      </div>
    </div>
  );
}
