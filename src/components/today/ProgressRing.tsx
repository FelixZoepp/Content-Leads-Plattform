import { motion } from "framer-motion";

export function ProgressRing({ percent }: { percent: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width="140" height="140" className="rotate-[-90deg]">
      <circle cx="70" cy="70" r={r} fill="none" stroke="hsl(0 85% 55% / 0.12)" strokeWidth="10" />
      <motion.circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke="url(#redGrad)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        style={{ filter: "drop-shadow(0 0 8px hsl(0 85% 55% / 0.8))" }}
      />
      <defs>
        <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(0 85% 55%)" />
          <stop offset="100%" stopColor="hsl(25 90% 55%)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
