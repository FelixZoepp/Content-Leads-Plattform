import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardDataProvider } from "@/hooks/useDashboardData";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Wrapper for consulting pages that need DashboardDataProvider
function WithDashboardData({ children }: { children: React.ReactNode }) {
  return <DashboardDataProvider>{children}</DashboardDataProvider>;
}

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
const AssetOverview = lazy(() => import("./pages/consulting/AssetOverview"));
const KPIComparison = lazy(() => import("./pages/consulting/KPIComparison"));
const ClientReport = lazy(() => import("./pages/consulting/ClientReport"));

// Platform pages
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const GeneratingAssets = lazy(() => import("./pages/GeneratingAssets"));
const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Settings = lazy(() => import("./pages/Settings"));
const Support = lazy(() => import("./pages/Support"));
const Training = lazy(() => import("./pages/training/Training"));
const Community = lazy(() => import("./pages/community/Community"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

// Outreach — locked until July 2025
const OutreachLocked = lazy(() => import("./pages/OutreachLocked"));

// Generic locked placeholder (for non-outreach locked features)
const LockedPlaceholder = lazy(() => import("./pages/OutreachLocked"));

const Loader = () => (
  <div className="flex min-h-screen items-center justify-center" style={{ background: "#0A0B0B" }}>
    <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
  </div>
);

const SubLoader = () => (
  <div className="flex justify-center py-20">
    <div className="w-6 h-6 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
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
      <ErrorBoundary>
      <Suspense fallback={<SubLoader />}>
        <Routes>
          {/* Main */}
          <Route index element={<Dashboard />} />
          <Route path="calendar" element={<Calendar />} />

          {/* Consulting / Business - wrapped in DashboardDataProvider */}
          <Route path="today" element={<WithDashboardData><TodayPage /></WithDashboardData>} />
          <Route path="kpis" element={<WithDashboardData><KPITrackingPage /></WithDashboardData>} />
          <Route path="overview" element={<WithDashboardData><OverviewPage /></WithDashboardData>} />
          <Route path="marketing" element={<WithDashboardData><MarketingPage /></WithDashboardData>} />
          <Route path="sales" element={<WithDashboardData><SalesPage /></WithDashboardData>} />
          <Route path="finance" element={<WithDashboardData><FinancePage /></WithDashboardData>} />
          <Route path="ai" element={<WithDashboardData><AIPage /></WithDashboardData>} />
          <Route path="reports" element={<WithDashboardData><ReportsPage /></WithDashboardData>} />
          <Route path="csat" element={<WithDashboardData><CSATPage /></WithDashboardData>} />
          <Route path="assets" element={<WithDashboardData><AssetOverview /></WithDashboardData>} />
          <Route path="assets/:assetType" element={<WithDashboardData><AssetPage /></WithDashboardData>} />
          <Route path="kpi-comparison" element={<WithDashboardData><KPIComparison /></WithDashboardData>} />
          <Route path="client-report" element={<WithDashboardData><ClientReport /></WithDashboardData>} />
          <Route path="content/calendar" element={<WithDashboardData><ContentCalendarPage /></WithDashboardData>} />

          {/* Outreach — locked until July */}
          <Route path="outreach/*" element={<OutreachLocked />} />

          {/* CRM — locked (part of Outreach) */}
          <Route path="crm/*" element={<OutreachLocked />} />

          {/* Content */}
          <Route path="content/management" element={<LockedPlaceholder />} />
          <Route path="content/generator" element={<LockedPlaceholder />} />
          <Route path="content/analytics" element={<LockedPlaceholder />} />

          {/* Tools */}
          <Route path="assistant" element={<AIAssistant />} />
          <Route path="sales-reviewer" element={<OutreachLocked />} />
          <Route path="live" element={<LockedPlaceholder />} />
          <Route path="games" element={<OutreachLocked />} />

          {/* Learn */}
          <Route path="training" element={<Training />} />
          <Route path="community" element={<Community />} />

          {/* Admin */}
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="support" element={<Support />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
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
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/generating" element={<ProtectedRoute><GeneratingAssets /></ProtectedRoute>} />
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
