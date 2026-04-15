import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Phone, Mail, MessageSquare, FileText } from "lucide-react";

interface Activity {
  id: string;
  type: 'call' | 'email' | 'dm' | 'meeting' | 'note';
  outcome: string | null;
  timestamp: string;
  note: string | null;
  duration_min: number | null;
  user: { name: string } | null;
  contact: { first_name: string; last_name: string } | null;
  deal: { title: string } | null;
}

const ActivityLog = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchActivities();
  }, [typeFilter, outcomeFilter]);

  const fetchActivities = async () => {
    try {
      let query = supabase
        .from('activities')
        .select(`
          *,
          user:user_id (name),
          contact:contact_id (first_name, last_name),
          deal:deal_id (title)
        `)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter as any);
      }

      if (outcomeFilter !== 'all') {
        query = query.eq('outcome', outcomeFilter as any);
      }

      const { data, error } = await query;

      if (error) throw error;
      setActivities(data as any || []);
    } catch (error: any) {
      toast.error("Fehler beim Laden der Aktivitäten");
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'dm': return <MessageSquare className="w-4 h-4" />;
      case 'meeting': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getOutcomeBadge = (outcome: string | null) => {
    if (!outcome) return null;
    
    const outcomeColors: Record<string, string> = {
      'reached': 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]',
      'decision_maker': 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]',
      'interested': 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]',
      'callback': 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]',
      'no_answer': 'bg-muted text-muted-foreground',
      'gatekeeper': 'bg-muted text-muted-foreground',
      'not_interested': 'bg-[hsl(var(--danger))] text-[hsl(var(--danger-foreground))]',
    };

    return (
      <Badge className={outcomeColors[outcome] || 'bg-secondary'}>
        {outcome.replace('_', ' ')}
      </Badge>
    );
  };

  const filteredActivities = activities.filter(activity => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      activity.note?.toLowerCase().includes(search) ||
      activity.contact?.first_name?.toLowerCase().includes(search) ||
      activity.contact?.last_name?.toLowerCase().includes(search) ||
      activity.deal?.title?.toLowerCase().includes(search) ||
      activity.user?.name?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Lädt Aktivitäten...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">Activity Log</h1>

        <div className="flex gap-4 mb-6 flex-wrap">
          <Input
            placeholder="Suche..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Typen</SelectItem>
              <SelectItem value="call">Anruf</SelectItem>
              <SelectItem value="email">E-Mail</SelectItem>
              <SelectItem value="dm">DM</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="note">Notiz</SelectItem>
            </SelectContent>
          </Select>

          <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Ergebnis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Ergebnisse</SelectItem>
              <SelectItem value="reached">Erreicht</SelectItem>
              <SelectItem value="decision_maker">Entscheider</SelectItem>
              <SelectItem value="interested">Interessiert</SelectItem>
              <SelectItem value="callback">Rückruf</SelectItem>
              <SelectItem value="no_answer">Nicht erreicht</SelectItem>
              <SelectItem value="gatekeeper">Gatekeeper</SelectItem>
              <SelectItem value="not_interested">Kein Interesse</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Typ</TableHead>
                <TableHead>Zeitpunkt</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Kontakt</TableHead>
                <TableHead>Deal</TableHead>
                <TableHead>Ergebnis</TableHead>
                <TableHead>Dauer</TableHead>
                <TableHead>Notiz</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(activity.type)}
                      <span className="capitalize">{activity.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(activity.timestamp).toLocaleString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell>{activity.user?.name || '-'}</TableCell>
                  <TableCell>
                    {activity.contact 
                      ? `${activity.contact.first_name} ${activity.contact.last_name}`
                      : '-'
                    }
                  </TableCell>
                  <TableCell>{activity.deal?.title || '-'}</TableCell>
                  <TableCell>{getOutcomeBadge(activity.outcome)}</TableCell>
                  <TableCell>
                    {activity.duration_min ? `${activity.duration_min} min` : '-'}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {activity.note || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredActivities.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Keine Aktivitäten gefunden
          </div>
        )}
      </div>
    </>
  );
};

export default ActivityLog;
