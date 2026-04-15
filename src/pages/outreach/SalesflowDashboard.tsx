import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Megaphone, 
  Play, 
  Users, 
  Eye, 
  Flame, 
  Calendar,
  LayoutDashboard,
  MousePointer,
  ExternalLink,
  Clock,
  Sparkles,
  ArrowRight,
  X,
  Phone,
  Brain,
  Mail
} from "lucide-react";
import { formatDistanceToNow, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import TasksOverview from "@/components/outreach/TasksOverview";
import NeglectedLeadsPanel from "@/components/outreach/NeglectedLeadsPanel";
import LeadDetailPanel from "@/components/outreach/LeadDetailPanel";

interface LeadStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalLeads: number;
  pageViews: number;
  hotLeads: number;
  bookings: number;
}

interface TrackingEvent {
  id: string;
  contact_id: string;
  event_type: string;
  event_data: any;
  created_at: string;
  contact?: {
    first_name: string;
    last_name: string;
    company: string | null;
  };
}

interface Campaign {
  id: string;
  name: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { isStarterPlan, isProPlan, loading: featureLoading } = useFeatureAccess();
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(true);
  const [leadStats, setLeadStats] = useState<LeadStats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalLeads: 0,
    pageViews: 0,
    hotLeads: 0,
    bookings: 0,
  });
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"7" | "30">("30");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [showLeadPanel, setShowLeadPanel] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    fetchData();
  }, [dateRange, selectedCampaign]);

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from("campaigns")
      .select("id, name")
      .order("name");
    setCampaigns(data || []);
  };

  const fetchData = async () => {
    try {
      const daysAgo = subDays(new Date(), parseInt(dateRange));
      
      // Fetch campaigns
      const { data: allCampaigns } = await supabase.from("campaigns").select("id, status");
      const totalCampaigns = allCampaigns?.length || 0;
      const activeCampaigns = allCampaigns?.filter(c => c.status === "active").length || 0;

      // Build contacts query with optional campaign filter
      let contactsQuery = supabase.from("contacts").select("id", { count: "exact", head: true });
      if (selectedCampaign !== "all") {
        contactsQuery = contactsQuery.eq("campaign_id", selectedCampaign);
      }
      const { count: totalLeads } = await contactsQuery;

      // Fetch tracking stats for page views with date and campaign filter
      let trackingQuery = supabase
        .from("lead_tracking_events")
        .select("event_type, contact_id, created_at")
        .gte("created_at", daysAgo.toISOString());

      const { data: trackingEvents } = await trackingQuery;

      // If campaign filter, get contact IDs for that campaign
      let campaignContactIds: string[] = [];
      if (selectedCampaign !== "all") {
        const { data: campaignContacts } = await supabase
          .from("contacts")
          .select("id")
          .eq("campaign_id", selectedCampaign);
        campaignContactIds = (campaignContacts || []).map(c => c.id);
      }

      const filteredEvents = selectedCampaign === "all" 
        ? trackingEvents 
        : trackingEvents?.filter(e => campaignContactIds.includes(e.contact_id));

      const pageViews = filteredEvents?.filter(e => e.event_type === "page_view").length || 0;

      // Fetch REAL bookings: Deals moved to "Erstgespräch gelegt" in date range
      let dealsQuery = supabase
        .from("deals")
        .select("id, stage, updated_at, contact_id")
        .gte("updated_at", daysAgo.toISOString());
      
      const { data: allDeals } = await dealsQuery;
      
      // Filter by campaign if selected
      let filteredDeals = allDeals;
      if (selectedCampaign !== "all" && allDeals) {
        filteredDeals = allDeals.filter(d => campaignContactIds.includes(d.contact_id || ""));
      }
      
      const bookings = filteredDeals?.filter(d => (d.stage as string) === "Erstgespräch gelegt").length || 0;

      // Fetch hot leads (score >= 70) with campaign filter
      let hotLeadsQuery = supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .gte("lead_score", 70);
      
      if (selectedCampaign !== "all") {
        hotLeadsQuery = hotLeadsQuery.eq("campaign_id", selectedCampaign);
      }
      
      const { count: hotLeads } = await hotLeadsQuery;

      setLeadStats({
        totalCampaigns,
        activeCampaigns,
        totalLeads: totalLeads || 0,
        pageViews,
        hotLeads: hotLeads || 0,
        bookings: bookings || 0,
      });

      // Fetch recent events with campaign filter
      let recentEventsQuery = supabase
        .from("lead_tracking_events")
        .select("id, contact_id, event_type, event_data, created_at")
        .gte("created_at", daysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(8);

      const { data: recentEvents } = await recentEventsQuery;

      // Filter by campaign if needed
      const filteredRecentEvents = selectedCampaign === "all"
        ? recentEvents
        : recentEvents?.filter(e => campaignContactIds.includes(e.contact_id));

      const eventsWithContacts = await Promise.all(
        (filteredRecentEvents || []).map(async (event) => {
          const { data: contact } = await supabase
            .from("contacts")
            .select("first_name, last_name, company")
            .eq("id", event.contact_id)
            .single();
          return { ...event, contact: contact || undefined };
        })
      );

      setEvents(eventsWithContacts);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    const iconClass = "w-4 h-4";
    switch (eventType) {
      case "page_view":
        return <Eye className={`${iconClass} text-blue-400`} />;
      case "video_play":
      case "video_progress":
      case "video_complete":
        return <Play className={`${iconClass} text-green-400`} />;
      case "button_click":
      case "cta_click":
        return <MousePointer className={`${iconClass} text-amber-400`} />;
      case "booking_click":
        return <ExternalLink className={`${iconClass} text-purple-400`} />;
      case "time_on_page":
        return <Clock className={`${iconClass} text-cyan-400`} />;
      default:
        return <Eye className={`${iconClass} text-muted-foreground`} />;
    }
  };

  const getEventLabel = (event: TrackingEvent) => {
    const data = event.event_data || {};
    switch (event.event_type) {
      case "page_view":
        return "Landing Page besucht";
      case "video_play":
        return "Video gestartet";
      case "video_progress":
        return `Video ${data.progress || 0}% angesehen`;
      case "video_complete":
        return "Video 100% angesehen";
      case "button_click":
        return `Button geklickt`;
      case "cta_click":
        return "CTA-Button geklickt";
      case "booking_click":
        return "Booking-Seite geöffnet";
      case "time_on_page":
        return `${Math.round((data.seconds || 0) / 60)} Min. auf Seite`;
      default:
        return event.event_type;
    }
  };

  const getIconBgColor = (eventType: string) => {
    switch (eventType) {
      case "page_view":
        return "bg-blue-500/15";
      case "video_play":
      case "video_progress":
      case "video_complete":
        return "bg-green-500/15";
      case "button_click":
      case "cta_click":
        return "bg-amber-500/15";
      case "booking_click":
        return "bg-purple-500/15";
      case "time_on_page":
        return "bg-cyan-500/15";
      default:
        return "bg-muted";
    }
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-muted-foreground">Lädt Dashboard...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen noise-bg dotted-grid">
        <div className="max-w-7xl mx-auto p-1">
          {/* Pro Upgrade Banner for Starter Users */}
          {isStarterPlan && showUpgradeBanner && !featureLoading && (
            <div className="mb-6 relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-blue-500/10">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')]"></div>
              <button 
                onClick={() => setShowUpgradeBanner(false)}
                className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="relative p-5 flex items-center gap-6">
                <div className="hidden md:flex items-center gap-3 flex-shrink-0">
                  <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary md:hidden" />
                    Upgrade auf Pro für alle KI-Features
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      Power Dialer
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Brain className="h-3.5 w-3.5 text-primary" />
                      KI-Einwandbehandlung
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-primary" />
                      E-Mail Outreach
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Button 
                    onClick={() => navigate("/upgrade")}
                    className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                  >
                    Jetzt upgraden
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
                <p className="text-sm text-muted-foreground">Übersicht Ihrer Kampagnen und Leads</p>
              </div>
            </div>
            
            {/* Filters */}
            <div className="flex items-center gap-3">
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as "7" | "30")}>
                <SelectTrigger className="w-[140px] glass-card border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Letzte 7 Tage</SelectItem>
                  <SelectItem value="30">Letzte 30 Tage</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger className="w-[180px] glass-card border-white/10">
                  <SelectValue placeholder="Alle Kampagnen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kampagnen</SelectItem>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Left Side - Stats Cards */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-2 gap-4">
                {/* Kampagnen gesamt */}
                <div className="stat-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Kampagnen gesamt</p>
                      <p className="text-3xl font-bold text-foreground">{leadStats.totalCampaigns}</p>
                    </div>
                    <div className="icon-glow icon-glow-blue">
                      <Megaphone className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Kampagnen aktiv */}
                <div className="stat-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Kampagnen aktiv</p>
                      <p className="text-3xl font-bold text-foreground">{leadStats.activeCampaigns}</p>
                    </div>
                    <div className="icon-glow icon-glow-green">
                      <Play className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Leads gesamt */}
                <div className="stat-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Leads gesamt</p>
                      <p className="text-3xl font-bold text-foreground">{leadStats.totalLeads}</p>
                    </div>
                    <div className="icon-glow icon-glow-purple">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Landing Page Besuche */}
                <div className="stat-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Landing Page Besuche</p>
                      <p className="text-3xl font-bold text-foreground">{leadStats.pageViews}</p>
                    </div>
                    <div className="icon-glow icon-glow-cyan">
                      <Eye className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Heiße Leads - Highlighted */}
                <div className="stat-card stat-card-hot">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-orange-400/80 mb-2">Heiße Leads aktiv</p>
                      <p className="text-3xl font-bold text-orange-400">{leadStats.hotLeads}</p>
                    </div>
                    <div className="icon-glow icon-glow-orange animate-subtle-pulse">
                      <Flame className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Termine gebucht */}
                <div className="stat-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Termine gebucht</p>
                      <p className="text-3xl font-bold text-foreground">{leadStats.bookings}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">letzte {dateRange} Tage</p>
                    </div>
                    <div className="icon-glow icon-glow-blue">
                      <Calendar className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Engagement Feed */}
            <div className="lg:col-span-3 space-y-6">
              {/* Tasks and Neglected Leads Row */}
              <div className="grid md:grid-cols-2 gap-6">
                <TasksOverview 
                  onTaskClick={(taskId, relatedType, relatedId) => {
                    // Navigate to related entity if available
                    if (relatedType === 'deal' && relatedId) {
                      setSelectedDealId(relatedId);
                      setShowLeadPanel(true);
                    }
                  }} 
                />
                <NeglectedLeadsPanel 
                  onLeadClick={(dealId) => {
                    setSelectedDealId(dealId);
                    setShowLeadPanel(true);
                  }} 
                />
              </div>

              {/* Engagement Feed */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Engagement Feed</h2>
                    <p className="text-sm text-muted-foreground">Neueste Aktivitäten Ihrer Leads</p>
                  </div>
                </div>

                <div className="space-y-1">
                  {events.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">
                      Noch keine Aktivitäten
                    </p>
                  ) : (
                    events.map((event) => (
                      <div key={event.id} className="activity-item">
                        <div className={`activity-icon ${getIconBgColor(event.event_type)}`}>
                          {getEventIcon(event.event_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {event.contact
                              ? `${event.contact.first_name} ${event.contact.last_name}`
                              : "Unbekannter Besucher"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {event.contact?.company || "Unbekanntes Unternehmen"}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-foreground/80">{getEventLabel(event)}</p>
                          <p className="text-[10px] text-muted-foreground">
                            vor {formatDistanceToNow(new Date(event.created_at), {
                              locale: de,
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {events.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-border/50">
                    <Button 
                      variant="ghost" 
                      className="w-full text-muted-foreground hover:text-foreground hover:bg-white/5"
                    >
                      Mehr anzeigen
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Detail Panel */}
      {selectedDealId && (
        <LeadDetailPanel
          dealId={selectedDealId}
          open={showLeadPanel}
          onClose={() => {
            setShowLeadPanel(false);
            setSelectedDealId(null);
          }}
        />
      )}
    </>
  );
};

export default Dashboard;
