import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncResult {
  synced: number;
  updated: number;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Internal Supabase client (this project)
    const internalSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await internalSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's account_id
    const { data: profile } = await internalSupabase
      .from('profiles')
      .select('account_id')
      .eq('id', user.id)
      .single();

    if (!profile?.account_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'No account found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // External Supabase client
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY');

    if (!externalUrl || !externalKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'External Supabase credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const externalSupabase = createClient(externalUrl, externalKey);

    // Parse request body for options
    let syncAll = false;
    let contactIds: string[] = [];
    
    try {
      const body = await req.json();
      syncAll = body.syncAll || false;
      contactIds = body.contactIds || [];
    } catch {
      // No body or invalid JSON - sync all by default
      syncAll = true;
    }

    // Get contacts to sync
    let query = internalSupabase
      .from('contacts')
      .select('*')
      .eq('account_id', profile.account_id);

    if (!syncAll && contactIds.length > 0) {
      query = query.in('id', contactIds);
    }

    const { data: contacts, error: contactsError } = await query;

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch contacts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Syncing ${contacts?.length || 0} contacts to external database`);

    const result: SyncResult = {
      synced: 0,
      updated: 0,
      errors: [],
    };

    // Sync each contact
    for (const contact of contacts || []) {
      try {
        // Include account_id since external DB has same trigger requiring it
        const externalContact = {
          external_id: contact.id,
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          account_id: contact.account_id,
        };

        // Check if contact already exists in external DB
        const { data: existing } = await externalSupabase
          .from('contacts')
          .select('id')
          .eq('external_id', contact.id)
          .maybeSingle();

        if (existing) {
          // Update existing contact
          const { error: updateError } = await externalSupabase
            .from('contacts')
            .update(externalContact)
            .eq('external_id', contact.id);

          if (updateError) {
            console.error(`Error updating contact ${contact.id}:`, updateError);
            result.errors.push(`Update failed for ${contact.email || contact.id}: ${updateError.message}`);
          } else {
            result.updated++;
          }
        } else {
          // Insert new contact
          const { error: insertError } = await externalSupabase
            .from('contacts')
            .insert(externalContact);

          if (insertError) {
            console.error(`Error inserting contact ${contact.id}:`, insertError);
            result.errors.push(`Insert failed for ${contact.email || contact.id}: ${insertError.message}`);
          } else {
            result.synced++;
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error syncing contact ${contact.id}:`, err);
        result.errors.push(`${contact.email || contact.id}: ${errorMessage}`);
      }
    }

    console.log(`Sync complete: ${result.synced} new, ${result.updated} updated, ${result.errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        total: contacts?.length || 0,
        ...result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
