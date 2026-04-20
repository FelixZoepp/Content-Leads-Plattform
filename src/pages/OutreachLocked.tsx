import { Lock, Rocket } from "lucide-react";

export default function OutreachLocked() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#0A66C2]/20 to-[#0A66C2]/5 flex items-center justify-center mb-6">
        <Lock className="w-10 h-10 text-[#0A66C2]" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-3">
        PitchFirst Outreach
      </h1>
      <p className="text-lg text-gray-400 mb-6 max-w-md">
        Ab Juli verfügbar — wir arbeiten dran!
      </p>
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0A66C2]/10 border border-[#0A66C2]/20">
        <Rocket className="w-4 h-4 text-[#0A66C2]" />
        <span className="text-sm text-[#0A66C2] font-medium">Coming Soon</span>
      </div>
    </div>
  );
}
