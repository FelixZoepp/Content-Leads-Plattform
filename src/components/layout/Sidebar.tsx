import { SidebarItem } from "./SidebarItem";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, CalendarDays, Radio, Linkedin, Instagram, Mail,
  Users, FileText, PenTool, BarChart3, DollarSign, Bot, Phone,
  GraduationCap, MessageCircle, Video, Gamepad2, Settings, HelpCircle,
  TrendingUp, Shield, Target, LineChart, Kanban, UserSearch, Send,
  GitBranch, Globe, Upload, Activity, PhoneCall, BookOpen, Zap
} from "lucide-react";

export function Sidebar() {
  const { userRole } = useAuth();
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-[#0A0A14] border-r border-[#1E293B] flex flex-col z-50">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0A66C2] flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-[14px] font-black tracking-tight text-white">Content-Leads</div>
            <div className="text-[10px] text-[#64748B] font-medium tracking-wide uppercase">Platform</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* MAIN */}
        <SidebarItem icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" path="/dashboard" />
        <SidebarItem icon={<CalendarDays className="w-5 h-5" />} label="Calendar" path="/dashboard/calendar" />

        {/* OUTREACH */}
        <div className="pt-3 pb-1 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Outreach</span>
        </div>
        <SidebarItem
          icon={<Radio className="w-5 h-5" />}
          label="Outreach"
          children={[
            { icon: <LayoutDashboard className="w-4 h-4" />, label: "Dashboard", path: "/dashboard/outreach/dashboard" },
            { icon: <Users className="w-4 h-4" />, label: "Kontakte", path: "/dashboard/outreach/contacts" },
            { icon: <Kanban className="w-4 h-4" />, label: "Pipeline", path: "/dashboard/outreach/pipeline" },
            { icon: <Send className="w-4 h-4" />, label: "Kampagnen", path: "/dashboard/outreach/campaigns" },
            { icon: <GitBranch className="w-4 h-4" />, label: "Sequenzen", path: "/dashboard/outreach/sequences" },
            { icon: <PhoneCall className="w-4 h-4" />, label: "Power Dialer", path: "/dashboard/outreach/dialer" },
            { icon: <UserSearch className="w-4 h-4" />, label: "Lead-Recherche", path: "/dashboard/outreach/leads" },
            { icon: <Mail className="w-4 h-4" />, label: "E-Mail Kampagnen", path: "/dashboard/outreach/email" },
            { icon: <Globe className="w-4 h-4" />, label: "Landing Pages", path: "/dashboard/outreach/landing-pages" },
            { icon: <Gamepad2 className="w-4 h-4" />, label: "Team Arena", path: "/dashboard/outreach/team" },
            { icon: <BarChart3 className="w-4 h-4" />, label: "KPIs", path: "/dashboard/outreach/kpi" },
            { icon: <Upload className="w-4 h-4" />, label: "Import", path: "/dashboard/outreach/import" },
          ]}
        />

        {/* SALES TOOLS */}
        <SidebarItem
          icon={<Zap className="w-5 h-5" />}
          label="Sales Tools"
          children={[
            { icon: <BookOpen className="w-4 h-4" />, label: "Call Scripts", path: "/dashboard/outreach/scripts" },
            { icon: <PhoneCall className="w-4 h-4" />, label: "Einwandbehandlung", path: "/dashboard/outreach/objections" },
            { icon: <TrendingUp className="w-4 h-4" />, label: "Deal Analytics", path: "/dashboard/outreach/analytics" },
            { icon: <Activity className="w-4 h-4" />, label: "Activity Log", path: "/dashboard/outreach/activity" },
            { icon: <Video className="w-4 h-4" />, label: "Video Notes", path: "/dashboard/outreach/video" },
          ]}
        />

        {/* CONTENT */}
        <SidebarItem
          icon={<FileText className="w-5 h-5" />}
          label="Content"
          children={[
            { icon: <FileText className="w-4 h-4" />, label: "Management", path: "/dashboard/content/management", locked: true },
            { icon: <PenTool className="w-4 h-4" />, label: "Post Generator", path: "/dashboard/content/generator", locked: true },
            { icon: <BarChart3 className="w-4 h-4" />, label: "Analytics", path: "/dashboard/content/analytics", locked: true },
          ]}
        />

        {/* BUSINESS */}
        <div className="pt-3 pb-1 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Business</span>
        </div>
        <SidebarItem icon={<DollarSign className="w-5 h-5" />} label="Finance" path="/dashboard/finance" locked />
        <SidebarItem icon={<Target className="w-5 h-5" />} label="KPIs" path="/dashboard/kpis" />
        <SidebarItem icon={<LineChart className="w-5 h-5" />} label="Reports" path="/dashboard/reports" />

        {/* LERNEN */}
        <div className="pt-3 pb-1 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Lernen</span>
        </div>
        <SidebarItem icon={<GraduationCap className="w-5 h-5" />} label="Training" path="/dashboard/training" />
        <SidebarItem icon={<MessageCircle className="w-5 h-5" />} label="Community" path="/dashboard/community" />
        <SidebarItem icon={<Video className="w-5 h-5" />} label="Live-Übungen" path="/dashboard/live" locked />

        {/* TOOLS */}
        <div className="pt-3 pb-1 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Tools</span>
        </div>
        <SidebarItem icon={<Bot className="w-5 h-5" />} label="Content-Leads AI" path="/dashboard/assistant" />
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[#1E293B] space-y-1">
        {userRole === "admin" && (
          <SidebarItem icon={<Shield className="w-5 h-5" />} label="Admin" path="/dashboard/admin" />
        )}
        <SidebarItem icon={<Settings className="w-5 h-5" />} label="Einstellungen" path="/dashboard/settings" />
        <SidebarItem icon={<HelpCircle className="w-5 h-5" />} label="Support" path="/dashboard/support" />
      </div>
    </aside>
  );
}
