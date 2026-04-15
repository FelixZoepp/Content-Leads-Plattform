import { Search, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function TopBar() {
  const { user } = useAuth();
  const initials = user?.user_metadata?.name
    ? user.user_metadata.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : "CL";

  return (
    <header className="h-14 border-b border-[#1E293B] bg-[#0B0E14]/80 backdrop-blur-sm flex items-center justify-between px-6">
      {/* Search */}
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
        <input
          type="text"
          placeholder="Suchen..."
          className="w-full bg-[#111827] border border-[#1E293B] rounded-lg pl-10 pr-12 py-2 text-sm text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#2E86AB]/50"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#64748B] bg-[#1A2235] px-1.5 py-0.5 rounded border border-[#1E293B]">⌘K</kbd>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg text-[#94A3B8] hover:bg-[#1A2235] hover:text-white transition">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#D4783C] rounded-full" />
        </button>
        <div className="w-8 h-8 rounded-full bg-[#2E86AB]/20 flex items-center justify-center text-[#2E86AB] text-xs font-semibold">
          {initials}
        </div>
      </div>
    </header>
  );
}
