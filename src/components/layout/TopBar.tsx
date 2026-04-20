import { Search, Bell, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function TopBar() {
  const { user } = useAuth();
  const name = user?.user_metadata?.name || "dort";
  const now = new Date();
  const weekday = now.toLocaleDateString("de-DE", { weekday: "long" });
  const kw = getISOWeek(now);

  return (
    <header
      className="fade-up mx-4 mt-4 mb-2 flex items-center gap-5 px-5 py-3.5 rounded-[14px] border border-[rgba(249,249,249,0.08)]"
      style={{
        background: "rgba(249, 249, 249, 0.04)",
        backdropFilter: "blur(18px) saturate(140%)",
        WebkitBackdropFilter: "blur(18px) saturate(140%)",
      }}
    >
      {/* Greeting */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B]">
          {weekday} · KW {kw}
        </span>
        <span className="text-[22px] text-white" style={{ fontFamily: "var(--font-serif)", letterSpacing: "-0.01em" }}>
          Guten {getGreeting()}, {name.split(" ")[0]}.
        </span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-[360px] ml-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.08)]">
        <Search className="w-3.5 h-3.5 text-[rgba(249,249,249,0.3)]" />
        <input
          type="text"
          placeholder="Suchen… (Lead, Kunde, Report)"
          className="flex-1 bg-transparent border-0 text-[13px] text-white placeholder:text-[rgba(249,249,249,0.3)] outline-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          className="relative w-[38px] h-[38px] flex items-center justify-center rounded-[10px] border border-[rgba(249,249,249,0.08)] text-[rgba(249,249,249,0.72)] transition-all duration-200 hover:bg-[rgba(249,249,249,0.08)] hover:text-white hover:border-[rgba(249,249,249,0.16)]"
          style={{ background: "rgba(249, 249, 249, 0.04)" }}
          title="Benachrichtigungen"
        >
          <Bell className="w-4 h-4" />
          <span
            className="absolute top-[9px] right-[9px] w-[7px] h-[7px] rounded-full"
            style={{
              background: "#E9CB8B",
              boxShadow: "0 0 8px #E9CB8B",
              animation: "pulseDot 2s ease-in-out infinite",
            }}
          />
        </button>
        <button
          className="w-[38px] h-[38px] flex items-center justify-center rounded-[10px] border border-[rgba(249,249,249,0.08)] text-[rgba(249,249,249,0.72)] transition-all duration-200 hover:bg-[rgba(249,249,249,0.08)] hover:text-white hover:border-[rgba(249,249,249,0.16)]"
          style={{ background: "rgba(249, 249, 249, 0.04)" }}
          title="Einstellungen"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morgen";
  if (h < 18) return "Nachmittag";
  return "Abend";
}

function getISOWeek(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}
