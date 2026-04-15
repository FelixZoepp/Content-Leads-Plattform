import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const { refresh, subscribed, loading } = useSubscriptionContext();
  const { isProPlan, isStarterPlan } = useFeatureAccess();
  
  const [checkCount, setCheckCount] = useState(0);
  const [verified, setVerified] = useState(false);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  // Check if user needs to register (no session but has checkout session)
  useEffect(() => {
    const checkCheckoutSession = async () => {
      const sessionId = searchParams.get("session_id");
      
      if (!session && sessionId) {
        // User not logged in but came from Stripe checkout
        // Fetch customer details from Stripe
        try {
          const { data, error } = await supabase.functions.invoke("get-checkout-customer", {
            body: { sessionId }
          });
          
          if (error) {
            console.error("Error fetching checkout customer:", error);
            return;
          }
          
          if (data?.email) {
            setCustomerEmail(data.email);
            setCustomerName(data.name || "");
            setNeedsRegistration(true);
          }
        } catch (err) {
          console.error("Failed to get checkout customer:", err);
        }
      } else if (session) {
        // User is logged in, just verify subscription
        refresh();
      }
    };
    
    checkCheckoutSession();
  }, [session, searchParams, refresh]);

  // Polling for subscription verification when logged in
  useEffect(() => {
    if (!session || needsRegistration) return;
    
    refresh();
    
    const interval = setInterval(() => {
      refresh();
      setCheckCount(prev => prev + 1);
    }, 2000);

    if (checkCount >= 10) {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [checkCount, refresh, session, needsRegistration]);

  useEffect(() => {
    if (subscribed && !loading && session) {
      setVerified(true);
    }
  }, [subscribed, loading, session]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwörter stimmen nicht überein");
      return;
    }
    
    if (password.length < 6) {
      toast.error("Passwort muss mindestens 6 Zeichen haben");
      return;
    }
    
    setIsCreatingAccount(true);
    
    try {
      // Create the user account
      const { data, error } = await supabase.auth.signUp({
        email: customerEmail,
        password,
        options: {
          data: {
            name: customerName || customerEmail.split("@")[0],
          },
          emailRedirectTo: `https://hochpreis-leads.de/dashboard`,
        },
      });
      
      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("Diese E-Mail ist bereits registriert. Bitte logge dich ein.");
          navigate("/auth");
          return;
        }
        throw error;
      }
      
      if (data.user) {
        toast.success("Account erstellt! Du wirst zum Onboarding weitergeleitet...");
        setAccountCreated(true);
        setNeedsRegistration(false);
        
        // Redirect to onboarding for new users
        setTimeout(() => {
          navigate("/onboarding");
        }, 1500);
      }
    } catch (error: any) {
      console.error("Error creating account:", error);
      toast.error(error.message || "Fehler beim Erstellen des Accounts");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const getPlanName = () => {
    if (isProPlan) return "Pro";
    if (isStarterPlan) return "Starter";
    return "Pitchfirst";
  };

  // Show registration form for new customers
  if (needsRegistration) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-primary/20">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Zahlung erfolgreich!</CardTitle>
            <CardDescription>
              Erstelle jetzt deinen Account, um loszulegen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerEmail}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Diese E-Mail wurde bei der Zahlung verwendet
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Dein Name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Passwort wählen</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mind. 6 Zeichen"
                  required
                  minLength={6}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Passwort wiederholen"
                  required
                  minLength={6}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isCreatingAccount}
              >
                {isCreatingAccount ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Account wird erstellt...
                  </>
                ) : (
                  "Account erstellen & loslegen"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-primary/20">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          {verified ? (
            <>
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              
              <div>
                <h1 className="text-2xl font-bold mb-2">Willkommen bei Pitchfirst!</h1>
                <p className="text-muted-foreground">
                  Dein <span className="text-primary font-semibold">{getPlanName()}</span> Abo ist jetzt aktiv.
                </p>
              </div>

              {isProPlan && (
                <div className="bg-primary/10 rounded-lg p-4 text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Pro Features freigeschaltet:</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-7">
                    <li>• KI-Telefonie aus dem Tool</li>
                    <li>• KI-Anrufzusammenfassungen</li>
                    <li>• Live KI-Einwandbehandlung</li>
                    <li>• E-Mail-Vorlagen & Outreach</li>
                  </ul>
                </div>
              )}

              <Button 
                size="lg"
                onClick={() => navigate('/dashboard')}
                className="w-full"
              >
                Zum Dashboard
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
              
              <div>
                <h1 className="text-2xl font-bold mb-2">Zahlung wird verarbeitet...</h1>
                <p className="text-muted-foreground">
                  Wir prüfen deinen Abostatus. Das dauert nur wenige Sekunden.
                </p>
              </div>

              <div className="text-sm text-muted-foreground">
                Prüfung läuft... ({checkCount}/10)
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
