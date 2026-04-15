import { Search, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function TopBar() {
  const { user } = useAuth();
  const initials = user?.user_metadata?.name
    ? user.user_metadata.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : "CL";

  return (
    <header className="h-14 border-b border-[#2A2A35] bg-[#0A0A0F]/80 backdrop-blur-sm flex items-center justify-between px-6">
      {/* Search */}
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555566]" />
        <input
          type="text"
          placeholder="Suchen..."
          className="w-full bg-[#12121A] border border-[#2A2A35] rounded-lg pl-10 pr-12 py-2 text-sm text-white placeholder:text-[#555566] focus:outline-none focus:border-[#4A9FD9]/50"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#555566] bg-[#1A1A25] px-1.5 py-0.5 rounded border border-[#2A2A35]">⌘K</kbd>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg text-[#8888AA] hover:bg-[#1A1A25] hover:text-white transition">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#D4783C] rounded-full" />
        </button>
        <div className="w-8 h-8 rounded-full bg-[#4A9FD9]/20 flex items-center justify-center text-[#4A9FD9] text-xs font-semibold">
          {initials}
        </div>
      </div>
    </header>
  );
}
