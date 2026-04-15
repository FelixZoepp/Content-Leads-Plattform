import { SidebarItem } from "./SidebarItem";
import {
  LayoutDashboard, CalendarDays, Radio, Linkedin, Instagram, Mail,
  Users, FileText, PenTool, BarChart3, DollarSign, Bot, Phone,
  GraduationCap, MessageCircle, Video, Gamepad2, Settings, HelpCircle,
  TrendingUp
} from "lucide-react";

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-[#0A0A0F] border-r border-[#2A2A35] flex flex-col z-50">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#2A2A35]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#4A9FD9]/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-[#4A9FD9]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Content Leads</div>
            <div className="text-[11px] text-[#8888AA]">Platform</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <SidebarItem icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" path="/dashboard" />
        <SidebarItem icon={<CalendarDays className="w-5 h-5" />} label="Calendar" path="/dashboard/calendar" />

        <div className="pt-2" />
        <SidebarItem
          icon={<Radio className="w-5 h-5" />}
          label="Outreach"
          children={[
            { icon: <BarChart3 className="w-4 h-4" />, label: "Tracking", path: "/dashboard/outreach/tracking" },
            { icon: <Linkedin className="w-4 h-4" />, label: "LinkedIn", path: "/dashboard/outreach/linkedin" },
            { icon: <Instagram className="w-4 h-4" />, label: "Instagram", path: "/dashboard/outreach/instagram", locked: true },
            { icon: <Mail className="w-4 h-4" />, label: "E-Mail", path: "/dashboard/outreach/email", locked: true },
          ]}
        />

        <SidebarItem icon={<Users className="w-5 h-5" />} label="CRM" path="/dashboard/crm" locked />

        <SidebarItem
          icon={<FileText className="w-5 h-5" />}
          label="Content"
          children={[
            { icon: <FileText className="w-4 h-4" />, label: "Management", path: "/dashboard/content/management", locked: true },
            { icon: <PenTool className="w-4 h-4" />, label: "Post Generator", path: "/dashboard/content/generator", locked: true },
            { icon: <BarChart3 className="w-4 h-4" />, label: "Analytics", path: "/dashboard/content/analytics", locked: true },
          ]}
        />

        <SidebarItem icon={<DollarSign className="w-5 h-5" />} label="Finance" path="/dashboard/finance" locked />
        <SidebarItem icon={<Bot className="w-5 h-5" />} label="Assistant" path="/dashboard/assistant" locked />
        <SidebarItem icon={<Phone className="w-5 h-5" />} label="Sales Reviewer" path="/dashboard/sales-reviewer" locked />

        <div className="pt-2" />
        <SidebarItem icon={<GraduationCap className="w-5 h-5" />} label="Training" path="/dashboard/training" />
        <SidebarItem icon={<MessageCircle className="w-5 h-5" />} label="Community" path="/dashboard/community" />
        <SidebarItem icon={<Video className="w-5 h-5" />} label="Live-Übungen" path="/dashboard/live" locked />
        <SidebarItem icon={<Gamepad2 className="w-5 h-5" />} label="Games" path="/dashboard/games" locked />
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[#2A2A35] space-y-1">
        <SidebarItem icon={<Settings className="w-5 h-5" />} label="Einstellungen" path="/dashboard/settings" />
        <SidebarItem icon={<HelpCircle className="w-5 h-5" />} label="Support" path="/dashboard/support" />
      </div>
    </aside>
  );
}
