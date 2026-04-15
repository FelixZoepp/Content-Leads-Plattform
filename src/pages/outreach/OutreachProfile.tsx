import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { prepareAvatarUpload } from "@/lib/avatarImage";
import { User, Calendar, Phone, Mail, Save, Loader2, Camera, ImagePlus, Webhook, Euro } from "lucide-react";
import TeamInvite from "@/components/outreach/TeamInvite";
import DomainSettings from "@/components/outreach/DomainSettings";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone_number: string | null;
  calendar_url: string | null;
  avatar_url: string | null;
}

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [defaultDealAmount, setDefaultDealAmount] = useState<string>("0");
  const [profile, setProfile] = useState<ProfileData>({
    id: "",
    name: "",
    email: "",
    phone_number: null,
    calendar_url: null,
    avatar_url: null,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, phone_number, calendar_url, avatar_url")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile({
        id: data?.id || user.id,
        name: data?.name || "",
        email: data?.email || user.email || "",
        phone_number: data?.phone_number || null,
        calendar_url: data?.calendar_url || null,
        avatar_url: data?.avatar_url || null,
      });

      // Load default deal amount from account
      const { data: pData } = await supabase.from("profiles").select("account_id").eq("id", user.id).single();
      if (pData?.account_id) {
        const { data: account } = await supabase.from("accounts").select("default_deal_amount").eq("id", pData.account_id).single();
        if (account?.default_deal_amount) {
          setDefaultDealAmount(String(account.default_deal_amount));
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Fehler beim Laden des Profils");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile.id) return;

    setUploading(true);
    try {
      if (!file.type.startsWith("image/")) {
        toast.error("Bitte wähle eine Bilddatei aus");
        return;
      }

      // Reduce size aggressively to avoid backend upload limits (413 Payload too large)
      const processedFile = await prepareAvatarUpload(file);

      // Create a unique filename with user id as folder
      const fileName = `${Date.now()}.webp`;
      const filePath = `${profile.id}/${fileName}`;

      // Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, processedFile, {
          upsert: true,
          contentType: processedFile.type,
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
      toast.success("Profilbild aktualisiert!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Fehler beim Hochladen des Bildes");
    } finally {
      setUploading(false);
      // allow re-uploading the same file
      event.target.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht eingeloggt");

      const { error } = await supabase
        .from("profiles")
        .update({
          name: profile.name,
          phone_number: profile.phone_number,
          calendar_url: profile.calendar_url,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profil gespeichert");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const getCalendarPreviewUrl = () => {
    if (!profile.calendar_url) return null;
    
    if (profile.calendar_url.includes("calendly.com")) {
      return profile.calendar_url;
    }
    if (profile.calendar_url.includes("cal.com")) {
      return profile.calendar_url;
    }
    return null;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profil & Einstellungen</h1>
          <p className="text-muted-foreground mt-1">
            Verwalte deine persönlichen Daten und Integrationen
          </p>
        </div>

        {/* Profile Picture Section */}
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImagePlus className="w-5 h-5 text-primary" />
              Profilbild
            </CardTitle>
            <CardDescription>
              Lade ein Profilbild hoch, das in der Sidebar und auf deinen Seiten angezeigt wird
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-white/10">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.name} />
                  <AvatarFallback className="bg-primary/20 text-primary text-2xl font-semibold">
                    {getInitials(profile.name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  {uploading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{profile.name || 'Dein Name'}</p>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Klicke auf das Bild um ein neues hochzuladen
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Info */}
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Persönliche Daten
            </CardTitle>
            <CardDescription>
              Diese Daten werden auf deinen personalisierten Lead-Seiten angezeigt
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Dein Name"
                className="glass-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                E-Mail
              </Label>
              <Input
                id="email"
                value={profile.email}
                disabled
                className="glass-input opacity-60"
              />
              <p className="text-xs text-muted-foreground">
                E-Mail-Adresse kann nicht geändert werden. Sie wird als Kontaktmöglichkeit auf deinen Lead-Seiten angezeigt.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Telefon
              </Label>
              <Input
                id="phone"
                value={profile.phone_number || ""}
                onChange={(e) => setProfile({ ...profile, phone_number: e.target.value || null })}
                placeholder="+49 123 456789"
                className="glass-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Calendar Integration */}
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              Kalender-Integration
            </CardTitle>
            <CardDescription>
              Verbinde deinen Calendly oder Cal.com Kalender für automatische Terminbuchungen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="calendar">Kalender-Link</Label>
              <Input
                id="calendar"
                value={profile.calendar_url || ""}
                onChange={(e) => setProfile({ ...profile, calendar_url: e.target.value || null })}
                placeholder="https://calendly.com/dein-name oder https://cal.com/dein-name"
                className="glass-input"
              />
              <p className="text-xs text-muted-foreground">
                Dieser Link wird auf deinen Lead-Seiten als CTA-Button für Terminbuchungen verwendet
              </p>
            </div>

            {getCalendarPreviewUrl() && (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm text-emerald-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Kalender verbunden: {profile.calendar_url?.includes("calendly") ? "Calendly" : "Cal.com"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Default Deal Amount */}
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="w-5 h-5 text-primary" />
              Standard-Dealvolumen
            </CardTitle>
            <CardDescription>
              Wird automatisch als Betrag für neue Deals in der Pipeline verwendet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="deal-amount">Betrag in €</Label>
              <Input
                id="deal-amount"
                type="number"
                min={0}
                value={defaultDealAmount}
                onChange={(e) => setDefaultDealAmount(e.target.value)}
                placeholder="z.B. 6000"
                className="glass-input"
              />
            </div>
            <Button variant="outline" size="sm" onClick={async () => {
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { data: p } = await supabase.from('profiles').select('account_id').eq('id', user.id).single();
                if (!p?.account_id) return;
                await supabase.from('accounts').update({ default_deal_amount: Number(defaultDealAmount) || 0 } as any).eq('id', p.account_id);
                toast.success("Standard-Dealvolumen gespeichert");
              } catch { toast.error("Fehler beim Speichern"); }
            }}>
              <Save className="w-4 h-4 mr-2" /> Speichern
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="glass-button"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Änderungen speichern
          </Button>
        </div>

        {/* Webhook Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Webhook className="w-5 h-5" />
              Webhook / Slack Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Erhalte Benachrichtigungen bei Hot Leads über Slack, Zapier, Make oder einen eigenen Webhook.
              Der Webhook empfängt ein JSON mit Lead-Name, Firma, Score und Telefonnummer.
            </p>
            <div>
              <Label>Webhook URL</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="https://hooks.slack.com/... oder https://hook.eu1.make.com/..."
                  id="webhook-url"
                  defaultValue=""
                  onFocus={async (e) => {
                    // Load current value
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    const { data: profile } = await supabase.from('profiles').select('account_id').eq('id', user.id).single();
                    if (!profile?.account_id) return;
                    const { data: integrations } = await supabase.from('account_integrations').select('enrichment_webhook_url').eq('account_id', profile.account_id).single();
                    if (integrations?.enrichment_webhook_url) e.target.value = integrations.enrichment_webhook_url;
                  }}
                />
                <Button variant="outline" onClick={async () => {
                  const input = document.getElementById('webhook-url') as HTMLInputElement;
                  const url = input?.value?.trim();
                  if (url) {
                    try {
                      const u = new URL(url);
                      if (u.protocol !== 'https:') { toast.error("Nur HTTPS URLs erlaubt"); return; }
                      if (['localhost', '127.0.0.1', '0.0.0.0'].includes(u.hostname)) { toast.error("Lokale URLs nicht erlaubt"); return; }
                    } catch { toast.error("Ungültige URL"); return; }
                  }
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    const { data: profile } = await supabase.from('profiles').select('account_id').eq('id', user.id).single();
                    if (!profile?.account_id) return;
                    await supabase.from('account_integrations').upsert({
                      account_id: profile.account_id,
                      enrichment_webhook_url: url || null,
                    }, { onConflict: 'account_id' });
                    toast.success(url ? "Webhook gespeichert" : "Webhook entfernt");
                  } catch { toast.error("Fehler beim Speichern"); }
                }}>
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom Domain */}
        <DomainSettings />

        {/* Team Management */}
        <TeamInvite />
      </div>
    </>
  );
};

export default Profile;
