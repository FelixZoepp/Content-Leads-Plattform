import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Globe, 
  Eye, 
  BarChart3, 
  Video, 
  Sparkles,
  Users,
  Zap,
  Phone,
  Mic,
  ChevronDown,
  Shield,
  Settings,
  LayoutDashboard,
  ArrowRight
} from "lucide-react";

interface FeatureItem {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  href?: string;
  badge?: string;
}

interface FeatureCategory {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  items: FeatureItem[];
}

const featureCategories: FeatureCategory[] = [
  {
    title: "LEAD-GENERIERUNG",
    icon: Globe,
    color: "text-primary",
    bgColor: "bg-primary/10",
    items: [
      { icon: Globe, title: "Lead-Seiten", description: "Personalisierte Landing Pages", href: "/features/lead-seiten" },
      { icon: Video, title: "KI-Videos", description: "Automatisch generierte Videos", href: "/features/ki-videos" },
      { icon: Eye, title: "Echtzeit-Tracking", description: "Live Lead-Aktivitäten", href: "/features/lead-seiten" },
      { icon: BarChart3, title: "Lead-Scoring", description: "Automatische Bewertung", href: "/features/lead-seiten" },
    ]
  },
  {
    title: "CRM & VERTRIEB",
    icon: Users,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    items: [
      { icon: Users, title: "Kontakt-Management", description: "Alle Leads zentral verwalten", href: "/features/crm" },
      { icon: LayoutDashboard, title: "Deal-Pipeline", description: "Visuelles Pipeline-Management", href: "/features/crm" },
      { icon: Phone, title: "Power Dialer", description: "Direkt aus dem CRM anrufen", href: "/features/power-dialer" },
      { icon: Zap, title: "Automatisierungen", description: "Workflows & Follow-ups", href: "/features/crm" },
    ]
  },
  {
    title: "KI-FUNKTIONEN",
    icon: Sparkles,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    items: [
      { icon: Sparkles, title: "KI-Konfigurator", description: "Seiten mit KI erstellen", badge: "NEU", href: "/features/ki-konfigurator" },
      { icon: Mic, title: "Live-Einwandbehandlung", description: "KI-Coach während des Calls", href: "/features/live-einwandbehandlung" },
      { icon: Video, title: "Avatar-Videos", description: "Personalisierte KI-Videos", href: "/features/ki-videos" },
    ]
  },
  {
    title: "SICHERHEIT",
    icon: Shield,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    items: [
      { icon: Shield, title: "DSGVO-konform", description: "Hosting in Deutschland", href: "/features/crm" },
      { icon: Settings, title: "Integrationen", description: "API & Webhooks", href: "/features/crm" },
    ]
  }
];

interface FeaturesMegaMenuProps {
  className?: string;
}

export const FeaturesMegaMenu = ({ className }: FeaturesMegaMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const handleItemClick = (href?: string) => {
    if (href) {
      navigate(href);
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger */}
      <button 
        className="flex items-center gap-1 hover:text-white transition-colors text-white/80 py-2"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => setIsOpen(!isOpen)}
      >
        Features
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Mega Menu Dropdown - Centered on screen */}
      {isOpen && (
        <div 
          className="fixed inset-x-0 top-16 flex justify-center z-[100]"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="w-[900px] max-w-[95vw] bg-[#0f1629] border border-white/20 rounded-2xl shadow-2xl shadow-black/80 p-6 mx-4">
            {/* Categories Grid */}
            <div className="grid grid-cols-4 gap-6">
              {featureCategories.map((category) => (
                <div key={category.title} className="space-y-4">
                  {/* Category Header */}
                  <div className={`flex items-center gap-2 p-2 rounded-lg ${category.bgColor}`}>
                    <category.icon className={`h-4 w-4 ${category.color}`} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${category.color}`}>
                      {category.title}
                    </span>
                  </div>
                  
                  {/* Category Items */}
                  <div className="space-y-1">
                    {category.items.map((item) => (
                      <button
                        key={item.title}
                        onClick={() => handleItemClick(item.href)}
                        className={`w-full text-left p-3 rounded-xl transition-all duration-200 group ${
                          item.href 
                            ? 'hover:bg-white/10 cursor-pointer' 
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <item.icon className={`h-5 w-5 mt-0.5 transition-colors ${
                            item.href ? 'text-white/60 group-hover:text-primary' : 'text-white/40'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium transition-colors ${
                                item.href ? 'text-white group-hover:text-primary' : 'text-white/60'
                              }`}>
                                {item.title}
                              </span>
                              {item.badge && (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground">
                                  {item.badge}
                                </span>
                              )}
                              {item.href && (
                                <ArrowRight className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-white/40 mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/10 border border-primary/30 flex-1">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-white/50">Alle Features kennenlernen</p>
                  <p className="text-base font-semibold text-white">Kostenlose Demo buchen</p>
                </div>
              </div>
              <a
                href="https://calendly.com/zoepp-media/vorgesprach-demo-software"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                Demo vereinbaren
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeaturesMegaMenu;
