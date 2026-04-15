import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, Plus, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface CreateTaskDialogProps {
  contactId?: string;
  dealId?: string;
  contactName?: string;
  onTaskCreated?: () => void;
  trigger?: React.ReactNode;
  portalContainer?: HTMLElement | null;
}

export default function CreateTaskDialog({ 
  contactId, 
  dealId, 
  contactName,
  onTaskCreated,
  trigger,
  portalContainer
}: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!title.trim()) {
      toast.error("Bitte gib einen Titel ein");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Nicht angemeldet");
        return;
      }

      // Get user's account_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

      // Combine date and time if both provided
      let dueDatetime: string | null = null;
      if (dueDate) {
        if (dueTime) {
          dueDatetime = `${dueDate}T${dueTime}:00`;
        } else {
          dueDatetime = `${dueDate}T09:00:00`;
        }
      }

      const taskData: any = {
        title: title.trim(),
        assignee_id: user.id,
        status: 'open',
        due_date: dueDatetime,
        account_id: profile?.account_id,
      };

      // Set related entity
      if (contactId) {
        taskData.related_type = 'contact';
        taskData.related_id = contactId;
      } else if (dealId) {
        taskData.related_type = 'deal';
        taskData.related_id = dealId;
      }

      const { error } = await supabase
        .from('tasks')
        .insert(taskData);

      if (error) throw error;

      // If there's a note, add it as an activity
      if (note.trim() && contactId) {
        await supabase
          .from('activities')
          .insert({
            contact_id: contactId,
            user_id: user.id,
            type: 'note',
            note: `[Aufgabe erstellt: ${title}] ${note}`,
            account_id: profile?.account_id,
          });
      }

      toast.success("Aufgabe erstellt!");
      
      // Reset form
      setTitle("");
      setNote("");
      setDueDate("");
      setDueTime("");
      setOpen(false);
      
      onTaskCreated?.();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error("Fehler beim Erstellen der Aufgabe");
    } finally {
      setLoading(false);
    }
  };

  // Set default date to today
  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Aufgabe erstellen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md" container={portalContainer ?? undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Neue Aufgabe
            {contactName && (
              <span className="text-sm font-normal text-muted-foreground">
                für {contactName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Follow-up Anruf"
              required
            />
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Notiz</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Zusätzliche Informationen zur Aufgabe..."
              rows={3}
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dueDate" className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Datum
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={today}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueTime" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Uhrzeit
              </Label>
              <Input
                id="dueTime"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>

          {/* Quick Date Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDueDate(today);
                setDueTime("14:00");
              }}
            >
              Heute 14:00
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setDueDate(format(tomorrow, 'yyyy-MM-dd'));
                setDueTime("09:00");
              }}
            >
              Morgen 09:00
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                setDueDate(format(nextWeek, 'yyyy-MM-dd'));
                setDueTime("09:00");
              }}
            >
              In 1 Woche
            </Button>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Wird erstellt..." : "Aufgabe erstellen"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
