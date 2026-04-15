import { useDashboardData } from "@/hooks/useDashboardData";
import { ClientMetricsCards } from "@/components/client/ClientMetricsCards";
import { KPIInsights } from "@/components/dashboard/KPIInsights";
import { TimeRangeSelector } from "@/components/dashboard/TimeRangeSelector";
import { MarketingCharts } from "@/components/client/MarketingCharts";
import { MarketingKPIEntry } from "@/components/dashboard/MarketingKPIEntry";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, PlusCircle } from "lucide-react";
import { KPIMetricTracker } from "@/components/client/KPIMetricTracker";
import { marketingKPIConfigs } from "@/lib/kpiTrackerConfigs";

export default function MarketingPage() {
  const { metrics, timeRange, setTimeRange, reload, tenantId } = useDashboardData();

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Marketing & LinkedIn</h2>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="rounded-xl">
          <TabsTrigger value="dashboard" className="rounded-xl gap-2">
            <BarChart3 className="h-4 w-4" />
            Live-Dashboard
          </TabsTrigger>
          <TabsTrigger value="entry" className="rounded-xl gap-2">
            <PlusCircle className="h-4 w-4" />
            Wochen-KPIs erfassen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4 space-y-6">
          <ClientMetricsCards metrics={metrics} timeRange={timeRange} />
          <MarketingCharts metrics={metrics} timeRange={timeRange} />
          <KPIMetricTracker configs={marketingKPIConfigs} metrics={metrics} title="Inbound-KPIs (LinkedIn Leadposts)" />
          <KPIInsights metrics={metrics} />
        </TabsContent>

        <TabsContent value="entry" className="mt-4">
          <MarketingKPIEntry tenantId={tenantId} onEntryAdded={reload} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
