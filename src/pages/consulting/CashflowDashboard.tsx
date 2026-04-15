import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, Circle, MessageSquare, Mail, Calendar, FileText,
  TrendingUp, Percent, Target, Briefcase, Loader2, Dumbbell, ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  useCashflowDay,
  useDailyTasks,
  useGeneratedAssets,
  useKpiEntries,
  usePhaseProgress,
  ASSET_TYPES,
} from "@/hooks/useCashflowData";

const phaseLabels = {
  setup: "Phase 1: Setup (Tag 1-21)",
  kontinuität: "Phase 2: Execution (Tag 22-63)",
  vertrieb: "Phase 3: Optimierung (Tag 64-90)",
} as const;

const phaseColors = {
  setup: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  kontinuität: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  vertrieb: "bg-green-500/15 text-green-400 border-green-500/30",
} as const;

export default function CashflowDashboard() {
  const navigate = useNavigate();
  const { dayNumber, phase } = useCashflowDay();
  const { tasks, loading: tasksLoading, toggleTask } = useDailyTasks(dayNumber);
  const { assets, loading: assetsLoading } = useGeneratedAssets();
  const { entries } = useKpiEntries(7);
  const { progress, loading: progressLoading } = usePhaseProgress();

  // KPI calculations from last 7 days
  const totalDms = entries.reduce((s, e) => s + (e.dms_sent || 0), 0);
  const totalDmReplies = entries.reduce((s, e) => s + (e.dm_replies || 0), 0);
  const replyRate = totalDms > 0 ? Math.round((totalDmReplies / totalDms) * 100) : 0;
  const totalTermine = entries.reduce((s, e) => s + (e.termine || 0), 0);
  const totalProposals = entries.reduce((s, e) => s + (e.proposals || 0), 0);

  const assetMap = new Map(assets.map((a) => [a.asset_type, a]));

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Header: Day counter + Phase Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Tag {dayNumber} von 90
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Dein Fortschritt in der Cashflow Offensive
          </p>
        </div>
        <Badge variant="outline" className={`${phaseColors[phase]} px-3 py-1 text-xs font-medium`}>
          {phaseLabels[phase]}
        </Badge>
      </motion.div>

      {/* 4 Metric Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        {[
          { label: "DMs gesendet", value: totalDms, icon: MessageSquare, color: "text-blue-400" },
          { label: "Ø Antwortrate", value: `${replyRate}%`, icon: Percent, color: "text-emerald-400" },
          { label: "Termine diese Woche", value: totalTermine, icon: Calendar, color: "text-amber-400" },
          { label: "Proposals in Pipeline", value: totalProposals, icon: Briefcase, color: "text-purple-400" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border/50 bg-card p-4 flex flex-col gap-2"
          >
            <card.icon className={`h-4 w-4 ${card.color}`} />
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Daily Tasks + Assets side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border/50 bg-card p-5"
        >
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Heutige Aufgaben (Tag {dayNumber})
          </h2>
          {tasksLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                Noch keine Aufgaben für heute.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Generiere zuerst deinen 90-Tage Fahrplan.
              </p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => navigate("/dashboard/assets/fahrplan")}
              >
                Fahrplan generieren
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => toggleTask(task.id, task.completed)}
                  className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                >
                  {task.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className={`text-sm ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {task.task_text}
                    </p>
                    <p className="text-[10px] text-muted-foreground capitalize">{task.category}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Assets Overview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-border/50 bg-card p-5"
        >
          <h2 className="text-sm font-semibold text-foreground mb-3">Deine Assets</h2>
          {assetsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-1.5">
              {ASSET_TYPES.map((at) => {
                const generated = assetMap.has(at.key);
                return (
                  <button
                    key={at.key}
                    onClick={() => navigate(at.path)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-foreground">{at.label}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        generated
                          ? "bg-green-500/15 text-green-400 border-green-500/30 text-[10px]"
                          : "bg-muted text-muted-foreground border-border text-[10px]"
                      }
                    >
                      {generated ? "Generiert" : "Ausstehend"}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Daily Training */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-[#534AB7]/30 bg-[#534AB7]/5 p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#534AB7]/15 flex items-center justify-center">
              <Dumbbell className="h-5 w-5 text-[#534AB7]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Tägliches Vertriebstraining</h2>
              <p className="text-xs text-muted-foreground">Übe Einwandbehandlung mit KI-Roleplay</p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-[#534AB7] hover:bg-[#4339a0]"
            onClick={() => {
              const icp = "einem potenziellen Kunden";
              const url = `https://claude.ai/new?q=${encodeURIComponent(`Du bist ein schwieriger ${icp} der sagt "Zu teuer". Ich übe mein Closing-Skript. Fang das Gespräch an und gib mir nach meiner Antwort Feedback.`)}`;
              window.open(url, "_blank");
            }}
          >
            Training starten
            <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
      </motion.div>

      {/* Phase Progress */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-xl border border-border/50 bg-card p-5"
      >
        <h2 className="text-sm font-semibold text-foreground mb-4">Phasen-Fortschritt</h2>
        {progressLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {[
              { label: "Phase 1: Setup (Tag 1-21)", value: progress.phase1, color: "bg-blue-500" },
              { label: "Phase 2: Execution (Tag 22-63)", value: progress.phase2, color: "bg-amber-500" },
              { label: "Phase 3: Optimierung (Tag 64-90)", value: progress.phase3, color: "bg-green-500" },
            ].map((p) => (
              <div key={p.label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{p.label}</p>
                  <p className="text-xs font-medium text-foreground">{p.value}%</p>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${p.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${p.value}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
