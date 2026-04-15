import { Search, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function TopBar() {
  const { user } = useAuth();
  const initials = user?.user_metadata?.name
    ? user.user_metadata.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : "CL";

  return (
    <header className="h-[52px] border-b border-[#1E293B] bg-[#0A0A14]/90 backdrop-blur-md flex items-center justify-between px-6">
      {/* Search */}
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#475569]" />
        <input
          type="text"
          placeholder="Suchen..."
          className="w-full bg-[#111827] border border-[#1E293B] rounded-lg pl-9 pr-12 py-1.5 text-[13px] text-white placeholder:text-[#475569] focus:outline-none focus:border-[#0A66C2]/40 transition"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-[#475569] bg-[#0A0A14] px-1.5 py-0.5 rounded border border-[#1E293B] font-mono">⌘K</kbd>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <button className="relative p-1.5 rounded-lg text-[#94A3B8] hover:bg-[#111827] hover:text-white transition">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1 right-1 w-[6px] h-[6px] bg-[#E24B4A] rounded-full ring-2 ring-[#0A0A14]" />
        </button>
        <div className="w-7 h-7 rounded-full bg-[#0A66C2] flex items-center justify-center text-white text-[10px] font-bold">
          {initials}
        </div>
      </div>
    </header>
  );
}
