# REVIEW.md v3 — Bestandsanalyse gegen Master-Prompt v3

**Datum:** 2026-07-27
**Repo:** `FelixZoepp/Content-Leads-Plattform`
**Commit:** `8b94877`

---

## Executive Summary

Die Plattform ist ein **funktionsfähiges Vite-SPA** (React 18 + TS + Tailwind + shadcn + Supabase) mit 90 DB-Tabellen, 57 Edge Functions und ~25 Frontend-Seiten. Sie deckt das **Consulting-Dashboard** (KPIs, Health-Scores, Berater-Workflows, Checklisten) und **KI-Self-Service** (Chat, Tone of Voice, Content Generator, Profiloptimierung) solide ab.

**Gegen den v3-Prompt fehlen 26 Kerntabellen und 7 vollständige Module.** Die größten Lücken: kein Produkt-/Entitlement-Modell (Feature-Gating ist hardcoded per `feature_access`-Tabelle), kein Onboarding-Track-System, keine Recording-Pipeline mit Consent, kein Dossier-Konzept, keine Format-Registry, keine Render-Engine, kein Fulfillment/Job-System, keine flexible Metrik-Registry, kein Higgsfield/HeyReach/Perspective-Adapter. Recording existiert (OpenAI Realtime, Whisper), aber **ohne jegliche Einwilligungslogik (§201 StGB Risiko)**.

**Empfehlung:** Fundament (Produkt-Modell, Entitlements, Onboarding, Consent) komplett neu bauen. Bestehende Module (Akademie, KI-Bots, Checklisten, KPIs, Admin-Dashboard) als Basis behalten und schrittweise an das neue Entitlement-System anbinden. Content Factory, Render-Engine und Fulfillment sind Neubau.

---

## Stack-Inventar

| Bereich | Technologie | Version |
|---|---|---|
| Frontend | React (Vite SPA, SWC) | 18.3.1 |
| Routing | react-router-dom | 6.30.1 |
| Styling | Tailwind CSS + shadcn/ui + Gold Design-System | 3.4.17 |
| State | React Context (Auth, Dashboard, Subscription) | — |
| Backend | Supabase (ciimklroqbmzcblnbgdk, eu-central-1) | 2.76.1 |
| Edge Functions | 57 Deno Functions | — |
| Auth | Supabase Auth (Email/Password) | — |
| AI | Anthropic Claude + OpenAI (Fallback) + Google Gemini | — |
| Telefonie | Twilio Voice SDK + sip.js | 2.18.0 |
| Billing | Stripe | — |
| Hosting | Vercel SPA | — |
| DB | PostgreSQL 17, 90 Tabellen, RLS auf ~40 | — |

---

## Gap-Matrix (v3 Module gegen Bestand)

### A — Fundament
| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| Auth | ✅ | Supabase Auth, Email/PW, Session | SSO-Fähigkeit | 3/5 | Fortführen |
| Rollen | 🟡 | profiles.role (admin/advisor/client) + is_super_admin | Saubere RBAC mit Produkt-Bezug | 2/5 | Refactoring |
| Mandantentrennung | 🟡 | RLS auf ~40 Tabellen, org_id auf profiles | Einheitlicher Scope auf ALLEN Tabellen | 3/5 | Fortführen |
| Audit-Log | ✅ | audit_log + Trigger auf 5 Tabellen + RPC | Mehr Tabellen triggern | 4/5 | Fortführen |
| Impersonation | ✅ | SessionStorage-basiert + Banner + Audit | Zeitlimit fehlt | 3/5 | Ergänzen |

### B — Einladungen & Zugang
| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| Token-System | 🟡 | invitations (uuid token, role, expires_at, used_at) | Produktkontext, Advisor-Zuweisung, Onboarding-Track, atomare Einmal-Einlösung, Rate Limiting, Anti-Enumeration | 2/5 | Neubau |
| Status-Tracking | ❌ | Nur versendet/eingelöst | versendet→geöffnet→registriert→onboarding→abgeschlossen | — | Neubau |
| Bulk-CSV | ❌ | Nichts | Vorschau, Validierung, Fehlerbericht | — | Neubau |
| Erinnerungen | ❌ | Nichts | Auto-Reminder nach n Tagen | — | Neubau |

### C — Produkt- & Entitlement-Modell
| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| Produktdefinition | ❌ | Nichts (kein products/features Modell) | Produkt, Feature, ProduktFeature, KundenProdukt, FeatureOverride | — | **Neubau (P0)** |
| hasFeature() | 🟡 | useFeatureAccess per account_id+feature(text) — nur in Outreach | Zentrale, serverseitige Funktion für ALLE Module | 1/5 | Neubau |
| Dynamische Navigation | ❌ | Sidebar hardcoded | Navigation aus Feature-Menge generiert | — | Neubau |

### D — Onboarding-Tracks
| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| Track-System | ❌ | Nur ein simpler Onboarding-Wizard (3 Schritte) | Tracks als Datenstruktur, Schritt-Typen, Deduplizierung, Vollständigkeits-Gate | — | **Neubau** |

### E — Recording-Pipeline → Dossier
| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| Recording | 🟡 | OpenAI Realtime (WebRTC), Whisper Transcription | **KEINE EINWILLIGUNG** (§201 StGB Risiko), keine Löschfunktion | 1/5 | **Refactoring (P0)** |
| Dossier | ❌ | Nichts (kein strukturiertes Kundenwissens-Modell) | Fragen-Schema, Extraktion, Konflikt/Lücken-Bericht, Versionierung, Freigabe-Gate | — | **Neubau** |

### F — Akademie
| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| Kurse/Lektionen | ✅ | courses, lessons, lesson_progress + RLS + UI | Feature-basierte Freischaltung (statt nur is_published) | 4/5 | Ergänzen |
| Admin-CMS | ✅ | AcademyCMS mit CRUD, Reihenfolge, Publish | — | 4/5 | Fortführen |
| Fortschritt | ✅ | lesson_progress + Sequential Unlock | Signal an AI Concierge | 4/5 | Fortführen |

### G — KI-Bots
| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| Bot-Framework | ✅ | BotChat.tsx mit 5 Bot-Typen, bot_sessions, generated_content | Token-/Kostenzählung pro KUNDE (nur global in ai_usage_log) | 3/5 | Ergänzen |
| Tone of Voice | ✅ | Interview-Bot + tone_of_voice_profiles | Integration als Dossier-Baustein | 4/5 | Ergänzen |
| Content-Generator | ✅ | Lead-Posts, Content-Posts, Sales-Skripte | Anti-Wiederholung (letzte N Posts als Negativkontext) | 3/5 | Ergänzen |
| Profiloptimierung | ✅ | ProfileOptimizerPage mit Zeichenlimits | Dossier-Integration, Format-Registry-Integration | 4/5 | Ergänzen |
| Prompt-Registry | ✅ | prompt_templates + Versioning + 8 Seeds + Admin-UI | Diff-Ansicht in Admin | 4/5 | Fortführen |

### H — Berater-Workflows
| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| Profiloptimierung | ✅ | profile_optimizations + profile_sections + RLS | Kundenfreigabe-UI, Dossier-Anbindung | 3/5 | Ergänzen |
| Checklisten | ✅ | Templates + Instanzen + Abhaken + interne Notizen | Feature-basierte Templates pro Produkt | 4/5 | Ergänzen |
| Content-Pipeline | ✅ | content_plans + content_items + Kalender | Batch-Review-UI, Sammelfreigabe, Cron-Integration | 3/5 | Ergänzen |

### I — Content Factory
| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| 1-Klick-Generierung | ❌ | Nichts | Deliverable Sets, parallele Jobs, Varianten, Entwurf-Status | — | **Neubau** |
| Higgsfield | ❌ | Kein Code, kein Adapter | API-Integration, Visual-Presets, Kosten-Tracking, Fallback | — | **Neubau** |
| Perspective | ❌ | Nur ein FunnelBuilder-Stub (Outreach, gesperrt) | Funnel-Briefing-Generator, manual-Adapter, Status-Tracking | — | **Neubau** |
| Wöchentlicher Cron | ❌ | Nichts | Batch-Generierung, Idempotenz, Anti-Wiederholung, Berater-Notification | — | **Neubau** |
| Chat-Revision | ❌ | Nichts | Chat an Entwurf, Versionierung, Rollback | — | **Neubau** |

### J — Format-Registry, Asset-Bibliothek & Render-Engine
| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| Format-Registry | ❌ | Zeichenlimits in ProfileOptimizerPage hardcoded | Zentrale Registry, Safe Zones, Dreifach-Vorschau | — | **Neubau** |
| Brand-Tokens | ❌ | Nichts | Farben, Fonts, Logo, Bildstil pro Kunde | — | **Neubau** |
| Render-Engine | ❌ | Nichts | 3-Schicht (LLM → Bild → Compositing), HTML/SVG Templates | — | **Neubau** |

### K — 1-Klick-Fulfillment
| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| Komplett | ❌ | Nichts | Deliverable Sets, Aufträge, Teiljobs, Review-Queue, Export | — | **Neubau** |

### L — Kennzahlen
| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| Erfassung | 🟡 | metrics_snapshot (Perioden-basiert), KPITrackingPage, Dashboard-Widgets | **Tagesauflösung**, Metrik-Registry, Nulltag, source pro Datenpunkt, mobil-optimierte Eingabe | 2/5 | **Neubau des Erfassungsmodells** |
| HeyReach-Sync | ❌ | Kein Code | API-Adapter, Sync-Job, Konflikterkennung | — | Neubau |
| Dashboards | ✅ | Kunde/Berater/Admin Dashboards mit Recharts | Benchmarks aus Metrik-Registry | 3/5 | Ergänzen |

### M — Zufriedenheitsreports
| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| Umfragen | 🟡 | surveys + survey_response_entries + SurveyManager-UI | Versand-System, Token-Link, Frequenz-Sperre, Anonymitätskonzept | 2/5 | Ergänzen |
| KI-Auswertung | 🟡 | "KI-Analyse starten" Button in SurveyManager | Sofort-Alarm bei kritischer Antwort, aggregierte Trends | 2/5 | Ergänzen |

### N — AI Concierge & Revenue Intelligence
| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| Health-Score | ✅ | health_scores + calculate-health Edge Function | Kennzahlen-Erfassungsquote als Signal | 3/5 | Ergänzen |
| AI Insights | ✅ | ai_insights + source_refs (jsonb) | Mehr Signalquellen, Sofort-Alarm | 3/5 | Ergänzen |
| Upsell-Signale | ✅ | upsell_signals + PitchGenerator-UI | Produktbezug (welches Angebot passt) | 3/5 | Ergänzen |

### O — Admin-Cockpit
| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| Übersicht | ✅ | AdminDashboard mit Health/Revenue/Workload Widgets | Produktfilter, Feature-Flags-UI | 3/5 | Ergänzen |
| Registries | 🟡 | Prompt-Registry UI | Metrik-Registry, Format-Registry, Deliverable Sets, Onboarding-Tracks | 2/5 | Neubau |
| Job-Monitor | ❌ | Nichts | Queue-Ansicht, Fehlerlog, manueller Neustart | — | Neubau |
| Kosten | ❌ | ai_usage_log existiert, keine UI pro Kunde/Monat | Kosten-Dashboard mit Limits | — | Neubau |

### P — AI Hunter System
| Aspekt | Status | Empfehlung |
|---|---|---|
| Nicht spezifiziert | ❌ | Produkt-Datensatz anlegen, leerer Onboarding-Track, Rückfragen in ASSUMPTIONS.md |

### Q — Integrationen
| Provider | Status | Was existiert | Was fehlt |
|---|---|---|---|
| HeyReach | ❌ | Nur Label in KPI-Source-Badge | API-Adapter, Sync-Job, Credential-Handling |
| Higgsfield | ❌ | Nichts | API-Adapter, Visual-Presets, Job-Polling, Kosten-Tracking |
| Perspective | ❌ | FunnelBuilder-Stub (gesperrt) | manual-Adapter, Funnel-Briefing-Generator |
| Twilio | ✅ | Voll integriert | — |
| Stripe | ✅ | Edge Functions für Checkout/Portal | Produktbezogene Abrechnung |
| Supabase Vault | ✅ | store/get/delete_credential RPCs | UI für Credential-Verwaltung |

---

## Risiko- & Schuldenbericht

### P0 — Muss vor allem anderen behoben werden
1. **Recording ohne Einwilligung (§201 StGB).** `RealtimeAudio.ts` startet Aufnahme ohne Consent-Gate. Strafrechtliches Risiko.
2. **Kein Produkt-/Entitlement-Modell.** Navigation und Feature-Zugang sind hardcoded. Ein neues Produkt erfordert Code-Änderungen.
3. **Kein Dossier-Konzept.** Generierung basiert auf ad-hoc Kontext statt strukturiertem, freigegebenem Kundenwissen.

### P1 — Sicherheitsrelevant
4. **Invitation Tokens nicht atomar einlösbar** — Race Condition möglich (used_at UPDATE ohne Lock).
5. **Impersonation ohne Zeitlimit** — Admin bleibt unbegrenzt als Kunde eingeloggt.
6. **Passwort in Git-History** (MIGRATION_STATUS.md) — noch nicht rotiert.
7. **Kein Rate Limiting** auf Einladungs- und Auth-Endpoints.

### P2 — Architektur
8. **Keine Job-Infrastruktur.** Kein Queue-System für Hintergrund-Jobs (Bildgenerierung, Sync, Cron).
9. **Format-Vorgaben verstreut.** LinkedIn-Zeichenlimits in ProfileOptimizerPage hardcoded statt zentral.
10. **Keine Render-Engine.** Kein Konzept für deterministische Asset-Erzeugung (Text + Bild → fertiges Visual).
11. **metrics_snapshot nicht tagesfähig** — period_type unterstützt zwar "daily", aber kein Nulltag-Konzept, keine Source-Spalte, keine Metrik-Registry.

### P3 — Tech Debt
12. **~40 gesperrte Outreach-Seiten** als Dead Code im Bundle.
13. **SubscriptionContext ist ein Stub** (hardcoded `tier: "pro"`).
14. **Keine Tests, keine CI.**
15. **Dual-Tenant-Modell** (accounts + tenants + organisations) — drei Tabellen für ein Konzept.

---

## Detailbefunde Phase-0-Analyse (2026-07-26)

### D1 — Hardcoded Product Logic

Kein `if (produkt ===` / `if (plan ===` / `if (tier ===` im Frontend. Aber zwei inkonsistente Zugangssysteme:

**System A — `feature_access`-Tabelle (DB-gesteuert):**
- `/src/hooks/useFeatureAccess.tsx` — nimmt String-Argument, macht DB-Query
- Genutzt in `FeatureGate`-Wrapper für: `outreach_instagram`, `finance`, `crm`, `content_generator`, `content_analytics`, `content_management`

**System B — Tier-Properties (broken):**
- Dieselbe `useFeatureAccess.tsx` wird OHNE Argument aufgerufen und soll `isStarterPlan`, `isProPlan`, `canUsePowerDialer`, `canUseObjectionLibrary`, `canUseLiveObjectionHandling`, `currentTier` zurückgeben
- Diese Properties existieren NICHT in der 43-Zeilen-Datei
- Betroffene Dateien mit Laufzeit-Bug:
  - `src/pages/outreach/SalesflowDashboard.tsx:60`
  - `src/pages/outreach/ObjectionLibrary.tsx:30`
  - `src/pages/outreach/EmailTemplates.tsx:29`
  - `src/pages/outreach/PowerDialer.tsx:7`
  - `src/pages/outreach/Upgrade.tsx:123`
  - `src/components/outreach/UpgradePrompt.tsx:19`

**Hardcoded Stripe Product-ID:**
- `src/hooks/useSubscription.tsx:68,87` — `productId: 'prod_TkoJ98sfzflYyR'` fest im Code für Super-Admin und Trial-User

### D2 — Invitation/Onboarding Flow

| Funktion | Token | Expiry | Advisor-Assignment | Produkt-Kontext |
|---|---|---|---|---|
| `invite-advisor` | Supabase Magic Link (kein eigenes Token) | 24h (Supabase-Default) | Nein | Nein |
| `invite-customer` | Supabase Magic Link (kein eigenes Token) | 24h (Supabase-Default) | Nein | Nein |
| `invite-team-member` | `crypto.randomUUID()` in `invitations`-Tabelle | 30 Tage | N/A | Nein |

**invite-team-member Race Condition:** Token wird als `used_at` markiert noch bevor der User sich eingeloggt hat (Zeile 119 für existierende User, Zeile 170 für neue User) — kein atomarer Single-Use-Check.

**invite-customer für existierende User:** Sendet Password-Reset statt Invite-Link — funktioniert technisch, ist aber semantisch falsch und verwirrt den User.

### D3 — Kennzahlen-Modell

**metrics_snapshot:** `period_type` unterstützt `daily/weekly/monthly`. Tagesauflösung ist möglich. Expliziter Nulltag auch (keine NOT NULL auf Metrik-Spalten). Aber:
- `source`-Spalte fehlt in der Tabelle — `AdvisorKPIPage.tsx:101` prüft schon `source === "api_heyreach"`, was zur Laufzeit `undefined` ergibt
- Keine Metrik-Registry — Spalten sind fest kodiert

**Zwei parallele KPI-Systeme:**
1. `kpi_entries` — für Self-Tracking (Outreach-User), `user_id`-basiert
2. `metrics_snapshot` — für Berater-Ansicht, `tenant_id`-basiert

### D4 — Recording/Transcription

**`src/utils/RealtimeAudio.ts`:**
- `RealtimeChat.init()` ruft intern `startRecording()` auf — **immer**, ohne Consent-Gate
- WebRTC-Verbindung zu OpenAI Realtime API (`gpt-4o-realtime-preview-2024-12-17`)
- Transkript wird in `transcriptParts[]`-Array gesammelt
- Keine Consent-Variable, kein Opt-in, kein Hinweistext

**`supabase/functions/transcribe-audio/index.ts`:**
- Nimmt base64 Audio, sendet an OpenAI Whisper, Sprache: `de`
- Kein Consent-Parameter

**`call_sessions`-Tabelle:** Hat `recording_url`, `transcript`, `summary` — aber kein `consent_given BOOLEAN`-Feld.

**`src/components/outreach/AvvAgreement.tsx`:** Deckt AVV (Art. 28 DSGVO) ab, aber nicht die Einwilligung des Angerufenen zur Aufnahme.

### D5 — Asset-/Bildgenerierung

- Higgsfield: **Nicht im Code** — kein Treffer
- Bildgenerierung: **Existiert nicht** — generate-asset produziert ausschließlich Markdown-Text
- `supabase/functions/generate-asset/index.ts`: 14 Text-Asset-Typen, System-Prompt inline hardcodiert (nicht aus `prompt_templates`-Tabelle)
- HeyGen Video: `useAutoVideoGeneration.ts` pollt auf `video_status = 'pending_auto'` und ruft `process-pending-videos` auf — **diese Function ist nicht deployed**

### D6 — HeyReach

Nicht implementiert. Vorkommen:
- `BACKLOG.md:322` — offenes Ticket CL-026
- `supabase/migrations/0006_intelligence.sql:89` — Provider-Enum enthält 'heyreach'
- `src/pages/advisor/AdvisorKPIPage.tsx:101` — UI-Badge-Check auf `source === "api_heyreach"` (Laufzeit-Bug: Spalte fehlt)

### D7 — Entitlement-Modell

**`feature_access`-Tabelle:** Korrekte Basis. Aber kein Seeding beim Onboarding — neue User haben Default `is_active = false` auf allem.

**Invited Team-Members:** `trial_ends_at = now() + 10 Jahre` (`invite-team-member/index.ts:114`) — effektiv lebenslanges kostenloses Trial.

**`profiles.role`** (setter/closer/admin) vs. **`user_roles`** (admin/client/advisor): Zwei parallele ENUM-Systeme. RLS nutzt `profiles.role`, Invite-Funktionen nutzen `user_roles`. Nach advisor-invite haben User beide Einträge.

### D8 — Dossier-Konzept

Kein explizites Dossier. Generierung lädt ad-hoc aus `tenants.*`. Fehlende Felder in tenants die Prompts benötigen:
`icp_rolle`, `icp_branche`, `icp_schmerz`, `ergebnis`, `usp`, `bestes_ergebnis`, `erfahrung_jahre`, `persoenliche_story`, `mechanismus`, `zeitversprechen`, `skalierungsmodell`

Alle mit `|| 'k.A.'` abgefangen — generische statt personalisierte Outputs.

Vorhandene Dossier-Bausteine (verteilt):
- `tenants` — Basis-KPIs
- `icp_customers` — ICP-Beispiele
- `tone_of_voice_profiles` — ToV aus Interview
- `profile_optimizations` + `profile_sections` — LinkedIn-Sections
- `generated_assets` — erzeugte Assets

### D9 — Perspective Funnels

Nicht im Code. Eigener `FunnelBuilder` unter `/src/components/outreach/landing-builder/` existiert, ist aber im Outreach-Modul (nicht Consulting) und über Feature-Gate gesperrt.

### D10 — Job-Architektur

| System | Status | Datei |
|---|---|---|
| Email-Queue | REAL | `process-email-queue/index.ts`, Deno Queues, DLQ, Rate-Limiting |
| sync_jobs Tabelle | Schema only | `0006_intelligence.sql` — kein Scheduler |
| HeyGen Video-Polling | Client-seitig (broken) | `useAutoVideoGeneration.ts` → fehlende Function |
| Power-Dialer Queue | Partial | `cold_call_queue` als `any` gecasted |
| Cron/pg_cron | Nicht vorhanden | — |

### D11 — Format-Registry

Dreifach dupliziert, nicht zentral:
1. `generate-asset/index.ts` — Headline "max 220 Zeichen" im System-Prompt
2. `src/pages/ai/ProfileOptimizerPage.tsx:11-18` — `SECTIONS`-Array mit `maxChars`
3. `src/pages/ai/ProfileOptimizerPage.tsx:30-35` — Selbe Limits im System-Prompt

### D12 — Content Factory / Batch-Generierung

Kein Cron, kein Batch-Modus. Manuelle Einzel-Generierung via `ContentCalendarPage.tsx`. Zwei parallele Content-Systeme:
- `content_posts` (original, für Self-Service)
- `content_items` + `content_plans` (neu aus 0005, für Advisor-Workflow)

### D13 — Tabellen aus Phase 2

| Migration | Neue Tabellen |
|---|---|
| 0002 | `audit_log` |
| 0003 | `prompt_templates`, `prompt_template_versions`, `ai_usage_log` |
| 0004 | `courses`, `lessons`, `lesson_progress` |
| 0005 | `advisor_assignments`, `tone_of_voice_profiles`, `profile_optimizations`, `profile_sections`, `checklist_templates`, `checklist_template_items`, `checklist_instances`, `checklist_item_statuses`, `content_plans`, `content_items`, `generated_content`, `bot_sessions` |
| 0006 | `surveys`, `survey_response_entries`, `ai_insights`, `upsell_signals`, `pitch_templates`, `integration_credentials`, `sync_jobs` |
| 0007 | Vault-Funktionen (`store_credential`, `get_credential`, `delete_credential`, `get_credential_status`) |
| 0008 | `organisations` (dritte parallele Mandanten-Entität) |
| 0009 | RLS-Policies auf bestehende core tables |

**Organisations vs. Accounts vs. Tenants:** Nach 0008 gibt es drei Mandanten-Entitäten. `organisations` hat ähnliche Felder wie `accounts` und `tenants`. Weitgehend ungenutzt — kaum Code-Referenzen.

### D14 — Working vs. Stubbed

**REAL (connected, functional):**
metrics_snapshot-Erfassung, kpi_entries, generate-asset (Text), Content Calendar, AI Chat, Profile Optimizer, Akademie CRUD, Checklisten, CSAT Surveys, Advisor-Assignments, Cashflow Dashboard, Email-Queue, Campaigns CRUD, Landing Page Builder, Email Campaigns, Live Objection Handler, Transcription (Whisper), Team Arena

**PARTIAL (schema + UI, aber Lücken):**
Power Dialer (cold_call_queue nicht typisiert), Lead Search (externe Google-Suche, fragil), Lead Enrichment (Credits ok, Datenbasis extern), Custom Domains (kein Auto-SSL), Health Score (kein Scheduler), Survey-Versand (kein Token-Link-System)

**STUB (schema only oder UI ohne Backend):**
AI Insights / Upsell Signals (keine automatische Generierung), Prompt Registry (UI ok, aber generate-asset liest es NICHT), HeyGen Video (process-pending-videos fehlt), HeyReach (nur Label), Sequences (kein Executor), Fulfillment Jobs (sync_jobs ohne Cron)
