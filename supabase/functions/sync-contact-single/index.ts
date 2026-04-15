import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify internal secret for trigger calls
    const internalSecret = req.headers.get('x-internal-secret');
    const expectedSecret = Deno.env.get('INTERNAL_SYNC_SECRET');
    
    if (!internalSecret || internalSecret !== expectedSecret) {
      console.error('Invalid or missing internal secret');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Internal Supabase client
    const internalSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // External Supabase client
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY');

    if (!externalUrl || !externalKey) {
      console.error('External Supabase credentials not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'External Supabase not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const externalSupabase = createClient(externalUrl, externalKey);

    // Parse request
    const { contactId, operation } = await req.json();

    if (!contactId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing contactId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Syncing contact ${contactId} - Operation: ${operation}`);

    if (operation === 'DELETE') {
      // Delete from external DB
      const { error: deleteError } = await externalSupabase
        .from('contacts')
        .delete()
        .eq('external_id', contactId);

      if (deleteError) {
        console.error('Error deleting from external DB:', deleteError);
        return new Response(
          JSON.stringify({ success: false, error: deleteError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Deleted contact ${contactId} from external DB`);
      return new Response(
        JSON.stringify({ success: true, operation: 'deleted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For INSERT and UPDATE, fetch the contact and sync it
    const { data: contact, error: fetchError } = await internalSupabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (fetchError || !contact) {
      console.error('Error fetching contact:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Contact not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare external contact data
    const externalContact = {
      external_id: contact.id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      account_id: contact.account_id,
    };

    // Check if exists in external DB
    const { data: existing } = await externalSupabase
      .from('contacts')
      .select('id')
      .eq('external_id', contactId)
      .maybeSingle();

    if (existing) {
      // Update existing
      const { error: updateError } = await externalSupabase
        .from('contacts')
        .update(externalContact)
        .eq('external_id', contactId);

      if (updateError) {
        console.error('Error updating in external DB:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Updated contact ${contactId} in external DB`);
      return new Response(
        JSON.stringify({ success: true, operation: 'updated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Insert new
      const { error: insertError } = await externalSupabase
        .from('contacts')
        .insert(externalContact);

      if (insertError) {
        console.error('Error inserting to external DB:', insertError);
        return new Response(
          JSON.stringify({ success: false, error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Inserted contact ${contactId} to external DB`);
      return new Response(
        JSON.stringify({ success: true, operation: 'inserted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
