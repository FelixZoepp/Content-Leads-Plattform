import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Globe,
  CheckCircle,
  AlertCircle,
  Copy,
  Info,
  Shield,
  Loader2,
  Trash2,
  RefreshCw,
  XCircle,
  Clock,
} from "lucide-react";
import { useAccountFilter } from "@/hooks/useAccountFilter";

// Vercel DNS targets
const VERCEL_A_RECORD = "76.76.21.21";
const VERCEL_CNAME = "cname.vercel-dns.com";

type DomainStatus = "pending_dns" | "dns_verified" | "ssl_active" | "error";

interface DomainRecord {
  id: string;
  account_id: string;
  domain: string;
  status: DomainStatus;
  verified: boolean;
  ssl_active: boolean;
  verified_at: string | null;
  ssl_activated_at: string | null;
  last_checked_at: string | null;
  last_error: string | null;
  created_at: string;
}

interface VercelVerification {
  type: string;
  domain: string;
  value: string;
  reason: string;
}

const STATUS_CONFIG: Record<
  DomainStatus,
  { label: string; color: string; icon: React.ReactNode; bgColor: string }
> = {
  pending_dns: {
    label: "DNS wird geprüft",
    color: "text-yellow-500",
    icon: <Clock className="h-4 w-4" />,
    bgColor: "bg-yellow-500/10 border-yellow-500/30",
  },
  dns_verified: {
    label: "DNS verifiziert",
    color: "text-blue-500",
    icon: <CheckCircle className="h-4 w-4" />,
    bgColor: "bg-blue-500/10 border-blue-500/30",
  },
  ssl_active: {
    label: "Aktiv & SSL gesichert",
    color: "text-green-500",
    icon: <Shield className="h-4 w-4" />,
    bgColor: "bg-green-500/10 border-green-500/30",
  },
  error: {
    label: "Fehler",
    color: "text-red-500",
    icon: <XCircle className="h-4 w-4" />,
    bgColor: "bg-red-500/10 border-red-500/30",
  },
};

const DNS_PROVIDER_INSTRUCTIONS: Record<
  string,
  { name: string; steps: string[] }
> = {
  strato: {
    name: "Strato",
    steps: [
      "Logge dich bei Strato ein und gehe zu Domains > Domainverwaltung",
      "Klicke auf deine Domain und dann auf DNS-Einstellungen",
      'Unter "A-Record" klicke auf "Record hinzufügen"',
      `Name: @ (oder leer lassen), Typ: A, Wert: ${VERCEL_A_RECORD}`,
      "Speichern und bis zu 24h auf DNS-Propagierung warten",
    ],
  },
  ionos: {
    name: "IONOS (1&1)",
    steps: [
      "Logge dich bei IONOS ein und gehe zu Domains & SSL",
      "Wähle deine Domain und klicke auf DNS-Einstellungen",
      'Klicke auf "Record hinzufügen"',
      `Typ: A, Hostname: @ (oder leer), Zeigt auf: ${VERCEL_A_RECORD}`,
      "Speichern - Änderungen können bis zu 48h dauern",
    ],
  },
  cloudflare: {
    name: "Cloudflare",
    steps: [
      "Logge dich bei Cloudflare ein und wähle deine Domain",
      "Gehe zu DNS > Records",
      'Klicke auf "Add record"',
      `Typ: A, Name: @, IPv4 address: ${VERCEL_A_RECORD}`,
      'WICHTIG: Proxy-Status auf "DNS only" (graue Wolke) setzen!',
      "DNS-Propagierung dauert bei Cloudflare meist nur wenige Minuten",
    ],
  },
  namecheap: {
    name: "Namecheap",
    steps: [
      "Logge dich bei Namecheap ein und gehe zu Domain List",
      'Klicke auf "Manage" bei deiner Domain',
      "Gehe zu Advanced DNS",
      'Klicke auf "Add New Record"',
      `Typ: A Record, Host: @, Value: ${VERCEL_A_RECORD}, TTL: Automatic`,
    ],
  },
  godaddy: {
    name: "GoDaddy",
    steps: [
      "Logge dich bei GoDaddy ein und gehe zu My Products > Domains",
      "Klicke auf DNS neben deiner Domain",
      'Klicke auf "Add" unter Records',
      `Typ: A, Name: @, Value: ${VERCEL_A_RECORD}, TTL: 1 Stunde`,
      "Speichern und warten",
    ],
  },
  allinkl: {
    name: "All-Inkl",
    steps: [
      "Logge dich im KAS (technische Verwaltung) ein",
      "Gehe zu Tools > DNS-Einstellungen",
      "Wähle deine Domain aus",
      'Ändere den bestehenden A-Record oder füge neue hinzu',
      `Name: (leer für Root), Typ: A, Wert: ${VERCEL_A_RECORD}`,
    ],
  },
  hetzner: {
    name: "Hetzner",
    steps: [
      "Logge dich in der Hetzner DNS Console ein",
      "Wähle deine Zone (Domain) aus",
      'Klicke auf "Add record"',
      `Typ: A, Name: @ (oder leer), Value: ${VERCEL_A_RECORD}`,
      "TTL auf 300 setzen für schnellere Propagierung",
    ],
  },
};

async function apiCall(path: string, body: Record<string, any>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Nicht eingeloggt");

  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Unbekannter Fehler");
  return data;
}

export default function DomainSettings() {
  const { accountId } = useAccountFilter();
  const queryClient = useQueryClient();
  const [domainInput, setDomainInput] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("strato");
  const [showSetup, setShowSetup] = useState(false);
  const [vercelVerification, setVercelVerification] = useState<VercelVerification[]>([]);

  // Fetch existing domain record
  const { data: domainRecord, isLoading } = useQuery({
    queryKey: ["custom-domain", accountId],
    queryFn: async (): Promise<DomainRecord | null> => {
      if (!accountId) return null;
      const { data, error } = await (supabase as any)
        .from("custom_domains")
        .select("*")
        .eq("account_id", accountId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });

  useEffect(() => {
    if (domainRecord?.domain) {
      setDomainInput(domainRecord.domain);
    }
  }, [domainRecord]);

  // Save domain → add to Vercel + Supabase
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error("Kein Account");
      const data = await apiCall("/api/domains/add", {
        domain: domainInput,
        account_id: accountId,
      });
      if (data.verification?.length > 0) {
        setVercelVerification(data.verification);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-domain"] });
      setShowSetup(true);
      toast.success("Domain bei Vercel registriert! Folge jetzt der DNS-Anleitung.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Verify domain via Vercel API
  const verifyMutation = useMutation({
    mutationFn: async () => {
      if (!accountId || !domainRecord?.domain) throw new Error("Keine Domain konfiguriert");
      return await apiCall("/api/domains/status", {
        domain: domainRecord.domain,
        account_id: accountId,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["custom-domain"] });
      if (data.verification?.length > 0) {
        setVercelVerification(data.verification);
      }
      if (data.ssl_active) {
        toast.success("Domain vollständig verifiziert und SSL aktiv!");
      } else if (data.verified) {
        toast.info(data.message || "DNS-Records noch nicht korrekt konfiguriert.");
      } else {
        toast.error(data.message || "Domain konnte nicht verifiziert werden.");
      }
    },
    onError: (error: Error) => {
      toast.error("Verifizierung fehlgeschlagen: " + error.message);
    },
  });

  // Remove domain from Vercel + Supabase
  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!domainRecord?.domain || !accountId) throw new Error("Keine Domain");
      return await apiCall("/api/domains/remove", {
        domain: domainRecord.domain,
        account_id: accountId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-domain"] });
      setDomainInput("");
      setShowSetup(false);
      setVercelVerification([]);
      toast.success("Domain entfernt.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Kopiert!");
  };

  const hasDomain = !!domainRecord?.domain;
  const status = domainRecord?.status as DomainStatus | undefined;
  const statusConfig = status ? STATUS_CONFIG[status] : null;
  const isSubdomain = domainInput.split(".").length > 2;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          <CardTitle>Custom Domain</CardTitle>
          {statusConfig && (
            <span className={`flex items-center gap-1.5 text-sm font-medium ${statusConfig.color}`}>
              {statusConfig.icon}
              {statusConfig.label}
            </span>
          )}
        </div>
        <CardDescription>
          Verbinde deine eigene Domain für personalisierte Lead-Seiten.
          Du brauchst eine separate Domain nur für Lead-Seiten (z.B. wolf-leads.de).
          Deine Hauptwebsite bleibt davon unberührt.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Domain-Empfehlung */}
        {!hasDomain && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Tipp:</strong> Kaufe dir eine kurze, seriöse Domain bei Namecheap, IONOS oder
              Cloudflare (ab ca. 10€/Jahr). Die Domain wird ausschließlich für deine Lead-Seiten
              verwendet. Beispiel: <code className="bg-muted px-1 rounded">wolf-leads.de</code>
            </AlertDescription>
          </Alert>
        )}

        {/* Domain Input */}
        <div className="space-y-2">
          <Label>Deine Lead-Domain</Label>
          <div className="flex gap-2">
            <div className="flex items-center bg-muted px-3 rounded-l-md border border-r-0">
              <span className="text-muted-foreground text-sm">https://</span>
            </div>
            <Input
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="meine-leads.de"
              className="rounded-l-none"
              disabled={hasDomain && domainRecord?.verified}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Root-Domain oder Subdomain eingeben. Beispiel: <code>meine-leads.de</code> oder <code>leads.meine-firma.de</code>
          </p>
        </div>

        {/* Save / Change Domain */}
        {(!hasDomain || domainInput !== domainRecord?.domain) && (
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !domainInput.trim()}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registriert bei Vercel...
              </>
            ) : hasDomain ? (
              "Domain ändern"
            ) : (
              "Domain einrichten"
            )}
          </Button>
        )}

        {/* Vercel TXT Verification (if needed) */}
        {vercelVerification.length > 0 && !domainRecord?.verified && (
          <Alert className="border-amber-500/30 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="space-y-3">
              <p className="font-semibold text-amber-700 dark:text-amber-400">
                Domain-Inhaberschaft muss bestätigt werden
              </p>
              <p className="text-sm">
                Erstelle zusätzlich diesen TXT-Record bei deinem Domain-Anbieter:
              </p>
              {vercelVerification.map((v, i) => (
                <div key={i} className="p-3 bg-background rounded-lg border space-y-1">
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    <div className="p-1.5 bg-muted rounded border">
                      <p className="text-muted-foreground">Typ</p>
                      <p className="font-mono font-semibold">{v.type}</p>
                    </div>
                    <div className="p-1.5 bg-muted rounded border">
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-mono text-xs break-all">{v.domain}</p>
                    </div>
                    <div className="p-1.5 bg-muted rounded border">
                      <p className="text-muted-foreground">Wert</p>
                      <div className="flex items-center gap-1">
                        <p className="font-mono text-xs break-all">{v.value}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 flex-shrink-0"
                          onClick={() => copyToClipboard(v.value)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {/* DNS Setup Instructions */}
        {hasDomain && (showSetup || !domainRecord?.verified) && (
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 border-b">
                <h4 className="font-semibold text-sm">
                  DNS-Einrichtung für {domainRecord.domain}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Erstelle diesen DNS-Eintrag bei deinem Domain-Anbieter:
                </p>
              </div>

              {/* DNS Records */}
              <div className="p-4 space-y-3">
                {isSubdomain ? (
                  /* CNAME for subdomains */
                  <div className="p-3 bg-muted/30 rounded-lg border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">CNAME-Record (Subdomain)</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => copyToClipboard(VERCEL_CNAME)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        <span className="text-xs">Kopieren</span>
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-xs">
                      <div className="p-1.5 bg-background rounded border">
                        <p className="text-muted-foreground">Typ</p>
                        <p className="font-mono font-semibold">CNAME</p>
                      </div>
                      <div className="p-1.5 bg-background rounded border">
                        <p className="text-muted-foreground">Name</p>
                        <p className="font-mono">{domainInput.split(".")[0]}</p>
                      </div>
                      <div className="p-1.5 bg-background rounded border">
                        <p className="text-muted-foreground">Ziel</p>
                        <p className="font-mono text-primary">{VERCEL_CNAME}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* A-Record for root domains */
                  <div className="p-3 bg-muted/30 rounded-lg border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">A-Record (Root-Domain)</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => copyToClipboard(VERCEL_A_RECORD)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        <span className="text-xs">IP kopieren</span>
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-xs">
                      <div className="p-1.5 bg-background rounded border">
                        <p className="text-muted-foreground">Typ</p>
                        <p className="font-mono font-semibold">A</p>
                      </div>
                      <div className="p-1.5 bg-background rounded border">
                        <p className="text-muted-foreground">Name</p>
                        <p className="font-mono">@</p>
                      </div>
                      <div className="p-1.5 bg-background rounded border">
                        <p className="text-muted-foreground">Ziel</p>
                        <p className="font-mono text-primary">{VERCEL_A_RECORD}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Optional www CNAME */}
                {!isSubdomain && (
                  <div className="p-3 bg-muted/30 rounded-lg border space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Optional: www-Weiterleitung
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 text-xs">
                      <div className="p-1.5 bg-background rounded border">
                        <p className="text-muted-foreground">Typ</p>
                        <p className="font-mono font-semibold">CNAME</p>
                      </div>
                      <div className="p-1.5 bg-background rounded border">
                        <p className="text-muted-foreground">Name</p>
                        <p className="font-mono">www</p>
                      </div>
                      <div className="p-1.5 bg-background rounded border">
                        <p className="text-muted-foreground">Ziel</p>
                        <p className="font-mono text-primary">{VERCEL_CNAME}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Provider-specific instructions */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 border-b">
                <h4 className="font-semibold text-sm">Anleitung für deinen Domain-Anbieter</h4>
              </div>
              <div className="p-4">
                <Tabs value={selectedProvider} onValueChange={setSelectedProvider}>
                  <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
                    {Object.entries(DNS_PROVIDER_INSTRUCTIONS).map(([key, provider]) => (
                      <TabsTrigger
                        key={key}
                        value={key}
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-3 py-1.5 rounded-full border"
                      >
                        {provider.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {Object.entries(DNS_PROVIDER_INSTRUCTIONS).map(([key, provider]) => (
                    <TabsContent key={key} value={key} className="mt-4">
                      <ol className="space-y-2 text-sm text-muted-foreground">
                        {provider.steps.map((step, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">
                              {i + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            </div>

            {/* Verify Button */}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => verifyMutation.mutate()}
                disabled={verifyMutation.isPending}
                className="flex-1"
                size="lg"
              >
                {verifyMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Prüfe bei Vercel...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Domain verifizieren
                  </>
                )}
              </Button>
            </div>

            {/* Error display */}
            {domainRecord?.last_error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{domainRecord.last_error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Verified state */}
        {domainRecord?.verified && domainRecord?.ssl_active && (
          <div className="space-y-4">
            <Alert className="border-green-500/30 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                <strong>Domain aktiv!</strong> Deine Lead-Seiten sind jetzt unter{" "}
                <code className="bg-green-500/10 px-1 rounded font-semibold">
                  https://{domainRecord.domain}
                </code>{" "}
                erreichbar. SSL-Zertifikat wird automatisch von Vercel verwaltet.
              </AlertDescription>
            </Alert>

            {/* URL Preview */}
            <div className="p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-2">Beispiel Lead-URL:</p>
              <code className="text-sm text-primary font-semibold">
                https://{domainRecord.domain}/max-mueller/1001
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Format: domain/lead-name/teammitglied-code
              </p>
            </div>

            {/* Re-verify and setup toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => verifyMutation.mutate()}
                disabled={verifyMutation.isPending}
              >
                {verifyMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                <span className="ml-1.5">Erneut prüfen</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSetup(!showSetup)}
              >
                <Info className="h-3 w-3" />
                <span className="ml-1.5">{showSetup ? "Anleitung ausblenden" : "DNS-Anleitung"}</span>
              </Button>
            </div>

            {domainRecord.last_checked_at && (
              <p className="text-xs text-muted-foreground">
                Zuletzt geprüft:{" "}
                {new Date(domainRecord.last_checked_at).toLocaleString("de-DE")}
              </p>
            )}
          </div>
        )}

        {/* Verified but not yet ssl_active */}
        {domainRecord?.verified && !domainRecord?.ssl_active && (
          <Alert className="border-blue-500/30 bg-blue-500/10">
            <Info className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-blue-700 dark:text-blue-400">
              Domain-Inhaberschaft verifiziert, aber DNS-Records zeigen noch nicht auf Vercel.
              Bitte stelle sicher, dass der {isSubdomain ? "CNAME" : "A"}-Record korrekt gesetzt ist.
            </AlertDescription>
          </Alert>
        )}

        {/* Remove domain */}
        {hasDomain && (
          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (confirm("Domain wirklich entfernen? Lead-Links über diese Domain funktionieren dann nicht mehr.")) {
                  removeMutation.mutate();
                }
              }}
              disabled={removeMutation.isPending}
            >
              <Trash2 className="h-3 w-3 mr-1.5" />
              Domain entfernen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
