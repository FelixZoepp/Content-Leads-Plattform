import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { label } = await req.json();
    
    if (!label || typeof label !== 'string' || label.trim() === '') {
      return new Response(
        JSON.stringify({ success: false, error: 'Label is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a secure random token (64 chars)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let plainToken = '';
    const randomBytes = new Uint8Array(64);
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < 64; i++) {
      plainToken += chars[randomBytes[i] % chars.length];
    }

    // Hash the token using SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(plainToken);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Store the prefix for display
    const tokenPrefix = plainToken.substring(0, 8) + '...';

    // Insert the API key with hash (not plaintext)
    const { data: apiKeyData, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        label: label.trim(),
        token_hash: tokenHash,
        token_prefix: tokenPrefix,
        active: true,
      })
      .select('id, label, token_prefix, active, created_at')
      .single();

    if (insertError) {
      console.error('Error creating API key:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create API key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the plaintext token ONLY ONCE - it cannot be retrieved again
    return new Response(
      JSON.stringify({
        success: true,
        api_key: {
          ...apiKeyData,
          token: plainToken, // Only returned once!
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Create API key error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
