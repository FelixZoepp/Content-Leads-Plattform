import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, ArrowRight } from "lucide-react";
import { useAccountFilter } from "@/hooks/useAccountFilter";

const EnrichmentUpsellBanner = () => {
  const navigate = useNavigate();
  const { accountId } = useAccountFilter();
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

  if (!credits) return null;

  const phoneUsed = credits.phone_credits_used ?? 0;
  const emailUsed = credits.email_credits_used ?? 0;
  const phoneLimit = credits.phone_credits_limit ?? 100;
  const emailLimit = credits.email_credits_limit ?? 100;
  const totalUsed = Math.max(phoneUsed, emailUsed);
  const totalLimit = Math.min(phoneLimit, emailLimit);
  const usagePercent = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
  const remaining = totalLimit - totalUsed;

  // Show different messages based on usage
  if (usagePercent < 50) {
    // Low usage - gentle nudge
    return (
      <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 mb-4">
        <Sparkles className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">
            <span className="font-medium">Tipp:</span> Reichere Kontakte an, um Telefonnummern & E-Mails automatisch zu finden. 
            <span className="text-muted-foreground"> Noch {remaining} Credits übrig – ungenutzte Credits werden übertragen!</span>
          </p>
        </div>
      </div>
    );
  }

  if (usagePercent >= 80) {
    // High usage - urgent upsell
    return (
      <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 mb-4">
        <Zap className="h-5 w-5 text-yellow-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">
            <span className="font-semibold text-yellow-400">Nur noch {remaining} Credits!</span>{" "}
            Erweitere dein Limit für mehr Anreicherungen – ab 100€/Monat für +100 Credits.
          </p>
        </div>
        <Button 
          size="sm" 
          onClick={() => navigate('/billing')}
          className="shrink-0"
        >
          Credits aufstocken
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    );
  }

  // Medium usage - moderate prompt
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 mb-4">
      <Sparkles className="h-5 w-5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">
          {remaining} Anreicherungs-Credits übrig. Ungenutzte Credits werden automatisch in den nächsten Monat übertragen.{" "}
          <button 
            onClick={() => navigate('/billing')} 
            className="text-primary hover:underline font-medium"
          >
            Mehr Credits buchen →
          </button>
        </p>
      </div>
    </div>
  );
};

export default EnrichmentUpsellBanner;
