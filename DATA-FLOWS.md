# DATA-FLOWS.md — KI-Datenflüsse

Dokumentiert welche Kundendaten an welches KI-Modell/Drittanbieter fließen.

---

## KI-Modell-Aufrufe

| Edge Function | Modell | Kundendaten im Prompt | Zweck |
|---|---|---|---|
| `ai-chat` | Claude Sonnet / GPT-4o (Fallback) | Chat-Nachricht des Users | Allgemeiner KI-Assistent |
| `generate-asset` | Claude Sonnet | Thema, Beschreibung, Stil-Präferenzen | Asset-Generierung (Texte, Headlines) |
| `generate-summary` | Claude Sonnet | metrics_snapshot Daten, health_scores, alerts | Wöchentliche Zusammenfassungen |
| `calculate-health` | Claude Sonnet | Alle KPIs eines Kunden, Akademie-Fortschritt, Content-Aktivität | Gesundheitsampel |
| `summarize-call` | Claude Sonnet / GPT-4o | Anruf-Transkript (full text) | Call-Zusammenfassung |
| `transcribe-audio` | OpenAI Whisper | Audio-Aufnahme (WAV/WebM) | Sprache-zu-Text |
| `analyze-objections` | Google Gemini | Transkript-Ausschnitt | Einwand-Erkennung in Echtzeit |
| `realtime-session` | OpenAI Realtime (GPT-4o) | Ephemeral Token — kein persistierter Input | WebRTC Session-Token |
| `realtime-objection-handler` | OpenAI GPT-4o | Live-Audio-Stream (Echtzeit) | Live-Einwandbehandlung |
| `customize-lead-template` | Claude Sonnet | Firmenname, Branche, Angebot, Zielgruppe | Landing-Page-Texte |
| `generate-landing-page` | Claude Sonnet | Firmenname, Beschreibung, Call-to-Action | HTML Landing Page |
| `generate-html-block` | Claude Sonnet | Abschnittsbeschreibung | HTML-Sektionen |
| `enrich-lead` | Firecrawl API | Website-URL, Firmenname | Lead-Anreicherung |

## Neue Module (geplant)

| Modul | Modell | Kundendaten | Zweck |
|---|---|---|---|
| Tone-of-Voice Interview | Claude Sonnet | Interview-Antworten, Zielgruppe, Stil | ToV-Profil erstellen |
| Lead-Post Generator | Claude Sonnet | ToV-Profil, Thema, Zielgruppe | LinkedIn-Posts |
| Content-Post Generator | Claude Sonnet | ToV-Profil, Content-Säule, Format | LinkedIn-Posts |
| Sales-Skript Generator | Claude Sonnet | Zielgruppe, Angebot, Kanal, Preis | Skript-Varianten |
| Profiloptimierung Bot | Claude Sonnet | LinkedIn-Profil-Text, Zielgruppe | Optimierungsvorschläge |
| Health Analysis | Claude Sonnet | Alle KPIs, Akademie-Fortschritt, CSAT-Antworten, Checklisten-Status | Kunden-Gesundheitsampel |
| Upsell Analysis | Claude Sonnet | Alle Kundendaten + verfügbare Angebote | Upsell-Signal-Erkennung |
| Survey Sentiment | Claude Sonnet | Umfrage-Antworten (Freitext) | Sentiment + Themen-Tags |

## Drittanbieter (nicht-KI)

| Dienst | Daten | Zweck |
|---|---|---|
| Stripe | E-Mail, Name, Subscription-Status | Zahlungsabwicklung |
| Resend | E-Mail-Adresse, Name | Transaktionale E-Mails |
| Twilio | Telefonnummer | VoIP-Anrufe |
| Firecrawl | Website-URL | Web-Scraping für Lead-Enrichment |
| Rewardful | E-Mail, Referral-Code | Affiliate-Tracking |
| HeyReach (geplant) | LinkedIn-Outreach-KPIs | Kennzahlen-Import |

## Datenschutz-Hinweise

1. **Alle KI-Aufrufe gehen über Supabase Edge Functions** — keine direkten API-Calls vom Frontend zu KI-Modellen.
2. **Prompt-Templates sind in der DB versioniert** — Änderungen nachvollziehbar.
3. **Cost-Tracking pro User** — ai_usage_log trackt jeden Aufruf mit Token-Zählung.
4. **Keine Persistierung von KI-Antworten ohne explizites User-Action** ("In Bibliothek speichern").
5. **Datenresidenz:** Supabase EU (eu-central-1, Frankfurt). Anthropic/OpenAI verarbeiten in den USA. Google Gemini ebenso.
6. **Prompt-Injection-Schutz:** Kundendaten werden in Prompts als `<user_data>` markiert, System-Instruktionen klar getrennt.
