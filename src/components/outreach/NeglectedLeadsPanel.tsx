import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Phone, User, Building2, AlertTriangle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, differenceInDays, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface NeglectedLead {
  id: string;
  contact_id: string;
  title: string;
  stage: string;
  last_activity_at: string | null;
  created_at: string;
  days_inactive: number;
  contact: {
    first_name: string;
    last_name: string;
    company: string | null;
    phone: string | null;
  };
}

interface NeglectedLeadsPanelProps {
  onLeadClick?: (dealId: string) => void;
}

export default function NeglectedLeadsPanel({ onLeadClick }: NeglectedLeadsPanelProps) {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<NeglectedLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNeglectedLeads();
  }, []);

  const fetchNeglectedLeads = async () => {
    try {
      // Get deals with contacts that haven't had activity in 7+ days
      const sevenDaysAgo = subDays(new Date(), 7);
      
      // First, get all open deals
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select(`
          id,
          title,
          stage,
          created_at,
          contact_id,
          contacts (
            first_name,
            last_name,
            company,
            phone
          )
        `)
        .not('stage', 'in', '("Gewonnen","Verloren","Abgeschlossen")');

      if (dealsError) throw dealsError;
      if (!deals || deals.length === 0) {
        setLeads([]);
        setLoading(false);
        return;
      }

      // Get last activity for each contact
      const contactIds = deals.filter(d => d.contact_id).map(d => d.contact_id);
      
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('contact_id, timestamp')
        .in('contact_id', contactIds)
        .order('timestamp', { ascending: false });

      if (activitiesError) throw activitiesError;

      // Create a map of contact_id to last activity
      const lastActivityMap = new Map<string, string>();
      activities?.forEach(activity => {
        if (!lastActivityMap.has(activity.contact_id)) {
          lastActivityMap.set(activity.contact_id, activity.timestamp);
        }
      });

      // Filter deals that are neglected (no activity in 7+ days)
      const now = new Date();
      const neglectedLeads: NeglectedLead[] = deals
        .filter(deal => {
          if (!deal.contact_id || !deal.contacts) return false;
          
          const lastActivity = lastActivityMap.get(deal.contact_id);
          const referenceDate = lastActivity || deal.created_at;
          const daysInactive = differenceInDays(now, new Date(referenceDate));
          
          return daysInactive >= 7;
        })
        .map(deal => {
          const lastActivity = lastActivityMap.get(deal.contact_id!);
          const referenceDate = lastActivity || deal.created_at;
          const daysInactive = differenceInDays(now, new Date(referenceDate));
          
          return {
            id: deal.id,
            contact_id: deal.contact_id!,
            title: deal.title,
            stage: deal.stage,
            last_activity_at: lastActivity || null,
            created_at: deal.created_at,
            days_inactive: daysInactive,
            contact: deal.contacts as any,
          };
        })
        .sort((a, b) => b.days_inactive - a.days_inactive)
        .slice(0, 10);

      setLeads(neglectedLeads);
    } catch (error) {
      console.error('Error fetching neglected leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyBadge = (days: number) => {
    if (days >= 30) {
      return (
        <Badge variant="destructive" className="text-[10px]">
          {days} Tage
        </Badge>
      );
    }
    if (days >= 14) {
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
          {days} Tage
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">
        {days} Tage
      </Badge>
    );
  };

  const handleCallLead = (e: React.MouseEvent, lead: NeglectedLead) => {
    e.stopPropagation();
    navigate('/power-dialer');
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Vernachlässigte Leads
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {leads.length} Leads
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Lädt...
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-6">
            <Clock className="w-8 h-8 mx-auto mb-2 text-green-400 opacity-50" />
            <p className="text-sm text-muted-foreground">
              Alle Leads wurden kürzlich kontaktiert 👍
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => onLeadClick?.(lead.id)}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors cursor-pointer group"
                >
                  <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-amber-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {lead.contact.first_name} {lead.contact.last_name}
                      </p>
                      {getUrgencyBadge(lead.days_inactive)}
                    </div>
                    
                    {lead.contact.company && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Building2 className="w-3 h-3" />
                        <span className="truncate">{lead.contact.company}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">
                        {lead.stage}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {lead.last_activity_at 
                          ? `Letzte Aktivität: ${formatDistanceToNow(new Date(lead.last_activity_at), { addSuffix: true, locale: de })}`
                          : 'Keine Aktivität'
                        }
                      </span>
                    </div>
                  </div>
                  
                  {lead.contact.phone && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleCallLead(e, lead)}
                    >
                      <Phone className="h-4 w-4 text-green-400" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        {leads.length > 0 && (
          <Button 
            variant="ghost" 
            className="w-full mt-3 text-xs"
            onClick={() => navigate('/pipeline')}
          >
            Alle Leads anzeigen
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
