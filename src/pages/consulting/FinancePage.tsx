import { useDashboardData } from "@/hooks/useDashboardData";
import { FinancialTracker } from "@/components/dashboard/FinancialTracker";
import { FinanceCharts } from "@/components/client/FinanceCharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, PlusCircle } from "lucide-react";

export default function FinancePage() {
  const { tenantId } = useDashboardData();

  return (
    <div className="space-y-6 max-w-6xl">
      <h2 className="text-xl font-semibold text-foreground">Finanzen</h2>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="rounded-xl">
          <TabsTrigger value="dashboard" className="rounded-xl gap-2">
            <BarChart3 className="h-4 w-4" />
            Live-Dashboard
          </TabsTrigger>
          <TabsTrigger value="entry" className="rounded-xl gap-2">
            <PlusCircle className="h-4 w-4" />
            Woche erfassen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4 space-y-6">
          <FinanceCharts tenantId={tenantId} />
          <FinancialTracker tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="entry" className="mt-4">
          <FinancialTracker tenantId={tenantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
