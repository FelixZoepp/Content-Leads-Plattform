import { useState, useEffect, createContext, useContext } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type TimeRange = "daily" | "weekly" | "monthly" | "yearly";

interface DashboardData {
  tenant: any;
  metrics: any[];
  healthScore: any;
  timeRange: TimeRange;
  setTimeRange: (v: TimeRange) => void;
  loading: boolean;
  reload: () => void;
  tenantId: string;
}

const DashboardContext = createContext<DashboardData | null>(null);

export function useDashboardData() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboardData must be used within DashboardDataProvider");
  return ctx;
}

export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const { user, tenantId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [healthScore, setHealthScore] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("daily");

  const viewMap: Record<TimeRange, string> = {
    daily: "v_metrics_daily",
    weekly: "v_metrics_weekly",
    monthly: "v_metrics_monthly",
    yearly: "v_metrics_yearly",
  };

  const loadData = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data: tenantData } = await supabase
        .from("tenants").select("*").eq("id", tenantId).single();
      setTenant(tenantData);

      const viewName = viewMap[timeRange];
      const dateCol = timeRange === "daily" ? "period_date" : "period_start";
      const { data: metricsData } = await supabase
        .from(viewName as any).select("*").eq("tenant_id", tenantId)
        .order(dateCol, { ascending: false })
        .limit(timeRange === "daily" ? 30 : timeRange === "weekly" ? 12 : timeRange === "monthly" ? 12 : 5);
      setMetrics(metricsData || []);

      const { data: healthData } = await supabase
        .from("health_scores").select("*").eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      setHealthScore(healthData);
    } catch (error) {
      console.error("Error loading dashboard:", error);
      toast({ title: "Fehler", description: "Dashboard konnte nicht geladen werden", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && tenantId) loadData();
  }, [tenantId, user, timeRange]);

  return (
    <DashboardContext.Provider value={{
      tenant, metrics, healthScore, timeRange, setTimeRange, loading, reload: loadData, tenantId: tenantId || "",
    }}>
      {children}
    </DashboardContext.Provider>
  );
}
