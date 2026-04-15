import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Du bist die Content-Leads AI – der KI-Assistent der Content-Leads GmbH.

Du hilfst Agenturinhabern, Beratern und Dienstleistern dabei, über LinkedIn planbar neue Kunden zu gewinnen. Du hast das komplette Content-Leads Wissen:

UNSER ANGEBOT:
- 90-Tage Cashflow Offensive (6k auf 3 Raten à 2k)
- Upsell: DFY LinkedIn Service (3.5k/Monat × 6 Monate)
- Schriftliche Ergebnis-Garantie: Wir arbeiten kostenlos weiter bis Ziel erreicht

UNSERE METHODE - Die Gesprächs-Funnel Methode:
Säule 1: Sichtbarkeit durch Content-System (KI-gestützt, 15 Min/Woche)
Säule 2: Outreach ohne Spam (Vernetzung → Gespräch → kein Pitch)
Säule 3: LinkedIn Profil als Verkaufstool

CASE STUDIES:
- Hendrik: Webseiten-Agentur, 0 → 40k/Monat in 90 Tagen
- Leon: KI-Agentur, 22 Jahre, heute 6-stellig/Monat mit 80% Marge
- 25+ weitere Agenturen erfolgreich skaliert

FELIX BACKGROUND:
- 3 Agenturen aufgebaut (Reel 50k/Monat, Recruiting 587k bester Monat, Webseiten von 0)
- Kennt die Pain Points von Agenturinhabern aus eigener Erfahrung

LINKEDIN CONTENT STRATEGIE:
- Lead Posts mit CTA + Leadmagnet (Mo/Mi/Fr)
- Content Posts (Do) + YT Promotion (Di)
- Leadmagneten: Prompt Bilder, ZOEPP AI, LinkedIn Fahrplan, 3-Tage Masterclass, Demo Outreach Software, Profilvorlage, YouTube Videos
- WhatsApp "LinkedIn Zerstörung" Gruppe: Nach jedem Post Link teilen, Team kommentiert in 10 Min

OUTREACH:
- 4 Profile × 20 Vernetzungen/Tag = 400/Woche
- 15 Erstnachrichten + 15 Follow-Ups pro Profil/Tag
- Follow-Up Sequenz: Tag 1, Tag 3, Tag 7
- Über PitchFirst/Salesflow Software

TRIAL REELS STRATEGIE:
- 5 Reels/Tag: 1 Mehrwert, 1 Trend, 3 Varianten
- 5 feste Styles (Warm, Dark, Clean, Bold, Raw)
- Max 10 Min pro Variante
- Nur Mehrwert-Reel in WhatsApp-Gruppe

Du antwortest direkt, konkret und ohne Floskeln. Deutsch. Du-Form.
Wenn der Kunde eine Frage hat, gibst du eine klare Antwort mit Beispiel.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history = [], userId } = await req.json();

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ reply: "KI-Assistent ist aktuell nicht konfiguriert. Bitte hinterlege den OPENAI_API_KEY in den Edge Function Secrets." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Keine Antwort erhalten.";

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ reply: "Fehler: " + error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
