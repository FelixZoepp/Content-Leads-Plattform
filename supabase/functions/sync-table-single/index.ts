import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

// Define which fields to sync for each table
const TABLE_FIELD_MAP: Record<string, string[]> = {
  accounts: ['id', 'name', 'company_name', 'email', 'phone', 'is_active', 'subscription_status', 'custom_domain', 'created_at', 'updated_at'],
  profiles: ['id', 'name', 'email', 'phone_number', 'role', 'account_id', 'is_super_admin', 'onboarding_completed', 'calendar_url', 'avatar_url', 'created_at', 'updated_at'],
  contacts: ['id', 'first_name', 'last_name', 'email', 'phone', 'mobile', 'company', 'position', 'linkedin_url', 'website', 'street', 'city', 'country', 'notes', 'tags', 'stage', 'status', 'lead_type', 'lead_score', 'workflow_status', 'source', 'campaign_id', 'company_id', 'account_id', 'owner_user_id', 'viewed', 'view_count', 'video_status', 'slug', 'personalized_url', 'created_at', 'updated_at'],
  deals: ['id', 'title', 'contact_id', 'stage', 'pipeline', 'amount_eur', 'probability_pct', 'due_date', 'next_action', 'setter_id', 'closer_id', 'account_id', 'created_at', 'updated_at'],
  companies: ['id', 'name', 'website', 'phone', 'street', 'zip', 'city', 'country', 'account_id', 'owner_user_id', 'created_at', 'updated_at'],
  activities: ['id', 'deal_id', 'contact_id', 'user_id', 'type', 'note', 'timestamp', 'duration_min', 'outcome', 'account_id', 'created_at'],
  tasks: ['id', 'title', 'related_type', 'related_id', 'assignee_id', 'due_date', 'status', 'account_id', 'created_at', 'updated_at'],
  campaigns: ['id', 'name', 'description', 'status', 'start_date', 'end_date', 'pitch_video_url', 'account_id', 'created_at', 'updated_at'],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify internal secret
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
      return new Response(
        JSON.stringify({ success: false, error: 'External Supabase not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const externalSupabase = createClient(externalUrl, externalKey);

    // Parse request
    const { tableName, recordId, operation } = await req.json();

    if (!tableName || !recordId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing tableName or recordId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fields = TABLE_FIELD_MAP[tableName];
    if (!fields) {
      return new Response(
        JSON.stringify({ success: false, error: `Table ${tableName} not configured for sync` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Syncing ${tableName} record ${recordId} - Operation: ${operation}`);

    // For profiles table, the primary key is 'id' (user id from auth)
    // For other tables, use 'id' as well
    const idColumn = 'id';
    const externalIdColumn = tableName === 'profiles' || tableName === 'accounts' ? 'id' : 'external_id';

    if (operation === 'DELETE') {
      const { error: deleteError } = await externalSupabase
        .from(tableName)
        .delete()
        .eq(externalIdColumn, recordId);

      if (deleteError) {
        console.error(`Error deleting from external ${tableName}:`, deleteError);
        return new Response(
          JSON.stringify({ success: false, error: deleteError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Deleted ${tableName} record ${recordId} from external DB`);
      return new Response(
        JSON.stringify({ success: true, operation: 'deleted', table: tableName }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For INSERT and UPDATE, fetch the record and sync it
    const { data: record, error: fetchError } = await internalSupabase
      .from(tableName)
      .select(fields.join(','))
      .eq(idColumn, recordId)
      .single();

    if (fetchError || !record) {
      console.error(`Error fetching ${tableName} record:`, fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare external record
    const externalRecord: Record<string, unknown> = {};
    const typedRecord = record as unknown as Record<string, unknown>;
    const recordIdValue = typedRecord.id as string;
    
    // For tables that need external_id mapping
    if (externalIdColumn === 'external_id') {
      externalRecord.external_id = recordIdValue;
    }
    
    // Copy all fields
    for (const field of fields) {
      if (typedRecord[field] !== undefined) {
        externalRecord[field] = typedRecord[field];
      }
    }

    // Check if exists in external DB
    const { data: existing } = await externalSupabase
      .from(tableName)
      .select('id')
      .eq(externalIdColumn, recordId)
      .maybeSingle();

    if (existing) {
      // Update existing
      const { error: updateError } = await externalSupabase
        .from(tableName)
        .update(externalRecord)
        .eq(externalIdColumn, recordId);

      if (updateError) {
        console.error(`Error updating ${tableName} in external DB:`, updateError);
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Updated ${tableName} record ${recordId} in external DB`);
      return new Response(
        JSON.stringify({ success: true, operation: 'updated', table: tableName }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Insert new
      const { error: insertError } = await externalSupabase
        .from(tableName)
        .insert(externalRecord);

      if (insertError) {
        console.error(`Error inserting ${tableName} to external DB:`, insertError);
        return new Response(
          JSON.stringify({ success: false, error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Inserted ${tableName} record ${recordId} to external DB`);
      return new Response(
        JSON.stringify({ success: true, operation: 'inserted', table: tableName }),
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
