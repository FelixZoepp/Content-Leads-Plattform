import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Platform pages
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Settings = lazy(() => import("./pages/Settings"));
const Support = lazy(() => import("./pages/Support"));
const Training = lazy(() => import("./pages/training/Training"));
const Community = lazy(() => import("./pages/community/Community"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

// Real Salesflow/Outreach pages
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
const SalesflowDashboard = lazy(() => import("./pages/outreach/SalesflowDashboard"));
const OutreachProfile = lazy(() => import("./pages/outreach/OutreachProfile"));

// Locked placeholder
const LockedPlaceholder = lazy(() => import("./pages/outreach/Instagram"));

const Loader = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#0A0A0F]">
    <div className="w-8 h-8 border-4 border-[#4A9FD9] border-t-transparent rounded-full animate-spin" />
  </div>
);

const SubLoader = () => (
  <div className="flex justify-center py-20">
    <div className="w-6 h-6 border-4 border-[#4A9FD9] border-t-transparent rounded-full animate-spin" />
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
          {/* Platform */}
          <Route index element={<Dashboard />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="training" element={<Training />} />
          <Route path="community" element={<Community />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="support" element={<Support />} />

          {/* Outreach - real Salesflow pages */}
          <Route path="outreach/tracking" element={<OutreachKPI />} />
          <Route path="outreach/linkedin" element={<OutreachContacts />} />
          <Route path="outreach/instagram" element={<LockedPlaceholder />} />
          <Route path="outreach/email" element={<OutreachEmailCampaigns />} />

          {/* CRM = Pipeline + Contacts */}
          <Route path="crm" element={<OutreachPipeline />} />
          <Route path="crm/contacts" element={<OutreachContacts />} />
          <Route path="crm/pipeline" element={<OutreachPipeline />} />
          <Route path="crm/deals" element={<OutreachDealAnalytics />} />
          <Route path="crm/import" element={<OutreachImportLeads />} />
          <Route path="crm/activity" element={<OutreachActivityLog />} />

          {/* Content */}
          <Route path="content/management" element={<LockedPlaceholder />} />
          <Route path="content/generator" element={<LockedPlaceholder />} />
          <Route path="content/analytics" element={<LockedPlaceholder />} />

          {/* Finance */}
          <Route path="finance" element={<LockedPlaceholder />} />

          {/* Sales tools */}
          <Route path="assistant" element={<LockedPlaceholder />} />
          <Route path="sales-reviewer" element={<OutreachCallScript />} />
          <Route path="live" element={<LockedPlaceholder />} />
          <Route path="games" element={<OutreachTeamArena />} />

          {/* Deep outreach pages */}
          <Route path="outreach/campaigns" element={<OutreachCampaigns />} />
          <Route path="outreach/sequences" element={<OutreachSequences />} />
          <Route path="outreach/dialer" element={<OutreachPowerDialer />} />
          <Route path="outreach/leads" element={<OutreachLeadSearch />} />
          <Route path="outreach/email-templates" element={<OutreachEmailTemplates />} />
          <Route path="outreach/objections" element={<OutreachObjectionLibrary />} />
          <Route path="outreach/deal-analytics" element={<OutreachDealAnalytics />} />
          <Route path="outreach/landing-pages" element={<OutreachLandingPages />} />
          <Route path="outreach/team-arena" element={<OutreachTeamArena />} />
          <Route path="outreach/import" element={<OutreachImportLeads />} />
          <Route path="outreach/activity" element={<OutreachActivityLog />} />
          <Route path="outreach/video" element={<OutreachVideoNote />} />
          <Route path="outreach/integrations" element={<OutreachIntegrations />} />
          <Route path="outreach/profile" element={<OutreachProfile />} />
          <Route path="outreach/dashboard" element={<SalesflowDashboard />} />
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
