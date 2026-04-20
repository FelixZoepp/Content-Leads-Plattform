import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();

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
        setError(signInError.message === "Invalid login credentials"
          ? "E-Mail oder Passwort ist falsch."
          : signInError.message);
        setSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message || "Login fehlgeschlagen");
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetting(true);
    try {
      await supabase.functions.invoke("reset-password", {
        body: { email: resetEmail },
      });
      setResetSent(true);
    } catch {
      // Still show success to prevent email enumeration
      setResetSent(true);
    }
    setResetting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0B0B" }}>
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#0A0B0B" }}>
      {/* Aurora */}
      <div className="aurora" aria-hidden="true">
        <div className="blob3" />
      </div>

      <div className="relative z-[1] flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-[400px] fade-up">
          {/* Brand */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <div
              className="w-10 h-10 flex items-center justify-center text-white text-xl flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #E9CB8B 0%, #C5A059 45%, #775A19 100%)",
                boxShadow: "0 0 24px rgba(197,160,89,0.4)",
                fontFamily: "var(--font-serif)",
              }}
            >
              C
            </div>
            <div>
              <div className="text-[13px] tracking-[0.18em] uppercase text-white" style={{ fontFamily: "var(--font-serif)" }}>
                Content-Leads
              </div>
              <div className="text-[9px] tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)]">
                Consulting Plattform
              </div>
            </div>
          </div>

          {/* Glass card */}
          <div className="glass-panel">
            <div className="relative z-[2]">
              {!showReset ? (
                <>
                  <h1 className="text-xl text-white mb-1" style={{ fontFamily: "var(--font-serif)" }}>Willkommen zurück</h1>
                  <p className="text-[13px] text-[rgba(249,249,249,0.5)] mb-7">
                    Melde dich an um fortzufahren<span className="text-[#C5A059]">.</span>
                  </p>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-1.5">E-Mail</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                        className="w-full bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3.5 py-2.5 text-[13px] text-white placeholder:text-[rgba(249,249,249,0.2)] outline-none focus:border-[rgba(197,160,89,0.3)] transition"
                        placeholder="felix@content-leads.de" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-1.5">Passwort</label>
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                        className="w-full bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3.5 py-2.5 text-[13px] text-white placeholder:text-[rgba(249,249,249,0.2)] outline-none focus:border-[rgba(197,160,89,0.3)] transition"
                        placeholder="••••••••" />
                    </div>
                    {error && <p className="text-[12px] text-[#E87467] font-medium">{error}</p>}
                    <button type="submit" disabled={submitting}
                      className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white flex items-center justify-center gap-2 transition disabled:opacity-50"
                      style={{
                        background: "linear-gradient(135deg, #C5A059, #775A19)",
                        boxShadow: "0 0 18px rgba(197,160,89,0.35)",
                      }}>
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Anmelden
                    </button>
                  </form>
                  <button
                    onClick={() => { setShowReset(true); setResetEmail(email); }}
                    className="w-full mt-4 text-center text-[12px] text-[rgba(249,249,249,0.4)] hover:text-[#E9CB8B] transition"
                  >
                    Passwort vergessen?
                  </button>
                </>
              ) : !resetSent ? (
                <>
                  <h1 className="text-xl text-white mb-1" style={{ fontFamily: "var(--font-serif)" }}>Passwort zurücksetzen</h1>
                  <p className="text-[13px] text-[rgba(249,249,249,0.5)] mb-7">
                    Gib deine E-Mail ein und wir senden dir einen Link<span className="text-[#C5A059]">.</span>
                  </p>
                  <form onSubmit={handleResetPassword} className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-1.5">E-Mail</label>
                      <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required
                        className="w-full bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3.5 py-2.5 text-[13px] text-white placeholder:text-[rgba(249,249,249,0.2)] outline-none focus:border-[rgba(197,160,89,0.3)] transition"
                        placeholder="deine@email.de" />
                    </div>
                    <button type="submit" disabled={resetting}
                      className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white flex items-center justify-center gap-2 transition disabled:opacity-50"
                      style={{
                        background: "linear-gradient(135deg, #C5A059, #775A19)",
                        boxShadow: "0 0 18px rgba(197,160,89,0.35)",
                      }}>
                      {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Link senden
                    </button>
                  </form>
                  <button
                    onClick={() => setShowReset(false)}
                    className="w-full mt-4 text-center text-[12px] text-[rgba(249,249,249,0.4)] hover:text-[#E9CB8B] transition"
                  >
                    ← Zurück zum Login
                  </button>
                </>
              ) : (
                <>
                  <div className="text-center py-4">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: "rgba(127,194,155,0.12)", border: "1px solid rgba(127,194,155,0.25)" }}>
                      <span className="text-2xl">✓</span>
                    </div>
                    <h1 className="text-xl text-white mb-2" style={{ fontFamily: "var(--font-serif)" }}>E-Mail gesendet</h1>
                    <p className="text-[13px] text-[rgba(249,249,249,0.5)]">
                      Falls ein Konto mit dieser E-Mail existiert, erhältst du in Kürze einen Link zum Zurücksetzen<span className="text-[#C5A059]">.</span>
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowReset(false); setResetSent(false); }}
                    className="w-full mt-4 text-center text-[12px] text-[rgba(249,249,249,0.4)] hover:text-[#E9CB8B] transition"
                  >
                    ← Zurück zum Login
                  </button>
                </>
              )}
            </div>
          </div>

          <p className="text-center text-[10px] text-[rgba(249,249,249,0.2)] mt-6 tracking-[0.15em] uppercase">
            Content-Leads Consulting Plattform
          </p>
        </div>
      </div>
    </div>
  );
}
