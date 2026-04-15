import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, Info, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { UpgradePrompt } from "@/components/outreach/UpgradePrompt";

interface Objection {
  id: string;
  title: string;
  keywords: string[];
  standard_response: string;
  category: string | null;
  is_active: boolean;
}

export default function ObjectionLibrary() {
  const [objections, setObjections] = useState<Objection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingObjection, setEditingObjection] = useState<Objection | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { canUseObjectionLibrary, loading: featureLoading } = useFeatureAccess();

  const emptyObjection: Partial<Objection> = {
    title: "",
    keywords: [],
    standard_response: "",
    category: "",
    is_active: true,
  };

  useEffect(() => {
    if (canUseObjectionLibrary) {
      fetchObjections();
    }
  }, [canUseObjectionLibrary]);

  const fetchObjections = async () => {
    try {
      const { data, error } = await supabase
        .from('objections')
        .select('*')
        .order('category', { ascending: true })
        .order('title', { ascending: true });

      if (error) throw error;
      setObjections(data || []);
    } catch (error) {
      console.error('Error fetching objections:', error);
      toast.error("Fehler beim Laden der Einwände");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingObjection) return;

    try {
      if (editingObjection.id) {
        // Update existing
        const { error } = await supabase
          .from('objections')
          .update({
            title: editingObjection.title,
            keywords: editingObjection.keywords,
            standard_response: editingObjection.standard_response,
            category: editingObjection.category,
            is_active: editingObjection.is_active,
          })
          .eq('id', editingObjection.id);

        if (error) throw error;
        toast.success("Einwand aktualisiert");
      } else {
        // Create new
        const { error } = await supabase
          .from('objections')
          .insert({
            title: editingObjection.title,
            keywords: editingObjection.keywords,
            standard_response: editingObjection.standard_response,
            category: editingObjection.category,
            is_active: editingObjection.is_active,
          });

        if (error) throw error;
        toast.success("Einwand hinzugefügt");
      }

      setIsDialogOpen(false);
      setEditingObjection(null);
      fetchObjections();
    } catch (error) {
      console.error('Error saving objection:', error);
      toast.error("Fehler beim Speichern");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Möchten Sie diesen Einwand wirklich löschen?")) return;

    try {
      const { error } = await supabase
        .from('objections')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Einwand gelöscht");
      fetchObjections();
    } catch (error) {
      console.error('Error deleting objection:', error);
      toast.error("Fehler beim Löschen");
    }
  };

  const handleKeywordsChange = (value: string) => {
    if (!editingObjection) return;
    // Split by comma and trim
    const keywords = value.split(',').map(k => k.trim()).filter(k => k.length > 0);
    setEditingObjection({ ...editingObjection, keywords });
  };

  // Show upgrade prompt if no access to objection library
  if (!featureLoading && !canUseObjectionLibrary) {
    return (
      <>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Einwand-Bibliothek</h1>
              <p className="text-muted-foreground">
                KI-gestützte Einwandbehandlung
              </p>
            </div>
          </div>
          <div className="flex justify-center py-12">
            <UpgradePrompt 
              featureName="Einwand-Bibliothek"
              description="Die Einwand-Bibliothek für KI-gestützte Einwandbehandlung ist nur im Pro-Paket verfügbar."
              className="max-w-md"
            />
          </div>
        </div>
      </>
    );
  }

  if (loading || featureLoading) {
    return (
      <>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Lädt...</p>
        </div>
      </>
    );
  }


  // Group by category
  const groupedObjections = objections.reduce((acc, obj) => {
    const cat = obj.category || 'Sonstige';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(obj);
    return acc;
  }, {} as Record<string, Objection[]>);

  return (
    <>
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Einwand-Bibliothek</h1>
            <p className="text-muted-foreground">
              Vordefinierte Einwände mit bewährten Behandlungen für die KI
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingObjection(emptyObjection as Objection)}>
                <Plus className="mr-2 h-4 w-4" />
                Einwand hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingObjection?.id ? "Einwand bearbeiten" : "Neuer Einwand"}
                </DialogTitle>
                <DialogDescription>
                  Die KI nutzt diese Vorlage als Referenz und passt sie an den Lead an
                </DialogDescription>
              </DialogHeader>

              {editingObjection && (
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="title">Titel / Name</Label>
                    <Input
                      id="title"
                      value={editingObjection.title}
                      onChange={(e) => setEditingObjection({ ...editingObjection, title: e.target.value })}
                      placeholder="z.B. Zu teuer / Budget"
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">Kategorie</Label>
                    <Input
                      id="category"
                      value={editingObjection.category || ''}
                      onChange={(e) => setEditingObjection({ ...editingObjection, category: e.target.value })}
                      placeholder="z.B. Preis, Zeit, Autorität"
                    />
                  </div>

                  <div>
                    <Label htmlFor="keywords">Keywords (komma-getrennt)</Label>
                    <Input
                      id="keywords"
                      value={editingObjection.keywords.join(', ')}
                      onChange={(e) => handleKeywordsChange(e.target.value)}
                      placeholder="teuer, zu viel, kostet, preis, budget"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Diese Wörter triggern die Einwandbehandlung im Gespräch
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="response">Standard-Behandlung</Label>
                    <Textarea
                      id="response"
                      value={editingObjection.standard_response}
                      onChange={(e) => setEditingObjection({ ...editingObjection, standard_response: e.target.value })}
                      rows={8}
                      placeholder="Ich verstehe, dass der Preis eine wichtige Rolle spielt..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Die KI passt diese Vorlage an den konkreten Lead-Kontext an
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={editingObjection.is_active}
                      onChange={(e) => setEditingObjection({ ...editingObjection, is_active: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="is_active">Aktiv</Label>
                  </div>

                  <div className="flex gap-2 justify-end pt-4">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button onClick={handleSave}>
                      Speichern
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Die KI durchsucht während des Calls automatisch diese Bibliothek nach passenden Einwänden. 
            Sie verwendet die Standard-Behandlung als Basis und passt sie mit System-Context und Lead-Daten an.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {Object.entries(groupedObjections).map(([category, objs]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg">{category}</CardTitle>
                <CardDescription>{objs.length} Einwände</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {objs.map((objection) => (
                    <div key={objection.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{objection.title}</h3>
                            {!objection.is_active && (
                              <Badge variant="secondary">Inaktiv</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {objection.keywords.map((keyword, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {objection.standard_response}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingObjection(objection);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(objection.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}