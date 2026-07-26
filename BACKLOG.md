# BACKLOG.md v3 — Content-Leads-Plattform

**Datum:** 2026-07-27
**Ticketnummern:** CL-101 bis CL-179 (CL-001–039 waren v1)
**Meilensteine:** M0–M7 gemäß PLAN.md v3

---

## Legende

| Aufwand | Bedeutung |
|---|---|
| XS | < 1 Stunde |
| S | 1–3 Stunden |
| M | 3–8 Stunden |
| L | 8–16 Stunden |
| XL | 16+ Stunden |

---

## M0 — Fundament (15 Tickets)

> Ziel: Produkt-/Entitlement-Modell, hasFeature()-Gate, dynamische Navigation, Einladungen v2, Consent-Gate für Recording, Audit-Log erweitern, kritische Bugs fixen. Alles andere baut auf M0 auf — kein Skip.

---

### [CL-101] Produkt-Modell Schema + Seeding

```
Modul:        C — Produkt- & Entitlement-Modell
Abhängigkeit: —
Umfang:       Schema + Migration + Seed-Daten
Akzeptanz:
  - Tabellen products, features, product_features existieren in DB
  - RLS: Admin CRUD, alle anderen READ auf aktive Einträge
  - Seed enthält 4 Produkte: Profiloptimierung, Content, Coaching, AI Hunter (status=draft)
  - Seed enthält alle Feature-Slugs aus PLAN.md Entitlement-Matrix (§3)
  - product_features verbindet Produkte mit ihren Features gemäß Matrix
  - Migration ist idempotent (IF NOT EXISTS)
Aufwand:      M
```

---

### [CL-102] CustomerProduct + FeatureOverride Schema

```
Modul:        C — Produkt- & Entitlement-Modell
Abhängigkeit: CL-101
Umfang:       Schema + Migration + RLS
Akzeptanz:
  - Tabellen customer_products und feature_overrides existieren in DB
  - customer_products hat Spalten: id, org_id, user_id FK, product_id FK,
    status ENUM(onboarding/active/paused/ended), tier, started_at, ended_at
  - feature_overrides hat Spalten: id, customer_product_id FK, feature_id FK,
    is_enabled BOOLEAN, reason TEXT, expires_at TIMESTAMPTZ
  - RLS: Admin CRUD; Berater READ eigene Kunden; Kunde READ eigener Eintrag
  - Unique Constraint auf (customer_product_id, feature_id) in feature_overrides
Aufwand:      S
```

---

### [CL-103] hasFeature() RPC — serverseitige Gate-Funktion

```
Modul:        C — Produkt- & Entitlement-Modell
Abhängigkeit: CL-101, CL-102
Umfang:       Supabase RPC (PL/pgSQL) + TypeScript-Wrapper
Akzeptanz:
  - RPC has_feature(p_user_id UUID, p_feature_slug TEXT) RETURNS BOOLEAN
  - Logik: 1. Prüfe feature_overrides (is_enabled, expires_at > now()) →
    Override schlägt Produkt-Zugehörigkeit
  - 2. Prüfe ob User ein aktives customer_products hat, dessen Produkt
    das Feature via product_features enthält
  - Gibt false zurück wenn kein aktiver Eintrag existiert
  - Edge Function / TypeScript Wrapper hasFeature(userId, featureSlug)
    ruft RPC auf und cached Ergebnis 60s in Memory
  - Unit-Test: Admin-User mit Override true sieht Feature trotz
    fehlendem Produkt-Eintrag
Aufwand:      M
```

---

### [CL-104] useFeatureAccess-Hook reparieren + migrieren

```
Modul:        C — Produkt- & Entitlement-Modell
Abhängigkeit: CL-103
Umfang:       Refactoring + Bugfix
Akzeptanz:
  - src/hooks/useFeatureAccess.tsx wird auf has_feature() RPC umgestellt
  - Entfernt: isStarterPlan, isProPlan, canUsePowerDialer,
    canUseObjectionLibrary, canUseLiveObjectionHandling (alle broken laut D1)
  - Bestehende FeatureGate-Wrapper-Aufrufe funktionieren unverändert
  - Keine Laufzeit-Fehler mehr in: SalesflowDashboard.tsx,
    ObjectionLibrary.tsx, EmailTemplates.tsx, PowerDialer.tsx,
    Upgrade.tsx, UpgradePrompt.tsx
  - Hardcoded Stripe Product-ID in useSubscription.tsx entfernt / kommentiert
Aufwand:      M
```

---

### [CL-105] Dynamische Navigation aus Feature-Menge

```
Modul:        C — Produkt- & Entitlement-Modell
Abhängigkeit: CL-103, CL-104
Umfang:       Frontend — Sidebar-Komponente
Akzeptanz:
  - Sidebar lädt via hasFeature() welche Feature-Slugs der aktuelle User hat
  - Nav-Einträge werden aus einer statischen Mapping-Tabelle
    (featureSlug → Route + Label + Icon) gerendert
  - Einträge ohne Feature werden ausgeblendet (nicht nur disabled)
  - Admin sieht immer alle Einträge unabhängig von Features
  - Loading-State zeigt Skeleton statt leere Sidebar
  - Mapping-Tabelle ist in einer Konfigurationsdatei (kein Hardcode im JSX)
Aufwand:      M
```

---

### [CL-106] Einladungen v2 — Token-Sicherheit + atomare Einlösung

```
Modul:        B — Einladungen & Zugang
Abhängigkeit: CL-101, CL-102
Umfang:       Schema + Edge Function Refactoring
Akzeptanz:
  - invitations-Tabelle bekommt neue Spalten:
    product_id FK (nullable), advisor_id FK (nullable),
    onboarding_track_id FK (nullable), status ENUM(pending/opened/
    registered/onboarding/completed/expired/revoked)
  - Edge Function invite-customer erzeugt Token via
    crypto.randomBytes(32).toString('hex') statt Magic Link
  - Atomare Einlösung: UPDATE invitations SET used_at=now(),
    status='registered' WHERE token=? AND used_at IS NULL
    (im gleichen DB-Statement, keine Race Condition)
  - Beim Einlösen: customer_products-Eintrag wird automatisch angelegt
    mit status='onboarding' wenn product_id gesetzt
  - Rate Limiting: max 10 Einladungen pro Admin pro Stunde
  - Anti-Enumeration: gleiche Antwort bei ungültigem und bereits
    genutztem Token (kein Timing-Unterschied)
Aufwand:      L
```

---

### [CL-107] Einladungen v2 — Status-Tracking + Erinnerungen

```
Modul:        B — Einladungen & Zugang
Abhängigkeit: CL-106
Umfang:       Schema + Cron-Job + Admin-UI Update
Akzeptanz:
  - Status-Lifecycle vollständig abgebildet: pending→opened→registered→
    onboarding→completed
  - opened_at wird gesetzt wenn Einladungslink geöffnet wird
    (Tracking-Pixel oder Landing Page Call)
  - Cron-Job läuft täglich: sendet Erinnerungsmail wenn
    status='pending' AND sent_at < now() - interval '3 days'
    AND reminder_count < 2
  - expires_at nach 14 Tagen (konfigurierbar per ENV)
  - Admin-UI InvitationsPage zeigt Status-Badge und "Erinnerung senden"
    Button pro Zeile
  - Expired-Einladungen werden in eigenem Tab angezeigt
Aufwand:      M
```

---

### [CL-108] Einladungen v2 — Bulk CSV Import

```
Modul:        B — Einladungen & Zugang
Abhängigkeit: CL-106
Umfang:       Frontend + Edge Function
Akzeptanz:
  - Admin kann CSV hochladen (Format: email, name, product_slug,
    advisor_email)
  - Vorschau-Tabelle zeigt erste 20 Zeilen vor Versand
  - Validierung: gültige E-Mail, bekanntes product_slug,
    bekannte advisor_email
  - Fehlerbericht nach Validierung: Zeile, Fehler, Vorschlag
  - Ungültige Zeilen werden hervorgehoben, gültige können separat
    versendet werden
  - Max 100 Einladungen pro Upload
  - Fortschrittsanzeige während Versand
Aufwand:      M
```

---

### [CL-109] Consent-Gate für Recordings — P0 Sicherheitslücke

```
Modul:        E — Recording-Pipeline → Dossier
Abhängigkeit: —
Umfang:       Frontend + Schema + Edge Function Refactoring
Akzeptanz:
  - recordings-Tabelle wird angelegt mit Spalten laut PLAN.md §2
    (inkl. consent_given_at, consent_text, status, deleted_at)
  - call_sessions bekommt consent_given BOOLEAN DEFAULT false
  - RealtimeAudio.ts / RealtimeChat.init() wird BLOCKIERT bis
    Consent-Gate bestätigt
  - Consent-UI: Modal mit Pflichttext, Checkbox "Ich stimme zu",
    Name des Gesprächspartners (Pflichtfeld)
  - consent_given_at + consent_text werden in recording-Zeile gespeichert
  - transcribe-audio Edge Function verweigert Ausführung wenn
    consent_given = false für das zugehörige recording
  - Lösch-Funktion: Kunde kann eigene Aufnahme löschen →
    storage_url wird gelöscht, status='deleted', deleted_at gesetzt,
    full_text in transcripts wird auf NULL gesetzt
  - KEIN Löschen ohne Consent-Gate-Prüfung möglich
Aufwand:      L
```

---

### [CL-110] Audit-Log erweitern — Trigger auf neue Tabellen

```
Modul:        A — Fundament
Abhängigkeit: CL-101, CL-102, CL-109
Umfang:       Schema + Trigger-Migrationen
Akzeptanz:
  - Audit-Trigger werden auf folgende neue Tabellen angewendet:
    products, features, product_features, customer_products,
    feature_overrides, recordings, dossiers
  - Bestehende 5 Trigger-Tabellen bleiben unverändert
  - Trigger protokolliert: table_name, operation (INSERT/UPDATE/DELETE),
    old_data (jsonb), new_data (jsonb), changed_by (auth.uid()),
    changed_at (now())
  - RLS auf audit_log: nur Admin kann READ
  - Test: DELETE auf recordings erzeugt Audit-Eintrag mit old_data
Aufwand:      S
```

---

### [CL-111] Impersonation — Zeitlimit + Auto-Logout

```
Modul:        A — Fundament
Abhängigkeit: —
Umfang:       Frontend (SessionStorage-basiert)
Akzeptanz:
  - Impersonation wird automatisch nach 4 Stunden beendet
  - Timer wird in SessionStorage gespeichert: impersonation_started_at
  - Countdown-Anzeige im Impersonation-Banner (z.B. "Noch 3:47:12")
  - 15 Minuten vor Ablauf: Warning-Toast
  - Bei Ablauf: automatischer Logout aus Impersonation, Rückkehr
    zu Admin-Session, Audit-Log-Eintrag
  - "Jetzt beenden"-Button bleibt erhalten
Aufwand:      S
```

---

### [CL-112] Metrics-Snapshot — source-Spalte + Laufzeit-Bug fixen

```
Modul:        L — Kennzahlen
Abhängigkeit: —
Umfang:       Schema-Migration + Frontend-Bugfix
Akzeptanz:
  - metrics_snapshot bekommt Spalte: source TEXT
    DEFAULT 'manual' CHECK (source IN ('manual','api_heyreach',
    'api_linkedin','derived'))
  - Migration ist nicht-breaking (DEFAULT verhindert NULL-Fehler
    auf bestehenden Zeilen)
  - AdvisorKPIPage.tsx:101 — source === "api_heyreach" funktioniert
    jetzt ohne undefined
  - Bestehende Einträge werden mit source='manual' befüllt
  - Unit-Test: Neuer Eintrag ohne explizite source hat source='manual'
Aufwand:      S
```

---

### [CL-113] SubscriptionContext — Stub entfernen

```
Modul:        C — Produkt- & Entitlement-Modell
Abhängigkeit: CL-102, CL-103
Umfang:       Frontend Refactoring
Akzeptanz:
  - SubscriptionContext liest customer_products statt hardcoded tier:'pro'
  - Liefert: activeProducts[], currentTier (abgeleitet aus Produkt-Daten),
    hasFeature(slug) Funktion als Shortcut
  - Hardcoded tier:'pro' aus SubscriptionContext entfernt
  - Alle bestehenden Konsumenten von SubscriptionContext funktionieren
    weiterhin (keine Breaking Changes in API)
  - Loading-State korrekt abgebildet (nicht mehr immer 'pro' während Load)
Aufwand:      M
```

---

### [CL-114] Passwort aus Git-History + Rotation

```
Modul:        A — Fundament
Abhängigkeit: —
Umfang:       DevOps + Dokumentation
Akzeptanz:
  - Passwort in MIGRATION_STATUS.md (laut REVIEW.md D-Befund P1)
    wird rotiert: neues Passwort in Supabase Vault gesetzt
  - MIGRATION_STATUS.md-Datei wird bereinigt (Passwort entfernt/
    durch Platzhalter ersetzt)
  - git filter-repo oder BFG wird NICHT auf öffentlichem Repo
    ausgeführt (zu riskant) — stattdessen Rotation dokumentiert
  - Sicherheitsnotiz in ASSUMPTIONS.md: "altes Passwort ist
    kompromittiert, rotiert am DATUM"
  - Prüfung: kein weiteres Klartext-Secret im Repository
    (grep auf .env, *.md, *.ts für typische Patterns)
Aufwand:      S
```

---

### [CL-115] M0-Integrations-Smoke-Test

```
Modul:        A — Fundament
Abhängigkeit: CL-101 bis CL-114
Umfang:       Manuelle Checkliste + automatisierter Smoke-Test
Akzeptanz:
  - Neuer Kunde wird über Einladungslink eingeladen
    (mit Produkt "Content")
  - Einladung landet in DB mit status='pending'
  - Kunde löst Link ein → customer_products mit status='onboarding'
    wird angelegt
  - hasFeature(userId, 'bot.contentpost') gibt true zurück
  - hasFeature(userId, 'akademie.kurse') gibt false zurück
  - Sidebar zeigt nur Content-Features, keine Coaching-Features
  - Consent-Gate blockiert Recording-Start bei neuem Kunden
  - Audit-Log enthält Einträge für customer_products INSERT
  - Impersonation-Timer startet und wird im Banner angezeigt
  - Alle oben genannten Schritte als Playwright-Test dokumentiert
    (nicht zwingend automated in M0, aber Schritte festgehalten)
Aufwand:      M
```

---

## M1 — Onboarding & Dossier (10 Tickets)

> Ziel: Tracks als Datenstruktur, Schritte mit Typen, Fortschritts-Tracking, Recording-Pipeline mit Consent, Transkription, Dossier mit Feldextraktion, Konfliktbericht, Vollständigkeits-Gate, Freigabe-Flow.

---

### [CL-116] Onboarding-Track Schema + Seeding

```
Modul:        D — Onboarding-Tracks
Abhängigkeit: CL-101, CL-106
Umfang:       Schema + Migration + Seed
Akzeptanz:
  - Tabellen onboarding_tracks und onboarding_steps gemäß PLAN.md §2
  - onboarding_tracks: id, product_id FK, name, steps_json,
    dedup_key (UNIQUE)
  - onboarding_steps: id, track_id FK, type ENUM(form/video/booking/
    recording/upload/approval/confirm), title, config_json, order,
    unlocks_features TEXT[]
  - Seed: Track "Onboarding Profiloptimierung" mit 5 Schritten:
    1. Briefing-Formular (form), 2. Intro-Video (video),
    3. Erstes Call Buchen (booking), 4. Aufnahme-Interview (recording),
    5. Dossier-Freigabe (approval)
  - Seed: Track "Onboarding Content" mit 4 Schritten analog
  - RLS: Admin CRUD, Berater READ, Kunde READ eigenen Track
Aufwand:      M
```

---

### [CL-117] Onboarding-Progress — Tracking + API

```
Modul:        D — Onboarding-Tracks
Abhängigkeit: CL-116, CL-106
Umfang:       Schema + Edge Function + RLS
Akzeptanz:
  - Tabelle onboarding_progress gemäß PLAN.md §2
    (id, user_id FK, step_id FK, status ENUM, data_json, completed_at)
  - Edge Function complete-onboarding-step(step_id, data_json):
    - Prüft ob step_id zur zugehörigen Track-Sequenz passt
    - Prüft ob Vorgänger-Schritt completed
    - Setzt status='completed', completed_at=now()
    - Wenn step.unlocks_features nicht leer: schreibt feature_overrides
      für den User (is_enabled=true)
  - Deduplizierung: zweiter complete()-Aufruf für gleichen Schritt
    ist idempotent (kein Fehler, kein Doppel-Eintrag)
  - RLS: Berater READ zugewiesene Kunden; Kunde RU eigener Fortschritt
Aufwand:      M
```

---

### [CL-118] Onboarding-UI — Step-Wizard Komponente

```
Modul:        D — Onboarding-Tracks
Abhängigkeit: CL-117
Umfang:       Frontend
Akzeptanz:
  - OnboardingWizard-Komponente rendert Schritte des aktiven Tracks
  - Jeder Step-Typ hat eigene Sub-Komponente:
    - form: Generisches JSON-Schema-Formular
    - video: Eingebetteter Video-Player (URL aus config_json)
    - booking: iFrame oder Link zu Calendly
    - recording: Startet Consent-Gate → Recording-Flow (CL-109)
    - upload: Datei-Upload zu Supabase Storage
    - approval: Warteansicht "Warte auf Freigabe durch Berater"
    - confirm: Checkbox + Bestätigungstext
  - Fortschrittsleiste zeigt abgeschlossene/aktuelle/ausstehende Steps
  - Gesperrte Schritte (Vorgänger nicht completed) sind visuell gesperrt
  - Neuer Kunde landet nach Einladungseinlösung automatisch im Wizard
Aufwand:      L
```

---

### [CL-119] Recording-Pipeline — Aufnahme + Whisper-Transkription

```
Modul:        E — Recording-Pipeline → Dossier
Abhängigkeit: CL-109
Umfang:       Schema + Edge Function
Akzeptanz:
  - recordings-Tabelle vollständig befüllt (CL-109 legt Schema an)
  - transcripts-Tabelle gemäß PLAN.md §2:
    id, recording_id FK, full_text, speakers_json (Sprechertrennung),
    model TEXT, created_at
  - Edge Function transcribe-recording(recording_id):
    - Prüft consent_given_at IS NOT NULL
    - Lädt Audio aus Storage
    - Sendet an Whisper mit diarization-Prompt für Sprechertrennung
    - Speichert Ergebnis in transcripts
    - Setzt recording.status='done'
  - Bei Fehler: recording.status='processing_failed', Retry max 3x
  - Nach Transkription: Event trigger_dossier_extraction wird gefeuert
    (als DB-Notification oder direkter Edge Function Call)
Aufwand:      L
```

---

### [CL-120] Dossier — Schema + Basis-CRUD

```
Modul:        E — Recording-Pipeline → Dossier
Abhängigkeit: CL-119
Umfang:       Schema + Migration + RLS + Edge Function
Akzeptanz:
  - Tabellen dossiers und dossier_fields gemäß PLAN.md §2
  - dossiers: id, user_id FK, org_id, version INT, completeness_score FLOAT,
    approved_by FK, approved_at, status ENUM(draft/approved)
  - dossier_fields: id, dossier_id FK, field_key TEXT, value_text TEXT,
    source ENUM(form/transcript/manual), source_ref TEXT,
    confidence FLOAT, conflict_with TEXT (FK auf anderen dossier_field.id)
  - RLS: Admin CRUD; Berater RU zugewiesene Kunden + Freigabe-Aktion;
    Kunde READ eigenes Dossier
  - Edge Function get-or-create-dossier(user_id): Erstellt leeres
    Draft-Dossier v1 wenn keins existiert
  - UNIQUE auf (user_id, version) in dossiers
Aufwand:      M
```

---

### [CL-121] Dossier — Extraktion aus Transkript

```
Modul:        E — Recording-Pipeline → Dossier
Abhängigkeit: CL-120, CL-119
Umfang:       Edge Function
Akzeptanz:
  - Edge Function extract-dossier-fields(transcript_id):
    - Lädt full_text aus transcripts
    - Sendet an Claude mit strukturiertem Extraktions-Prompt
    - Prompt fordert JSON-Array von {field_key, value_text, confidence}
    - Bekannte field_keys: icp_rolle, icp_branche, icp_schmerz,
      ergebnis, usp, bestes_ergebnis, erfahrung_jahre,
      persoenliche_story, mechanismus, zeitversprechen,
      skalierungsmodell (alle aus REVIEW.md D8)
    - Schreibt dossier_fields mit source='transcript',
      source_ref=transcript_id
    - Konflikterkennung: Wenn field_key bereits existiert mit anderem
      value_text → setzt conflict_with auf ID des alten Feldes
    - Berechnet completeness_score: (ausgefüllte Pflichtfelder /
      Gesamt-Pflichtfelder) * 100
Aufwand:      L
```

---

### [CL-122] Dossier — Vollständigkeits-Gate + Konflikt-Bericht

```
Modul:        E — Recording-Pipeline → Dossier
Abhängigkeit: CL-121
Umfang:       Frontend + Edge Function
Akzeptanz:
  - DossierPage für Berater: zeigt alle dossier_fields gruppiert
    nach Kategorie (ICP, Ergebnis, Story, etc.)
  - Felder mit conflict_with werden in Rot hervorgehoben;
    Berater kann einen der beiden Werte bestätigen (Konflikt auflösen)
  - Vollständigkeitsanzeige: Balken + Prozentzahl
  - Fehlende Pflichtfelder werden als leere Zeilen mit
    "Nicht erfasst"-Label angezeigt
  - Berater kann einzelne Felder manuell editieren
    (source='manual' wird gesetzt)
  - Edge Function dossier-completeness-gate(user_id):
    gibt {passed: boolean, missing_fields: string[],
    unresolved_conflicts: number} zurück
  - Freigabe-Button ist disabled wenn passed=false
Aufwand:      M
```

---

### [CL-123] Dossier — Freigabe-Flow + Benachrichtigung

```
Modul:        E — Recording-Pipeline → Dossier
Abhängigkeit: CL-122
Umfang:       Frontend + Edge Function + Email
Akzeptanz:
  - Edge Function approve-dossier(dossier_id):
    - Prüft completeness-gate (muss passed=true)
    - Setzt dossiers.status='approved', approved_by, approved_at
    - Erstellt neue Version (version+1) als Kopie für zukünftige Änderungen
  - Berater-UI zeigt "Zur Freigabe" Button wenn gate passed und
    status='draft'
  - Nach Freigabe: Email an Admin + Benachrichtigung in UI
    ("Dossier für [Kundenname] wurde freigegeben")
  - Approved Dossier ist unveränderlich — neue Änderungen erstellen
    automatisch neuen Draft
  - Onboarding-Step type='approval' wird completed wenn
    dossiers.status='approved' für den User
Aufwand:      M
```

---

### [CL-124] Dossier — Bootstrapping für bestehende Kunden

```
Modul:        E — Recording-Pipeline → Dossier
Abhängigkeit: CL-120
Umfang:       Edge Function (Einmal-Migration)
Akzeptanz:
  - Edge Function bootstrap-dossier-from-tov(user_id):
    - Liest tone_of_voice_profiles für den User
    - Liest tenants-Felder die Dossier-Felder entsprechen
      (icp_rolle, icp_branche, etc. aus REVIEW.md D8)
    - Liest profile_optimizations für den User
    - Erstellt dossier_fields mit source='form',
      confidence=0.7 (niedriger als Transkript-Extraktion)
    - Berechnet initialen completeness_score
  - Admin-UI zeigt Button "V0-Dossier erstellen" pro bestehenden Kunden
    ohne Dossier
  - Bulk-Variante: bootstraps alle User ohne Dossier auf einmal
  - Erstelltes Dossier hat status='draft' (Berater muss prüfen)
Aufwand:      M
```

---

### [CL-125] M1-Integrations-Smoke-Test

```
Modul:        D/E — Onboarding & Dossier
Abhängigkeit: CL-116 bis CL-124
Umfang:       Manuelle Checkliste
Akzeptanz:
  - Neuer Kunde durchläuft vollständigen Onboarding-Track:
    Formular ausfüllen → Video ansehen → Recording mit Consent
    durchführen → Dossier-Extraktion abwarten → Berater gibt Dossier frei
  - Nach Freigabe: customer_products.status wechselt auf 'active'
  - hasFeature() für unlocks_features aus dem approval-Step gibt true zurück
  - Bestehender Kunde: bootstrap-dossier läuft durch ohne Fehler
  - completeness_score > 0 nach Bootstrap
  - Audit-Log enthält Dossier-Freigabe-Eintrag
Aufwand:      S
```

---

## M2 — Self-Service (5 Tickets)

> Ziel: Akademie und KI-Bots an das neue Entitlement-System anbinden, Anti-Wiederholung für Content-Generator implementieren.

---

### [CL-126] Akademie — Feature-basierte Freischaltung

```
Modul:        F — Akademie
Abhängigkeit: CL-103
Umfang:       Frontend + Schema + Edge Function
Akzeptanz:
  - lessons bekommt Spalte: required_feature TEXT (nullable)
  - Bestehendes is_published bleibt erhalten (AND-Verknüpfung)
  - Akademie-UI zeigt Lektionen nur wenn:
    lesson.is_published = true UND
    (lesson.required_feature IS NULL ODER
     hasFeature(userId, lesson.required_feature) = true)
  - Gesperrte Lektionen werden mit Schloss-Icon angezeigt +
    Hinweis welches Produkt benötigt wird
  - Admin-CMS bekommt Dropdown "Benötigt Feature" im Lektions-Editor
  - Bestehende Lektionen ohne required_feature bleiben für alle sichtbar
Aufwand:      S
```

---

### [CL-127] KI-Bots — Feature-Gate pro Bot-Typ

```
Modul:        G — KI-Bots
Abhängigkeit: CL-103, CL-104
Umfang:       Frontend Refactoring
Akzeptanz:
  - BotChat.tsx prüft vor Start des jeweiligen Bot-Typs per hasFeature():
    - ToV-Bot: bot.tov
    - Lead-Post-Bot: bot.leadpost
    - Content-Post-Bot: bot.contentpost
    - Sales-Script-Bot: bot.salesscript
    - Profil-Coach-Bot: bot.profilecoach
  - Nicht freigeschaltete Bot-Typen sind ausgeblendet oder
    zeigen "Nicht in deinem Paket enthalten"
  - Kein Feature-Check-Call bei jedem Klick — gecachte hasFeature-
    Ergebnisse aus SubscriptionContext (CL-113) nutzen
  - Bestehendes Bot-Framework wird nicht umgebaut
Aufwand:      S
```

---

### [CL-128] KI-Bots — Anti-Wiederholung für Content-Generator

```
Modul:        G — KI-Bots
Abhängigkeit: —
Umfang:       Edge Function Refactoring
Akzeptanz:
  - generate-content Edge Function (oder äquivalente Funktion) lädt
    die letzten 10 generierten Posts des Users aus generated_content
  - Letzte Posts werden als Negativkontext in den System-Prompt eingebaut:
    "Bereits verwendete Hooks/Themen (NICHT wiederholen): ..."
  - Negativkontext wird aus den ersten 200 Zeichen je Post gebaut
  - Konfigurierbar per ENV: ANTI_REPETITION_WINDOW (default: 10)
  - Gilt separat pro content-Typ (lead_post, content_post getrennt)
  - Test: Zwei aufeinanderfolgende Generierungen mit gleichem Input
    produzieren unterschiedliche Hooks
Aufwand:      M
```

---

### [CL-129] KI-Bots — Token-Kosten pro Kunde erfassen

```
Modul:        G — KI-Bots
Abhängigkeit: CL-102
Umfang:       Edge Function + Schema
Akzeptanz:
  - ai_usage_log bekommt Spalte customer_product_id FK (nullable)
  - Alle AI-Edge-Functions (generate-content, generate-asset, etc.)
    schreiben customer_product_id in ai_usage_log wenn user_id
    einem aktiven customer_products zugeordnet werden kann
  - Kosten werden in cost_cents gespeichert (Anthropic/OpenAI Pricing)
  - Aggregations-View: ai_cost_per_customer(month) VIEW liefert
    SUM(cost_cents) GROUP BY customer_product_id, month
  - Wird in M6 (CL-168) im Admin-Cockpit dargestellt
  - Keine UI in M2, nur Daten-Infrastruktur
Aufwand:      S
```

---

### [CL-130] Profiloptimierung — Dossier-Integration

```
Modul:        G — KI-Bots, H — Berater-Workflows
Abhängigkeit: CL-120, CL-123
Umfang:       Frontend + Edge Function Refactoring
Akzeptanz:
  - ProfileOptimizerPage und generate-profile-section Edge Function
    laden Kontext aus dossiers statt aus tenants.*
  - Wenn approved Dossier existiert: Dossier-Felder werden als
    Kontext bevorzugt (kein Fallback || 'k.A.' mehr)
  - Wenn kein approved Dossier: Fallback auf tenants.* (altes Verhalten)
  - Anzeige im ProfileOptimizer: "Basiert auf Dossier v{version}
    vom {datum}" wenn Dossier genutzt wird
  - Zeichenlimits-Hardcode in ProfileOptimizerPage.tsx bleiben
    vorerst (werden in M3 durch Format-Registry ersetzt)
Aufwand:      M
```

---

## M3 — Fulfillment (15 Tickets)

> Ziel: Format-Registry, Brand-Tokens, Templates, 3-Schicht Render-Engine (LLM → Bild → Compositing), Higgsfield-Adapter, Deliverable Sets, 1-Klick-Fulfillment, Review-Queue, Content Factory Cron, Chat-Revision.

---

### [CL-131] Format-Registry — Schema + Seeding

```
Modul:        J — Format-Registry, Asset-Bibliothek & Render-Engine
Abhängigkeit: —
Umfang:       Schema + Migration + Seed
Akzeptanz:
  - Tabelle format_registry gemäß PLAN.md §2
  - Seed enthält LinkedIn-Formate:
    - banner (1584×396px, safe_zone_json mit 80px Rand)
    - profilfoto (400×400px)
    - beitrag_bild (1200×627px)
    - karussell_slide (1080×1080px)
    - story (1080×1920px)
  - Jedes Format hat text_limits_json mit LinkedIn-Zeichenlimits
    (Headline 220, About 2600, Featured 300, etc.)
  - verified_at gesetzt auf Seeding-Datum
  - Admin-UI-Link aus O-Modul-Bereich (wird in M6 ausgebaut)
  - Hardcodierte Limits in ProfileOptimizerPage.tsx werden durch
    Verweis auf Format-Registry ersetzt (schreibt in DB, liest aus DB)
Aufwand:      M
```

---

### [CL-132] Brand-Tokens — Schema + Eingabe-UI

```
Modul:        J — Format-Registry, Asset-Bibliothek & Render-Engine
Abhängigkeit: CL-101, CL-102
Umfang:       Schema + Frontend
Akzeptanz:
  - Tabelle brand_tokens gemäß PLAN.md §2
    (id, user_id FK, org_id, colors_json, fonts_json, logo_url,
     image_style TEXT, claim TEXT, version INT)
  - BrandTokensPage für Berater: Eingabe von Primärfarbe, Akzentfarbe,
    Hintergrundfarbe (Color Picker), Font-Auswahl (Freitext),
    Logo-Upload (Supabase Storage), Bildstil-Dropdown, Claim-Text
  - Speichern erstellt neue Version (version+1) statt Überschreiben
  - Aktuelle Version wird per View/Flag angezeigt
  - RLS: Berater CRUD für zugewiesene Kunden; Kunde READ eigene
  - Test: Zweimaliges Speichern erzeugt version=1 und version=2
Aufwand:      M
```

---

### [CL-133] Templates — Schema + Admin-CMS

```
Modul:        J — Format-Registry, Asset-Bibliothek & Render-Engine
Abhängigkeit: CL-131
Umfang:       Schema + Frontend (Admin)
Akzeptanz:
  - Tabelle templates gemäß PLAN.md §2
    (id, format_id FK, slug, name, html_svg TEXT, variables_schema JSONB,
     category TEXT)
  - Admin-CMS: Liste aller Templates mit Format-Badge und Kategorie-Filter
  - Neu-Anlegen: Format auswählen, HTML/SVG einfügen, Variablen-Schema
    definieren (JSON-Editor), Kategorie wählen
  - Variablen-Schema definiert welche Platzhalter im HTML/SVG
    substituiert werden (z.B. {{headline}}, {{background_image_url}},
    {{primary_color}})
  - Vorschau-Button: rendert Template mit Dummy-Variablen im Browser
  - Seed: mindestens 2 Starter-Templates pro Format aus dem Seed (CL-131)
Aufwand:      L
```

---

### [CL-134] Render-Engine — HTML/SVG Compositing (Schicht 3)

```
Modul:        J — Format-Registry, Asset-Bibliothek & Render-Engine
Abhängigkeit: CL-131, CL-132, CL-133
Umfang:       Edge Function
Akzeptanz:
  - Edge Function render-asset(template_id, variables_json,
    brand_token_id, output_format):
    - Lädt template.html_svg
    - Substituiert alle {{variable}}-Platzhalter mit variables_json-Werten
    - Fügt brand_tokens.colors_json als CSS Custom Properties ein
    - Rendert HTML zu PNG via Puppeteer (Supabase Edge hat kein Puppeteer
      → nutze externe Render-API: htmlcsstoimage.com ODER
      Vercel OG-Image-API als Fallback)
    - Lädt Ergebnis in Supabase Storage hoch
    - Gibt storage_url zurück
  - Fallback wenn Render-API nicht erreichbar: gibt SVG als Text zurück
  - Kostenerfassung: render_cost_cents in assets gespeichert
  - Test: render-asset mit bekanntem Template produziert PNG > 0 Bytes
Aufwand:      XL
```

---

### [CL-135] Higgsfield-Adapter — API Integration + Job-Polling

```
Modul:        Q — Integrationen
Abhängigkeit: —
Umfang:       Edge Function + Schema
Akzeptanz:
  - Edge Function higgsfield-generate-image(prompt, style_preset,
    aspect_ratio, customer_product_id):
    - Sendet Request an Higgsfield API (HIGGSFIELD_API_KEY aus Vault)
    - Speichert external_job_id und status='queued' in fulfillment_jobs
  - Edge Function higgsfield-poll-job(job_id):
    - Pollt Higgsfield Job-Status
    - Bei done: lädt Bild herunter, speichert in Storage,
      setzt fulfillment_jobs.status='done', result_json.storage_url
    - Bei failed: setzt status='failed', speichert error
    - Retry-Logik: max 3 Versuche mit Exponential Backoff
  - Fallback: wenn HIGGSFIELD_API_KEY nicht gesetzt →
    nutze Bibliotheks-Hintergrund (statisches Bild aus Storage)
  - Kosten: cost_cents wird aus Higgsfield-Response gespeichert
Aufwand:      L
```

---

### [CL-136] Deliverable Sets — Schema + Admin-CMS

```
Modul:        K — 1-Klick-Fulfillment
Abhängigkeit: CL-131, CL-133
Umfang:       Schema + Frontend (Admin)
Akzeptanz:
  - Tabellen deliverable_sets und deliverable_set_items gemäß PLAN.md §2
  - deliverable_set_items: id, set_id FK, output_type TEXT,
    format_id FK, template_category TEXT, variant_count INT DEFAULT 1,
    config_json JSONB, order INT
  - Admin-CMS: Deliverable Sets anlegen, Items hinzufügen
    (Format wählen, Template-Kategorie, Varianten-Anzahl)
  - Seed: Set "Content Paket Monat" mit Items:
    - 4 Beitrags-Bilder (karussell_slide)
    - 2 Story-Grafiken (story)
    - 1 Banner-Update (banner)
  - RLS: Admin CRUD; Berater READ
  - Verknüpfung mit products-Tabelle (CL-101) über product_id FK
    in deliverable_sets
Aufwand:      M
```

---

### [CL-137] Assets — Schema + Storage-Konfiguration

```
Modul:        K — 1-Klick-Fulfillment
Abhängigkeit: CL-131, CL-132, CL-134
Umfang:       Schema + Migration + Storage-Bucket
Akzeptanz:
  - Tabelle assets gemäß PLAN.md §2
  - Supabase Storage Bucket "assets" wird angelegt (private,
    kein öffentlicher Zugang)
  - RLS auf assets: Admin READ alle; Berater READ zugewiesene Kunden;
    Kunde READ eigene
  - assets.status ENUM(draft/approved/published)
  - assets speichert: brand_token_version, prompt_version,
    dossier_version (für Reproduzierbarkeit)
  - Unique Index auf (user_id, job_id) zur Idempotenz
  - Signed URLs für Storage werden serverseitig generiert
    (kein öffentlicher Bucket-Zugang)
Aufwand:      M
```

---

### [CL-138] Fulfillment Orders + Jobs — Schema + Queue-Infrastruktur

```
Modul:        K — 1-Klick-Fulfillment
Abhängigkeit: CL-136, CL-137
Umfang:       Schema + Edge Function
Akzeptanz:
  - Tabellen fulfillment_orders und fulfillment_jobs gemäß PLAN.md §2
  - fulfillment_orders: idempotency_key UNIQUE —
    zweiter Aufruf mit gleichem Key gibt bestehende Order zurück
  - Edge Function create-fulfillment-order(deliverable_set_id,
    user_id, idempotency_key):
    - Erstellt fulfillment_orders-Eintrag
    - Erstellt einen fulfillment_jobs-Eintrag pro deliverable_set_item
    - Gibt order_id zurück
  - Edge Function process-fulfillment-job(job_id):
    - Routing per job.provider:
      - 'higgsfield': ruft CL-135 auf
      - 'render': ruft CL-134 auf
      - 'llm': ruft generate-content auf
    - Setzt job.status, attempts, started_at/completed_at
  - Retry: wenn job.status='failed' AND attempts < max_attempts →
    setzt status='queued' zurück
Aufwand:      L
```

---

### [CL-139] 1-Klick-Fulfillment — Berater-UI

```
Modul:        K — 1-Klick-Fulfillment
Abhängigkeit: CL-138
Umfang:       Frontend
Akzeptanz:
  - FulfillmentPage für Berater: zeigt aktive Kunden mit
    Produkt-Badge und "Monatliches Paket erstellen"-Button
  - Button löst create-fulfillment-order aus
  - Fortschrittsanzeige: Liste der fulfillment_jobs mit
    Status-Badge (queued/running/done/failed) und Refresh-Button
  - Fehlgeschlagene Jobs zeigen error-Text und "Neu starten"-Button
  - Abgeschlossene Order: Link zu Review-Queue (CL-140)
  - hasFeature(userId, 'content.1click') Gate:
    Button nur sichtbar wenn Feature aktiv
Aufwand:      M
```

---

### [CL-140] Review-Queue — Entwürfe prüfen + freigeben

```
Modul:        K — 1-Klick-Fulfillment
Abhängigkeit: CL-137, CL-138
Umfang:       Frontend
Akzeptanz:
  - ReviewQueuePage für Berater: listet alle assets mit
    status='draft' für zugewiesene Kunden
  - Jedes Asset: Vorschau (Signed URL), Metadaten-Badge
    (Format, Template, Dossier-Version)
  - Aktionen pro Asset: "Freigeben" (→ status='approved'),
    "Ablehnen mit Kommentar", "Chat-Revision starten" (→ CL-142)
  - Sammelfreigabe: Alle auswählen + "Alle freigeben"
  - Filter: nach Kunde, Format, Status
  - Freigegebene Assets erscheinen in Kundenbereich mit Download-Button
Aufwand:      M
```

---

### [CL-141] Content Factory Cron — Wöchentliche Batch-Generierung

```
Modul:        I — Content Factory
Abhängigkeit: CL-138, CL-120, CL-123
Umfang:       Edge Function + pg_cron
Akzeptanz:
  - Edge Function weekly-content-factory():
    - Lädt alle customer_products mit status='active' und
      Feature content.1click freigeschaltet
    - Für jeden Kunden: prüft ob approved Dossier existiert
      (skip wenn nicht)
    - Erstellt fulfillment_order mit idempotency_key=
      'weekly-{user_id}-{year}-{week_number}'
      (Idempotenz verhindert Doppelgenerierung)
    - Generiert Anti-Wiederholungs-Kontext aus letzten Posts (CL-128)
  - pg_cron-Job: läuft jeden Montag 06:00 UTC
  - Berater-Benachrichtigung per Email wenn Order für ihre Kunden
    abgeschlossen ist
  - Fehler-Toleranz: ein failed Kunde stoppt nicht andere Kunden
  - Admin-Dashboard zeigt letzten Cron-Lauf und Erfolgsquote
Aufwand:      L
```

---

### [CL-142] Chat-Revision an Entwürfen

```
Modul:        I — Content Factory
Abhängigkeit: CL-140, CL-120
Umfang:       Frontend + Edge Function
Akzeptanz:
  - RevisionChatPage: Chatfenster mit Preview des Assets links,
    Chat rechts
  - System-Prompt für Revision-Chat enthält aktuelles Asset-HTML/SVG
    als Kontext
  - Nachrichten des Beraters werden an Claude gesendet;
    Antwort ist überarbeitetes HTML/SVG
  - Jede Revision erstellt neues Asset mit status='draft' und
    Referenz auf parent_asset_id
  - "Diese Version übernehmen"-Button setzt überarbeitetes Asset
    als neue aktive Draft-Version
  - Rollback: Liste aller Revisionen mit Timestamp + Vorschau +
    "Wiederherstellen"-Button
  - hasFeature-Gate: nur Berater und Admin können Revisionen starten
Aufwand:      L
```

---

### [CL-143] Perspective-Adapter — Funnel-Briefing Generator

```
Modul:        Q — Integrationen
Abhängigkeit: CL-120
Umfang:       Edge Function + Frontend
Akzeptanz:
  - Edge Function generate-funnel-briefing(user_id):
    - Lädt approved Dossier für User
    - Sendet an Claude mit Prompt: "Erstelle ein Funnel-Briefing
      für Perspective basierend auf diesem Dossier"
    - Output: strukturiertes Briefing (Headline, Subheadline,
      3 Bullet Points, CTA-Text, Zielgruppe)
    - Speichert Output als generated_content mit type='funnel_briefing'
  - FunnelBriefingPage: zeigt generiertes Briefing + Kopieren-Button +
    "Öffne in Perspective"-Hinweis (manueller Schritt, kein API)
  - feature.funnel.briefing-Gate
  - Hinweistext: "Dieses Briefing in Perspective manuell einfügen"
    (da Perspective keine API hat laut PLAN.md §8)
Aufwand:      M
```

---

### [CL-144] HeyReach-Adapter — API + Sync-Job

```
Modul:        Q — Integrationen
Abhängigkeit: CL-112
Umfang:       Edge Function + Schema
Akzeptanz:
  - Edge Function sync-heyreach-metrics(user_id):
    - Liest HEYREACH_API_KEY aus Supabase Vault per
      integration_credentials (user_id + provider='heyreach')
    - Ruft HeyReach API auf: Connection Requests sent,
      accepted, replies
    - Schreibt in metrics_snapshot mit source='api_heyreach'
    - Konflikterkennung: wenn manueller Eintrag am gleichen Tag
      existiert → schreibt zusätzlich, markiert als Konflikt
  - Admin-UI für Credential-Eingabe: HeyReach API Key pro Kunde
  - Sync-Button in AdvisorKPIPage für manuelle Auslösung
  - Täglicher pg_cron-Job: sync für alle User mit
    eingetragenem HeyReach-Credential
  - Fehler: schreibt in sync_jobs.status='failed' + error
Aufwand:      L
```

---

### [CL-145] M3-Integrations-Smoke-Test

```
Modul:        I/J/K — Content Factory, Assets, Fulfillment
Abhängigkeit: CL-131 bis CL-144
Umfang:       Manuelle Checkliste
Akzeptanz:
  - Berater erstellt Brand-Tokens für einen Testkunden
  - 1-Klick-Fulfillment-Order wird erstellt
  - Mindestens 1 Job wechselt zu status='done'
  - Erzeugtes Asset ist in Review-Queue sichtbar
  - Asset wird freigegeben; Kunde sieht Asset in eigenem Bereich
  - Wöchentlicher Cron kann manuell getriggert werden
    (ENV: FORCE_WEEKLY_FACTORY=true)
  - Chat-Revision erstellt neue Asset-Version ohne alten Draft zu löschen
  - HeyReach-Sync schreibt Testdaten in metrics_snapshot
    mit source='api_heyreach'
Aufwand:      S
```

---

## M4 — Kennzahlen (8 Tickets)

> Ziel: Metrik-Registry, daily_metrics, tagesgenaue mobile Eingabe (<30s), Erinnerungen, Nulltag-Tracking, HeyReach-Adapter (in M3 CL-144), Dashboards v2.

---

### [CL-146] Metrik-Registry — Schema + Seeding

```
Modul:        L — Kennzahlen
Abhängigkeit: CL-101
Umfang:       Schema + Migration + Seed
Akzeptanz:
  - Tabelle metric_definitions gemäß PLAN.md §2
  - Seed enthält Standard-Metriken:
    - connection_requests_sent (counter, daily, Profiloptimierung + Content)
    - connection_requests_accepted (counter, daily)
    - replies_received (counter, daily)
    - calls_conducted (counter, daily, Coaching)
    - profile_views (counter, daily)
    - post_impressions (counter, daily, Content)
    - post_engagements (counter, daily, Content)
    - new_leads_generated (counter, daily)
  - Jede Metrik hat product_ids[] gesetzt gemäß Entitlement-Matrix
  - is_mandatory=true für Kern-KPIs (connection_requests_sent,
    replies_received, calls_conducted)
  - Admin-UI-Link (wird in M6 ausgebaut)
Aufwand:      M
```

---

### [CL-147] daily_metrics — Schema + Migration

```
Modul:        L — Kennzahlen
Abhängigkeit: CL-146
Umfang:       Schema + Migration + RLS
Akzeptanz:
  - Tabelle daily_metrics gemäß PLAN.md §2
    (id, user_id FK, org_id, metric_slug TEXT, date DATE,
     value NUMERIC, source TEXT, is_zero_day BOOLEAN DEFAULT false,
     created_at)
  - UNIQUE Constraint auf (user_id, metric_slug, date)
  - Bestehende metrics_snapshot-Daten werden NICHT migriert
    (kein Breaking Change; alte Tabelle bleibt für historische Daten)
  - RLS: Admin READ alle; Berater READ zugewiesene Kunden;
    Kunde CRU eigene
  - Nulltag-Logik: wenn User für einen Tag keinen Wert eingibt →
    Cron schreibt is_zero_day=true mit value=0 am nächsten Tag
  - View daily_metrics_with_targets: JOIN mit metric_targets
    für Zielwert-Vergleich
Aufwand:      M
```

---

### [CL-148] Metrik-Zielwerte — Schema + Eingabe

```
Modul:        L — Kennzahlen
Abhängigkeit: CL-147
Umfang:       Schema + Frontend
Akzeptanz:
  - Tabelle metric_targets gemäß PLAN.md §2
    (id, user_id FK, metric_slug, target_value NUMERIC,
     period_type TEXT DEFAULT 'daily')
  - UNIQUE auf (user_id, metric_slug, period_type)
  - MetricTargetsPage für Berater: tabellarische Ansicht aller
    Metriken des Kunden mit aktuellem Zielwert + Eingabe-Feld
  - Berater kann Zielwert pro Metrik setzen
  - Änderungshistorie: alte Zielwerte werden nicht überschrieben
    sondern mit ended_at versioniert (neue Spalte ended_at TIMESTAMPTZ)
Aufwand:      S
```

---

### [CL-149] Tageseingabe-UI — Mobile-First, < 30 Sekunden

```
Modul:        L — Kennzahlen
Abhängigkeit: CL-147, CL-148
Umfang:       Frontend
Akzeptanz:
  - DailyInputPage: zeigt nur is_mandatory-Metriken des Kunden
    basierend auf product_ids[] Zugehörigkeit
  - Layout: eine Metrik pro Zeile, großer Zahlen-Input,
    kein Scrollen nötig bei <= 5 Metriken
  - "Heute erfassen"-Shortcut auf Kunden-Dashboard (Primär-CTA)
  - Datum: immer heute (kein Kalender notwendig)
  - Speichern: ein "Speichern"-Button für alle Felder zusammen
  - Bei bereits gespeicherten Werten: vorausgefüllte Felder
    (Update statt Insert)
  - "Heute alles 0"-Button: setzt alle Metriken auf 0 mit
    is_zero_day=true (für Urlaubstage / Krankheitstage)
  - Mobile-Viewport getestet auf 390px Breite
  - Zeit-Ziel: < 30s für Eingabe aller Pflicht-Metriken
Aufwand:      M
```

---

### [CL-150] Erinnerungen — Email für fehlende Tageseingaben

```
Modul:        L — Kennzahlen
Abhängigkeit: CL-147
Umfang:       Edge Function + pg_cron
Akzeptanz:
  - Edge Function check-missing-daily-metrics():
    - Läuft täglich um 18:00 UTC per pg_cron
    - Findet alle User mit aktiven customer_products die
      is_mandatory-Metriken für heute noch nicht eingegeben haben
    - Sendet Email: "Deine Kennzahlen für heute fehlen noch"
      mit direktem Link zur DailyInputPage
  - User kann Erinnerungszeit in Profil einstellen
    (default 18:00, Options: 16:00/17:00/18:00/19:00/20:00)
  - Erinnerung wird NICHT gesendet wenn is_zero_day=true bereits
    für heute gesetzt ist
  - Max 1 Erinnerung pro Tag pro User
Aufwand:      M
```

---

### [CL-151] Dashboards v2 — Tagesauflösung + Bench-Vergleich

```
Modul:        L — Kennzahlen
Abhängigkeit: CL-147, CL-148, CL-146
Umfang:       Frontend
Akzeptanz:
  - KPIDashboardPage (Kunde) zeigt:
    - Letzte 7 Tage als Linien-Chart pro Metrik
    - Tages-Trend vs. Vortag (+/- in %)
    - Zielwert-Linie im Chart
    - Nulltage in Rot hervorgehoben
  - AdvisorKPIDashboard (Berater) zeigt:
    - Gleiche Charts für zugewiesene Kunden
    - Tabellen-Ansicht mit Compliance-Score:
      (Tage mit Eintrag / Gesamttage) * 100%
    - Benchmark: Durchschnitt aller aktiven Kunden als graue Linie
  - Bestehende Recharts-Komponenten werden wiederverwendet
  - metrics_snapshot Daten bleiben im Tab "Historisch" erhalten
    (keine Datenverluste)
Aufwand:      L
```

---

### [CL-152] Nulltag-Cron + Compliance-Score

```
Modul:        L — Kennzahlen
Abhängigkeit: CL-147
Umfang:       Edge Function + pg_cron
Akzeptanz:
  - Edge Function backfill-zero-days():
    - Läuft täglich um 02:00 UTC
    - Für alle User mit aktiven customer_products:
      Findet Tage der letzten 7 Tage ohne Eintrag für
      is_mandatory-Metriken
      Schreibt is_zero_day=true, value=0, source='auto'
      (KEIN Überschreiben wenn bereits manuell eingetragen)
  - Compliance-Score-View: compliance_7d(user_id) =
    COUNT(days with manual entry in last 7) / 7 * 100
  - Compliance wird auf Berater-Dashboard als Progress-Ring angezeigt
Aufwand:      S
```

---

### [CL-153] M4-Integrations-Smoke-Test

```
Modul:        L — Kennzahlen
Abhängigkeit: CL-146 bis CL-152
Umfang:       Manuelle Checkliste
Akzeptanz:
  - Metrik-Eintrag über DailyInputPage gespeichert in < 30s
  - Linien-Chart zeigt Eintrag sofort nach Reload
  - Nulltag-Cron schreibt Eintrag für gestrigen Tag
  - Erinnerungs-Email kommt an wenn kein Tageseintrag vorhanden
  - HeyReach-Sync (CL-144) schreibt source='api_heyreach' sichtbar
    im Dashboard
  - Compliance-Score berechnet korrekt nach 7 Tagen mit 3 fehlenden
Aufwand:      S
```

---

## M5 — Feedback & Intelligence (8 Tickets)

> Ziel: Umfragen v2 (Versand-System, Token-Link, Frequenz-Sperre, Anonymität), Sofort-Alarm, AI Concierge v2 mit allen Signal-Quellen.

---

### [CL-154] Umfragen v2 — survey_sends Schema + Versand-System

```
Modul:        M — Zufriedenheitsreports
Abhängigkeit: CL-106
Umfang:       Schema + Edge Function
Akzeptanz:
  - Tabelle survey_sends gemäß PLAN.md §2
    (id, survey_id FK, user_id FK, token TEXT UNIQUE,
     status ENUM(sent/opened/completed/expired),
     sent_at, opened_at, completed_at, reminder_count)
  - Token: crypto.randomBytes(32).toString('hex') — keine UUIDs
    (Anti-Enumeration)
  - Edge Function send-survey(survey_id, user_id):
    - Erstellt survey_sends-Eintrag
    - Sendet Email mit Token-Link: /survey/{token}
    - Prüft Frequenz-Sperre: kein Versand wenn bereits completed
      survey in den letzten 30 Tagen
  - Token-Link-Page (/survey/:token):
    - Setzt status='opened' bei erstem Aufruf
    - Zeigt Umfrage ohne Login-Pflicht
    - Setzt status='completed' nach Absenden
Aufwand:      L
```

---

### [CL-155] Umfragen v2 — Frequenz-Sperre + Anonymitäts-Konzept

```
Modul:        M — Zufriedenheitsreports
Abhängigkeit: CL-154
Umfang:       Edge Function + Schema
Akzeptanz:
  - Frequenz-Sperre: pro User max 1 Survey pro 30 Tage
    (konfigurierbar per ENV: SURVEY_FREQUENCY_DAYS)
  - Surveys können als anonym markiert werden:
    surveys.is_anonymous BOOLEAN DEFAULT false
  - Bei is_anonymous=true: survey_sends enthält keine user_id
    in der Email-Antwort; Token kann nur zu Survey-ID zurückverfolgt
    werden, nicht zum User (pseudonym)
  - Berater sieht bei anonymen Umfragen aggregierte Ergebnisse,
    keine individuellen
  - Opt-out: User kann sich von Survey-Emails abmelden
    (surveys_optout-Tabelle: user_id, opted_out_at)
  - send-survey prüft surveys_optout vor Versand
Aufwand:      M
```

---

### [CL-156] Umfragen v2 — Sofort-Alarm bei kritischen Antworten

```
Modul:        M — Zufriedenheitsreports
Abhängigkeit: CL-154
Umfang:       Edge Function
Akzeptanz:
  - survey_questions bekommt Spalte:
    alert_threshold NUMERIC (nullable) —
    Wert unterhalb dem ein Alarm ausgelöst wird
  - Edge Function check-survey-alert(survey_response_entry_id):
    - Läuft nach jedem survey_response_entries INSERT (Trigger)
    - Wenn Antwort-Wert < alert_threshold:
      Sendet Email an Admin + zugewiesenen Berater
      "Kritische Umfrageantwort: [Kunde] hat [Wert] auf [Frage]
      gegeben"
    - Erstellt ai_insights-Eintrag mit type='survey_alert'
  - Admin-Dashboard: "Offene Alarme" Widget zeigt ungelöste Alerts
  - "Gelöst markieren"-Button setzt Alert-Status auf resolved
Aufwand:      M
```

---

### [CL-157] AI Concierge v2 — Signal-Quellen erweitern

```
Modul:        N — AI Concierge & Revenue Intelligence
Abhängigkeit: CL-147, CL-154, CL-120
Umfang:       Edge Function Refactoring
Akzeptanz:
  - Edge Function generate-ai-insight(user_id) wird erweitert um
    folgende Signalquellen:
    1. Kennzahlen-Compliance-Score (aus M4)
    2. daily_metrics Trend (letzte 14 Tage vs. vorherige 14 Tage)
    3. Dossier-Vollständigkeit (aus M1)
    4. Offene Survey-Alarme (aus CL-156)
    5. Onboarding-Fortschritt (aus M1)
    6. Bestehende Signalquellen: health_score, content_items,
       lesson_progress (bleiben erhalten)
  - System-Prompt integriert alle 6 Quellen als strukturierten Kontext
  - AI Insight enthält source_refs für alle genutzten Signale
    (nachvollziehbar welche Daten die Empfehlung begründen)
  - Automatische Generierung: neue Insights werden täglich um 07:00 UTC
    per pg_cron generiert (eine Insight-Generierung pro User pro Tag)
Aufwand:      L
```

---

### [CL-158] Upsell-Signale — Produktbezug

```
Modul:        N — AI Concierge & Revenue Intelligence
Abhängigkeit: CL-101, CL-102, CL-157
Umfang:       Edge Function + Frontend
Akzeptanz:
  - upsell_signals bekommt Spalte: recommended_product_id FK
    (referenziert products.id)
  - Edge Function generate-upsell-signal(user_id) prüft:
    - Welche Produkte der User noch NICHT hat
    - Ob Signal-Muster auf fehlendes Produkt hindeuten
      (z.B. hohe Kennzahlen → Content-Paket empfehlen)
  - PitchGeneratorPage zeigt Upsell-Empfehlung mit:
    - Empfohlenes Produkt (Name + Beschreibung)
    - Begründung aus AI Insight
    - "Pitchen"-Button der Berater zur Termin-Buchung weiterleitet
  - Bestehende PitchGenerator-UI wird um Produkt-Badge erweitert
Aufwand:      M
```

---

### [CL-159] Health-Score — Kennzahlen-Compliance als Signal

```
Modul:        N — AI Concierge & Revenue Intelligence
Abhängigkeit: CL-152, CL-147
Umfang:       Edge Function Refactoring
Akzeptanz:
  - calculate-health Edge Function wird erweitert um:
    - Kennzahlen-Compliance (7-Tage-Score aus CL-152) als Faktor
    - Nulltag-Anteil (negativer Faktor)
    - Dossier-Status (approved = positiver Faktor, kein Dossier = Abzug)
  - Gewichtung dokumentiert in Edge Function Kommentar:
    Compliance: 20%, Metriken-Trend: 20%, rest bestehend
  - Health-Score-Badges auf Berater-Dashboard werden mit neuem
    Signal-Tooltip erweitert ("basiert auf: Kennzahlen 20%, ...")
  - Keine UI-Änderungen an bestehender Health-Score-Anzeige
Aufwand:      M
```

---

### [CL-160] Umfragen v2 — Aggregierte Trends + Admin-Auswertung

```
Modul:        M — Zufriedenheitsreports
Abhängigkeit: CL-154, CL-155
Umfang:       Frontend
Akzeptanz:
  - SurveyManagerPage bekommt Tab "Trends":
    - Linien-Chart: Durchschnitt aller Antworten pro Frage über Zeit
    - Dropdown: Filter nach Berater (nur eigene Kunden)
    - NPS-Score (falls Frage mit is_nps=true existiert)
  - Berater-Ansicht: aggregierte Antworten ohne Namen bei
    is_anonymous=true Surveys
  - Admin-Ansicht: alle individuellen Antworten sichtbar
  - "KI-Analyse starten"-Button (bestehend) ruft jetzt echte
    Edge Function auf statt Stub — analysiert Trends und
    schreibt ai_insights mit type='survey_analysis'
Aufwand:      M
```

---

### [CL-161] M5-Integrations-Smoke-Test

```
Modul:        M/N — Feedback & Intelligence
Abhängigkeit: CL-154 bis CL-160
Umfang:       Manuelle Checkliste
Akzeptanz:
  - Survey-Email mit Token-Link wird versendet und angeklickt
  - Survey-Antwort wird ohne Login abgesendet (Token-basiert)
  - Kritische Antwort (unter Schwellwert) löst Email-Alarm aus
  - AI Concierge zeigt Insight mit source_refs für mindestens
    3 Signalquellen
  - Upsell-Signal enthält recommended_product_id
  - Health-Score ändert sich wenn Compliance-Score sich ändert
  - Frequenz-Sperre: zweiter Survey-Versand innerhalb 30 Tage
    schlägt fehl mit erklärendem Fehler
Aufwand:      S
```

---

## M6 — Admin & Betrieb (10 Tickets)

> Ziel: Admin-Cockpit v2 (alle Registries editierbar), Job-Monitor, Kosten-Dashboard pro Kunde, Feature-Flags.

---

### [CL-162] Admin-Cockpit v2 — Metrik-Registry UI

```
Modul:        O — Admin-Cockpit
Abhängigkeit: CL-146
Umfang:       Frontend (Admin)
Akzeptanz:
  - AdminPage bekommt Tab "Metrik-Registry"
  - Tabelle aller metric_definitions mit: slug, label, unit,
    type, is_mandatory Badge, product_ids Chips
  - Neu-Anlegen: Formular mit allen Feldern aus Schema
  - Bearbeiten: Inline-Edit für label, is_mandatory
  - Löschen: nur wenn keine daily_metrics-Einträge existieren
    (Schutz vor Datenverlust)
  - is_derived-Metriken zeigen formula-Feld im Edit-Formular
Aufwand:      M
```

---

### [CL-163] Admin-Cockpit v2 — Format-Registry + Deliverable Sets UI

```
Modul:        O — Admin-Cockpit
Abhängigkeit: CL-131, CL-136
Umfang:       Frontend (Admin)
Akzeptanz:
  - Admin-Tab "Format-Registry": Liste + Edit + Neu-Anlegen
    aller format_registry-Einträge
  - Admin-Tab "Deliverable Sets": Liste aller Sets + Items
  - Set-Editor: Items per Drag-and-Drop sortieren
  - Format-Preview: zeigt Dimensionen als visuelles Rechteck
  - Neues Format anlegen: Felder width_px, height_px,
    aspect_ratio, safe_zone_json (JSON-Editor), text_limits_json
  - verified_at wird manuell gesetzt (Checkbox "Als verifiziert markieren")
Aufwand:      M
```

---

### [CL-164] Admin-Cockpit v2 — Onboarding-Tracks UI

```
Modul:        O — Admin-Cockpit
Abhängigkeit: CL-116
Umfang:       Frontend (Admin)
Akzeptanz:
  - Admin-Tab "Onboarding-Tracks": Liste aller Tracks mit Produkt-Badge
  - Track-Editor: Schritte per Drag-and-Drop sortieren
  - Schritt anlegen: Typ auswählen, config_json editieren,
    unlocks_features als Tag-Input
  - Schritt-Typen haben kontextsensitive Felder:
    - video: URL-Feld
    - booking: Calendly-Link-Feld
    - form: Fragen-Schema-Editor
    - recording: Consent-Text-Feld
  - Vorschau: zeigt wie der Wizard für Kunden aussehen würde
Aufwand:      L
```

---

### [CL-165] Admin-Cockpit v2 — Produkt + Feature Registry UI

```
Modul:        O — Admin-Cockpit
Abhängigkeit: CL-101, CL-102
Umfang:       Frontend (Admin)
Akzeptanz:
  - Admin-Tab "Produkte": Karten-Ansicht aller products
    mit status-Badge (active/draft/archived)
  - Produkt-Editor: Name, Beschreibung, Status; Feature-Zuordnung
    als Checkbox-Matrix
  - Admin-Tab "Features": Tabelle aller features mit category-Filter
  - Feature anlegen: slug (readonly nach Anlegen), name,
    description, category
  - CustomerProducts-Ansicht: pro Produkt Liste aller Kunden
    mit Status-Badge
  - Feature-Override anlegen per Button "Override hinzufügen"
    direkt in der Kundenzeile
Aufwand:      L
```

---

### [CL-166] Job-Monitor — Queue-Ansicht + manueller Neustart

```
Modul:        O — Admin-Cockpit
Abhängigkeit: CL-138
Umfang:       Frontend (Admin)
Akzeptanz:
  - Admin-Tab "Jobs": Tabelle aller fulfillment_jobs der letzten 7 Tage
  - Spalten: job_id, order_id, Kunde, provider, status, attempts,
    error (truncated), started_at, completed_at, cost_cents
  - Filter: nach status, provider, Kunde
  - "Neu starten"-Button für failed Jobs (setzt status='queued',
    attempts=0 zurück)
  - "Abbrechen"-Button für queued/running Jobs
  - Aggregat-Widget: Anzahl Queued / Running / Done / Failed heute
  - Auto-Refresh alle 30 Sekunden wenn Running-Jobs vorhanden
Aufwand:      M
```

---

### [CL-167] Job-Monitor — Cron-Übersicht

```
Modul:        O — Admin-Cockpit
Abhängigkeit: CL-141, CL-150, CL-152
Umfang:       Frontend (Admin)
Akzeptanz:
  - Admin-Tab "Crons": Tabelle aller pg_cron-Jobs
    mit Name, Schedule (Cron-Ausdruck), letzter Lauf, Status
  - "Jetzt ausführen"-Button für manuelle Auslösung
    (ruft Edge Function direkt auf)
  - Letzter Fehler wird angezeigt wenn vorhanden
  - Crons die in Liste aufgeführt werden:
    - weekly-content-factory (montags 06:00)
    - check-missing-daily-metrics (täglich 18:00)
    - backfill-zero-days (täglich 02:00)
    - generate-ai-insights (täglich 07:00)
Aufwand:      M
```

---

### [CL-168] Kosten-Dashboard — AI-Kosten pro Kunde + Monat

```
Modul:        O — Admin-Cockpit
Abhängigkeit: CL-129
Umfang:       Frontend (Admin)
Akzeptanz:
  - Admin-Tab "Kosten": Tabelle mit customer_product_id,
    Kundenname, Monat, Summe AI-Kosten in €
  - Chart: Balken-Diagramm AI-Kosten pro Kunde (Top 10) im aktuellen Monat
  - Chart: Linien-Diagramm Gesamtkosten letzte 6 Monate
  - Kosten aus: ai_usage_log (LLM) + fulfillment_jobs.cost_cents
    (Higgsfield/Render) aggregiert per View
  - Limit-Funktion: Admin kann monatliches Kostenlimit pro
    customer_product setzen → Alert wenn 80% erreicht
  - Limit-Spalte: customer_products.monthly_cost_limit_cents (neue Spalte)
Aufwand:      L
```

---

### [CL-169] Feature-Flags — Admin-UI für FeatureOverrides

```
Modul:        O — Admin-Cockpit
Abhängigkeit: CL-102, CL-103
Umfang:       Frontend (Admin)
Akzeptanz:
  - Admin-Tab "Feature Flags": Liste aller feature_overrides
    mit Kunde, Feature-Slug, is_enabled, reason, expires_at
  - Neu hinzufügen: Kunde auswählen, Feature auswählen,
    is_enabled toggle, Begründung (Pflicht), optionales Ablaufdatum
  - Bestehende Overrides bearbeiten + löschen
  - "Temporärer Override" Shortcut: setzt expires_at auf +30 Tage
  - Expired Overrides werden automatisch ausgegraut (kein Delete)
  - Test-Mode: Admin kann hasFeature() für beliebigen User testen
    ("Feature-Checker"-Tool im Tab: User auswählen, Slug eingeben,
     Ergebnis + Begründung anzeigen)
Aufwand:      M
```

---

### [CL-170] Admin-Cockpit v2 — Kundenübersicht mit Produktfilter

```
Modul:        O — Admin-Cockpit
Abhängigkeit: CL-101, CL-102, CL-165
Umfang:       Frontend (Admin)
Akzeptanz:
  - Bestehende AdminDashboard-Kundenübersicht bekommt Produktfilter-Dropdown
  - Filter nach: Produkt, Status (onboarding/active/paused/ended),
    Berater
  - Jede Kundenzeile zeigt: Produkt-Badge, Status-Badge,
    Onboarding-Fortschritt (%), Dossier-Status, Health-Score
  - "Impersonieren"-Button direkt in Kundenzeile
  - Spalte "Nächste Aktion" (AI-generiert aus Insights) als Tooltip
  - Export-Button: CSV mit allen Kunden + Metadaten
Aufwand:      M
```

---

### [CL-171] M6-Integrations-Smoke-Test

```
Modul:        O — Admin-Cockpit
Abhängigkeit: CL-162 bis CL-170
Umfang:       Manuelle Checkliste
Akzeptanz:
  - Neue Metrik über Admin-UI angelegt erscheint sofort in
    DailyInputPage des Kunden
  - Feature-Override für Testkunde gesetzt → hasFeature() gibt true
  - Job-Monitor zeigt failed Job + Neustart funktioniert
  - Kosten-Dashboard zeigt Aggregat für letzten Monat
  - Cron-Monitor: "Jetzt ausführen" löst Edge Function aus
    ohne Fehler
  - Produktfilter in Kundenübersicht filtert korrekt
Aufwand:      S
```

---

## M7 — Härtung (8 Tickets)

> Ziel: Security-Review, Responsive-Pflege, Dead Code Cleanup, Test-Suite, CI/CD, Pflicht-Dokumente (CONSENT.md, FORMATS.md, AUTOMATION.md).

---

### [CL-172] Security-Review — RLS-Vollständigkeitsprüfung

```
Modul:        A — Fundament
Abhängigkeit: Alle M0–M6 Tickets
Umfang:       Audit + Migration
Akzeptanz:
  - Alle Tabellen aus PLAN.md §2 (26 neue Tabellen) haben RLS aktiviert
  - Alle 90 bestehenden Tabellen geprüft: RLS aktiviert oder
    begründete Ausnahme dokumentiert (z.B. öffentliche Lookup-Tabellen)
  - Kein org_id-Leak: eine SELECT-Query als User-A darf keine
    Daten von User-B zurückgeben
  - Rate Limiting auf Auth-Endpoints (Supabase Projekteinstellungen)
    dokumentiert und konfiguriert
  - Vault-Credentials: alle API-Keys in Vault, kein Klartext in ENV
    für Produktionsdaten
  - Ergebnis: SECURITY_AUDIT.md mit Befund-Tabelle und Status
Aufwand:      L
```

---

### [CL-173] Responsive — Mobile-Pflege aller neuen Seiten

```
Modul:        Alle
Abhängigkeit: M0–M6 abgeschlossen
Umfang:       Frontend
Akzeptanz:
  - Alle in M0–M6 neu erstellten Seiten sind auf 390px (iPhone 15)
    und 768px (iPad) korrekt nutzbar
  - Keine horizontalen Scrollbars
  - Tabellen mit > 5 Spalten haben horizontal-scroll oder
    collapsed Mobile-View
  - DailyInputPage (CL-149) wurde bereits mobil-first gebaut —
    als Referenz für alle anderen Seiten
  - Automated Check: Playwright Screenshot-Tests auf 390px und
    1440px für die 10 meistgenutzten Seiten
Aufwand:      M
```

---

### [CL-174] Dead Code — Outreach-Modul entrümpeln

```
Modul:        A — Fundament
Abhängigkeit: —
Umfang:       Refactoring
Akzeptanz:
  - Inventar aller ~40 gesperrten Outreach-Seiten dokumentiert
  - Einigung mit Felix: welche Seiten dauerhaft entfernt werden
  - Entfernte Seiten: aus Router entfernt, aus Bundle ausgeschlossen
  - Verbleibende Outreach-Seiten: bleiben hinter Feature-Gate
    'outreach.*'
  - Bundle-Size vor/nach: Messung und Dokumentation
    (Ziel: > 15% Bundle-Reduktion)
  - Keine Laufzeit-Fehler nach Cleanup
  - SubscriptionContext Stub (hardcoded tier:'pro') vollständig
    durch CL-113-Implementierung ersetzt
Aufwand:      M
```

---

### [CL-175] Test-Suite — Unit + Integration Tests

```
Modul:        A — Fundament
Abhängigkeit: M0–M6 abgeschlossen
Umfang:       Tests
Akzeptanz:
  - Vitest eingerichtet für Frontend
  - Unit-Tests für:
    - hasFeature() RPC-Wrapper (CL-103): alle Fälle (Override, Produkt,
      kein Eintrag)
    - completeness_score Berechnung (CL-121)
    - anti_repetition Kontext-Builder (CL-128)
    - daily_metrics UNIQUE-Constraint-Verhalten (CL-147)
  - Integration-Tests für:
    - Einladungsflow: invite → register → customer_products angelegt
    - Onboarding-Fortschritt: complete() ist idempotent
    - Fulfillment-Idempotenz: gleicher idempotency_key → gleiche Order
  - Mindest-Coverage: 60% der neuen Edge Functions
Aufwand:      XL
```

---

### [CL-176] CI/CD — GitHub Actions Pipeline

```
Modul:        A — Fundament
Abhängigkeit: CL-175
Umfang:       DevOps
Akzeptanz:
  - GitHub Actions Workflow (.github/workflows/ci.yml):
    - Trigger: Push auf main + alle PRs
    - Jobs: lint, type-check, unit-tests, build
    - Supabase CLI: Migrations werden gegen lokale Supabase
      Testinstanz ausgeführt
  - Vercel Preview-Deployments bleiben erhalten
  - Branch-Protection auf main: CI muss grün sein
  - Secrets: alle ENV-Variablen in GitHub Secrets,
    kein Klartext in Workflow-Dateien
  - Badge im README: CI-Status-Badge
Aufwand:      M
```

---

### [CL-177] CONSENT.md — Dokumentation Recording-Consent

```
Modul:        E — Recording-Pipeline → Dossier
Abhängigkeit: CL-109
Umfang:       Dokumentation
Akzeptanz:
  - /CONSENT.md erstellt mit:
    - Rechtliche Grundlage: §201 StGB, DSGVO Art. 6 Abs. 1 lit. a
    - Technische Umsetzung: wie Consent-Gate funktioniert,
      welche Daten gespeichert werden (consent_text, consent_given_at)
    - Lösch-Prozess: wer kann löschen, was wird gelöscht,
      Audit-Log-Eintrag
    - Aufbewahrungsfristen: Recordings max. 6 Monate,
      Transkripte max. 12 Monate
    - Hinweis auf AVV (bestehende AvvAgreement.tsx)
  - Consent-Text der im Modal angezeigt wird stimmt mit CONSENT.md überein
  - Berater-Onboarding-Checkliste enthält "CONSENT.md gelesen"-Schritt
Aufwand:      S
```

---

### [CL-178] FORMATS.md — Dokumentation Format-Registry

```
Modul:        J — Format-Registry, Asset-Bibliothek & Render-Engine
Abhängigkeit: CL-131
Umfang:       Dokumentation
Akzeptanz:
  - /FORMATS.md erstellt mit:
    - Tabelle aller LinkedIn-Formate mit Dimensionen, Safe Zones,
      Zeichenlimits — Referenz PLAN.md §2 format_registry
    - Quellen der Limits (LinkedIn offizielle Dokumentation, Stand-Datum)
    - Prozess für neue Formate: Wie wird format_registry erweitert,
      wer kann verifizieren, was bedeutet verified_at
    - Template-Variablen-Konvention: {{name_der_variable}}-Format,
      Pflicht- vs. optionale Variablen
    - Render-Engine-Fallback-Verhalten (CL-134)
Aufwand:      S
```

---

### [CL-179] AUTOMATION.md — Dokumentation aller Cron-Jobs + Queues

```
Modul:        A — Fundament
Abhängigkeit: CL-141, CL-150, CL-152, CL-157, CL-167
Umfang:       Dokumentation
Akzeptanz:
  - /AUTOMATION.md erstellt mit:
    - Tabelle aller pg_cron-Jobs:
      Name, Schedule, Beschreibung, Fehlerverhalten
    - Tabelle aller Queue-basierten Prozesse:
      Trigger, Edge Function, max_attempts, Retry-Logik
    - Monitoring: wie werden Fehler erkannt (Admin-Cockpit CL-167)
    - Manuelles Auslösen: Befehle und Voraussetzungen
    - Kosten-Implikationen: welche Jobs verursachen externe API-Kosten
    - Idempotenz-Keys-Konvention: '{job-type}-{user_id}-{period}'
  - Stimmt mit tatsächlichen pg_cron-Konfigurationen überein
    (wird bei neuen Jobs aktuell gehalten)
Aufwand:      S
```

---

## Zusammenfassung

| Meilenstein | Tickets | IDs | Geschätzter Aufwand |
|---|---|---|---|
| M0 Fundament | 15 | CL-101 bis CL-115 | ~60–80h |
| M1 Onboarding & Dossier | 10 | CL-116 bis CL-125 | ~50–70h |
| M2 Self-Service | 5 | CL-126 bis CL-130 | ~15–25h |
| M3 Fulfillment | 15 | CL-131 bis CL-145 | ~100–140h |
| M4 Kennzahlen | 8 | CL-146 bis CL-153 | ~35–55h |
| M5 Feedback & Intelligence | 8 | CL-154 bis CL-161 | ~40–55h |
| M6 Admin & Betrieb | 10 | CL-162 bis CL-171 | ~50–65h |
| M7 Härtung | 8 | CL-172 bis CL-179 | ~40–60h |
| **Total** | **79** | **CL-101 bis CL-179** | **~390–550h** |

---

## Abhängigkeitsgraph (kritischer Pfad)

```
CL-101 (products) → CL-102 (customer_products) → CL-103 (hasFeature RPC)
    → CL-104 (Hook Bugfix)
    → CL-105 (dynamische Navigation)
    → CL-113 (SubscriptionContext)
    → CL-126 (Akademie Gate)
    → CL-127 (Bot Gate)

CL-106 (Invitations v2) → CL-107 (Status-Tracking)
                        → CL-108 (Bulk CSV)
                        → CL-116 (Onboarding Tracks)
                            → CL-117 (Progress Tracking)
                                → CL-118 (Wizard UI)

CL-109 (Consent Gate) → CL-119 (Recording Pipeline)
                            → CL-120 (Dossier Schema)
                                → CL-121 (Extraktion)
                                    → CL-122 (Vollständigkeitsgate)
                                        → CL-123 (Freigabe)
                                            → CL-130 (Profil-Integration)
                                            → CL-141 (Weekly Cron)

CL-131 (Format Registry) → CL-132 (Brand Tokens)
                         → CL-133 (Templates)
                             → CL-134 (Render Engine) → CL-137 (Assets)
                                                            → CL-138 (Jobs)
                                                                → CL-139 (1-Klick UI)
                                                                → CL-140 (Review Queue)

CL-135 (Higgsfield) ──────────────────────────────────────────↑

CL-146 (Metrik-Registry) → CL-147 (daily_metrics) → CL-149 (Mobile UI)
                                                   → CL-150 (Erinnerungen)
                                                   → CL-151 (Dashboards v2)
                                                   → CL-152 (Nulltag Cron)
                                                       → CL-159 (Health Score)
```

---

*BACKLOG.md v3 — Stand: 2026-07-27 — Nächste Review nach M0 abgeschlossen*
