import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { 
  CreditCard, 
  Download, 
  ExternalLink, 
  FileText, 
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Coins,
  ArrowUpCircle,
  ArrowDownCircle,
  XCircle,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

interface Invoice {
  id: string;
  number: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string;
  created: string;
  due_date: string | null;
  paid_at: string | null;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  description: string;
}

interface Subscription {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  plan_name: string;
  plan_amount: number;
  plan_interval: string;
}

interface CreditSubscription {
  package: string;
  extra_credits: number;
  status: string;
}

const CREDIT_PACKAGES: Array<{ key: string; label: string; credits: number; price: number; total: number; popular?: boolean }> = [
  { key: "s", label: "S", credits: 100, price: 100, total: 200 },
  { key: "m", label: "M", credits: 250, price: 200, total: 350, popular: true },
  { key: "l", label: "L", credits: 500, price: 350, total: 600 },
];

const Billing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { subscribed, productId, subscriptionEnd, isTrial, trialEndsAt, openCustomerPortal, refresh: refreshSubscription } = useSubscriptionContext();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbSubscription, setDbSubscription] = useState<{plan_name: string; status: string; current_period_end: string | null} | null>(null);
  const [creditSub, setCreditSub] = useState<CreditSubscription | null>(null);
  const [creditLoading, setCreditLoading] = useState(false);

  useEffect(() => {
    fetchBillingData();
    fetchDbSubscription();
    fetchCreditStatus();
  }, []);

  useEffect(() => {
    if (searchParams.get("credits") === "success") {
      toast.success("Credits erfolgreich gebucht! Dein Limit wurde erhöht.");
      fetchCreditStatus();
    }
  }, [searchParams]);

  const fetchCreditStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-credits", {
        body: { action: "status" },
      });
      if (!error && data?.creditSubscription) {
        setCreditSub(data.creditSubscription);
      } else {
        setCreditSub(null);
      }
    } catch (err) {
      console.error("Failed to fetch credit status:", err);
    }
  };

  const handleCreditAction = async (pkg: string) => {
    setCreditLoading(true);
    try {
      const action = creditSub ? "change" : "subscribe";
      const { data, error } = await supabase.functions.invoke("manage-credits", {
        body: { action, package: pkg },
      });

      if (error) {
        toast.error("Fehler beim Buchen der Credits");
        return;
      }

      if (data?.type === "checkout" && data?.url) {
        window.open(data.url, "_blank");
      } else if (data?.type === "changed" || data?.success) {
        toast.success("Credit-Paket erfolgreich geändert!");
        fetchCreditStatus();
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error("Fehler beim Verarbeiten");
    } finally {
      setCreditLoading(false);
    }
  };

  const handleCancelCredits = async () => {
    if (!confirm("Möchtest du dein Credit-Paket wirklich kündigen? Deine Limits werden auf 100 zurückgesetzt.")) return;
    setCreditLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-credits", {
        body: { action: "cancel" },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Fehler beim Kündigen");
      } else {
        toast.success("Credit-Paket gekündigt. Limits wurden zurückgesetzt.");
        setCreditSub(null);
        fetchCreditStatus();
      }
    } catch {
      toast.error("Fehler beim Kündigen");
    } finally {
      setCreditLoading(false);
    }
  };

  const fetchDbSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan_name, status, current_period_end')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error && data) setDbSubscription(data);
    } catch (err) {
      console.error('Failed to fetch DB subscription:', err);
    }
  };

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('list-invoices');
      if (error) {
        console.error('Error fetching billing data:', error);
        toast.error('Fehler beim Laden der Rechnungen');
        return;
      }
      setInvoices(data?.invoices || []);
      setSubscription(data?.subscription || null);
    } catch (err) {
      console.error('Failed to fetch billing data:', err);
      toast.error('Fehler beim Laden der Abrechnungsdaten');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Bezahlt</Badge>;
      case 'open':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Offen</Badge>;
      case 'draft':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Entwurf</Badge>;
      case 'uncollectible':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Nicht einziehbar</Badge>;
      case 'void':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Storniert</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleManageSubscription = async () => {
    const { error } = await openCustomerPortal();
    if (error) toast.error("Fehler beim Öffnen des Kundenportals");
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-muted-foreground">Lädt Abrechnungsdaten...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen noise-bg dotted-grid">
        <div className="max-w-5xl mx-auto p-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Abrechnung</h1>
                <p className="text-sm text-muted-foreground">Rechnungen, Abo und Credits verwalten</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={fetchBillingData}
                className="border-white/10 bg-white/5"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Aktualisieren
              </Button>
              <Button onClick={handleManageSubscription}>
                <ExternalLink className="w-4 h-4 mr-2" />
                {dbSubscription && !productId?.startsWith('prod_') ? 'Abo kaufen/upgraden' : 'Abo verwalten'}
              </Button>
            </div>
          </div>

          {/* Subscription Status Card */}
          <Card className="mb-8 glass-card border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Dein Abo-Status</CardTitle>
                  <CardDescription>Aktueller Abonnement-Status</CardDescription>
                </div>
                {subscribed ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {isTrial ? 'Trial aktiv' : 'Aktiv'}
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Inaktiv
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tarif</p>
                  <p className="text-lg font-semibold text-foreground">
                    {dbSubscription?.plan_name 
                      ? dbSubscription.plan_name === 'basic' 
                        ? 'Starter' 
                        : dbSubscription.plan_name === 'pro' 
                          ? 'Pro' 
                          : dbSubscription.plan_name === 'enterprise'
                            ? 'Enterprise'
                            : dbSubscription.plan_name.charAt(0).toUpperCase() + dbSubscription.plan_name.slice(1)
                      : isTrial 
                        ? 'Trial' 
                        : productId 
                          ? 'Stripe Abo' 
                          : 'Kein Abo'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {dbSubscription?.status === 'active' ? 'Aktiv' : 
                     dbSubscription?.status === 'trialing' ? 'Trial' :
                     isTrial ? 'Testphase' : 
                     subscribed ? 'Aktiv' : 'Nicht abonniert'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Verlängerung</p>
                  {dbSubscription?.current_period_end ? (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <p className="text-foreground">
                        {format(new Date(dbSubscription.current_period_end), 'dd. MMMM yyyy', { locale: de })}
                      </p>
                    </div>
                  ) : subscriptionEnd ? (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <p className="text-foreground">
                        {format(new Date(subscriptionEnd), 'dd. MMMM yyyy', { locale: de })}
                      </p>
                    </div>
                  ) : isTrial && trialEndsAt ? (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-400" />
                      <p className="text-foreground">
                        Trial endet: {format(new Date(trialEndsAt), 'dd. MMMM yyyy', { locale: de })}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">–</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Quelle</p>
                  <p className="text-foreground">
                    {productId?.startsWith('prod_') ? 'Stripe' : dbSubscription ? 'Manuell vergeben' : isTrial ? 'Trial' : '–'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stripe Subscription (if different from DB) */}
          {subscription && !dbSubscription && (
            <Card className="mb-8 glass-card border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Stripe Abonnement</CardTitle>
                    <CardDescription>Details aus Stripe</CardDescription>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Aktiv
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Tarif</p>
                    <p className="text-lg font-semibold text-foreground">
                      {subscription.plan_name || 'Pitchfirst'}
                    </p>
                    <p className="text-sm text-primary">
                      {formatCurrency(subscription.plan_amount, 'eur')} / {subscription.plan_interval === 'year' ? 'Jahr' : 'Monat'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Laufzeit</p>
                    <p className="text-foreground">
                      {format(new Date(subscription.current_period_start), 'dd. MMM yyyy', { locale: de })}
                      {' – '}
                      {format(new Date(subscription.current_period_end), 'dd. MMM yyyy', { locale: de })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Nächste Zahlung</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <p className="text-foreground">
                        {format(new Date(subscription.current_period_end), 'dd. MMMM yyyy', { locale: de })}
                      </p>
                    </div>
                    {subscription.cancel_at_period_end && (
                      <p className="text-sm text-yellow-400 mt-1">Wird zum Ende der Laufzeit gekündigt</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invoices */}
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-lg">Rechnungen</CardTitle>
              <CardDescription>Alle bisherigen Rechnungen und Zahlungen</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Noch keine Rechnungen vorhanden</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div 
                      key={invoice.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {invoice.number || invoice.description}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{format(new Date(invoice.created), 'dd. MMM yyyy', { locale: de })}</span>
                            {invoice.paid_at && (
                              <>
                                <span>•</span>
                                <span className="text-green-400">
                                  Bezahlt am {format(new Date(invoice.paid_at), 'dd. MMM yyyy', { locale: de })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-foreground">
                            {formatCurrency(invoice.amount_paid || invoice.amount_due, invoice.currency)}
                          </p>
                          {getStatusBadge(invoice.status)}
                        </div>

                        <div className="flex gap-2">
                          {invoice.invoice_pdf && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(invoice.invoice_pdf!, '_blank')}
                              className="border-white/10 bg-white/5 hover:bg-white/10"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              PDF
                            </Button>
                          )}
                          {invoice.hosted_invoice_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(invoice.hosted_invoice_url!, '_blank')}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Online
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Billing;
