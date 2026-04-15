import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Webhook, Plus, Trash2, TestTube, Clock, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const EVENT_TYPES = [
  { key: "kpi_entry", label: "Neuer KPI-Eintrag", description: "Wird gesendet wenn ein Kunde neue Kennzahlen einträgt" },
  { key: "health_change", label: "Health Score Änderung", description: "Wird gesendet wenn sich der Health Score eines Kunden ändert" },
  { key: "customer_invited", label: "Neuer Kunde eingeladen", description: "Wird gesendet wenn ein neuer Kunde eingeladen wird" },
  { key: "survey_completed", label: "Survey abgeschlossen", description: "Wird gesendet wenn ein Kunde die Umfrage beantwortet" },
] as const;

interface WebhookEndpoint {
  id: string;
  event_type: string;
  url: string;
  is_active: boolean;
  description: string | null;
  created_at: string;
}

interface WebhookLogEntry {
  id: string;
  event_type: string;
  status_code: number | null;
  error_message: string | null;
  created_at: string;
  payload: any;
}

export function WebhookSettings() {
  const { toast } = useToast();
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [logs, setLogs] = useState<WebhookLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [newEvent, setNewEvent] = useState<string>(EVENT_TYPES[0].key);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [{ data: ep }, { data: lg }] = await Promise.all([
      supabase.from("webhook_endpoints").select("*").order("created_at", { ascending: false }),
      supabase.from("webhook_log").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setEndpoints((ep as WebhookEndpoint[]) || []);
    setLogs((lg as WebhookLogEntry[]) || []);
    setLoading(false);
  };

  const addEndpoint = async () => {
    if (!newUrl.trim()) return;
    try {
      new URL(newUrl); // validate URL
    } catch {
      toast({ title: "Ungültige URL", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("webhook_endpoints").insert({
      event_type: newEvent,
      url: newUrl.trim(),
    });

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }

    setNewUrl("");
    toast({ title: "Webhook hinzugefügt" });
    loadData();
  };

  const toggleEndpoint = async (id: string, active: boolean) => {
    await supabase.from("webhook_endpoints").update({ is_active: active }).eq("id", id);
    setEndpoints(prev => prev.map(e => e.id === id ? { ...e, is_active: active } : e));
  };

  const deleteEndpoint = async (id: string) => {
    await supabase.from("webhook_endpoints").delete().eq("id", id);
    loadData();
  };

  const testWebhook = async (endpoint: WebhookEndpoint) => {
    setTesting(endpoint.id);
    try {
      const { data, error } = await supabase.functions.invoke("fire-webhook", {
        body: {
          event_type: endpoint.event_type,
          payload: {
            test: true,
            message: "Dies ist ein Test-Webhook von ContentLeads",
            timestamp: new Date().toISOString(),
          },
        },
      });
      if (error) throw error;
      toast({ title: "Test gesendet", description: `${data.sent} Webhook(s) ausgelöst` });
      loadData();
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
    setTesting(null);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <h2 className="text-xl font-semibold text-foreground">Webhooks & Automatisierungen</h2>
      <p className="text-sm text-muted-foreground">
        Verbinde ContentLeads mit n8n, Make oder Zapier. Webhook-URLs werden bei bestimmten Events automatisch aufgerufen.
      </p>

      <Tabs defaultValue="endpoints" className="w-full">
        <TabsList className="rounded-xl">
          <TabsTrigger value="endpoints" className="rounded-xl gap-2">
            <Webhook className="h-4 w-4" />
            Endpoints
          </TabsTrigger>
          <TabsTrigger value="log" className="rounded-xl gap-2">
            <Clock className="h-4 w-4" />
            Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="mt-4 space-y-4">
          {/* Add new webhook */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Neuen Webhook hinzufügen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={newEvent}
                  onChange={(e) => setNewEvent(e.target.value)}
                  className="rounded-xl border border-input bg-background px-3 py-2 text-sm min-w-[200px]"
                >
                  {EVENT_TYPES.map(et => (
                    <option key={et.key} value={et.key}>{et.label}</option>
                  ))}
                </select>
                <Input
                  placeholder="https://hooks.n8n.cloud/webhook/..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="rounded-xl flex-1"
                />
                <Button onClick={addEndpoint} className="rounded-xl gap-2">
                  <Plus className="h-4 w-4" />
                  Hinzufügen
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Event type sections */}
          {EVENT_TYPES.map(et => {
            const eventEndpoints = endpoints.filter(e => e.event_type === et.key);
            if (eventEndpoints.length === 0) return null;
            return (
              <Card key={et.key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{et.label}</CardTitle>
                  <CardDescription className="text-xs">{et.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {eventEndpoints.map(ep => (
                    <div key={ep.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <Switch
                        checked={ep.is_active}
                        onCheckedChange={(v) => toggleEndpoint(ep.id, v)}
                      />
                      <code className="text-xs flex-1 truncate text-foreground/70">{ep.url}</code>
                      <Badge variant={ep.is_active ? "default" : "secondary"} className="text-xs">
                        {ep.is_active ? "Aktiv" : "Pausiert"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => testWebhook(ep)}
                        disabled={testing === ep.id}
                        className="rounded-xl gap-1 text-xs"
                      >
                        <TestTube className="h-3 w-3" />
                        {testing === ep.id ? "..." : "Test"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteEndpoint(ep.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}

          {endpoints.length === 0 && !loading && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
                <Webhook className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Noch keine Webhooks konfiguriert.</p>
                <p className="text-xs text-muted-foreground">Füge oben eine Webhook-URL hinzu, um Events an externe Tools zu senden.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Webhook-Log</CardTitle>
              <CardDescription className="text-xs">Letzte 50 gesendete Webhooks</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Noch keine Webhooks gesendet.</p>
              ) : (
                <div className="space-y-1.5 max-h-[400px] overflow-auto">
                  {logs.map(log => {
                    const success = log.status_code && log.status_code >= 200 && log.status_code < 300;
                    const eventLabel = EVENT_TYPES.find(e => e.key === log.event_type)?.label || log.event_type;
                    return (
                      <div key={log.id} className="flex items-center gap-3 text-xs p-2 rounded-lg bg-muted/20">
                        {success ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                        )}
                        <Badge variant="outline" className="text-xs shrink-0">{eventLabel}</Badge>
                        <span className="text-muted-foreground truncate flex-1">
                          {log.error_message || `Status ${log.status_code}`}
                        </span>
                        <span className="text-muted-foreground shrink-0">
                          {new Date(log.created_at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
