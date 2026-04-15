import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, Loader2 } from "lucide-react";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError.message);
        setSubmitting(false);
      }
      // Don't navigate manually — the useEffect above will handle it
      // when onAuthStateChange updates the user state
    } catch (err: any) {
      setError(err.message || "Login fehlgeschlagen");
      setSubmitting(false);
    }
  };

  // Show loading if auth is still initializing
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#2E86AB] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#2E86AB]/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[#2E86AB]" />
          </div>
          <span className="text-xl font-bold text-white">Content Leads</span>
        </div>
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6">
          <h1 className="text-lg font-semibold text-white mb-1">Willkommen zurück</h1>
          <p className="text-sm text-[#94A3B8] mb-6">Melde dich an um fortzufahren</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">E-Mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#2E86AB]/50" placeholder="felix@content-leads.de" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Passwort</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#2E86AB]/50" placeholder="••••••••" />
            </div>
            {error && <p className="text-xs text-[#EF4444]">{error}</p>}
            <button type="submit" disabled={submitting}
              className="w-full bg-[#2E86AB] hover:bg-[#246E8F] text-white font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Anmelden
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
