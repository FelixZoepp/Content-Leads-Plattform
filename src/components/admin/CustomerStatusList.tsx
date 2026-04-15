import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, UserCheck, Clock, Mail, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CustomerStatus {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  industry: string | null;
  contract_duration: string | null;
  offer_price: number | null;
  created_at: string;
  onboarding_completed: boolean;
  is_active: boolean;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
}

export function CustomerStatusList() {
  const [customers, setCustomers] = useState<CustomerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [resettingEmail, setResettingEmail] = useState<string | null>(null);
  const { toast } = useToast();

  const sendPasswordReset = async (email: string) => {
    setResettingEmail(email);
    try {
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: { email },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Passwort-Reset gesendet", description: `E-Mail an ${email} gesendet.` });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
    setResettingEmail(null);
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("list-customers");
      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error("Error loading customer status:", err);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getStatus = (c: CustomerStatus) => {
    if (!c.email_confirmed_at && !c.last_sign_in_at) {
      return { label: "Einladung ausstehend", variant: "outline" as const, icon: Clock };
    }
    if (c.email_confirmed_at && !c.onboarding_completed) {
      return { label: "Onboarding offen", variant: "secondary" as const, icon: Mail };
    }
    return { label: "Aktiv", variant: "default" as const, icon: UserCheck };
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "–";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Kundenstatus</CardTitle>
        <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : customers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Noch keine Kunden eingeladen.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Firma</TableHead>
                  <TableHead>Ansprechpartner</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Branche</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Eingeladen am</TableHead>
                  <TableHead className="text-right">Letzter Login</TableHead>
                  <TableHead className="text-center">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => {
                  const status = getStatus(c);
                  const StatusIcon = status.icon;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.company_name}</TableCell>
                      <TableCell>{c.contact_name || "–"}</TableCell>
                      <TableCell className="text-sm">{c.email || "–"}</TableCell>
                      <TableCell>{c.industry || "–"}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">{formatDate(c.created_at)}</TableCell>
                      <TableCell className="text-right text-sm">{formatDate(c.last_sign_in_at)}</TableCell>
                      <TableCell className="text-center">
                        {c.email && (!c.last_sign_in_at || !c.email_confirmed_at) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs"
                            disabled={resettingEmail === c.email}
                            onClick={() => sendPasswordReset(c.email!)}
                          >
                            {resettingEmail === c.email ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <KeyRound className="h-3 w-3" />
                            )}
                            Passwort-Reset
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
