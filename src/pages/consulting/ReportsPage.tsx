import { useDashboardData } from "@/hooks/useDashboardData";
import { MonthlyReportTable } from "@/components/dashboard/MonthlyReportTable";
import { MonthlyKPIEntry } from "@/components/dashboard/MonthlyKPIEntry";
import { useState } from "react";

export default function ReportsPage() {
  const { tenantId, tenant, reload } = useDashboardData();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSaved = () => {
    setRefreshKey(k => k + 1);
    reload();
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <h2 className="text-xl font-semibold text-foreground">Reports & Dateneingabe</h2>
      <MonthlyKPIEntry tenantId={tenantId} onSaved={handleSaved} />
      <MonthlyReportTable key={refreshKey} tenantId={tenantId} companyName={tenant?.company_name || ""} />
    </div>
  );
}
