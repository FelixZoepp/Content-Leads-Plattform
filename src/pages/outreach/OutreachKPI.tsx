import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Calendar, TrendingUp, Target, Euro, PhoneOff, CheckCircle, XCircle, Eye, Flame } from "lucide-react";
import { toast } from "sonner";

type TimeFilter = "today" | "week" | "month";

interface PipelineKPIs {
  // Lead generation
  totalLeads: number;
  pageViews: number;
  hotLeads: number;
  conversionToHot: number;

  // Calling / Setting
  callsTotal: number;
  callsReached: number;
  reachRate: number;
  settingsScheduled: number;
  settingNoShows: number;
  settingNoShowRate: number;

  // Closing
  closingsScheduled: number;
  closingNoShows: number;
  closingNoShowRate: number;
  dealsWon: number;
  dealsLost: number;
  closingRate: number;

  // Revenue
  totalRevenue: number;
  avgDealSize: number;
}

const KPI = () => {
  const [kpis, setKpis] = useState<PipelineKPIs>({
    totalLeads: 0,
    pageViews: 0,
    hotLeads: 0,
    conversionToHot: 0,
    callsTotal: 0,
    callsReached: 0,
    reachRate: 0,
    settingsScheduled: 0,
    settingNoShows: 0,
    settingNoShowRate: 0,
    closingsScheduled: 0,
    closingNoShows: 0,
    closingNoShowRate: 0,
    dealsWon: 0,
    dealsLost: 0,
    closingRate: 0,
    totalRevenue: 0,
    avgDealSize: 0,
  });

  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("week");

  useEffect(() => {
    fetchKPIs();
  }, [timeFilter]);

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;

    if (timeFilter === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeFilter === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return startDate.toISOString();
  };

  const fetchKPIs = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = getDateRange();

      // Fetch ALL deals with contact info for lead scoring
      const { data: allDealsData } = await supabase
        .from("deals")
        .select("*, contacts(lead_score)");

      // Fetch deals that were created OR updated in the time range for activity metrics
      const { data: recentDeals } = await supabase
        .from("deals")
        .select("*")
        .or(`created_at.gte.${startDate},updated_at.gte.${startDate}`);

      // Fetch contacts that became hot (lead_score >= 70) in the time range
      const { data: hotContacts } = await supabase
        .from("contacts")
        .select("id, lead_score, updated_at")
        .gte("lead_score", 70)
        .gte("updated_at", startDate);

      // Fetch all call activities in the time range
      const { data: activities } = await supabase
        .from("activities")
        .select("*")
        .eq("type", "call")
        .gte("timestamp", startDate);

      const allDeals = allDealsData || [];
      const activeDeals = recentDeals || [];
      const allCalls = activities || [];

      // CURRENT PIPELINE STATUS
      const currentPageViews = allDeals.filter((d) => d.stage === "Hat Seite geöffnet").length;
      
      // Hot leads: contacts with lead_score >= 70 (based on engagement tracking)
      const currentHotLeads = (hotContacts || []).length;
      
      // Settings scheduled within the time range (moved to Setting stage)
      const currentSettings = allDeals.filter((d) => 
        d.stage === "Setting" && 
        new Date(d.updated_at) >= new Date(startDate)
      ).length;
      
      // Closings scheduled within the time range
      const currentClosings = allDeals.filter((d) => 
        d.stage === "Closing" && 
        new Date(d.updated_at) >= new Date(startDate)
      ).length;

      // No-shows based on next_action field
      const settingNoShows = allDeals.filter((d) => 
        d.next_action?.toLowerCase().includes("no show") && 
        d.stage === "Setting"
      ).length;
      const closingNoShows = allDeals.filter((d) => 
        d.next_action?.toLowerCase().includes("no show") && 
        d.stage === "Closing"
      ).length;

      // Won/Lost deals in time range
      const wonDeals = activeDeals.filter((d) => d.stage === "Abgeschlossen");
      const lostDeals = activeDeals.filter((d) => d.stage === "Verloren");
      const dealsWon = wonDeals.length;
      const dealsLost = lostDeals.length;

      // Revenue from won deals
      const totalRevenue = wonDeals.reduce((sum, d) => sum + (Number(d.amount_eur) || 0), 0);
      const avgDealSize = dealsWon > 0 ? totalRevenue / dealsWon : 0;

      // Call KPIs
      const callsTotal = allCalls.length;
      const callsReached = allCalls.filter((a) =>
        ["reached", "interested", "not_interested"].includes(a.outcome || "")
      ).length;

      // Calculate rates
      const closingBase = currentSettings + currentClosings;
      const closingRate = closingBase > 0 ? (dealsWon / closingBase) * 100 : 0;
      const totalLeads = currentPageViews + currentHotLeads;

      setKpis({
        totalLeads,
        pageViews: currentPageViews,
        hotLeads: currentHotLeads,
        conversionToHot: totalLeads > 0 ? (currentHotLeads / totalLeads) * 100 : 0,
        callsTotal,
        callsReached,
        reachRate: callsTotal > 0 ? (callsReached / callsTotal) * 100 : 0,
        settingsScheduled: currentSettings,
        settingNoShows,
        settingNoShowRate: currentSettings > 0 ? (settingNoShows / currentSettings) * 100 : 0,
        closingsScheduled: currentClosings,
        closingNoShows,
        closingNoShowRate: currentClosings > 0 ? (closingNoShows / currentClosings) * 100 : 0,
        dealsWon,
        dealsLost,
        closingRate,
        totalRevenue,
        avgDealSize,
      });
    } catch (error: any) {
      console.error("Error fetching KPIs:", error);
      toast.error("Fehler beim Laden der KPIs");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Lädt KPIs...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">KPIs & Performance</h1>
          <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
            <TabsList>
              <TabsTrigger value="today">Heute</TabsTrigger>
              <TabsTrigger value="week">Woche</TabsTrigger>
              <TabsTrigger value="month">Monat</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Lead Generation */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-400" />
            Lead-Generierung
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Seite geöffnet</CardTitle>
                <Eye className="w-4 h-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{kpis.pageViews}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Neue Leads aus Outreach
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Heiße Leads</CardTitle>
                <Flame className="w-4 h-4 text-orange-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-400">{kpis.hotLeads}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Bereit zum Anrufen
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Hot-Lead-Rate</CardTitle>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-400">
                  {kpis.conversionToHot.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Konversion zu heißen Leads
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Anrufe</CardTitle>
                <Phone className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{kpis.callsTotal}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.callsReached} erreicht ({kpis.reachRate.toFixed(0)}%)
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Setting & Closing */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            Setting & Closing
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Settings geplant</CardTitle>
                <Calendar className="w-4 h-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{kpis.settingsScheduled}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Termine in Setting-Phase
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Closings geplant</CardTitle>
                <Target className="w-4 h-4 text-amber-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{kpis.closingsScheduled}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Termine in Closing-Phase
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">No-Show-Rate</CardTitle>
                <PhoneOff className="w-4 h-4 text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-400">
                  {((kpis.settingNoShowRate + kpis.closingNoShowRate) / 2).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.settingNoShows + kpis.closingNoShows} nicht erschienen
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Closing-Rate</CardTitle>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-400">
                  {kpis.closingRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Von Termin zu Abschluss
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Results */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Euro className="w-5 h-5 text-emerald-400" />
            Ergebnisse
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Gewonnen</CardTitle>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-400">{kpis.dealsWon}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Abgeschlossene Deals
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card border-red-500/30 bg-gradient-to-br from-red-500/10 to-transparent">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Verloren</CardTitle>
                <XCircle className="w-4 h-4 text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-400">{kpis.dealsLost}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Verlorene Deals
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Umsatz</CardTitle>
                <Euro className="w-4 h-4 text-amber-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-400">
                  {kpis.totalRevenue.toLocaleString("de-DE")} €
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Gesamtumsatz im Zeitraum
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ø Deal-Größe</CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {kpis.avgDealSize.toLocaleString("de-DE", { maximumFractionDigits: 0 })} €
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pro abgeschlossenem Deal
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default KPI;