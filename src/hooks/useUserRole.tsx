import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = 'setter' | 'closer' | 'admin';

export const useUserRole = () => {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRole(null);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setRole(data?.role as AppRole || null);
      } catch (error) {
        console.error("Error fetching user role:", error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, []);

  return { role, loading, isAdmin: role === 'admin', isSetter: role === 'setter', isCloser: role === 'closer' };
};
