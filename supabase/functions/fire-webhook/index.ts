import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event_type, payload } = await req.json();

    if (!event_type) {
      return new Response(JSON.stringify({ error: "event_type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get active webhook endpoints for this event type
    const { data: endpoints, error: fetchError } = await supabase
      .from("webhook_endpoints")
      .select("*")
      .eq("event_type", event_type)
      .eq("is_active", true);

    if (fetchError) throw fetchError;
    if (!endpoints || endpoints.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No active webhooks for this event" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enrichedPayload = {
      event: event_type,
      timestamp: new Date().toISOString(),
      data: payload || {},
    };

    const results = [];

    for (const endpoint of endpoints) {
      let statusCode: number | null = null;
      let responseBody: string | null = null;
      let errorMessage: string | null = null;

      try {
        const response = await fetch(endpoint.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(enrichedPayload),
        });

        statusCode = response.status;
        responseBody = await response.text().catch(() => null);
      } catch (err: any) {
        errorMessage = err.message || "Fetch failed";
      }

      // Log the webhook attempt
      await supabase.from("webhook_log").insert({
        endpoint_id: endpoint.id,
        event_type,
        payload: enrichedPayload,
        status_code: statusCode,
        response_body: responseBody?.substring(0, 1000),
        error_message: errorMessage,
      });

      results.push({
        url: endpoint.url,
        status: statusCode,
        error: errorMessage,
      });
    }

    return new Response(JSON.stringify({ sent: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
