import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Loader2 } from "lucide-react";

export default function SetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // The invite link redirects here with tokens in the URL hash.
    // Supabase client automatically picks up the tokens and creates a session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setSessionReady(true);
      }
    });

    // Also check if we already have a session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: "Passwort muss mindestens 6 Zeichen lang sein", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwörter stimmen nicht überein", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Passwort gesetzt ✓", description: "Du wirst jetzt weitergeleitet." });
      navigate("/dashboard");
    }
  };

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden p-4">
      <div className="absolute top-[-30%] left-[20%] w-[50%] h-[50%] rounded-full bg-primary/8 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <Card className="relative w-full max-w-md glass-card rounded-2xl border-border/50">
        <CardHeader className="space-y-1 text-center pb-2">
          <div className="flex items-center justify-center mb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 glow-primary">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Passwort festlegen</CardTitle>
          <CardDescription className="text-muted-foreground">
            Lege dein Passwort fest, um dich zukünftig einloggen zu können.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-foreground/80">Neues Passwort</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-secondary/40 border-border/50 rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm text-foreground/80">Passwort bestätigen</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="bg-secondary/40 border-border/50 rounded-xl h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11 rounded-xl glow-primary" disabled={loading}>
              {loading ? "Wird gespeichert..." : "Passwort speichern"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
