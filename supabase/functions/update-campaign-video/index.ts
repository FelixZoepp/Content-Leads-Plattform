import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate via API key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API key
    const { data: apiKeyData, error: keyError } = await supabase
      .rpc('validate_api_key', { p_token: apiKey });

    if (keyError || !apiKeyData || apiKeyData.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { campaign_id, campaign_name, video_url } = body;

    console.log('Update campaign video request:', { campaign_id, campaign_name, video_url: video_url?.substring(0, 50) });

    if (!video_url) {
      return new Response(JSON.stringify({ error: 'video_url is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!campaign_id && !campaign_name) {
      return new Response(JSON.stringify({ 
        error: 'Either campaign_id or campaign_name is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the campaign
    let query = supabase
      .from('campaigns')
      .select('id, name, pitch_video_url');

    if (campaign_id) {
      query = query.eq('id', campaign_id);
    } else if (campaign_name) {
      query = query.ilike('name', campaign_name);
    }

    const { data: campaign, error: campaignError } = await query.maybeSingle();

    if (campaignError) {
      console.error('Error finding campaign:', campaignError);
      return new Response(JSON.stringify({ error: 'Error finding campaign' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update the pitch_video_url (used as the explainer video)
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({ pitch_video_url: video_url })
      .eq('id', campaign.id);

    if (updateError) {
      console.error('Error updating campaign:', updateError);
      return new Response(JSON.stringify({ error: 'Error updating campaign' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Updated explainer video for campaign ${campaign.id} (${campaign.name})`);

    return new Response(JSON.stringify({
      success: true,
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      video_url
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in update-campaign-video:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
