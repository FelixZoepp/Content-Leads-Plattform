import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function useCashflowDay() {
  const { user } = useAuth();
  const [dayNumber, setDayNumber] = useState(1);
  const [phase, setPhase] = useState<"setup" | "kontinuität" | "vertrieb">("setup");

  useEffect(() => {
    if (!user) return;
    const createdAt = new Date(user.created_at);
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const day = Math.max(1, Math.min(90, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1));
    setDayNumber(day);
    if (day <= 21) setPhase("setup");
    else if (day <= 63) setPhase("kontinuität");
    else setPhase("vertrieb");
  }, [user]);

  return { dayNumber, phase };
}

export function useDailyTasks(dayNumber: number) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("daily_tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("day_number", dayNumber)
      .order("created_at");
    setTasks(data || []);
    setLoading(false);
  }, [user, dayNumber]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const toggleTask = async (taskId: string, completed: boolean) => {
    await (supabase as any)
      .from("daily_tasks")
      .update({ completed: !completed })
      .eq("id", taskId);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  return { tasks, loading, toggleTask, reload: loadTasks };
}

export function useGeneratedAssets() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAssets = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("generated_assets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at");
    setAssets(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  return { assets, loading, reload: loadAssets };
}

export function useKpiEntries(days = 7) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("kpi_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(days);
    setEntries(data || []);
    setLoading(false);
  }, [user, days]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  return { entries, loading, reload: loadEntries };
}

export function usePhaseProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState({ phase1: 0, phase2: 0, phase3: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
    const { data } = await (supabase as any)
        .from("daily_tasks")
        .select("day_number, completed")
        .eq("user_id", user.id);

      if (data) {
        const calc = (min: number, max: number) => {
          const tasks = data.filter((t) => t.day_number >= min && t.day_number <= max);
          if (tasks.length === 0) return 0;
          return Math.round((tasks.filter((t) => t.completed).length / tasks.length) * 100);
        };
        setProgress({
          phase1: calc(1, 21),
          phase2: calc(22, 63),
          phase3: calc(64, 90),
        });
      }
      setLoading(false);
    })();
  }, [user]);

  return { progress, loading };
}

export const ASSET_TYPES = [
  { key: "fahrplan", label: "90-Tage Fahrplan", path: "/dashboard/assets/fahrplan" },
  { key: "positionierung", label: "Positionierung", path: "/dashboard/assets/positionierung" },
  { key: "linkedin_profil", label: "LinkedIn Profil", path: "/dashboard/assets/linkedin-profil" },
  { key: "outreach_dms", label: "Outreach DMs", path: "/dashboard/assets/outreach-dms" },
  { key: "cold_mails", label: "Cold Mails", path: "/dashboard/assets/cold-mails" },
  { key: "mail_sequenz", label: "Mail-Sequenz", path: "/dashboard/assets/mail-sequenz" },
  { key: "funnel", label: "Funnel & Texte", path: "/dashboard/assets/funnel" },
  { key: "leadmagnet_1", label: "Leadmagnet 1 (ToFu)", path: "/dashboard/assets/leadmagnet-1" },
  { key: "leadmagnet_2", label: "Leadmagnet 2 (MoFu)", path: "/dashboard/assets/leadmagnet-2" },
  { key: "leadmagnet_3", label: "Leadmagnet 3 (BoFu)", path: "/dashboard/assets/leadmagnet-3" },
  { key: "opening_skript", label: "Opening-Skript", path: "/dashboard/assets/opening-skript" },
  { key: "setting_skript", label: "Setting-Skript", path: "/dashboard/assets/setting-skript" },
  { key: "closing_skript", label: "Closing-Skript", path: "/dashboard/assets/closing-skript" },
  { key: "linkedin_captions", label: "LinkedIn Captions", path: "/dashboard/assets/linkedin-captions" },
] as const;

export type AssetTypeKey = (typeof ASSET_TYPES)[number]["key"];
