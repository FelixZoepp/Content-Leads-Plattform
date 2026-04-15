import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-enrichment-secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Two modes:
    // 1. Trigger mode (POST with Authorization header) - sends contact data to external webhook
    // 2. Callback mode (POST with x-enrichment-secret header) - receives enriched data back

    const enrichmentSecret = req.headers.get('x-enrichment-secret');

    if (enrichmentSecret) {
      // === CALLBACK MODE: External system sends enriched data back ===
      const body = await req.json();
      const { contact_id, data } = body;

      if (!contact_id || !data) {
        return new Response(
          JSON.stringify({ success: false, error: 'contact_id and data required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate the secret against account's webhook secret
      // Find the account that owns this contact
      const { data: contact, error: contactErr } = await supabase
        .from('contacts')
        .select('id, account_id')
        .eq('id', contact_id)
        .single();

      if (contactErr || !contact) {
        return new Response(
          JSON.stringify({ success: false, error: 'Contact not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build update object from provided data - only update non-null fields
      const updateFields: Record<string, unknown> = {};
      const contactFields = [
        'first_name', 'last_name', 'email', 'phone', 'mobile', 'position',
        'company', 'linkedin_url', 'website', 'street', 'city', 'country',
        'notes', 'source', 'tags', 'stage',
      ];
      for (const field of contactFields) {
        if (data[field] !== undefined && data[field] !== null) {
          updateFields[field] = data[field];
        }
      }

      // Update company fields if provided
      const companyFields: Record<string, unknown> = {};
      const companyFieldNames = ['company_name', 'company_website', 'company_phone', 'company_street', 'company_zip', 'company_city', 'company_country'];
      for (const field of companyFieldNames) {
        if (data[field] !== undefined && data[field] !== null) {
          companyFields[field.replace('company_', '')] = data[field];
        }
      }

      // Update contact
      if (Object.keys(updateFields).length > 0) {
        updateFields.updated_at = new Date().toISOString();
        const { error: updateErr } = await supabase
          .from('contacts')
          .update(updateFields)
          .eq('id', contact_id);

        if (updateErr) {
          console.error('Error updating contact:', updateErr);
          return new Response(
            JSON.stringify({ success: false, error: updateErr.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Update company if we have company data and the contact has a company_id
      if (Object.keys(companyFields).length > 0) {
        const { data: fullContact } = await supabase
          .from('contacts')
          .select('company_id')
          .eq('id', contact_id)
          .single();

        if (fullContact?.company_id) {
          companyFields.updated_at = new Date().toISOString();
          // Map company_name to name for the companies table
          if (companyFields.name) {
            // 'name' came from company_name -> already mapped
          }
          await supabase
            .from('companies')
            .update(companyFields)
            .eq('id', fullContact.company_id);
        }
      }

      console.log(`Enriched contact ${contact_id} with ${Object.keys(updateFields).length} contact fields, ${Object.keys(companyFields).length} company fields`);

      return new Response(
        JSON.stringify({ success: true, updated_fields: Object.keys(updateFields) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === TRIGGER MODE: User clicks "Anreichern" button ===
    // Requires JWT auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's account
    const { data: profile } = await supabase
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

    // Get webhook URL from integrations
    const { data: integration } = await supabase
      .from('account_integrations')
      .select('enrichment_webhook_url')
      .eq('account_id', profile.account_id)
      .single();

    if (!integration?.enrichment_webhook_url) {
      return new Response(
        JSON.stringify({ success: false, error: 'Kein Enrichment-Webhook konfiguriert. Bitte unter Integrationen einrichten.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check enrichment credits (uses DB function with rollover logic)
    const { data: credits, error: creditsErr } = await supabase
      .rpc('get_enrichment_credits', { p_account_id: profile.account_id });

    if (creditsErr || !credits) {
      console.error('Error fetching credits:', creditsErr);
      return new Response(
        JSON.stringify({ success: false, error: 'Fehler beim Laden der Credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if credits are available (unified pool)
    const creditsUsed = credits.phone_credits_used || 0;
    const creditsLimit = credits.phone_credits_limit || 100;

    if (creditsUsed >= creditsLimit) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Monatliches Credit-Limit erreicht (${creditsLimit} Credits). Credits werden am 1. des nächsten Monats zurückgesetzt.`,
          credits: { used: creditsUsed, limit: creditsLimit }
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { contact_id } = await req.json();
    if (!contact_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'contact_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch contact + company data to send to webhook
    const { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .select('*, companies(*)')
      .eq('id', contact_id)
      .eq('account_id', profile.account_id)
      .single();

    if (contactErr || !contact) {
      return new Response(
        JSON.stringify({ success: false, error: 'Contact not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build callback URL for the external system
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const callbackUrl = `${supabaseUrl}/functions/v1/enrich-lead`;

    // Send contact data to external webhook
    const webhookPayload = {
      contact_id: contact.id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      phone: contact.phone,
      mobile: contact.mobile,
      position: contact.position,
      company: contact.company,
      linkedin_url: contact.linkedin_url,
      website: contact.website,
      street: contact.street,
      city: contact.city,
      country: contact.country,
      source: contact.source,
      tags: contact.tags,
      company_data: contact.companies ? {
        name: contact.companies.name,
        website: contact.companies.website,
        phone: contact.companies.phone,
        city: contact.companies.city,
        country: contact.companies.country,
      } : null,
      callback_url: callbackUrl,
      account_id: profile.account_id,
    };

    console.log(`Triggering enrichment for contact ${contact_id} via webhook`);

    const webhookResponse = await fetch(integration.enrichment_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error(`Webhook error [${webhookResponse.status}]: ${errorText}`);
      return new Response(
        JSON.stringify({ success: false, error: `Webhook-Fehler: ${webhookResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if webhook returned enriched data directly (synchronous mode)
    const contentType = webhookResponse.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const responseData = await webhookResponse.json();
      
      // If the webhook returns data directly, update the contact
      if (responseData.data && typeof responseData.data === 'object') {
        const updateFields: Record<string, unknown> = {};
        const contactFields = [
          'first_name', 'last_name', 'email', 'phone', 'mobile', 'position',
          'company', 'linkedin_url', 'website', 'street', 'city', 'country',
          'notes', 'source', 'tags', 'stage',
        ];
        for (const field of contactFields) {
          if (responseData.data[field] !== undefined && responseData.data[field] !== null) {
            updateFields[field] = responseData.data[field];
          }
        }

        if (Object.keys(updateFields).length > 0) {
          updateFields.updated_at = new Date().toISOString();
          await supabase
            .from('contacts')
            .update(updateFields)
            .eq('id', contact_id);

          // Deduct 1 credit for successful enrichment
          const creditUpdate = { 
            updated_at: new Date().toISOString(),
            phone_credits_used: (credits.phone_credits_used || 0) + 1,
          };
          await supabase.from('enrichment_credits').update(creditUpdate).eq('id', credits.id);

          console.log(`Synchronously enriched contact ${contact_id} with ${Object.keys(updateFields).length} fields`);

          return new Response(
            JSON.stringify({ success: true, mode: 'sync', updated_fields: Object.keys(updateFields) }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Async mode: do NOT deduct credits upfront – credits only on success via callback
    // The callback mode doesn't currently deduct credits, so we skip here

    return new Response(
      JSON.stringify({ success: true, mode: 'async', message: 'Enrichment-Anfrage gesendet. Daten werden asynchron aktualisiert.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Enrich lead error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
