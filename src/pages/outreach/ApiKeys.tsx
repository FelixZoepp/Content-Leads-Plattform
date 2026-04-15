import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Copy, Trash2, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ApiKey {
  id: string;
  label: string;
  token_prefix: string | null;
  active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export default function ApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, label, token_prefix, active, last_used_at, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast({
        title: "Fehler",
        description: "API-Keys konnten nicht geladen werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyLabel.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie eine Bezeichnung ein",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Call edge function to create API key with secure hashing
      const response = await supabase.functions.invoke('create-api-key', {
        body: { label: newKeyLabel },
      });

      if (response.error) throw response.error;
      if (!response.data?.success) throw new Error(response.data?.error || 'Failed to create API key');

      setNewToken(response.data.api_key.token);
      setNewKeyLabel("");
      await fetchApiKeys();
      
      toast({
        title: "API-Key erstellt",
        description: "Kopieren Sie den Key jetzt, er wird nur einmal angezeigt!",
      });
    } catch (error) {
      console.error('Error creating API key:', error);
      toast({
        title: "Fehler",
        description: "API-Key konnte nicht erstellt werden",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Kopiert",
      description: "API-Key wurde in die Zwischenablage kopiert",
    });
  };

  const deleteApiKey = async (id: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchApiKeys();
      toast({
        title: "Gelöscht",
        description: "API-Key wurde gelöscht",
      });
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast({
        title: "Fehler",
        description: "API-Key konnte nicht gelöscht werden",
        variant: "destructive",
      });
    }
  };

  const toggleApiKey = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ active: !currentState })
        .eq('id', id);

      if (error) throw error;

      await fetchApiKeys();
      toast({
        title: !currentState ? "Aktiviert" : "Deaktiviert",
        description: `API-Key wurde ${!currentState ? 'aktiviert' : 'deaktiviert'}`,
      });
    } catch (error) {
      console.error('Error toggling API key:', error);
      toast({
        title: "Fehler",
        description: "Status konnte nicht geändert werden",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">API-Keys</h1>
            <p className="text-muted-foreground">
              Verwalten Sie API-Keys für externe Integrationen
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Neuer API-Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neuen API-Key erstellen</DialogTitle>
                <DialogDescription>
                  Erstellen Sie einen neuen API-Key für externe Systeme
                </DialogDescription>
              </DialogHeader>
              
              {!newToken ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="label">Bezeichnung</Label>
                    <Input
                      id="label"
                      placeholder="z.B. GHL Funnel Oktober 2025"
                      value={newKeyLabel}
                      onChange={(e) => setNewKeyLabel(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    onClick={createApiKey} 
                    disabled={creating}
                    className="w-full"
                  >
                    {creating ? "Erstelle..." : "API-Key erstellen"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                      ⚠️ Wichtig: Kopieren Sie jetzt Ihren API-Key!
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                      Dieser Key wird nur einmal angezeigt und kann nicht wiederhergestellt werden.
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-3 bg-background rounded border text-xs break-all">
                        {newToken}
                      </code>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyToClipboard(newToken)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => {
                      setNewToken(null);
                      setDialogOpen(false);
                    }}
                    className="w-full"
                  >
                    Fertig
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>API-Dokumentation</CardTitle>
            <CardDescription>
              So verwenden Sie die API zum Erstellen von Leads
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Endpoint:</h4>
              <code className="block p-3 bg-muted rounded text-sm">
                POST {window.location.origin.replace('id-preview--', 'id-').replace('.lovable.app', '-api.lovable.app')}/api-leads
              </code>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Header:</h4>
              <code className="block p-3 bg-muted rounded text-sm">
                X-API-Key: YOUR_API_KEY_HERE
              </code>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Beispiel Request Body:</h4>
              <pre className="p-3 bg-muted rounded text-xs overflow-x-auto">
{`{
  "company_name": "Müller Dachbau GmbH",
  "website": "https://mueller-dachbau.de",
  "phone": "+49 123 456789",
  "street": "Musterstraße 5",
  "zip": "12345",
  "city": "Berlin",
  "country": "DE",
  "first_name": "Peter",
  "last_name": "Müller",
  "email": "p.mueller@mueller-dachbau.de",
  "mobile": "+49 171 1234567",
  "position": "Geschäftsführer",
  "source": "Facebook Ad Funnel",
  "external_id": "ghl_983742",
  "tags": ["handwerk", "dachdecker"]
}`}
              </pre>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ihre API-Keys</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Lade API-Keys...</p>
            ) : apiKeys.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                Noch keine API-Keys vorhanden. Erstellen Sie einen neuen Key, um zu starten.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bezeichnung</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erstellt</TableHead>
                    <TableHead>Zuletzt verwendet</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Key className="h-4 w-4 text-muted-foreground" />
                          {key.label}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          {key.token_prefix || '••••••••...'}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={key.active ? "default" : "secondary"}>
                          {key.active ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(key.created_at), 'dd.MM.yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {key.last_used_at 
                          ? format(new Date(key.last_used_at), 'dd.MM.yyyy HH:mm')
                          : 'Noch nicht verwendet'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleApiKey(key.id, key.active)}
                          >
                            {key.active ? 'Deaktivieren' : 'Aktivieren'}
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>API-Key löschen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Diese Aktion kann nicht rückgängig gemacht werden. 
                                  Alle Systeme, die diesen Key verwenden, können danach 
                                  keine Leads mehr erstellen.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteApiKey(key.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Löschen
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
