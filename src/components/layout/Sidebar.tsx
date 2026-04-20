import { SidebarItem } from "./SidebarItem";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, CalendarDays, Radio,
  FileText, PenTool, BarChart3, DollarSign, Bot,
  GraduationCap, MessageCircle, Video, Settings, HelpCircle,
  Shield, Target, LineChart, Zap
} from "lucide-react";

export function Sidebar() {
  const { userRole, user } = useAuth();
  const name = user?.user_metadata?.name || "Felix Zoepp";
  const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 1);

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
        {/* COCKPIT */}
        <div className="pb-2 px-3">
          <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[rgba(249,249,249,0.3)]">Cockpit</span>
        </div>
        <SidebarItem icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" path="/dashboard" />
        <SidebarItem icon={<CalendarDays className="w-5 h-5" />} label="Calendar" path="/dashboard/calendar" />

        {/* OUTREACH — locked, not expandable */}
        <div className="pt-5 pb-2 px-3">
          <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[rgba(249,249,249,0.3)]">Outreach</span>
        </div>
        <SidebarItem icon={<Radio className="w-5 h-5" />} label="Outreach" path="/dashboard/outreach/dashboard" locked />
        <SidebarItem icon={<Zap className="w-5 h-5" />} label="Sales Tools" path="/dashboard/outreach/scripts" locked />

        {/* CONTENT — eigene Sektion */}
        <div className="pt-5 pb-2 px-3">
          <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[rgba(249,249,249,0.3)]">Content</span>
        </div>
        <SidebarItem icon={<FileText className="w-5 h-5" />} label="Management" path="/dashboard/content/management" locked />
        <SidebarItem icon={<PenTool className="w-5 h-5" />} label="Post Generator" path="/dashboard/content/generator" locked />
        <SidebarItem icon={<BarChart3 className="w-5 h-5" />} label="Analytics" path="/dashboard/content/analytics" locked />

        {/* STUDIO */}
        <div className="pt-5 pb-2 px-3">
          <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[rgba(249,249,249,0.3)]">Studio</span>
        </div>
        <SidebarItem icon={<DollarSign className="w-5 h-5" />} label="Finance" path="/dashboard/finance" locked />
        <SidebarItem icon={<Target className="w-5 h-5" />} label="KPIs" path="/dashboard/kpis" />
        <SidebarItem icon={<LineChart className="w-5 h-5" />} label="Reports" path="/dashboard/reports" />

        {/* LERNEN */}
        <div className="pt-5 pb-2 px-3">
          <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[rgba(249,249,249,0.3)]">Lernen</span>
        </div>
        <SidebarItem icon={<GraduationCap className="w-5 h-5" />} label="Training" path="/dashboard/training" />
        <SidebarItem icon={<MessageCircle className="w-5 h-5" />} label="Community" path="/dashboard/community" />
        <SidebarItem icon={<Video className="w-5 h-5" />} label="Live-Übungen" path="/dashboard/live" locked />

        {/* TOOLS */}
        <div className="pt-5 pb-2 px-3">
          <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[rgba(249,249,249,0.3)]">Tools</span>
        </div>
        <SidebarItem icon={<Bot className="w-5 h-5" />} label="Content-Leads AI" path="/dashboard/assistant" />
      </nav>

      {/* User card */}
      <div className="px-4 py-4 border-t border-[rgba(249,249,249,0.08)]">
        {userRole === "admin" && (
          <div className="mb-2">
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
