import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Play, MousePointer, Clock, ScrollText, FormInput, Calendar, CheckCircle, Trash2, Phone, Mail, MessageSquare, Users, User } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

interface TrackingEvent {
  id: string;
  event_type: string;
  event_data: any;
  created_at: string;
  page_url: string | null;
}

interface Activity {
  id: string;
  type: string;
  outcome: string | null;
  note: string | null;
  duration_min: number | null;
  created_at: string;
  user_id?: string;
}

interface TimelineItem {
  id: string;
  source: 'tracking' | 'activity';
  event_type: string;
  data: any;
  created_at: string;
  note?: string | null;
  user_id?: string | null;
}

interface TeamMember {
  id: string;
  name: string | null;
}

interface JourneyTimelineProps {
  contactId: string;
}

interface MemberInfo {
  name: string;
  avatar_url: string | null;
}

const JourneyTimeline = ({ contactId }: JourneyTimelineProps) => {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<Record<string, MemberInfo>>({});
  const [ownerInfo, setOwnerInfo] = useState<MemberInfo | null>(null);

  useEffect(() => {
    if (contactId) {
      fetchAllEvents();

      const trackingChannel = supabase
        .channel(`journey-tracking-${contactId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "lead_tracking_events",
            filter: `contact_id=eq.${contactId}`,
          },
          (payload) => {
            const newEvent = payload.new as TrackingEvent;
            const newItem: TimelineItem = {
              id: newEvent.id,
              source: 'tracking',
              event_type: newEvent.event_type,
              data: newEvent.event_data,
              created_at: newEvent.created_at,
            };
            setTimelineItems((prev) => [newItem, ...prev].sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ));
          }
        )
        .subscribe();

      const activityChannel = supabase
        .channel(`journey-activities-${contactId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "activities",
            filter: `contact_id=eq.${contactId}`,
          },
          (payload) => {
            const newActivity = payload.new as any;
            const newItem: TimelineItem = {
              id: newActivity.id,
              source: 'activity',
              event_type: `activity_${newActivity.type}`,
              data: { outcome: newActivity.outcome, duration_min: newActivity.duration_min },
              created_at: newActivity.created_at,
              note: newActivity.note,
              user_id: newActivity.user_id,
            };
            setTimelineItems((prev) => [newItem, ...prev].sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(trackingChannel);
        supabase.removeChannel(activityChannel);
      };
    }
  }, [contactId]);

  const fetchAllEvents = async () => {
    try {
      // Fetch tracking events, activities, contact owner, and team members in parallel
      const [trackingResult, activitiesResult, contactResult] = await Promise.all([
        supabase
          .from("lead_tracking_events")
          .select("id, event_type, event_data, created_at, page_url")
          .eq("contact_id", contactId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("activities")
          .select("id, type, outcome, note, duration_min, created_at, user_id")
          .eq("contact_id", contactId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("contacts")
          .select("owner_user_id, account_id")
          .eq("id", contactId)
          .single(),
      ]);

      // Load team member names + avatars if we have an account
      if (contactResult.data?.account_id) {
        const { data: members } = await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .eq("account_id", contactResult.data.account_id);
        
        if (members) {
          const memberMap: Record<string, MemberInfo> = {};
          members.forEach((m) => {
            memberMap[m.id] = { name: m.name || "Unbenannt", avatar_url: m.avatar_url };
          });
          setTeamMembers(memberMap);

          if (contactResult.data.owner_user_id && memberMap[contactResult.data.owner_user_id]) {
            setOwnerInfo(memberMap[contactResult.data.owner_user_id]);
          }
        }
      }

      const trackingItems: TimelineItem[] = (trackingResult.data || []).map((e) => ({
        id: e.id,
        source: 'tracking' as const,
        event_type: e.event_type,
        data: e.event_data,
        created_at: e.created_at,
      }));

      const activityItems: TimelineItem[] = (activitiesResult.data || []).map((a) => ({
        id: a.id,
        source: 'activity' as const,
        event_type: `activity_${a.type}`,
        data: { outcome: a.outcome, duration_min: a.duration_min },
        created_at: a.created_at,
        note: a.note,
        user_id: a.user_id,
      }));

      const allItems = [...trackingItems, ...activityItems].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTimelineItems(allItems);
    } catch (error) {
      console.error("Error fetching journey events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (item: TimelineItem) => {
    try {
      if (item.source === 'tracking') {
        const { error } = await supabase
          .from("lead_tracking_events")
          .delete()
          .eq("id", item.id);

        if (error) throw error;
        
        const remainingItems = timelineItems.filter((e) => e.id !== item.id);
        setTimelineItems(remainingItems);
        
        const { data: scoreData } = await supabase.rpc('calculate_lead_score', {
          p_contact_id: contactId
        });
        
        const pageViewCount = remainingItems.filter(e => e.event_type === 'page_view').length;
        const hasViewed = pageViewCount > 0;
        
        await supabase
          .from("contacts")
          .update({
            lead_score: scoreData || 0,
            view_count: pageViewCount,
            viewed: hasViewed,
            viewed_at: hasViewed ? undefined : null,
            workflow_status: hasViewed ? undefined : 'neu'
          })
          .eq("id", contactId);
        
        toast.success("Event gelöscht, Lead Score aktualisiert");
      } else {
        const { error } = await supabase
          .from("activities")
          .delete()
          .eq("id", item.id);

        if (error) throw error;
        
        setTimelineItems((prev) => prev.filter((e) => e.id !== item.id));
        toast.success("Aktivität gelöscht");
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Fehler beim Löschen");
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "page_view":
        return <Eye className="w-4 h-4" />;
      case "video_play":
      case "video_progress":
      case "video_complete":
        return <Play className="w-4 h-4" />;
      case "button_click":
      case "cta_click":
        return <MousePointer className="w-4 h-4" />;
      case "booking_click":
        return <Calendar className="w-4 h-4" />;
      case "scroll_depth":
        return <ScrollText className="w-4 h-4" />;
      case "time_on_page":
        return <Clock className="w-4 h-4" />;
      case "form_submit":
        return <FormInput className="w-4 h-4" />;
      case "activity_call":
        return <Phone className="w-4 h-4" />;
      case "activity_email":
        return <Mail className="w-4 h-4" />;
      case "activity_dm":
        return <MessageSquare className="w-4 h-4" />;
      case "activity_meeting":
        return <Users className="w-4 h-4" />;
      case "activity_note":
        return <ScrollText className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "page_view":
        return "bg-blue-500";
      case "video_play":
      case "video_progress":
        return "bg-purple-500";
      case "video_complete":
        return "bg-green-500";
      case "button_click":
      case "cta_click":
        return "bg-amber-500";
      case "booking_click":
        return "bg-emerald-500";
      case "scroll_depth":
        return "bg-indigo-500";
      case "time_on_page":
        return "bg-cyan-500";
      case "form_submit":
        return "bg-pink-500";
      case "activity_call":
        return "bg-green-600";
      case "activity_email":
        return "bg-blue-600";
      case "activity_dm":
        return "bg-violet-500";
      case "activity_meeting":
        return "bg-orange-500";
      case "activity_note":
        return "bg-slate-500";
      default:
        return "bg-muted-foreground";
    }
  };

  const getEventTitle = (item: TimelineItem) => {
    const data = item.data || {};
    switch (item.event_type) {
      case "page_view":
        return "Landing Page besucht";
      case "video_play":
        return "Video gestartet";
      case "video_progress":
        return `Video ${data.progress || 0}% angesehen`;
      case "video_complete":
        return "Video vollständig angesehen";
      case "button_click":
        return data.button_text ? `"${data.button_text}" geklickt` : "Button geklickt";
      case "cta_click":
        return "CTA-Button geklickt";
      case "booking_click":
        return "Booking-Seite geöffnet";
      case "scroll_depth":
        return `Seite zu ${data.depth || 0}% gescrollt`;
      case "time_on_page":
        const minutes = Math.floor((data.seconds || 0) / 60);
        const seconds = (data.seconds || 0) % 60;
        return `${minutes}:${seconds.toString().padStart(2, "0")} Min. auf Seite verbracht`;
      case "form_submit":
        return "Formular abgeschickt";
      case "activity_call":
        const duration = data.duration_min ? ` (${data.duration_min} Min.)` : '';
        const outcome = data.outcome === 'interested' ? ' - Interessiert' : 
                       data.outcome === 'not_interested' ? ' - Kein Interesse' :
                       data.outcome === 'reached' ? ' - Erreicht' :
                       data.outcome === 'no_answer' ? ' - Nicht erreicht' : '';
        return `Anruf${duration}${outcome}`;
      case "activity_email":
        return "E-Mail gesendet";
      case "activity_dm":
        return "Direktnachricht gesendet";
      case "activity_meeting":
        return "Meeting durchgeführt";
      case "activity_note":
        return "Notiz hinzugefügt";
      default:
        return item.event_type;
    }
  };

  const getEventBadge = (eventType: string, data?: any) => {
    const isHighValue = ["video_complete", "booking_click", "cta_click", "form_submit"].includes(eventType);
    const isInterested = eventType === 'activity_call' && data?.outcome === 'interested';
    
    if (isHighValue || isInterested) {
      return (
        <Badge variant="default" className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
          Hot
        </Badge>
      );
    }
    
    if (eventType === 'activity_call') {
      return (
        <Badge variant="secondary" className="text-xs">
          KI-Zusammenfassung
        </Badge>
      );
    }
    
    return null;
  };

  const getMemberInfo = (item: TimelineItem): MemberInfo | null => {
    if (item.source === 'activity' && item.user_id && teamMembers[item.user_id]) {
      return teamMembers[item.user_id];
    }
    if (item.source === 'tracking' && ownerInfo) {
      return ownerInfo;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse flex gap-3">
            <div className="w-3 h-3 bg-muted rounded-full mt-1" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (timelineItems.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Noch keine Aktivitäten erfasst</p>
        <p className="text-xs mt-1">
          Events werden aufgezeichnet, sobald der Lead die personalisierte Seite besucht.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
        Journey Timeline
        <Badge variant="secondary" className="text-xs">
          {timelineItems.length} Events
        </Badge>
      </h3>
      
      <div className="space-y-4">
        {timelineItems.map((item, index) => {
          const member = getMemberInfo(item);
          return (
            <div key={item.id} className="relative flex gap-3">
              {/* Timeline line */}
              {index < timelineItems.length - 1 && (
                <div className="absolute left-[5px] top-6 w-0.5 h-full bg-border" />
              )}
              
              {/* Icon */}
              <div
                className={`w-3 h-3 rounded-full ${getEventColor(item.event_type)} flex items-center justify-center flex-shrink-0 mt-1 ring-2 ring-background`}
              />
              
              {/* Content */}
              <div className="flex-1 min-w-0 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-muted-foreground">
                      {getEventIcon(item.event_type)}
                    </span>
                    <span className="text-sm font-medium">{getEventTitle(item)}</span>
                    {getEventBadge(item.event_type, item.data)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={() => handleDeleteItem(item)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>

                {/* Team member attribution with avatar */}
                {member && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <Avatar className="h-5 w-5">
                      {member.avatar_url ? (
                        <AvatarImage src={member.avatar_url} alt={member.name} />
                      ) : null}
                      <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                        {member.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {item.source === 'activity' ? `von ${member.name}` : `über ${member.name}`}
                    </span>
                  </div>
                )}
                
                {/* Show note for activities */}
                {item.note && (
                  <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-2 whitespace-pre-wrap">
                    {item.note}
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(item.created_at), "dd.MM.yyyy, HH:mm", { locale: de })} Uhr
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default JourneyTimeline;
