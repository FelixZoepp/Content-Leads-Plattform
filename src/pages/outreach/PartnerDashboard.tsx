import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Copy, Users, Euro, TrendingUp, Link as LinkIcon, Loader2, UserPlus, ExternalLink, Download, Award } from "lucide-react";
import partnerBadge from "@/assets/pitchfirst-partner-badge.png";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Affiliate {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  link?: string;
  partner_code?: string | null;
  links?: { url: string; id: string; token?: string }[];
  visitors: number;
  leads: number;
  conversions: number;
  created_at: string;
}

interface Referral {
  id: string;
  visitor_id: string;
  email: string;
  customer_email: string;
  stripe_customer_id: string;
  created_at: string;
  conversion_state: string;
}

interface Commission {
  id: string;
  amount: number;
  currency: string;
  state: string;
  created_at: string;
  due_at: string;
  paid_at: string | null;
  referral_id: string;
}

export default function PartnerDashboard() {
  const { session } = useAuth();
  const user = session?.user;
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);

  useEffect(() => {
    if (user) {
      fetchAffiliateData();
    }
  }, [user]);

  const fetchAffiliateData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("rewardful-affiliate", {
        body: { action: "get-affiliate" },
      });

      if (error) throw error;

      if (data.exists) {
        setAffiliate(data.affiliate);
        setReferrals(data.referrals || []);
        setCommissions(data.commissions || []);
      }
    } catch (error) {
      console.error("Error fetching affiliate data:", error);
      toast.error("Fehler beim Laden der Partnerdaten");
    } finally {
      setLoading(false);
    }
  };

  const createAffiliate = async () => {
    try {
      setCreating(true);
      
      // Prüfe ob Nutzer eingeloggt ist
      if (!user?.email) {
        toast.error("Bitte logge dich zuerst ein, um Partner zu werden.");
        return;
      }
      
      const { data, error } = await supabase.functions.invoke("rewardful-affiliate", {
        body: { action: "create-affiliate" },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Verbindungsfehler");
      }

      if (data?.error) {
        console.error("API error:", data.error);
        throw new Error(data.error);
      }

      if (data?.exists) {
        setAffiliate(data.affiliate);
        setReferrals(data.referrals || []);
        setCommissions(data.commissions || []);
        toast.success("Partner-Account erfolgreich erstellt!");
      } else {
        toast.error("Unerwartete Antwort vom Server. Bitte versuche es erneut.");
      }
    } catch (error: any) {
      console.error("Error creating affiliate:", error);
      const message = error?.message || "Unbekannter Fehler";
      
      if (message.includes("Authentication") || message.includes("authorization")) {
        toast.error("Bitte logge dich erneut ein und versuche es nochmal.");
      } else if (message.includes("REWARDFUL")) {
        toast.error("Partner-System nicht konfiguriert. Bitte kontaktiere den Support.");
      } else {
        toast.error(`Fehler: ${message}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const getPartnerCode = () => {
    return affiliate?.partner_code || affiliate?.links?.[0]?.token || null;
  };

  const buildAffiliateLink = (rawUrl: string, code: string | null) => {
    if (!code) return rawUrl;

    try {
      const url = new URL(rawUrl);
      // Always enforce the user's own code in the URL
      url.searchParams.set("via", code);
      return url.toString();
    } catch {
      // Fallback for non-standard URLs
      const sep = rawUrl.includes("?") ? "&" : "?";
      const cleaned = rawUrl.replace(/[?&]via=[^&]*/i, "");
      return `${cleaned}${sep}via=${encodeURIComponent(code)}`;
    }
  };

  const getAffiliateLink = () => {
    const raw = affiliate?.link || affiliate?.links?.[0]?.url || null;
    if (!raw) return null;
    return buildAffiliateLink(raw, getPartnerCode());
  };

  const copyLink = () => {
    const affiliateLink = getAffiliateLink();
    if (affiliateLink) {
      navigator.clipboard.writeText(affiliateLink);
      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-medium">Affiliate-Link kopiert!</span>
          <span className="text-xs text-muted-foreground font-mono truncate max-w-[260px]">
            {affiliateLink}
          </span>
        </div>
      );
    }
  };

  const totalCommissions = commissions.reduce((sum, c) => sum + (c.amount || 0), 0) / 100;
  const paidCommissions = commissions
    .filter(c => c.state === "paid")
    .reduce((sum, c) => sum + (c.amount || 0), 0) / 100;
  const pendingCommissions = commissions
    .filter(c => c.state === "pending" || c.state === "due")
    .reduce((sum, c) => sum + (c.amount || 0), 0) / 100;

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (!affiliate) {
    return (
      <>
        <div className="max-w-2xl mx-auto py-12">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <UserPlus className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Partner werden</CardTitle>
              <CardDescription className="text-base">
                Verdiene <span className="font-bold text-primary">30% lebenslange Provision</span> für jeden Kunden, den du zu PitchFirst bringst.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">30%</p>
                  <p className="text-sm text-muted-foreground">Provision</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">Lifetime</p>
                  <p className="text-sm text-muted-foreground">Auszahlung</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">∞</p>
                  <p className="text-sm text-muted-foreground">Wiederkehrend</p>
                </div>
              </div>
              <Button 
                size="lg" 
                onClick={createAffiliate}
                disabled={creating}
                className="w-full"
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird erstellt...
                  </>
                ) : (
                  <>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Jetzt Partner werden
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Partner Dashboard</h1>
          <p className="text-muted-foreground">Verwalte deine Affiliate-Links und Provisionen</p>
        </div>

        {/* Affiliate Link */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Dein Affiliate-Link
            </CardTitle>
            <CardDescription>
              Teile diesen Link um 30% lebenslange Provision zu verdienen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Partner Code prominent anzeigen */}
            {getPartnerCode() && (
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Dein eindeutiges Kürzel</p>
                    <p className="text-xl font-bold font-mono text-primary">{getPartnerCode()}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(getPartnerCode() || "");
                      toast.success("Kürzel kopiert!");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            
            {/* Affiliate Link */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Dein Affiliate-Link</p>
              <div className="flex gap-2">
                <div className="flex-1 p-3 bg-background rounded-lg border font-mono text-sm overflow-x-auto whitespace-nowrap">
                  {getAffiliateLink() || "Link wird generiert..."}
                </div>
                <Button onClick={copyLink} variant="outline" disabled={!getAffiliateLink()}>
                  <Copy className="h-4 w-4 mr-2" />
                  Kopieren
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ExternalLink className="h-4 w-4" />
              <span>Teile dein Programm:</span>
              <Link to="/partner" className="text-primary hover:underline" target="_blank">
                Öffentliche Partner-Seite öffnen →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Partner Badge */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Offizielles Partner-Badge
            </CardTitle>
            <CardDescription>
              Nutze dieses Badge auf deiner Website, in E-Mails oder Social Media um zu zeigen, dass du offizieller PitchFirst Partner bist
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="bg-muted/50 p-6 rounded-lg flex items-center justify-center">
                <img 
                  src={partnerBadge} 
                  alt="PitchFirst Official Partner Badge" 
                  className="h-40 w-auto object-contain"
                />
              </div>
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Zeige deinen Kunden und Followern, dass du ein verifizierter PitchFirst Partner bist. 
                    Das Badge steht für Qualität und Vertrauen.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✓ Transparenter Hintergrund (PNG)</li>
                    <li>✓ Hochauflösend für alle Medien</li>
                    <li>✓ Ideal für Website, LinkedIn & E-Mail-Signatur</li>
                  </ul>
                </div>
                <Button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = partnerBadge;
                    link.download = 'pitchfirst-partner-badge.png';
                    link.click();
                    toast.success("Partner-Badge heruntergeladen!");
                  }}
                  className="w-full md:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Badge herunterladen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Besucher</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{affiliate.visitors || 0}</div>
              <p className="text-xs text-muted-foreground">Über deinen Link</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{affiliate.conversions || referrals.filter(r => r.conversion_state === "conversion").length}</div>
              <p className="text-xs text-muted-foreground">Zahlende Kunden</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gesamt verdient</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCommissions.toFixed(2)} €</div>
              <p className="text-xs text-muted-foreground">Alle Provisionen</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ausstehend</CardTitle>
              <Euro className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingCommissions.toFixed(2)} €</div>
              <p className="text-xs text-muted-foreground">Noch auszuzahlen</p>
            </CardContent>
          </Card>
        </div>

        {/* Referrals Table */}
        <Card>
          <CardHeader>
            <CardTitle>Deine Empfehlungen</CardTitle>
            <CardDescription>Alle Nutzer, die über deinen Link gekommen sind</CardDescription>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Noch keine Empfehlungen</p>
                <p className="text-sm">Teile deinen Affiliate-Link um loszulegen!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kunde</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Datum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        {referral.customer_email || referral.email || "Anonym"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={referral.conversion_state === "conversion" ? "default" : "secondary"}>
                          {referral.conversion_state === "conversion" ? "Konvertiert" : 
                           referral.conversion_state === "lead" ? "Lead" : referral.conversion_state}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(referral.created_at), "dd. MMM yyyy", { locale: de })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Commissions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Provisionen</CardTitle>
            <CardDescription>Übersicht deiner verdienten Provisionen</CardDescription>
          </CardHeader>
          <CardContent>
            {commissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Euro className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Noch keine Provisionen</p>
                <p className="text-sm">Sobald deine Empfehlungen zahlen, siehst du hier deine Provisionen.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Betrag</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erstellt</TableHead>
                    <TableHead>Fällig</TableHead>
                    <TableHead>Ausgezahlt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell className="font-medium">
                        {(commission.amount / 100).toFixed(2)} {commission.currency?.toUpperCase() || "EUR"}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            commission.state === "paid" ? "default" : 
                            commission.state === "due" ? "outline" : "secondary"
                          }
                          className={commission.state === "paid" ? "bg-green-500" : ""}
                        >
                          {commission.state === "paid" ? "Ausgezahlt" : 
                           commission.state === "due" ? "Fällig" : 
                           commission.state === "pending" ? "Ausstehend" : commission.state}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(commission.created_at), "dd. MMM yyyy", { locale: de })}
                      </TableCell>
                      <TableCell>
                        {commission.due_at ? format(new Date(commission.due_at), "dd. MMM yyyy", { locale: de }) : "-"}
                      </TableCell>
                      <TableCell>
                        {commission.paid_at ? format(new Date(commission.paid_at), "dd. MMM yyyy", { locale: de }) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Paid Summary */}
        {paidCommissions > 0 && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bereits ausgezahlt</p>
                  <p className="text-2xl font-bold text-green-600">{paidCommissions.toFixed(2)} €</p>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Ausgezahlt
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
