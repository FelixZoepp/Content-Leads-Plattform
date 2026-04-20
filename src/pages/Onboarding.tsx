import { useNavigate } from "react-router-dom";
import ProfileSetup from "@/components/onboarding/ProfileSetup";

export default function Onboarding() {
  const navigate = useNavigate();

  const handleProfileComplete = () => {
    navigate("/generating");
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#0A0B0B" }}>
      {/* Aurora */}
      <div className="aurora" aria-hidden="true">
        <div className="blob3" />
      </div>

      <div className="relative z-[1] flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-2xl fade-up">
          {/* Brand header */}
          <div className="flex items-center gap-3 mb-8 justify-center">
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
              <div className="mb-6">
                <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-2">Onboarding</span>
                <h1 className="text-xl text-white font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                  Willkommen bei Content-Leads
                </h1>
                <p className="text-[13px] text-[rgba(249,249,249,0.5)] mt-1">
                  Erstelle dein Firmenprofil – basierend auf deinen Daten erstellen wir eine individuelle Erstanalyse mit konkreten Handlungsempfehlungen<span className="text-[#C5A059]">.</span>
                </p>
              </div>
              <ProfileSetup onComplete={handleProfileComplete} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
