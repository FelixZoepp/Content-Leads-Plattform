/**
 * Navigation config for feature-gated sidebar items.
 *
 * Items with no featureSlug are always visible.
 * Items with a featureSlug are only shown when the user has that feature
 * (or when userRole === "admin").
 *
 * Icons are referenced by name — the Sidebar resolves them from lucide-react.
 */

export interface NavItem {
  label: string;
  path: string;
  iconName: string;
  featureSlug?: string;
  locked?: boolean;
}

export interface NavSection {
  section: string;
  items: NavItem[];
}

export const navigationConfig: NavSection[] = [
  {
    section: "Cockpit",
    items: [
      { label: "Dashboard", path: "/dashboard", iconName: "LayoutDashboard" },
      { label: "Calendar", path: "/dashboard/calendar", iconName: "CalendarDays" },
    ],
  },
  {
    section: "Outreach",
    items: [
      { label: "Outreach", path: "/dashboard/outreach/dashboard", iconName: "Radio", locked: true },
      { label: "Sales Tools", path: "/dashboard/outreach/scripts", iconName: "Zap", locked: true },
    ],
  },
  {
    section: "Content",
    items: [
      { label: "Management", path: "/dashboard/content/management", iconName: "FileText", locked: true },
      { label: "Post Generator", path: "/dashboard/content/generator", iconName: "PenTool", locked: true },
      { label: "Analytics", path: "/dashboard/content/analytics", iconName: "BarChart3", locked: true },
    ],
  },
  {
    section: "Playbook",
    items: [
      { label: "Alle Assets", path: "/dashboard/assets", iconName: "Package" },
      { label: "KPI-Vergleich", path: "/dashboard/kpi-comparison", iconName: "GitCompare" },
      { label: "Client Report", path: "/dashboard/client-report", iconName: "ClipboardList" },
    ],
  },
  {
    section: "Studio",
    items: [
      { label: "Finance", path: "/dashboard/finance", iconName: "DollarSign" },
      { label: "KPIs", path: "/dashboard/kpis", iconName: "Target" },
      { label: "Reports", path: "/dashboard/reports", iconName: "LineChart" },
    ],
  },
  {
    section: "Lernen",
    items: [
      { label: "Training", path: "/dashboard/training", iconName: "GraduationCap" },
      { label: "Community", path: "/dashboard/community", iconName: "MessageCircle" },
      { label: "Live-Übungen", path: "/dashboard/live", iconName: "Video", locked: true },
    ],
  },
  {
    section: "KI-Tools",
    items: [
      { label: "Tone of Voice", path: "/dashboard/ai/tone-of-voice", iconName: "Mic" },
      { label: "Profil-Optimizer", path: "/dashboard/ai/profile-optimizer", iconName: "Linkedin" },
      {
        label: "Content Generator",
        path: "/dashboard/ai/content-generator",
        iconName: "Wand2",
        featureSlug: "bot.leadpost",
      },
      { label: "Bibliothek", path: "/dashboard/ai/library", iconName: "Library" },
    ],
  },
  {
    section: "Tools",
    items: [
      { label: "Content-Leads AI", path: "/dashboard/assistant", iconName: "Bot" },
    ],
  },
];
