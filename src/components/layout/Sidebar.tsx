import { SidebarItem } from "./SidebarItem";
import { useAuth } from "@/hooks/useAuth";
import { useUserFeatures } from "@/hooks/useHasFeature";
import { navigationConfig } from "@/lib/navigationConfig";
import {
  LayoutDashboard, CalendarDays, Radio,
  FileText, PenTool, BarChart3, DollarSign, Bot,
  GraduationCap, MessageCircle, Video, Settings, HelpCircle,
  Shield, Target, LineChart, Zap, Package, GitCompare, ClipboardList, UserCheck,
  Mic, Wand2, Library, Linkedin, TrendingUp,
  type LucideIcon,
} from "lucide-react";

// Map icon name strings (from navigationConfig) to actual components.
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, CalendarDays, Radio,
  FileText, PenTool, BarChart3, DollarSign, Bot,
  GraduationCap, MessageCircle, Video,
  Shield, Target, LineChart, Zap, Package, GitCompare, ClipboardList, UserCheck,
  Mic, Wand2, Library, Linkedin, TrendingUp,
};

export function Sidebar() {
  const { userRole, user } = useAuth();
  const { features, loading: featuresLoading } = useUserFeatures();
  const isAdmin = userRole === "admin" || userRole === "super_admin";

  const name = user?.user_metadata?.name || "Felix Zoepp";
  const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 1);

  // Determine if a nav item should be visible.
  // Items without a featureSlug are always shown.
  // Items with a featureSlug are shown only for admins or users who have that feature.
  const isVisible = (featureSlug?: string) => {
    if (!featureSlug) return true;
    if (isAdmin) return true;
    return features.has(featureSlug);
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] glass-sidebar flex flex-col z-50">
      {/* Logo / Brand */}
      <div className="px-5 py-5 border-b border-[rgba(249,249,249,0.08)]">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 flex items-center justify-center text-white text-lg flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #E9CB8B 0%, #C5A059 45%, #775A19 100%)",
              boxShadow: "0 0 24px rgba(197,160,89,0.4)",
              fontFamily: "var(--font-serif)",
            }}
          >
            C
          </div>
          <div>
            <div
              className="text-[11px] tracking-[0.18em] uppercase text-white leading-tight"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Content-Leads
            </div>
            <div className="text-[9px] tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)]">
              Consulting Plattform
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-1">
        {featuresLoading ? (
          // Loading skeleton — minimal, just dims the nav area
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="h-8 rounded-lg bg-[rgba(249,249,249,0.05)]"
                style={{ width: `${60 + (i % 4) * 10}%` }}
              />
            ))}
          </div>
        ) : (
          navigationConfig.map((section, si) => (
            <div key={section.section}>
              <div className={`${si === 0 ? "pb-2" : "pt-5 pb-2"} px-3`}>
                <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[rgba(249,249,249,0.3)]">
                  {section.section}
                </span>
              </div>
              {section.items
                .filter((item) => isVisible(item.featureSlug))
                .map((item) => {
                  const IconComponent = ICON_MAP[item.iconName];
                  return (
                    <SidebarItem
                      key={item.path}
                      icon={IconComponent ? <IconComponent className="w-5 h-5" /> : null}
                      label={item.label}
                      path={item.path}
                      locked={item.locked}
                    />
                  );
                })}
            </div>
          ))
        )}
      </nav>

      {/* User card */}
      <div className="px-4 py-4 border-t border-[rgba(249,249,249,0.08)]">
        {userRole === "advisor" && (
          <div className="mb-2">
            <SidebarItem icon={<UserCheck className="w-5 h-5" />} label="Meine Kunden" path="/dashboard/advisor" />
            <SidebarItem icon={<TrendingUp className="w-5 h-5" />} label="Kunden-KPIs" path="/dashboard/advisor/kpis" />
          </div>
        )}
        {(userRole === "admin" || userRole === "super_admin") && (
          <div className="mb-2">
            <SidebarItem icon={<UserCheck className="w-5 h-5" />} label="Berater-View" path="/dashboard/advisor" />
            <SidebarItem icon={<TrendingUp className="w-5 h-5" />} label="Kunden-KPIs" path="/dashboard/advisor/kpis" />
            <SidebarItem icon={<Shield className="w-5 h-5" />} label="Admin" path="/dashboard/admin" />
          </div>
        )}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(249,249,249,0.04)] border border-[rgba(249,249,249,0.08)]">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px]"
            style={{
              background: "linear-gradient(135deg, #E9CB8B 0%, #C5A059 45%, #775A19 100%)",
              fontFamily: "var(--font-serif)",
            }}
          >
            {initials}
          </div>
          <div className="leading-tight min-w-0">
            <div className="text-[12px] font-semibold text-white truncate">{name}</div>
            <div className="text-[10px] text-[rgba(249,249,249,0.5)] tracking-[0.1em] uppercase">
              {userRole === "admin" ? "Admin" : "Mitglied"}
            </div>
          </div>
        </div>
        <div className="mt-2 space-y-0.5">
          <SidebarItem icon={<Settings className="w-5 h-5" />} label="Einstellungen" path="/dashboard/settings" />
          <SidebarItem icon={<HelpCircle className="w-5 h-5" />} label="Support" path="/dashboard/support" />
        </div>
      </div>
    </aside>
  );
}
