# REVIEW.md — Bestandsanalyse Content-Leads-Plattform

**Datum:** 2026-07-26
**Repo:** `FelixZoepp/Content-Leads-Plattform`
**Live:** `https://content-leads-platform.vercel.app`

---

## Executive Summary

Die Plattform ist ein **Lovable-generiertes Vite-SPA** (React 18 + TypeScript + Tailwind + shadcn/ui), deployed auf Vercel, mit Supabase als Backend (Auth, DB, 57 Edge Functions, Storage). Es existieren **55 Routen**, ~271 Dateien und ~88 DB-Tabellen — aber der Großteil der Outreach/CRM-Features ist **gesperrt** (FeatureGate). Die aktive Consulting-Seite (Dashboard, KPIs, Assets, Reports) funktioniert.

**Kritische Lücken:** Keine Migrationsdateien im Repo (Schema nur in Prod-DB), kein einziger Test, keine CI-Pipeline, keine RLS-Policies sichtbar, kein Audit-Log, doppelter AuthProvider, Prompts inline in Edge Functions, PitchFirst-Branding in E-Mail-Templates noch aktiv. Das Datenmodell hat zwei parallele Multi-Tenancy-Konzepte (`account_id` für CRM, `tenant_id` für Consulting) ohne saubere Trennung.

**Empfehlung:** Fortführen mit gezieltem Refactoring. Neubau wäre unverhältnismäßig — die Grundstruktur (Auth, Supabase-Integration, UI-Components, Edge Functions) ist brauchbar. Aber Fundament (Auth/Rollen/RLS/Audit) muss vor neuen Features gehärtet werden.

---

## Stack-Inventar

| Bereich | Technologie | Version |
|---|---|---|
| Framework | React (Vite SPA, SWC) | 18.3.1 |
| Sprache | TypeScript | 5.8.3 |
| Routing | react-router-dom | 6.30.1 |
| Styling | Tailwind CSS + shadcn/ui (50 Komponenten) | 3.4.17 |
| State | React Context (3 Provider), @tanstack/react-query (teilweise) | — |
| DB/Auth | Supabase (ciimklroqbmzcblnbgdk) | 2.76.1 |
| Edge Functions | Deno (57 Functions deployed) | — |
| Hosting | Vercel (SPA rewrite) | — |
| Telefonie | Twilio Voice SDK + sip.js | 2.18.0 |
| AI | OpenAI (Realtime, Whisper), Anthropic (Chat), Google Gemini (Objections) | — |
| E-Mail | Resend + Custom SMTP (per Account) | — |
| Billing | Stripe (Checkout, Portal, Webhooks) | — |
| Build-Tool | Vite | 5.4.19 |
| Dev-Relikt | lovable-tagger (devDependency) | 1.1.11 |

### Fehlende Infrastruktur
- **Tests:** Null. Kein Jest, kein Vitest, kein Playwright, kein Cypress.
- **CI/CD:** Kein GitHub Actions Workflow. Nur Vercel auto-deploy auf Push.
- **Linting:** ESLint konfiguriert, aber kein pre-commit Hook.
- **Migrationen:** Kein `supabase/migrations/` Ordner. Schema existiert nur in der Prod-DB.
- **Env-Management:** Kein `.env.example`. Variablen nur in Vercel Dashboard + Supabase Secrets.

---

## Feature-Matrix (Gap-Analyse)

### A — Fundament (Auth, Rollen, Mandantentrennung, Audit)

| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| Auth (E-Mail) | ✅ | Supabase Auth, Login/Register, Password Reset | SSO-Fähigkeit | 3/5 | Fortführen |
| Rollen | 🟡 | `profiles.role` (client/advisor/admin) + `is_super_admin` | Saubere RBAC-Matrix, Role-Check serverseitig in Edge Functions | 2/5 | Refactoring |
| Mandantentrennung | 🟡 | Zwei Konzepte: `account_id` (CRM) + `tenant_id` (Consulting) | RLS-Policies, einheitliches Tenant-Modell, serverseitige Scope-Erzwingung | 1/5 | Refactoring (P0) |
| Audit-Log | ❌ | Nichts | Komplett | — | Neubau |
| Impersonation | ❌ | Nichts | Komplett | — | Neubau |
| Einladungs-Flow | 🟡 | `invite-advisor`, `invite-customer`, `invite-team-member` Edge Functions | Einheitlicher Flow, Token-Ablauf-Handling, UI-Feedback | 3/5 | Fortführen |
| Doppelter AuthProvider | 🟡 | `contexts/AuthContext.tsx` + `hooks/useAuth.tsx` | Konsolidierung auf einen Provider | 2/5 | Refactoring |

### B — Akademie

| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| Kurse/Module/Lektionen | 🟡 | Training-Page mit 8 Modulen (Sprint Roadmap) | DB-Schema für Kurse, kein CMS, keine Downloads/Quizze, alles hardcoded im Frontend | 2/5 | Neubau |
| Fortschritts-Tracking | ❌ | Nichts (MIGRATION_STATUS sagt "noch offen") | Komplett | — | Neubau |
| Freischaltungslogik | ❌ | Nichts | Komplett | — | Neubau |
| Admin-CMS | ❌ | Nichts | Komplett | — | Neubau |
| Berater-Sicht | ❌ | Nichts | Komplett | — | Neubau |

### C — KI-Bots & Training

| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| Tone-of-Voice-Profil | ❌ | Nichts | Komplett (Interview-Flow, Profil-Speicherung) | — | Neubau |
| AI Chat | 🟡 | `ai-chat` Edge Function + `ContentLeadsChat` UI | Prompt-Registry, ToV-Integration, Token-Tracking | 2/5 | Refactoring |
| Content-Generierung | 🟡 | `generate-asset`, `generate-summary` Edge Functions | Content-Bibliothek, Lead-Posts/Sales-Skripte Unterscheidung | 2/5 | Refactoring |
| Profiloptimierung (Coaching) | ❌ | Nichts | Komplett | — | Neubau |
| Prompt-Registry | ❌ | Prompts inline in Edge Functions | Versionierte Prompt-Templates, ohne Deploy änderbar | — | Neubau |
| Kosten-Tracking | ❌ | Nichts | Token/Kosten pro Kunde | — | Neubau |
| Realtime AI Training | ✅ | OpenAI WebRTC + Whisper+Gemini Objection Handler | — | 3/5 | Fortführen |

### D — Berater-Workflows

| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| Profiloptimierung | ❌ | Nichts | Sektions-basierte Optimierung, Ist/Vorschlag/Status/Freigabe | — | Neubau |
| Checklisten | ❌ | Nichts | Templates, Instanzen, Abhaken, interne Notizen, Fälligkeiten | — | Neubau |
| Kundensicht Fortschritt | ❌ | Nichts | Prozentbalken, erledigte Schritte, ohne interne Notizen | — | Neubau |
| Content-Pipeline | ❌ | Content-Calendar-Page existiert (UI), keine DB-Anbindung | Pipeline-Stages, Kalender, Content-Säulen | 1/5 | Neubau |
| Berater-Dashboard | 🟡 | `AdvisorDashboard.tsx` (Basic) | Kundenliste, Checklisten-Überblick, Workload | 2/5 | Refactoring |

### E — Kennzahlen

| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| Manuelle Erfassung | ✅ | `metrics_snapshot` Tabelle, KPITracking-Page | Erinnerungslogik bei fehlenden Einträgen | 4/5 | Fortführen |
| Dashboards | ✅ | Kunde/Admin Dashboards mit Recharts | Berater-Sicht auf eigene Kunden, Benchmarks pro Kunde | 3/5 | Fortführen |
| Zielwerte/Abweichung | 🟡 | `benchmarks` Tabelle existiert | UI zur Zielwert-Eingabe, Abweichungsanzeige | 3/5 | Fortführen |
| API-Sync | 🟡 | `sync-sheet`, `sync-all-tables`, `sync-contacts-external` | Quelle-Markierung pro Datenpunkt, kein stilles Überschreiben | 2/5 | Refactoring |

### F — Integrationen (API-Keys)

| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| Key-Verwaltung | 🟡 | `api_keys` Tabelle (hash-basiert), `account_integrations` | Envelope Encryption, Keys nie im Klartext im Log | 2/5 | Refactoring |
| Twilio | ✅ | Voll integriert (Voice SDK, Token, Webhooks) | — | 4/5 | Fortführen |
| SMTP | ✅ | Custom SMTP pro Account | — | 3/5 | Fortführen |
| HeyReach | ❌ | Nicht referenziert im Code | Komplett | — | Neubau |
| Sync-Jobs | 🟡 | Google Sheets Sync, External Supabase Sync | Zeitplan, Backoff, Fehler-Historie, Status-UI | 2/5 | Refactoring |
| Verbindungstest | ❌ | Nichts | Test beim Speichern, Statusanzeige | — | Neubau |

### G — Zufriedenheitsreports

| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| Umfrage-Templates | ❌ | Nichts | NPS + offene Fragen + Modulbewertungen | — | Neubau |
| CSAT-Erfassung | 🟡 | `csat_responses` Tabelle, `CSATPage` | Versand per E-Mail, Erinnerungen, Antwortquote | 2/5 | Refactoring |
| KI-Auswertung | ❌ | Nichts | Sentiment, Themen-Tags, Trendanalyse | — | Neubau |

### H — AI Concierge & Revenue Intelligence

| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| Gesundheitsstatus | ✅ | `health_scores` + `calculate-health` Edge Function | Begründung mit verlinkten Datenpunkten | 3/5 | Fortführen |
| Alerts | ✅ | `alerts` Tabelle (no_posts, low_leads, etc.) | UI-Integration, Push/E-Mail | 3/5 | Fortführen |
| AI Summaries | 🟡 | `ai_summaries` Tabelle + `generate-summary` | Portfolio-übergreifende Analyse, Upsell-Signale | 2/5 | Refactoring |
| Upsell-Signale | ❌ | Nichts | Erkennung, Aufhänger, Gegenanzeige | — | Neubau |
| Pitch-Nachrichten | ❌ | Nichts | Datenpunkt-basierte Gesprächsaufhänger | — | Neubau |

### I — Admin-Cockpit

| Aspekt | Status | Was existiert | Was fehlt | Qualität | Empfehlung |
|---|---|---|---|---|---|
| Kundenliste | 🟡 | `AdminDashboard.tsx` mit Liste | Health/Status/Berater/Paket Spalten | 2/5 | Refactoring |
| Beraterauslastung | ❌ | Nichts | Komplett | — | Neubau |
| Umsatzübersicht | 🟡 | `admin-stripe-stats` Edge Function | UI-Integration, Trends | 2/5 | Refactoring |
| Feature-Flags | 🟡 | `feature_access` Tabelle | Admin-UI zur Verwaltung | 2/5 | Fortführen |
| Prompt-Verwaltung | ❌ | Nichts | Komplett | — | Neubau |
| Systemlogs | ❌ | Nichts | Komplett | — | Neubau |

---

## Risiko- & Schuldenbericht

### P0 — Blockiert alles

1. **Keine RLS-Policies / Mandantentrennung nicht erzwungen.** Jeder authentifizierte User kann theoretisch über den Supabase Client auf alle Daten zugreifen. `account_id`/`tenant_id` Scope wird nur im Frontend geprüft, nicht serverseitig. → **IDOR-Risiko.**
2. **Keine Migrationsdateien.** Schema existiert nur in Prod-DB. Kein reproduzierbarer DB-Aufbau, kein Review von Schema-Änderungen, kein Rollback möglich.
3. **Zwei parallele Multi-Tenancy-Konzepte** (`account_id` für CRM, `tenant_id` für Consulting) ohne klare Beziehung. Muss vor jedem neuen Feature konsolidiert werden.

### P1 — Sicherheitsrelevant

4. **API-Keys in `account_integrations` möglicherweise im Klartext.** `smtp_password_encrypted` Name suggeriert Verschlüsselung, aber kein Encryption-Layer im Code sichtbar. Twilio-Credentials ebenfalls direkt in der Tabelle.
5. **Doppelter AuthProvider** — Race Conditions möglich, unklare Source of Truth für Auth-State.
6. **Prompts inline in Edge Functions** — Prompt Injection über Kundendaten nicht systematisch geschützt. Kein Trennung Instruktion/Daten.
7. **Login-Credentials in MIGRATION_STATUS.md committed** (felix@content-leads.de + Passwort im Klartext in Git-History).
8. **PitchFirst-Branding in E-Mail-Templates** — Kunden erhalten möglicherweise E-Mails mit falschem Brand.

### P2 — Architektur

9. **Kein Service-Layer** — alle Supabase-Calls direkt aus Components. Kein zentralisierter Fehler-/Loading-Handling.
10. **Kein AI-Service-Layer** — drei verschiedene AI-Integrationen (OpenAI, Anthropic, Gemini) ohne zentrale Abstraktion, kein Retry/Fallback, kein Cost-Tracking.
11. **Kein Test-Setup** — null Tests, null Coverage, null CI.
12. **~75 Page-Dateien, davon ~40 nicht erreichbar** (Outreach-Seiten gesperrt aber Code vorhanden) — Dead Code, erhöht Wartungsaufwand.
13. **SubscriptionContext ist ein Stub** (`tier: "pro"`, `isActive: true` hardcoded) — echte Stripe-Logik nur in `useSubscription` Hook.

### P3 — Kosmetisch / Tech Debt

14. **lovable-tagger als devDependency** — kann entfernt werden.
15. **README.md ist der Vite-Template-Default** — keine projektspezifische Dokumentation.
16. **Inconsistente Naming** — `CashflowDashboard` vs `FinancePage`, `TodayPage` vs `DailyChecklist`.
17. **Hardcoded deutsche Texte** verstreut in Components statt zentral gepflegt.
18. **Keine Responsive/Mobile Layouts** (lt. MIGRATION_STATUS.md offen).

---

## Empfehlung pro Modul

| Modul | Empfehlung | Begründung |
|---|---|---|
| A Fundament | **Refactoring (P0)** | Auth-Basis da, aber RLS/Audit/Tenant-Konsolidierung zwingend vor allem anderen |
| B Akademie | **Neubau** | Nur hardcoded UI, kein DB-Schema — Refactoring spart nichts |
| C KI-Bots | **Neubau + Teilübernahme** | AI-Chat und Realtime-Training übernehmen, Rest (ToV, Prompt-Registry, Bibliothek) neu |
| D Berater-Workflows | **Neubau** | Advisor-Dashboard als Shell übernehmen, alle Workflows komplett neu |
| E Kennzahlen | **Fortführen** | Solide Basis (metrics_snapshot, Dashboards), nur ergänzen |
| F Integrationen | **Refactoring** | Twilio/SMTP da, Encryption-Layer + HeyReach + Verbindungstest ergänzen |
| G Zufriedenheit | **Neubau** | Nur CSAT-Tabelle existiert, alles andere fehlt |
| H AI Concierge | **Refactoring + Ergänzung** | Health-Scores und Alerts da, Upsell/Pitch/Verlinkung fehlt |
| I Admin-Cockpit | **Refactoring** | Grundstruktur da, muss um Prompt-Verwaltung, Logs, Auslastung erweitert werden |
