import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MessageSquare, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
}

interface Deal {
  id: string;
  title: string;
  next_action: string | null;
  due_date: string | null;
}

const Today = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayData();
  }, []);

  const fetchTodayData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('assignee_id', user.id)
        .eq('status', 'open')
        .or(`due_date.lte.${today}`)
        .order('due_date', { ascending: true });

      if (tasksError) throw tasksError;

      // Fetch deals without next_action or overdue
      const { data: dealsData, error: dealsError } = await supabase
        .from('deals')
        .select('*')
        .or(`next_action.is.null,due_date.lte.${today}`)
        .in('stage', ['New', 'Qualifiziert', 'Termin gesetzt', 'Angebot', 'Verhandlung']);

      if (dealsError) throw dealsError;

      setTasks(tasksData || []);
      setDeals(dealsData || []);
    } catch (error: any) {
      toast.error("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'done' })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.filter(t => t.id !== taskId));
      toast.success("Aufgabe erledigt!");
    } catch (error: any) {
      toast.error("Fehler beim Aktualisieren");
    }
  };

  const handleQuickAction = async (type: 'call' | 'email' | 'dm') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          type: type,
          timestamp: new Date().toISOString(),
        });

      if (error) throw error;
      
      const typeLabels = { call: 'Anruf', email: 'E-Mail', dm: 'DM' };
      toast.success(`${typeLabels[type]} geloggt!`);
    } catch (error: any) {
      toast.error("Fehler beim Loggen");
    }
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Lädt...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="p-8 max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">Heute</h1>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={() => handleQuickAction('call')}>
              <Phone className="w-4 h-4 mr-2" />
              Call geloggt
            </Button>
            <Button variant="outline" onClick={() => handleQuickAction('email')}>
              <Mail className="w-4 h-4 mr-2" />
              E-Mail geloggt
            </Button>
            <Button variant="outline" onClick={() => handleQuickAction('dm')}>
              <MessageSquare className="w-4 h-4 mr-2" />
              DM geloggt
            </Button>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Meine Aufgaben
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Keine offenen Aufgaben 🎉
                </p>
              ) : (
                <div className="space-y-3">
                  {tasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{task.title}</p>
                        {task.due_date && (
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(task.due_date).toLocaleDateString('de-DE')}
                            </span>
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCompleteTask(task.id)}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deals needing attention */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Deals brauchen Aufmerksamkeit
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deals.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Alle Deals sind aktuell 👍
                </p>
              ) : (
                <div className="space-y-3">
                  {deals.map(deal => (
                    <div
                      key={deal.id}
                      className="p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <p className="font-medium">{deal.title}</p>
                      {!deal.next_action ? (
                        <Badge variant="destructive" className="mt-2">
                          Keine nächste Aktion
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="mt-2 bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]">
                          Überfällig
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Today;