import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Consulting pages
const CashflowDashboard = lazy(() => import("./pages/consulting/CashflowDashboard"));
const TodayPage = lazy(() => import("./pages/consulting/TodayPage"));
const KPITrackingPage = lazy(() => import("./pages/consulting/KPITrackingPage"));
const ContentCalendarPage = lazy(() => import("./pages/consulting/ContentCalendarPage"));
const MarketingPage = lazy(() => import("./pages/consulting/MarketingPage"));
const SalesPage = lazy(() => import("./pages/consulting/SalesPage"));
const FinancePage = lazy(() => import("./pages/consulting/FinancePage"));
const AIPage = lazy(() => import("./pages/consulting/AIPage"));
const OverviewPage = lazy(() => import("./pages/consulting/OverviewPage"));
const ReportsPage = lazy(() => import("./pages/consulting/ReportsPage"));
const CSATPage = lazy(() => import("./pages/consulting/CSATPage"));
const AssetPage = lazy(() => import("./pages/consulting/AssetPage"));

// Platform pages
const Auth = lazy(() => import("./pages/Auth"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Settings = lazy(() => import("./pages/Settings"));
const Support = lazy(() => import("./pages/Support"));
const Training = lazy(() => import("./pages/training/Training"));
const Community = lazy(() => import("./pages/community/Community"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

// Outreach (Salesflow) pages
const OutreachContacts = lazy(() => import("./pages/outreach/Contacts"));
const OutreachPipeline = lazy(() => import("./pages/outreach/Pipeline"));
const OutreachCampaigns = lazy(() => import("./pages/outreach/Campaigns"));
const OutreachSequences = lazy(() => import("./pages/outreach/Sequences"));
const OutreachPowerDialer = lazy(() => import("./pages/outreach/PowerDialer"));
const OutreachLeadSearch = lazy(() => import("./pages/outreach/LeadSearch"));
const OutreachEmailCampaigns = lazy(() => import("./pages/outreach/EmailCampaigns"));
const OutreachEmailTemplates = lazy(() => import("./pages/outreach/EmailTemplates"));
const OutreachCallScript = lazy(() => import("./pages/outreach/CallScript"));
const OutreachObjectionLibrary = lazy(() => import("./pages/outreach/ObjectionLibrary"));
const OutreachDealAnalytics = lazy(() => import("./pages/outreach/DealAnalytics"));
const OutreachKPI = lazy(() => import("./pages/outreach/OutreachKPI"));
const OutreachLandingPages = lazy(() => import("./pages/outreach/LandingPageBuilder"));
const OutreachTeamArena = lazy(() => import("./pages/outreach/TeamArena"));
const OutreachImportLeads = lazy(() => import("./pages/outreach/ImportLeads"));
const OutreachActivityLog = lazy(() => import("./pages/outreach/ActivityLog"));
const OutreachVideoNote = lazy(() => import("./pages/outreach/VideoNote"));
const OutreachIntegrations = lazy(() => import("./pages/outreach/Integrations"));

// Additional outreach pages
const OutreachDashboard = lazy(() => import("./pages/outreach/SalesflowDashboard"));
const OutreachToday = lazy(() => import("./pages/outreach/OutreachToday"));
const OutreachApiKeys = lazy(() => import("./pages/outreach/ApiKeys"));
const OutreachBilling = lazy(() => import("./pages/outreach/Billing"));
const OutreachMasterAdmin = lazy(() => import("./pages/outreach/MasterAdmin"));
const OutreachPartner = lazy(() => import("./pages/outreach/Partner"));
const OutreachPartnerDashboard = lazy(() => import("./pages/outreach/PartnerDashboard"));
const OutreachVideoNoteAdmin = lazy(() => import("./pages/outreach/VideoNoteAdmin"));
const OutreachProfile = lazy(() => import("./pages/outreach/OutreachProfile"));
const OutreachLeadPagePreview = lazy(() => import("./pages/outreach/LeadPagePreview"));
const OutreachUpgrade = lazy(() => import("./pages/outreach/Upgrade"));

// Locked placeholder
const LockedPlaceholder = lazy(() => import("./pages/outreach/Instagram"));

const Loader = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#0B0E14]">
    <div className="w-8 h-8 border-4 border-[#2E86AB] border-t-transparent rounded-full animate-spin" />
  </div>
);

const SubLoader = () => (
  <div className="flex justify-center py-20">
    <div className="w-6 h-6 border-4 border-[#2E86AB] border-t-transparent rounded-full animate-spin" />
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function DashboardRoutes() {
  return (
    <DashboardLayout>
      <Suspense fallback={<SubLoader />}>
        <Routes>
          {/* Main */}
          <Route index element={<Dashboard />} />
          <Route path="calendar" element={<Calendar />} />

          {/* Consulting / Business */}
          <Route path="today" element={<TodayPage />} />
          <Route path="kpis" element={<KPITrackingPage />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="marketing" element={<MarketingPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="ai" element={<AIPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="csat" element={<CSATPage />} />
          <Route path="assets/:assetType" element={<AssetPage />} />
          <Route path="content/calendar" element={<ContentCalendarPage />} />

          {/* Outreach */}
          <Route path="outreach/tracking" element={<OutreachKPI />} />
          <Route path="outreach/contacts" element={<OutreachContacts />} />
          <Route path="outreach/linkedin" element={<OutreachContacts />} />
          <Route path="outreach/instagram" element={<LockedPlaceholder />} />
          <Route path="outreach/email" element={<OutreachEmailCampaigns />} />
          <Route path="outreach/pipeline" element={<OutreachPipeline />} />
          <Route path="outreach/campaigns" element={<OutreachCampaigns />} />
          <Route path="outreach/sequences" element={<OutreachSequences />} />
          <Route path="outreach/dialer" element={<OutreachPowerDialer />} />
          <Route path="outreach/leads" element={<OutreachLeadSearch />} />
          <Route path="outreach/email-templates" element={<OutreachEmailTemplates />} />
          <Route path="outreach/scripts" element={<OutreachCallScript />} />
          <Route path="outreach/objections" element={<OutreachObjectionLibrary />} />
          <Route path="outreach/analytics" element={<OutreachDealAnalytics />} />
          <Route path="outreach/import" element={<OutreachImportLeads />} />
          <Route path="outreach/team" element={<OutreachTeamArena />} />
          <Route path="outreach/landing-pages" element={<OutreachLandingPages />} />
          <Route path="outreach/activity" element={<OutreachActivityLog />} />
          <Route path="outreach/video" element={<OutreachVideoNote />} />
          <Route path="outreach/integrations" element={<OutreachIntegrations />} />
          <Route path="outreach/dashboard" element={<OutreachDashboard />} />
          <Route path="outreach/today" element={<OutreachToday />} />
          <Route path="outreach/api" element={<OutreachApiKeys />} />
          <Route path="outreach/billing" element={<OutreachBilling />} />
          <Route path="outreach/profile" element={<OutreachProfile />} />
          <Route path="outreach/partner" element={<OutreachPartner />} />
          <Route path="outreach/partner-dashboard" element={<OutreachPartnerDashboard />} />
          <Route path="outreach/video-admin" element={<OutreachVideoNoteAdmin />} />
          <Route path="outreach/upgrade" element={<OutreachUpgrade />} />
          <Route path="outreach/lead-page/:slug" element={<OutreachLeadPagePreview />} />
          <Route path="outreach/master-admin" element={<OutreachMasterAdmin />} />

          {/* CRM (uses Salesflow) */}
          <Route path="crm" element={<OutreachPipeline />} />
          <Route path="crm/contacts" element={<OutreachContacts />} />
          <Route path="crm/pipeline" element={<OutreachPipeline />} />

          {/* Content */}
          <Route path="content/management" element={<LockedPlaceholder />} />
          <Route path="content/generator" element={<LockedPlaceholder />} />
          <Route path="content/analytics" element={<LockedPlaceholder />} />

          {/* Tools */}
          <Route path="assistant" element={<LockedPlaceholder />} />
          <Route path="sales-reviewer" element={<OutreachCallScript />} />
          <Route path="live" element={<LockedPlaceholder />} />
          <Route path="games" element={<OutreachTeamArena />} />

          {/* Learn */}
          <Route path="training" element={<Training />} />
          <Route path="community" element={<Community />} />

          {/* Admin */}
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="support" element={<Support />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <DashboardRoutes />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
