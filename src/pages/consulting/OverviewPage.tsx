import { useDashboardData } from "@/hooks/useDashboardData";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClientMetricsCards } from "@/components/client/ClientMetricsCards";
import { KPIInsights } from "@/components/dashboard/KPIInsights";
import { TimeRangeSelector } from "@/components/dashboard/TimeRangeSelector";
import { OverviewCharts } from "@/components/client/OverviewCharts";
import { BaselineKPICards } from "@/components/client/BaselineKPICards";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { KPIEntryForm } from "@/components/dashboard/KPIEntryForm";
import { KPIMetricTracker } from "@/components/client/KPIMetricTracker";
import { salesKPIConfigs, marketingKPIConfigs } from "@/lib/kpiTrackerConfigs";

export default function OverviewPage() {
  const { tenant, metrics, healthScore, timeRange, setTimeRange, reload, tenantId } = useDashboardData();
  const [showEntryForm, setShowEntryForm] = useState(false);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        <Button onClick={() => setShowEntryForm(!showEntryForm)} size="sm" className="rounded-xl">
          <Plus className="h-4 w-4 mr-1" />
          {showEntryForm ? "Schließen" : "Heute eintragen"}
        </Button>
      </div>

      {showEntryForm && (
        <KPIEntryForm tenantId={tenantId} onEntryAdded={() => { reload(); setShowEntryForm(false); }} />
      )}

      {healthScore && (
        <Card className={`glass-card border-2 ${
          healthScore.color === "green" ? "border-success/40" :
          healthScore.color === "amber" ? "border-warning/40" : "border-destructive/40"
        }`}>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Health Score: {healthScore.score}/100</CardTitle>
            <CardDescription>{healthScore.rationale_text}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <ClientMetricsCards metrics={metrics} timeRange={timeRange} />
      <OverviewCharts metrics={metrics} timeRange={timeRange} />
      <KPIMetricTracker configs={[...salesKPIConfigs, ...marketingKPIConfigs]} metrics={metrics} />
      <BaselineKPICards tenant={tenant} />
      <KPIInsights metrics={metrics} />
    </div>
  );
}
