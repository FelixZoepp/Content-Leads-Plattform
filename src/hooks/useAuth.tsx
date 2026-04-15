import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  tenantId: string | null;
  accountId: string | null;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  refreshTenant: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  userRole: null,
  tenantId: null,
  accountId: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshTenant: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => { if (mounted) fetchProfile(s.user.id); }, 0);
      } else {
        setUserRole(null);
        setTenantId(null);
        setAccountId(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles" as any)
        .select("role, is_super_admin, account_id")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        setUserRole("client");
      } else {
        setUserRole(data?.role || "client");
        setAccountId(data?.account_id || null);
      }

      // Try to get tenant_id from tenants table (consulting)
      const { data: tenantData } = await supabase
        .from("tenants" as any)
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      setTenantId(tenantData?.id || null);
    } catch (err) {
      setUserRole("client");
    } finally {
      setLoading(false);
    }
  }

  const refreshTenant = async () => {
    if (user) await fetchProfile(user.id);
  };

  const signIn = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string) => {
    return supabase.auth.signUp({ email, password });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setTenantId(null);
    setAccountId(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, userRole, tenantId, accountId, signIn, signUp, signOut, refreshTenant }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
