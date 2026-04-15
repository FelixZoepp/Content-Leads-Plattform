import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { format, subDays, parseISO, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { 
  Video, 
  Play, 
  Eye, 
  ExternalLink, 
  Copy, 
  Check, 
  Upload,
  Settings,
  Users,
  Link2,
  Pencil,
  Save,
  X,
  BarChart3,
  Clock,
  MousePointerClick,
  TrendingUp,
  Loader2,
  Calendar
} from "lucide-react";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  slug: string | null;
  video_url: string | null;
  intro_video_url: string | null;
  view_count: number | null;
  viewed_at: string | null;
  video_status: string | null;
  campaign_id: string | null;
}

interface Campaign {
  id: string;
  name: string;
  pitch_video_url: string | null;
}

interface TrackingEvent {
  event_type: string;
  event_data: Record<string, unknown> | null;
  created_at: string;
}

interface CampaignAnalytics {
  totalViews: number;
  videoPlays: number;
  videoCompletions: number;
  avgWatchTime: number;
  ctaClicks: number;
  bookingClicks: number;
  avgScrollDepth: number;
  conversionRate: number;
  videoPlayRate: number;
}

const VideoNoteAdmin = () => {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pitchVideoInputRef = useRef<HTMLInputElement>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("campaigns");
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [pitchVideoUrl, setPitchVideoUrl] = useState("");
  const [isUploadingPitch, setIsUploadingPitch] = useState(false);

  // Fetch user's account_id
  const { data: profile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', session.user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  // Fetch campaigns
  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns', profile?.account_id],
    queryFn: async () => {
      if (!profile?.account_id) return [];
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, pitch_video_url')
        .eq('account_id', profile.account_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!profile?.account_id,
  });

  // Fetch contacts with video slugs
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['video-contacts', profile?.account_id, selectedCampaign],
    queryFn: async () => {
      if (!profile?.account_id) return [];
      let query = supabase
        .from('contacts')
        .select('id, first_name, last_name, company, slug, video_url, intro_video_url, view_count, viewed_at, video_status, campaign_id')
        .eq('account_id', profile.account_id)
        .not('slug', 'is', null)
        .order('created_at', { ascending: false });
      
      if (selectedCampaign) {
        query = query.eq('campaign_id', selectedCampaign);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!profile?.account_id,
  });

  // Fetch tracking events for analytics
  const { data: trackingEvents = [] } = useQuery({
    queryKey: ['tracking-events', profile?.account_id, selectedCampaign],
    queryFn: async () => {
      if (!profile?.account_id) return [];
      
      // Get contact IDs for the selected campaign or all
      const contactIds = contacts.map(c => c.id);
      if (contactIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('lead_tracking_events')
        .select('event_type, event_data, created_at, contact_id')
        .in('contact_id', contactIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as (TrackingEvent & { contact_id: string })[];
    },
    enabled: !!profile?.account_id && contacts.length > 0,
  });

  // Calculate analytics from tracking events
  const analytics: CampaignAnalytics = (() => {
    if (trackingEvents.length === 0) {
      return {
        totalViews: 0,
        videoPlays: 0,
        videoCompletions: 0,
        avgWatchTime: 0,
        ctaClicks: 0,
        bookingClicks: 0,
        avgScrollDepth: 0,
        conversionRate: 0,
        videoPlayRate: 0,
      };
    }

    const pageViews = trackingEvents.filter(e => e.event_type === 'page_view').length;
    const videoPlays = trackingEvents.filter(e => e.event_type === 'video_play').length;
    const videoCompletes = trackingEvents.filter(e => e.event_type === 'video_complete').length;
    const ctaClicks = trackingEvents.filter(e => e.event_type === 'cta_click').length;
    const bookingClicks = trackingEvents.filter(e => e.event_type === 'booking_click').length;
    
    // Calculate average watch time from time_on_page events
    const timeEvents = trackingEvents.filter(e => e.event_type === 'time_on_page');
    const avgWatchTime = timeEvents.length > 0
      ? timeEvents.reduce((sum, e) => sum + (Number(e.event_data?.seconds) || 0), 0) / timeEvents.length
      : 0;
    
    // Calculate average scroll depth
    const scrollEvents = trackingEvents.filter(e => e.event_type === 'scroll_depth');
    const avgScrollDepth = scrollEvents.length > 0
      ? scrollEvents.reduce((sum, e) => sum + (Number(e.event_data?.depth) || 0), 0) / scrollEvents.length
      : 0;
    
    // Conversion rate = booking clicks / page views
    const conversionRate = pageViews > 0 ? (bookingClicks / pageViews) * 100 : 0;
    
    // Video Play Rate = video plays / page views
    const videoPlayRate = pageViews > 0 ? (videoPlays / pageViews) * 100 : 0;

    return {
      totalViews: pageViews,
      videoPlays,
      videoCompletions: videoCompletes,
      avgWatchTime: Math.round(avgWatchTime),
      ctaClicks,
      bookingClicks,
      avgScrollDepth: Math.round(avgScrollDepth),
      conversionRate: Math.round(conversionRate * 10) / 10,
      videoPlayRate: Math.round(videoPlayRate * 10) / 10,
    };
  })();

  // Generate time-series data for charts (last 14 days)
  const timeSeriesData = useMemo(() => {
    const days = 14;
    const data: { date: string; label: string; views: number; videoPlays: number; ctaClicks: number; bookings: number }[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const label = format(date, 'dd. MMM', { locale: de });
      
      const dayEvents = trackingEvents.filter(e => {
        const eventDate = format(parseISO(e.created_at), 'yyyy-MM-dd');
        return eventDate === dateStr;
      });
      
      data.push({
        date: dateStr,
        label,
        views: dayEvents.filter(e => e.event_type === 'page_view').length,
        videoPlays: dayEvents.filter(e => e.event_type === 'video_play').length,
        ctaClicks: dayEvents.filter(e => e.event_type === 'cta_click').length,
        bookings: dayEvents.filter(e => e.event_type === 'booking_click').length,
      });
    }
    
    return data;
  }, [trackingEvents]);

  // Event breakdown for bar chart
  const eventBreakdownData = useMemo(() => {
    return [
      { name: 'Seitenaufrufe', value: analytics.totalViews, fill: '#6366f1' },
      { name: 'Video-Plays', value: analytics.videoPlays, fill: '#10b981' },
      { name: 'Video beendet', value: analytics.videoCompletions, fill: '#8b5cf6' },
      { name: 'CTA-Klicks', value: analytics.ctaClicks, fill: '#f59e0b' },
      { name: 'Termin-Klicks', value: analytics.bookingClicks, fill: '#ec4899' },
    ];
  }, [analytics]);


  const updateVideoMutation = useMutation({
    mutationFn: async ({ contactId, videoUrl }: { contactId: string; videoUrl: string }) => {
      const { error } = await supabase
        .from('contacts')
        .update({ video_url: videoUrl, video_status: 'ready' })
        .eq('id', contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-contacts'] });
      toast.success("Video-URL aktualisiert");
      setEditingVideo(false);
    },
    onError: (error) => {
      toast.error("Fehler beim Speichern: " + error.message);
    },
  });

  // Update campaign pitch video mutation
  const updateCampaignPitchMutation = useMutation({
    mutationFn: async ({ campaignId, pitchVideoUrl }: { campaignId: string; pitchVideoUrl: string }) => {
      const { error } = await supabase
        .from('campaigns')
        .update({ pitch_video_url: pitchVideoUrl })
        .eq('id', campaignId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success("Pitch-Video aktualisiert");
      setEditingCampaignId(null);
      setPitchVideoUrl("");
    },
    onError: (error) => {
      toast.error("Fehler beim Speichern: " + error.message);
    },
  });

  // Pitch video upload handler
  const handlePitchVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>, campaignId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error("Bitte wähle eine Video-Datei aus");
      return;
    }

    const maxSize = 500 * 1024 * 1024; // 500MB for pitch videos
    if (file.size > maxSize) {
      toast.error("Video ist zu groß (max. 500MB)");
      return;
    }

    setIsUploadingPitch(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `pitch-${campaignId}-${Date.now()}.${fileExt}`;
      const filePath = `campaign-pitch-videos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('personalized-videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('personalized-videos')
        .getPublicUrl(filePath);

      await updateCampaignPitchMutation.mutateAsync({
        campaignId,
        pitchVideoUrl: urlData.publicUrl,
      });

      toast.success("Pitch-Video erfolgreich hochgeladen!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast.error("Upload fehlgeschlagen: " + errorMessage);
    } finally {
      setIsUploadingPitch(false);
      if (pitchVideoInputRef.current) {
        pitchVideoInputRef.current.value = '';
      }
    }
  };

  // Get lead count per campaign
  const getLeadCountForCampaign = (campaignId: string) => {
    return contacts.filter(c => c.campaign_id === campaignId).length;
  };

  // Video upload handler
  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedContact) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error("Bitte wähle eine Video-Datei aus");
      return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Video ist zu groß (max. 100MB)");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedContact.id}-${Date.now()}.${fileExt}`;
      const filePath = `contact-videos/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('personalized-videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('personalized-videos')
        .getPublicUrl(filePath);

      // Update contact with new video URL
      await updateVideoMutation.mutateAsync({
        contactId: selectedContact.id,
        videoUrl: urlData.publicUrl,
      });

      setUploadProgress(100);
      toast.success("Video erfolgreich hochgeladen!");
      
      // Update selected contact state
      setSelectedContact(prev => prev ? { ...prev, video_url: urlData.publicUrl } : null);
      setVideoUrl(urlData.publicUrl);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast.error("Upload fehlgeschlagen: " + errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const copyToClipboard = async (slug: string) => {
    const url = `${window.location.origin}/p/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    toast.success("Link kopiert!");
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const openPreview = (slug: string) => {
    window.open(`/p/${slug}`, '_blank');
  };

  useEffect(() => {
    if (selectedContact) {
      setVideoUrl(selectedContact.video_url || "");
    }
  }, [selectedContact]);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Bereit</Badge>;
      case 'generating':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Wird generiert...</Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Fehler</Badge>;
      default:
        return <Badge className="bg-muted/50 text-muted-foreground border-muted">Ausstehend</Badge>;
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2 md:gap-3">
              <Video className="w-5 h-5 md:w-7 md:h-7 text-primary" />
              Video-Nachrichten
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1 hidden md:block">
              Verwalte und bearbeite personalisierte Video-Seiten für deine Leads
            </p>
          </div>
        </div>

        {/* Campaign Filter - Apple Liquid Glass Style - Horizontal scroll on mobile */}
        <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap scrollbar-hide">
          <button
            onClick={() => setSelectedCampaign(null)}
            className={`shrink-0 px-3 md:px-4 py-2 md:py-2.5 rounded-xl md:rounded-2xl text-xs md:text-sm font-medium transition-all duration-300 ${
              selectedCampaign === null
                ? 'bg-primary/20 text-primary border border-primary/40 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] backdrop-blur-xl'
                : 'bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-xl'
            }`}
          >
            Alle
          </button>
          {campaigns.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCampaign(c.id)}
              className={`shrink-0 px-3 md:px-4 py-2 md:py-2.5 rounded-xl md:rounded-2xl text-xs md:text-sm font-medium transition-all duration-300 flex items-center gap-1.5 md:gap-2 ${
                selectedCampaign === c.id
                  ? 'bg-primary/20 text-primary border border-primary/40 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] backdrop-blur-xl'
                  : 'bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-xl'
              }`}
            >
              <Video className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="truncate max-w-[100px] md:max-w-none">{c.name}</span>
              {c.pitch_video_url && (
                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-400 shrink-0" />
              )}
            </button>
          ))}
        </div>

        {/* Main Tabs - Removed leads tab */}
        <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="campaigns">
          <TabsList className="w-full md:w-auto overflow-x-auto flex-nowrap">
            <TabsTrigger value="campaigns" className="gap-1.5 md:gap-2 text-xs md:text-sm flex-1 md:flex-none">
              <Video className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Kampagnen &</span> Pitch
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 md:gap-2 text-xs md:text-sm flex-1 md:flex-none">
              <BarChart3 className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Campaign List */}
              <Card className="glass-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Video className="w-5 h-5 text-primary" />
                    Kampagnen-Übersicht
                  </CardTitle>
                  <CardDescription>
                    Verwalte das zentrale Pitch-Video für jede Kampagne. Alle Leads einer Kampagne erhalten automatisch das gleiche Pitch-Video nach dem personalisierten Intro.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {campaigns.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Keine Kampagnen gefunden</p>
                      <p className="text-sm mt-1">Erstelle eine Kampagne unter "Kampagnen"</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {campaigns.map((campaign) => (
                        <div
                          key={campaign.id}
                          className={`p-4 rounded-xl border transition-all ${
                            editingCampaignId === campaign.id
                              ? 'bg-primary/10 border-primary/30'
                              : 'bg-muted/20 border-border hover:bg-muted/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground">{campaign.name}</h3>
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  {getLeadCountForCampaign(campaign.id)} Leads
                                </span>
                                {campaign.pitch_video_url ? (
                                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                    <Check className="w-3 h-3 mr-1" />
                                    Pitch-Video vorhanden
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                    Kein Pitch-Video
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingCampaignId(editingCampaignId === campaign.id ? null : campaign.id);
                                setPitchVideoUrl(campaign.pitch_video_url || "");
                              }}
                            >
                              {editingCampaignId === campaign.id ? (
                                <>
                                  <X className="w-4 h-4 mr-1" />
                                  Schließen
                                </>
                              ) : (
                                <>
                                  <Pencil className="w-4 h-4 mr-1" />
                                  Bearbeiten
                                </>
                              )}
                            </Button>
                          </div>

                          {/* Expanded Edit Section */}
                          {editingCampaignId === campaign.id && (
                            <div className="mt-4 pt-4 border-t border-border space-y-4">
                              {/* Current Pitch Video Preview */}
                              {campaign.pitch_video_url && (
                                <div>
                                  <Label className="text-sm text-muted-foreground mb-2 block">
                                    Aktuelles Pitch-Video
                                  </Label>
                                  <video
                                    src={campaign.pitch_video_url}
                                    controls
                                    className="w-full max-h-48 rounded-lg bg-black"
                                  />
                                </div>
                              )}

                              {/* Upload New Video */}
                              <div>
                                <Label className="text-sm text-muted-foreground mb-2 block">
                                  Neues Pitch-Video hochladen
                                </Label>
                                <div className="flex gap-2">
                                  <input
                                    ref={pitchVideoInputRef}
                                    type="file"
                                    accept="video/*"
                                    className="hidden"
                                    onChange={(e) => handlePitchVideoUpload(e, campaign.id)}
                                  />
                                  <Button
                                    variant="outline"
                                    onClick={() => pitchVideoInputRef.current?.click()}
                                    disabled={isUploadingPitch}
                                    className="gap-2"
                                  >
                                    {isUploadingPitch ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Upload className="w-4 h-4" />
                                    )}
                                    Video hochladen
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Max. 500MB (empfohlen: MP4, 1080p)
                                </p>
                              </div>

                              {/* Or enter URL manually */}
                              <div>
                                <Label className="text-sm text-muted-foreground mb-2 block">
                                  Oder Video-URL eingeben
                                </Label>
                                <div className="flex gap-2">
                                  <Input
                                    value={pitchVideoUrl}
                                    onChange={(e) => setPitchVideoUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="bg-background/50"
                                  />
                                  <Button
                                    onClick={() => {
                                      updateCampaignPitchMutation.mutate({
                                        campaignId: campaign.id,
                                        pitchVideoUrl: pitchVideoUrl,
                                      });
                                    }}
                                    disabled={updateCampaignPitchMutation.isPending || !pitchVideoUrl}
                                    className="gap-2"
                                  >
                                    {updateCampaignPitchMutation.isPending ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Save className="w-4 h-4" />
                                    )}
                                    Speichern
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className="glass-card border-border h-fit">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Play className="w-5 h-5 text-primary" />
                    Video-Ablauf für Leads
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Personalisiertes Intro (6 Sek.)</h4>
                      <p className="text-sm text-muted-foreground">
                        Individuell für jeden Lead generiert via Repliq/Make.com
                      </p>
                    </div>
                  </div>
                  <div className="w-px h-4 bg-border ml-4" />
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-emerald-400">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Pitch-Video (Kampagne)</h4>
                      <p className="text-sm text-muted-foreground">
                        Das gleiche Video für alle Leads der Kampagne – zentral hier verwaltet
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-muted/20 rounded-lg border border-border">
                    <h4 className="font-medium text-foreground mb-2">💡 Tipp</h4>
                    <p className="text-sm text-muted-foreground">
                      Das Intro-Video für jeden Lead wird automatisch über Make.com generiert und per API hier gespeichert. Du musst hier nur das zentrale Pitch-Video pflegen.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6 space-y-6">
            {/* Analytics Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="glass-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Eye className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Seitenaufrufe</p>
                      <p className="text-2xl font-bold text-foreground">{analytics.totalViews}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <Play className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Video-Plays</p>
                      <p className="text-2xl font-bold text-foreground">{analytics.videoPlays}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-border border-2 border-cyan-500/30 bg-cyan-500/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/20">
                      <TrendingUp className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Video-Play-Rate</p>
                      <p className="text-2xl font-bold text-cyan-400">{analytics.videoPlayRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <Clock className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ø Verweildauer</p>
                      <p className="text-2xl font-bold text-foreground">{formatTime(analytics.avgWatchTime)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <MousePointerClick className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Termin-Klicks</p>
                      <p className="text-2xl font-bold text-foreground">{analytics.bookingClicks}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Video Play Rate Comparison Card */}
            <Card className="glass-card border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  Page Views vs. Video Plays
                </CardTitle>
                <CardDescription>
                  Wie viele Besucher klicken aktiv auf das Video?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Visual comparison bars */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Eye className="w-4 h-4 text-primary" />
                          Seitenaufrufe
                        </span>
                        <span className="font-bold text-foreground">{analytics.totalViews}</span>
                      </div>
                      <div className="w-full bg-muted/30 rounded-full h-4 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all"
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Play className="w-4 h-4 text-emerald-400" />
                          Video-Plays
                        </span>
                        <span className="font-bold text-foreground">{analytics.videoPlays}</span>
                      </div>
                      <div className="w-full bg-muted/30 rounded-full h-4 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                          style={{ width: `${analytics.videoPlayRate}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Video-Play-Rate</span>
                        <span className={`text-lg font-bold ${
                          analytics.videoPlayRate >= 50 ? 'text-emerald-400' : 
                          analytics.videoPlayRate >= 30 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {analytics.videoPlayRate}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {analytics.videoPlayRate >= 50 ? '🎉 Exzellent! Die meisten Besucher schauen das Video.' :
                         analytics.videoPlayRate >= 30 ? '👍 Gut! Es gibt noch Potenzial zur Verbesserung.' :
                         '⚠️ Verbesserungspotenzial: Video-Thumbnail oder Platzierung optimieren.'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Funnel visualization */}
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/30">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">{analytics.totalViews}</p>
                          <p className="text-xs text-muted-foreground">Views</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl text-muted-foreground">↓</div>
                    <div className="text-center px-3 py-1 bg-cyan-500/10 rounded-full border border-cyan-500/30">
                      <span className="text-sm font-medium text-cyan-400">{analytics.videoPlayRate}% klicken Play</span>
                    </div>
                    <div className="text-2xl text-muted-foreground">↓</div>
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30">
                        <div className="text-center">
                          <p className="text-xl font-bold text-emerald-400">{analytics.videoPlays}</p>
                          <p className="text-xs text-muted-foreground">Plays</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time Series Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Views Over Time Chart */}
              <Card className="glass-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Aufrufe (letzte 14 Tage)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timeSeriesData}>
                        <defs>
                          <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorPlays" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="label" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))'
                          }}
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="views" 
                          name="Seitenaufrufe"
                          stroke="#6366f1" 
                          fillOpacity={1} 
                          fill="url(#colorViews)" 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="videoPlays" 
                          name="Video-Plays"
                          stroke="#10b981" 
                          fillOpacity={1} 
                          fill="url(#colorPlays)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Conversions Over Time Chart */}
              <Card className="glass-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MousePointerClick className="w-5 h-5 text-primary" />
                    Conversions (letzte 14 Tage)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="label" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))'
                          }}
                        />
                        <Legend />
                        <Bar dataKey="ctaClicks" name="CTA-Klicks" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="bookings" name="Termin-Klicks" fill="#ec4899" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Event Breakdown Chart */}
            <Card className="glass-card border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Event-Übersicht
                </CardTitle>
                <CardDescription>
                  Gesamtanzahl aller Events im ausgewählten Zeitraum
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={eventBreakdownData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        type="number"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                      />
                      <YAxis 
                        type="category"
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        width={100}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Analytics */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="glass-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Video className="w-5 h-5 text-primary" />
                    Video-Engagement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Video gestartet</span>
                      <span className="font-medium text-foreground">{analytics.videoPlays}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Video beendet</span>
                      <span className="font-medium text-foreground">{analytics.videoCompletions}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Abschlussrate</span>
                      <span className="font-medium text-foreground">
                        {analytics.videoPlays > 0 
                          ? Math.round((analytics.videoCompletions / analytics.videoPlays) * 100) 
                          : 0}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Ø Scroll-Tiefe</span>
                      <span className="font-medium text-foreground">{analytics.avgScrollDepth}%</span>
                    </div>
                    <Progress value={analytics.avgScrollDepth} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Conversion-Metriken
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">CTA-Klicks</span>
                      <span className="font-medium text-foreground">{analytics.ctaClicks}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Termin-Button Klicks</span>
                      <span className="font-medium text-foreground">{analytics.bookingClicks}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Conversion-Rate</span>
                      <span className="font-medium text-foreground">{analytics.conversionRate}%</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="bg-primary/5 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">Performance</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {analytics.conversionRate >= 5 
                          ? "Sehr gute Conversion-Rate! 🎉" 
                          : analytics.conversionRate >= 2 
                            ? "Gute Performance, weiter optimieren." 
                            : "Tipp: Optimiere dein Video und CTA."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Campaign Stats Summary */}
            <Card className="glass-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedCampaign 
                    ? `Kampagne: ${campaigns.find(c => c.id === selectedCampaign)?.name}` 
                    : "Alle Kampagnen"}
                </CardTitle>
                <CardDescription>
                  {contacts.length} Leads • {analytics.totalViews} Aufrufe • {analytics.bookingClicks} Termin-Anfragen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{contacts.length}</p>
                    <p className="text-xs text-muted-foreground">Leads</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{analytics.totalViews}</p>
                    <p className="text-xs text-muted-foreground">Aufrufe</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{analytics.videoPlays}</p>
                    <p className="text-xs text-muted-foreground">Video-Plays</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{formatTime(analytics.avgWatchTime)}</p>
                    <p className="text-xs text-muted-foreground">Ø Zeit auf Seite</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{analytics.conversionRate}%</p>
                    <p className="text-xs text-muted-foreground">Conversion</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default VideoNoteAdmin;
