import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Users, TrendingUp, AlertTriangle, Activity, ChevronRight, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Tenant {
  id: string;
  company_name: string;
  contact_name: string;
  is_active: boolean;
  created_at: string;
  latestHealth?: { score: number; color: string };
  assetsCount?: number;
  tasksDone?: number;
  tasksTotal?: number;
}

function HealthBadge({ color, score }: { color: string; score: number }) {
  const colors: Record<string, string> = {
    green: "text-[#7FC29B] bg-[rgba(127,194,155,0.1)]",
    amber: "text-[#E9CB8B] bg-[rgba(233,203,139,0.1)]",
    red: "text-[#E87467] bg-[rgba(232,116,103,0.1)]",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-[0.1em] uppercase ${colors[color] || colors.green}`}>
      {score}%
    </span>
  );
}

export default function AdvisorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    try {
      // Get tenants assigned to this advisor
      const { data: tenantsData } = await supabase
        .from("tenants")
        .select("*, health_scores(score, color, created_at)")
        .eq("advisor_id", user!.id)
        .eq("is_active", true)
        .order("company_name");

      const processed = await Promise.all(
        (tenantsData || []).map(async (t: any) => {
          const sorted = t.health_scores?.sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

          // Get asset count for this tenant's user
          const { count: assetsCount } = await (supabase as any)
            .from("generated_assets")
            .select("id", { count: "exact", head: true })
            .eq("user_id", t.user_id);

          // Get task progress
          const { data: tasks } = await (supabase as any)
            .from("daily_tasks")
            .select("id, is_done")
            .eq("user_id", t.user_id);

          return {
            ...t,
            latestHealth: sorted?.[0],
            assetsCount: assetsCount || 0,
            tasksDone: tasks?.filter((tk: any) => tk.is_done).length || 0,
            tasksTotal: tasks?.length || 0,
          };
        })
      );

      setTenants(processed);
    } catch (err) {
      console.error("Advisor load error:", err);
    }
    setLoading(false);
  }

  const healthGreen = tenants.filter(t => t.latestHealth?.color === "green").length;
  const healthAmber = tenants.filter(t => t.latestHealth?.color === "amber").length;
  const healthRed = tenants.filter(t => t.latestHealth?.color === "red").length;
  const name = user?.user_metadata?.name?.split(" ")[0] || "Berater";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div
        className="glass-panel fade-up"
        style={{
          background: "linear-gradient(135deg, rgba(197,160,89,0.14), rgba(10,11,11,0.6))",
          borderColor: "rgba(197,160,89,0.2)",
        }}
      >
        <div className="relative z-[2]">
          <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">Berater-Cockpit</span>
          <h1 className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>
            Hallo {name}, hier sind deine Kunden<span className="text-[#C5A059]">.</span>
          </h1>
          <p className="text-[13px] text-[rgba(249,249,249,0.5)] mt-1">
            {tenants.length} zugewiesene Kunden · {healthGreen} gesund · {healthAmber + healthRed} brauchen Aufmerksamkeit
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: Users, label: "Meine Kunden", value: tenants.length, color: "#C5A059" },
          { icon: TrendingUp, label: "Gesund", value: healthGreen, color: "#7FC29B" },
          { icon: Activity, label: "Achtung", value: healthAmber, color: "#E9CB8B" },
          { icon: AlertTriangle, label: "Kritisch", value: healthRed, color: "#E87467" },
        ].map((stat, i) => (
          <div key={i} className="glass-panel fade-up" style={{ animationDelay: `${(i + 1) * 60}ms` }}>
            <div className="relative z-[2]">
              <stat.icon className="w-4 h-4 mb-2" style={{ color: stat.color }} />
              <div className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>{stat.value}</div>
              <div className="text-[9px] text-[rgba(249,249,249,0.4)] tracking-[0.2em] uppercase mt-1">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Customer Cards */}
      {tenants.length === 0 ? (
        <div className="glass-panel fade-up text-center py-12">
          <div className="relative z-[2]">
            <Users className="w-12 h-12 text-[rgba(249,249,249,0.1)] mx-auto mb-3" />
            <p className="text-[13px] text-[rgba(249,249,249,0.5)]">Dir wurden noch keine Kunden zugewiesen</p>
            <p className="text-[11px] text-[rgba(249,249,249,0.3)] mt-1">Dein Admin wird dir Kunden zuordnen</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {tenants.map((tenant, i) => {
            const taskPct = tenant.tasksTotal ? Math.round((tenant.tasksDone! / tenant.tasksTotal) * 100) : 0;
            const healthColor = tenant.latestHealth?.color || "green";
            const borderColors: Record<string, string> = {
              green: "rgba(127,194,155,0.2)",
              amber: "rgba(233,203,139,0.2)",
              red: "rgba(232,116,103,0.25)",
            };

            return (
              <div
                key={tenant.id}
                className="glass-panel fade-up cursor-pointer group"
                style={{ animationDelay: `${300 + i * 80}ms`, borderColor: borderColors[healthColor] }}
              >
                <div className="relative z-[2]">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-semibold text-[#E9CB8B]"
                        style={{ background: "linear-gradient(135deg, rgba(197,160,89,0.2), rgba(119,90,25,0.1))", border: "1px solid rgba(197,160,89,0.25)" }}
                      >
                        {tenant.company_name?.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-[14px] font-semibold text-white">{tenant.company_name}</h3>
                        <p className="text-[11px] text-[rgba(249,249,249,0.4)]">{tenant.contact_name || "—"}</p>
                      </div>
                    </div>
                    {tenant.latestHealth && (
                      <HealthBadge color={tenant.latestHealth.color} score={tenant.latestHealth.score} />
                    )}
                  </div>

                  {/* Progress metrics */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div>
                      <div className="text-[16px] text-white" style={{ fontFamily: "var(--font-serif)" }}>{tenant.assetsCount}<span className="text-[11px] text-[#E9CB8B]">/14</span></div>
                      <div className="text-[9px] text-[rgba(249,249,249,0.3)] tracking-[0.15em] uppercase">Assets</div>
                    </div>
                    <div>
                      <div className="text-[16px] text-white" style={{ fontFamily: "var(--font-serif)" }}>{taskPct}<span className="text-[11px] text-[#E9CB8B]">%</span></div>
                      <div className="text-[9px] text-[rgba(249,249,249,0.3)] tracking-[0.15em] uppercase">Fahrplan</div>
                    </div>
                    <div>
                      <div className="text-[16px] text-white" style={{ fontFamily: "var(--font-serif)" }}>
                        {new Date(tenant.created_at).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                      </div>
                      <div className="text-[9px] text-[rgba(249,249,249,0.3)] tracking-[0.15em] uppercase">Start</div>
                    </div>
                  </div>

                  {/* Task progress bar */}
                  <div className="h-1.5 bg-[rgba(249,249,249,0.06)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${taskPct}%`,
                        background: taskPct >= 80 ? "#7FC29B" : taskPct >= 40 ? "linear-gradient(90deg, #775A19, #C5A059)" : "rgba(232,116,103,0.6)",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
