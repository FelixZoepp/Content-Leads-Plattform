import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ArrowRight, Lock, Crown, Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

interface UpgradePromptProps {
  featureName: string;
  description?: string;
  className?: string;
}

export const UpgradePrompt = ({ featureName, description, className = "" }: UpgradePromptProps) => {
  const navigate = useNavigate();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const { isStarterPlan, subscribed } = useFeatureAccess();

  const handleDirectUpgrade = async () => {
    setIsUpgrading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('upgrade-subscription', {
        body: { 
          targetPlan: 'pro', 
          billingPeriod: 'yearly' // Default to yearly for best value
        }
      });

      if (error) throw error;

      if (data.type === 'checkout') {
        // Redirect to Stripe Checkout for new subscription
        window.location.href = data.url;
      } else if (data.type === 'upgraded') {
        // Direct upgrade with proration
        toast.success(
          `Upgrade erfolgreich! Du wurdest anteilig mit ${data.totalCharged.toFixed(2)}€ belastet.`,
          { duration: 5000 }
        );
        // Refresh page to update subscription status
        window.location.reload();
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch (err) {
      console.error('Upgrade error:', err);
      toast.error('Fehler beim Upgrade. Bitte versuche es erneut.');
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleViewPlans = () => {
    navigate("/upgrade");
  };

  return (
    <Card className={`border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 ${className}`}>
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-lg">Pro-Feature erforderlich</CardTitle>
        <CardDescription>
          {description || `${featureName} ist nur im Pro-Paket verfügbar.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        {/* Pro Feature Highlights */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 justify-center text-muted-foreground">
            <Zap className="h-3 w-3 text-primary" />
            <span>KI-Telefonie</span>
          </div>
          <div className="flex items-center gap-1.5 justify-center text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Live-Einwände</span>
          </div>
        </div>

        {/* Proration info for existing subscribers */}
        {isStarterPlan && subscribed && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <p className="text-xs text-primary font-medium">
              💡 Du zahlst nur die anteilige Differenz für deine Restlaufzeit
            </p>
          </div>
        )}

        <div className="space-y-2">
          {/* Direct upgrade button */}
          <Button 
            onClick={handleDirectUpgrade} 
            className="w-full"
            disabled={isUpgrading}
          >
            {isUpgrading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird verarbeitet...
              </>
            ) : (
              <>
                <Crown className="mr-2 h-4 w-4" />
                Jetzt auf Pro upgraden
              </>
            )}
          </Button>

          {/* Link to full pricing page */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleViewPlans}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Alle Tarife vergleichen
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface FeatureGateProps {
  feature: string;
  hasAccess: boolean;
  children: React.ReactNode;
  featureName?: string;
  description?: string;
}

export const FeatureGate = ({ 
  feature, 
  hasAccess, 
  children, 
  featureName,
  description 
}: FeatureGateProps) => {
  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="opacity-30 pointer-events-none blur-[2px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <UpgradePrompt 
          featureName={featureName || feature} 
          description={description}
          className="max-w-sm shadow-lg"
        />
      </div>
    </div>
  );
};
