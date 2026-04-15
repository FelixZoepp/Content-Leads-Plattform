import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Flame, TrendingUp, Eye, Play, MousePointer } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface HotLead {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  lead_score: number;
  viewed_at: string | null;
  campaign_id: string | null;
}

const HotLeadsList = () => {
  const [hotLeads, setHotLeads] = useState<HotLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHotLeads();
  }, []);

  const fetchHotLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, company, lead_score, viewed_at, campaign_id")
        .gte("lead_score", 30)
        .order("lead_score", { ascending: false })
        .limit(10);

      if (error) throw error;
      setHotLeads(data || []);
    } catch (error) {
      console.error("Error fetching hot leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 100) {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
          <Flame className="w-3 h-3" />
          {score}
        </Badge>
      );
    }
    if (score >= 70) {
      return (
        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 gap-1">
          <TrendingUp className="w-3 h-3" />
          {score}
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1">
        {score}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded-full" />
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
            <div className="h-6 w-12 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (hotLeads.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Flame className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Noch keine Hot Leads</p>
        <p className="text-xs mt-1">
          Leads erhalten Punkte durch Interaktionen mit der VideoNote-Seite.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {hotLeads.map((lead, index) => (
        <div
          key={lead.id}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          {/* Rank indicator */}
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              index === 0
                ? "bg-amber-500 text-amber-950"
                : index === 1
                ? "bg-gray-300 text-gray-700"
                : index === 2
                ? "bg-orange-400 text-orange-950"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {index + 1}
          </div>

          {/* Lead info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {lead.first_name} {lead.last_name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {lead.company || "Kein Unternehmen"}
            </p>
          </div>

          {/* Score badge */}
          {getScoreBadge(lead.lead_score)}
        </div>
      ))}
    </div>
  );
};

export default HotLeadsList;
