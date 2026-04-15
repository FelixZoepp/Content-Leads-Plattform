import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Props {
  tenants: any[];
}

export function PortfolioOverview({ tenants }: Props) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio-Übersicht</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Firma</th>
                <th className="text-left p-2">Letzter Sync</th>
                <th className="text-right p-2">Leads/Woche</th>
                <th className="text-right p-2">Termine/Woche</th>
                <th className="text-right p-2">Deals/Woche</th>
                <th className="text-right p-2">Umsatz</th>
                <th className="text-center p-2">Health</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(tenant => {
                const healthColor = tenant.latestHealth?.color || 'gray';
                const healthScore = tenant.latestHealth?.score || 'N/A';

                return (
                  <tr key={tenant.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{tenant.company_name}</td>
                    <td className="p-2 text-sm text-muted-foreground">
                      {tenant.last_sync_at 
                        ? new Date(tenant.last_sync_at).toLocaleDateString('de-DE')
                        : 'Nie'}
                    </td>
                    <td className="text-right p-2">
                      {tenant.latestMetrics?.leads_total || 0}
                    </td>
                    <td className="text-right p-2">
                      {tenant.latestMetrics?.appointments || 0}
                    </td>
                    <td className="text-right p-2">
                      {tenant.latestMetrics?.deals || 0}
                    </td>
                    <td className="text-right p-2">
                      {parseFloat(tenant.latestMetrics?.revenue || 0).toFixed(0)}€
                    </td>
                    <td className="text-center p-2">
                      <Badge 
                        variant="outline"
                        className={`
                          ${healthColor === 'green' ? 'bg-green-100 text-green-800 border-green-300' : ''}
                          ${healthColor === 'amber' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : ''}
                          ${healthColor === 'red' ? 'bg-red-100 text-red-800 border-red-300' : ''}
                        `}
                      >
                        {healthScore}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
