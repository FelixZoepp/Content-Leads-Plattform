import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate via API key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      console.error('Missing API key');
      return new Response(JSON.stringify({ error: 'API key required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API key using secure hash-based function
    const { data: apiKeyData, error: keyError } = await supabase
      .rpc('validate_api_key', { p_token: apiKey });

    if (keyError || !apiKeyData || apiKeyData.length === 0) {
      console.error('Invalid API key:', keyError);
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { contact_id, slug, email, video_url } = body;

    console.log('Update lead video request:', { contact_id, slug, email, video_url: video_url?.substring(0, 50) });

    if (!video_url) {
      return new Response(JSON.stringify({ error: 'video_url is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!contact_id && !slug && !email) {
      return new Response(JSON.stringify({ 
        error: 'Either contact_id, slug, or email is required to identify the lead' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the contact
    let query = supabase
      .from('contacts')
      .select('id, first_name, last_name, slug, video_url')
      .eq('lead_type', 'outbound');

    if (contact_id) {
      query = query.eq('id', contact_id);
    } else if (slug) {
      query = query.eq('slug', slug);
    } else if (email) {
      query = query.eq('email', email);
    }

    const { data: contact, error: contactError } = await query.maybeSingle();

    if (contactError) {
      console.error('Error finding contact:', contactError);
      return new Response(JSON.stringify({ error: 'Error finding contact' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!contact) {
      return new Response(JSON.stringify({ error: 'Contact not found or not an outbound lead' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update the video_url
    const { error: updateError } = await supabase
      .from('contacts')
      .update({ video_url })
      .eq('id', contact.id);

    if (updateError) {
      console.error('Error updating contact:', updateError);
      return new Response(JSON.stringify({ error: 'Error updating contact' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Updated video_url for contact ${contact.id} (${contact.first_name} ${contact.last_name})`);

    return new Response(JSON.stringify({
      success: true,
      contact_id: contact.id,
      name: `${contact.first_name} ${contact.last_name}`,
      slug: contact.slug,
      video_url
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in update-lead-video:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
