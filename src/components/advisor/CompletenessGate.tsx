// CL-123: Dossier Completeness Gate Display
// Shows a blocking banner when dossier completeness < 80%,
// listing missing fields grouped by category.

import { AlertTriangle } from "lucide-react";

// ── Category & field definitions (mirrored from DossierPage) ─────────────────

const CATEGORIES = [
  { label: "Angebot", keys: ["angebot", "preismodell", "ergebnisse"] },
  { label: "ICP", keys: ["branche", "rolle", "groesse", "trigger", "schmerz"] },
  {
    label: "Kommunikation",
    keys: ["tonalitaet", "themen", "no_gos", "beispiel_posts", "kommunikationsstil"],
  },
  { label: "Visuell", keys: ["farben", "fonts", "logo", "bildstil", "claim"] },
  { label: "Content", keys: ["content_saeulen", "cta_ziel"] },
] as const;

const FIELD_LABELS: Record<string, string> = {
  angebot: "Angebot",
  preismodell: "Preismodell",
  ergebnisse: "Ergebnisse",
  branche: "Branche",
  rolle: "Zielrolle",
  groesse: "Unternehmensgröße",
  trigger: "Trigger",
  schmerz: "Schmerz / Problem",
  tonalitaet: "Tonalität",
  themen: "Themen",
  no_gos: "No-Gos",
  beispiel_posts: "Beispiel-Posts",
  kommunikationsstil: "Kommunikationsstil",
  farben: "Farben",
  fonts: "Fonts",
  logo: "Logo",
  bildstil: "Bildstil",
  claim: "Claim",
  content_saeulen: "Content-Säulen",
  cta_ziel: "CTA-Ziel",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface CompletenessGateProps {
  /** The completeness score 0–100 from the dossier. */
  completenessScore: number;
  /** Array of field_keys that are missing (empty). */
  missingFieldKeys: string[];
  /** Threshold below which the gate is shown. Default: 80 */
  threshold?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CompletenessGate({
  completenessScore,
  missingFieldKeys,
  threshold = 80,
}: CompletenessGateProps) {
  if (completenessScore >= threshold || missingFieldKeys.length === 0) return null;

  // Group missing keys by category
  const groupedMissing: Array<{ label: string; missing: string[] }> = CATEGORIES
    .map((cat) => ({
      label: cat.label,
      missing: (cat.keys as readonly string[]).filter((k) => missingFieldKeys.includes(k)),
    }))
    .filter((g) => g.missing.length > 0);

  const isBlocking = completenessScore < threshold;
  const borderColor = isBlocking ? "rgba(232,116,103,0.35)" : "rgba(233,203,139,0.35)";
  const bgColor = isBlocking ? "rgba(232,116,103,0.06)" : "rgba(233,203,139,0.06)";
  const accentColor = isBlocking ? "#E87467" : "#E9CB8B";

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: bgColor, border: `1px solid ${borderColor}` }}
      role="alert"
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-start gap-2.5 mb-3">
        <AlertTriangle
          className="w-4 h-4 flex-shrink-0 mt-0.5"
          style={{ color: accentColor }}
        />
        <div>
          <p className="text-[13px] font-semibold" style={{ color: accentColor }}>
            Dossier unvollständig — {completenessScore}% von mindestens {threshold}% erforderlich
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(249,249,249,0.45)" }}>
            Fulfillment ist erst nach Erreichen des Schwellenwerts möglich.
          </p>
        </div>
      </div>

      {/* Grouped missing fields */}
      <div className="space-y-2.5">
        {groupedMissing.map(({ label, missing }) => (
          <div key={label}>
            <p
              className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1"
              style={{ color: "rgba(249,249,249,0.35)" }}
            >
              {label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {missing.map((key) => (
                <span
                  key={key}
                  className="px-2 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    color: accentColor,
                    background: `${accentColor}14`,
                    border: `1px solid ${accentColor}30`,
                  }}
                >
                  {FIELD_LABELS[key] ?? key}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Mini progress bar */}
      <div className="mt-3">
        <div
          className="h-1 rounded-full overflow-hidden"
          style={{ background: "rgba(249,249,249,0.08)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${completenessScore}%`,
              background: isBlocking
                ? "linear-gradient(90deg,#E87467,#F0A09A)"
                : "linear-gradient(90deg,#C5A059,#E9CB8B)",
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px]" style={{ color: "rgba(249,249,249,0.25)" }}>
            0%
          </span>
          <span className="text-[9px]" style={{ color: "rgba(249,249,249,0.25)" }}>
            Ziel: {threshold}%
          </span>
        </div>
      </div>
    </div>
  );
}
