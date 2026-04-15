import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Search, Check, X, Flame, ThermometerSun, Snowflake, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface OwnerProfile {
  id: string;
  name: string | null;
  avatar_url: string | null;
}

interface CampaignLead {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  lead_score: number | null;
  workflow_status: string | null;
  outreach_status: string | null;
  viewed: boolean | null;
  view_count: number | null;
  updated_at: string;
  lastActivity: string | null;
  hasPageView: boolean;
  hasVideoPlay: boolean;
  outreachCount: number;
  owner_user_id: string | null;
}

interface CampaignLeadsTableProps {
  campaignId: string;
  campaignName: string;
}

export const CampaignLeadsTable = ({ campaignId, campaignName }: CampaignLeadsTableProps) => {
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [owners, setOwners] = useState<Record<string, OwnerProfile>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchLeads();
  }, [campaignId]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      
      // Fetch leads for this campaign
      const { data: contactsData, error: contactsError } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, company, lead_score, workflow_status, outreach_status, viewed, view_count, updated_at, first_message_sent_at, fu1_sent_at, fu2_sent_at, fu3_sent_at, owner_user_id")
        .eq("campaign_id", campaignId)
        .order("lead_score", { ascending: false });

      if (contactsError) throw contactsError;

      // Get tracking events for these leads
      const leadIds = contactsData?.map(l => l.id) || [];
      
      if (leadIds.length === 0) {
        setLeads([]);
        setLoading(false);
        return;
      }

      const { data: eventsData } = await supabase
        .from("lead_tracking_events")
        .select("contact_id, event_type, created_at")
        .in("contact_id", leadIds)
        .order("created_at", { ascending: false });

      // Load owner profiles for team display
      const ownerIds = [...new Set((contactsData || []).map(c => c.owner_user_id).filter(Boolean))] as string[];
      if (ownerIds.length > 1) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .in("id", ownerIds);
        const ownerMap: Record<string, OwnerProfile> = {};
        (profiles || []).forEach((p: any) => { ownerMap[p.id] = p; });
        setOwners(ownerMap);
      }

      // Process leads with activity data
      const processedLeads: CampaignLead[] = (contactsData || []).map(contact => {
        const contactEvents = eventsData?.filter(e => e.contact_id === contact.id) || [];
        const hasPageView = contactEvents.some(e => e.event_type === "page_view");
        const hasVideoPlay = contactEvents.some(e => 
          e.event_type === "video_play" || e.event_type === "video_complete"
        );
        
        // Calculate outreach count
        let outreachCount = 0;
        if (contact.first_message_sent_at) outreachCount++;
        if (contact.fu1_sent_at) outreachCount++;
        if (contact.fu2_sent_at) outreachCount++;
        if (contact.fu3_sent_at) outreachCount++;

        // Get last activity time
        const lastEvent = contactEvents[0];
        const lastActivity = lastEvent?.created_at || null;

        return {
          id: contact.id,
          first_name: contact.first_name,
          last_name: contact.last_name,
          company: contact.company,
          lead_score: contact.lead_score,
          workflow_status: contact.workflow_status,
          outreach_status: contact.outreach_status,
          viewed: contact.viewed,
          view_count: contact.view_count,
          updated_at: contact.updated_at,
          lastActivity,
          hasPageView,
          hasVideoPlay,
          outreachCount,
          owner_user_id: contact.owner_user_id,
        };
      });

      setLeads(processedLeads);
    } catch (error) {
      console.error("Error fetching campaign leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (score: number | null) => {
    const s = score || 0;
    if (s >= 70) {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 flex items-center gap-1">
          <Flame className="w-3 h-3" />
          Hot
        </Badge>
      );
    }
    if (s >= 30) {
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 flex items-center gap-1">
          <ThermometerSun className="w-3 h-3" />
          Warm
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 flex items-center gap-1">
        <Snowflake className="w-3 h-3" />
        Cold
      </Badge>
    );
  };

  const getWorkflowStatusLabel = (status: string | null) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      neu: { label: "Neu", color: "bg-gray-500/20 text-gray-400" },
      bereit_fuer_vernetzung: { label: "Bereit", color: "bg-blue-500/20 text-blue-400" },
      vernetzung_ausstehend: { label: "Ausstehend", color: "bg-yellow-500/20 text-yellow-400" },
      vernetzung_angenommen: { label: "Angenommen", color: "bg-green-500/20 text-green-400" },
      erstnachricht_gesendet: { label: "1. Nachricht", color: "bg-purple-500/20 text-purple-400" },
      kein_klick_fu_offen: { label: "FU Offen", color: "bg-orange-500/20 text-orange-400" },
      fu1_gesendet: { label: "FU1", color: "bg-purple-500/20 text-purple-400" },
      fu2_gesendet: { label: "FU2", color: "bg-purple-500/20 text-purple-400" },
      fu3_gesendet: { label: "FU3", color: "bg-purple-500/20 text-purple-400" },
      reagiert_warm: { label: "Reagiert", color: "bg-green-500/20 text-green-400" },
      abgeschlossen: { label: "Terminiert", color: "bg-emerald-500/20 text-emerald-400" },
    };
    const config = statusMap[status || "neu"] || statusMap.neu;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getScoreColor = (score: number | null) => {
    const s = score || 0;
    if (s >= 70) return "bg-red-500";
    if (s >= 30) return "bg-amber-500";
    return "bg-blue-500";
  };

  const filteredLeads = leads.filter(lead => {
    const searchLower = searchQuery.toLowerCase();
    return (
      lead.first_name.toLowerCase().includes(searchLower) ||
      lead.last_name.toLowerCase().includes(searchLower) ||
      (lead.company?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Lädt Leads...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="w-5 h-5" />
          <span className="font-medium">{leads.length} leads</span>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Leads suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      {filteredLeads.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {leads.length === 0 ? "Keine Leads in dieser Kampagne" : "Keine Ergebnisse gefunden"}
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">LEAD</TableHead>
                <TableHead className="font-semibold">STATUS</TableHead>
                <TableHead className="font-semibold">SCORE</TableHead>
                <TableHead className="font-semibold">WORKFLOW</TableHead>
                <TableHead className="font-semibold text-center">OUTREACH</TableHead>
                <TableHead className="font-semibold">LETZTE AKTIVITÄT</TableHead>
                <TableHead className="font-semibold text-center">LP GEÖFFNET</TableHead>
                <TableHead className="font-semibold text-center">VIDEO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-muted/20">
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">
                        {lead.first_name} {lead.last_name}
                      </p>
                      {lead.company && (
                        <p className="text-sm text-muted-foreground">{lead.company}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(lead.lead_score)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[100px]">
                      {lead.owner_user_id && owners[lead.owner_user_id] && (
                        <div
                          className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0"
                          title={owners[lead.owner_user_id].name || ""}
                        >
                          {owners[lead.owner_user_id].avatar_url ? (
                            <img src={owners[lead.owner_user_id].avatar_url!} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            (owners[lead.owner_user_id].name || "?")[0].toUpperCase()
                          )}
                        </div>
                      )}
                      <span className="font-semibold text-foreground w-8">
                        {lead.lead_score || 0}
                      </span>
                      <Progress
                        value={Math.min(lead.lead_score || 0, 100)}
                        className="h-2 flex-1"
                        indicatorClassName={getScoreColor(lead.lead_score)}
                      />
                    </div>
                  </TableCell>
                  <TableCell>{getWorkflowStatusLabel(lead.workflow_status)}</TableCell>
                  <TableCell className="text-center">
                    <span className="text-muted-foreground">
                      {lead.outreachCount > 0 ? `${lead.outreachCount}+` : "0"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {lead.lastActivity ? (
                      <span className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(lead.lastActivity), {
                          addSuffix: false,
                          locale: de,
                        })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {lead.hasPageView ? (
                      <Check className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-orange-500 mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {lead.hasVideoPlay ? (
                      <Check className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-orange-500 mx-auto" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
