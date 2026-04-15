import { Lock, Rocket } from "lucide-react";

interface LockedScreenProps {
  title: string;
  description: string;
}

export function LockedScreen({ title, description }: LockedScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="w-20 h-20 rounded-full bg-[#2E86AB]/10 flex items-center justify-center">
        <Lock className="w-10 h-10 text-[#2E86AB]" />
      </div>
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-[#94A3B8]">{description}</p>
      </div>
      <a
        href="mailto:felix@content-leads.de?subject=Feature%20freischalten:%20${encodeURIComponent(title)}"
        className="inline-flex items-center gap-2 bg-[#2E86AB] hover:bg-[#246E8F] text-white font-semibold px-6 py-3 rounded-lg transition"
      >
        <Rocket className="w-5 h-5" />
        Feature freischalten
      </a>
      <p className="text-xs text-[#64748B]">Kontaktiere uns um diese Funktion freizuschalten</p>
    </div>
  );
}
