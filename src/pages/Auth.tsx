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
      <div className="min-h-screen bg-[#0A0A14] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0A66C2] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A14] flex items-center justify-center p-4">
      <div className="w-full max-w-[380px]">
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-[#0A66C2] flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight text-white">Content-Leads</span>
        </div>
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-7">
          <h1 className="text-xl font-black tracking-tight text-white mb-1">Willkommen zurück</h1>
          <p className="text-[13px] text-[#94A3B8] mb-7">Melde dich an um fortzufahren<span className="text-[#0A66C2]">.</span></p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wide">E-Mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-[#0A0A14] border border-[#1E293B] rounded-lg px-3.5 py-2.5 text-[13px] text-white placeholder:text-[#475569] focus:outline-none focus:border-[#0A66C2]/60 focus:ring-1 focus:ring-[#0A66C2]/20 transition" placeholder="felix@content-leads.de" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Passwort</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full bg-[#0A0A14] border border-[#1E293B] rounded-lg px-3.5 py-2.5 text-[13px] text-white placeholder:text-[#475569] focus:outline-none focus:border-[#0A66C2]/60 focus:ring-1 focus:ring-[#0A66C2]/20 transition" placeholder="••••••••" />
            </div>
            {error && <p className="text-[12px] text-[#EF4444] font-medium">{error}</p>}
            <button type="submit" disabled={submitting}
              className="w-full bg-[#0A66C2] hover:bg-[#1A8CD8] text-white font-bold py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-[0_0_20px_rgba(10,102,194,0.25)]">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Anmelden
            </button>
          </form>
        </div>
        <p className="text-center text-[11px] text-[#475569] mt-6">Content-Leads Platform</p>
      </div>
    </div>
  );
}
