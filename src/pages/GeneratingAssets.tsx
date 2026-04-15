import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Check, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ASSET_TYPES } from "@/hooks/useCashflowData";

type AssetStatus = "pending" | "generating" | "done" | "error";

export default function GeneratingAssets() {
  const navigate = useNavigate();
  const { user, tenantId } = useAuth();
  const { toast } = useToast();
  const startedRef = useRef(false);
  const [statuses, setStatuses] = useState<Record<string, AssetStatus>>(
    Object.fromEntries(ASSET_TYPES.map((a) => [a.key, "pending"]))
  );

  const updateStatus = (key: string, status: AssetStatus) => {
    setStatuses((prev) => ({ ...prev, [key]: status }));
  };

  useEffect(() => {
    if (!user || !tenantId || startedRef.current) return;
    startedRef.current = true;

    (async () => {
      // Fetch user profile
      const { data: profile } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .single();

      const userProfile = profile || {};

      // Generate all assets in parallel
      const promises = ASSET_TYPES.map(async (asset) => {
        updateStatus(asset.key, "generating");
        try {
          const { data, error } = await supabase.functions.invoke("generate-asset", {
            body: { assetType: asset.key, userProfile },
          });

          if (error || data?.error) {
            updateStatus(asset.key, "error");
            return;
          }

          // Save to generated_assets
          await (supabase as any).from("generated_assets").insert({
            user_id: user.id,
            asset_type: asset.key,
            content: data.content,
          });

          // If it's the fahrplan, parse and save daily tasks
          if (asset.key === "fahrplan") {
            try {
              const jsonMatch = data.content.match(/\{[\s\S]*"wochen"[\s\S]*\}/);
              if (jsonMatch) {
                const plan = JSON.parse(jsonMatch[0]);
                const taskRows: any[] = [];
                const dayNames = ["mo", "di", "mi", "do", "fr"];
                for (const woche of plan.wochen || []) {
                  const weekNum = woche.woche || 1;
                  const aufgaben = woche.aufgaben || {};
                  dayNames.forEach((dayKey, idx) => {
                    const dayNumber = (weekNum - 1) * 5 + idx + 1;
                    const tasks = aufgaben[dayKey] || [];
                    for (const taskText of tasks) {
                      taskRows.push({
                        user_id: user.id,
                        day_number: Math.min(dayNumber, 90),
                        task_text: typeof taskText === "string" ? taskText : taskText.text || String(taskText),
                        category: woche.phase || "allgemein",
                      });
                    }
                  });
                }
                if (taskRows.length > 0) {
                  // Insert in batches of 50 to avoid payload limits
                  for (let i = 0; i < taskRows.length; i += 50) {
                    await (supabase as any).from("daily_tasks").insert(taskRows.slice(i, i + 50));
                  }
                }
              }
            } catch {
              // Fahrplan parsing failed, non-blocking
            }
          }

          updateStatus(asset.key, "done");
        } catch {
          updateStatus(asset.key, "error");
        }
      });

      await Promise.allSettled(promises);

      toast({ title: "Dein Playbook ist fertig!", description: "Alle Assets wurden erfolgreich generiert." });
      setTimeout(() => navigate("/dashboard"), 1500);
    })();
  }, [user, tenantId]);

  const total = ASSET_TYPES.length;
  const done = Object.values(statuses).filter((s) => s === "done").length;
  const percent = Math.round((done / total) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-[#534AB7]/5 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-border/50 bg-card p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-[#534AB7]/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-[#534AB7]" />
            </div>
          </div>

          <div>
            <h1 className="text-xl font-bold text-foreground">
              Dein Playbook wird erstellt...
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Wir generieren alle Assets basierend auf deinem Profil.
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[#534AB7]"
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{done} von {total} Assets generiert</p>
          </div>

          {/* Asset list */}
          <div className="space-y-2 text-left">
            {ASSET_TYPES.map((asset) => {
              const status = statuses[asset.key];
              return (
                <div key={asset.key} className="flex items-center gap-2 py-1">
                  {status === "done" ? (
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                  ) : status === "generating" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#534AB7] shrink-0" />
                  ) : status === "error" ? (
                    <div className="h-4 w-4 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                      <span className="text-[10px] text-red-400">!</span>
                    </div>
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-border shrink-0" />
                  )}
                  <span className={`text-sm ${status === "done" ? "text-muted-foreground" : "text-foreground"}`}>
                    {asset.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
