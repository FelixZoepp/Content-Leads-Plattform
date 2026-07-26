import { Eye, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function ImpersonationBanner() {
  const { impersonating, impersonatedUserName, stopImpersonation } = useAuth();

  if (!impersonating) return null;

  return (
    <div
      className="w-full flex items-center justify-between px-4 py-2 z-[100]"
      style={{
        background: "linear-gradient(90deg, #b91c1c, #c2410c)",
        borderBottom: "1px solid rgba(255,255,255,0.15)",
      }}
    >
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-white opacity-90 flex-shrink-0" />
        <span className="text-[13px] font-medium text-white">
          Du siehst die Plattform als{" "}
          <span className="font-bold">{impersonatedUserName ?? "Kunde"}</span>{" "}
          (Kunde)
        </span>
      </div>
      <button
        onClick={stopImpersonation}
        className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-semibold text-white border border-white/30 hover:bg-white/10 transition"
      >
        <X className="w-3.5 h-3.5" />
        Beenden
      </button>
    </div>
  );
}
