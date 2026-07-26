# CONSENT.md — Einwilligungen, Aufbewahrung & Löschkonzept

## Recording-Einwilligung (§201 StGB)

### Rechtliche Grundlage
Das Aufzeichnen eines nicht-öffentlichen Gesprächs ohne Einwilligung aller Beteiligten ist in Deutschland strafbar (§201 StGB). Dies gilt unabhängig von der DSGVO.

### Implementierung
- **ConsentGate-Komponente** (`src/components/shared/ConsentGate.tsx`) MUSS vor jeder Audioaufnahme angezeigt werden
- Die Einwilligung wird als `consent_given_at` Timestamp + `consent_text` in der `recordings`-Tabelle gespeichert
- Ohne bestätigte Einwilligung ist der Aufnahme-Button technisch gesperrt
- Fallback: Reines Formular statt Recording

### Einwilligungstext (Stand 2026-07-27)
> "Dieses Gespräch wird aufgezeichnet und transkribiert, um die Beratungsqualität zu verbessern und Inhalte für [Kundenname] zu erstellen. Die Aufnahme kann jederzeit gelöscht werden. Durch Klick auf 'Einverstanden' stimmen alle Teilnehmer der Aufzeichnung zu."

### Während der Aufnahme
- Sichtbarer roter Recording-Indikator im UI
- Jederzeit stopp-bar durch alle Teilnehmer

## Aufbewahrung

| Datentyp | Aufbewahrung | Löschfrist |
|---|---|---|
| Audio-Aufnahme | Supabase Storage (verschlüsselt) | Nach erfolgreicher Extraktion → Dossier: automatisch löschbar. Standard: 30 Tage nach Verarbeitung. |
| Transkript | `transcripts`-Tabelle | Bleibt als Quellreferenz für Dossier-Felder. Löschbar auf Kundenwunsch. |
| Dossier | `dossiers` + `dossier_fields` | Solange Kundenbeziehung aktiv. Bei Vertragsende: Lesezugriff für Kunde, keine Neugenerierung. |
| KI-Chat-Verläufe | `bot_sessions` | Unbegrenzt während aktiver Nutzung. Löschbar auf Kundenwunsch. |
| Generierte Inhalte | `generated_content`, `assets` | Solange Kundenbeziehung aktiv + 90 Tage Nachfrist. |

## Löschkonzept

### Automatische Löschung
- Audio-Aufnahmen: 30 Tage nach erfolgreicher Dossier-Extraktion (konfigurierbar)
- Abgelaufene Invitation-Tokens: 90 Tage nach Ablauf

### Löschung auf Anfrage
- Kunde kann eigene Aufnahmen + Transkripte jederzeit löschen (unabhängig vom Dossier)
- Komplett-Löschung eines Kundendatensatzes: nur durch Admin, mit Bestätigungsdialog und Audit-Log
- Löschung ist irreversibel — vorher Backup-Hinweis

### Datenresidenz
- Supabase: EU (eu-central-1, Frankfurt)
- Anthropic/OpenAI: Verarbeitung in den USA (dokumentiert in DATA-FLOWS.md)
- Higgsfield: Verarbeitung über deren API (Standort zu dokumentieren)
