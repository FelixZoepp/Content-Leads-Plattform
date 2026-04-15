import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Trophy, Users, Crown, MessageSquare, Calendar, TrendingUp,
  Phone, Target, Flame, Medal, Zap, ArrowUp, ArrowDown, Minus,
  Settings2, Rocket, Plus, Pause, Play, Pencil, HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { subDays } from "date-fns";
import TeamInvite from "@/components/outreach/TeamInvite";

// --- Types ---

interface TeamChallenge {
  id: string;
  account_id: string;
  name: string;
  goal_type: string;
  goal_value: number;
  is_active: boolean;
  start_date: string;
}

interface MemberStats {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string | null;
  connectionsSent: number;
  connectionsAccepted: number;
  acceptanceRate: number;
  messagesSent: number;
  replies: number;
  replyRate: number;
  positiveReplies: number;
  appointmentsBooked: number;
  callsToday: number;
  callsWeek: number;
  totalLeads: number;
  linkClicks: number;
}

interface MemberTrend {
  id: string;
  connectionsSentPrev: number;
  connectionsAcceptedPrev: number;
  messagesSentPrev: number;
  repliesPrev: number;
  positiveRepliesPrev: number;
  appointmentsBookedPrev: number;
}

type SortMetric = "connectionsSent" | "acceptanceRate" | "messagesSent" | "replyRate" | "positiveReplies" | "appointmentsBooked" | "callsWeek" | "linkClicks";

interface Activity {
  id: string;
  userName: string;
  type: string;
  outcome: string | null;
  contactName: string;
  timestamp: string;
}

interface LandingPageStat {
  pageUrl: string;
  views: number;
  uniqueContacts: number;
}

interface MemberDetail {
  member: MemberStats;
  landingPages: LandingPageStat[];
  topLeads: { name: string; status: string; score: number | null }[];
}

// --- Constants ---

const WORKFLOW_SENT = ["vernetzung_ausstehend", "vernetzung_angenommen", "erstnachricht_gesendet", "fu1_gesendet", "fu2_gesendet", "fu3_gesendet", "reagiert_warm", "positiv_geantwortet", "termin_gebucht", "abgeschlossen"];
const WORKFLOW_ACCEPTED = ["vernetzung_angenommen", "erstnachricht_gesendet", "fu1_gesendet", "fu2_gesendet", "fu3_gesendet", "reagiert_warm", "positiv_geantwortet", "termin_gebucht", "abgeschlossen"];
const WORKFLOW_MESSAGED = ["erstnachricht_gesendet", "fu1_gesendet", "fu2_gesendet", "fu3_gesendet", "reagiert_warm", "positiv_geantwortet", "termin_gebucht", "abgeschlossen"];
const WORKFLOW_REPLIED = ["reagiert_warm", "positiv_geantwortet", "termin_gebucht", "abgeschlossen"];
const WORKFLOW_POSITIVE = ["positiv_geantwortet", "termin_gebucht", "abgeschlossen"];
const WORKFLOW_BOOKED = ["termin_gebucht", "abgeschlossen"];

const MEMBER_COLORS = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500", "bg-pink-500", "bg-cyan-500"];

const SORT_OPTIONS: { value: SortMetric; label: string }[] = [
  { value: "connectionsSent", label: "Vernetzungen" },
  { value: "acceptanceRate", label: "Annahmerate" },
  { value: "messagesSent", label: "Nachrichten" },
  { value: "replyRate", label: "Antwortrate" },
  { value: "positiveReplies", label: "Positive Antworten" },
  { value: "appointmentsBooked", label: "Termine" },
  { value: "callsWeek", label: "Calls (Woche)" },
  { value: "linkClicks", label: "Link-Klicks" },
];

const GOAL_TYPES: { value: string; label: string }[] = [
  { value: "connections_sent", label: "Vernetzungen gesendet" },
  { value: "appointments_booked", label: "Termine gebucht" },
  { value: "positive_replies", label: "Positive Antworten" },
  { value: "messages_sent", label: "Nachrichten gesendet" },
];

// --- Helpers ---

function countInStatuses(contacts: { owner_user_id: string | null; workflow_status: string | null }[], userId: string, statuses: string[]) {
  return contacts.filter(c => c.owner_user_id === userId && statuses.includes(c.workflow_status || "")).length;
}

function pct(a: number, b: number): number {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}

function trendIcon(current: number, previous: number) {
  if (current > previous) return <ArrowUp className="w-3 h-3 text-green-400" />;
  if (current < previous) return <ArrowDown className="w-3 h-3 text-red-400" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

function rankBadge(index: number) {
  if (index === 0) return <Crown className="w-5 h-5 text-amber-400" />;
  if (index === 1) return <Medal className="w-4 h-4 text-slate-300" />;
  if (index === 2) return <Medal className="w-4 h-4 text-amber-700" />;
  return <span className="text-xs text-muted-foreground font-bold">#{index + 1}</span>;
}

function roleBadge(role: string | null) {
  switch (role) {
    case "admin": return <Badge className="text-[9px] bg-blue-500/20 text-blue-400 border-blue-500/30 px-1.5">Admin</Badge>;
    case "closer": return <Badge className="text-[9px] bg-purple-500/20 text-purple-400 border-purple-500/30 px-1.5">Closer</Badge>;
    case "setter": return <Badge className="text-[9px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-1.5">Setter</Badge>;
    default: return null;
  }
}

function goalMetricForMember(member: MemberStats, goalType: string): number {
  switch (goalType) {
    case "connections_sent": return member.connectionsSent;
    case "appointments_booked": return member.appointmentsBooked;
    case "positive_replies": return member.positiveReplies;
    case "messages_sent": return member.messagesSent;
    default: return member.connectionsSent;
  }
}

function goalTypeLabel(goalType: string): string {
  return GOAL_TYPES.find(g => g.value === goalType)?.label || goalType;
}

// --- Component ---

export default function TeamArena() {
  const [challenge, setChallenge] = useState<TeamChallenge | null>(null);
  const [members, setMembers] = useState<MemberStats[]>([]);
  const [trends, setTrends] = useState<MemberTrend[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sortBy, setSortBy] = useState<SortMetric>("appointmentsBooked");
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Member detail sheet
  const [selectedMember, setSelectedMember] = useState<MemberDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Setup dialog state
  const [showSetup, setShowSetup] = useState(false);
  const [setupName, setSetupName] = useState("Team Challenge");
  const [setupGoalType, setSetupGoalType] = useState("connections_sent");
  const [setupGoalValue, setSetupGoalValue] = useState(2000);
  const [setupStartDate, setSetupStartDate] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("id", user.id)
        .single();
      if (!profile?.account_id) return;

      const accId = profile.account_id;
      setAccountId(accId);

      // Load challenge settings
      const { data: challengeData, error: challengeError } = await supabase
        .from("team_challenges")
        .select("*")
        .eq("account_id", accId)
        .maybeSingle();

      if (challengeError) {
        console.error("Challenge load error:", challengeError);
        // Table might not exist yet - show setup screen
      }

      if (!challengeData) {
        setLoading(false);
        return; // No challenge configured -> show setup screen
      }

      setChallenge(challengeData as TeamChallenge);

      // Only load stats if challenge is active
      if (!challengeData.is_active) {
        setLoading(false);
        return;
      }

      const startDate = challengeData.start_date || '2000-01-01';

      // Use DB function for efficient per-member stats (avoids 1000 row limit)
      const [teamRes, memberStatsRes, activitiesTodayRes, activitiesWeekRes, recentActivitiesRes] = await Promise.all([
        supabase.from("profiles").select("id, name, avatar_url, role").eq("account_id", accId),
        supabase.rpc("get_member_link_stats", { p_account_id: accId, p_start_date: startDate }),
        supabase.from("activities").select("user_id").eq("account_id", accId).eq("type", "call").gte("timestamp", new Date().toISOString().slice(0, 10)),
        supabase.from("activities").select("user_id").eq("account_id", accId).eq("type", "call").gte("timestamp", subDays(new Date(), 7).toISOString()),
        supabase.from("activities").select("id, user_id, type, outcome, contact_id, timestamp").eq("account_id", accId).order("timestamp", { ascending: false }).limit(20),
      ]);

      const team = teamRes.data || [];
      const memberStatsData = (memberStatsRes.data || []) as any[];

      // Load page view clicks attributed to members
      const { data: clickEvents } = await supabase
        .from("lead_tracking_events")
        .select("event_data")
        .eq("account_id", accId)
        .eq("event_type", "page_view")
        .not("event_data->member_user_id", "is", null);

      const clicksByMember = new Map<string, number>();
      (clickEvents || []).forEach((e: any) => {
        const uid = e.event_data?.member_user_id;
        if (uid) clicksByMember.set(uid, (clicksByMember.get(uid) || 0) + 1);
      });
      const callsToday = activitiesTodayRes.data || [];
      const callsWeek = activitiesWeekRes.data || [];

      // Build stats from DB function (each member has independent progress)
      const stats: MemberStats[] = team.map(p => {
        const mStats = memberStatsData.find((s: any) => s.user_id === p.id);

        const todayCalls = callsToday.filter((a: any) => a.user_id === p.id).length;
        const wkCalls = callsWeek.filter((a: any) => a.user_id === p.id).length;
        const sent = Number(mStats?.connections_sent || 0);
        const accepted = Number(mStats?.connections_accepted || 0);
        const messaged = Number(mStats?.messages_sent || 0);
        const replied = Number(mStats?.replies || 0);

        return {
          id: p.id,
          name: p.name || "Unbenannt",
          avatarUrl: p.avatar_url,
          role: p.role,
          connectionsSent: sent,
          connectionsAccepted: accepted,
          acceptanceRate: pct(accepted, sent),
          messagesSent: messaged,
          replies: replied,
          replyRate: pct(replied, messaged),
          positiveReplies: Number(mStats?.positive_replies || 0),
          appointmentsBooked: Number(mStats?.appointments_booked || 0),
          callsToday: todayCalls,
          callsWeek: wkCalls,
          totalLeads: Number(mStats?.total_leads || 0),
          linkClicks: clicksByMember.get(p.id) || 0,
        };
      });

      // Trends (placeholder - would need historical snapshots for accurate trends)
      const trendData: MemberTrend[] = team.map(p => ({
        id: p.id,
        connectionsSentPrev: 0,
        connectionsAcceptedPrev: 0,
        messagesSentPrev: 0,
        repliesPrev: 0,
        positiveRepliesPrev: 0,
        appointmentsBookedPrev: 0,
      }));

      // Activity feed
      const contactIds = (recentActivitiesRes.data || []).map((a: any) => a.contact_id).filter(Boolean);
      const contactMap: Record<string, string> = {};
      if (contactIds.length > 0) {
        const { data: contactNames } = await supabase
          .from("contacts")
          .select("id, first_name, last_name")
          .in("id", contactIds);
        (contactNames || []).forEach((c: any) => {
          contactMap[c.id] = `${c.first_name} ${c.last_name}`;
        });
      }

      const userMap: Record<string, string> = {};
      team.forEach(p => { userMap[p.id] = p.name || "Unbenannt"; });

      const feed: Activity[] = (recentActivitiesRes.data || []).map((a: any) => ({
        id: a.id,
        userName: userMap[a.user_id] || "Unbekannt",
        type: a.type,
        outcome: a.outcome,
        contactName: contactMap[a.contact_id] || "",
        timestamp: a.timestamp,
      }));

      setMembers(stats);
      setTrends(trendData);
      setActivities(feed);
    } catch (err) {
      console.error("Error fetching team arena:", err);
    } finally {
      setLoading(false);
    }
  };

  const openMemberDetail = async (member: MemberStats) => {
    setLoadingDetail(true);
    setSelectedMember({ member, landingPages: [], topLeads: [] });
    try {
      // Get contacts owned by this member
      const { data: memberContacts } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, workflow_status, lead_score")
        .eq("account_id", accountId!)
        .eq("owner_user_id", member.id)
        .eq("lead_type", "outbound")
        .order("lead_score", { ascending: false })
        .limit(100);

      const contactIds = (memberContacts || []).map(c => c.id);

      // Get landing page views for these contacts
      let landingPages: LandingPageStat[] = [];
      if (contactIds.length > 0) {
        const { data: events } = await supabase
          .from("lead_tracking_events")
          .select("contact_id, page_url")
          .in("contact_id", contactIds)
          .eq("event_type", "page_view")
          .not("page_url", "is", null);

        // Group by page_url
        const pageMap = new Map<string, { views: number; contacts: Set<string> }>();
        (events || []).forEach((e: any) => {
          const url = e.page_url || "";
          if (!url) return;
          const slug = url.replace(/^https?:\/\/[^/]+/, "") || url;
          const existing = pageMap.get(slug) || { views: 0, contacts: new Set<string>() };
          existing.views++;
          existing.contacts.add(e.contact_id);
          pageMap.set(slug, existing);
        });

        landingPages = Array.from(pageMap.entries())
          .map(([pageUrl, data]) => ({
            pageUrl,
            views: data.views,
            uniqueContacts: data.contacts.size,
          }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 10);
      }

      // Top leads
      const topLeads = (memberContacts || []).slice(0, 8).map(c => ({
        name: `${c.first_name} ${c.last_name}`,
        status: c.workflow_status || "neu",
        score: c.lead_score ? Number(c.lead_score) : null,
      }));

      setSelectedMember({ member, landingPages, topLeads });
    } catch (err) {
      console.error("Error loading member detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSaveChallenge = async () => {
    if (!accountId || !userId) return;
    setSaving(true);
    try {
      if (challenge) {
        const { error } = await supabase
          .from("team_challenges")
          .update({
            name: setupName,
            goal_type: setupGoalType,
            goal_value: setupGoalValue,
            start_date: setupStartDate.toISOString(),
          })
          .eq("id", challenge.id);
        if (error) throw error;
        toast.success("Challenge aktualisiert");
      } else {
        const { error } = await supabase
          .from("team_challenges")
          .insert({
            account_id: accountId,
            name: setupName,
            goal_type: setupGoalType,
            goal_value: setupGoalValue,
            start_date: setupStartDate.toISOString(),
            is_active: true,
          });
        if (error) throw error;
        toast.success("Challenge erstellt!");
      }
      setShowSetup(false);
      setLoading(true);
      await fetchAll();
    } catch (err: any) {
      console.error("Error saving challenge:", err);
      toast.error(err?.message || "Fehler beim Speichern. Wurde die Migration ausgeführt?");
    } finally {
      setSaving(false);
    }
  };

  const toggleChallengeActive = async () => {
    if (!challenge) return;
    const { error } = await supabase
      .from("team_challenges")
      .update({ is_active: !challenge.is_active })
      .eq("id", challenge.id);
    if (error) {
      toast.error("Fehler beim Aktualisieren");
      return;
    }
    toast.success(challenge.is_active ? "Challenge pausiert" : "Challenge fortgesetzt");
    setLoading(true);
    await fetchAll();
  };

  const openEditDialog = () => {
    if (challenge) {
      setSetupName(challenge.name);
      setSetupGoalType(challenge.goal_type);
      setSetupGoalValue(challenge.goal_value);
      setSetupStartDate(new Date(challenge.start_date));
    }
    setShowSetup(true);
  };

  // Sorted members for leaderboard
  const sorted = [...members].sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number));

  // Goal progress
  const goalValue = challenge?.goal_value || 1;
  const goalType = challenge?.goal_type || "connections_sent";
  const totalGoalMetric = members.reduce((sum, m) => sum + goalMetricForMember(m, goalType), 0);
  const goalPct = Math.min((totalGoalMetric / goalValue) * 100, 100);

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-muted-foreground">Lädt Team Arena...</div>
        </div>
      </>
    );
  }

  // ========== SETUP SCREEN ==========
  if (!challenge) {
    return (
      <>
        <div className="min-h-[70vh] flex items-center justify-center">
          <Card className="max-w-lg w-full border-dashed border-2 border-border">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                <Trophy className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">Team Challenge starten</h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Erstelle eine Challenge für dein Team. Setzt euch ein gemeinsames Ziel und seht, wer die besten Ergebnisse liefert.
                </p>
              </div>
              <Button onClick={() => setShowSetup(true)} size="lg" className="gap-2">
                <Rocket className="w-4 h-4" />
                Challenge erstellen
              </Button>
            </CardContent>
          </Card>

          {/* Team Management on setup screen */}
          <div className="max-w-lg w-full mx-auto mt-6">
            <TeamInvite />
          </div>
        </div>

        <SetupDialog
          open={showSetup}
          onClose={() => setShowSetup(false)}
          name={setupName}
          setName={setSetupName}
          goalType={setupGoalType}
          setGoalType={setSetupGoalType}
          goalValue={setupGoalValue}
          setGoalValue={setSetupGoalValue}
          startDate={setupStartDate}
          setStartDate={setSetupStartDate}
          saving={saving}
          onSave={handleSaveChallenge}
          isEdit={false}
        />
      </>
    );
  }

  // ========== PAUSED SCREEN ==========
  if (!challenge.is_active) {
    return (
      <>
        <div className="min-h-[70vh] flex items-center justify-center">
          <Card className="max-w-lg w-full">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto">
                <Pause className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">{challenge.name}</h2>
                <p className="text-sm text-muted-foreground">Diese Challenge ist pausiert.</p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button onClick={toggleChallengeActive} className="gap-2">
                  <Play className="w-4 h-4" />
                  Fortsetzen
                </Button>
                <Button variant="outline" onClick={openEditDialog} className="gap-2">
                  <Pencil className="w-4 h-4" />
                  Bearbeiten
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <SetupDialog
          open={showSetup}
          onClose={() => setShowSetup(false)}
          name={setupName}
          setName={setSetupName}
          goalType={setupGoalType}
          setGoalType={setSetupGoalType}
          goalValue={setupGoalValue}
          setGoalValue={setSetupGoalValue}
          startDate={setupStartDate}
          setStartDate={setSetupStartDate}
          saving={saving}
          onSave={handleSaveChallenge}
          isEdit
        />
      </>
    );
  }

  // ========== ACTIVE CHALLENGE ==========
  return (
    <>
      <div className="min-h-screen noise-bg">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-400" />
                {challenge.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {members.length} Teammitglieder · seit {format(new Date(challenge.start_date), "dd. MMM yyyy", { locale: de })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400 animate-pulse" />
              <span className="text-sm font-semibold text-orange-400 hidden sm:inline">Challenge aktiv</span>
              <Button variant="ghost" size="icon" onClick={openEditDialog} className="h-8 w-8">
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleChallengeActive} className="h-8 w-8">
                <Pause className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowHelp(true)} className="h-8 w-8">
                <HelpCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Shared Goal Progress */}
          <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-400" />
                  <span className="font-semibold">Team-Ziel: {goalValue.toLocaleString()} {goalTypeLabel(goalType)}</span>
                </div>
                <span className="text-2xl font-bold text-amber-400">
                  {totalGoalMetric.toLocaleString()} <span className="text-sm text-muted-foreground font-normal">/ {goalValue.toLocaleString()}</span>
                </span>
              </div>

              {/* Segmented progress bar */}
              <div className="relative h-6 bg-muted rounded-full overflow-hidden">
                <div className="absolute inset-0 flex">
                  {sorted.map((member, idx) => {
                    const memberVal = goalMetricForMember(member, goalType);
                    const memberPct = goalValue > 0 ? (memberVal / goalValue) * 100 : 0;
                    return (
                      <div
                        key={member.id}
                        className={`${MEMBER_COLORS[idx % MEMBER_COLORS.length]} transition-all duration-700 h-full first:rounded-l-full last:rounded-r-full`}
                        style={{ width: `${memberPct}%` }}
                        title={`${member.name}: ${memberVal}`}
                      />
                    );
                  })}
                </div>
                {goalPct >= 100 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-white drop-shadow">ZIEL ERREICHT!</span>
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-3">
                {sorted.map((member, idx) => (
                  <div key={member.id} className="flex items-center gap-1.5 text-xs">
                    <div className={`w-3 h-3 rounded-full ${MEMBER_COLORS[idx % MEMBER_COLORS.length]}`} />
                    <span className="text-muted-foreground">{member.name}</span>
                    <span className="font-semibold">{goalMetricForMember(member, goalType)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Appointments from Pool */}
          {sorted.some(m => m.appointmentsBooked > 0) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {sorted.map((member, idx) => (
                <Card key={member.id} className={member.appointmentsBooked === Math.max(...sorted.map(m => m.appointmentsBooked)) && member.appointmentsBooked > 0 ? "border-pink-500/30" : ""}>
                  <CardContent className="pt-4 text-center">
                    <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-xs font-bold text-white ${MEMBER_COLORS[idx % MEMBER_COLORS.length]}`}>
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : member.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{member.name}</p>
                    <p className="text-2xl font-bold text-pink-400">{member.appointmentsBooked}</p>
                    <p className="text-[10px] text-muted-foreground">Termine gebucht</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Leaderboard */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  Leaderboard
                </CardTitle>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortMetric)}
                  className="text-xs bg-secondary border border-border rounded-lg px-3 py-1.5 text-foreground"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sorted.map((member, idx) => {
                  const trend = trends.find(t => t.id === member.id);
                  return (
                    <div
                      key={member.id}
                      onClick={() => openMemberDetail(member)}
                      className={`flex items-center gap-4 p-3 rounded-xl transition-all cursor-pointer hover:ring-1 hover:ring-ring/30 ${
                        idx === 0
                          ? "bg-gradient-to-r from-amber-500/15 to-amber-500/5 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                          : "bg-muted/50 border border-border/50"
                      }`}
                    >
                      <div className="w-8 flex justify-center shrink-0">
                        {rankBadge(idx)}
                      </div>

                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${MEMBER_COLORS[idx % MEMBER_COLORS.length]}`}>
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          member.name.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{member.name}</span>
                          {idx === 0 && <Badge className="text-[9px] bg-amber-500/20 text-amber-400 border-amber-500/30 px-1.5">MVP</Badge>}
                          {roleBadge(member.role)}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{member.totalLeads} Leads zugewiesen</span>
                      </div>

                      <div className="hidden md:grid grid-cols-6 gap-4 text-center">
                        <StatCell label="Vernetzt" value={member.connectionsSent} trend={trend ? trendIcon(member.connectionsSent, trend.connectionsSentPrev) : null} />
                        <StatCell label="Annahme" value={`${member.acceptanceRate}%`} highlight={member.acceptanceRate >= 50} />
                        <StatCell label="Nachrichten" value={member.messagesSent} trend={trend ? trendIcon(member.messagesSent, trend.messagesSentPrev) : null} />
                        <StatCell label="Antwortrate" value={`${member.replyRate}%`} highlight={member.replyRate >= 30} />
                        <StatCell label="Positive" value={member.positiveReplies} trend={trend ? trendIcon(member.positiveReplies, trend.positiveRepliesPrev) : null} />
                        <StatCell label="Termine" value={member.appointmentsBooked} highlight={member.appointmentsBooked > 0} trend={trend ? trendIcon(member.appointmentsBooked, trend.appointmentsBookedPrev) : null} />
                      </div>

                      <div className="flex md:hidden items-center gap-3 text-xs">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{member.connectionsSent}</span>
                        <span className="flex items-center gap-1 text-green-400"><TrendingUp className="w-3 h-3" />{member.positiveReplies}</span>
                        <span className="flex items-center gap-1 text-pink-400"><Calendar className="w-3 h-3" />{member.appointmentsBooked}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Bottom Row: Member Cards + Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sorted.map((member, idx) => {
                const isTop = idx === 0;
                return (
                  <Card key={member.id} className={isTop ? "border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.08)]" : ""}>
                    <CardContent className="pt-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white ${MEMBER_COLORS[idx % MEMBER_COLORS.length]}`}>
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            member.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{member.name}</span>
                            {isTop && <Crown className="w-4 h-4 text-amber-400" />}
                          </div>
                          <span className="text-xs text-muted-foreground">Platz {idx + 1}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <MiniStat icon={<Users className="w-3.5 h-3.5 text-blue-400" />} label="Vernetzungen" value={member.connectionsSent} />
                        <MiniStat icon={<Zap className="w-3.5 h-3.5 text-amber-400" />} label="Annahmerate" value={`${member.acceptanceRate}%`} />
                        <MiniStat icon={<MessageSquare className="w-3.5 h-3.5 text-purple-400" />} label="Nachrichten" value={member.messagesSent} />
                        <MiniStat icon={<TrendingUp className="w-3.5 h-3.5 text-green-400" />} label="Antwortrate" value={`${member.replyRate}%`} />
                        <MiniStat icon={<Target className="w-3.5 h-3.5 text-emerald-400" />} label="Positive" value={member.positiveReplies} />
                        <MiniStat icon={<Calendar className="w-3.5 h-3.5 text-pink-400" />} label="Termine" value={member.appointmentsBooked} />
                        <MiniStat icon={<Phone className="w-3.5 h-3.5 text-cyan-400" />} label="Calls heute" value={member.callsToday} />
                        <MiniStat icon={<Phone className="w-3.5 h-3.5 text-cyan-400" />} label="Calls Woche" value={member.callsWeek} />
                        <MiniStat icon={<Target className="w-3.5 h-3.5 text-orange-400" />} label="Link-Klicks" value={member.linkClicks} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Activity Feed */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Live-Feed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {activities.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Noch keine Aktivitäten</p>
                  )}
                  {activities.map(a => (
                    <div key={a.id} className="flex items-start gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div>
                        <span className="font-medium">{a.userName}</span>
                        <span className="text-muted-foreground">
                          {" "}{activityLabel(a.type, a.outcome)}
                          {a.contactName && <> mit <span className="text-foreground">{a.contactName}</span></>}
                        </span>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {timeAgo(a.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Team Management */}
      <TeamInvite />

      {/* Member Detail Sheet */}
      <Sheet open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedMember && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${MEMBER_COLORS[sorted.findIndex(m => m.id === selectedMember.member.id) % MEMBER_COLORS.length]}`}>
                    {selectedMember.member.avatarUrl ? (
                      <img src={selectedMember.member.avatarUrl} alt={selectedMember.member.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      selectedMember.member.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      {selectedMember.member.name}
                      {roleBadge(selectedMember.member.role)}
                    </div>
                    <p className="text-xs text-muted-foreground font-normal">{selectedMember.member.totalLeads} Leads</p>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <MiniStat icon={<Users className="w-3.5 h-3.5 text-blue-400" />} label="Vernetzt" value={selectedMember.member.connectionsSent} />
                  <MiniStat icon={<Zap className="w-3.5 h-3.5 text-amber-400" />} label="Annahme" value={`${selectedMember.member.acceptanceRate}%`} />
                  <MiniStat icon={<Calendar className="w-3.5 h-3.5 text-pink-400" />} label="Termine" value={selectedMember.member.appointmentsBooked} />
                </div>

                {/* Landing Pages Breakdown */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-amber-400" />
                    Top Landing Pages
                  </h4>
                  {loadingDetail ? (
                    <p className="text-xs text-muted-foreground animate-pulse">Lädt...</p>
                  ) : selectedMember.landingPages.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Noch keine Landing-Page-Besuche</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedMember.landingPages.map((lp, i) => {
                        const maxViews = selectedMember.landingPages[0]?.views || 1;
                        const barPct = (lp.views / maxViews) * 100;
                        return (
                          <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="truncate text-muted-foreground max-w-[200px]" title={lp.pageUrl}>{lp.pageUrl}</span>
                              <span className="font-semibold shrink-0 ml-2">{lp.views} Views / {lp.uniqueContacts} Leads</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500/60 rounded-full transition-all" style={{ width: `${barPct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Top Leads */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-400" />
                    Top Leads
                  </h4>
                  {selectedMember.topLeads.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Noch keine Leads</p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedMember.topLeads.map((lead, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
                          <span className="font-medium">{lead.name}</span>
                          <div className="flex items-center gap-2">
                            <WorkflowBadge status={lead.status} />
                            {lead.score != null && (
                              <span className={`font-bold ${lead.score >= 70 ? "text-orange-400" : lead.score >= 30 ? "text-amber-400" : "text-muted-foreground"}`}>
                                {lead.score}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <SetupDialog
        open={showSetup}
        onClose={() => setShowSetup(false)}
        name={setupName}
        setName={setSetupName}
        goalType={setupGoalType}
        setGoalType={setSetupGoalType}
        goalValue={setupGoalValue}
        setGoalValue={setSetupGoalValue}
        startDate={setupStartDate}
        setStartDate={setSetupStartDate}
        saving={saving}
        onSave={handleSaveChallenge}
        isEdit
      />

      {/* Help Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Hilfe – Team Arena
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h3 className="font-semibold text-foreground mb-1">Was ist die Team Arena?</h3>
              <p>Die Team Arena zeigt die Leistung deines gesamten Teams auf einen Blick. Jedes Teammitglied arbeitet mit demselben Lead-Pool, hat aber eine <strong className="text-foreground">eigenständige Ansicht</strong>. Das bedeutet: Wenn du dich mit einem Lead vernetzt, bleibt dieser Lead für deine Kollegen weiterhin unberührt.</p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-1">Leaderboard & Statistiken</h3>
              <p>Das Leaderboard zeigt folgende Kennzahlen pro Teammitglied:</p>
              <ul className="list-disc list-inside space-y-1 mt-1 ml-2">
                <li><strong className="text-foreground">Vernetzungen</strong> – Anzahl gesendeter Vernetzungsanfragen</li>
                <li><strong className="text-foreground">Annahmerate</strong> – Prozent der angenommenen Anfragen</li>
                <li><strong className="text-foreground">Nachrichten</strong> – Gesendete Erstnachrichten & Follow-ups</li>
                <li><strong className="text-foreground">Antwortrate</strong> – Prozent der Leads, die reagiert haben</li>
                <li><strong className="text-foreground">Positive Antworten</strong> – Leads mit Interesse</li>
                <li><strong className="text-foreground">Termine</strong> – Gebuchte Termine</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-1">Team Challenge</h3>
              <p>Der Admin kann ein gemeinsames Ziel setzen (z.B. „8.000 Vernetzungen"). Der farbige Fortschrittsbalken zeigt den Beitrag jedes Mitglieds zum Gesamtziel. Das Startdatum bestimmt, ab wann Aktivitäten gezählt werden.</p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-1">Eigenständige Leads</h3>
              <p>Jeder im Team sieht alle Leads, aber dein Fortschritt (z.B. „vernetzt", „Nachricht gesendet") wird <strong className="text-foreground">nur für dich</strong> getrackt. Deine Kollegen können sich unabhängig mit denselben Leads vernetzen.</p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-1">Sortierung & Detail-Ansicht</h3>
              <p>Nutze das Dropdown oben rechts, um das Leaderboard nach verschiedenen Metriken zu sortieren. Klicke auf ein Teammitglied, um dessen Detail-Ansicht mit Top-Leads und Landing-Page-Statistiken zu öffnen.</p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-1">Buttons im Header</h3>
              <ul className="list-disc list-inside space-y-1 mt-1 ml-2">
                <li><Pencil className="w-3 h-3 inline mr-1" /> Challenge bearbeiten (Name, Ziel, Startdatum)</li>
                <li><Pause className="w-3 h-3 inline mr-1" /> Challenge pausieren/fortsetzen</li>
                <li><HelpCircle className="w-3 h-3 inline mr-1" /> Diese Hilfe anzeigen</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// --- Sub-components ---

function SetupDialog({
  open, onClose, name, setName, goalType, setGoalType, goalValue, setGoalValue, startDate, setStartDate, saving, onSave, isEdit,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  setName: (v: string) => void;
  goalType: string;
  setGoalType: (v: string) => void;
  goalValue: number;
  setGoalValue: (v: number) => void;
  startDate: Date;
  setStartDate: (v: Date) => void;
  saving: boolean;
  onSave: () => void;
  isEdit: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            {isEdit ? "Challenge bearbeiten" : "Neue Challenge erstellen"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Challenge-Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Q2 Vernetzungs-Sprint"
            />
          </div>

          <div className="space-y-2">
            <Label>Ziel-Metrik</Label>
            <select
              value={goalType}
              onChange={(e) => setGoalType(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground"
            >
              {GOAL_TYPES.map(g => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Zielwert (Team gesamt)</Label>
            <Input
              type="number"
              min={1}
              value={goalValue}
              onChange={(e) => setGoalValue(parseInt(e.target.value) || 0)}
              placeholder="z.B. 2000"
            />
            <p className="text-xs text-muted-foreground">
              Dieses Ziel wird auf alle Teammitglieder verteilt angezeigt.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Startdatum (nur Kontakte ab diesem Datum zählen)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd. MMM yyyy", { locale: de }) : "Datum wählen"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={(d) => d && setStartDate(d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Alle Statistiken werden erst ab diesem Datum gezählt, sodass du bei 0 startest.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button onClick={onSave} disabled={saving || !name || goalValue < 1} className="gap-2">
            {saving ? "Speichert..." : isEdit ? "Speichern" : "Challenge starten"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatCell({ label, value, highlight, trend }: { label: string; value: string | number; highlight?: boolean; trend?: React.ReactNode }) {
  return (
    <div className="min-w-[70px]">
      <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
      <div className="flex items-center justify-center gap-1">
        <span className={`text-sm font-bold ${highlight ? "text-green-400" : ""}`}>{value}</span>
        {trend}
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
      {icon}
      <div>
        <div className="text-[10px] text-muted-foreground leading-none">{label}</div>
        <div className="text-sm font-bold leading-tight">{value}</div>
      </div>
    </div>
  );
}

function activityLabel(type: string, outcome: string | null): string {
  const labels: Record<string, string> = {
    call: "hat angerufen",
    email: "hat gemailt",
    dm: "hat geschrieben",
    meeting: "hatte Meeting",
    note: "hat Notiz erstellt",
  };
  const outcomeLabels: Record<string, string> = {
    reached: "(erreicht)",
    interested: "(interessiert)",
    not_interested: "(kein Interesse)",
    no_answer: "(nicht erreicht)",
    callback: "(Rückruf)",
  };
  return `${labels[type] || type} ${outcome ? outcomeLabels[outcome] || "" : ""}`;
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "gerade eben";
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days > 1 ? "en" : ""}`;
}

function WorkflowBadge({ status }: { status: string }) {
  const labels: Record<string, { text: string; color: string }> = {
    neu: { text: "Neu", color: "bg-slate-500/20 text-slate-400" },
    bereit_fuer_vernetzung: { text: "Bereit", color: "bg-blue-500/20 text-blue-400" },
    vernetzung_ausstehend: { text: "Ausstehend", color: "bg-cyan-500/20 text-cyan-400" },
    vernetzung_angenommen: { text: "Vernetzt", color: "bg-emerald-500/20 text-emerald-400" },
    erstnachricht_gesendet: { text: "DM gesendet", color: "bg-purple-500/20 text-purple-400" },
    fu1_gesendet: { text: "FU1", color: "bg-purple-500/20 text-purple-400" },
    fu2_gesendet: { text: "FU2", color: "bg-purple-500/20 text-purple-400" },
    fu3_gesendet: { text: "FU3", color: "bg-purple-500/20 text-purple-400" },
    reagiert_warm: { text: "Warm", color: "bg-orange-500/20 text-orange-400" },
    positiv_geantwortet: { text: "Positiv", color: "bg-green-500/20 text-green-400" },
    termin_gebucht: { text: "Termin", color: "bg-pink-500/20 text-pink-400" },
    abgeschlossen: { text: "Abgeschlossen", color: "bg-amber-500/20 text-amber-400" },
  };
  const info = labels[status] || { text: status, color: "bg-muted text-muted-foreground" };
  return <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${info.color}`}>{info.text}</span>;
}
