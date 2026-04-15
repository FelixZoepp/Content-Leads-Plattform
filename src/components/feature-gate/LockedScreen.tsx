import { Lock, ArrowRight } from "lucide-react";

interface LockedScreenProps {
  title: string;
  description: string;
}

export function LockedScreen({ title, description }: LockedScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-4">
      <div className="w-16 h-16 rounded-2xl bg-[#0A66C2]/10 flex items-center justify-center">
        <Lock className="w-7 h-7 text-[#0A66C2]" />
      </div>
      <div className="text-center max-w-sm">
        <h2 className="text-2xl font-black tracking-tight text-white mb-3">{title}</h2>
        <p className="text-[14px] text-[#94A3B8] leading-relaxed">{description}</p>
      </div>
      <a
        href={`mailto:felix@content-leads.de?subject=Feature%20freischalten:%20${encodeURIComponent(title)}`}
        className="inline-flex items-center gap-2 bg-[#0A66C2] hover:bg-[#1A8CD8] text-white font-bold px-8 py-3 rounded-lg transition-all duration-200 hover:shadow-[0_0_20px_rgba(10,102,194,0.3)]"
      >
        Feature freischalten
        <ArrowRight className="w-4 h-4" />
      </a>
      <p className="text-[11px] text-[#475569]">Kontaktiere uns um diese Funktion freizuschalten</p>
    </div>
  );
}
