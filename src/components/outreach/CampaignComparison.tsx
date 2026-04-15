import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import { 
  TrendingUp, 
  RefreshCw,
  Target
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface CampaignKPIs {
  campaignId: string;
  campaignName: string;
  status: string;
  total: number;
  connectionsSent: number;
  connectionsAccepted: number;
  messagesSent: number;
  warmLeads: number;
  acceptanceRate: number;
  responseRate: number;
  conversionRate: number;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(220, 70%, 50%)',
  'hsl(280, 65%, 60%)',
  'hsl(340, 70%, 50%)',
];

export function CampaignComparison() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [kpis, setKpis] = useState<CampaignKPIs[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch campaigns
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, name, status')
        .order('created_at', { ascending: false });

      if (campaignError) {
        console.error("Error fetching campaigns:", campaignError);
        setLoading(false);
        return;
      }

      setCampaigns(campaignData || []);

      // Fetch contacts for all campaigns
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('campaign_id, workflow_status')
        .eq('lead_type', 'outbound');

      if (contactsError) {
        console.error("Error fetching contacts:", contactsError);
        setLoading(false);
        return;
      }

      // Calculate KPIs per campaign
      const campaignKpis: CampaignKPIs[] = (campaignData || []).map(campaign => {
        const contacts = (contactsData || []).filter(c => c.campaign_id === campaign.id);
        const total = contacts.length;

        const countStatus = (status: string) => 
          contacts.filter(c => c.workflow_status === status).length;

        const vernetzung_ausstehend = countStatus('vernetzung_ausstehend');
        const vernetzung_angenommen = countStatus('vernetzung_angenommen');
        const erstnachricht_gesendet = countStatus('erstnachricht_gesendet');
        const fu1_gesendet = countStatus('fu1_gesendet');
        const fu2_gesendet = countStatus('fu2_gesendet');
        const fu3_gesendet = countStatus('fu3_gesendet');
        const reagiert_warm = countStatus('reagiert_warm');
        const positiv_geantwortet = countStatus('positiv_geantwortet');
        const termin_gebucht = countStatus('termin_gebucht');
        const abgeschlossen = countStatus('abgeschlossen');

        const connectionsSent = vernetzung_ausstehend + vernetzung_angenommen +
          erstnachricht_gesendet + fu1_gesendet + fu2_gesendet +
          fu3_gesendet + reagiert_warm + positiv_geantwortet + termin_gebucht + abgeschlossen;

        const connectionsAccepted = vernetzung_angenommen + erstnachricht_gesendet +
          fu1_gesendet + fu2_gesendet + fu3_gesendet +
          reagiert_warm + positiv_geantwortet + termin_gebucht + abgeschlossen;

        const messagesSent = erstnachricht_gesendet + fu1_gesendet +
          fu2_gesendet + fu3_gesendet + reagiert_warm + positiv_geantwortet + termin_gebucht + abgeschlossen;

        const warmLeads = reagiert_warm + positiv_geantwortet + termin_gebucht + abgeschlossen;

        const acceptanceRate = connectionsSent > 0 ? (connectionsAccepted / connectionsSent) * 100 : 0;
        const responseRate = messagesSent > 0 ? (warmLeads / messagesSent) * 100 : 0;
        const conversionRate = total > 0 ? (warmLeads / total) * 100 : 0;

        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          status: campaign.status,
          total,
          connectionsSent,
          connectionsAccepted,
          messagesSent,
          warmLeads,
          acceptanceRate,
          responseRate,
          conversionRate,
        };
      });

      setKpis(campaignKpis);
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (kpis.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Target className="h-12 w-12 mx-auto mb-2" />
        <p>Keine Kampagnen zum Vergleichen vorhanden</p>
      </div>
    );
  }

  // Data for bar charts
  const ratesChartData = kpis.map(k => ({
    name: k.campaignName.length > 15 ? k.campaignName.substring(0, 15) + '...' : k.campaignName,
    'Annahme-Rate': parseFloat(k.acceptanceRate.toFixed(1)),
    'Antwort-Rate': parseFloat(k.responseRate.toFixed(1)),
    'Conversion-Rate': parseFloat(k.conversionRate.toFixed(1)),
  }));

  const numbersChartData = kpis.map(k => ({
    name: k.campaignName.length > 15 ? k.campaignName.substring(0, 15) + '...' : k.campaignName,
    'Leads': k.total,
    'Vernetzungen': k.connectionsSent,
    'Nachrichten': k.messagesSent,
    'Warm': k.warmLeads,
  }));

  // Radar chart data for top campaigns
  const topCampaigns = kpis.filter(k => k.total > 0).slice(0, 5);
  const radarData = [
    { metric: 'Annahme', fullMark: 100, ...Object.fromEntries(topCampaigns.map(k => [k.campaignName, k.acceptanceRate])) },
    { metric: 'Antwort', fullMark: 100, ...Object.fromEntries(topCampaigns.map(k => [k.campaignName, k.responseRate])) },
    { metric: 'Conversion', fullMark: 100, ...Object.fromEntries(topCampaigns.map(k => [k.campaignName, k.conversionRate])) },
  ];

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Entwurf", variant: "secondary" },
      active: { label: "Aktiv", variant: "default" },
      paused: { label: "Pausiert", variant: "outline" },
      completed: { label: "Abgeschlossen", variant: "destructive" },
    };
    const c = config[status] || config.draft;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const getBestCampaign = (metric: 'acceptanceRate' | 'responseRate' | 'conversionRate') => {
    const campaignsWithData = kpis.filter(k => k.total > 0);
    if (campaignsWithData.length === 0) return null;
    return campaignsWithData.reduce((best, current) => 
      current[metric] > best[metric] ? current : best
    );
  };

  const bestAcceptance = getBestCampaign('acceptanceRate');
  const bestResponse = getBestCampaign('responseRate');
  const bestConversion = getBestCampaign('conversionRate');

  return (
    <div className="space-y-6">
      {/* Best Performers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-1">Beste Annahme-Rate</p>
            {bestAcceptance ? (
              <>
                <p className="text-2xl font-bold text-green-600">{bestAcceptance.acceptanceRate.toFixed(1)}%</p>
                <p className="text-sm font-medium truncate">{bestAcceptance.campaignName}</p>
              </>
            ) : (
              <p className="text-muted-foreground">-</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-1">Beste Antwort-Rate</p>
            {bestResponse ? (
              <>
                <p className="text-2xl font-bold text-blue-600">{bestResponse.responseRate.toFixed(1)}%</p>
                <p className="text-sm font-medium truncate">{bestResponse.campaignName}</p>
              </>
            ) : (
              <p className="text-muted-foreground">-</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-1">Beste Conversion-Rate</p>
            {bestConversion ? (
              <>
                <p className="text-2xl font-bold text-destructive">{bestConversion.conversionRate.toFixed(1)}%</p>
                <p className="text-sm font-medium truncate">{bestConversion.campaignName}</p>
              </>
            ) : (
              <p className="text-muted-foreground">-</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rates Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Raten-Vergleich
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratesChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis unit="%" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value}%`, '']}
                  />
                  <Legend />
                  <Bar dataKey="Annahme-Rate" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Antwort-Rate" fill="hsl(var(--chart-3))" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Conversion-Rate" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Numbers Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Zahlen-Vergleich
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={numbersChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Leads" fill="hsl(var(--muted-foreground))" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Vernetzungen" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Nachrichten" fill="hsl(var(--chart-4))" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Warm" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Kampagnen-Übersicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kampagne</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Vernetzungen</TableHead>
                  <TableHead className="text-right">Angenommen</TableHead>
                  <TableHead className="text-right">Nachrichten</TableHead>
                  <TableHead className="text-right">Warm</TableHead>
                  <TableHead>Annahme-Rate</TableHead>
                  <TableHead>Antwort-Rate</TableHead>
                  <TableHead>Conversion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpis.map((k) => (
                  <TableRow key={k.campaignId}>
                    <TableCell className="font-medium max-w-[150px] truncate">{k.campaignName}</TableCell>
                    <TableCell>{getStatusBadge(k.status)}</TableCell>
                    <TableCell className="text-right">{k.total}</TableCell>
                    <TableCell className="text-right">{k.connectionsSent}</TableCell>
                    <TableCell className="text-right">{k.connectionsAccepted}</TableCell>
                    <TableCell className="text-right">{k.messagesSent}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">{k.warmLeads}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={k.acceptanceRate} className="h-2 w-16" />
                        <span className="text-xs text-muted-foreground">{k.acceptanceRate.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={k.responseRate} className="h-2 w-16" />
                        <span className="text-xs text-muted-foreground">{k.responseRate.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={k.conversionRate} className="h-2 w-16" />
                        <span className="text-xs text-muted-foreground">{k.conversionRate.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
