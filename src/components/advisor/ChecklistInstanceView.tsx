import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Calendar, MessageSquare, CheckCircle2 } from "lucide-react";

interface TemplateItem {
  id: string;
  title: string;
  description: string | null;
  default_due_days: number;
  sort_order: number;
}

interface ItemStatus {
  item_id: string;
  is_done: boolean;
  due_date: string | null;
  internal_note: string | null;
  completed_at: string | null;
}

interface Props {
  instanceId: string;
  /** If provided, notes autosave on blur */
  advisorView?: boolean;
}

export function ChecklistInstanceView({ instanceId, advisorView = true }: Props) {
  const { toast } = useToast();

  const [instanceTitle, setInstanceTitle] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [statuses, setStatuses] = useState<Record<string, ItemStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingItem, setSavingItem] = useState<string | null>(null);

  useEffect(() => {
    loadInstance();
  }, [instanceId]);

  async function loadInstance() {
    setLoading(true);
    try {
      // Load instance + template info
      const { data: instance, error: iErr } = await (supabase as any)
        .from("checklist_instances")
        .select(`
          id,
          title,
          template_id,
          customer_id,
          checklist_templates ( title ),
          profiles:customer_id ( full_name, email )
        `)
        .eq("id", instanceId)
        .single();

      if (iErr) throw iErr;

      setInstanceTitle(instance.title || instance.checklist_templates?.title || "Checkliste");
      setCustomerName(
        instance.profiles?.full_name || instance.profiles?.email || "Kunde"
      );

      // Load template items
      const { data: templateItems, error: tiErr } = await (supabase as any)
        .from("checklist_template_items")
        .select("id, title, description, default_due_days, sort_order")
        .eq("template_id", instance.template_id)
        .order("sort_order");

      if (tiErr) throw tiErr;
      setItems(templateItems || []);

      // Load item statuses
      const { data: statusRows } = await (supabase as any)
        .from("checklist_item_statuses")
        .select("item_id, is_done, due_date, internal_note, completed_at")
        .eq("instance_id", instanceId);

      const statusMap: Record<string, ItemStatus> = {};
      const noteMap: Record<string, string> = {};
      for (const s of statusRows || []) {
        statusMap[s.item_id] = s;
        noteMap[s.item_id] = s.internal_note || "";
      }
      setStatuses(statusMap);
      setNotes(noteMap);
    } catch (err: any) {
      toast({ title: "Fehler beim Laden", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function ensureStatusRow(itemId: string): Promise<ItemStatus> {
    if (statuses[itemId]) return statuses[itemId];

    // Find item to compute due_date
    const item = items.find((i) => i.id === itemId);
    const dueDate = item?.default_due_days
      ? new Date(Date.now() + item.default_due_days * 86400000).toISOString().split("T")[0]
      : null;

    const { data, error } = await (supabase as any)
      .from("checklist_item_statuses")
      .insert({
        instance_id: instanceId,
        item_id: itemId,
        is_done: false,
        due_date: dueDate,
        internal_note: null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function toggleItem(itemId: string, checked: boolean) {
    setSavingItem(itemId);
    try {
      await ensureStatusRow(itemId);

      const { error } = await (supabase as any)
        .from("checklist_item_statuses")
        .update({
          is_done: checked,
          completed_at: checked ? new Date().toISOString() : null,
        })
        .eq("instance_id", instanceId)
        .eq("item_id", itemId);

      if (error) throw error;

      setStatuses((prev) => ({
        ...prev,
        [itemId]: {
          ...(prev[itemId] || { item_id: itemId, due_date: null, internal_note: null }),
          is_done: checked,
          completed_at: checked ? new Date().toISOString() : null,
        },
      }));
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setSavingItem(null);
    }
  }

  const saveNote = useCallback(
    async (itemId: string) => {
      const noteText = notes[itemId] ?? "";
      try {
        await ensureStatusRow(itemId);
        await (supabase as any)
          .from("checklist_item_statuses")
          .update({ internal_note: noteText || null })
          .eq("instance_id", instanceId)
          .eq("item_id", itemId);

        setStatuses((prev) => ({
          ...prev,
          [itemId]: {
            ...(prev[itemId] || { item_id: itemId, is_done: false, due_date: null, completed_at: null }),
            internal_note: noteText || null,
          },
        }));
      } catch (err: any) {
        toast({ title: "Notiz nicht gespeichert", description: err.message, variant: "destructive" });
      }
    },
    [notes, instanceId, statuses, items]
  );

  const totalItems = items.length;
  const doneItems = items.filter((i) => statuses[i.id]?.is_done).length;
  const progressPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-7 h-7 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div
        className="glass-panel fade-up"
        style={{ background: "linear-gradient(135deg, rgba(197,160,89,0.10), rgba(10,11,11,0.6))", borderColor: "rgba(197,160,89,0.18)" }}
      >
        <div className="relative z-[2]">
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">
                Checkliste
              </span>
              <h2
                className="text-[18px] font-semibold text-white"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {instanceTitle}
              </h2>
              <p className="text-[12px] text-[rgba(249,249,249,0.45)] mt-0.5">{customerName}</p>
            </div>
            <div className="text-right">
              <div
                className="text-2xl text-white"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {doneItems}
                <span className="text-[14px] text-[#C5A059]">/{totalItems}</span>
              </div>
              <div className="text-[9px] text-[rgba(249,249,249,0.35)] tracking-[0.2em] uppercase">
                Abgeschlossen
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-[rgba(249,249,249,0.06)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background:
                  progressPct === 100
                    ? "#7FC29B"
                    : progressPct >= 50
                    ? "linear-gradient(90deg, #775A19, #C5A059)"
                    : "rgba(232,116,103,0.6)",
              }}
            />
          </div>
          <div className="text-[10px] text-[rgba(249,249,249,0.35)] mt-1.5">{progressPct}% abgeschlossen</div>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {items.map((item, idx) => {
          const status = statuses[item.id];
          const isDone = status?.is_done ?? false;
          const dueDate = status?.due_date;
          const isOverdue =
            dueDate && !isDone && new Date(dueDate) < new Date();
          const isSaving = savingItem === item.id;

          return (
            <div
              key={item.id}
              className="glass-panel fade-up transition-all duration-300"
              style={{
                animationDelay: `${idx * 50}ms`,
                borderColor: isDone
                  ? "rgba(127,194,155,0.25)"
                  : isOverdue
                  ? "rgba(232,116,103,0.25)"
                  : "rgba(249,249,249,0.08)",
              }}
            >
              <div className="relative z-[2] space-y-3">
                {/* Item row */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Checkbox
                        checked={isDone}
                        onCheckedChange={(checked) => toggleItem(item.id, !!checked)}
                        className="border-[rgba(249,249,249,0.25)] data-[state=checked]:bg-[#7FC29B] data-[state=checked]:border-[#7FC29B]"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[14px] font-medium transition-all duration-200"
                        style={{
                          color: isDone ? "rgba(249,249,249,0.4)" : "#F9F9F9",
                          textDecoration: isDone ? "line-through" : "none",
                        }}
                      >
                        {item.title}
                      </span>
                      {isDone && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#7FC29B] flex-shrink-0" />
                      )}
                      {isOverdue && (
                        <Badge
                          className="text-[9px] px-1.5 py-0 bg-[rgba(232,116,103,0.15)] text-[#E87467] border-[rgba(232,116,103,0.3)]"
                          variant="outline"
                        >
                          Überfällig
                        </Badge>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-[12px] text-[rgba(249,249,249,0.4)] mt-0.5">
                        {item.description}
                      </p>
                    )}

                    {dueDate && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Calendar className="w-3 h-3 text-[rgba(249,249,249,0.3)]" />
                        <span className="text-[11px] text-[rgba(249,249,249,0.35)]">
                          Fällig:{" "}
                          {new Date(dueDate).toLocaleDateString("de-DE", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Internal note — only visible to advisors */}
                {advisorView && (
                  <div className="pl-8 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3 text-[rgba(249,249,249,0.25)]" />
                      <span className="text-[10px] text-[rgba(249,249,249,0.3)] tracking-[0.1em] uppercase">
                        Interne Notiz
                      </span>
                    </div>
                    <Textarea
                      placeholder="Notiz für interne Verwendung…"
                      value={notes[item.id] ?? ""}
                      onChange={(e) =>
                        setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      onBlur={() => saveNote(item.id)}
                      rows={2}
                      className="bg-[rgba(249,249,249,0.03)] border-[rgba(249,249,249,0.06)] text-[rgba(249,249,249,0.6)] placeholder:text-[rgba(249,249,249,0.2)] focus-visible:ring-[#C5A059] text-[12px] resize-none"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
