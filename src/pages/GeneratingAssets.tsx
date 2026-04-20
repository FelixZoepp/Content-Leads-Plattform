import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
      const { data: profile } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .single();

      const userProfile = profile || {};

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

          await (supabase as any).from("generated_assets").insert({
            user_id: user.id,
            asset_type: asset.key,
            content: data.content,
          });

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
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#0A0B0B" }}>
      {/* Aurora */}
      <div className="aurora" aria-hidden="true">
        <div className="blob3" />
      </div>

      <div className="relative z-[1] flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md fade-up">
          <div className="glass-panel">
            <div className="relative z-[2] text-center space-y-6">
              {/* Icon */}
              <div className="flex justify-center">
                <div
                  className="h-16 w-16 flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(197,160,89,0.2), rgba(119,90,25,0.1))",
                    border: "1px solid rgba(197,160,89,0.3)",
                    borderRadius: "16px",
                  }}
                >
                  <Sparkles className="h-8 w-8 text-[#E9CB8B]" />
                </div>
              </div>

              {/* Title */}
              <div>
                <h1 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-serif)" }}>
                  Dein Playbook wird erstellt...
                </h1>
                <p className="text-sm text-[rgba(249,249,249,0.5)] mt-1">
                  Wir generieren alle Assets basierend auf deinem Profil<span className="text-[#C5A059]">.</span>
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="h-2 rounded-full bg-[rgba(249,249,249,0.06)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${percent}%`,
                      background: "linear-gradient(90deg, #775A19, #C5A059, #E9CB8B)",
                      boxShadow: "0 0 16px rgba(197,160,89,0.4)",
                    }}
                  />
                </div>
                <p className="text-xs text-[rgba(249,249,249,0.4)]">{done} von {total} Assets generiert</p>
              </div>

              {/* Asset list */}
              <div className="space-y-2 text-left">
                {ASSET_TYPES.map((asset) => {
                  const status = statuses[asset.key];
                  return (
                    <div
                      key={asset.key}
                      className="flex items-center gap-3 py-2 px-3 rounded-lg transition-colors"
                      style={{
                        background: status === "generating" ? "rgba(197,160,89,0.06)" : "transparent",
                      }}
                    >
                      {status === "done" ? (
                        <Check className="h-4 w-4 text-[#7FC29B] shrink-0" />
                      ) : status === "generating" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#E9CB8B] shrink-0" />
                      ) : status === "error" ? (
                        <div className="h-4 w-4 rounded-full bg-[rgba(232,116,103,0.2)] flex items-center justify-center shrink-0">
                          <span className="text-[10px] text-[#E87467]">!</span>
                        </div>
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-[rgba(249,249,249,0.15)] shrink-0" />
                      )}
                      <span className={`text-sm ${status === "done" ? "text-[rgba(249,249,249,0.4)]" : "text-white"}`}>
                        {asset.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
