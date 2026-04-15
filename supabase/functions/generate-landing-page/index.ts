import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Du erstellst personalisierte Landing Pages für Leads mit dem Ziel, einen Termin zu vereinbaren. Die Seite enthält IMMER ein personalisiertes KI-Video und einen Terminbuchungs-CTA.

WICHTIG: Verwende diese Variablen für die Personalisierung:
- {{firstName}} - Vorname des Leads
- {{lastName}} - Nachname des Leads  
- {{company}} - Firmenname des Leads (Zielunternehmen)
- {{position}} - Position/Rolle des Leads
- {{senderCompany}} - Name des ABSENDER-Unternehmens (dein Kunde/Nutzer der Software)

KRITISCH: Der Absender-Firmenname {{senderCompany}} MUSS prominent auf der Seite erscheinen:
- Im Footer als companyName
- Im Offer-Bereich als Absender ("Was wir bei {{senderCompany}} für Sie tun können")
- Optional in der Subheadline

Die Landing Page hat IMMER diese feste Struktur:
1. Hero-Bereich mit personalisierter Ansprache + KI-Video
2. 3 konkrete Vorteile/Mehrwerte für den Lead
3. Kurze Erklärung des Angebots (MIT Absender-Firmenname!)
4. Terminbuchungs-CTA
5. Footer MIT Absender-Firmenname

Antworte IMMER mit einem validen JSON-Objekt:

{
  "hero": {
    "headline": "Persönliche Ansprache mit {{firstName}} (max 8 Wörter)",
    "subheadline": "1-2 Sätze warum {{company}} profitieren wird - optional mit Verweis auf {{senderCompany}}",
    "videoPlaceholder": true
  },
  "benefits": [
    {
      "icon": "CheckCircle",
      "title": "Konkreter Vorteil 1",
      "description": "Kurze Beschreibung mit Bezug auf {{company}}"
    },
    {
      "icon": "Zap",
      "title": "Konkreter Vorteil 2", 
      "description": "Kurze Beschreibung"
    },
    {
      "icon": "TrendingUp",
      "title": "Konkreter Vorteil 3",
      "description": "Kurze Beschreibung"
    }
  ],
  "offer": {
    "title": "Was wir bei {{senderCompany}} für {{company}} tun können",
    "description": "2-3 Sätze zum Angebot von {{senderCompany}}",
    "bulletPoints": ["Leistung 1", "Leistung 2", "Leistung 3"]
  },
  "cta": {
    "headline": "Lassen Sie uns sprechen, {{firstName}}",
    "description": "Kurzer Text zur Terminvereinbarung mit {{senderCompany}}",
    "buttonText": "Termin vereinbaren",
    "buttonLink": "#kalender"
  },
  "footer": {
    "companyName": "{{senderCompany}}",
    "tagline": "Kurzer Slogan passend zum Angebot"
  },
  "suggestedColors": {
    "primary": "#3B82F6",
    "secondary": "#1E40AF",
    "accent": "#F59E0B",
    "background": "#FFFFFF",
    "text": "#1F2937"
  },
  "suggestedName": "landing-page-name"
}

Wähle passende Lucide Icons: CheckCircle, Zap, Shield, Star, Clock, Users, Award, Target, TrendingUp, Rocket, BarChart

Der Prompt beschreibt den KONTEXT (Branche, Angebot, Zielgruppe, ABSENDER-FIRMENNAME). Passe die Inhalte entsprechend an, aber behalte IMMER die Struktur: Personalisierung + Video + Termin-CTA + ABSENDER-FIRMENNAME im Footer und Offer.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { prompt, existingContent } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    let userMessage = prompt;
    if (existingContent) {
      userMessage = `Basierend auf dem vorherigen Content, bitte überarbeite/verbessere folgendes:\n\nUrsprünglicher Prompt: ${prompt}\n\nAktueller Content: ${JSON.stringify(existingContent)}\n\nNeue Anweisung: ${prompt}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
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
        return new Response(JSON.stringify({ error: "Zahlungspflichtig. Bitte lade dein Guthaben auf." }), {
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
      throw new Error('No content generated');
    }

    // Parse JSON from response (handle markdown code blocks)
    let parsedContent;
    try {
      // Remove markdown code blocks if present
      let jsonString = content;
      if (content.includes('```json')) {
        jsonString = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (content.includes('```')) {
        jsonString = content.replace(/```\n?/g, '');
      }
      parsedContent = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse generated content');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      content: parsedContent 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
