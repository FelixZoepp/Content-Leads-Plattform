import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * TwiML Voice Handler für ausgehende Anrufe
 * 
 * Twilio ruft diesen Endpoint auf wenn ein Anruf initiiert wird
 * und erwartet TwiML als Antwort.
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse form data from Twilio
    const formData = await req.formData();
    const to = formData.get('To') as string;
    const from = formData.get('From') as string;
    const callSid = formData.get('CallSid') as string;

    console.log('Twilio Voice webhook:', { to, from, callSid });

    // Get the caller ID from secrets
    const callerNumber = Deno.env.get('TWILIO_PHONE_NUMBER') || from;

    // Generate TwiML to dial the number
    let twiml: string;

    if (to && to.startsWith('+')) {
      // Outbound call to a phone number
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${callerNumber}" timeout="30" record="record-from-answer">
    <Number>${to}</Number>
  </Dial>
</Response>`;
    } else if (to && to.startsWith('client:')) {
      // Call to another browser client
      const clientId = to.replace('client:', '');
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${callerNumber}">
    <Client>${clientId}</Client>
  </Dial>
</Response>`;
    } else {
      // Invalid destination
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="de-DE">Ungültige Rufnummer</Say>
  <Hangup/>
</Response>`;
    }

    return new Response(twiml, {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/xml' 
      },
    });

  } catch (error: any) {
    console.error('Error in Twilio voice handler:', error);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="de-DE">Ein Fehler ist aufgetreten</Say>
  <Hangup/>
</Response>`;

    return new Response(errorTwiml, {
      status: 200, // Twilio expects 200 even for errors
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/xml' 
      },
    });
  }
});