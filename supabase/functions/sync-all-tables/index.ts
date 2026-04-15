import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tables to sync in order (respecting foreign key dependencies)
const SYNC_ORDER = ['accounts', 'profiles', 'companies', 'campaigns', 'contacts', 'deals', 'activities', 'tasks'];

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

interface SyncResult {
  table: string;
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

    // Internal Supabase client
    const internalSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify super admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await internalSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await internalSupabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_super_admin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const results: SyncResult[] = [];

    // Sync each table in order
    for (const tableName of SYNC_ORDER) {
      const fields = TABLE_FIELD_MAP[tableName];
      const result: SyncResult = { table: tableName, synced: 0, updated: 0, errors: [] };

      console.log(`Starting sync for table: ${tableName}`);

      // Fetch all records from internal DB
      const { data: records, error: fetchError } = await internalSupabase
        .from(tableName)
        .select(fields.join(','));

      if (fetchError) {
        console.error(`Error fetching ${tableName}:`, fetchError);
        result.errors.push(`Fetch error: ${fetchError.message}`);
        results.push(result);
        continue;
      }

      console.log(`Found ${records?.length || 0} records in ${tableName}`);

      // Determine ID column strategy
      const useExternalId = !['accounts', 'profiles'].includes(tableName);

      for (const record of (records || []) as unknown as Record<string, unknown>[]) {
        try {
          const externalRecord: Record<string, unknown> = {};
          const recordId = record.id as string;
          
          // Add external_id for tables that need it
          if (useExternalId) {
            externalRecord.external_id = recordId;
          }
          
          // Copy all fields
          for (const field of fields) {
            if (record[field] !== undefined) {
              externalRecord[field] = record[field];
            }
          }

          // Check if exists
          const lookupColumn = useExternalId ? 'external_id' : 'id';
          const { data: existing } = await externalSupabase
            .from(tableName)
            .select('id')
            .eq(lookupColumn, recordId)
            .maybeSingle();

          if (existing) {
            const { error: updateError } = await externalSupabase
              .from(tableName)
              .update(externalRecord)
              .eq(lookupColumn, recordId);

            if (updateError) {
              result.errors.push(`Update ${recordId}: ${updateError.message}`);
            } else {
              result.updated++;
            }
          } else {
            const { error: insertError } = await externalSupabase
              .from(tableName)
              .insert(externalRecord);

            if (insertError) {
              result.errors.push(`Insert ${recordId}: ${insertError.message}`);
            } else {
              result.synced++;
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          const recordId = (record as Record<string, unknown>).id as string;
          result.errors.push(`${recordId}: ${msg}`);
        }
      }

      console.log(`${tableName}: ${result.synced} new, ${result.updated} updated, ${result.errors.length} errors`);
      results.push(result);
    }

    const totalSynced = results.reduce((sum, r) => sum + r.synced, 0);
    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    return new Response(
      JSON.stringify({
        success: true,
        summary: { synced: totalSynced, updated: totalUpdated, errors: totalErrors },
        details: results,
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
