# Entscheidungen

## 1. Neues Projekt statt Merge
**Entscheidung**: Komplett neues Projekt (`content-leads-platform`) statt das alte `content-leads-unified` weiterzubauen.
**Grund**: Das alte Unified-Projekt hatte die alte Navigation/UI. Der neue Auftrag verlangt ein komplett neues Design im Range Solutions Stil mit anderer Seitenstruktur.

## 2. Supabase-Instanz beibehalten
**Entscheidung**: Gleiche Supabase-Instanz (`ciimklroqbmzcblnbgdk`) mit allen 69 Tabellen/Views und 57 Edge Functions weiterverwendet.
**Grund**: Tabellen und Functions sind bereits deployed. Der Admin-User (felix@content-leads.de) existiert bereits.

## 3. Shadcn/UI Components aus Content-Leads
**Entscheidung**: Alle 50+ shadcn/ui Komponenten aus Content-Leads übernommen.
**Grund**: Vollständiges UI-Kit, kompatibel mit Tailwind, sofort einsetzbar.

## 4. Supabase Types aus Unified-Projekt
**Entscheidung**: Die gemergte `types.ts` (4400+ Zeilen) aus dem Unified-Projekt übernommen.
**Grund**: Enthält bereits alle Tabellen-Types aus beiden alten Apps + feature_access.

## 5. Locked Pages als FeatureGate-Wrapper
**Entscheidung**: Gesperrte Seiten (Instagram, CRM, Finance, etc.) als simple FeatureGate-Wrapper implementiert statt die alten Salesflow-Seiten zu kopieren.
**Grund**: Pragmatischer Ansatz - die Lock-Screen UI ist sofort fertig, die echte Funktionalität kann später eingefügt werden wenn das Feature freigeschaltet wird.

## 6. Farbe Hellblau statt Lila
**Entscheidung**: Alle CSS-Variablen von HSL 245 (Lila) auf HSL 203 (Hellblau) geändert.
**Grund**: Explizite Anforderung - #4A9FD9 als Primary Color.

## 7. Auth als Context statt Hook-Only
**Entscheidung**: AuthProvider als React Context implementiert statt nur als Hook.
**Grund**: Ermöglicht Zugriff auf Auth-State in allen Komponenten ohne Prop-Drilling.
