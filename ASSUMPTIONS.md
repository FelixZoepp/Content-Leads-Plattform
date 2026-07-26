# ASSUMPTIONS.md — Getroffene Annahmen

Dokumentiert Annahmen, die während Phase 2 getroffen wurden.

---

### CL-008: Credentials in Git-History
**Annahme:** Kein `git filter-branch` / `git push --force` um History zu bereinigen — das wäre destruktiv und könnte Vercel-Deployments brechen.
**Alternative:** Force-Push nach Koordination mit allen Beteiligten.
**Empfehlung:** Passwort für felix@content-leads.de sofort ändern, da es in der Git-History liegt.

### CL-009: PitchFirst-Branding in Outreach-Seiten
**Annahme:** Die ~30 PitchFirst-Referenzen in gesperrten Outreach-Seiten (Partner, PartnerDashboard, FeaturePages) werden vorerst nicht umbenannt, da sie nicht erreichbar sind.
**Alternative:** Alle umbenennen (ca. 1h zusätzlicher Aufwand ohne funktionalen Nutzen).
**Empfehlung:** Erst rebranden wenn Outreach-Module freigeschaltet werden.

### CL-009: Fallback-URL in Edge Functions
**Annahme:** `content-leads-platform.vercel.app` als Fallback-URL statt einer Custom Domain, da keine Custom Domain konfiguriert ist.
**Alternative:** Eigene Domain (z.B. app.content-leads.de) konfigurieren und als Fallback nutzen.
