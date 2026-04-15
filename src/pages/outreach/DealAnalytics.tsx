import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Euro, TrendingUp, Target, Calendar, Megaphone, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { format, startOfMonth, subMonths } from "date-fns";
import { de } from "date-fns/locale";

interface Deal {
  id: string;
  amount_eur: number;
  stage: string;
  created_at: string;
  contacts: { campaign_id: string | null } | null;
}

interface Campaign {
  id: string;
  name: string;
}

const STAGE_COLORS: Record<string, string> = {
  'Hat Seite geöffnet': 'hsl(200, 70%, 50%)',
  'Heißer Lead - Anrufen': 'hsl(25, 95%, 55%)',
  'Setting': 'hsl(280, 70%, 55%)',
  'Setting terminiert': 'hsl(280, 70%, 45%)',
  'Setting No Show': 'hsl(0, 70%, 50%)',
  'Setting Follow Up': 'hsl(280, 50%, 55%)',
  'Closing': 'hsl(45, 95%, 50%)',
  'Closing terminiert': 'hsl(45, 80%, 45%)',
  'Closing No Show': 'hsl(0, 60%, 50%)',
  'Closing Follow Up': 'hsl(45, 60%, 55%)',
  'Angebot versendet': 'hsl(180, 60%, 50%)',
  'Abgeschlossen': 'hsl(142, 70%, 45%)',
  'Verloren': 'hsl(0, 0%, 50%)',
};

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 70%, 45%)',
  'hsl(25, 95%, 55%)',
  'hsl(280, 70%, 55%)',
  'hsl(45, 95%, 50%)',
  'hsl(200, 70%, 50%)',
  'hsl(330, 70%, 50%)',
  'hsl(180, 60%, 50%)',
];

export default function DealAnalytics() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>("6");

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const monthsAgo = subMonths(new Date(), parseInt(timeRange));

      const [dealsRes, campaignsRes] = await Promise.all([
        supabase
          .from('deals')
          .select('id, amount_eur, stage, created_at, contacts(campaign_id)')
          .gte('created_at', monthsAgo.toISOString())
          .eq('pipeline', 'cold'),
        supabase
          .from('campaigns')
          .select('id, name')
      ]);

      setDeals(dealsRes.data || []);
      setCampaigns(campaignsRes.data || []);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const totalVolume = deals.reduce((sum, d) => sum + Number(d.amount_eur || 0), 0);
  const avgDealSize = deals.length > 0 ? totalVolume / deals.length : 0;
  const wonDeals = deals.filter(d => d.stage === 'Abgeschlossen');
  const wonVolume = wonDeals.reduce((sum, d) => sum + Number(d.amount_eur || 0), 0);
  const pipelineVolume = deals.filter(d => d.stage !== 'Abgeschlossen' && d.stage !== 'Verloren')
    .reduce((sum, d) => sum + Number(d.amount_eur || 0), 0);

  // Group by campaign
  const volumeByCampaign = campaigns.map(campaign => {
    const campaignDeals = deals.filter(d => d.contacts?.campaign_id === campaign.id);
    const volume = campaignDeals.reduce((sum, d) => sum + Number(d.amount_eur || 0), 0);
    return {
      name: campaign.name.length > 15 ? campaign.name.slice(0, 15) + '...' : campaign.name,
      fullName: campaign.name,
      volume,
      count: campaignDeals.length,
    };
  }).filter(c => c.volume > 0).sort((a, b) => b.volume - a.volume);

  // Group by month
  const volumeByMonth: Record<string, number> = {};
  const countByMonth: Record<string, number> = {};
  deals.forEach(deal => {
    const monthKey = format(new Date(deal.created_at), 'yyyy-MM');
    volumeByMonth[monthKey] = (volumeByMonth[monthKey] || 0) + Number(deal.amount_eur || 0);
    countByMonth[monthKey] = (countByMonth[monthKey] || 0) + 1;
  });

  const monthlyData = Object.entries(volumeByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, volume]) => ({
      month: format(new Date(month + '-01'), 'MMM yyyy', { locale: de }),
      volume,
      count: countByMonth[month],
    }));

  // Group by stage
  const volumeByStage: Record<string, number> = {};
  const countByStage: Record<string, number> = {};
  deals.forEach(deal => {
    volumeByStage[deal.stage] = (volumeByStage[deal.stage] || 0) + Number(deal.amount_eur || 0);
    countByStage[deal.stage] = (countByStage[deal.stage] || 0) + 1;
  });

  const stageData = Object.entries(volumeByStage)
    .map(([stage, volume]) => ({
      name: stage.length > 20 ? stage.slice(0, 20) + '...' : stage,
      fullName: stage,
      volume,
      count: countByStage[stage],
      color: STAGE_COLORS[stage] || 'hsl(var(--muted))',
    }))
    .sort((a, b) => b.volume - a.volume);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-3 border border-white/10 rounded-lg">
          <p className="font-medium text-foreground">{payload[0]?.payload?.fullName || label}</p>
          <p className="text-sm text-primary">{formatCurrency(payload[0].value)}</p>
          {payload[0]?.payload?.count && (
            <p className="text-xs text-muted-foreground">{payload[0].payload.count} Deals</p>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Lädt Analytics...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Deal Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">Volumen nach Kampagne, Zeit und Stage</p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px] glass-card border-white/10">
              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Letzte 3 Monate</SelectItem>
              <SelectItem value="6">Letzte 6 Monate</SelectItem>
              <SelectItem value="12">Letztes Jahr</SelectItem>
              <SelectItem value="24">Letzte 2 Jahre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Euro className="w-4 h-4" />
                Gesamtvolumen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalVolume)}</p>
              <p className="text-xs text-muted-foreground mt-1">{deals.length} Deals</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Pipeline-Wert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-500">{formatCurrency(pipelineVolume)}</p>
              <p className="text-xs text-muted-foreground mt-1">Offene Deals</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="w-4 h-4" />
                Gewonnen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-500">{formatCurrency(wonVolume)}</p>
              <p className="text-xs text-muted-foreground mt-1">{wonDeals.length} Deals</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Ø Deal-Größe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(avgDealSize)}</p>
              <p className="text-xs text-muted-foreground mt-1">Durchschnitt</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-6">
          {/* Volume by Campaign */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-primary" />
                Volumen nach Kampagne
              </CardTitle>
            </CardHeader>
            <CardContent>
              {volumeByCampaign.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={volumeByCampaign} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      type="number" 
                      tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={120}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Keine Kampagnen-Daten vorhanden
                </div>
              )}
            </CardContent>
          </Card>

          {/* Volume by Stage (Pie) */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Volumen nach Stage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stageData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stageData}
                      dataKey="volume"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {stageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Keine Stage-Daten vorhanden
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trend */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Volumen-Entwicklung nach Monat
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="volume" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                    name="Volumen"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Keine monatlichen Daten vorhanden
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stage Breakdown Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Detailübersicht nach Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stageData.map((stage, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="font-medium">{stage.fullName}</span>
                    <Badge variant="secondary" className="text-xs">{stage.count} Deals</Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(stage.volume)}</p>
                    <p className="text-xs text-muted-foreground">
                      {((stage.volume / totalVolume) * 100).toFixed(1)}% des Gesamtvolumens
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
