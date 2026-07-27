# PROGRESS.md v3 — Fortschrittsprotokoll

**Session:** 2026-07-27
**Commits:** 14 in dieser Session

## v3 Abgeschlossene Tickets (~25/79)

### M0 Fundament
- [x] CL-101: Products + Features + ProductFeatures Schema + Seed (live)
- [x] CL-102: CustomerProducts + FeatureOverrides Schema (live)
- [x] CL-103: has_feature() RPC Funktion (live)
- [x] CL-104: useFeatureAccess backward-compat gefixt
- [x] CL-105: Dynamische Navigation via navigationConfig.ts + useUserFeatures
- [x] CL-109: Consent-Gate für Recording (§201 StGB Fix)

### M1 Onboarding & Dossier
- [x] CL-116: Onboarding Track Admin Editor mit DnD
- [x] CL-117: Customer Onboarding Wizard (7 Schritt-Typen)
- [x] CL-120: Dossier Page (Advisor-Ansicht, Feld-Editing, ToV-Import, Completeness-Score)

### M2 Self-Service
- Akademie + KI-Bots aus v1 weiterhin funktional

### M3 Fulfillment
- [x] CL-131: Format-Registry Admin UI
- [x] CL-132: Brand Tokens Editor (Color/Font/Logo/Style)
- [x] CL-133: Render-Engine Edge Function (Agent läuft)
- [x] CL-138: 1-Click Fulfillment UI (Agent läuft)
- [x] CL-141: Higgsfield Adapter (headless, async polling)
- [x] CL-143: Perspective manual Adapter (Funnel-Briefing)
- [x] CL-144: HeyReach Adapter (Outreach-Metrics Sync)

### M4 Kennzahlen
- [x] CL-146: Daily Input Page (Mobile-first, <30s, Zero-Day)
- [x] CL-148: Metric Reminder Logic (_shared/metric-reminders.ts)

### M5 Feedback & Intelligence
- [x] CL-155: Instant Alert System (_shared/alerts.ts)

### M6 Admin & Betrieb
- [x] CL-162: Product & Feature Registry Admin (Matrix-UI)
- [x] CL-163: Format Registry Admin
- [x] CL-165: Job Monitor (Fulfillment + Sync, Auto-Refresh, Retry)
- [x] CL-167: Cost Dashboard (pro User/Modell, 7d/30d/90d)

## DB-Migrationen live

| Migration | Neue Tabellen |
|---|---|
| 0010 | products, features, product_features, customer_products, feature_overrides |
| 0011 | onboarding_tracks, onboarding_steps, onboarding_progress, recordings, transcripts, dossiers, dossier_fields, format_registry, brand_tokens, templates, assets, deliverable_sets, deliverable_set_items, fulfillment_orders, fulfillment_jobs, metric_definitions, daily_metrics, metric_targets, survey_sends |

## Neue Shared Helpers

| Datei | Zweck |
|---|---|
| _shared/integrations/interface.ts | Unified Integration Provider Interface |
| _shared/integrations/higgsfield.ts | Higgsfield API Adapter |
| _shared/integrations/perspective.ts | Perspective Manual Adapter |
| _shared/integrations/heyreach.ts | HeyReach API Adapter |
| _shared/integrations/registry.ts | Provider Factory |
| _shared/alerts.ts | Instant Alert + Survey Checker |
| _shared/metric-reminders.ts | Daily Reminder + Compliance Score |

## Offene v3-Tickets (~54/79)

**M0:** CL-106 (Einladungen v2 Token), CL-107 (Status-Tracking), CL-108 (Bulk CSV), CL-110-115
**M1:** CL-118 (Recording Pipeline), CL-119 (Transkription), CL-121-125
**M3:** CL-134-137, CL-139-140, CL-145
**M4:** CL-147, CL-149-153
**M5:** CL-154, CL-156-161
**M6:** CL-164, CL-166, CL-168-171
**M7:** CL-172-179 (Härtung)
