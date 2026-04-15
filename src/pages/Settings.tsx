import { Settings as SettingsIcon, User, Bell, Shield, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Allgemeine Einstellungen</h1>
      <div className="bg-[#12121A] border border-[#2A2A35] rounded-2xl divide-y divide-[#2A2A35]">
        <div className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#4A9FD9]/20 flex items-center justify-center text-[#4A9FD9] text-sm font-semibold">
            {user?.user_metadata?.name?.split(" ").map((n: string) => n[0]).join("") || "CL"}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{user?.user_metadata?.name || "User"}</p>
            <p className="text-xs text-[#8888AA]">{user?.email}</p>
          </div>
        </div>
        <button className="w-full p-4 flex items-center gap-3 text-sm text-[#8888AA] hover:bg-[#1A1A25] transition">
          <User className="w-4 h-4" /> Profil bearbeiten
        </button>
        <button className="w-full p-4 flex items-center gap-3 text-sm text-[#8888AA] hover:bg-[#1A1A25] transition">
          <Bell className="w-4 h-4" /> Benachrichtigungen
        </button>
        <button className="w-full p-4 flex items-center gap-3 text-sm text-[#8888AA] hover:bg-[#1A1A25] transition">
          <Shield className="w-4 h-4" /> Sicherheit
        </button>
        <button onClick={signOut} className="w-full p-4 flex items-center gap-3 text-sm text-[#EB5757] hover:bg-[#1A1A25] transition">
          <LogOut className="w-4 h-4" /> Abmelden
        </button>
      </div>
    </div>
  );
}
