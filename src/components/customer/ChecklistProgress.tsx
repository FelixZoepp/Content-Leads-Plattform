import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2, Circle, ChevronRight, ListChecks } from "lucide-react";

interface ItemRow {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_done: boolean;
  due_date: string | null;
}

interface InstanceSummary {
  id: string;
  title: string;
  items: ItemRow[];
}

/** Read-only checklist progress card for the customer view.
 *  Internal notes are never loaded or displayed here. */
export function ChecklistProgress() {
  const { user, tenantId } = useAuth();
  const [instances, setInstances] = useState<InstanceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadInstances();
  }, [user]);

  async function loadInstances() {
    setLoading(true);
    try {
      // Get checklist instances for this customer
      const { data: instanceRows, error } = await (supabase as any)
        .from("checklist_instances")
        .select("id, title, template_id")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!instanceRows?.length) {
        setInstances([]);
        setLoading(false);
        return;
      }

      const summaries: InstanceSummary[] = await Promise.all(
        instanceRows.map(async (inst: any) => {
          // Template items
          const { data: templateItems } = await (supabase as any)
            .from("checklist_template_items")
            .select("id, title, description, sort_order, default_due_days")
            .eq("template_id", inst.template_id)
            .order("sort_order");

          // Statuses
          const { data: statusRows } = await (supabase as any)
            .from("checklist_item_statuses")
            .select("item_id, is_done, due_date")
            .eq("instance_id", inst.id);

          const statusMap: Record<string, { is_done: boolean; due_date: string | null }> = {};
          for (const s of statusRows || []) {
            statusMap[s.item_id] = { is_done: s.is_done, due_date: s.due_date };
          }

          const items: ItemRow[] = (templateItems || []).map((ti: any) => ({
            id: ti.id,
            title: ti.title,
            description: ti.description,
            sort_order: ti.sort_order,
            is_done: statusMap[ti.id]?.is_done ?? false,
            due_date: statusMap[ti.id]?.due_date ?? null,
          }));

          return {
            id: inst.id,
            title: inst.title || "Checkliste",
            items,
          };
        })
      );

      setInstances(summaries);
    } catch (_err) {
      // silently fail — component is optional enhancement
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="glass-panel animate-pulse h-24" />
    );
  }

  if (instances.length === 0) {
    return null; // no checklists assigned yet — hide component entirely
  }

  return (
    <div className="space-y-4">
      {instances.map((inst) => {
        const total = inst.items.length;
        const done = inst.items.filter((i) => i.is_done).length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const nextItem = inst.items.find((i) => !i.is_done);

        return (
          <div
            key={inst.id}
            className="glass-panel fade-up"
            style={{ borderColor: pct === 100 ? "rgba(127,194,155,0.25)" : "rgba(197,160,89,0.15)" }}
          >
            <div className="relative z-[2] space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-[#C5A059]" />
                  <span
                    className="text-[14px] font-semibold text-white"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {inst.title}
                  </span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-[0.1em] uppercase ${
                    pct === 100
                      ? "text-[#7FC29B] bg-[rgba(127,194,155,0.1)]"
                      : "text-[#E9CB8B] bg-[rgba(233,203,139,0.1)]"
                  }`}
                >
                  {pct}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-[rgba(249,249,249,0.06)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background:
                      pct === 100
                        ? "#7FC29B"
                        : "linear-gradient(90deg, #775A19, #C5A059)",
                  }}
                />
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 text-[11px] text-[rgba(249,249,249,0.4)]">
                <span>{done} von {total} Schritten abgeschlossen</span>
                {pct === 100 && (
                  <span className="text-[#7FC29B] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Vollständig
                  </span>
                )}
              </div>

              {/* Item list — compact */}
              <div className="space-y-1.5">
                {inst.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2.5">
                    {item.is_done ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#7FC29B] flex-shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-[rgba(249,249,249,0.2)] flex-shrink-0" />
                    )}
                    <span
                      className="text-[13px] leading-snug"
                      style={{
                        color: item.is_done ? "rgba(249,249,249,0.3)" : "rgba(249,249,249,0.75)",
                        textDecoration: item.is_done ? "line-through" : "none",
                      }}
                    >
                      {item.title}
                    </span>
                    {item.due_date && !item.is_done && (
                      <span className="ml-auto text-[10px] text-[rgba(249,249,249,0.3)] flex-shrink-0">
                        {new Date(item.due_date).toLocaleDateString("de-DE", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Next step callout */}
              {nextItem && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]"
                  style={{
                    background: "rgba(197,160,89,0.07)",
                    border: "1px solid rgba(197,160,89,0.18)",
                  }}
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#C5A059] flex-shrink-0" />
                  <span className="text-[rgba(249,249,249,0.6)]">
                    Nächster Schritt:{" "}
                    <span className="text-[#E9CB8B] font-medium">{nextItem.title}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
