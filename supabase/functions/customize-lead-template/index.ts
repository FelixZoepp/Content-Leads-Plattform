import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Du bist ein Experte für Lead-Generierung und Landing Pages. Deine Aufgabe ist es, eine Lead-Seiten-Vorlage basierend auf den Anweisungen des Benutzers anzupassen.

Die Vorlage verwendet folgende Variablen, die IMMER beibehalten werden müssen:
- {{first_name}} - Vorname des Leads
- {{last_name}} - Nachname des Leads  
- {{company}} - Firmenname des Leads
- {{video_url}} - URL des personalisierten Videos
- {{pitch_video_url}} - URL des Pitch-Videos

WICHTIG:
- Behalte IMMER die Variablen {{first_name}}, {{company}} etc. in den Texten bei
- Passe die Texte so an, dass sie zur gewünschten Branche/Zielgruppe passen
- Erstelle überzeugende, verkaufsstarke Texte
- Behalte die Struktur bei (Header, Hero, Coaching-Säulen, Vergleich, etc.)

Antworte NUR mit einem JSON-Objekt im folgenden Format:
{
  "header_logo_text": "Firmenname",
  "header_logo_accent": "Akzent-Teil des Logos",
  "header_cta_text": "{{first_name}}, lass uns sprechen!",
  "hero_headline": "Hey {{first_name}}, ...",
  "hero_subheadline": "Text mit {{company}} Variable...",
  "hero_cta_text": "CTA Button Text",
  "hero_video_caption": "Text mit {{first_name}}...",
  "coaching_badge": "Badge Text",
  "coaching_headline": "Headline",
  "coaching_subheadline": "Text mit {{company}}...",
  "pillar1_title": "Säule 1 Titel",
  "pillar1_subtitle": "Untertitel",
  "pillar1_description": "Beschreibung",
  "pillar1_items": ["Punkt 1", "Punkt 2", "Punkt 3", "Punkt 4", "Punkt 5"],
  "pillar2_title": "Säule 2 Titel",
  "pillar2_subtitle": "Untertitel",
  "pillar2_description": "Beschreibung",
  "pillar2_items": ["Punkt 1", "Punkt 2", "Punkt 3", "Punkt 4", "Punkt 5"],
  "combined_headline": "Kombinierter Effekt Headline",
  "combined_text": "Beschreibung des kombinierten Effekts",
  "comparison_badge": "Badge Text",
  "comparison_headline": "Headline",
  "comparison_subheadline": "Subheadline",
  "others_title": "Andere Anbieter",
  "others_items": ["Nachteil 1", "Nachteil 2", "Nachteil 3", "Nachteil 4", "Nachteil 5"],
  "us_title": "Unser Angebot",
  "us_items": ["Vorteil 1", "Vorteil 2", "Vorteil 3", "Vorteil 4", "Vorteil 5"],
  "primary_color": "#06b6d4",
  "secondary_color": "#a855f7",
  "background_color": "#0f172a",
  "text_color": "#f8fafc",
  "accent_color": "#f59e0b",
  "footer_company_name": "Firmenname",
  "footer_tagline": "Tagline"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, currentTemplate } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const userMessage = currentTemplate 
      ? `Aktuelle Vorlage:\n${JSON.stringify(currentTemplate, null, 2)}\n\nAnweisungen des Benutzers:\n${prompt}`
      : `Erstelle eine Lead-Seiten-Vorlage basierend auf diesen Anweisungen:\n${prompt}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit erreicht. Bitte versuche es später erneut." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Zahlungserforderlich. Bitte füge Credits hinzu." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the response
    let template;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      template = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content);
      throw new Error("Failed to parse AI response as JSON");
    }

    return new Response(JSON.stringify({ template }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
