import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function SetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setSessionReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen lang sein");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwörter stimmen nicht überein");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      navigate("/dashboard");
    }
  };

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0B0B" }}>
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#0A0B0B" }}>
      <div className="aurora" aria-hidden="true"><div className="blob3" /></div>

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
              <div className="text-[13px] tracking-[0.18em] uppercase text-white" style={{ fontFamily: "var(--font-serif)" }}>Content-Leads</div>
              <div className="text-[9px] tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)]">Consulting Plattform</div>
            </div>
          </div>

          <div className="glass-panel">
            <div className="relative z-[2]">
              <h1 className="text-xl text-white mb-1" style={{ fontFamily: "var(--font-serif)" }}>Passwort festlegen</h1>
              <p className="text-[13px] text-[rgba(249,249,249,0.5)] mb-7">
                Lege dein Passwort fest, um dich zukünftig einloggen zu können<span className="text-[#C5A059]">.</span>
              </p>

              <form onSubmit={handleSetPassword} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-1.5">Neues Passwort</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                    className="w-full bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3.5 py-2.5 text-[13px] text-white placeholder:text-[rgba(249,249,249,0.2)] outline-none focus:border-[rgba(197,160,89,0.3)] transition"
                    placeholder="••••••••" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-1.5">Passwort bestätigen</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6}
                    className="w-full bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3.5 py-2.5 text-[13px] text-white placeholder:text-[rgba(249,249,249,0.2)] outline-none focus:border-[rgba(197,160,89,0.3)] transition"
                    placeholder="••••••••" />
                </div>
                {error && <p className="text-[12px] text-[#E87467] font-medium">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white flex items-center justify-center gap-2 transition disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #C5A059, #775A19)", boxShadow: "0 0 18px rgba(197,160,89,0.35)" }}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Passwort speichern
                </button>
              </form>
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
