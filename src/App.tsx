import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Settings = lazy(() => import("./pages/Settings"));
const Support = lazy(() => import("./pages/Support"));
const Tracking = lazy(() => import("./pages/outreach/Tracking"));
const LinkedIn = lazy(() => import("./pages/outreach/LinkedIn"));
const Instagram = lazy(() => import("./pages/outreach/Instagram"));
const EmailOutreach = lazy(() => import("./pages/outreach/Email"));
const CRM = lazy(() => import("./pages/crm/CRM"));
const ContentManagement = lazy(() => import("./pages/content/Management"));
const PostGenerator = lazy(() => import("./pages/content/PostGenerator"));
const ContentAnalytics = lazy(() => import("./pages/content/Analytics"));
const Finance = lazy(() => import("./pages/finance/Finance"));
const Training = lazy(() => import("./pages/training/Training"));
const Community = lazy(() => import("./pages/community/Community"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

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
          <Route index element={<Dashboard />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="outreach/tracking" element={<Tracking />} />
          <Route path="outreach/linkedin" element={<LinkedIn />} />
          <Route path="outreach/instagram" element={<Instagram />} />
          <Route path="outreach/email" element={<EmailOutreach />} />
          <Route path="crm" element={<CRM />} />
          <Route path="content/management" element={<ContentManagement />} />
          <Route path="content/generator" element={<PostGenerator />} />
          <Route path="content/analytics" element={<ContentAnalytics />} />
          <Route path="finance" element={<Finance />} />
          <Route path="assistant" element={<Instagram />} />
          <Route path="sales-reviewer" element={<Instagram />} />
          <Route path="training" element={<Training />} />
          <Route path="community" element={<Community />} />
          <Route path="live" element={<Instagram />} />
          <Route path="games" element={<Instagram />} />
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
