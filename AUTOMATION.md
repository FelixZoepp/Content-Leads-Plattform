# AUTOMATION.md — Cron-Jobs, Jobs, Idempotenz, Fehlerpfade

## Wöchentliche Content Factory (Cron)

| Aspekt | Wert |
|---|---|
| Trigger | pg_cron oder Vercel Cron, Sonntag 20:00 UTC |
| Scope | Copy + Visuals für konfigurierte Kunden |
| Idempotenz-Key | `{user_id}_{iso_week_year}_{iso_week}` |
| Batch-Key | Ein Batch pro Kunde pro Woche |
| Retry | Max 3 Versuche pro Teiljob, exponential backoff (1m, 5m, 15m) |
| Fehlerisolation | Ein fehlgeschlagener Kunde bricht NICHT den Lauf für andere ab |
| Anti-Wiederholung | Letzte 20 Posts als Negativkontext im Prompt |
| Output | Entwürfe im Redaktionsplan, Status "draft" |
| Notification | Berater-Notification: "N Entwürfe für M Kunden warten auf Review" |

### Fehlerpfade
1. **Higgsfield-Timeout:** Visual-Job wird als "visual_pending" markiert, Post entsteht als Text-Entwurf
2. **LLM-Fehler:** Retry mit Fallback (Claude → OpenAI), nach 3 Fehlern: Skip + Fehlerbericht
3. **Dossier unvollständig:** Generierung für diesen Kunden übersprungen, Berater benachrichtigt
4. **Kostenlimit erreicht:** Stopp für diesen Kunden, Admin benachrichtigt

## Fulfillment-Jobs

| Aspekt | Wert |
|---|---|
| Tabellen | `fulfillment_orders` → `fulfillment_jobs` |
| Idempotenz | `idempotency_key` auf `fulfillment_orders` (UNIQUE), verhindert Doppelklick |
| Parallelität | Teiljobs innerhalb eines Auftrags parallel |
| Teilerfolg | 5/6 fertig → die 5 sind nutzbar, das eine einzeln wiederholbar |
| Retry | Pro Job: max_attempts (default 3), exponential backoff |
| Monitoring | Job-Monitor im Admin-Cockpit: Status, Dauer, Fehler, manueller Neustart |

## Sync-Jobs (HeyReach etc.)

| Aspekt | Wert |
|---|---|
| Tabelle | `sync_jobs` |
| Scheduler | Konfigurierbar pro Integration (z.B. alle 6h) |
| Backoff | Bei Rate Limit: 1m → 5m → 15m → 1h → manuell |
| Fehlerlog | `error_message` + `retry_count` pro Job |
| Konflikterkennung | API-Daten überschreiben manuelle NICHT — Abweichung wird angezeigt |

## Umfrage-Versand

| Aspekt | Wert |
|---|---|
| Trigger | Zeitbasiert (Tag 30/60/90) oder manuell |
| Frequenz-Sperre | Max 1 Umfrage pro Kunde pro 30 Tage |
| Erinnerung | Nach 3 Tagen, maximal 2 Erinnerungen |
| Token | Einmaliger Token-Link, kein Login nötig |

## HeyReach Sync (Edge Function: sync-heyreach)

| Aspekt | Wert |
|---|---|
| Trigger | Cron alle 6h oder manuell via Admin Cron Monitor |
| Scope | Alle Kunden mit HeyReach-Credentials (integration_credentials provider='heyreach') |
| Daten | kontaktanfragen_versendet, angenommen, antworten, positive_antworten |
| Ziel | daily_metrics mit source='api:heyreach' |
| Konflikterkennung | Manuelle Einträge (source='manual') werden NICHT überschrieben |
| Fehler | sync_jobs Status + error_message, Retry via Job Monitor |

## AI Concierge (Edge Function: ai-concierge)

| Aspekt | Wert |
|---|---|
| Trigger | Wöchentlich oder manuell |
| Signalquellen | 8: metrics, compliance, academy, checklists, onboarding, surveys, content, health |
| Output | health_scores, ai_insights (top 3 needs), upsell_signals |
| Prompt-Injection-Schutz | Alle Daten in <user_data> Tags |

## Recording + Transkription (Edge Function: transcribe-and-extract)

| Aspekt | Wert |
|---|---|
| Trigger | Manuell nach Recording-Upload |
| Pipeline | Whisper Transkription → Claude/GPT Dossier-Extraktion → dossier_fields |
| Consent | Pflicht — recording ohne consent_given_at wird abgelehnt |
| Löschung | Audio löschbar unabhängig vom Transkript, siehe CONSENT.md |

## Kosten-Limits

| Provider | Standard-Limit | Aktion bei Überschreitung |
|---|---|---|
| Anthropic/OpenAI (LLM) | kein Limit (ai_usage_log tracking) | Warnung an Admin |
| Higgsfield (Visuals) | €50/Kunde/Monat (konfigurierbar) | Stopp + Admin-Benachrichtigung |
| Gesamtkosten | Kein globales Limit | Kosten-Dashboard im Admin |

## Asset Storage Bucket (CL-136)

| Aspekt | Wert |
|---|---|
| Bucket-Name | `assets` |
| Zugriff | Public read, authenticated write |
| Erstellung | Manuell in Supabase Dashboard → Storage → New bucket → Name: `assets`, Public: ✓ |
| RLS-Policy (Upload) | `(auth.role() = 'authenticated')` auf INSERT/UPDATE |
| RLS-Policy (Download) | Public (kein Auth erforderlich für storage_url) |
| Edge Function | `render-asset` nutzt bereits den Bucket-Namen `'assets'` — keine Änderung nötig |
| Dateistruktur | `{user_id}/{asset_id}/{filename}` empfohlen |
| MIME-Typen | image/png, image/jpeg, image/webp, image/svg+xml, text/html |
| Max. Dateigröße | 50 MB (Supabase-Standard, anpassbar per Policy) |

**Wichtig:** Der Bucket muss einmalig manuell erstellt werden — Supabase MCP unterstützt keine Bucket-Erstellung. Danach läuft alles automatisch über die Edge Function.

## Perspective API — Bruchstelle

**Status:** Perspective hat keine öffentliche API (Stand 2026-07-27).

**Aktueller Adapter:** `manual` — das System erzeugt ein Funnel-Briefing als kopierbaren Block + JSON. Der Mensch baut den Funnel extern.

**Wenn die API kommt:** Nur den `manual`-Adapter durch einen `perspective_api`-Adapter ersetzen. Kein Umbau von Datenmodell, UI oder Cron nötig. Das Interface ist identisch: `connect() / test() / execute() / pollJob() / getUsage()`.

**Kein Browser-Automation.** Unter keinen Umständen Selenium/Playwright/Puppeteer gegen Perspective einsetzen.
