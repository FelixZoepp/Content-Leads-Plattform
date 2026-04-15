import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, MessageSquare, Calendar, TrendingUp } from "lucide-react";

interface MemberStats {
  id: string;
  name: string;
  connectionsSent: number;
  messagesSent: number;
  positiveReplies: number;
  appointmentsBooked: number;
  totalLeads: number;
}

export default function TeamPerformance() {
  const [members, setMembers] = useState<MemberStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamStats();
  }, []);

  const fetchTeamStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("account_id").eq("id", user.id).single();
      if (!profile?.account_id) return;

      const accId = profile.account_id;

      // Get team members
      const { data: teamProfiles } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("account_id", accId);

      if (!teamProfiles || teamProfiles.length <= 1) { setLoading(false); return; }

      // Use the RPC for independent per-member stats from contact_member_links
      const { data: memberStatsData } = await supabase.rpc("get_member_link_stats", {
        p_account_id: accId,
        p_start_date: '2000-01-01',
      });

      const statsMap = new Map<string, any>();
      (memberStatsData || []).forEach((s: any) => statsMap.set(s.user_id, s));

      const memberStats: MemberStats[] = teamProfiles.map(p => {
        const s = statsMap.get(p.id);
        return {
          id: p.id,
          name: p.name || "Unbenannt",
          connectionsSent: Number(s?.connections_sent || 0),
          messagesSent: Number(s?.messages_sent || 0),
          positiveReplies: Number(s?.positive_replies || 0),
          appointmentsBooked: Number(s?.appointments_booked || 0),
          totalLeads: Number(s?.total_leads || 0),
        };
      }).sort((a, b) => b.appointmentsBooked - a.appointmentsBooked);

      setMembers(memberStats);
    } catch (err) {
      console.error("Error fetching team stats:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (members.length <= 1) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4" />
          Team Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {members.map((member, idx) => (
            <div key={member.id} className={`flex items-center gap-3 p-2.5 rounded-lg ${idx === 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-muted/30'}`}>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {idx === 0 ? <Trophy className="w-4 h-4 text-amber-500" /> : member.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{member.name}</span>
                  {idx === 0 && <Badge className="text-[9px] bg-amber-500/20 text-amber-400 border-amber-500/30">Top</Badge>}
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{member.totalLeads}</span>
                  <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{member.messagesSent}</span>
                  <span className="flex items-center gap-0.5 text-green-400"><TrendingUp className="w-3 h-3" />{member.positiveReplies}</span>
                  <span className="flex items-center gap-0.5 text-pink-400"><Calendar className="w-3 h-3" />{member.appointmentsBooked}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
