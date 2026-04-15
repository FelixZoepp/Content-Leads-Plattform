import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Clock, Calendar, Bell, User, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow, isToday, isTomorrow, isPast, format } from "date-fns";
import { de } from "date-fns/locale";

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  related_type: string | null;
  related_id: string | null;
  contact?: {
    first_name: string;
    last_name: string;
    company: string | null;
  };
  deal?: {
    title: string;
  };
}

interface TasksOverviewProps {
  onTaskClick?: (taskId: string, relatedType: string | null, relatedId: string | null) => void;
}

export default function TasksOverview({ onTaskClick }: TasksOverviewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dueTasks, setDueTasks] = useState<Task[]>([]);
  const [showDueNotification, setShowDueNotification] = useState(false);

  useEffect(() => {
    fetchTasks();
    
    // Check for due tasks every minute
    const interval = setInterval(checkDueTasks, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assignee_id', user.id)
        .eq('status', 'open')
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;

      // Fetch contact info for tasks related to contacts
      const tasksWithContacts = await Promise.all(
        (data || []).map(async (task) => {
          if (task.related_type === 'contact' && task.related_id) {
            const { data: contact } = await supabase
              .from('contacts')
              .select('first_name, last_name, company')
              .eq('id', task.related_id)
              .single();
            return { ...task, contact: contact || undefined };
          }
          return { ...task, contact: undefined };
        })
      );

      setTasks(tasksWithContacts as Task[]);
      checkDueTasks(tasksWithContacts as Task[]);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkDueTasks = (taskList?: Task[]) => {
    const tasksToCheck = taskList || tasks;
    const now = new Date();
    
    const dueNow = tasksToCheck.filter(task => {
      if (!task.due_date) return false;
      const dueDate = new Date(task.due_date);
      // Task is due if it's within the next 15 minutes or past due
      const timeDiff = dueDate.getTime() - now.getTime();
      return timeDiff <= 15 * 60 * 1000 && timeDiff > -24 * 60 * 60 * 1000;
    });

    if (dueNow.length > 0) {
      setDueTasks(dueNow);
      setShowDueNotification(true);
    }
  };

  const handleCompleteTask = async (taskId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'done' })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.filter(t => t.id !== taskId));
      setDueTasks(dueTasks.filter(t => t.id !== taskId));
      toast.success("Aufgabe erledigt!");
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error("Fehler beim Aktualisieren");
    }
  };

  const getDueDateBadge = (dueDate: string | null) => {
    if (!dueDate) return null;
    
    const date = new Date(dueDate);
    
    if (isPast(date) && !isToday(date)) {
      return (
        <Badge variant="destructive" className="text-[10px]">
          Überfällig
        </Badge>
      );
    }
    
    if (isToday(date)) {
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
          Heute
        </Badge>
      );
    }
    
    if (isTomorrow(date)) {
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">
          Morgen
        </Badge>
      );
    }
    
    return null;
  };

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return "Kein Datum";
    
    // Parse the UTC date from database
    const date = new Date(dueDate);
    
    // Check if the time is midnight UTC (no specific time was set)
    const utcHours = date.getUTCHours();
    const utcMinutes = date.getUTCMinutes();
    const hasTime = !(utcHours === 0 && utcMinutes === 0);
    
    if (isToday(date)) {
      return hasTime ? format(date, "'Heute' HH:mm", { locale: de }) : "Heute";
    }
    
    if (isTomorrow(date)) {
      return hasTime ? format(date, "'Morgen' HH:mm", { locale: de }) : "Morgen";
    }
    
    return hasTime 
      ? format(date, "dd.MM.yyyy HH:mm", { locale: de })
      : format(date, "dd.MM.yyyy", { locale: de });
  };

  return (
    <>
      {/* Due Task Notification Banner */}
      {showDueNotification && dueTasks.length > 0 && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <Card className="border-amber-500/50 bg-amber-500/10 shadow-lg shadow-amber-500/20 max-w-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center animate-pulse">
                  <Bell className="h-4 w-4 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {dueTasks.length === 1 ? 'Aufgabe fällig!' : `${dueTasks.length} Aufgaben fällig!`}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {dueTasks[0].title}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setShowDueNotification(false)}
                >
                  ×
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tasks Panel */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Meine Aufgaben
            </div>
            <Badge variant="secondary" className="text-[10px]">
              {tasks.length} offen
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Lädt...
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400 opacity-50" />
              <p className="text-sm text-muted-foreground">
                Keine offenen Aufgaben 🎉
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick?.(task.id, task.related_type, task.related_id)}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors cursor-pointer group"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0 opacity-50 hover:opacity-100"
                      onClick={(e) => handleCompleteTask(task.id, e)}
                    >
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground hover:text-green-400" />
                    </Button>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {task.title}
                      </p>
                      
                      {/* Related Contact/Deal */}
                      {task.contact && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span>{task.contact.first_name} {task.contact.last_name}</span>
                          {task.contact.company && (
                            <>
                              <span>•</span>
                              <Building2 className="w-3 h-3" />
                              <span className="truncate">{task.contact.company}</span>
                            </>
                          )}
                        </div>
                      )}
                      
                      {/* Due Date */}
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatDueDate(task.due_date)}</span>
                        </div>
                        {getDueDateBadge(task.due_date)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </>
  );
}
