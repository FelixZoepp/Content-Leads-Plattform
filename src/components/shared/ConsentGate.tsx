import { useState } from "react";
import { AlertTriangle, Mic, Shield } from "lucide-react";

interface ConsentGateProps {
  onConsent: () => void;
  onDecline: () => void;
  participantName?: string;
}

/**
 * Recording consent gate — MUST be shown before any audio recording starts.
 * Required by §201 StGB (DE) — recording without consent is a criminal offense.
 */
export function ConsentGate({ onConsent, onDecline, participantName }: ConsentGateProps) {
  const [confirmed, setConfirmed] = useState(false);

  const consentText = `Dieses Gespräch wird aufgezeichnet und transkribiert, um die Beratungsqualität zu verbessern und Inhalte für ${participantName || "den Kunden"} zu erstellen. Die Aufnahme kann jederzeit gelöscht werden. Durch Klick auf "Einverstanden" stimmen alle Teilnehmer der Aufzeichnung zu.`;

  return (
    <div className="glass-panel max-w-md mx-auto">
      <div className="relative z-[2] space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(232,116,103,0.15)" }}>
            <Mic className="w-5 h-5 text-[#E87467]" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-white">Aufnahme-Einwilligung</h3>
            <p className="text-[11px] text-[rgba(249,249,249,0.4)]">§201 StGB — Einwilligung erforderlich</p>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-[rgba(249,249,249,0.08)]" style={{ background: "rgba(249,249,249,0.02)" }}>
          <p className="text-[13px] text-[rgba(249,249,249,0.72)] leading-relaxed">{consentText}</p>
        </div>

        <div className="flex items-start gap-2 text-[11px] text-[rgba(249,249,249,0.4)]">
          <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#E9CB8B]" />
          <span>Die Aufnahme wird verschlüsselt gespeichert und kann nach Abschluss der Verarbeitung gelöscht werden. Das Transkript bleibt zur Weiterverarbeitung erhalten.</span>
        </div>

        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-[rgba(249,249,249,0.08)] hover:border-[rgba(197,160,89,0.2)] transition" style={{ background: "rgba(249,249,249,0.02)" }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="mt-0.5 rounded"
          />
          <span className="text-[12px] text-white">
            Ich bestätige, dass <strong>alle Gesprächsteilnehmer</strong> der Aufzeichnung und Transkription zugestimmt haben.
          </span>
        </label>

        <div className="flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 px-4 py-2.5 border border-[rgba(249,249,249,0.08)] rounded-xl text-[12px] text-[rgba(249,249,249,0.5)] hover:bg-[rgba(249,249,249,0.04)] transition"
          >
            Ohne Aufnahme fortfahren
          </button>
          <button
            onClick={onConsent}
            disabled={!confirmed}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold text-white transition disabled:opacity-30"
            style={{ background: confirmed ? "linear-gradient(135deg, #C5A059, #775A19)" : undefined }}
          >
            <Mic className="w-3.5 h-3.5" />
            Einverstanden — Aufnahme starten
          </button>
        </div>
      </div>
    </div>
  );
}
