import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Mail, Send } from "lucide-react";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  company: string | null;
  position: string | null;
}

interface EmailComposerProps {
  contact: Contact;
  onSuccess?: () => void;
}

export default function EmailComposer({ contact, onSuccess }: EmailComposerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const { data: templates } = useQuery({
    queryKey: ["email-templates-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Nicht angemeldet");

      const response = await supabase.functions.invoke("send-email", {
        body: {
          contactId: contact.id,
          templateId: selectedTemplateId || null,
          subject,
          bodyHtml,
        },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success("E-Mail erfolgreich gesendet");
      setIsOpen(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Fehler beim Senden: " + error.message);
    },
  });

  const resetForm = () => {
    setSubject("");
    setBodyHtml("");
    setSelectedTemplateId("");
  };

  const applyTemplate = (templateId: string) => {
    const template = templates?.find((t) => t.id === templateId);
    if (!template) return;

    setSelectedTemplateId(templateId);
    
    // Replace variables
    const replacements: Record<string, string> = {
      "{{first_name}}": contact.first_name || "",
      "{{last_name}}": contact.last_name || "",
      "{{company}}": contact.company || "",
      "{{position}}": contact.position || "",
    };

    let processedSubject = template.subject;
    let processedBody = template.body_html;

    Object.entries(replacements).forEach(([key, value]) => {
      processedSubject = processedSubject.replace(new RegExp(key, "g"), value);
      processedBody = processedBody.replace(new RegExp(key, "g"), value);
    });

    setSubject(processedSubject);
    setBodyHtml(processedBody);
  };

  if (!contact.email) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Mail className="h-4 w-4 mr-2" />
        Keine E-Mail
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="h-4 w-4 mr-2" />
          E-Mail senden
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>E-Mail an {contact.first_name} {contact.last_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>An:</span>
            <span className="font-medium text-foreground">{contact.email}</span>
          </div>

          <div className="space-y-2">
            <Label>Vorlage auswählen</Label>
            <Select value={selectedTemplateId} onValueChange={applyTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Vorlage wählen (optional)" />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Betreff</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Betreff eingeben..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Nachricht</Label>
            <Textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              placeholder={`Hallo {{first_name}},

ich hoffe, es geht Ihnen gut...

Mit freundlichen Grüßen`}
              rows={10}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending || !subject || !bodyHtml}
            >
              {sendMutation.isPending ? (
                "Sendet..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Senden
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
