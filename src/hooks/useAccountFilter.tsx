import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useAccountFilter = () => {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserAccount();
  }, []);

  const checkUserAccount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id, is_super_admin')
        .eq('id', user.id)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      setIsSuperAdmin(profile.is_super_admin || false);

      // If super admin, check if they have selected an account to view
      if (profile.is_super_admin) {
        const masterAdminAccountId = sessionStorage.getItem('master_admin_account_id');
        if (masterAdminAccountId) {
          setAccountId(masterAdminAccountId);
        } else {
          // No account selected, use their own account
          setAccountId(profile.account_id);
        }
      } else {
        // Regular user, use their account
        setAccountId(profile.account_id);
      }
    } catch (error) {
      console.error('Error checking account:', error);
    } finally {
      setLoading(false);
    }
  };

  return { accountId, isSuperAdmin, loading };
};