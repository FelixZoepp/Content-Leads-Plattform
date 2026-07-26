# FORMATS.md — LinkedIn Format-Registry

**Verifiziert:** 2026-07-27
**Quelle:** LinkedIn Help Center + öffentliche Größen-Guides

> Diese Werte werden in der `format_registry`-Tabelle gespeichert und sind die einzige Quelle für Formatvorgaben im gesamten System. Keine Hardcoding in Code oder Prompts.

## Profilbilder & Banner

| Asset | Slug | Maße (px) | Seitenverhältnis | Hinweis |
|---|---|---|---|---|
| Profilbild | `profil_bild` | 400 × 400 | 1:1 | Kreisförmiger Beschnitt, Gesicht zentrieren, kein Text |
| Profil-Banner (Person) | `profil_banner` | 1584 × 396 | 4:1 | Safe Zone beachten (Profilbild-Überlagerung) |
| Company Cover | `company_cover` | 1128 × 191 | ~5.9:1 | ⚠️ Quellen widersprüchlich (auch 4200×700 genannt) — vor Prod verifizieren |
| Firmenlogo | `firmen_logo` | 400 × 400 | 1:1 | — |

## Post-Bilder

| Asset | Slug | Maße (px) | Seitenverhältnis | Hinweis |
|---|---|---|---|---|
| Post quadratisch | `post_quadrat` | 1080 × 1080 | 1:1 | Standard |
| Post Hochformat | `post_hoch` | 1080 × 1350 | 4:5 | Beste Sichtbarkeit im Mobile-Feed |
| Post Querformat | `post_quer` | 1200 × 627 | ~1.91:1 | Link-Preview-Format |
| Karussell-Slide | `karussell` | 1080 × 1080 oder 1080 × 1350 | 1:1 oder 4:5 | Export als PDF, max 300 Seiten, 100 MB |

## Weitere Formate

| Asset | Slug | Maße (px) | Hinweis |
|---|---|---|---|
| Artikel-Cover | `artikel_cover` | 1920 × 1080 | ⚠️ Auch 1280×720 genannt — verifizieren |
| Event-Cover | `event_cover` | 1280 × 720 | — |

## Text-Limits

| Feld | Slug | Max Zeichen | Hinweis |
|---|---|---|---|
| Headline | `text_headline` | 220 | Erste Zeile unter dem Namen |
| About/Info | `text_about` | 2.600 | Erste 3 Zeilen vor "Mehr anzeigen" entscheidend |
| Positions-Beschreibung | `text_position` | 2.000 | — |
| Post-Text | `text_post` | 3.000 | Erste 3 Zeilen vor "Mehr" |
| Kommentar | `text_comment` | 1.250 | — |
| DM-Nachricht | `text_dm` | 8.000 | Erste Nachricht: max ~300 Zeichen empfohlen |

## Safe Zones (Profil-Banner)

Das Profilbild überlagert den Banner unterschiedlich je nach Viewport:

| Viewport | Profilbild-Position | Safe Zone (Text/Logo) |
|---|---|---|
| Desktop | Links unten, ~120px Überlagerung | Rechte 70% des Banners |
| Tablet | Links unten, ~100px | Rechte 60% |
| Mobile | Zentriert unten, ~80px | Obere 60% des Banners |

Die Render-Engine platziert Text und Logo **nur** innerhalb der Safe Zone. Die Vorschau zeigt drei Ansichten nebeneinander.
