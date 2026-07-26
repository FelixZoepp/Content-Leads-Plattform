import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, BarChart3, Loader2 } from "lucide-react";

interface AdvisorLoad {
  user_id: string;
  name: string;
  email: string;
  customerCount: number;
  openChecklistItems: number;
  activeOptimizations: number;
}

export function AdvisorWorkloadWidget() {
  const [advisors, setAdvisors] = useState<AdvisorLoad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadWorkload(); }, []);

  async function loadWorkload() {
    setLoading(true);

    // Get all advisors via user_roles
    const { data: roles } = await (supabase as any)
      .from("user_roles")
      .select("user_id")
      .eq("role", "advisor");

    if (!roles?.length) { setLoading(false); return; }

    const advisorIds = roles.map((r: any) => r.user_id);

    // Get profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", advisorIds);

    // Get assignment counts
    const { data: assignments } = await (supabase as any)
      .from("advisor_assignments")
      .select("advisor_user_id, customer_user_id");

    // Get open checklist items
    const { data: instances } = await (supabase as any)
      .from("checklist_instances")
      .select("advisor_user_id, checklist_item_statuses(is_completed)")
      .eq("status", "active");

    // Get active optimizations
    const { data: optimizations } = await (supabase as any)
      .from("profile_optimizations")
      .select("advisor_user_id")
      .in("status", ["draft", "in_review"]);

    const result: AdvisorLoad[] = (profiles || []).map((p: any) => {
      const customerCount = (assignments || []).filter((a: any) => a.advisor_user_id === p.id).length;
      const myInstances = (instances || []).filter((i: any) => i.advisor_user_id === p.id);
      const openItems = myInstances.reduce((sum: number, inst: any) => {
        const statuses = inst.checklist_item_statuses || [];
        return sum + statuses.filter((s: any) => !s.is_completed).length;
      }, 0);
      const activeOpts = (optimizations || []).filter((o: any) => o.advisor_user_id === p.id).length;

      return {
        user_id: p.id,
        name: p.name || p.email || "Berater",
        email: p.email || "",
        customerCount,
        openChecklistItems: openItems,
        activeOptimizations: activeOpts,
      };
    });

    setAdvisors(result.sort((a, b) => b.customerCount - a.customerCount));
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="glass-panel fade-up">
        <div className="relative z-[2] flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-[rgba(249,249,249,0.3)]" />
        </div>
      </div>
    );
  }

  if (!advisors.length) return null;

  const maxCustomers = Math.max(1, ...advisors.map(a => a.customerCount));

  return (
    <div className="glass-panel fade-up">
      <div className="relative z-[2]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">Team</span>
            <h2 className="text-[15px] text-white" style={{ fontFamily: "var(--font-serif)" }}>Beraterauslastung</h2>
          </div>
          <BarChart3 className="w-4 h-4 text-[rgba(249,249,249,0.2)]" />
        </div>

        <div className="space-y-3">
          {advisors.map(adv => (
            <div key={adv.user_id} className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #E9CB8B, #C5A059, #775A19)", fontFamily: "var(--font-serif)" }}>
                {adv.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-medium text-white truncate">{adv.name}</span>
                  <span className="text-[11px] text-[rgba(249,249,249,0.4)]">{adv.customerCount} Kunden</span>
                </div>
                <div className="h-1.5 bg-[rgba(249,249,249,0.06)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(adv.customerCount / maxCustomers) * 100}%`,
                      background: adv.customerCount > 8 ? "#E87467" : adv.customerCount > 5 ? "#E9CB8B" : "linear-gradient(90deg, #C5A059, #E9CB8B)",
                    }}
                  />
                </div>
                <div className="flex gap-4 mt-1">
                  {adv.openChecklistItems > 0 && (
                    <span className="text-[10px] text-[rgba(249,249,249,0.3)]">{adv.openChecklistItems} offene Items</span>
                  )}
                  {adv.activeOptimizations > 0 && (
                    <span className="text-[10px] text-[rgba(249,249,249,0.3)]">{adv.activeOptimizations} Optimierungen</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
