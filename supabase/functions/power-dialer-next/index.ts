import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user from request
    const authHeader = req.headers.get('Authorization');
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '') || ''
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching next lead for user:', user.id);

    // Get next lead from cold_call_queue
    // Filter by owner if user is setter, show all if admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // First try to get hot leads (score >= 70) or recently online leads - they get priority
    let hotQuery = supabase
      .from('cold_call_queue' as any)
      .select('*')
      .gte('lead_score', 70)
      .order('lead_score', { ascending: false })
      .limit(1);

    if (profile?.role === 'setter') {
      hotQuery = hotQuery.eq('owner_user_id', user.id);
    }

    let { data, error } = await hotQuery;

    // If no hot leads, fall back to normal queue
    if (!error && (!data || data.length === 0)) {
      let query = supabase
        .from('cold_call_queue' as any)
        .select('*')
        .limit(1);

      if (profile?.role === 'setter') {
        query = query.eq('owner_user_id', user.id);
      }

      const result = await query;
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Error fetching next lead:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Next lead:', data?.[0] || null);

    return new Response(JSON.stringify(data?.[0] || null), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
