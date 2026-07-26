# PROGRESS.md — Fortschrittsprotokoll

## Abgeschlossene Tickets (22/39)

| # | Ticket | Beschreibung | Status |
|---|---|---|---|
| 1 | CL-001 | DB-Schema-Dump: 0001_initial_schema.sql (69K, 64 Tabellen) | ✅ |
| 2 | CL-004 | Audit-Log: Schema + Trigger + RPC + _shared/audit.ts | ✅ live |
| 3 | CL-005 | AuthProvider konsolidiert (Duplicate gelöscht) | ✅ |
| 4 | CL-006 | advisor_assignments Tabelle + RLS | ✅ live |
| 5 | CL-008 | Credentials bereinigt + .env.example | ✅ |
| 6 | CL-009 | lovable-tagger entfernt, PitchFirst→Content-Leads | ✅ |
| 7 | CL-010 | Akademie-Schema: courses + lessons + lesson_progress | ✅ live |
| 8 | CL-011 | Akademie-UI: AcademyPage + CoursePage + LessonPage | ✅ |
| 9 | CL-013 | ToV-Profil Schema + Interview-Bot UI | ✅ live + UI |
| 10 | CL-014 | Content-Bibliothek Schema + Library UI | ✅ live + UI |
| 11 | CL-015 | Prompt-Registry + AI-Service + 8 Seed-Prompts | ✅ live |
| 12 | CL-016 | KI-Bots: Lead-Post + Content-Post Generator UI | ✅ |
| 13 | CL-019 | Profiloptimierung Schema | ✅ live |
| 14 | CL-020 | Checklisten Schema + Template-Editor + Instance-View UI | ✅ live + UI |
| 15 | CL-021 | Kunden-Fortschrittsanzeige (ServiceProgress Widget) | ✅ |
| 16 | CL-022 | Content-Pipeline Schema | ✅ live |
| 17 | CL-023 | Berater-Dashboard erweitert (Kundenliste, Checklisten) | ✅ |
| 18 | CL-026 | Integration Credentials + Sync Jobs Schema | ✅ live |
| 19 | CL-028 | Surveys Schema | ✅ live |
| 20 | CL-030 | AI Insights + Upsell Signals + Pitch Templates Schema | ✅ live |
| 21 | CL-034 | Admin Prompt-Verwaltung UI (PromptManager) | ✅ |
| 22 | CL-035 | Admin Audit-Log-Viewer UI | ✅ |
| 23 | CL-039 | README.md komplett neu geschrieben | ✅ |

## In Arbeit

| Ticket | Beschreibung | Agent |
|---|---|---|
| CL-017 | Sales-Skript Generator (Teil des KI-Bot Agents) | 🔄 |

## DB-Migrationen live auf Prod

7 Migrationen erfolgreich angewendet:
- `extend_user_role_enum` — advisor + client hinzugefügt
- `audit_log` — Tabelle + Trigger + RPC
- `prompt_registry` — Templates + Versioning + Usage-Log + 8 Seeds
- `academy_schema` — courses + lessons + lesson_progress
- `advisor_workflows` — 12 Tabellen (Zuweisungen, ToV, Profil, Checklisten, Content, Bot-Sessions)
- `advisor_workflows_rls` — RLS-Policies
- `intelligence` — Surveys, AI Insights, Upsell, Credentials, Sync Jobs

## Neue Seiten/Routen

| Pfad | Seite |
|---|---|
| `/dashboard/admin/prompts` | KI-Prompt-Verwaltung (CRUD, Versioning, Test) |
| `/dashboard/admin/audit-log` | Audit-Log (Suche, Filter, Pagination) |
| `/dashboard/training` | Akademie-Übersicht (Kurse mit Fortschritt) |
| `/dashboard/training/:courseId` | Kursansicht (Lektionen, Sequential Unlock) |
| `/dashboard/training/:courseId/:lessonId` | Lektions-Player (Video/Text/Download) |
| `/dashboard/ai/tone-of-voice` | Tone-of-Voice Interview-Bot |
| `/dashboard/ai/content-generator` | Lead-/Content-/Sales-Post Generator |
| `/dashboard/ai/library` | Content-Bibliothek |

## Neue Komponenten

- `src/design-system/` — 15 Gold-gebrandete Komponenten + Token CSS
- `src/components/customer/ServiceProgress.tsx` — Fortschritts-Widget im Dashboard
- `src/components/customer/ChecklistProgress.tsx` — Read-only Checklisten-Ansicht
- `src/components/advisor/ChecklistTemplateEditor.tsx` — Template erstellen/bearbeiten
- `src/components/advisor/ChecklistInstanceView.tsx` — Checkliste abhaken + Notizen
- `src/components/ai/BotChat.tsx` — Wiederverwendbares KI-Chat-Framework
- `src/pages/admin/PromptManager.tsx` — Prompt CRUD + Test
- `src/pages/admin/AuditLogViewer.tsx` — Durchsuchbares Log
- `src/pages/training/AcademyPage.tsx` — Kursübersicht
- `src/pages/training/CoursePage.tsx` — Lektionsliste
- `src/pages/training/LessonPage.tsx` — Player

## Shared Edge Function Helpers

- `_shared/cors.ts` — CORS Headers
- `_shared/audit.ts` — Audit-Log-Helper
- `_shared/ai.ts` — Zentraler AI-Service (Anthropic/OpenAI, Fallback, Cost-Tracking)

## Offene Tickets (16/39)

**Fundament (verschoben):**
- CL-002: Tenant-Konsolidierung → BLOCKER (siehe BLOCKERS.md)
- CL-003: RLS auf bestehenden 65 Tabellen → braucht CL-002
- CL-007: Impersonation UI

**Berater/Content:**
- CL-012: Akademie Admin-CMS
- CL-018: Profiloptimierungs-Bot (Coaching-Modus)

**Kennzahlen:**
- CL-024: Kennzahl-Erinnerungslogik
- CL-025: Berater-KPI-Dashboard

**Intelligence:**
- CL-027: Credential Encryption (Supabase Vault)
- CL-029: Survey KI-Auswertung (Sentiment + Themen)
- CL-031: Pitch-Nachrichten-Generator

**Admin:**
- CL-032: Admin-Cockpit Erweiterung (teilweise erledigt)
- CL-033: Beraterauslastung + Umsatz

**Härtung:**
- CL-036: Security Review + Prompt-Injection-Schutz
- CL-037: Dead Code aufräumen
- CL-038: Responsive Layout + Keyboard-Navigation
