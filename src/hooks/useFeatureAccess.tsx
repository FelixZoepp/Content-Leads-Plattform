import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useFeatureAccess(feature: string) {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    async function check() {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("account_id")
          .eq("id", user!.id)
          .single();

        if (!profile?.account_id) { setLoading(false); return; }

        const { data } = await supabase
          .from("feature_access")
          .select("is_active")
          .eq("account_id", profile.account_id)
          .eq("feature", feature)
          .single();

        setHasAccess(data?.is_active ?? false);
      } catch {
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    }

    check();
  }, [user, feature]);

  return { hasAccess, loading };
}
