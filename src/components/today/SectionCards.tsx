import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface SectionCard {
  badge: string;
  badgeColor: string;
  title: string;
  path: string;
}

const sectionCards: SectionCard[] = [
  { badge: "KPIs", badgeColor: "hsl(0 85% 55%)", title: "Übersicht & KPIs", path: "/dashboard/overview" },
  { badge: "Marketing", badgeColor: "hsl(25 90% 55%)", title: "Reichweite & Content tracken", path: "/dashboard/marketing" },
  { badge: "Sales", badgeColor: "hsl(0 70% 50%)", title: "Pipeline & Deals verfolgen", path: "/dashboard/sales" },
  { badge: "Finanzen", badgeColor: "hsl(38 92% 55%)", title: "Revenue & Kosten im Blick", path: "/dashboard/finance" },
  { badge: "KI-Briefing", badgeColor: "hsl(0 85% 55%)", title: "Intelligente Analyse & Insights", path: "/dashboard/ai" },
  { badge: "Leistungsanalyse", badgeColor: "hsl(10 75% 52%)", title: "Kundenzufriedenheit messen", path: "/dashboard/csat" },
  { badge: "Reports", badgeColor: "hsl(25 90% 55%)", title: "Monatsberichte & Export", path: "/dashboard/reports" },
];

export function SectionCards() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {sectionCards.map((card, i) => (
        <motion.button
          key={card.path}
          onClick={() => navigate(card.path)}
          className="relative rounded-2xl overflow-hidden text-left group cursor-pointer border border-white/[0.08] bg-white/[0.03]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 + i * 0.05 }}
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Glow on hover */}
          <div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              boxShadow: `0 0 40px -8px ${card.badgeColor}44, inset 0 0 30px -15px ${card.badgeColor}22`,
            }}
          />
          {/* Top border shimmer */}
          <div
            className="absolute top-0 left-0 right-0 h-px rounded-t-2xl opacity-50"
            style={{ background: `linear-gradient(90deg, transparent, ${card.badgeColor}66, transparent)` }}
          />

          <div className="relative z-10 p-5 flex flex-col h-full min-h-[120px]">
            {/* Badge */}
            <span
              className="text-[11px] font-semibold tracking-wide px-2.5 py-1 rounded-full w-fit mb-3"
              style={{
                color: card.badgeColor,
                background: `${card.badgeColor}18`,
                border: `1px solid ${card.badgeColor}33`,
              }}
            >
              {card.badge}
            </span>

            {/* Title */}
            <h3 className="text-base font-bold text-foreground leading-snug">
              {card.title}
            </h3>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
