import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generiert ein Twilio Access Token für Browser-basierte Telefonie
 * 
 * Liest Twilio-Credentials aus der account_integrations Tabelle:
 * - twilio_account_sid
 * - twilio_auth_token
 * - twilio_phone_number
 * - twilio_api_key_sid
 * - twilio_api_key_secret
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's account
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id, name')
      .eq('id', user.id)
      .single();

    if (!profile?.account_id) {
      return new Response(JSON.stringify({ error: 'No account found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Twilio credentials from account_integrations
    const { data: integration, error: integrationError } = await supabase
      .from('account_integrations')
      .select('twilio_account_sid, twilio_auth_token, twilio_phone_number, twilio_api_key_sid, twilio_api_key_secret, twilio_twiml_app_sid')
      .eq('account_id', profile.account_id)
      .maybeSingle();

    if (integrationError) {
      console.error('Error fetching integration:', integrationError);
    }

    // Try DB credentials first, fallback to env vars
    const accountSid = integration?.twilio_account_sid || Deno.env.get('TWILIO_ACCOUNT_SID');
    const authTokenValue = integration?.twilio_auth_token || Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = integration?.twilio_phone_number || Deno.env.get('TWILIO_PHONE_NUMBER');
    const apiKeySid = integration?.twilio_api_key_sid || Deno.env.get('TWILIO_API_KEY_SID');
    const apiKeySecret = integration?.twilio_api_key_secret || Deno.env.get('TWILIO_API_KEY_SECRET');

    console.log('Twilio credentials check:', {
      hasAccountSid: !!accountSid,
      hasAuthToken: !!authTokenValue,
      hasApiKeySid: !!apiKeySid,
      hasApiKeySecret: !!apiKeySecret,
      hasPhoneNumber: !!twilioPhoneNumber,
      source: integration?.twilio_account_sid ? 'database' : 'env'
    });

    if (!accountSid || !authTokenValue) {
      return new Response(JSON.stringify({ 
        error: 'Twilio credentials not configured',
        details: 'Bitte gib Account SID und Auth Token im Onboarding ein.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!apiKeySid || !apiKeySecret) {
      return new Response(JSON.stringify({ 
        error: 'Twilio API Key not configured',
        details: 'Bitte erstelle einen API Key unter https://console.twilio.com/us1/account/keys-credentials/api-keys und gib SID und Secret ein.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get or create TwiML App SID
    let twimlAppSid = integration?.twilio_twiml_app_sid;
    const voiceUrl = `${supabaseUrl}/functions/v1/twilio-voice`;

    // If no TwiML App exists, create one
    if (!twimlAppSid) {
      console.log('Creating TwiML App...');
      
      const createAppResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Applications.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authTokenValue}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            FriendlyName: 'Lovable Voice App',
            VoiceUrl: voiceUrl,
            VoiceMethod: 'POST',
          }).toString(),
        }
      );

      if (!createAppResponse.ok) {
        const errorText = await createAppResponse.text();
        console.error('Failed to create TwiML App:', errorText);
        return new Response(JSON.stringify({ 
          error: 'Twilio API Fehler',
          details: 'Konnte TwiML App nicht erstellen. Prüfe deine Account SID und Auth Token.'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const appData = await createAppResponse.json();
      twimlAppSid = appData.sid;

      // Save the TwiML App SID
      await supabase
        .from('account_integrations')
        .upsert({
          account_id: profile.account_id,
          twilio_twiml_app_sid: twimlAppSid,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'account_id' });

      console.log('TwiML App created:', twimlAppSid);
    } else {
      // Update existing TwiML App to ensure URL is correct
      console.log('Updating TwiML App URL:', twimlAppSid);
      
      try {
        const updateAppResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Applications/${twimlAppSid}.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${accountSid}:${authTokenValue}`),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              VoiceUrl: voiceUrl,
              VoiceMethod: 'POST',
            }).toString(),
          }
        );
        
        if (updateAppResponse.ok) {
          console.log('TwiML App URL updated successfully');
        } else {
          console.warn('Failed to update TwiML App URL:', await updateAppResponse.text());
        }
      } catch (updateError) {
        console.warn('Error updating TwiML App:', updateError);
      }
    }

    // Generate Access Token using Twilio's API
    const identity = user.id;
    const ttl = 3600; // 1 hour

    // Create JWT header and payload
    const header = {
      typ: 'JWT',
      alg: 'HS256',
      cty: 'twilio-fpa;v=1'
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      jti: `${apiKeySid}-${now}`,
      iss: apiKeySid,
      sub: accountSid,
      nbf: now,
      exp: now + ttl,
      grants: {
        identity: identity,
        voice: {
          incoming: { allow: true },
          outgoing: { application_sid: twimlAppSid }
        }
      }
    };

    // Base64URL encode
    const base64UrlEncode = (obj: any) => {
      const jsonStr = JSON.stringify(obj);
      const base64 = btoa(jsonStr);
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };

    const headerEncoded = base64UrlEncode(header);
    const payloadEncoded = base64UrlEncode(payload);

    // Create signature using HMAC-SHA256 with API Key Secret
    const encoder = new TextEncoder();
    const keyData = encoder.encode(apiKeySecret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureData = encoder.encode(`${headerEncoded}.${payloadEncoded}`);
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, signatureData);
    const signatureArray = new Uint8Array(signatureBuffer);
    const signatureBase64 = btoa(String.fromCharCode(...signatureArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const accessToken = `${headerEncoded}.${payloadEncoded}.${signatureBase64}`;

    console.log('Generated Twilio token for user:', user.id);

    return new Response(JSON.stringify({ 
      token: accessToken,
      identity: identity,
      callerNumber: twilioPhoneNumber || '+1234567890'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error generating Twilio token:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate token',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
