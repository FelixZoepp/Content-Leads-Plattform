import { useState, useEffect } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { SurveyEngine } from "@/components/client/SurveyEngine";
import { supabase } from "@/integrations/supabase/client";

export default function CSATPage() {
  const { tenantId } = useDashboardData();
  const [onboardingCompletedAt, setOnboardingCompletedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      const { data } = await supabase
        .from("fulfillment_tracking")
        .select("onboarding_completed_at")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      setOnboardingCompletedAt(data?.onboarding_completed_at || null);
      setLoading(false);
    })();
  }, [tenantId]);

  if (loading) return null;

  return (
    <div className="space-y-6 max-w-6xl">
      <h2 className="text-xl font-semibold text-foreground">Feedback & Check-Ins</h2>
      {!onboardingCompletedAt ? (
        <p className="text-muted-foreground text-sm">
          Dein Onboarding wurde noch nicht abgeschlossen. Sobald das Onboarding fertig ist, erscheinen hier deine Check-In Umfragen.
        </p>
      ) : (
        <SurveyEngine tenantId={tenantId} onboardingCompletedAt={onboardingCompletedAt} />
      )}
    </div>
  );
}
