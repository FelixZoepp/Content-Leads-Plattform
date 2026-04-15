import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { UserPlus, Loader2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onSuccess: () => void;
}

const INDUSTRIES = [
  "Handwerk", "Beratung", "Reinigung", "Recruiting", "SaaS / Software",
  "E-Commerce", "Medizin", "Immobilien", "Coaching", "Agentur", "Sonstige",
];

export function InviteCustomerDialog({ onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [industry, setIndustry] = useState("");

  const reset = () => {
    setEmail("");
    setCompanyName("");
    setContactName("");
    setIndustry("");
  };

  const handleInvite = async () => {
    if (!email.trim() || !companyName.trim()) {
      toast({ title: "E-Mail und Firmenname sind Pflichtfelder", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-customer", {
        body: {
          email: email.trim(),
          company_name: companyName.trim(),
          contact_name: contactName.trim() || null,
          industry: industry || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Kunde angelegt ✓",
        description: data.message || `Einladungs-E-Mail an ${email} gesendet`,
      });

      reset();
      setOpen(false);
      onSuccess();
    } catch (err: any) {
      toast({
        title: "Fehler",
        description: err.message || "Kunde konnte nicht angelegt werden",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <UserPlus className="h-3.5 w-3.5" />
          Kunden einladen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Neuen Kunden einladen
          </DialogTitle>
          <DialogDescription>
            Der Kunde erhält eine E-Mail mit einem Login-Link und durchläuft das Onboarding selbstständig.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>E-Mail-Adresse *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kunde@firma.de"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Firmenname *</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Mustermann GmbH"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Ansprechpartner</Label>
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Max Mustermann"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Branche</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger><SelectValue placeholder="Wählen" /></SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((i) => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button onClick={handleInvite} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Mail className="h-4 w-4 mr-1" />}
              Einladen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
