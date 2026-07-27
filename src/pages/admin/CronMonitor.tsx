import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Loader2, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface CronJob {
  name: string;
  description: string;
  edgeFunction: string;
  schedule: string;
  lastRun: string | null;
  status: "idle" | "running" | "done" | "error";
}

const CRON_JOBS: CronJob[] = [
  { name: "HeyReach Sync", description: "Outreach-Metriken von HeyReach importieren", edgeFunction: "sync-heyreach", schedule: "Alle 6 Stunden", lastRun: null, status: "idle" },
  { name: "Kennzahlen-Erinnerung", description: "E-Mail an Kunden ohne heutige Einträge", edgeFunction: "metric-reminder", schedule: "Täglich 18:00", lastRun: null, status: "idle" },
  { name: "Content Factory", description: "Wöchentliche Post-Generierung für alle Kunden", edgeFunction: "weekly-content", schedule: "Sonntag 20:00", lastRun: null, status: "idle" },
  { name: "AI Concierge", description: "Health-Scores und Insights berechnen", edgeFunction: "ai-concierge", schedule: "Wöchentlich", lastRun: null, status: "idle" },
  { name: "Health Scores", description: "Kunden-Gesundheit neu berechnen", edgeFunction: "calculate-health", schedule: "Wöchentlich", lastRun: null, status: "idle" },
  { name: "Umfrage-Erinnerung", description: "Erinnerungen für offene Umfragen", edgeFunction: "survey-reminder", schedule: "Täglich 10:00", lastRun: null, status: "idle" },
];

export default function CronMonitor() {
  const nav = useNavigate();
  const [jobs, setJobs] = useState(CRON_JOBS);
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

  async function triggerJob(jobName: string, edgeFunction: string) {
    setRunning(jobName);
    setJobs(prev => prev.map(j => j.name === jobName ? { ...j, status: "running" as const } : j));

    try {
      const { data, error } = await supabase.functions.invoke(edgeFunction, { body: {} });
      const resultText = error ? `Fehler: ${error.message}` : JSON.stringify(data, null, 2);
      setResults(prev => ({ ...prev, [jobName]: resultText }));
      setJobs(prev => prev.map(j => j.name === jobName ? { ...j, status: error ? "error" : "done", lastRun: new Date().toISOString() } : j));
    } catch (err: any) {
      setResults(prev => ({ ...prev, [jobName]: `Fehler: ${err.message}` }));
      setJobs(prev => prev.map(j => j.name === jobName ? { ...j, status: "error" } : j));
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <button onClick={() => nav("/dashboard/admin")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition mb-2">
          <ArrowLeft className="w-4 h-4" /> Admin Dashboard
        </button>
        <h1 className="text-2xl font-bold text-white">Cron-Jobs</h1>
        <p className="text-sm text-gray-400 mt-1">Manuelle Auslösung und Status der automatisierten Jobs</p>
      </div>

      <div className="space-y-3">
        {jobs.map(job => (
          <div key={job.name} className="glass-panel">
            <div className="relative z-[2]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: job.status === "error" ? "rgba(232,116,103,0.15)" : job.status === "done" ? "rgba(127,194,155,0.15)" : "rgba(197,160,89,0.15)" }}>
                  {job.status === "running" ? <Loader2 className="w-5 h-5 animate-spin text-[#E9CB8B]" /> :
                   job.status === "done" ? <CheckCircle2 className="w-5 h-5 text-[#7FC29B]" /> :
                   job.status === "error" ? <AlertCircle className="w-5 h-5 text-[#E87467]" /> :
                   <Clock className="w-5 h-5 text-[#E9CB8B]" />}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-white">{job.name}</div>
                  <div className="text-[11px] text-[rgba(249,249,249,0.4)]">{job.description}</div>
                  <div className="flex gap-3 mt-1">
                    <span className="text-[10px] text-[rgba(249,249,249,0.3)]">{job.schedule}</span>
                    {job.lastRun && <span className="text-[10px] text-[rgba(249,249,249,0.3)]">Letzter Lauf: {new Date(job.lastRun).toLocaleString("de-DE")}</span>}
                  </div>
                </div>
                <button
                  onClick={() => triggerJob(job.name, job.edgeFunction)}
                  disabled={running !== null}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg, #C5A059, #775A19)", color: "#fff" }}
                >
                  <Play className="w-3.5 h-3.5" /> Jetzt ausführen
                </button>
              </div>

              {results[job.name] && (
                <div className="mt-3 p-3 rounded-lg bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.06)]">
                  <pre className="text-[11px] text-[rgba(249,249,249,0.5)] whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">{results[job.name]}</pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
