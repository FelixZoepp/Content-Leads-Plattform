import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { useAccountFilter } from "@/hooks/useAccountFilter";

export default function SmtpSettings() {
  const { accountId } = useAccountFilter();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    smtp_host: "",
    smtp_port: 587,
    smtp_username: "",
    smtp_password_encrypted: "",
    smtp_from_email: "",
    smtp_from_name: "",
  });

  const { data: integration, isLoading } = useQuery({
    queryKey: ["smtp-settings", accountId],
    queryFn: async () => {
      if (!accountId) return null;
      const { data, error } = await supabase
        .from("account_integrations")
        .select("smtp_host, smtp_port, smtp_username, smtp_password_encrypted, smtp_from_email, smtp_from_name")
        .eq("account_id", accountId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });

  useEffect(() => {
    if (integration) {
      setFormData({
        smtp_host: integration.smtp_host || "",
        smtp_port: integration.smtp_port || 587,
        smtp_username: integration.smtp_username || "",
        smtp_password_encrypted: integration.smtp_password_encrypted || "",
        smtp_from_email: integration.smtp_from_email || "",
        smtp_from_name: integration.smtp_from_name || "",
      });
    }
  }, [integration]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error("Kein Account ausgewählt");

      // Check if record exists
      const { data: existing } = await supabase
        .from("account_integrations")
        .select("id")
        .eq("account_id", accountId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("account_integrations")
          .update({
            smtp_host: formData.smtp_host,
            smtp_port: formData.smtp_port,
            smtp_username: formData.smtp_username,
            smtp_password_encrypted: formData.smtp_password_encrypted,
            smtp_from_email: formData.smtp_from_email,
            smtp_from_name: formData.smtp_from_name,
          })
          .eq("account_id", accountId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("account_integrations").insert({
          account_id: accountId,
          smtp_host: formData.smtp_host,
          smtp_port: formData.smtp_port,
          smtp_username: formData.smtp_username,
          smtp_password_encrypted: formData.smtp_password_encrypted,
          smtp_from_email: formData.smtp_from_email,
          smtp_from_name: formData.smtp_from_name,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smtp-settings"] });
      toast.success("SMTP-Einstellungen gespeichert");
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  const isConfigured = !!integration?.smtp_host && !!integration?.smtp_username;

  if (isLoading) {
    return <div>Laden...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          <CardTitle>SMTP E-Mail Einstellungen</CardTitle>
          {isConfigured ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-500" />
          )}
        </div>
        <CardDescription>
          Verbinde deinen E-Mail-Server um E-Mails direkt aus der App zu versenden
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>SMTP Server</Label>
            <Input
              value={formData.smtp_host}
              onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
              placeholder="smtp.gmail.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Port</Label>
            <Input
              type="number"
              value={formData.smtp_port}
              onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 587 })}
              placeholder="587"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Benutzername / E-Mail</Label>
            <Input
              value={formData.smtp_username}
              onChange={(e) => setFormData({ ...formData, smtp_username: e.target.value })}
              placeholder="deine@email.de"
            />
          </div>
          <div className="space-y-2">
            <Label>Passwort / App-Passwort</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={formData.smtp_password_encrypted}
                onChange={(e) => setFormData({ ...formData, smtp_password_encrypted: e.target.value })}
                placeholder="••••••••"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Bei Gmail: Verwende ein App-Passwort
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Absender E-Mail</Label>
            <Input
              value={formData.smtp_from_email}
              onChange={(e) => setFormData({ ...formData, smtp_from_email: e.target.value })}
              placeholder="Optional - Standard ist Benutzername"
            />
          </div>
          <div className="space-y-2">
            <Label>Absender Name</Label>
            <Input
              value={formData.smtp_from_name}
              onChange={(e) => setFormData({ ...formData, smtp_from_name: e.target.value })}
              placeholder="z.B. Max Mustermann"
            />
          </div>
        </div>

        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Speichert..." : "Speichern"}
        </Button>
      </CardContent>
    </Card>
  );
}
