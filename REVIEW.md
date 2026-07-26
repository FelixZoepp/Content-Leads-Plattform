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
