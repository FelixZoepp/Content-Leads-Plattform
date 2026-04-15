import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertsPanel } from "@/components/admin/AlertsPanel";
import { AdminAISummary } from "@/components/admin/AdminAISummary";
import { AdminCSATOverview } from "@/components/admin/AdminCSATOverview";
import { AdminPortfolioTabs } from "@/components/admin/AdminPortfolioTabs";
import { CustomerStatusList } from "@/components/admin/CustomerStatusList";
import { CustomerAnalysisTable } from "@/components/admin/CustomerAnalysisTable";

import { InviteCustomerDialog } from "@/components/admin/InviteCustomerDialog";
import { AdvisorReport } from "@/components/admin/AdvisorReport";

import { Routes, Route } from "react-router-dom";
import { WebhookSettings } from "@/components/admin/WebhookSettings";

function AdminAlertsPage({ alerts, tenants, loadAdminData }: { alerts: any[]; tenants: any[]; loadAdminData: () => void }) {
  const { toast } = useToast();
  const [calculating, setCalculating] = useState(false);

  const recalculate = async () => {
    setCalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-health", { body: {} });
      if (error) throw error;
      toast({ title: "Health Scores berechnet", description: `${data?.processed || 0} Kunden analysiert` });
      loadAdminData();
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
    setCalculating(false);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Alerts</h2>
        <Button onClick={recalculate} disabled={calculating} variant="outline" size="sm">
          {calculating ? "Berechne..." : "🔄 Health Scores jetzt berechnen"}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground -mt-4">
        Alerts werden täglich um 7:00 Uhr automatisch generiert, basierend auf den KPI-Daten der letzten 2 Wochen.
      </p>
      <AlertsPanel alerts={alerts} tenants={tenants} onResolve={loadAdminData} />
    </div>
  );
}

function AdminCSATPage({ tenants }: { tenants: any[] }) {
  return (
    <div className="space-y-6 max-w-6xl">
      <h2 className="text-xl font-semibold text-foreground">CSAT / NPS Übersicht</h2>
      <AdminCSATOverview tenants={tenants} />
    </div>
  );
}

function AdminAISummaryPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <h2 className="text-xl font-semibold text-foreground">KI-Summary</h2>
      <AdminAISummary />
    </div>
  );
}

function AdminAdvisorReportPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <h2 className="text-xl font-semibold text-foreground">Berater-Report</h2>
      <p className="text-sm text-muted-foreground">Monatlicher CSAT/NPS-Vergleich pro Kundenberater</p>
      <AdvisorReport />
    </div>
  );
}

function AdminPortfolioPage({ tenants, onReload }: { tenants: any[]; onReload: () => void }) {
  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div />
        <InviteCustomerDialog onSuccess={onReload} />
      </div>
      <CustomerStatusList />
      <AdminPortfolioTabs tenants={tenants} />
      <CustomerAnalysisTable />
    </div>
  );
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => { loadAdminData(); }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const { data: tenantsData } = await supabase
        .from("tenants")
        .select(`*, health_scores!health_scores_tenant_id_fkey(score, color, created_at)`)
        .eq("is_active", true)
        .order("company_name");

      const processedTenants = tenantsData?.map(tenant => {
        const sortedHealth = tenant.health_scores?.sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        return { ...tenant, latestHealth: sortedHealth?.[0] };
      }) || [];
      setTenants(processedTenants);

      const { data: alertsData } = await supabase
        .from("alerts")
        .select("*, tenants(company_name)")
        .is("resolved_at", null)
        .order("created_at", { ascending: false });
      setAlerts(alertsData || []);
    } catch (error) {
      console.error("Error loading admin data:", error);
      toast({ title: "Fehler", description: "Admin-Daten konnten nicht geladen werden", variant: "destructive" });
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="glass-card"><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route index element={<AdminPortfolioPage tenants={tenants} onReload={loadAdminData} />} />
        <Route path="alerts" element={<AdminAlertsPage alerts={alerts} tenants={tenants} loadAdminData={loadAdminData} />} />
        <Route path="csat" element={<AdminCSATPage tenants={tenants} />} />
        <Route path="advisor-report" element={<AdminAdvisorReportPage />} />
        <Route path="ai-summary" element={<AdminAISummaryPage />} />

        <Route path="webhooks" element={<WebhookSettings />} />
      </Routes>
    </>
  );
}
