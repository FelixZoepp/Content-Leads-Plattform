/**
 * useFeatureAccess — compatibility shim over useHasFeature.
 *
 * Legacy callers used it in two ways:
 *   1. const { hasAccess, loading } = useFeatureAccess("some.feature")
 *   2. const { isStarterPlan, isProPlan, canUsePowerDialer, ... } = useFeatureAccess()
 *
 * The tier/plan properties were never implemented in the DB layer.
 * They all default to `false` so gated pages show the UpgradePrompt
 * instead of crashing. A real per-feature check uses useHasFeature().
 */
import { useHasFeature } from "./useHasFeature";

export function useFeatureAccess(feature?: string) {
  const { hasFeature, loading } = useHasFeature(feature);

  return {
    // Legacy single-feature API
    hasAccess: hasFeature,
    loading,

    // Tier properties — all false (no tier model in DB anymore).
    // Pages using these should migrate to useHasFeature("specific.slug").
    isStarterPlan: false,
    isProPlan: false,
    isScalePlan: false,
    subscribed: false,
    currentTier: null as string | null,

    // Named feature gates — default false so gated pages show UpgradePrompt.
    canUsePowerDialer: false,
    canUseObjectionLibrary: false,
    canUseEmailTemplates: false,
    canUseCallSummary: false,
    canUseTeamManagement: false,
  };
}
