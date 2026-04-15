import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Play, MousePointer, Clock, ScrollText, FormInput } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

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

const EngagementFeed = () => {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();

    // Subscribe to realtime events
    const channel = supabase
      .channel("tracking-events")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lead_tracking_events",
        },
        (payload) => {
          fetchEventWithContact(payload.new as TrackingEvent);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("lead_tracking_events")
        .select(`
          id,
          contact_id,
          event_type,
          event_data,
          created_at
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch contact info for each event
      const eventsWithContacts = await Promise.all(
        (data || []).map(async (event) => {
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
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventWithContact = async (event: TrackingEvent) => {
    const { data: contact } = await supabase
      .from("contacts")
      .select("first_name, last_name, company")
      .eq("id", event.contact_id)
      .single();

    const eventWithContact = { ...event, contact: contact || undefined };
    setEvents((prev) => [eventWithContact, ...prev.slice(0, 19)]);
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "page_view":
        return <Eye className="w-4 h-4 text-blue-400" />;
      case "video_play":
      case "video_progress":
      case "video_complete":
        return <Play className="w-4 h-4 text-green-400" />;
      case "button_click":
      case "cta_click":
      case "booking_click":
        return <MousePointer className="w-4 h-4 text-amber-400" />;
      case "scroll_depth":
        return <ScrollText className="w-4 h-4 text-purple-400" />;
      case "time_on_page":
        return <Clock className="w-4 h-4 text-cyan-400" />;
      case "form_submit":
        return <FormInput className="w-4 h-4 text-emerald-400" />;
      default:
        return <Eye className="w-4 h-4 text-muted-foreground" />;
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
        return `Button "${data.button_text || "CTA"}" geklickt`;
      case "cta_click":
        return "CTA-Button geklickt";
      case "booking_click":
        return "Booking-Seite geöffnet";
      case "scroll_depth":
        return `${data.depth || 0}% gescrollt`;
      case "time_on_page":
        return `${Math.round((data.seconds || 0) / 60)} Min. auf Seite`;
      case "form_submit":
        return "Formular abgeschickt";
      default:
        return event.event_type;
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-2 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-4">
        Noch keine Aktivitäten
      </p>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {events.map((event) => (
        <div key={event.id} className="flex items-start gap-3 group">
          <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
            {getEventIcon(event.event_type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {event.contact
                ? `${event.contact.first_name} ${event.contact.last_name}`
                : "Unbekannt"}
            </p>
            <p className="text-xs text-muted-foreground">
              {event.contact?.company && (
                <span className="mr-2">{event.contact.company}</span>
              )}
              {getEventLabel(event)}
            </p>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(event.created_at), {
              addSuffix: false,
              locale: de,
            })}
          </span>
        </div>
      ))}
    </div>
  );
};

export default EngagementFeed;
