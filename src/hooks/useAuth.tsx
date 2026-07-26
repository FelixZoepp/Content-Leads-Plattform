import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const IMPERSONATION_KEY = "cl_impersonation";

interface ImpersonationState {
  targetUserId: string;
  adminUserId: string;
  adminRole: string | null;
  adminTenantId: string | null;
  adminAccountId: string | null;
  targetName: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  tenantId: string | null;
  accountId: string | null;
  impersonating: boolean;
  impersonatedUserId: string | null;
  impersonatedUserName: string | null;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  refreshTenant: () => Promise<void>;
  startImpersonation: (targetUserId: string) => Promise<void>;
  stopImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  userRole: null,
  tenantId: null,
  accountId: null,
  impersonating: false,
  impersonatedUserId: null,
  impersonatedUserName: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshTenant: async () => {},
  startImpersonation: async () => {},
  stopImpersonation: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState(false);
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [impersonatedUserName, setImpersonatedUserName] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // Check if there's an active impersonation session
        const stored = sessionStorage.getItem(IMPERSONATION_KEY);
        if (stored) {
          try {
            const imp = JSON.parse(stored) as ImpersonationState;
            // Only restore if the stored admin ID matches the current user
            if (imp.adminUserId === s.user.id) {
              setImpersonating(true);
              setImpersonatedUserId(imp.targetUserId);
              setImpersonatedUserName(imp.targetName);
              setUserRole(null); // will be set by restoreImpersonationProfile
              setTimeout(() => { if (mounted) restoreImpersonationProfile(imp); }, 0);
              return;
            } else {
              sessionStorage.removeItem(IMPERSONATION_KEY);
            }
          } catch {
            sessionStorage.removeItem(IMPERSONATION_KEY);
          }
        }
        setTimeout(() => { if (mounted) fetchProfile(s.user.id); }, 0);
      } else {
        setUserRole(null);
        setTenantId(null);
        setAccountId(null);
        setImpersonating(false);
        setImpersonatedUserId(null);
        setImpersonatedUserName(null);
        sessionStorage.removeItem(IMPERSONATION_KEY);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // Check for existing impersonation
        const stored = sessionStorage.getItem(IMPERSONATION_KEY);
        if (stored) {
          try {
            const imp = JSON.parse(stored) as ImpersonationState;
            if (imp.adminUserId === s.user.id) {
              setImpersonating(true);
              setImpersonatedUserId(imp.targetUserId);
              setImpersonatedUserName(imp.targetName);
              restoreImpersonationProfile(imp);
              return;
            } else {
              sessionStorage.removeItem(IMPERSONATION_KEY);
            }
          } catch {
            sessionStorage.removeItem(IMPERSONATION_KEY);
          }
        }
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

  async function restoreImpersonationProfile(imp: ImpersonationState) {
    try {
      const { data: tenantData } = await supabase
        .from("tenants" as any)
        .select("id, account_id")
        .eq("user_id", imp.targetUserId)
        .maybeSingle();

      const { data: profileData } = await supabase
        .from("profiles" as any)
        .select("role, account_id")
        .eq("id", imp.targetUserId)
        .maybeSingle();

      setUserRole(profileData?.role || "client");
      setTenantId(tenantData?.id || null);
      setAccountId(tenantData?.account_id || profileData?.account_id || null);
    } catch {
      setUserRole("client");
    } finally {
      setLoading(false);
    }
  }

  const refreshTenant = async () => {
    if (impersonating && impersonatedUserId) {
      const stored = sessionStorage.getItem(IMPERSONATION_KEY);
      if (stored) {
        const imp = JSON.parse(stored) as ImpersonationState;
        await restoreImpersonationProfile(imp);
      }
    } else if (user) {
      await fetchProfile(user.id);
    }
  };

  const startImpersonation = async (targetUserId: string) => {
    if (!user) return;

    // Only admins/super_admins may impersonate
    const currentRole = userRole;
    if (currentRole !== "admin" && currentRole !== "super_admin") {
      console.error("[impersonation] Only admins can impersonate users");
      return;
    }

    try {
      // Fetch target user's profile & tenant
      const { data: targetProfile } = await supabase
        .from("profiles" as any)
        .select("role, account_id, name, email")
        .eq("id", targetUserId)
        .maybeSingle();

      const { data: targetTenant } = await supabase
        .from("tenants" as any)
        .select("id, account_id, company_name, contact_name")
        .eq("user_id", targetUserId)
        .maybeSingle();

      const targetName =
        targetTenant?.company_name ||
        targetProfile?.name ||
        targetProfile?.email ||
        "Kunde";

      // Persist impersonation state so page refresh works
      const imp: ImpersonationState = {
        targetUserId,
        adminUserId: user.id,
        adminRole: userRole,
        adminTenantId: tenantId,
        adminAccountId: accountId,
        targetName,
      };
      sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(imp));

      // Log the impersonation in the audit_log via supabase rpc/direct insert
      await supabase.from("audit_log" as any).insert({
        actor_id: user.id,
        action: "IMPERSONATE",
        resource_type: "user",
        resource_id: targetUserId,
        impersonated_by: user.id,
        new_value: { target_user_id: targetUserId, target_name: targetName },
      });

      // Switch state to target user's context
      setImpersonating(true);
      setImpersonatedUserId(targetUserId);
      setImpersonatedUserName(targetName);
      setUserRole(targetProfile?.role || "client");
      setTenantId(targetTenant?.id || null);
      setAccountId(targetTenant?.account_id || targetProfile?.account_id || null);
    } catch (err) {
      console.error("[impersonation] Failed to start:", err);
      sessionStorage.removeItem(IMPERSONATION_KEY);
    }
  };

  const stopImpersonation = () => {
    const stored = sessionStorage.getItem(IMPERSONATION_KEY);
    sessionStorage.removeItem(IMPERSONATION_KEY);

    if (stored) {
      try {
        const imp = JSON.parse(stored) as ImpersonationState;
        setUserRole(imp.adminRole);
        setTenantId(imp.adminTenantId);
        setAccountId(imp.adminAccountId);
      } catch {
        // fallback: re-fetch from DB
        if (user) fetchProfile(user.id);
      }
    } else if (user) {
      fetchProfile(user.id);
    }

    setImpersonating(false);
    setImpersonatedUserId(null);
    setImpersonatedUserName(null);
  };

  const signIn = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string) => {
    return supabase.auth.signUp({ email, password });
  };

  const signOut = async () => {
    sessionStorage.removeItem(IMPERSONATION_KEY);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setTenantId(null);
    setAccountId(null);
    setImpersonating(false);
    setImpersonatedUserId(null);
    setImpersonatedUserName(null);
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading, userRole, tenantId, accountId,
      impersonating, impersonatedUserId, impersonatedUserName,
      signIn, signUp, signOut, refreshTenant,
      startImpersonation, stopImpersonation,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
