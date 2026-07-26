import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2, Circle, Clock, User, ChevronRight } from "lucide-react";

interface ChecklistItem {
  title: string;
  is_completed: boolean;
  completed_at: string | null;
  due_date: string | null;
}

interface ChecklistSummary {
  id: string;
  title: string;
  status: string;
  items: ChecklistItem[];
  completedCount: number;
  totalCount: number;
}

interface OptimizationSummary {
  id: string;
  status: string;
  sectionsCount: number;
  approvedCount: number;
}

export function ServiceProgress() {
  const { user } = useAuth();
  const [checklists, setChecklists] = useState<ChecklistSummary[]>([]);
  const [optimization, setOptimization] = useState<OptimizationSummary | null>(null);
  const [advisorName, setAdvisorName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadProgress();
  }, [user]);

  async function loadProgress() {
    if (!user) return;
    setLoading(true);

    // Load advisor assignment
    const { data: assignment } = await (supabase as any)
      .from("advisor_assignments")
      .select("advisor_user_id")
      .eq("customer_user_id", user.id)
      .maybeSingle();

    if (assignment?.advisor_user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", assignment.advisor_user_id)
        .maybeSingle();
      setAdvisorName((profile as any)?.name || (profile as any)?.email || "Berater");
    }

    // Load checklist instances
    const { data: instances } = await (supabase as any)
      .from("checklist_instances")
      .select(`
        id, status,
        checklist_templates(title),
        checklist_item_statuses(title:checklist_template_items(title), is_completed, completed_at, due_date)
      `)
      .eq("customer_user_id", user.id)
      .eq("status", "active");

    if (instances) {
      setChecklists(instances.map((inst: any) => {
        const items = (inst.checklist_item_statuses || []).map((s: any) => ({
          title: s.title?.title || "Item",
          is_completed: s.is_completed,
          completed_at: s.completed_at,
          due_date: s.due_date,
        }));
        return {
          id: inst.id,
          title: inst.checklist_templates?.title || "Checkliste",
          status: inst.status,
          items,
          completedCount: items.filter((i: any) => i.is_completed).length,
          totalCount: items.length,
        };
      }));
    }

    // Load profile optimization
    const { data: opt } = await (supabase as any)
      .from("profile_optimizations")
      .select("id, status, profile_sections(id, status)")
      .eq("customer_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (opt) {
      setOptimization({
        id: opt.id,
        status: opt.status,
        sectionsCount: opt.profile_sections?.length || 0,
        approvedCount: opt.profile_sections?.filter((s: any) => s.status === "approved").length || 0,
      });
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="glass-panel fade-up">
        <div className="relative z-[2] flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const hasContent = checklists.length > 0 || optimization;
  if (!hasContent && !advisorName) return null;

  const totalItems = checklists.reduce((sum, c) => sum + c.totalCount, 0);
  const completedItems = checklists.reduce((sum, c) => sum + c.completedCount, 0);
  const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="glass-panel fade-up">
      <div className="relative z-[2] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">Dein Service</span>
            <h2 className="text-[15px] text-white" style={{ fontFamily: "var(--font-serif)" }}>Fortschritt</h2>
          </div>
          {advisorName && (
            <div className="flex items-center gap-2 text-[11px] text-[rgba(249,249,249,0.5)]">
              <User className="w-3.5 h-3.5" />
              Berater: <span className="text-white font-medium">{advisorName}</span>
            </div>
          )}
        </div>

        {/* Overall progress bar */}
        {totalItems > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-[rgba(249,249,249,0.5)]">Gesamtfortschritt</span>
              <span className="text-[13px] font-semibold text-[#E9CB8B]">{overallProgress}%</span>
            </div>
            <div className="h-2 bg-[rgba(249,249,249,0.06)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${overallProgress}%`, background: "linear-gradient(90deg, #C5A059, #E9CB8B)" }}
              />
            </div>
          </div>
        )}

        {/* Checklists */}
        {checklists.map(cl => (
          <div key={cl.id} className="border border-[rgba(249,249,249,0.06)] rounded-xl p-4" style={{ background: "rgba(249,249,249,0.02)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-medium text-white">{cl.title}</h3>
              <span className="text-[11px] text-[rgba(249,249,249,0.4)]">
                {cl.completedCount}/{cl.totalCount}
              </span>
            </div>
            <div className="space-y-2">
              {cl.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  {item.is_completed ? (
                    <CheckCircle2 className="w-4 h-4 text-[#7FC29B] flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-[rgba(249,249,249,0.15)] flex-shrink-0" />
                  )}
                  <span className={`text-[12px] ${item.is_completed ? "text-[rgba(249,249,249,0.4)] line-through" : "text-white"}`}>
                    {item.title}
                  </span>
                  {item.due_date && !item.is_completed && (
                    <span className="ml-auto flex items-center gap-1 text-[10px] text-[rgba(249,249,249,0.3)]">
                      <Clock className="w-3 h-3" />
                      {new Date(item.due_date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Profile Optimization */}
        {optimization && (
          <div className="border border-[rgba(249,249,249,0.06)] rounded-xl p-4" style={{ background: "rgba(249,249,249,0.02)" }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[13px] font-medium text-white">Profiloptimierung</h3>
                <p className="text-[11px] text-[rgba(249,249,249,0.4)] mt-0.5">
                  {optimization.approvedCount}/{optimization.sectionsCount} Sektionen freigegeben
                </p>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-[0.1em] uppercase ${
                optimization.status === "approved" ? "text-[#7FC29B] bg-[rgba(127,194,155,0.1)]" :
                optimization.status === "in_review" ? "text-[#E9CB8B] bg-[rgba(233,203,139,0.1)]" :
                "text-[rgba(249,249,249,0.4)] bg-[rgba(249,249,249,0.05)]"
              }`}>
                {optimization.status === "draft" ? "Entwurf" :
                 optimization.status === "in_review" ? "Zur Freigabe" :
                 optimization.status === "approved" ? "Freigegeben" : optimization.status}
              </span>
            </div>
          </div>
        )}

        {!hasContent && advisorName && (
          <p className="text-[12px] text-[rgba(249,249,249,0.4)] text-center py-4">
            Dein Berater arbeitet an deinem Profil. Sobald Aufgaben erstellt werden, siehst du hier den Fortschritt.
          </p>
        )}
      </div>
    </div>
  );
}
