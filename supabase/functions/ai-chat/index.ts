import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Du bist die Content-Leads AI – der KI-Assistent der Content-Leads GmbH.
Du hilfst Agenturinhabern, Beratern und Dienstleistern über LinkedIn planbar neue Kunden zu gewinnen.

UNSER ANGEBOT:
- 90-Tage Cashflow Offensive (6k auf 3 Raten à 2k)
- Upsell: DFY LinkedIn Service (3.5k/Monat × 6 Monate)
- Schriftliche Ergebnis-Garantie: Wir arbeiten kostenlos weiter bis Ziel erreicht

METHODE - Die Gesprächs-Funnel Methode:
1. Sichtbarkeit durch Content-System (KI-gestützt, 15 Min/Woche)
2. Outreach ohne Spam (Vernetzung → Gespräch → kein Pitch)
3. LinkedIn Profil als Verkaufstool

CASE STUDIES:
- Hendrik: Webseiten-Agentur, 0→40k/Monat in 90 Tagen
- Leon: KI-Agentur, 22 Jahre, 6-stellig/Monat, 80% Marge
- 25+ Agenturen skaliert

FELIX BACKGROUND:
- Reel-Agentur: 50k/Monat Cashflow
- Recruiting-Agentur: 587k bester Monat
- Webseiten-Agentur: Von 0 aufgebaut

CONTENT STRATEGIE:
- 5 Posts/Woche: 2x Content + 3x Lead Post mit CTA
- Leadmagneten: Prompt Bilder, ZOEPP AI, LinkedIn Fahrplan, Masterclass, Outreach Demo, Profilvorlage
- WhatsApp "LinkedIn Zerstörung": Nach jedem Post Link teilen, Team kommentiert in 10 Min

OUTREACH:
- 4 Profile × 20 Vernetzungen/Tag = 400/Woche
- 15 Erst + 15 Follow-Ups pro Profil/Tag
- FU-Sequenz: Tag 1, Tag 3, Tag 7

TRIAL REELS: 5/Tag (1 Mehrwert, 1 Trend, 3 Varianten in 5 Styles)

Du antwortest direkt, konkret, ohne Floskeln. Deutsch. Du-Form.
Wenn der Kunde fragt, gibst du klare Antworten mit konkreten Beispielen.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, history = [], userId, tenantId } = await req.json();

    // Try Anthropic first, then OpenAI
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!anthropicKey && !openaiKey) {
      return new Response(
        JSON.stringify({ reply: "Content-Leads AI ist noch nicht konfiguriert. Bitte ANTHROPIC_API_KEY oder OPENAI_API_KEY in Supabase Secrets hinterlegen." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load tenant context
    let tenantContext = "";
    if (tenantId) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") || "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
        );
        const { data: tenant } = await supabase
          .from("tenants").select("*").eq("id", tenantId).single();
        if (tenant) {
          tenantContext = `\n\nKONTEXT DES KUNDEN:\nFirma: ${tenant.company_name || "k.A."}\nBranche: ${tenant.industry || "k.A."}\nAngebot: ${tenant.current_offer || "k.A."}\nUmsatz: ${tenant.revenue_recurring || "k.A."}€/Monat\nZiel: ${tenant.goal_revenue_monthly || "k.A."}€/Monat`;
        }
      } catch { /* ignore tenant fetch errors */ }
    }

    const fullSystemPrompt = SYSTEM_PROMPT + tenantContext;
    let reply = "";

    if (anthropicKey) {
      // Use Anthropic API
      const messages = [
        ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
        { role: "user", content: message },
      ];

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20241022",
          max_tokens: 2000,
          system: fullSystemPrompt,
          messages,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Anthropic: ${response.status} - ${err.substring(0, 200)}`);
      }

      const data = await response.json();
      reply = data.content?.[0]?.text || "Keine Antwort.";
    } else {
      // Fallback: OpenAI
      const messages = [
        { role: "system", content: fullSystemPrompt },
        ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
        { role: "user", content: message },
      ];

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      reply = data.choices?.[0]?.message?.content || "Keine Antwort.";
    }

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("ai-chat error:", error);
    return new Response(
      JSON.stringify({ reply: "Fehler: " + error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
