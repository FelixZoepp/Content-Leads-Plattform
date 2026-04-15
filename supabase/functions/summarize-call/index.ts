import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, transcript } = await req.json();

    if (!sessionId || !transcript) {
      throw new Error('sessionId and transcript are required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating call summary for session:', sessionId);

    // Call Lovable AI for summary
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Du bist ein AI-Assistent für Sales-Call-Analyse. Analysiere das folgende Verkaufsgespräch und erstelle eine strukturierte Zusammenfassung.

Antworte im folgenden JSON-Format:
{
  "summary": "Eine kurze Zusammenfassung des gesamten Gesprächs (2-3 Sätze)",
  "key_points": ["Hauptpunkt 1", "Hauptpunkt 2", "Hauptpunkt 3"],
  "action_items": ["Handlung 1", "Handlung 2"],
  "sentiment": "positive" | "neutral" | "negative"
}

Sentiment-Kriterien:
- positive: Kunde war interessiert, freundlich, vereinbart Termin
- neutral: Höflich aber unverbindlich, kein klares Interesse
- negative: Kein Interesse, ablehnend, genervt`
          },
          {
            role: 'user',
            content: `Transkript des Sales-Calls:\n\n${transcript}\n\nBitte analysiere dieses Gespräch und erstelle die Zusammenfassung im JSON-Format.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_call_summary",
              description: "Erstelle eine strukturierte Zusammenfassung des Sales-Calls",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "Kurze Zusammenfassung (2-3 Sätze)"
                  },
                  key_points: {
                    type: "array",
                    items: { type: "string" },
                    description: "Liste der Hauptpunkte aus dem Gespräch"
                  },
                  action_items: {
                    type: "array",
                    items: { type: "string" },
                    description: "Liste der Handlungsschritte"
                  },
                  sentiment: {
                    type: "string",
                    enum: ["positive", "neutral", "negative"],
                    description: "Sentiment des Gesprächs"
                  }
                },
                required: ["summary", "key_points", "action_items", "sentiment"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_call_summary" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limits exceeded, please try again later');
      }
      if (response.status === 402) {
        throw new Error('Payment required, please add funds to your Lovable AI workspace');
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data));

    // Extract the function call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      throw new Error('No valid function call in AI response');
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log('Parsed summary:', result);

    // Update call_sessions with summary
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First, get the session to find deal_id, user_id, and contact_id
    const { data: session, error: sessionError } = await supabase
      .from('call_sessions')
      .select('deal_id, user_id, account_id, duration_seconds')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('Error fetching session:', sessionError);
      throw sessionError;
    }

    // Get contact_id from the deal
    let contactId = null;
    if (session.deal_id) {
      const { data: deal } = await supabase
        .from('deals')
        .select('contact_id')
        .eq('id', session.deal_id)
        .single();
      contactId = deal?.contact_id;
    }

    // Update call_sessions with summary
    const { error: updateError } = await supabase
      .from('call_sessions')
      .update({
        transcript,
        summary: result.summary,
        key_points: result.key_points,
        action_items: result.action_items,
        sentiment: result.sentiment,
        summary_generated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
      throw updateError;
    }

    // Create an activity entry for the timeline
    if (contactId && session.user_id) {
      // Build note with summary, key points and action items
      const noteLines = [
        `📝 **KI-Zusammenfassung:**\n${result.summary}`,
      ];
      
      if (result.key_points && result.key_points.length > 0) {
        noteLines.push(`\n📌 **Hauptpunkte:**\n${result.key_points.map((p: string) => `• ${p}`).join('\n')}`);
      }
      
      if (result.action_items && result.action_items.length > 0) {
        noteLines.push(`\n✅ **Nächste Schritte:**\n${result.action_items.map((a: string) => `• ${a}`).join('\n')}`);
      }
      
      const sentimentEmoji = result.sentiment === 'positive' ? '😊' : result.sentiment === 'negative' ? '😞' : '😐';
      noteLines.push(`\n${sentimentEmoji} Stimmung: ${result.sentiment === 'positive' ? 'Positiv' : result.sentiment === 'negative' ? 'Negativ' : 'Neutral'}`);

      const { error: activityError } = await supabase
        .from('activities')
        .insert({
          contact_id: contactId,
          deal_id: session.deal_id,
          user_id: session.user_id,
          account_id: session.account_id,
          type: 'call',
          outcome: result.sentiment === 'positive' ? 'interested' : result.sentiment === 'negative' ? 'not_interested' : 'reached',
          duration_min: session.duration_seconds ? Math.ceil(session.duration_seconds / 60) : null,
          note: noteLines.join('')
        });

      if (activityError) {
        console.error('Error creating activity:', activityError);
        // Don't throw - activity is secondary to the main summary
      } else {
        console.log('Activity created for contact:', contactId);
      }
    }

    console.log('Summary saved successfully');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in summarize-call:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});