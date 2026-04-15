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

    const body = await req.json();
    const { contact_id, outcome, message, new_stage } = body;

    if (!contact_id) {
      return new Response(JSON.stringify({ error: 'contact_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Logging call for contact:', contact_id, 'outcome:', outcome);

    // 1. Insert activity
    const { error: activityError } = await supabase
      .from('activities')
      .insert([{
        contact_id,
        user_id: user.id,
        type: 'call',
        outcome,
        note: message || null,
        timestamp: new Date().toISOString(),
      }]);

    if (activityError) {
      console.error('Error creating activity:', activityError);
      return new Response(JSON.stringify({ error: activityError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Update stage if provided
    if (new_stage) {
      const { error: stageError } = await supabase
        .from('contacts')
        .update({ stage: new_stage })
        .eq('id', contact_id);

      if (stageError) {
        console.error('Error updating stage:', stageError);
        return new Response(JSON.stringify({ error: stageError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log stage change activity
      await supabase
        .from('activities')
        .insert([{
          contact_id,
          user_id: user.id,
          type: 'note',
          note: `Stage → ${new_stage}`,
          timestamp: new Date().toISOString(),
        }]);
    }

    // 3. Refresh materialized view
    await supabase.rpc('refresh_contact_last_activity' as any);

    // 4. Get next lead
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    let query = supabase
      .from('cold_call_queue' as any)
      .select('*')
      .limit(1);

    if (profile?.role === 'setter') {
      query = query.eq('owner_user_id', user.id);
    }

    const { data: nextLead, error: nextError } = await query;

    if (nextError) {
      console.error('Error fetching next lead:', nextError);
      return new Response(JSON.stringify({ error: nextError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Call logged successfully, next lead:', nextLead?.[0] || null);

    return new Response(JSON.stringify({ ok: true, next: nextLead?.[0] || null }), {
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
