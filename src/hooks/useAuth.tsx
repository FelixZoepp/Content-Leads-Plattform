import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  userRole: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // IMPORTANT: Set up auth listener FIRST, then get session
    // This prevents race conditions per Supabase docs
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      console.log("[Auth] onAuthStateChange:", _event, s?.user?.email);
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // Use setTimeout to avoid deadlock with Supabase auth
        setTimeout(() => { if (mounted) fetchRole(s.user.id); }, 0);
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      console.log("[Auth] getSession:", s?.user?.email || "no session");
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchRole(s.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function fetchRole(userId: string) {
    console.log("[Auth] fetchRole for:", userId);
    try {
      const { data, error } = await supabase
        .from("profiles" as any)
        .select("role, is_super_admin")
        .eq("id", userId)
        .maybeSingle();

      console.log("[Auth] fetchRole result:", { data, error: error?.message });
      if (error) {
        setUserRole("client");
      } else {
        setUserRole(data?.role || "client");
      }
    } catch (err) {
      console.warn("[Auth] fetchRole failed:", err);
      setUserRole("client");
    } finally {
      console.log("[Auth] setLoading(false)");
      setLoading(false);
    }
  }

  const signIn = async (email: string, password: string) => {
    const result = await supabase.auth.signInWithPassword({ email, password });
    return result;
  };

  const signUp = async (email: string, password: string) => {
    return supabase.auth.signUp({ email, password });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, userRole, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
