import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import {
  TrendingUp,
  Users,
  Target,
  Flame,
  CheckCircle2,
  RefreshCw,
  ArrowDown,
  Calendar,
  ThumbsUp,
  MessageSquare,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CampaignStatisticsProps {
  campaignId: string;
  campaignName: string;
}

interface WorkflowStats {
  total: number;
  neu: number;
  bereit_fuer_vernetzung: number;
  vernetzung_ausstehend: number;
  vernetzung_angenommen: number;
  erstnachricht_gesendet: number;
  fu1_gesendet: number;
  fu2_gesendet: number;
  fu3_gesendet: number;
  reagiert_warm: number;
  positiv_geantwortet: number;
  termin_gebucht: number;
  abgeschlossen: number;
  hotLeads: number;
}

export function CampaignStatistics({ campaignId, campaignName }: CampaignStatisticsProps) {
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);

      const { data: contacts, error } = await supabase
        .from('contacts')
        .select('id, workflow_status, lead_score')
        .eq('campaign_id', campaignId)
        .eq('lead_type', 'outbound');

      if (error) {
        console.error("Error fetching stats:", error);
        setLoading(false);
        return;
      }

      const contactList = contacts || [];
      const total = contactList.length;

      const countStatus = (status: string) =>
        contactList.filter(c => c.workflow_status === status).length;

      const hotStatuses = ['reagiert_warm', 'positiv_geantwortet', 'termin_gebucht'];
      const hotLeads = contactList.filter(c =>
        (c.lead_score || 0) >= 70 ||
        hotStatuses.includes(c.workflow_status as string)
      ).length;

      setStats({
        total,
        neu: countStatus('neu'),
        bereit_fuer_vernetzung: countStatus('bereit_fuer_vernetzung'),
        vernetzung_ausstehend: countStatus('vernetzung_ausstehend'),
        vernetzung_angenommen: countStatus('vernetzung_angenommen'),
        erstnachricht_gesendet: countStatus('erstnachricht_gesendet'),
        fu1_gesendet: countStatus('fu1_gesendet'),
        fu2_gesendet: countStatus('fu2_gesendet'),
        fu3_gesendet: countStatus('fu3_gesendet'),
        reagiert_warm: countStatus('reagiert_warm'),
        positiv_geantwortet: countStatus('positiv_geantwortet'),
        termin_gebucht: countStatus('termin_gebucht'),
        abgeschlossen: countStatus('abgeschlossen'),
        hotLeads,
      });
      setLoading(false);
    };

    fetchStats();
  }, [campaignId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Target className="h-12 w-12 mx-auto mb-2" />
        <p>Keine Leads in dieser Kampagne</p>
      </div>
    );
  }

  // Cumulative counts (each stage includes all stages that come after it)
  const connectionsSent = stats.vernetzung_ausstehend + stats.vernetzung_angenommen +
    stats.erstnachricht_gesendet + stats.fu1_gesendet + stats.fu2_gesendet +
    stats.fu3_gesendet + stats.reagiert_warm + stats.positiv_geantwortet +
    stats.termin_gebucht + stats.abgeschlossen;

  const connectionsAccepted = stats.vernetzung_angenommen + stats.erstnachricht_gesendet +
    stats.fu1_gesendet + stats.fu2_gesendet + stats.fu3_gesendet +
    stats.reagiert_warm + stats.positiv_geantwortet + stats.termin_gebucht + stats.abgeschlossen;

  const messagesSent = stats.erstnachricht_gesendet + stats.fu1_gesendet +
    stats.fu2_gesendet + stats.fu3_gesendet + stats.reagiert_warm +
    stats.positiv_geantwortet + stats.termin_gebucht + stats.abgeschlossen;

  const replied = stats.reagiert_warm + stats.positiv_geantwortet +
    stats.termin_gebucht + stats.abgeschlossen;

  const positiveReplies = stats.positiv_geantwortet + stats.termin_gebucht + stats.abgeschlossen;

  const appointmentsBooked = stats.termin_gebucht + stats.abgeschlossen;

  const closed = stats.abgeschlossen;

  // Rates
  const acceptanceRate = connectionsSent > 0 ? (connectionsAccepted / connectionsSent) * 100 : 0;
  const replyRate = messagesSent > 0 ? (replied / messagesSent) * 100 : 0;
  const positiveRate = replied > 0 ? (positiveReplies / replied) * 100 : 0;
  const appointmentRate = stats.total > 0 ? (appointmentsBooked / stats.total) * 100 : 0;
  const closedRate = stats.total > 0 ? (closed / stats.total) * 100 : 0;

  // Waterfall funnel steps
  const waterfallSteps = [
    { label: "Gesamt Leads", value: stats.total, color: "#6366f1", icon: Users },
    { label: "Vernetzung gesendet", value: connectionsSent, color: "#8b5cf6", icon: MessageSquare },
    { label: "Angenommen", value: connectionsAccepted, color: "#10b981", icon: CheckCircle2 },
    { label: "Nachricht gesendet", value: messagesSent, color: "#3b82f6", icon: MessageSquare },
    { label: "Geantwortet", value: replied, color: "#f59e0b", icon: Flame },
    { label: "Positiv geantwortet", value: positiveReplies, color: "#22c55e", icon: ThumbsUp },
    { label: "Termin gebucht", value: appointmentsBooked, color: "#ec4899", icon: Calendar },
    { label: "Abgeschlossen", value: closed, color: "#14b8a6", icon: Target },
  ];

  // Funnel data for bar chart
  const funnelData = waterfallSteps.map(s => ({ name: s.label, value: s.value, fill: s.color }));

  // Status distribution pie
  const statusData = [
    { name: 'Neu / Bereit', value: stats.neu + stats.bereit_fuer_vernetzung, color: '#94a3b8' },
    { name: 'Vernetzung ausstehend', value: stats.vernetzung_ausstehend, color: '#f59e0b' },
    { name: 'Angenommen', value: stats.vernetzung_angenommen, color: '#10b981' },
    { name: 'Nachricht gesendet', value: stats.erstnachricht_gesendet, color: '#8b5cf6' },
    { name: 'Follow-ups', value: stats.fu1_gesendet + stats.fu2_gesendet + stats.fu3_gesendet, color: '#3b82f6' },
    { name: 'Geantwortet', value: stats.reagiert_warm, color: '#f59e0b' },
    { name: 'Positiv', value: stats.positiv_geantwortet, color: '#22c55e' },
    { name: 'Termin', value: stats.termin_gebucht, color: '#ec4899' },
    { name: 'Abgeschlossen', value: stats.abgeschlossen, color: '#14b8a6' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => {
          const rows = waterfallSteps.map(s => ({ Stufe: s.label, Anzahl: s.value, "Prozent vom Gesamt": stats.total > 0 ? ((s.value / stats.total) * 100).toFixed(1) + "%" : "0%" }));
          rows.push({ Stufe: "", Anzahl: 0 as any, "Prozent vom Gesamt": "" });
          rows.push({ Stufe: "Annahme-Rate", Anzahl: acceptanceRate.toFixed(1) + "%" as any, "Prozent vom Gesamt": `${connectionsAccepted}/${connectionsSent}` });
          rows.push({ Stufe: "Antwort-Rate", Anzahl: replyRate.toFixed(1) + "%" as any, "Prozent vom Gesamt": `${replied}/${messagesSent}` });
          rows.push({ Stufe: "Positiv-Rate", Anzahl: positiveRate.toFixed(1) + "%" as any, "Prozent vom Gesamt": `${positiveReplies}/${replied}` });
          rows.push({ Stufe: "Termin-Rate", Anzahl: appointmentRate.toFixed(1) + "%" as any, "Prozent vom Gesamt": `${appointmentsBooked}/${stats.total}` });
          const headers = Object.keys(rows[0]);
          const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${(r as any)[h]}"`).join(","))].join("\n");
          const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url; a.download = `kampagne-report-${campaignName.replace(/\s+/g, "-")}.csv`; a.click();
          URL.revokeObjectURL(url);
          toast.success("Report exportiert");
        }}>
          <Download className="w-4 h-4 mr-2" /> Report exportieren
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Leads</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Annahme</span>
            </div>
            <p className="text-2xl font-bold">{acceptanceRate.toFixed(0)}%</p>
            <p className="text-[10px] text-muted-foreground">{connectionsAccepted}/{connectionsSent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Antwortrate</span>
            </div>
            <p className="text-2xl font-bold">{replyRate.toFixed(0)}%</p>
            <p className="text-[10px] text-muted-foreground">{replied}/{messagesSent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <ThumbsUp className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Positiv-Rate</span>
            </div>
            <p className="text-2xl font-bold">{positiveRate.toFixed(0)}%</p>
            <p className="text-[10px] text-muted-foreground">{positiveReplies}/{replied}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-pink-500" />
              <span className="text-xs text-muted-foreground">Termin-Rate</span>
            </div>
            <p className="text-2xl font-bold">{appointmentRate.toFixed(1)}%</p>
            <p className="text-[10px] text-muted-foreground">{appointmentsBooked}/{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-teal-500" />
              <span className="text-xs text-muted-foreground">Abschluss</span>
            </div>
            <p className="text-2xl font-bold">{closedRate.toFixed(1)}%</p>
            <p className="text-[10px] text-muted-foreground">{closed}/{stats.total}</p>
          </CardContent>
        </Card>
      </div>

      {/* Waterfall Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Waterfall Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {waterfallSteps.map((step, idx) => {
              const prevValue = idx === 0 ? step.value : waterfallSteps[idx - 1].value;
              const dropRate = prevValue > 0 && idx > 0
                ? ((1 - step.value / prevValue) * 100).toFixed(0)
                : null;
              const barWidth = stats.total > 0
                ? Math.max((step.value / stats.total) * 100, step.value > 0 ? 2 : 0)
                : 0;
              const Icon = step.icon;

              return (
                <div key={step.label}>
                  {idx > 0 && dropRate !== null && (
                    <div className="flex items-center gap-2 pl-8 py-0.5">
                      <ArrowDown className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                        {Number(dropRate) > 0 ? `-${dropRate}% Verlust` : "kein Verlust"}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-48 shrink-0">
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                        style={{ backgroundColor: step.color + "22" }}
                      >
                        <Icon className="h-3.5 w-3.5" style={{ color: step.color }} />
                      </div>
                      <span className="text-sm truncate">{step.label}</span>
                    </div>
                    <div className="flex-1 h-8 bg-muted/30 rounded-md overflow-hidden relative">
                      <div
                        className="h-full rounded-md transition-all duration-500"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: step.color,
                          opacity: 0.85,
                        }}
                      />
                      <span className="absolute inset-0 flex items-center pl-3 text-sm font-bold"
                        style={{ color: barWidth > 15 ? "#fff" : "inherit" }}>
                        {step.value}
                      </span>
                    </div>
                    {idx > 0 && (
                      <span className="text-xs text-muted-foreground w-12 text-right shrink-0">
                        {stats.total > 0 ? ((step.value / stats.total) * 100).toFixed(0) : 0}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Funnel-Übersicht
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Status-Verteilung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detaillierte Statistiken</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Neu / Bereit</p>
              <p className="text-xl font-bold">{stats.neu + stats.bereit_fuer_vernetzung}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Vernetzung ausstehend</p>
              <p className="text-xl font-bold">{stats.vernetzung_ausstehend}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Angenommen</p>
              <p className="text-xl font-bold">{stats.vernetzung_angenommen}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Nachricht gesendet</p>
              <p className="text-xl font-bold">{stats.erstnachricht_gesendet}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Follow-ups (1/2/3)</p>
              <p className="text-xl font-bold">{stats.fu1_gesendet}/{stats.fu2_gesendet}/{stats.fu3_gesendet}</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <p className="text-xs text-muted-foreground">Geantwortet</p>
              <p className="text-xl font-bold text-amber-600">{stats.reagiert_warm}</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-xs text-muted-foreground">Positiv geantwortet</p>
              <p className="text-xl font-bold text-green-600">{stats.positiv_geantwortet}</p>
            </div>
            <div className="p-3 bg-pink-500/10 rounded-lg border border-pink-500/20">
              <p className="text-xs text-muted-foreground">Termin gebucht</p>
              <p className="text-xl font-bold text-pink-600">{stats.termin_gebucht}</p>
            </div>
            <div className="p-3 bg-teal-500/10 rounded-lg border border-teal-500/20">
              <p className="text-xs text-muted-foreground">Abgeschlossen</p>
              <p className="text-xl font-bold text-teal-600">{stats.abgeschlossen}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
