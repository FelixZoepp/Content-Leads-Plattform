import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Phone, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Info,
  Copy,
  ExternalLink,
  Users,
  Globe,
  Clock,
  AlertTriangle,
  RefreshCw
} from "lucide-react";

interface PhoneNumber {
  id?: string;
  phone_number: string;
  label: string;
  is_primary: boolean;
  verified: boolean;
}

interface TeamMember {
  id?: string;
  name: string;
  email: string;
  extension: string;
  phone_number: string;
}

interface TelephonySettings {
  provider: string;
  timezone: string;
  country: string;
  webhook_verified: boolean;
  onboarding_completed: boolean;
}

// Nur Twilio BYOC - Kunde bringt seinen eigenen Twilio-Account mit
const PROVIDERS = [
  { value: "twilio", label: "Twilio", type: "byoc", description: "Bring your own Twilio Account – Browser-Telefonie" },
];

const TIMEZONES = [
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Europe/Vienna", label: "Wien (CET/CEST)" },
  { value: "Europe/Zurich", label: "Zürich (CET/CEST)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
];

const COUNTRIES = [
  { value: "DE", label: "Deutschland" },
  { value: "AT", label: "Österreich" },
  { value: "CH", label: "Schweiz" },
];

interface Props {
  accountId: string;
  onComplete?: () => void;
}

export default function TelephonyOnboarding({ accountId, onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Step 1: Provider
  const [settings, setSettings] = useState<TelephonySettings>({
    provider: "",
    timezone: "Europe/Berlin",
    country: "DE",
    webhook_verified: false,
    onboarding_completed: false,
  });
  
  // Step 2: Phone Numbers
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([
    { phone_number: "", label: "Hauptnummer", is_primary: true, verified: false }
  ]);
  
  // Step 3: Team Members
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { name: "", email: "", extension: "", phone_number: "" }
  ]);
  
  // Step 4: Webhook
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<'success' | 'error' | 'pending' | null>(null);
  
  // Twilio Credentials
  const [twilioCredentials, setTwilioCredentials] = useState({
    accountSid: "",
    authToken: "",
    phoneNumber: "",
    apiKeySid: "",
    apiKeySecret: "",
  });
  const [testingTwilio, setTestingTwilio] = useState(false);
  const [twilioTestResult, setTwilioTestResult] = useState<'success' | 'error' | null>(null);
  const [showTwilioSecrets, setShowTwilioSecrets] = useState(false);

  useEffect(() => {
    if (accountId) {
      loadExistingData();
      generateWebhookUrl();
    }
  }, [accountId]);

  const generateWebhookUrl = () => {
    const secret = crypto.randomUUID().split('-')[0];
    setWebhookSecret(secret);
    const baseUrl = `${window.location.origin.replace('localhost:8080', 'dxdknkeexankgtkpeuvt.supabase.co')}/functions/v1/telephony-webhook`;
    setWebhookUrl(`${baseUrl}?provider=${settings.provider || 'placetel'}&account_id=${accountId}&secret=${secret}`);
  };

  useEffect(() => {
    if (settings.provider && accountId) {
      const baseUrl = `https://dxdknkeexankgtkpeuvt.supabase.co/functions/v1/telephony-webhook`;
      setWebhookUrl(`${baseUrl}?provider=${settings.provider}&account_id=${accountId}&secret=${webhookSecret}`);
    }
  }, [settings.provider, accountId, webhookSecret]);

  const loadExistingData = async () => {
    try {
      // Load integration settings including Twilio credentials
      const { data: integration } = await supabase
        .from("account_integrations")
        .select(`
          telephony_provider, 
          telephony_timezone, 
          telephony_country, 
          telephony_webhook_verified, 
          telephony_onboarding_completed,
          twilio_account_sid,
          twilio_auth_token,
          twilio_phone_number,
          twilio_api_key_sid,
          twilio_api_key_secret
        `)
        .eq("account_id", accountId)
        .maybeSingle();

      if (integration) {
        setSettings({
          provider: integration.telephony_provider || "",
          timezone: integration.telephony_timezone || "Europe/Berlin",
          country: integration.telephony_country || "DE",
          webhook_verified: integration.telephony_webhook_verified || false,
          onboarding_completed: integration.telephony_onboarding_completed || false,
        });

        // Load existing Twilio credentials
        if (integration.twilio_account_sid || integration.twilio_auth_token || integration.twilio_phone_number) {
          setTwilioCredentials({
            accountSid: integration.twilio_account_sid || "",
            authToken: integration.twilio_auth_token || "",
            phoneNumber: integration.twilio_phone_number || "",
            apiKeySid: integration.twilio_api_key_sid || "",
            apiKeySecret: integration.twilio_api_key_secret || "",
          });
        }
      }

      // Load phone numbers
      const { data: numbers } = await supabase
        .from("account_phone_numbers")
        .select("*")
        .eq("account_id", accountId);

      if (numbers && numbers.length > 0) {
        setPhoneNumbers(numbers.map(n => ({
          id: n.id,
          phone_number: n.phone_number,
          label: n.label || "",
          is_primary: n.is_primary || false,
          verified: n.verified || false,
        })));
      }

      // Load team members
      const { data: members } = await supabase
        .from("account_team_members")
        .select("*")
        .eq("account_id", accountId);

      if (members && members.length > 0) {
        setTeamMembers(members.map(m => ({
          id: m.id,
          name: m.name,
          email: m.email,
          extension: m.extension || "",
          phone_number: m.phone_number || "",
        })));
      }

    } catch (error) {
      console.error("Error loading telephony data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStep = async (step: number) => {
    setSaving(true);
    try {
      if (step === 1) {
        // Save provider settings
        await supabase
          .from("account_integrations")
          .upsert({
            account_id: accountId,
            telephony_provider: settings.provider,
            telephony_timezone: settings.timezone,
            telephony_country: settings.country,
            telephony_webhook_secret: webhookSecret,
            updated_at: new Date().toISOString(),
          }, { onConflict: "account_id" });

        toast.success("Provider gespeichert");
        setCurrentStep(2);
      } else if (step === 2) {
        // Save phone numbers
        const validNumbers = phoneNumbers.filter(p => p.phone_number.trim());
        
        // Delete existing and insert new
        await supabase
          .from("account_phone_numbers")
          .delete()
          .eq("account_id", accountId);

        if (validNumbers.length > 0) {
          await supabase
            .from("account_phone_numbers")
            .insert(validNumbers.map(p => ({
              account_id: accountId,
              phone_number: p.phone_number,
              label: p.label,
              is_primary: p.is_primary,
              verified: false,
            })));
        }

        toast.success("Telefonnummern gespeichert");
        setCurrentStep(3);
      } else if (step === 3) {
        // Save team members
        const validMembers = teamMembers.filter(m => m.name.trim() && m.email.trim());

        await supabase
          .from("account_team_members")
          .delete()
          .eq("account_id", accountId);

        if (validMembers.length > 0) {
          await supabase
            .from("account_team_members")
            .insert(validMembers.map(m => ({
              account_id: accountId,
              name: m.name,
              email: m.email,
              extension: m.extension || null,
              phone_number: m.phone_number || null,
            })));
        }

        toast.success("Team gespeichert");
        setCurrentStep(4);
      } else if (step === 4) {
        // Save Twilio credentials and mark onboarding as completed
        const updateData: any = {
          telephony_onboarding_completed: true,
          updated_at: new Date().toISOString(),
        };

        // Add Twilio credentials if provider is twilio
        if (settings.provider === "twilio") {
          updateData.twilio_account_sid = twilioCredentials.accountSid;
          updateData.twilio_auth_token = twilioCredentials.authToken;
          updateData.twilio_phone_number = twilioCredentials.phoneNumber;
          updateData.twilio_api_key_sid = twilioCredentials.apiKeySid;
          updateData.twilio_api_key_secret = twilioCredentials.apiKeySecret;
        }

        await supabase
          .from("account_integrations")
          .update(updateData)
          .eq("account_id", accountId);

        toast.success("Telefonie-Setup abgeschlossen!");
        onComplete?.();
      }
    } catch (error: any) {
      console.error("Error saving:", error);
      toast.error(error.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const addPhoneNumber = () => {
    setPhoneNumbers([...phoneNumbers, { phone_number: "", label: "", is_primary: false, verified: false }]);
  };

  const removePhoneNumber = (index: number) => {
    if (phoneNumbers.length > 1) {
      setPhoneNumbers(phoneNumbers.filter((_, i) => i !== index));
    }
  };

  const addTeamMember = () => {
    setTeamMembers([...teamMembers, { name: "", email: "", extension: "", phone_number: "" }]);
  };

  const removeTeamMember = (index: number) => {
    if (teamMembers.length > 1) {
      setTeamMembers(teamMembers.filter((_, i) => i !== index));
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("Webhook-URL kopiert!");
  };

  const testTwilioConnection = async () => {
    setTestingTwilio(true);
    setTwilioTestResult(null);
    
    try {
      // First save the credentials to the database
      const { error: saveError } = await supabase
        .from("account_integrations")
        .upsert({
          account_id: accountId,
          twilio_account_sid: twilioCredentials.accountSid,
          twilio_auth_token: twilioCredentials.authToken,
          twilio_phone_number: twilioCredentials.phoneNumber,
          twilio_api_key_sid: twilioCredentials.apiKeySid,
          twilio_api_key_secret: twilioCredentials.apiKeySecret,
          updated_at: new Date().toISOString(),
        }, { onConflict: "account_id" });

      if (saveError) throw saveError;

      // Try to get a Twilio token to test the connection
      const { data, error } = await supabase.functions.invoke('twilio-token');

      if (error) {
        console.error("Twilio token error:", error);
        setTwilioTestResult('error');
        toast.error("Verbindung fehlgeschlagen: " + (error.message || "Überprüfe deine Zugangsdaten"));
        return;
      }

      if (data?.token) {
        setTwilioTestResult('success');
        toast.success("Twilio-Verbindung erfolgreich!");
        
        // Mark as verified
        await supabase
          .from("account_integrations")
          .update({
            telephony_webhook_verified: true,
            telephony_webhook_verified_at: new Date().toISOString(),
          })
          .eq("account_id", accountId);
          
        setSettings(prev => ({ ...prev, webhook_verified: true }));
      } else {
        setTwilioTestResult('error');
        toast.error("Keine gültige Antwort von Twilio erhalten");
      }
    } catch (error: any) {
      console.error("Twilio test error:", error);
      setTwilioTestResult('error');
      toast.error(error.message || "Verbindung fehlgeschlagen");
    } finally {
      setTestingTwilio(false);
    }
  };

  const testWebhookConnection = async () => {
    setTestingWebhook(true);
    setWebhookTestResult('pending');
    
    try {
      // Check if we received any webhook events in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: events, error } = await supabase
        .from("telephony_webhook_events")
        .select("id, created_at, event_type")
        .eq("account_id", accountId)
        .gte("created_at", fiveMinutesAgo)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (events && events.length > 0) {
        setWebhookTestResult('success');
        toast.success("Webhook-Verbindung erfolgreich!");
        
        // Update verified status
        await supabase
          .from("account_integrations")
          .update({
            telephony_webhook_verified: true,
            telephony_webhook_verified_at: new Date().toISOString(),
          })
          .eq("account_id", accountId);
          
        setSettings(prev => ({ ...prev, webhook_verified: true }));
      } else {
        setWebhookTestResult('error');
        toast.error("Noch kein Webhook empfangen. Bitte Konfiguration prüfen.");
      }
    } catch (error) {
      console.error("Webhook test error:", error);
      setWebhookTestResult('error');
    } finally {
      setTestingWebhook(false);
    }
  };

  const selectedProvider = PROVIDERS.find(p => p.value === settings.provider);

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                currentStep >= step
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step}
            </div>
            <span className={`ml-2 text-sm hidden sm:block ${currentStep >= step ? "text-foreground" : "text-muted-foreground"}`}>
              {step === 1 && "Provider"}
              {step === 2 && "Rufnummern"}
              {step === 3 && "Team"}
              {step === 4 && "Verbindung"}
            </span>
            {step < 4 && (
              <div className={`w-8 md:w-16 h-0.5 mx-2 ${currentStep > step ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Provider Selection */}
      {currentStep === 1 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              Schritt 1: Telefonie-Anbieter
            </CardTitle>
            <CardDescription>
              Verbinde deinen eigenen Telefonieanbieter. Wir empfehlen Twilio für die beste Browser-Telefonie-Erfahrung.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-primary/10 border-primary/20">
              <Info className="w-4 h-4 text-primary" />
              <AlertDescription>
                <strong>Empfehlung: Twilio</strong> – Mit deinem eigenen Twilio-Account kannst du direkt aus dem Browser telefonieren. 
                Die Kosten (ca. 0,01-0,02€/Min) entstehen direkt bei Twilio.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Label>Anbieter auswählen *</Label>
              {PROVIDERS.map((provider) => (
                <div 
                  key={provider.value}
                  onClick={() => setSettings(prev => ({ ...prev, provider: provider.value }))}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    settings.provider === provider.value 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        settings.provider === provider.value 
                          ? 'border-primary bg-primary' 
                          : 'border-muted-foreground'
                      }`}>
                        {settings.provider === provider.value && (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="font-medium">{provider.label}</span>
                        <p className="text-xs text-muted-foreground">{provider.description}</p>
                      </div>
                    </div>
                    <Badge variant={provider.value === 'twilio' ? 'default' : 'secondary'} className="text-[10px]">
                      {provider.type === "webhook" && "Tracking"}
                      {provider.type === "byoc" && "Browser-Telefonie"}
                      {provider.type === "other" && "Manuell"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Zeitzone
                </Label>
                <Select 
                  value={settings.timezone} 
                  onValueChange={(value) => setSettings(prev => ({ ...prev, timezone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Land
                </Label>
                <Select 
                  value={settings.country} 
                  onValueChange={(value) => setSettings(prev => ({ ...prev, country: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.value} value={country.value}>
                        {country.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={() => handleSaveStep(1)} 
                disabled={!settings.provider || saving}
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Weiter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Phone Numbers */}
      {currentStep === 2 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              Schritt 2: Rufnummern
            </CardTitle>
            <CardDescription>
              Welche Rufnummern sollen getrackt werden? Diese werden für Call-Matching und Analytics verwendet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {phoneNumbers.map((phone, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-1 grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Input
                      value={phone.phone_number}
                      onChange={(e) => {
                        const updated = [...phoneNumbers];
                        updated[index].phone_number = e.target.value;
                        setPhoneNumbers(updated);
                      }}
                      placeholder="+49 30 123456789"
                    />
                  </div>
                  <div className="space-y-1">
                    <Input
                      value={phone.label}
                      onChange={(e) => {
                        const updated = [...phoneNumbers];
                        updated[index].label = e.target.value;
                        setPhoneNumbers(updated);
                      }}
                      placeholder="Bezeichnung (z.B. Hauptnummer)"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removePhoneNumber(index)}
                  disabled={phoneNumbers.length <= 1}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            <Button variant="outline" onClick={addPhoneNumber} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Weitere Nummer hinzufügen
            </Button>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Zurück
              </Button>
              <Button 
                onClick={() => handleSaveStep(2)} 
                disabled={!phoneNumbers.some(p => p.phone_number.trim()) || saving}
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Weiter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Team Members */}
      {currentStep === 3 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Schritt 3: Team
            </CardTitle>
            <CardDescription>
              Wer ist für Anrufe verantwortlich? Diese Personen können Calls zugewiesen und benachrichtigt werden.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {teamMembers.map((member, index) => (
              <div key={index} className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Team-Mitglied {index + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTeamMember(index)}
                    disabled={teamMembers.length <= 1}
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    value={member.name}
                    onChange={(e) => {
                      const updated = [...teamMembers];
                      updated[index].name = e.target.value;
                      setTeamMembers(updated);
                    }}
                    placeholder="Name *"
                  />
                  <Input
                    type="email"
                    value={member.email}
                    onChange={(e) => {
                      const updated = [...teamMembers];
                      updated[index].email = e.target.value;
                      setTeamMembers(updated);
                    }}
                    placeholder="E-Mail *"
                  />
                  <Input
                    value={member.extension}
                    onChange={(e) => {
                      const updated = [...teamMembers];
                      updated[index].extension = e.target.value;
                      setTeamMembers(updated);
                    }}
                    placeholder="Durchwahl (optional)"
                  />
                  <Input
                    value={member.phone_number}
                    onChange={(e) => {
                      const updated = [...teamMembers];
                      updated[index].phone_number = e.target.value;
                      setTeamMembers(updated);
                    }}
                    placeholder="Direktnummer (optional)"
                  />
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addTeamMember} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Weiteres Team-Mitglied
            </Button>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                Zurück
              </Button>
              <Button 
                onClick={() => handleSaveStep(3)} 
                disabled={!teamMembers.some(m => m.name.trim() && m.email.trim()) || saving}
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Weiter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Connection / Webhook */}
      {currentStep === 4 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-primary" />
              Schritt 4: Verbindung einrichten
            </CardTitle>
            <CardDescription>
              {selectedProvider?.type === "webhook" 
                ? "Kopiere die Webhook-URL und füge sie in deinem Telefonieanbieter ein."
                : selectedProvider?.type === "api"
                ? "Gib deine API-Zugangsdaten ein."
                : "Richte die Verbindung zu deinem Provider ein."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Webhook Setup for Placetel/Sipgate */}
            {(settings.provider === "placetel" || settings.provider === "sipgate") && (
              <>
                <div className="space-y-2">
                  <Label>Webhook-URL</Label>
                  <div className="flex gap-2">
                    <Input value={webhookUrl} readOnly className="font-mono text-xs" />
                    <Button variant="outline" onClick={copyWebhookUrl}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Kopiere diese URL und füge sie in den Webhook-Einstellungen deines {selectedProvider?.label}-Accounts ein.
                  </p>
                </div>

                <Alert className="bg-primary/5 border-primary/20">
                  <Info className="w-4 h-4 text-primary" />
                  <AlertDescription className="text-sm">
                    <strong>Anleitung für {selectedProvider?.label}:</strong>
                    <ol className="list-decimal ml-4 mt-2 space-y-1">
                      {settings.provider === "placetel" && (
                        <>
                          <li>Melde dich bei Placetel an</li>
                          <li>Gehe zu Einstellungen → Webhooks</li>
                          <li>Füge die obige URL als neuen Webhook hinzu</li>
                          <li>Aktiviere Events für: Anruf gestartet, Anruf beendet</li>
                        </>
                      )}
                      {settings.provider === "sipgate" && (
                        <>
                          <li>Melde dich bei Sipgate an</li>
                          <li>Gehe zu Einstellungen → Webhooks</li>
                          <li>Füge die obige URL als Push-API URL hinzu</li>
                          <li>Aktiviere Events für: newCall, answer, hangup</li>
                        </>
                      )}
                    </ol>
                  </AlertDescription>
                </Alert>

                {/* Webhook Test */}
                <div className="space-y-3">
                  <Label>Verbindung testen</Label>
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="outline" 
                      onClick={testWebhookConnection}
                      disabled={testingWebhook}
                    >
                      {testingWebhook ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Webhook prüfen
                    </Button>
                    
                    {webhookTestResult === 'success' && (
                      <div className="flex items-center gap-2 text-green-500">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Verbindung erfolgreich</span>
                      </div>
                    )}
                    {webhookTestResult === 'error' && (
                      <div className="flex items-center gap-2 text-amber-500">
                        <AlertTriangle className="w-5 h-5" />
                        <span>Noch kein Event empfangen</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tätige einen Test-Anruf und klicke dann auf "Webhook prüfen". 
                    Wir suchen nach empfangenen Events der letzten 5 Minuten.
                  </p>
                </div>
              </>
            )}

            {/* API Setup for Sipgate/Aircall */}
            {settings.provider === "aircall" && (
              <Alert className="bg-muted/50">
                <Info className="w-4 h-4" />
                <AlertDescription>
                  Aircall-Integration kommt bald. Kontaktiere uns für eine manuelle Einrichtung.
                </AlertDescription>
              </Alert>
            )}

            {/* BYOC for Twilio - Hauptoption */}
            {settings.provider === "twilio" && (
              <div className="space-y-6">
                {/* Voraussetzungen */}
                <Alert className="bg-amber-500/10 border-amber-500/30">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <AlertDescription>
                    <strong>Wichtig:</strong> Du benötigst einen aktiven Twilio-Account mit einer verifizierten Telefonnummer 
                    und ausreichendem Guthaben. Testkonten funktionieren nur für verifizierte Nummern.
                  </AlertDescription>
                </Alert>

                {/* Zugangsdaten Eingabe */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Twilio Zugangsdaten</h4>
                  
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="accountSid">Account SID</Label>
                      <Input
                        id="accountSid"
                        placeholder="AC..."
                        value={twilioCredentials.accountSid}
                        onChange={(e) => setTwilioCredentials(prev => ({ ...prev, accountSid: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Findest du auf der <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Twilio Console</a> Startseite
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="authToken">Auth Token</Label>
                      <Input
                        id="authToken"
                        type={showTwilioSecrets ? "text" : "password"}
                        placeholder="••••••••••••••••••••••••••••••••"
                        value={twilioCredentials.authToken}
                        onChange={(e) => setTwilioCredentials(prev => ({ ...prev, authToken: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Telefonnummer</Label>
                      <Input
                        id="phoneNumber"
                        placeholder="+4930123456789"
                        value={twilioCredentials.phoneNumber}
                        onChange={(e) => setTwilioCredentials(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Deine gekaufte Twilio-Nummer mit Ländervorwahl
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apiKeySid">API Key SID</Label>
                      <Input
                        id="apiKeySid"
                        placeholder="SK..."
                        value={twilioCredentials.apiKeySid}
                        onChange={(e) => setTwilioCredentials(prev => ({ ...prev, apiKeySid: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Erstelle unter <a href="https://console.twilio.com/us1/account/keys-credentials/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">API Keys</a> einen "Standard" Key
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apiKeySecret">API Key Secret</Label>
                      <Input
                        id="apiKeySecret"
                        type={showTwilioSecrets ? "text" : "password"}
                        placeholder="••••••••••••••••••••••••••••••••"
                        value={twilioCredentials.apiKeySecret}
                        onChange={(e) => setTwilioCredentials(prev => ({ ...prev, apiKeySecret: e.target.value }))}
                      />
                      <Alert className="mt-2 bg-destructive/10 border-destructive/30">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        <AlertDescription className="text-xs">
                          <strong>Wichtig:</strong> Das Secret wird nur einmal angezeigt! Speichere es sofort.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTwilioSecrets(!showTwilioSecrets)}
                    >
                      {showTwilioSecrets ? "Secrets verbergen" : "Secrets anzeigen"}
                    </Button>
                  </div>
                </div>

                {/* Verbindungstest */}
                <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
                  <Label>Verbindung testen</Label>
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="outline" 
                      onClick={testTwilioConnection}
                      disabled={testingTwilio || !twilioCredentials.accountSid || !twilioCredentials.authToken || !twilioCredentials.apiKeySid || !twilioCredentials.apiKeySecret}
                    >
                      {testingTwilio ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Twilio testen
                    </Button>
                    
                    {twilioTestResult === 'success' && (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Verbindung erfolgreich!</span>
                      </div>
                    )}
                    {twilioTestResult === 'error' && (
                      <div className="flex items-center gap-2 text-destructive">
                        <XCircle className="w-5 h-5" />
                        <span>Verbindung fehlgeschlagen</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Teste die Verbindung bevor du fortfährst. Wir prüfen ob deine Zugangsdaten korrekt sind.
                  </p>
                </div>

                {/* Kostenübersicht */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-muted-foreground" />
                    Twilio Kosten (ca.)
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Ausgehende Anrufe nach DE: ~0,014€/Min</li>
                    <li>• Eingehende Anrufe: ~0,005€/Min</li>
                    <li>• Telefonnummer (DE): ~1€/Monat</li>
                    <li>• <strong>Keine Grundgebühr</strong> – Pay-as-you-go</li>
                  </ul>
                </div>

                {/* Hinweis Test vs. Produktiv */}
                <Alert className="bg-muted/50 border-border">
                  <Info className="w-4 h-4" />
                  <AlertDescription className="text-sm">
                    <strong>Test-Account vs. Produktiv:</strong> Mit einem Twilio Test-Account kannst du nur 
                    verifizierte Telefonnummern anrufen. Für den Produktivbetrieb musst du deinen Account upgraden 
                    und Guthaben aufladen.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Other providers */}
            {settings.provider === "other" && (
              <Alert className="bg-muted/50">
                <Info className="w-4 h-4" />
                <AlertDescription>
                  Für andere Anbieter ist eine manuelle Konfiguration erforderlich. 
                  Kontaktiere uns unter <a href="mailto:support@pitchfirst.io" className="text-primary underline">support@pitchfirst.io</a> für Unterstützung.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(3)}>
                Zurück
              </Button>
              <Button 
                onClick={() => handleSaveStep(4)} 
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Setup abschließen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
