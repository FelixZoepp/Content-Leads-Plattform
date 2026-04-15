import { motion, AnimatePresence } from "framer-motion";
import { Check, ExternalLink } from "lucide-react";
import type { Section } from "@/pages/client/TodayPage";

interface Props {
  sections: Section[];
  onToggle: (sectionIdx: number, itemId: string) => void;
  navigate: (path: string) => void;
}

export function DailyChecklist({ sections, onToggle, navigate }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {sections.map((section, si) => {
        const sectionDone = section.items.filter((i) => i.done).length;
        const sectionTotal = section.items.length;
        const allDone = sectionDone === sectionTotal;

        return (
          <motion.div
            key={section.title}
            className="rounded-2xl glass-card overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 + si * 0.08 }}
          >
            <div className="p-5 space-y-4">
              {/* Section header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{section.emoji}</span>
                  <span className="font-semibold text-foreground text-sm">{section.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  {allDone && (
                    <motion.span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${section.color}22`, color: section.color }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring" }}
                    >
                      ✓ Fertig!
                    </motion.span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {sectionDone}/{sectionTotal}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: section.color, boxShadow: `0 0 8px ${section.color}88` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(sectionDone / sectionTotal) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              {/* Items */}
              <div className="space-y-2">
                {section.items.map((item) => (
                  <motion.button
                    key={item.id}
                    onClick={() => onToggle(si, item.id)}
                    className="w-full flex items-center gap-3 text-left group/item"
                    whileTap={{ scale: 0.98 }}
                  >
                    <div
                      className="flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200"
                      style={{
                        background: item.done ? section.color : "transparent",
                        borderColor: item.done ? section.color : "hsl(var(--border))",
                        boxShadow: item.done ? `0 0 10px ${section.color}66` : "none",
                      }}
                    >
                      <AnimatePresence>
                        {item.done && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                          >
                            <Check className="h-3 w-3 text-black" strokeWidth={3} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <span
                      className="text-sm transition-all duration-200"
                      style={{
                        color: item.done ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))",
                        textDecoration: item.done ? "line-through" : "none",
                        opacity: item.done ? 0.5 : 1,
                      }}
                    >
                      {item.label}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Navigate button */}
              <motion.button
                onClick={() => navigate(section.path)}
                className="w-full flex items-center justify-center gap-2 mt-1 py-2 px-3 rounded-xl text-xs font-medium transition-all duration-200"
                style={{
                  background: `${section.color}14`,
                  color: section.color,
                  border: `1px solid ${section.color}33`,
                }}
                whileHover={{
                  background: `${section.color}28`,
                  boxShadow: `0 0 16px -4px ${section.color}66`,
                }}
                whileTap={{ scale: 0.97 }}
              >
                <section.icon className="h-3.5 w-3.5" />
                {section.pathLabel}
                <ExternalLink className="h-3 w-3 opacity-60" />
              </motion.button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
