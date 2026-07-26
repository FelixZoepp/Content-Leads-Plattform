import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Central entitlement hook. Calls the DB-level has_feature() RPC.
 * Returns { hasFeature, loading, checkFeature }.
 *
 * Usage:
 *   const { hasFeature } = useHasFeature("bot.leadpost");
 *   if (!hasFeature) return <UpgradePrompt />;
 *
 * Or for multiple checks:
 *   const { checkFeature } = useHasFeature();
 *   const canPost = await checkFeature("bot.leadpost");
 */
export function useHasFeature(featureSlug?: string) {
  const { user } = useAuth();
  const [hasFeature, setHasFeature] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(!!featureSlug);

  useEffect(() => {
    if (!featureSlug || !user) {
      setHasFeature(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    (supabase as any).rpc("has_feature", {
      p_user_id: user.id,
      p_feature_slug: featureSlug,
    }).then(({ data, error }: any) => {
      setHasFeature(error ? false : !!data);
      setLoading(false);
    });
  }, [user?.id, featureSlug]);

  const checkFeature = useCallback(async (slug: string): Promise<boolean> => {
    if (!user) return false;
    const { data, error } = await (supabase as any).rpc("has_feature", {
      p_user_id: user.id,
      p_feature_slug: slug,
    });
    return error ? false : !!data;
  }, [user?.id]);

  return { hasFeature: hasFeature ?? false, loading, checkFeature };
}

/**
 * Load all features for the current user in one query.
 * Returns a Set of feature slugs the user has access to.
 */
export function useUserFeatures() {
  const { user } = useAuth();
  const [features, setFeatures] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setFeatures(new Set());
      setLoading(false);
      return;
    }

    async function load() {
      // Get all feature slugs from active product-features
      const { data: pfData } = await (supabase as any)
        .from("customer_products")
        .select("product_id, status")
        .eq("user_id", user!.id)
        .in("status", ["active", "onboarding"]);

      if (!pfData?.length) {
        // Check super_admin
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_super_admin")
          .eq("id", user!.id)
          .maybeSingle();

        if ((profile as any)?.is_super_admin) {
          // Super admin gets all features
          const { data: allFeatures } = await (supabase as any)
            .from("features")
            .select("slug");
          setFeatures(new Set((allFeatures || []).map((f: any) => f.slug)));
        } else {
          setFeatures(new Set());
        }
        setLoading(false);
        return;
      }

      const productIds = pfData.map((cp: any) => cp.product_id);

      const { data: featureData } = await (supabase as any)
        .from("product_features")
        .select("features(slug)")
        .in("product_id", productIds);

      const slugs = new Set<string>();
      for (const pf of featureData || []) {
        if (pf.features?.slug) slugs.add(pf.features.slug);
      }

      // Apply overrides
      const cpIds = pfData.map((cp: any) => cp.id);
      if (cpIds.length) {
        const { data: overrides } = await (supabase as any)
          .from("feature_overrides")
          .select("feature_id, is_enabled, expires_at, features(slug)")
          .in("customer_product_id", cpIds);

        for (const ov of overrides || []) {
          if (ov.expires_at && new Date(ov.expires_at) < new Date()) continue;
          if (ov.is_enabled) {
            slugs.add(ov.features?.slug);
          } else {
            slugs.delete(ov.features?.slug);
          }
        }
      }

      setFeatures(slugs);
      setLoading(false);
    }

    load();
  }, [user?.id]);

  return { features, hasFeature: (slug: string) => features.has(slug), loading };
}
