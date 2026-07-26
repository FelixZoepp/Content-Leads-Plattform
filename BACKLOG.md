# BACKLOG.md — Content-Leads-Plattform

**Datum:** 2026-07-26
**Aufwandsschätzung:** XS (<1h), S (1-3h), M (3-8h), L (8-16h), XL (16h+)

---

## M0 — Fundament

```
[CL-001] DB-Schema-Dump und Migrationsdateien erstellen
Modul:        A-Fundament
Abhängigkeit: —
Umfang:       Supabase DB dump, initiale Migration erstellen, config.toml anlegen
Akzeptanz:    - supabase/migrations/0001_initial.sql existiert mit vollständigem Schema
              - supabase/config.toml konfiguriert
              - Schema reproduzierbar via supabase db reset
Aufwand:      M
```

```
[CL-002] Tenant-Modell konsolidieren (accounts + tenants → organisations)
Modul:        A-Fundament
Abhängigkeit: CL-001
Umfang:       Migration + Kompatibilitäts-Views + Edge Function Updates
Akzeptanz:    - `organisations` Tabelle mit allen Feldern aus accounts + tenants
              - org_id FK auf allen abhängigen Tabellen
              - Views `accounts` und `tenants` als Kompatibilitätsschicht
              - Bestehende Edge Functions und Frontend-Queries funktionieren weiterhin
Aufwand:      XL
```

```
[CL-003] RLS-Policies auf allen Tabellen
Modul:        A-Fundament
Abhängigkeit: CL-002
Umfang:       Migration: RLS enable + Policies für jede Tabelle
Akzeptanz:    - RLS auf allen Tabellen mit Nutzerdaten aktiviert
              - Admin: Zugriff auf eigene org
              - Berater: Zugriff nur auf zugewiesene Kunden (via advisor_assignments)
              - Kunde: Zugriff nur auf eigene Daten
              - Service-Role Key für Edge Functions bypassed RLS
Aufwand:      L
```

```
[CL-004] Audit-Log-System
Modul:        A-Fundament
Abhängigkeit: CL-002
Umfang:       Schema + Trigger + Edge Function Helper + Admin-UI
Akzeptanz:    - `audit_log` Tabelle: id, org_id, actor_id, action, resource_type, resource_id, old_value, new_value, ip_address, created_at
              - DB-Trigger auf kritische Tabellen (profiles, organisations, advisor_assignments)
              - Helper in _shared/audit.ts für Edge Functions
              - Admin kann Audit-Log einsehen (readonly, filtern nach User/Ressource/Zeitraum)
Aufwand:      L
```

```
[CL-005] AuthProvider konsolidieren + Rollen-System härten
Modul:        A-Fundament
Abhängigkeit: CL-002
Umfang:       contexts/AuthContext.tsx entfernen, useAuth.tsx als einzige Quelle, org_id statt account_id+tenant_id
Akzeptanz:    - Ein AuthProvider, eine Source of Truth
              - useAuth gibt zurück: user, session, role, orgId, isAdmin, isAdvisor, isCustomer
              - ProtectedRoute prüft Rolle, redirected korrekt
              - Keine Race Conditions bei Auth-State
Aufwand:      M
```

```
[CL-006] advisor_assignments Tabelle + Berater-Zuweisungs-UI
Modul:        A-Fundament
Abhängigkeit: CL-002, CL-003
Umfang:       Schema + Migration + Admin-UI + RLS
Akzeptanz:    - `advisor_assignments`: id, org_id, advisor_user_id, customer_account_id, assigned_at, assigned_by
              - Admin kann Berater Kunden zuweisen/entziehen
              - RLS-Policy: Berater sieht nur zugewiesene Kunden
Aufwand:      M
```

```
[CL-007] Impersonation für Admins
Modul:        A-Fundament
Abhängigkeit: CL-004, CL-005
Umfang:       Edge Function + Frontend-Indikator + Audit-Log-Eintrag
Akzeptanz:    - Admin kann "Als Kunde einloggen" klicken
              - Session wird mit Impersonation-Flag versehen
              - Alle Aktionen werden im Audit-Log mit "impersonated_by" markiert
              - Visueller Indikator (Banner) im UI
Aufwand:      M
```

```
[CL-008] Credentials im Git bereinigen + .env.example erstellen
Modul:        A-Fundament
Abhängigkeit: —
Umfang:       MIGRATION_STATUS.md bereinigen, .env.example erstellen, ENV_SETUP.md aktualisieren
Akzeptanz:    - Keine Passwörter/Credentials in committed Files
              - .env.example mit allen nötigen Variablen (ohne Werte)
              - README.md mit Setup-Anleitung
Aufwand:      S
```

```
[CL-009] lovable-tagger entfernen + PitchFirst-Branding in E-Mails fixen
Modul:        A-Fundament
Abhängigkeit: —
Umfang:       devDependency entfernen, vite.config.ts aufräumen, E-Mail-Templates rebranden
Akzeptanz:    - lovable-tagger aus package.json + vite.config.ts entfernt
              - Alle E-Mail-Templates zeigen "Content-Leads" statt "PitchFirst"
              - Brand-Farbe #C5A059 (Gold) beibehalten
Aufwand:      S
```

---

## M1 — Kunden-Self-Service

```
[CL-010] Akademie: DB-Schema (Kurse, Lektionen, Fortschritt)
Modul:        B-Akademie
Abhängigkeit: CL-002
Umfang:       Migration: courses, lessons, lesson_progress + RLS
Akzeptanz:    - Kurse: id, org_id, title, description, order, is_published, unlock_mode (sequential/berater/paket)
              - Lektionen: id, course_id, title, type (video/text/download/quiz), content_url, content_body, order, duration_minutes
              - Fortschritt: id, user_id, lesson_id, completed_at, score (für Quiz)
              - RLS: Kunde sieht nur freigeschaltete Kurse seiner Org
Aufwand:      M
```

```
[CL-011] Akademie: Kurs-Ansicht + Fortschritts-Tracking
Modul:        B-Akademie
Abhängigkeit: CL-010
Umfang:       UI: Kursübersicht, Lektions-Player, Fortschrittsbalken
Akzeptanz:    - Kursübersicht mit Karten (Titel, Beschreibung, Fortschritt %)
              - Lektionsansicht: Video-Embed, Text-Rendering, Download-Button
              - Fortschritt wird bei Abschluss in DB gespeichert
              - Sequenzielle Freischaltung wenn konfiguriert
Aufwand:      L
```

```
[CL-012] Akademie: Admin-CMS für Kurse/Lektionen
Modul:        B-Akademie
Abhängigkeit: CL-010
Umfang:       Admin-UI: CRUD für Kurse + Lektionen, Reihenfolge per Drag&Drop
Akzeptanz:    - Admin kann Kurse anlegen/bearbeiten/löschen/sortieren
              - Admin kann Lektionen hinzufügen (Video-URL, Text, Download)
              - Veröffentlichungs-Toggle pro Kurs
              - Freischaltungsmodus wählbar
Aufwand:      L
```

```
[CL-013] Tone-of-Voice-Profil: Schema + Interview-Bot
Modul:        C-KI-Bots
Abhängigkeit: CL-002, CL-015
Umfang:       Schema + Edge Function + Chat-UI
Akzeptanz:    - `tone_of_voice_profiles`: id, user_id, org_id, tonality, topics[], no_gos[], example_posts[], target_audience, communication_style, created_at, updated_at
              - Interview-Bot führt strukturiertes Gespräch (5-8 Fragen)
              - Ergebnis wird als ToV-Profil gespeichert
              - User kann Profil nachträglich bearbeiten
Aufwand:      L
```

```
[CL-014] Content-Bibliothek: Schema + UI
Modul:        C-KI-Bots
Abhängigkeit: CL-002
Umfang:       Schema + Bibliothek-UI mit Filter/Suche
Akzeptanz:    - `generated_content`: id, user_id, org_id, type (lead_post/content_post/sales_script/opening_script/profile_optimization), title, body, metadata, bot_session_id, created_at
              - Bibliothek mit Tabs nach Typ, Suche, Löschen
              - Jeder KI-Output hat "In Bibliothek speichern" Button
Aufwand:      M
```

```
[CL-015] Prompt-Registry + AI-Service-Layer
Modul:        C-KI-Bots
Abhängigkeit: CL-001
Umfang:       Schema + _shared/ai.ts + Admin-UI
Akzeptanz:    - `prompt_templates`: id, name, version, system_prompt, user_prompt_template, model, temperature, max_tokens, is_active, created_at, updated_at
              - `ai_usage_log`: id, org_id, user_id, prompt_template_id, model, input_tokens, output_tokens, cost_cents, created_at
              - _shared/ai.ts: loadPrompt(), callAI(), logUsage()
              - Admin kann Prompts bearbeiten ohne Deploy
Aufwand:      L
```

```
[CL-016] KI-Bots: Lead-Post + Content-Post Generator
Modul:        C-KI-Bots
Abhängigkeit: CL-013, CL-014, CL-015
Umfang:       Edge Functions + Chat-UI für beide Bot-Typen
Akzeptanz:    - Bot lädt automatisch ToV-Profil des Users
              - Lead-Post-Bot: generiert Hook-Varianten, CTA-Optionen
              - Content-Post-Bot: generiert basierend auf Thema/Content-Säule
              - Chat-Iteration möglich
              - Output in Bibliothek speicherbar
Aufwand:      L
```

```
[CL-017] KI-Bots: Sales-Skript + Opening-Skript Generator
Modul:        C-KI-Bots
Abhängigkeit: CL-015
Umfang:       Edge Functions + Chat-UI
Akzeptanz:    - Input: Zielgruppe, Angebot, Kanal
              - Output: 2-3 Skript-Varianten
              - In Bibliothek speicherbar
Aufwand:      M
```

```
[CL-018] KI-Bot: Profiloptimierung (Coaching-Modus)
Modul:        C-KI-Bots
Abhängigkeit: CL-013, CL-015
Umfang:       Edge Function + Chat-UI
Akzeptanz:    - User gibt LinkedIn-Profil-URL oder Text ein
              - Bot liefert strukturierte Optimierung nach Sektionen (Headline, About, Erfahrung, Featured)
              - Jede Sektion: Ist-Zustand + Vorschlag + Begründung
              - Output als ProfilOptimierung speicherbar
Aufwand:      M
```

---

## M2 — Berater-Workflows

```
[CL-019] Profiloptimierung als Dienstleistung: Schema + Berater-UI
Modul:        D-Berater-Workflows
Abhängigkeit: CL-006
Umfang:       Schema + Berater-Editor + Kunden-Ansicht
Akzeptanz:    - `profile_optimizations`: id, org_id, customer_account_id, advisor_user_id, status (draft/in_review/approved), created_at, updated_at
              - `profile_sections`: id, optimization_id, section_type (headline/about/experience/banner/featured), current_text, suggested_text, status (pending/approved/rejected), advisor_note, customer_note
              - Berater kann Sektionen bearbeiten, Vorschläge machen
              - Kunde sieht Vorschläge und kann freigeben/ablehnen
Aufwand:      L
```

```
[CL-020] Checklisten: Templates + Instanzen + Abhaken
Modul:        D-Berater-Workflows
Abhängigkeit: CL-006
Umfang:       Schema + Template-Editor + Instanz-UI + Kunden-Ansicht
Akzeptanz:    - `checklist_templates`: id, org_id, created_by, title, description
              - `checklist_template_items`: id, template_id, title, description, order, default_due_days
              - `checklist_instances`: id, template_id, customer_account_id, advisor_user_id, org_id, status (active/completed), created_at
              - `checklist_item_statuses`: id, instance_id, template_item_id, is_completed, completed_at, internal_note (berater-only), due_date
              - Berater: Template erstellen, auf Kunden anwenden, Items abhaken, interne Notizen
              - Kunde: sieht Fortschritt (%), erledigte Items, nächster Schritt — OHNE interne Notizen
Aufwand:      L
```

```
[CL-021] Kunden-Fortschrittsanzeige
Modul:        D-Berater-Workflows
Abhängigkeit: CL-019, CL-020
Umfang:       Dashboard-Widget + Detail-Seite
Akzeptanz:    - Kunden-Dashboard zeigt: Gesamtfortschritt (%), aktive Checklisten, Profiloptimierungs-Status
              - Detail: Timeline der erledigten Schritte
              - Nächster anstehender Schritt hervorgehoben
              - Keine internen Berater-Notizen sichtbar
Aufwand:      M
```

```
[CL-022] Content-Pipeline: Schema + Kalender + Kanban
Modul:        D-Berater-Workflows
Abhängigkeit: CL-006, CL-014
Umfang:       Schema + Kalender-UI + Kanban-Board
Akzeptanz:    - `content_plans`: id, org_id, customer_account_id, name, created_at
              - `content_items`: id, plan_id, org_id, customer_account_id, title, body, content_pillar, status (idea/draft/review/approved/scheduled/published), scheduled_date, published_url, created_by, assigned_to
              - Kalenderansicht mit Content-Items auf Zeitachse
              - Kanban-Board mit Drag&Drop zwischen Status-Spalten
              - Content-Säulen/Themen als Filter
Aufwand:      L
```

```
[CL-023] Berater-Dashboard erweitern
Modul:        D-Berater-Workflows
Abhängigkeit: CL-019, CL-020, CL-022
Umfang:       Advisor-Dashboard mit Kundenliste, Workload, Quick-Actions
Akzeptanz:    - Liste zugewiesener Kunden mit Status-Ampel
              - Pro Kunde: offene Checklisten-Items, nächste Fälligkeiten, Profiloptimierungs-Status
              - Quick-Actions: Checkliste anwenden, Content erstellen, Notiz hinzufügen
              - Workload-Übersicht: Items pro Berater
Aufwand:      M
```

---

## M3 — Daten & Kennzahlen

```
[CL-024] Kennzahl-Eingabe mit Erinnerungslogik
Modul:        E-Kennzahlen
Abhängigkeit: CL-002
Umfang:       metrics_snapshot erweitern + Erinnerungs-Edge-Function + UI
Akzeptanz:    - `metrics_snapshot.source` Spalte: manual/api_heyreach/api_sheet
              - Erinnerungs-Edge-Function: prüft wöchentlich ob Einträge fehlen, sendet E-Mail
              - UI: Banner "Kennzahlen für KW 30 noch nicht eingetragen"
              - API-Import überschreibt manuelle Einträge NICHT — zeigt Konflikt an
Aufwand:      M
```

```
[CL-025] Berater-Dashboard: Kennzahlen der eigenen Kunden
Modul:        E-Kennzahlen
Abhängigkeit: CL-006, CL-024
Umfang:       Berater-spezifische Kennzahlen-Ansicht
Akzeptanz:    - Berater sieht aggregierte KPIs seiner zugewiesenen Kunden
              - Vergleich: Kunde vs. Benchmark
              - Zielwerte pro Kunde setzbar (durch Admin oder Berater)
              - Abweichungsanzeige (grün/gelb/rot)
Aufwand:      M
```

```
[CL-026] HeyReach-Integration: Adapter + Sync
Modul:        F-Integrationen
Abhängigkeit: CL-002
Umfang:       Integration-Adapter + Credential-Verwaltung + Sync-Job
Akzeptanz:    - `integration_credentials`: id, org_id, provider (heyreach/smtp/twilio), credentials_encrypted (via Supabase Vault), status (connected/error/expired), last_tested_at
              - `sync_jobs`: id, org_id, credential_id, job_type, status (pending/running/success/error), last_run_at, next_run_at, error_message, retry_count
              - Verbindungstest beim Speichern
              - Sync importiert Outreach-KPIs in metrics_snapshot (source: api_heyreach)
              - Backoff bei Rate Limits
Aufwand:      L
```

```
[CL-027] Integration-Credentials: Envelope Encryption + maskierte Anzeige
Modul:        F-Integrationen
Abhängigkeit: CL-026
Umfang:       Supabase Vault Extension aktivieren + Migrationm + UI
Akzeptanz:    - Alle Credentials verschlüsselt in DB (Supabase Vault)
              - Frontend zeigt nur `****xyz` — nie den vollen Key
              - Edge Functions entschlüsseln nur zur Laufzeit
              - Keys nie in Logs oder Error-Messages
Aufwand:      M
```

---

## M4 — Intelligence

```
[CL-028] Zufriedenheitsumfragen: Schema + Versand + Erfassung
Modul:        G-Zufriedenheit
Abhängigkeit: CL-002
Umfang:       Schema + Edge Function + E-Mail-Versand + Antwort-UI
Akzeptanz:    - `surveys`: id, org_id, title, questions (jsonb), trigger_type (manual/days_after_onboarding), trigger_days, is_active
              - `survey_responses`: id, survey_id, user_id, org_id, answers (jsonb), nps_score, submitted_at
              - Admin erstellt Umfrage-Templates (NPS + offene Fragen)
              - Versand per E-Mail nach Trigger
              - Erinnerung nach 3 Tagen wenn nicht beantwortet
              - Antwortquote im Admin sichtbar
Aufwand:      L
```

```
[CL-029] Zufriedenheit: KI-Auswertung (Sentiment + Themen)
Modul:        G-Zufriedenheit
Abhängigkeit: CL-015, CL-028
Umfang:       Edge Function + AI-Analyse + Dashboard
Akzeptanz:    - Pro Antwort: Sentiment (positiv/neutral/negativ) + Themen-Tags
              - Aggregiert pro Kunde: Trend-Verlauf
              - Über alle Kunden: Top-Themen, NPS-Trend
              - Jede KI-Aussage verlinkt auf Quell-Antwort
Aufwand:      M
```

```
[CL-030] AI Concierge: Upsell-Signale + Bedarfserkennung
Modul:        H-AI-Concierge
Abhängigkeit: CL-015, CL-028, CL-024
Umfang:       Schema + Edge Function + Admin-Dashboard
Akzeptanz:    - `ai_insights`: id, org_id, customer_account_id, insight_type (health/need/upsell/churn_risk), title, body, confidence, source_refs (jsonb: [{table, id, field, value}]), created_at, reviewed_by, reviewed_at
              - `upsell_signals`: id, org_id, customer_account_id, insight_id, signal_type, recommended_offer, rationale, counter_indication, status (new/confirmed/dismissed), created_at
              - Edge Function analysiert wöchentlich: Umfragen + Kennzahlen + Akademie-Nutzung + Checklisten-Fortschritt
              - Jede Aussage mit verlinkten Datenpunkten (source_refs)
              - Admin sieht Signal-Liste, kann bestätigen/verwerfen
Aufwand:      XL
```

```
[CL-031] Pitch-Nachrichten-Generator
Modul:        H-AI-Concierge
Abhängigkeit: CL-030
Umfang:       Edge Function + UI
Akzeptanz:    - `pitch_templates`: id, org_id, upsell_signal_id, customer_account_id, message_text, channel (email/phone/linkedin), created_at
              - Basierend auf Upsell-Signal: generiert 2-3 Gesprächsaufhänger
              - Bezieht sich auf echte Datenpunkte des Kunden
              - Menschliche Bestätigung vor Versand
Aufwand:      M
```

---

## M5 — Härtung & Admin-Cockpit

```
[CL-032] Admin-Cockpit: Kundenliste mit Health/Status/Berater/Paket
Modul:        I-Admin-Cockpit
Abhängigkeit: CL-006, CL-030
Umfang:       Admin-Dashboard komplett überarbeiten
Akzeptanz:    - Tabellenansicht: Kunde, Berater, Paket, Health-Ampel, letzte Aktivität, offene Checklisten
              - Filtbar nach Berater, Health-Status, Paket
              - Sortierbar nach allen Spalten
              - Klick → Kunden-Detail mit allen Insights
Aufwand:      M
```

```
[CL-033] Admin-Cockpit: Beraterauslastung + Umsatzübersicht
Modul:        I-Admin-Cockpit
Abhängigkeit: CL-006, CL-032
Umfang:       Auslastungs-Widget + Umsatz-Dashboard
Akzeptanz:    - Pro Berater: Anzahl Kunden, offene Items, Workload-Score
              - Umsatzübersicht: MRR, Churn, Expansion Revenue
              - Trends über Zeit (Recharts)
Aufwand:      M
```

```
[CL-034] Admin-Cockpit: Prompt-Verwaltung
Modul:        I-Admin-Cockpit
Abhängigkeit: CL-015
Umfang:       UI für prompt_templates CRUD
Akzeptanz:    - Liste aller Prompts mit Name, Modell, letzte Änderung
              - Editor: System-Prompt + User-Prompt-Template + Parameter
              - Versionierung (alte Versionen einsehbar)
              - Test-Button: Prompt mit Beispiel-Input ausführen
Aufwand:      M
```

```
[CL-035] Admin-Cockpit: System-Logs + AI-Kosten
Modul:        I-Admin-Cockpit
Abhängigkeit: CL-004, CL-015
Umfang:       Log-Viewer + Kosten-Dashboard
Akzeptanz:    - Audit-Log durchsuchbar (User, Aktion, Zeitraum)
              - AI-Kosten: pro Kunde, pro Monat, pro Modell
              - Alerts bei ungewöhnlich hohem Verbrauch
Aufwand:      M
```

```
[CL-036] Security-Review + Prompt-Injection-Schutz
Modul:        M5-Härtung
Abhängigkeit: CL-015
Umfang:       Review aller AI-Aufrufe, Input-Sanitization
Akzeptanz:    - Alle Prompts: klare Trennung System/User/Daten-Kontext
              - Kundendaten in Prompts markiert (z.B. <user_data>...</user_data>)
              - DATA-FLOWS.md dokumentiert welche Daten an welches Modell gehen
              - Kein User-Input wird als Instruktion interpretiert
Aufwand:      M
```

```
[CL-037] Dead Code aufräumen + Build-Optimierung
Modul:        M5-Härtung
Abhängigkeit: —
Umfang:       Ungenutzte Outreach-Seiten entfernen oder lazy-loaden, Bundle-Size prüfen
Akzeptanz:    - Nicht erreichbare Pages aus dem Bundle entfernt (oder echtes Lazy-Loading)
              - SubscriptionContext-Stub entweder implementiert oder entfernt
              - Build-Warnings auf 0 reduziert
Aufwand:      M
```

```
[CL-038] Responsive Layout + Keyboard-Navigation
Modul:        M5-Härtung
Abhängigkeit: —
Umfang:       Mobile Breakpoints + Tab-Navigation + Focus-Management
Akzeptanz:    - Sidebar collapsed auf Mobile
              - Alle Formulare tastaturbedienbar
              - Focus-Visible Styles auf allen interaktiven Elementen
Aufwand:      L
```

```
[CL-039] README.md + Onboarding-Doku
Modul:        M5-Härtung
Abhängigkeit: CL-008
Umfang:       README rewrite, .env.example, lokale Dev-Anleitung
Akzeptanz:    - README: Projektbeschreibung, Stack, Setup (3 Schritte), Env-Variablen, Deployment
              - .env.example mit allen Variablen + Kommentaren
              - DATA-FLOWS.md: Welche Daten an welches KI-Modell
Aufwand:      S
```

---

## Meilenstein-Übersicht

| Meilenstein | Tickets | Gesamt-Aufwand |
|---|---|---|
| **M0 Fundament** | CL-001 bis CL-009 (9 Tickets) | ~XL (ca. 40-60h) |
| **M1 Kunden-Self-Service** | CL-010 bis CL-018 (9 Tickets) | ~XL (ca. 50-70h) |
| **M2 Berater-Workflows** | CL-019 bis CL-023 (5 Tickets) | ~L (ca. 30-45h) |
| **M3 Daten & Kennzahlen** | CL-024 bis CL-027 (4 Tickets) | ~L (ca. 20-35h) |
| **M4 Intelligence** | CL-028 bis CL-031 (4 Tickets) | ~XL (ca. 35-50h) |
| **M5 Härtung** | CL-032 bis CL-039 (8 Tickets) | ~L (ca. 30-45h) |
| **TOTAL** | **39 Tickets** | **~200-300h** |
