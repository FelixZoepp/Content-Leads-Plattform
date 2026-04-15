import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Phone, Mail } from "lucide-react";

interface EnrichmentCreditsDisplayProps {
  accountId: string | null;
}

const EnrichmentCreditsDisplay = ({ accountId }: EnrichmentCreditsDisplayProps) => {
  const currentMonth = new Date().toISOString().slice(0, 7);

  const { data: credits } = useQuery({
    queryKey: ['enrichment-credits', accountId, currentMonth],
    queryFn: async () => {
      if (!accountId) return null;
      const { data, error } = await supabase
        .from('enrichment_credits')
        .select('*')
        .eq('account_id', accountId)
        .eq('month_year', currentMonth)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });

  const phoneUsed = credits?.phone_credits_used ?? 0;
  const emailUsed = credits?.email_credits_used ?? 0;
  const phoneLimit = credits?.phone_credits_limit ?? 100;
  const emailLimit = credits?.email_credits_limit ?? 100;

  const monthLabel = new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Credits – {monthLabel}</p>
        <span className="text-xs text-muted-foreground">Rollover aktiv ✓</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Telefonnummern</span>
              <span className="font-medium text-foreground">{phoneUsed} / {phoneLimit}</span>
            </div>
            <Progress value={(phoneUsed / phoneLimit) * 100} className="h-2" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">E-Mail-Adressen</span>
              <span className="font-medium text-foreground">{emailUsed} / {emailLimit}</span>
            </div>
            <Progress value={(emailUsed / emailLimit) * 100} className="h-2" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnrichmentCreditsDisplay;
