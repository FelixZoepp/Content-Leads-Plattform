import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SYSTEM_PROMPT = `
Du bist die KI-Engine von "Cashflow OS" — der 90-Tage Cashflow Offensive für Agenturinhaber, Coaches und Dienstleister. Du generierst vollständig personalisierte, sofort einsetzbare Business-Assets basierend auf den ICP- und Angebots-Daten des Kunden.

DEINE KERNREGEL: Alle Outputs sind direkt copy-paste-fähig. Keine generischen Platzhalter außer wo echte Daten des Kunden fehlen. Klingt immer wie ein Mensch, nie wie eine KI.

=== POSITIONIERUNG & PRICING ===

ZWEI MODELLE:
Modell A (Angebotspositionierung): Skalierung über Content & Leadmagneten. Funnel & Automatisierung möglich.
Modell B (Zielgruppenpositionierung): Skalierung NUR über aktive Vernetzung & Direktvertrieb. Kein Funnel.

WERTEVERSPRECHEN-FORMEL (PFLICHT):
"Ich helfe [X] dabei, [Y] zu erreichen — mit [Z] — in [T] Tagen."
Ohne Zeitversprechen ist ein Angebot wertlos. Ohne Mechanismus ist es austauschbar. Ohne Zahl nicht verkaufbar.

PRICING (10-20% des Mehrumsatzes):
3-Monate-Paket: 3.000-4.500€
6-Monate-Paket: 6.000-9.000€
12-Monate-Paket: 12.000-24.000€

=== KANAL-EMPFEHLUNG (AKTIV AUSSPRECHEN) ===

Basierend auf dem ICP immer eine Empfehlung ausgeben:
Agenturen & Dienstleister: LinkedIn DM + Cold Mail SEHR GUT, Content GUT
Coaches & Berater: LinkedIn Content + Leadmagnet SEHR GUT, Cold Call SCHLECHT
Handwerk & Bau: Cold Call SEHR GUT, LinkedIn SCHLECHT
Kanzleien & Steuerberater: Inbound Content + Empfehlung, Cold Mail SCHLECHT
SaaS & Tech: Cold Mail + LinkedIn DM SEHR GUT
Einzelhandel: LinkedIn SCHLECHT, Meta/Instagram GUT
Finanzdienstleister: LinkedIn Content + DM GUT, Cold Call GUT
Industrie & Produktion: Cold Call SEHR GUT, Cold Mail GUT, LinkedIn Content SCHLECHT

=== LINKEDIN PROFIL ===

Alle 9 Sektionen generieren:
1. Profilbild-Empfehlung
2. Banner: Claim + Social Proof + CTA
3. Headline: "[Was du tust] für [ICP] | [Ergebnis + Zahl] | [Differenzierung]" — max 220 Zeichen
4. About: Hook → Story → Methode → Beweis → CTA
5. Featured: Leadmagnet + Testimonial + Buchungslink
6. Berufserfahrung: Ergebnisse statt Tätigkeiten
7. Serviceleistungen: Nutzen-Titel + Zahlen
8. Empfehlungen: Problem → Lösung → Ergebnis
9. Kontakt: Buchungslink

=== LINKEDIN CAPTION FRAMEWORK ===

AUFBAU (9 Elemente exakt):
1. Hook (1-2 Sätze): Persönliche Story, Cliffhanger
2. Ergebnis-Statement: Zahl + Klammersatz
3. Der Plan: Überleitung
4. Nutzen-Bullets (3-5): Mit --> als Marker
5. Ergebnis-Absatz: Kurz, kraftvoll
6. Kostenlos-Hook: 🫡 + ehrlicher Grund
7. Social Proof: 2-3 Bullets mit Emoji + Zahlen
8. CTA: "Kommentiere [Keyword] — ich schick dir [Leadmagnet] direkt"
9. P.S.: Konkurrenz-Kontrast

=== CONTENT-STRATEGIE ===

5 Posts/Woche: 2x Content-Post + 3x Lead-Post
Lead-Post CTA: "Kommentiere [Keyword] — ich schick dir [Leadmagnet] ins Postfach"

=== LEADMAGNET FRAMEWORK ===

PRIORITÄT: KI-Prompts > Mini-KI-Tools > Automationen > Copy-Paste PDFs
VERBOTE: Keine Checklisten, kein E-Book, nichts das >10 Min konsumiert wird

3 Leadmagneten: LM1 (ToFu), LM2 (MoFu), LM3 (BoFu)
Je Leadmagnet: Titel + Beschreibung + Hauptnutzen + Fertiger Prompt/Skript + LinkedIn Caption

=== FUNNEL & LANDING PAGE ===

DESIGN: Navy/Dunkelblau Hintergrund, weiße Schrift, minimal.
STRUKTUR: Leadmagnet-Bild → Headline → Subheadline (Zahl!) → Formular → Button → Danke-Seite

=== E-MAIL SEQUENZ ===

5 Mails als reiner Fließtext. "Hey %FIRSTNAME%," bis "MfG Felix Zoepp"
Timing: Sofort / 6h / 18h / 32h / 48h

=== LINKEDIN OUTREACH ===

Phase 1 (Automatisiert): 5 DMs mit Timing
Phase 2 (Manuell + Loom): Sobald Antwort → Loom aufnehmen

=== COLD MAIL ===

4 Mails. Mail 1 hyperpersonalisiert. 3 Betreff-Varianten je Mail.

=== VERTRIEBSSKRIPTE ===

4 Skripte: Kaltakquise, Inbound, Setting (15 Min), Closing (45-60 Min)
Alle Einwandbehandlungen vollständig ausschreiben.

=== 90-TAGE FAHRPLAN ===

Phase 1 (Tag 1-21): Setup — ICP, Scraping, Profil, Funnel, Tools
Phase 2 (Tag 22-63): Execution — Tagesstruktur mit Uhrzeiten
Phase 3 (Tag 64-90): Optimierung — Wöchentliche Analyse

TÄGLICHES VERTRIEBSTRAINING mit Claude Roleplay.

REGELN: Schreibe in "du"-Form. Alles sofort copy-paste-fähig. Konkret und spezifisch. Kein Marketing-Sprech.
`

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { assetType, userProfile, customPrompt } = await req.json()
    const p = userProfile || {}

    const assetPrompts: Record<string, string> = {
      fahrplan: `Erstelle einen vollständigen 90-Tage Fahrplan als Trainingsplan.
Nutzer-Profil: Angebot: ${p.current_offer || p.angebot || 'k.A.'}, ICP: ${p.target_audience || p.icp_rolle || 'Geschäftsführer'} in ${p.industry || p.icp_branche || 'Dienstleistung'}, Schmerz: ${p.icp_schmerz || 'fehlende Neukunden'}, Erfahrung: ${p.erfahrung_jahre || 'k.A.'} Jahre, Stand: LinkedIn ${p.linkedin_experience || p.linkedin_stand || 'Anfänger'}, Outreach ${p.outreach_stand || 'kein'}.
Gib zuerst die Kanal-Empfehlung basierend auf dem ICP aus.
Dann: Woche 1-12 strukturiert. Je Woche: Fokus + täglich 3 konkrete Aufgaben (Mo-Fr).
Tag 1-3 detailliert mit genauen Setup-Schritten.
Ab Tag 4: Tagesstruktur mit Uhrzeiten.
JSON-Format: { "kanal_empfehlung": "string", "wochen": [{ "woche": 1, "fokus": "string", "phase": "setup", "aufgaben": { "mo": ["task1","task2","task3"], "di": ["task1","task2","task3"], "mi": ["task1","task2","task3"], "do": ["task1","task2","task3"], "fr": ["task1","task2","task3"] } }] }`,

      positionierung: `Erstelle die vollständige Positionierung.
Angebot: ${p.current_offer || p.angebot || 'k.A.'}, Ergebnis: ${p.ergebnis || 'mehr Umsatz'}, ICP: ${p.target_audience || p.icp_rolle || 'Geschäftsführer'} in ${p.industry || p.icp_branche || 'Dienstleistung'}, Schmerz: ${p.icp_schmerz || 'fehlende Neukunden'}, USP: ${p.usp || 'k.A.'}, Mehrumsatz: ${p.goal_revenue_monthly || p.mehrumsatz || '10000'}€, Zeitversprechen: ${p.zeitversprechen || '90 Tage'}, Mechanismus: ${p.mechanismus || 'k.A.'}, Modell: ${p.skalierungsmodell || 'A'}.
Ausgabe: 1. Werteversprechen-Satz 2. Offer-Details 3. Empfohlenes Modell (A oder B + Begründung) 4. 3 Verkaufspakete mit Preis/Ziel/Inhalt 5. Psychologisches Verkaufsargument`,

      linkedin_profil: `Erstelle das vollständige LinkedIn Profil.
Angebot: ${p.current_offer || p.angebot || 'k.A.'}, Ergebnis: ${p.ergebnis || 'mehr Umsatz'}, ICP: ${p.target_audience || p.icp_rolle || 'Geschäftsführer'} in ${p.industry || p.icp_branche || 'Dienstleistung'}, Schmerz: ${p.icp_schmerz || 'fehlende Neukunden'}, USP: ${p.usp || 'k.A.'}, Bestes Ergebnis: ${p.bestes_ergebnis || 'k.A.'}, Erfahrung: ${p.erfahrung_jahre || 'k.A.'} Jahre, Story: ${p.persoenliche_story || 'k.A.'}.
Alle 9 Sektionen vollständig ausschreiben. Zahlen direkt einbauen. Wo keine echten Zahlen: [DEINE ZAHL].`,

      outreach_dms: `Erstelle die vollständige 5-Step DM-Sequenz.
ICP: ${p.target_audience || p.icp_rolle || 'Geschäftsführer'} in ${p.industry || p.icp_branche || 'Dienstleistung'}, Schmerz: ${p.icp_schmerz || 'fehlende Neukunden'}, Angebot: ${p.current_offer || p.angebot || 'k.A.'}, USP: ${p.usp || 'k.A.'}.
Alle 5 DMs vollständig ausschreiben mit Timing und Anweisungen.
Bonus: 3 Loom-Script-Varianten für Phase 2 (wenn jemand antwortet).`,

      cold_mails: `Erstelle die 4-Mail Cold-Outreach-Sequenz.
ICP: ${p.target_audience || p.icp_rolle || 'Geschäftsführer'} in ${p.industry || p.icp_branche || 'Dienstleistung'}, Schmerz: ${p.icp_schmerz || 'fehlende Neukunden'}, Angebot: ${p.current_offer || p.angebot || 'k.A.'}, Ergebnis: ${p.ergebnis || 'mehr Umsatz'}.
Erst: Kanal-Check — ist Cold Mail für diese Zielgruppe geeignet?
Dann: Alle 4 Mails vollständig. Je Mail: 3 Betreff-Varianten + vollständiger Text.`,

      mail_sequenz: `Erstelle die 5-Mail Welcome-Sequenz nach Leadmagnet-Download.
Angebot: ${p.current_offer || p.angebot || 'k.A.'}, ICP: ${p.target_audience || p.icp_rolle || 'Geschäftsführer'} in ${p.industry || p.icp_branche || 'Dienstleistung'}, Schmerz: ${p.icp_schmerz || 'fehlende Neukunden'}, Bestes Ergebnis: ${p.bestes_ergebnis || 'k.A.'}.
Alle 5 Mails als reiner Fließtext ohne Formatierung. Timing: Sofort / 6h / 18h / 32h / 48h.`,

      leadmagnet_1: `Erstelle Leadmagnet 1 (Top of Funnel).
ICP: ${p.target_audience || p.icp_rolle || 'Geschäftsführer'} in ${p.industry || p.icp_branche || 'Dienstleistung'}, Schmerz: ${p.icp_schmerz || 'fehlende Neukunden'}, Angebot: ${p.current_offer || p.angebot || 'k.A.'}.
KI-basiertes Format bevorzugen. Mass-Appeal prüfen. Vollständig ausarbeiten mit fertigem Prompt/Skript + LinkedIn Caption (9-Elemente-Struktur).`,

      leadmagnet_2: `Erstelle Leadmagnet 2 (Middle of Funnel).
ICP: ${p.target_audience || p.icp_rolle || 'Geschäftsführer'} in ${p.industry || p.icp_branche || 'Dienstleistung'}, USP: ${p.usp || 'k.A.'}, Mechanismus: ${p.mechanismus || 'k.A.'}.
Methode/Framework zeigen. Vollständig ausarbeiten mit fertigem Prompt/Skript + LinkedIn Caption.`,

      leadmagnet_3: `Erstelle Leadmagnet 3 (Bottom of Funnel).
ICP: ${p.target_audience || p.icp_rolle || 'Geschäftsführer'} in ${p.industry || p.icp_branche || 'Dienstleistung'}, Bestes Ergebnis: ${p.bestes_ergebnis || 'k.A.'}, Angebot: ${p.current_offer || p.angebot || 'k.A.'}, Preispunkt: ${p.offer_price_monthly || p.preispunkt || 'k.A.'}€.
Case Study Format. Vollständig ausarbeiten + LinkedIn Caption.`,

      funnel: `Erstelle den kompletten Landing Page + Danke-Seite Copy.
ICP: ${p.target_audience || p.icp_rolle || 'Geschäftsführer'} in ${p.industry || p.icp_branche || 'Dienstleistung'}, Schmerz: ${p.icp_schmerz || 'fehlende Neukunden'}, Ergebnis: ${p.ergebnis || 'mehr Umsatz'}, Bestes Ergebnis: ${p.bestes_ergebnis || 'k.A.'}.
Ausgabe: Headline / Subheadline (mit Zahl!) / Opt-in Label / CTA Button / Danke-Seite.`,

      opening_skript: `Erstelle das vollständige Kaltakquise-Skript.
ICP: ${p.target_audience || p.icp_rolle || 'Geschäftsführer'} in ${p.industry || p.icp_branche || 'Dienstleistung'}, Angebot: ${p.current_offer || p.angebot || 'k.A.'}, Ergebnis: ${p.ergebnis || 'mehr Umsatz'}, Preispunkt: ${p.offer_price_monthly || p.preispunkt || 'k.A.'}€.
Sekretärin-Skript + Entscheider-Pitch + alle Einwandbehandlungen vollständig ausschreiben.`,

      setting_skript: `Erstelle das vollständige Setting-Skript (15 Min).
ICP: ${p.target_audience || p.icp_rolle || 'Geschäftsführer'} in ${p.industry || p.icp_branche || 'Dienstleistung'}, Angebot: ${p.current_offer || p.angebot || 'k.A.'}, Ergebnis: ${p.ergebnis || 'mehr Umsatz'}, Preispunkt: ${p.offer_price_monthly || p.preispunkt || 'k.A.'}€.
Discovery-Fragen, Budget-Qualifikation (Mindest: 2.000€/Monat) und Closing-Termin-Buchung.`,

      closing_skript: `Erstelle das vollständige Closing-Skript (45-60 Min) mit Einwandbehandlung.
Angebot: ${p.current_offer || p.angebot || 'k.A.'}, Ergebnis: ${p.ergebnis || 'mehr Umsatz'}, Preispunkt: ${p.offer_price_monthly || p.preispunkt || 'k.A.'}€, ICP: ${p.target_audience || p.icp_rolle || 'Geschäftsführer'} in ${p.industry || p.icp_branche || 'Dienstleistung'}, USP: ${p.usp || 'k.A.'}.
Warm-up → Rückblick → Präsentation → Preis → Alle 5 Einwände vollständig ausschreiben.`,

      linkedin_captions: `Erstelle 5 LinkedIn Captions.
ICP: ${p.target_audience || p.icp_rolle || 'Geschäftsführer'} in ${p.industry || p.icp_branche || 'Dienstleistung'}, Schmerz: ${p.icp_schmerz || 'fehlende Neukunden'}, Bestes Ergebnis: ${p.bestes_ergebnis || 'k.A.'}, Story: ${p.persoenliche_story || 'k.A.'}.
Je 1 Caption für LM1, LM2, LM3 + 2 Content-Post Captions (Story + Insight).
Exakt 9-Elemente-Struktur einhalten.`,

      kpi_analyse: `Analysiere die folgenden KPI-Daten und gib konkrete Optimierungsempfehlungen.
Benchmarks: DM Antwortrate 20-30%, Loom-View-Rate 40-60%, Mail Antwortrate 5-15%, Setting→Closing 70%+, Closing→Abschluss 30%+.
Gib: 1. Performance-Zusammenfassung 2. Stärken 3. Schwächen 4. 3-5 konkrete Action Items 5. Benchmark-Vergleich`,

      caption_generator: `Erstelle eine LinkedIn Caption zum angegebenen Thema.
ICP: ${p.target_audience || p.icp_rolle || 'Geschäftsführer'} in ${p.industry || p.icp_branche || 'Dienstleistung'}.
Exakt 9-Elemente-Struktur einhalten. Deutsch, direkt, polarisierend.`,
    }

    // Build the user prompt
    let userPrompt: string
    if (customPrompt) {
      const basePrompt = assetPrompts[assetType]
      userPrompt = basePrompt
        ? basePrompt + `\n\nZusätzliche Infos: ${customPrompt}`
        : customPrompt
    } else {
      const prompt = assetPrompts[assetType]
      if (!prompt) {
        throw new Error(`Unknown asset type: ${assetType}`)
      }
      userPrompt = prompt
    }

    // Try Anthropic API directly first, fallback to Lovable AI Gateway
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")

    let content = ""

    if (ANTHROPIC_API_KEY) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20241022",
          max_tokens: 4000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }]
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Anthropic API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      content = data.content?.[0]?.text || ""
    } else if (LOVABLE_API_KEY) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Lovable AI error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      content = data.choices?.[0]?.message?.content || ""
    } else {
      throw new Error("No AI API key configured. Set ANTHROPIC_API_KEY or LOVABLE_API_KEY in Edge Function secrets.")
    }

    return new Response(
      JSON.stringify({ content, assetType }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error: unknown) {
    console.error("generate-asset error:", error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
