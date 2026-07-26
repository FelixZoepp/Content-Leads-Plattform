# BLOCKERS.md — Echte Blocker

## CL-002: Tenant-Konsolidierung (accounts + tenants → organisations)

**Grund:** Diese Migration betrifft ~50% aller bestehenden Edge Functions und Frontend-Queries. Ein Fehler kann Prod-Daten korrumpieren oder die Live-App brechen. Die Migration erfordert:
1. Kompatibilitäts-Views als Übergangsschicht
2. Schrittweise Umbenennung in Edge Functions
3. Frontend-Anpassung (account_id/tenant_id → org_id)
4. Koordinierte Deployment-Reihenfolge (DB → Edge Functions → Frontend)

**Status:** Verschoben auf koordinierte Session mit Felix. Schema-Design liegt in PLAN.md vor.

**Workaround:** Neue Tabellen nutzen `org_id` (nullable). Bestehende Tabellen bleiben bei `account_id`/`tenant_id`. Die neuen RLS-Policies auf neuen Tabellen funktionieren unabhängig.
