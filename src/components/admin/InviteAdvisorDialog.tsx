import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { UserPlus, Loader2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function InviteAdvisorDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");

  const handleInvite = async () => {
    if (!email.trim()) {
      toast({ title: "E-Mail ist ein Pflichtfeld", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-advisor", {
        body: { email: email.trim(), full_name: fullName.trim() || null },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Berater angelegt ✓",
        description: data.invited
          ? `Einladung an ${email} gesendet`
          : data.message,
      });

      setEmail("");
      setFullName("");
      setOpen(false);
    } catch (err: any) {
      toast({
        title: "Fehler",
        description: err.message || "Berater konnte nicht angelegt werden",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 w-full justify-start text-xs">
          <UserPlus className="h-3.5 w-3.5" />
          Berater einladen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Neuen Berater einladen
          </DialogTitle>
          <DialogDescription>
            Der Berater erhält eine Einladungs-E-Mail und kann sich anschließend anmelden.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>E-Mail-Adresse *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="berater@firma.de"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Max Mustermann"
            />
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
