import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, Eye, MousePointer, Clock, Play, MoreVertical, Trash2, Edit, Workflow, BarChart3, GitCompare, ArrowLeft, X, Video, AlertTriangle, TrendingUp, Shield, Linkedin, UserPlus, Globe, Megaphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CampaignWorkflow } from "@/components/outreach/CampaignWorkflow";
import { CampaignStatistics } from "@/components/outreach/CampaignStatistics";
import { CampaignComparison } from "@/components/outreach/CampaignComparison";
import { CampaignLeadsTable } from "@/components/outreach/CampaignLeadsTable";
import { VideoWorkflowPanel } from "@/components/outreach/VideoWorkflowPanel";
import { ConnectionSuggestions } from "@/components/outreach/ConnectionSuggestions";
import { CampaignTeamMembers } from "@/components/outreach/CampaignTeamMembers";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  account_id: string | null;
  landing_page_id?: string | null;
  assigned_user_id?: string | null;
}

interface TeamMemberOption {
  id: string;
  name: string;
  email: string;
}

interface LandingPageOption {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface CampaignStats {
  totalLeads: number;
  pageViews: number;
  videoPlays: number;
  ctaClicks: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
}

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null);
  const [landingPages, setLandingPages] = useState<LandingPageOption[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    status: "draft",
    linkedin_profile_age: "",
    linkedin_currently_active: false,
    linkedin_was_banned: false,
    max_daily_connections: 15,
    max_daily_messages: 10,
    landing_page_id: "",
    pitch_video_url: "",
    assigned_user_id: "",
  });

  useEffect(() => {
    fetchCampaigns();
    fetchLandingPages();
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("account_id").eq("id", user.id).single();
      if (!profile?.account_id) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("account_id", profile.account_id)
        .order("name");
      setTeamMembers((data || []) as TeamMemberOption[]);
    } catch (err) {
      console.error("Error fetching team members:", err);
    }
  };

  const fetchLandingPages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("account_id").eq("id", user.id).single();
      if (!profile?.account_id) return;

      const { data } = await supabase
        .from("landing_pages")
        .select("id, name, slug, status")
        .eq("account_id", profile.account_id)
        .order("updated_at", { ascending: false });

      setLandingPages((data || []) as LandingPageOption[]);
    } catch (err) {
      console.error("Error fetching landing pages:", err);
    }
  };

  useEffect(() => {
    if (selectedCampaign) {
      fetchCampaignStats(selectedCampaign.id);
    }
  }, [selectedCampaign]);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error: any) {
      console.error("Error fetching campaigns:", error);
      toast.error("Fehler beim Laden der Kampagnen");
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignStats = async (campaignId: string) => {
    try {
      // Get leads in this campaign
      const { data: leads } = await supabase
        .from("contacts")
        .select("id, lead_score")
        .eq("campaign_id", campaignId);

      const leadIds = leads?.map((l) => l.id) || [];

      // Get tracking events for these leads
      const { data: events } = await supabase
        .from("lead_tracking_events")
        .select("event_type")
        .in("contact_id", leadIds.length > 0 ? leadIds : ["00000000-0000-0000-0000-000000000000"]);

      const pageViews = events?.filter((e) => e.event_type === "page_view").length || 0;
      const videoPlays = events?.filter((e) => e.event_type === "video_play" || e.event_type === "video_complete").length || 0;
      const ctaClicks = events?.filter((e) => e.event_type === "cta_click" || e.event_type === "button_click").length || 0;

      // Calculate lead temperature based on score
      const hotLeads = leads?.filter((l) => (l.lead_score || 0) >= 70).length || 0;
      const warmLeads = leads?.filter((l) => (l.lead_score || 0) >= 30 && (l.lead_score || 0) < 70).length || 0;
      const coldLeads = leads?.filter((l) => (l.lead_score || 0) < 30).length || 0;

      setCampaignStats({
        totalLeads: leads?.length || 0,
        pageViews,
        videoPlays,
        ctaClicks,
        hotLeads,
        warmLeads,
        coldLeads,
      });
    } catch (error) {
      console.error("Error fetching campaign stats:", error);
    }
  };

  const createCampaign = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("id", user.id)
        .single();

      const insertData: any = {
        name: newCampaign.name,
        description: newCampaign.description || null,
        status: newCampaign.status,
        account_id: profile?.account_id,
        linkedin_profile_age: newCampaign.linkedin_profile_age || null,
        linkedin_currently_active: newCampaign.linkedin_currently_active,
        linkedin_was_banned: newCampaign.linkedin_was_banned,
        max_daily_connections: newCampaign.max_daily_connections,
        max_daily_messages: newCampaign.max_daily_messages,
        pitch_video_url: newCampaign.pitch_video_url || null,
        assigned_user_id: newCampaign.assigned_user_id || null,
      };
      const { error } = await supabase.from("campaigns").insert(insertData);

      if (error) throw error;

      toast.success("Kampagne erstellt");
      setIsCreateDialogOpen(false);
      setNewCampaign({
        name: "",
        description: "",
        status: "draft",
        linkedin_profile_age: "",
        linkedin_currently_active: false,
        linkedin_was_banned: false,
        max_daily_connections: 15,
        max_daily_messages: 10,
        landing_page_id: "",
        pitch_video_url: "",
        assigned_user_id: "",
      });
      fetchCampaigns();
    } catch (error: any) {
      console.error("Error creating campaign:", error);
      toast.error("Fehler beim Erstellen der Kampagne");
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      // First detach contacts from this campaign so the FK doesn't block deletion
      await supabase.from("contacts").update({ campaign_id: null }).eq("campaign_id", id);
      // Also detach any deals linked via contacts of this campaign
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
      toast.success("Kampagne gelöscht");
      if (selectedCampaign?.id === id) {
        setSelectedCampaign(null);
      }
      fetchCampaigns();
    } catch (error: any) {
      console.error("Error deleting campaign:", error);
      toast.error("Fehler beim Löschen");
    }
  };

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<{
    id: string;
    name: string;
    description: string;
    pitch_video_url: string;
    landing_page_id: string;
    max_daily_connections: number;
    max_daily_messages: number;
    assigned_user_id: string;
  } | null>(null);

  const openEditDialog = (campaign: Campaign) => {
    setEditCampaign({
      id: campaign.id,
      name: campaign.name,
      description: campaign.description || "",
      pitch_video_url: (campaign as any).pitch_video_url || "",
      landing_page_id: (campaign as any).landing_page_id || "",
      max_daily_connections: (campaign as any).max_daily_connections || 15,
      max_daily_messages: (campaign as any).max_daily_messages || 10,
      assigned_user_id: (campaign as any).assigned_user_id || "",
    });
    setIsEditDialogOpen(true);
  };

  const saveEditCampaign = async () => {
    if (!editCampaign) return;
    try {
      const updateData: any = {
        name: editCampaign.name,
        description: editCampaign.description || null,
        pitch_video_url: editCampaign.pitch_video_url || null,
        max_daily_connections: editCampaign.max_daily_connections,
        max_daily_messages: editCampaign.max_daily_messages,
        assigned_user_id: editCampaign.assigned_user_id || null,
      };
      const { error } = await supabase.from("campaigns").update(updateData).eq("id", editCampaign.id);
      if (error) throw error;
      toast.success("Kampagne aktualisiert");
      setIsEditDialogOpen(false);
      setEditCampaign(null);
      fetchCampaigns();
      if (selectedCampaign?.id === editCampaign.id) {
        setSelectedCampaign({ ...selectedCampaign, name: editCampaign.name, description: editCampaign.description });
      }
    } catch (error: any) {
      console.error("Error updating campaign:", error);
      toast.error("Fehler beim Aktualisieren");
    }
  };

  const updateCampaignStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from("campaigns").update({ status }).eq("id", id);
      if (error) throw error;
      toast.success("Status aktualisiert");
      fetchCampaigns();
    } catch (error: any) {
      toast.error("Fehler beim Aktualisieren");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Entwurf", variant: "secondary" },
      active: { label: "Aktiv", variant: "default" },
      paused: { label: "Pausiert", variant: "outline" },
      completed: { label: "Abgeschlossen", variant: "destructive" },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const pieChartData = campaignStats ? [
    { name: "Hot", value: campaignStats.hotLeads, color: "#ef4444" },
    { name: "Warm", value: campaignStats.warmLeads, color: "#f59e0b" },
    { name: "Cold", value: campaignStats.coldLeads, color: "#3b82f6" },
  ].filter(d => d.value > 0) : [];

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Lädt Kampagnen...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-primary/5">
        <div className="max-w-7xl mx-auto">
          {/* Header - Mobile optimized */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-foreground">Kampagnen</h1>
              <p className="text-sm md:text-base text-muted-foreground">Verwalte deine Outreach-Kampagnen</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Neue Kampagne
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neue Kampagne erstellen</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 mt-4 max-h-[70vh] overflow-y-auto pr-2">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={newCampaign.name}
                        onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                        placeholder="z.B. Outreach November 2025"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Beschreibung</Label>
                      <Textarea
                        id="description"
                        value={newCampaign.description}
                        onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                        placeholder="Optional: Beschreibe die Kampagne"
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={newCampaign.status}
                        onValueChange={(value) => setNewCampaign({ ...newCampaign, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Entwurf</SelectItem>
                          <SelectItem value="active">Aktiv</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Lead Page verknüpfen
                      </Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Für jeden Lead wird automatisch eine personalisierte URL mit Tracking generiert
                      </p>
                      <Select
                        value={newCampaign.landing_page_id}
                        onValueChange={(value) => setNewCampaign({ ...newCampaign, landing_page_id: value === "none" ? "" : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Lead Page auswählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Keine Lead Page</SelectItem>
                          {landingPages.map((lp) => (
                            <SelectItem key={lp.id} value={lp.id}>
                              {lp.name} {lp.status === "published" ? "✓" : "(Entwurf)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {landingPages.length === 0 && (
                        <p className="text-xs text-amber-500 mt-1">
                          Noch keine Lead Pages vorhanden. Erstelle zuerst eine unter "Lead Pages".
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Pitch Video URL */}
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Video className="w-5 h-5 text-primary" />
                      <h4 className="font-medium">Pitch Video</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      YouTube, Vimeo oder Loom Link — wird automatisch auf der Lead Page eingebettet und Video-Views getrackt
                    </p>
                    <Input
                      placeholder="https://youtube.com/watch?v=... oder https://vimeo.com/..."
                      value={newCampaign.pitch_video_url}
                      onChange={(e) => setNewCampaign({ ...newCampaign, pitch_video_url: e.target.value })}
                    />
                  </div>

                  {/* LinkedIn Profile Assessment */}
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Linkedin className="w-5 h-5 text-primary" />
                      <h4 className="font-medium">LinkedIn-Profil Bewertung</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Diese Informationen helfen uns, sichere Limit-Empfehlungen zu berechnen.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <Label>Wie alt ist dein LinkedIn-Profil?</Label>
                        <Select
                          value={newCampaign.linkedin_profile_age}
                          onValueChange={(value) => setNewCampaign({ ...newCampaign, linkedin_profile_age: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Wähle aus..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="under_6_months">Unter 6 Monate</SelectItem>
                            <SelectItem value="6_to_12_months">6-12 Monate</SelectItem>
                            <SelectItem value="1_to_2_years">1-2 Jahre</SelectItem>
                            <SelectItem value="2_to_5_years">2-5 Jahre</SelectItem>
                            <SelectItem value="over_5_years">Über 5 Jahre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium">Sendest du aktuell viele Vernetzungsanfragen?</Label>
                          <p className="text-xs text-muted-foreground">
                            Mehr als 10 pro Tag in den letzten Wochen
                          </p>
                        </div>
                        <Switch
                          checked={newCampaign.linkedin_currently_active}
                          onCheckedChange={(checked) => setNewCampaign({ ...newCampaign, linkedin_currently_active: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <Shield className="w-4 h-4 text-amber-500" />
                            Wurdest du schon mal von LinkedIn gesperrt?
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Account-Sperrung oder Einschränkungen in der Vergangenheit
                          </p>
                        </div>
                        <Switch
                          checked={newCampaign.linkedin_was_banned}
                          onCheckedChange={(checked) => setNewCampaign({ ...newCampaign, linkedin_was_banned: checked })}
                        />
                      </div>
                    </div>

                    {newCampaign.linkedin_was_banned && (
                      <Alert className="mt-4 bg-amber-500/10 border-amber-500/30">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <AlertDescription className="text-sm">
                          Bei vorherigen Sperrungen empfehlen wir konservativere Limits. Starte langsam und steigere schrittweise.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {/* Daily Limits */}
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <h4 className="font-medium">Tägliche Limits</h4>
                    </div>

                    <Alert className="mb-4 bg-primary/5 border-primary/20">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <AlertDescription className="text-sm">
                        <strong>Tipp:</strong> Bei einer Annahmequote von 50%+ kannst du die Vernetzungen wöchentlich um 5 erhöhen.
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="max_connections">Max. Vernetzungen/Tag</Label>
                        <Input
                          id="max_connections"
                          type="number"
                          min={5}
                          max={50}
                          value={newCampaign.max_daily_connections}
                          onChange={(e) => setNewCampaign({ ...newCampaign, max_daily_connections: parseInt(e.target.value) || 15 })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Empfohlen: 15</p>
                      </div>
                      <div>
                        <Label htmlFor="max_messages">Max. Erstnachrichten/Tag</Label>
                        <Input
                          id="max_messages"
                          type="number"
                          min={5}
                          max={30}
                          value={newCampaign.max_daily_messages}
                          onChange={(e) => setNewCampaign({ ...newCampaign, max_daily_messages: parseInt(e.target.value) || 10 })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Empfohlen: 10</p>
                      </div>
                    </div>

                    {/* Dynamic recommendation based on profile */}
                    {newCampaign.linkedin_profile_age && (
                      <div className="mt-4 p-3 rounded-lg bg-muted/50">
                        <p className="text-sm font-medium mb-2">📊 Empfehlung basierend auf deinem Profil:</p>
                        <p className="text-sm text-muted-foreground">
                          {newCampaign.linkedin_was_banned ? (
                            "Starte mit max. 10 Vernetzungen/Tag wegen vorheriger Sperrung. Steigere nach 2 Wochen ohne Probleme."
                          ) : newCampaign.linkedin_profile_age === "under_6_months" ? (
                            "Neues Profil: Starte mit 10-12 Vernetzungen/Tag. Steigere langsam."
                          ) : newCampaign.linkedin_profile_age === "6_to_12_months" ? (
                            "Profil im Aufbau: 12-15 Vernetzungen/Tag sind sicher."
                          ) : newCampaign.linkedin_profile_age === "1_to_2_years" ? (
                            "Etabliertes Profil: 15-20 Vernetzungen/Tag möglich."
                          ) : (
                            "Langjähriges Profil: 20-25 Vernetzungen/Tag bei guter Annahmequote möglich."
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Team Member Assignment */}
                  {teamMembers.length > 1 && (
                    <div className="border-t border-border pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-primary" />
                        <h4 className="font-medium">Zuständiges Teammitglied</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Wer soll bei heißen Leads aus dieser Kampagne benachrichtigt werden?
                      </p>
                      <Select
                        value={newCampaign.assigned_user_id}
                        onValueChange={(value) => setNewCampaign({ ...newCampaign, assigned_user_id: value === "none" ? "" : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Teammitglied auswählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Kein bestimmtes Mitglied (Admin)</SelectItem>
                          {teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name} ({member.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button onClick={createCampaign} disabled={!newCampaign.name} className="w-full">
                    Kampagne erstellen
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs defaultValue="campaigns" className="space-y-4 md:space-y-6">
            <TabsList className="w-full md:w-auto">
              <TabsTrigger value="campaigns" className="flex-1 md:flex-none">Kampagnen</TabsTrigger>
              <TabsTrigger value="comparison" className="flex items-center gap-1 flex-1 md:flex-none">
                <GitCompare className="h-4 w-4" />
                <span className="hidden sm:inline">Vergleich</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="campaigns">
              {selectedCampaign ? (
                // Full-width campaign detail view
                <div className="space-y-6">
                  {/* Header with back button */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCampaign(null)}
                        className="flex items-center gap-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Zurück zur Übersicht
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedCampaign(null)}
                      className="h-8 w-8"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Campaign Card */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl">{selectedCampaign.name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Leads dieser Kampagne • Erstellt am {new Date(selectedCampaign.created_at).toLocaleDateString("de-DE")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(selectedCampaign.status)}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(selectedCampaign)}>
                                <Edit className="w-4 h-4 mr-2" /> Bearbeiten
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateCampaignStatus(selectedCampaign.id, "active")}>
                                <Play className="w-4 h-4 mr-2" /> Aktivieren
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateCampaignStatus(selectedCampaign.id, "paused")}>
                                <Clock className="w-4 h-4 mr-2" /> Pausieren
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  deleteCampaign(selectedCampaign.id);
                                  setSelectedCampaign(null);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Löschen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="suggestions">
                        <TabsList className="flex-wrap">
                          <TabsTrigger value="suggestions" className="flex items-center gap-1">
                            <UserPlus className="h-4 w-4" />
                            Vernetzung
                          </TabsTrigger>
                          <TabsTrigger value="leads" className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            Leads
                          </TabsTrigger>
                          <TabsTrigger value="workflow" className="flex items-center gap-1">
                            <Workflow className="h-4 w-4" />
                            Daily Workflow
                          </TabsTrigger>
                          <TabsTrigger value="statistics" className="flex items-center gap-1">
                            <BarChart3 className="h-4 w-4" />
                            Statistiken
                          </TabsTrigger>
                          <TabsTrigger value="video-workflow" className="flex items-center gap-1">
                            <Video className="h-4 w-4" />
                            Video-Workflow
                          </TabsTrigger>
                          <TabsTrigger value="team" className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            Team
                          </TabsTrigger>
                          <TabsTrigger value="overview">Übersicht</TabsTrigger>
                          <TabsTrigger value="tracking">Tracking</TabsTrigger>
                        </TabsList>

                        <TabsContent value="suggestions" className="mt-6">
                          <ConnectionSuggestions 
                            campaignId={selectedCampaign.id} 
                            campaignName={selectedCampaign.name} 
                          />
                        </TabsContent>

                        <TabsContent value="leads" className="mt-6">
                          <CampaignLeadsTable 
                            campaignId={selectedCampaign.id} 
                            campaignName={selectedCampaign.name} 
                          />
                        </TabsContent>

                        <TabsContent value="workflow" className="mt-6">
                          <CampaignWorkflow 
                            campaignId={selectedCampaign.id} 
                            campaignName={selectedCampaign.name} 
                          />
                        </TabsContent>

                        <TabsContent value="statistics" className="mt-6">
                          <CampaignStatistics 
                            campaignId={selectedCampaign.id} 
                            campaignName={selectedCampaign.name} 
                          />
                        </TabsContent>

                        <TabsContent value="video-workflow" className="mt-6">
                          <VideoWorkflowPanel 
                            campaignId={selectedCampaign.id} 
                            campaignName={selectedCampaign.name} 
                          />
                        </TabsContent>

                        <TabsContent value="team" className="mt-6">
                          <CampaignTeamMembers
                            campaignId={selectedCampaign.id}
                            campaignName={selectedCampaign.name}
                          />
                        </TabsContent>


                        <TabsContent value="overview" className="mt-6">
                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-muted/50 rounded-lg p-4">
                              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Users className="w-4 h-4" />
                                <span className="text-xs">Leads</span>
                              </div>
                              <p className="text-2xl font-bold">{campaignStats?.totalLeads || 0}</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-4">
                              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Eye className="w-4 h-4" />
                                <span className="text-xs">Seitenaufrufe</span>
                              </div>
                              <p className="text-2xl font-bold">{campaignStats?.pageViews || 0}</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-4">
                              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Play className="w-4 h-4" />
                                <span className="text-xs">Videos</span>
                              </div>
                              <p className="text-2xl font-bold">{campaignStats?.videoPlays || 0}</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-4">
                              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <MousePointer className="w-4 h-4" />
                                <span className="text-xs">CTA Klicks</span>
                              </div>
                              <p className="text-2xl font-bold">{campaignStats?.ctaClicks || 0}</p>
                            </div>
                          </div>

                          {/* Pie Chart */}
                          <div className="bg-muted/30 rounded-lg p-6">
                            <h3 className="font-medium mb-4">Lead-Verteilung</h3>
                            {pieChartData.length > 0 ? (
                              <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={pieChartData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={60}
                                      outerRadius={80}
                                      paddingAngle={5}
                                      dataKey="value"
                                      label={({ name, value }) => `${name}: ${value}`}
                                    >
                                      {pieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-center py-8">
                                Noch keine Leads in dieser Kampagne
                              </p>
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="tracking" className="mt-6">
                          <div className="space-y-4">
                            <div className="bg-muted/30 rounded-lg p-6">
                              <h3 className="font-medium mb-4">Tracking-Übersicht</h3>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Seitenaufrufe</span>
                                  <span className="font-medium">{campaignStats?.pageViews || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Video gestartet</span>
                                  <span className="font-medium">{campaignStats?.videoPlays || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">CTA-Klicks</span>
                                  <span className="font-medium">{campaignStats?.ctaClicks || 0}</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Detaillierte Tracking-Events werden automatisch erfasst, wenn Leads deine personalisierten Seiten besuchen.
                            </p>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                // Campaign list view
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {campaigns.length === 0 ? (
                    <Card className="bg-card border-border col-span-full">
                      <CardContent className="p-12 text-center">
                        <Megaphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                        <h3 className="text-lg font-semibold mb-2">Starte deine erste Kampagne</h3>
                        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                          Erstelle eine Outreach-Kampagne, importiere Leads und sende personalisierte LinkedIn-Nachrichten mit Tracking.
                        </p>
                        <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                          <span>1. Kampagne erstellen + Lead Page verknüpfen</span>
                          <span>2. Leads importieren (CSV)</span>
                          <span>3. LinkedIn-Nachrichten kopieren & senden</span>
                          <span>4. Echtzeit-Alerts wenn Leads klicken</span>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    campaigns.map((campaign) => (
                      <Card
                        key={campaign.id}
                        className="bg-card border-border cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg"
                        onClick={() => setSelectedCampaign(campaign)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-foreground">{campaign.name}</h3>
                              {campaign.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {campaign.description}
                                </p>
                              )}
                              <div className="mt-2">{getStatusBadge(campaign.status)}</div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(campaign)}>
                                  <Edit className="w-4 h-4 mr-2" /> Bearbeiten
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateCampaignStatus(campaign.id, "active")}>
                                  <Play className="w-4 h-4 mr-2" /> Aktivieren
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateCampaignStatus(campaign.id, "paused")}>
                                  <Clock className="w-4 h-4 mr-2" /> Pausieren
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => deleteCampaign(campaign.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Löschen
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="comparison">
              <CampaignComparison />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Campaign Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kampagne bearbeiten</DialogTitle>
          </DialogHeader>
          {editCampaign && (
            <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <Label>Name</Label>
                <Input
                  value={editCampaign.name}
                  onChange={(e) => setEditCampaign({ ...editCampaign, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Beschreibung</Label>
                <Textarea
                  value={editCampaign.description}
                  onChange={(e) => setEditCampaign({ ...editCampaign, description: e.target.value })}
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Video className="w-4 h-4" /> Pitch Video URL
                </Label>
                <Input
                  placeholder="https://youtube.com/watch?v=..."
                  value={editCampaign.pitch_video_url}
                  onChange={(e) => setEditCampaign({ ...editCampaign, pitch_video_url: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max. Vernetzungen/Tag</Label>
                  <Input
                    type="number"
                    min={5}
                    max={50}
                    value={editCampaign.max_daily_connections}
                    onChange={(e) => setEditCampaign({ ...editCampaign, max_daily_connections: parseInt(e.target.value) || 15 })}
                  />
                </div>
                <div>
                  <Label>Max. Nachrichten/Tag</Label>
                  <Input
                    type="number"
                    min={5}
                    max={30}
                    value={editCampaign.max_daily_messages}
                    onChange={(e) => setEditCampaign({ ...editCampaign, max_daily_messages: parseInt(e.target.value) || 10 })}
                  />
                </div>
              </div>
              {teamMembers.length > 1 && (
                <div>
                  <Label className="flex items-center gap-2">
                    <Users className="w-4 h-4" /> Zuständiges Teammitglied
                  </Label>
                  <Select
                    value={editCampaign.assigned_user_id}
                    onValueChange={(value) => setEditCampaign({ ...editCampaign, assigned_user_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Teammitglied auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Kein bestimmtes Mitglied (Admin)</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} ({member.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={saveEditCampaign} disabled={!editCampaign.name} className="w-full">
                Speichern
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Campaigns;
