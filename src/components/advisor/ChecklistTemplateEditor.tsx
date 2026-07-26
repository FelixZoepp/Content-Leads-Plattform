import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  GripVertical,
  Plus,
  Trash2,
  Save,
  X,
  ListChecks,
} from "lucide-react";

interface TemplateItem {
  id: string; // local draft id
  title: string;
  description: string;
  default_due_days: number;
}

interface Props {
  onSaved?: (templateId: string) => void;
  onClose?: () => void;
}

function SortableItem({
  item,
  onUpdate,
  onRemove,
}: {
  item: TemplateItem;
  onUpdate: (id: string, field: keyof TemplateItem, value: string | number) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, borderColor: "rgba(197,160,89,0.12)" }}
      className="glass-panel p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        {/* drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-2 text-[rgba(249,249,249,0.25)] hover:text-[#C5A059] cursor-grab active:cursor-grabbing transition-colors"
          aria-label="Verschieben"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="flex-1 space-y-2">
          <Input
            placeholder="Titel des Schritts"
            value={item.title}
            onChange={(e) => onUpdate(item.id, "title", e.target.value)}
            className="bg-[rgba(249,249,249,0.04)] border-[rgba(249,249,249,0.08)] text-white placeholder:text-[rgba(249,249,249,0.3)] focus-visible:ring-[#C5A059] text-sm"
          />
          <Textarea
            placeholder="Beschreibung (optional)"
            value={item.description}
            onChange={(e) => onUpdate(item.id, "description", e.target.value)}
            rows={2}
            className="bg-[rgba(249,249,249,0.04)] border-[rgba(249,249,249,0.08)] text-white placeholder:text-[rgba(249,249,249,0.3)] focus-visible:ring-[#C5A059] text-[13px] resize-none"
          />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[rgba(249,249,249,0.4)]">Fällig in</span>
            <Input
              type="number"
              min={0}
              max={365}
              value={item.default_due_days}
              onChange={(e) =>
                onUpdate(item.id, "default_due_days", parseInt(e.target.value) || 0)
              }
              className="w-20 bg-[rgba(249,249,249,0.04)] border-[rgba(249,249,249,0.08)] text-white focus-visible:ring-[#C5A059] text-sm"
            />
            <span className="text-[11px] text-[rgba(249,249,249,0.4)]">Tagen nach Start</span>
          </div>
        </div>

        <button
          onClick={() => onRemove(item.id)}
          className="mt-1 text-[rgba(249,249,249,0.25)] hover:text-[#E87467] transition-colors"
          aria-label="Entfernen"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

let _draftCounter = 0;
function draftId() {
  return `draft-${++_draftCounter}-${Date.now()}`;
}

export function ChecklistTemplateEditor({ onSaved, onClose }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<TemplateItem[]>([
    { id: draftId(), title: "", description: "", default_due_days: 7 },
  ]);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: draftId(), title: "", description: "", default_due_days: 7 },
    ]);
  }

  function updateItem(id: string, field: keyof TemplateItem, value: string | number) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleSave() {
    if (!title.trim()) {
      toast({ title: "Titel fehlt", description: "Bitte gib einen Titel ein.", variant: "destructive" });
      return;
    }
    const validItems = items.filter((i) => i.title.trim());
    if (validItems.length === 0) {
      toast({ title: "Keine Schritte", description: "Füge mindestens einen Schritt hinzu.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // 1. Insert template
      const { data: template, error: tErr } = await (supabase as any)
        .from("checklist_templates")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          created_by: user!.id,
        })
        .select()
        .single();

      if (tErr) throw tErr;

      // 2. Insert items in order
      const itemRows = validItems.map((item, idx) => ({
        template_id: template.id,
        title: item.title.trim(),
        description: item.description.trim() || null,
        default_due_days: item.default_due_days,
        sort_order: idx,
      }));

      const { error: iErr } = await (supabase as any)
        .from("checklist_template_items")
        .insert(itemRows);

      if (iErr) throw iErr;

      toast({ title: "Vorlage gespeichert ✓", description: `"${title}" wurde erstellt.` });
      onSaved?.(template.id);
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message || "Speichern fehlgeschlagen.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-[#C5A059]" />
          <h2
            className="text-[18px] font-semibold text-white"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Neue Checklisten-Vorlage
          </h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[rgba(249,249,249,0.4)] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Template meta */}
      <div className="space-y-3">
        <Input
          placeholder="Name der Vorlage (z.B. Onboarding LinkedIn-Kampagne)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-[rgba(249,249,249,0.04)] border-[rgba(249,249,249,0.08)] text-white placeholder:text-[rgba(249,249,249,0.3)] focus-visible:ring-[#C5A059]"
        />
        <Textarea
          placeholder="Beschreibung der Vorlage (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="bg-[rgba(249,249,249,0.04)] border-[rgba(249,249,249,0.08)] text-white placeholder:text-[rgba(249,249,249,0.3)] focus-visible:ring-[#C5A059] resize-none text-[13px]"
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[rgba(249,249,249,0.08)]" />
        <span className="text-[10px] text-[rgba(249,249,249,0.3)] tracking-[0.2em] uppercase">
          Schritte ({items.length})
        </span>
        <div className="h-px flex-1 bg-[rgba(249,249,249,0.08)]" />
      </div>

      {/* Sortable items */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {items.map((item) => (
              <SortableItem
                key={item.id}
                item={item}
                onUpdate={updateItem}
                onRemove={removeItem}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add item */}
      <button
        onClick={addItem}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-[rgba(197,160,89,0.25)] text-[13px] text-[#C5A059] hover:bg-[rgba(197,160,89,0.06)] transition-colors"
      >
        <Plus className="w-4 h-4" />
        Schritt hinzufügen
      </button>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onClose && (
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[rgba(249,249,249,0.5)] hover:text-white"
          >
            Abbrechen
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#C5A059] hover:bg-[#E9CB8B] text-black font-semibold"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Speichern…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Vorlage speichern
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
