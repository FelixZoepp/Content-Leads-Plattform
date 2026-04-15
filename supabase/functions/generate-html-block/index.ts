import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY not set");

    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Du bist ein HTML/CSS-Experte der eigenständige HTML-Blöcke für Landing Pages erstellt.

Regeln:
- Nur inline HTML + CSS ausgeben (kein JavaScript, kein <script>, kein <style> Tag)
- Alle Styles als inline style="" Attribute
- Responsive: funktioniert auf Mobile und Desktop
- Dunkles Design: Hintergrund transparent, helle Textfarben (#ffffff, #e2e8f0, #94a3b8)
- Akzentfarbe: #6C5CE7 (Lila)
- Modernes, professionelles Design
- Unterstütze Variablen wie {{lead.firstName}}, {{lead.company}}, {{sender.calendarLink}}
- Gib NUR den HTML-Code aus, keine Erklärung, kein Markdown

Beispiel-Variablen: {{lead.firstName}}, {{lead.lastName}}, {{lead.company}}, {{lead.position}}, {{sender.name}}, {{sender.calendarLink}}`
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error: ${err}`);
    }

    const data = await response.json();
    let html = data.choices?.[0]?.message?.content || "";

    // Clean up: remove markdown code fences if present
    html = html.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "").trim();

    return new Response(
      JSON.stringify({ html }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[GENERATE-HTML-BLOCK] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
