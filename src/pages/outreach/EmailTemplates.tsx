import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Mail, Copy } from "lucide-react";
import { useAccountFilter } from "@/hooks/useAccountFilter";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { UpgradePrompt } from "@/components/outreach/UpgradePrompt";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  is_active: boolean;
  created_at: string;
}

export default function EmailTemplates() {
  const { accountId } = useAccountFilter();
  const { canUseEmailTemplates, loading: featureLoading } = useFeatureAccess();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    body_html: "",
    is_active: true,
  });

  // Show upgrade prompt if no access
  if (!featureLoading && !canUseEmailTemplates) {
    return (
      <>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Mail className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">E-Mail Vorlagen</h1>
              <p className="text-muted-foreground">
                Erstelle und verwalte deine E-Mail-Vorlagen
              </p>
            </div>
          </div>
          <div className="flex justify-center py-12">
            <UpgradePrompt 
              featureName="E-Mail Vorlagen"
              description="E-Mail-Vorlagen und Mail-Outreach sind nur im Pro-Paket verfügbar."
              className="max-w-md"
            />
          </div>
        </div>
      </>
    );
  }

  const { data: templates, isLoading } = useQuery({
    queryKey: ["email-templates", accountId],
    queryFn: async () => {
      const query = supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (accountId) {
        query.eq("account_id", accountId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from("email_templates")
          .update({
            name: data.name,
            subject: data.subject,
            body_html: data.body_html,
            is_active: data.is_active,
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("email_templates").insert({
          account_id: accountId,
          name: data.name,
          subject: data.subject,
          body_html: data.body_html,
          is_active: data.is_active,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      setIsDialogOpen(false);
      resetForm();
      toast.success(editingTemplate ? "Vorlage aktualisiert" : "Vorlage erstellt");
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Vorlage gelöscht");
    },
  });

  const resetForm = () => {
    setFormData({ name: "", subject: "", body_html: "", is_active: true });
    setEditingTemplate(null);
  };

  const openEditDialog = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      body_html: template.body_html,
      is_active: template.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      id: editingTemplate?.id,
    });
  };

  const copyToClipboard = (template: EmailTemplate) => {
    navigator.clipboard.writeText(template.body_html);
    toast.success("HTML kopiert");
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">E-Mail Vorlagen</h1>
            <p className="text-muted-foreground">
              Erstelle und verwalte E-Mail-Vorlagen für dein Outreach
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Neue Vorlage
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? "Vorlage bearbeiten" : "Neue Vorlage erstellen"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="z.B. Erstkontakt"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Betreff</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Betreff der E-Mail"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Variablen: {"{{first_name}}"}, {"{{last_name}}"}, {"{{company}}"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Inhalt</Label>
                  <Textarea
                    value={formData.body_html}
                    onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
                    placeholder={`Hallo {{first_name}},

ich hoffe, es geht Ihnen gut...

Mit freundlichen Grüßen`}
                    rows={10}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Variablen: {"{{first_name}}"}, {"{{last_name}}"}, {"{{company}}"}, {"{{position}}"}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Aktiv</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Abbrechen
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Speichert..." : "Speichern"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Laden...</div>
        ) : templates?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Noch keine Vorlagen erstellt</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates?.map((template) => (
              <Card key={template.id} className={!template.is_active ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(template)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(template)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium mb-2">Betreff: {template.subject}</p>
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {template.body_html.replace(/<[^>]*>/g, "").slice(0, 150)}...
                  </p>
                  {!template.is_active && (
                    <span className="inline-block mt-2 text-xs bg-muted px-2 py-1 rounded">
                      Inaktiv
                    </span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
