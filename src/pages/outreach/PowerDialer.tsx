import PowerDialerPanel from "@/components/outreach/PowerDialerPanel";
import { Phone } from "lucide-react";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { FeatureGate } from "@/components/outreach/UpgradePrompt";

export default function PowerDialer() {
  const { canUsePowerDialer, loading } = useFeatureAccess();

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Phone className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Power Dialer</h1>
            <p className="text-muted-foreground">
              Kaltakquise mit automatischem Lead-Wechsel
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <FeatureGate 
            feature="power_dialer" 
            hasAccess={canUsePowerDialer}
            featureName="Power Dialer"
            description="KI-Telefonie mit automatischem Lead-Wechsel ist nur im Pro-Paket verfügbar."
          >
            <PowerDialerPanel />
          </FeatureGate>
        )}
      </div>
    </>
  );
}
