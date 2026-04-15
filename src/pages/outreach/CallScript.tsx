import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Save, Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import TemplateLibrary from "@/components/outreach/TemplateLibrary";

interface CallScript {
  id: string;
  name: string;
  content: string;
  is_active: boolean;
  system_context?: string;
}

export default function CallScript() {
  const [script, setScript] = useState<CallScript | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { canUseLiveObjectionHandling } = useFeatureAccess();

  useEffect(() => {
    fetchScript();
  }, []);

  const fetchScript = async () => {
    try {
      const { data, error } = await supabase
        .from('call_scripts')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      setScript(data);
    } catch (error) {
      console.error('Error fetching script:', error);
      toast.error("Fehler beim Laden des Scripts");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!script) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('call_scripts')
        .update({
          name: script.name,
          content: script.content,
          system_context: script.system_context,
        })
        .eq('id', script.id);

      if (error) throw error;
      
      toast.success("Script erfolgreich gespeichert");
    } catch (error) {
      console.error('Error saving script:', error);
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
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

  // All authenticated users can access Call Scripts - no role restriction

  return (
    <>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Call-Script Verwaltung</h1>
          <p className="text-muted-foreground">
            Verwalten Sie das globale Opening-Script für alle Calls
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Verfügbare Tags</CardTitle>
            <CardDescription>
              Verwenden Sie diese dynamischen Platzhalter in Ihrem Script
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Kontakt:</strong>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li><code>{'{{first_name}}'}</code></li>
                  <li><code>{'{{last_name}}'}</code></li>
                  <li><code>{'{{email}}'}</code></li>
                  <li><code>{'{{phone}}'}</code></li>
                  <li><code>{'{{position}}'}</code></li>
                </ul>
              </div>
              <div>
                <strong>Firma:</strong>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li><code>{'{{company_name}}'}</code></li>
                  <li><code>{'{{website}}'}</code></li>
                  <li><code>{'{{company_phone}}'}</code></li>
                  <li><code>{'{{city}}'}</code></li>
                </ul>
              </div>
              <div>
                <strong>Sonstiges:</strong>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li><code>{'{{user_name}}'}</code></li>
                  <li><code>{'{{source}}'}</code></li>
                  <li><code>{'{{stage}}'}</code></li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {script && (
          <Card>
            <CardHeader>
              <CardTitle>Script bearbeiten</CardTitle>
              <CardDescription>
                Dieses Script wird bei jedem Lead angezeigt und automatisch mit Lead-Daten gefüllt
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Script-Name</Label>
                <Input
                  id="name"
                  value={script.name}
                  onChange={(e) => setScript({ ...script, name: e.target.value })}
                  placeholder="z.B. Standard Opening Script"
                />
              </div>

              <div>
                <Label htmlFor="content">Script-Inhalt</Label>
                <Textarea
                  id="content"
                  value={script.content}
                  onChange={(e) => setScript({ ...script, content: e.target.value })}
                  rows={15}
                  placeholder="Guten Tag {{first_name}} {{last_name}}..."
                  className="font-mono"
                />
              </div>

              <div className="relative">
                <Label htmlFor="system_context" className="flex items-center gap-2">
                  KI System-Context für Einwandbehandlung
                  {!canUseLiveObjectionHandling && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Pro
                    </span>
                  )}
                </Label>
                <Textarea
                  id="system_context"
                  value={script.system_context || ''}
                  onChange={(e) => setScript({ ...script, system_context: e.target.value })}
                  rows={8}
                  disabled={!canUseLiveObjectionHandling}
                  placeholder={canUseLiveObjectionHandling 
                    ? `Beschreiben Sie Ihr Produkt/Dienstleistung, häufige Einwände und allgemeine Behandlungsstrategien. Diese Informationen helfen der KI, während Live-Calls passende Einwandbehandlungen zu generieren.

Beispiel:
- Produkt: CRM-Software für KMUs
- Hauptmerkmale: Pipeline-Management, Call-Tracking, Automatisierung
- Preis: Ab 49€/Monat
- USP: Deutsche Software mit DSGVO-Konformität
- Häufige Einwände: Preis, Umstellung, Komplexität`
                    : "Upgrade auf Pro, um KI-Einwandbehandlung zu nutzen"}
                  className={`font-mono text-sm ${!canUseLiveObjectionHandling ? 'opacity-50' : ''}`}
                />
              </div>

              {canUseLiveObjectionHandling ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Der System-Context wird von der KI verwendet, um während Live-Calls automatisch passende Einwandbehandlungen zu generieren. Je detaillierter die Informationen, desto besser die KI-Vorschläge.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-primary/30 bg-primary/5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>KI-Einwandbehandlung ist nur im Pro-Paket verfügbar.</span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open("https://buy.stripe.com/bJe3cv3p4fw68Mv9COgMw0b", "_blank")}
                    >
                      Upgrade auf Pro
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? (
                  <>Speichert...</>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Script speichern
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
        {/* Template Library */}
        <TemplateLibrary />
      </div>
    </>
  );
}