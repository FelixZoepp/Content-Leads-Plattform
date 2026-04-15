import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-placetel-signature, x-sipgate-signature",
};

interface PlacetelEvent {
  event: string;
  call_id: string;
  from: string;
  to: string;
  direction: string;
  duration?: number;
  recording_url?: string;
}

interface SipgateEvent {
  event: string;
  callId: string;
  from: string;
  to: string;
  direction: string;
  duration?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const provider = url.searchParams.get("provider");
  const accountId = url.searchParams.get("account_id");
  const webhookSecret = url.searchParams.get("secret");

  console.log(`Telephony webhook received: provider=${provider}, account_id=${accountId}`);

  if (!provider || !accountId) {
    console.error("Missing required parameters");
    return new Response(
      JSON.stringify({ error: "Missing provider or account_id" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate webhook secret for the account
    const { data: integration, error: integrationError } = await supabase
      .from("account_integrations")
      .select("telephony_webhook_secret, telephony_provider")
      .eq("account_id", accountId)
      .single();

    if (integrationError || !integration) {
      console.error("Account not found:", integrationError);
      return new Response(
        JSON.stringify({ error: "Invalid account" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate secret if configured
    if (integration.telephony_webhook_secret && integration.telephony_webhook_secret !== webhookSecret) {
      console.error("Invalid webhook secret");
      return new Response(
        JSON.stringify({ error: "Invalid webhook secret" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the webhook payload
    let body: any;
    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
    } else {
      body = await req.text();
      try {
        body = JSON.parse(body);
      } catch {
        // Keep as string if not JSON
      }
    }

    console.log(`Webhook payload from ${provider}:`, JSON.stringify(body).substring(0, 500));

    // Normalize event data based on provider
    let eventData: {
      event_type: string;
      call_id: string | null;
      from_number: string | null;
      to_number: string | null;
      status: string | null;
      duration_seconds: number | null;
      recording_url: string | null;
    };

    switch (provider.toLowerCase()) {
      case "placetel":
        eventData = normalizeePlacetelEvent(body);
        break;
      case "sipgate":
        eventData = normalizeSipgateEvent(body);
        break;
      default:
        // Generic fallback
        eventData = {
          event_type: body.event || body.type || "unknown",
          call_id: body.call_id || body.callId || null,
          from_number: body.from || body.caller || null,
          to_number: body.to || body.callee || null,
          status: body.status || body.state || null,
          duration_seconds: body.duration ? parseInt(body.duration) : null,
          recording_url: body.recording_url || body.recordingUrl || null,
        };
    }

    // Store the webhook event
    const { data: insertedEvent, error: insertError } = await supabase
      .from("telephony_webhook_events")
      .insert({
        account_id: accountId,
        provider: provider.toLowerCase(),
        event_type: eventData.event_type,
        call_id: eventData.call_id,
        from_number: eventData.from_number,
        to_number: eventData.to_number,
        status: eventData.status,
        duration_seconds: eventData.duration_seconds,
        recording_url: eventData.recording_url,
        raw_payload: body,
        processed: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error storing webhook event:", insertError);
      throw insertError;
    }

    console.log(`Stored webhook event: ${insertedEvent.id}`);

    // Mark webhook as verified if this is the first successful event
    if (!integration.telephony_webhook_secret) {
      // Update to mark webhook as verified
      await supabase
        .from("account_integrations")
        .update({
          telephony_webhook_verified: true,
          telephony_webhook_verified_at: new Date().toISOString(),
        })
        .eq("account_id", accountId);
    }

    // Try to match the call to a contact/deal based on phone number
    await matchCallToContact(supabase, accountId, eventData);

    return new Response(
      JSON.stringify({ success: true, event_id: insertedEvent.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Telephony webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function normalizeePlacetelEvent(body: any) {
  // Placetel event types: call_started, call_answered, call_ended, recording_ready
  return {
    event_type: body.event || body.type || "unknown",
    call_id: body.call_id || body.uuid || null,
    from_number: body.from || body.caller_id || null,
    to_number: body.to || body.called_id || null,
    status: body.status || body.state || null,
    duration_seconds: body.duration ? parseInt(body.duration) : null,
    recording_url: body.recording_url || null,
  };
}

function normalizeSipgateEvent(body: any) {
  // Sipgate event types: newCall, answer, hangup
  return {
    event_type: body.event || "unknown",
    call_id: body.callId || body.xcid || null,
    from_number: body.from || null,
    to_number: body.to || null,
    status: body.cause || body.hangupCause || null,
    duration_seconds: body.duration ? parseInt(body.duration) : null,
    recording_url: null, // Sipgate handles recordings differently
  };
}

async function matchCallToContact(supabase: any, accountId: string, eventData: any) {
  if (!eventData.from_number && !eventData.to_number) return;

  try {
    // Normalize phone numbers (remove spaces, add country code if missing)
    const searchNumber = (eventData.from_number || eventData.to_number || "")
      .replace(/\s/g, "")
      .replace(/^0/, "+49");

    // Try to find a matching contact
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, first_name, last_name")
      .eq("account_id", accountId)
      .or(`phone.ilike.%${searchNumber.slice(-9)}%,mobile.ilike.%${searchNumber.slice(-9)}%`)
      .limit(1);

    if (contacts && contacts.length > 0) {
      console.log(`Matched call to contact: ${contacts[0].first_name} ${contacts[0].last_name}`);
      
      // Update the webhook event with the matched contact
      await supabase
        .from("telephony_webhook_events")
        .update({ processed: true })
        .eq("call_id", eventData.call_id);
    }
  } catch (error) {
    console.error("Error matching call to contact:", error);
  }
}
