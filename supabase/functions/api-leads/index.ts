import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface LeadPayload {
  company_name?: string;
  website?: string;
  phone?: string;
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  position?: string;
  source?: string;
  external_id?: string;
  tags?: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get API key from header
    const apiKey = req.headers.get('X-API-Key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for API key validation
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate API key using secure hash-based function
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .rpc('validate_api_key', { p_token: apiKey });

    if (apiKeyError || !apiKeyData || apiKeyData.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = apiKeyData[0].user_id;

    console.log(`API request from user: ${userId}`);

    // Parse request body
    const payload: LeadPayload = await req.json();

    // Validate: at least company_name or email must be present
    if (!payload.company_name && !payload.email) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'At least company_name or email is required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let companyId: string | null = null;

    // Find or create company
    if (payload.company_name) {
      let existingCompany = null;
      
      // Try to find by website
      if (payload.website) {
        const { data } = await supabase
          .from('companies')
          .select('id')
          .eq('website', payload.website)
          .eq('owner_user_id', userId)
          .maybeSingle();
        existingCompany = data;
      }
      
      // Try to find by name + zip
      if (!existingCompany && payload.zip) {
        const { data } = await supabase
          .from('companies')
          .select('id')
          .eq('name', payload.company_name)
          .eq('zip', payload.zip)
          .eq('owner_user_id', userId)
          .maybeSingle();
        existingCompany = data;
      }

      if (existingCompany) {
        companyId = existingCompany.id;
        
        // Update company data
        await supabase
          .from('companies')
          .update({
            website: payload.website || null,
            phone: payload.phone || null,
            street: payload.street || null,
            zip: payload.zip || null,
            city: payload.city || null,
            country: payload.country || null,
          })
          .eq('id', companyId);
      } else {
        // Create new company
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({
            owner_user_id: userId,
            name: payload.company_name,
            website: payload.website || null,
            phone: payload.phone || null,
            street: payload.street || null,
            zip: payload.zip || null,
            city: payload.city || null,
            country: payload.country || null,
          })
          .select()
          .single();

        if (companyError) throw companyError;
        companyId = newCompany.id;
      }
    }

    // Find or create contact
    let contactId: string | null = null;
    let isNewContact = false;

    if (payload.email) {
      // Check if contact exists by email
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', payload.email)
        .eq('owner_user_id', userId)
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
        
        // Update existing contact
        await supabase
          .from('contacts')
          .update({
            first_name: payload.first_name || '',
            last_name: payload.last_name || '',
            company: payload.company_name || null,
            company_id: companyId,
            phone: payload.phone || null,
            position: payload.position || null,
            source: payload.source || null,
            external_id: payload.external_id || null,
            tags: payload.tags || [],
          })
          .eq('id', contactId);
      } else {
        isNewContact = true;
        
        // Create new contact
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            owner_user_id: userId,
            first_name: payload.first_name || '',
            last_name: payload.last_name || '',
            company: payload.company_name || null,
            company_id: companyId,
            email: payload.email,
            phone: payload.phone || null,
            position: payload.position || null,
            source: payload.source || null,
            external_id: payload.external_id || null,
            tags: payload.tags || [],
          })
          .select()
          .single();

        if (contactError) throw contactError;
        contactId = newContact.id;
      }
    } else if (companyId) {
      isNewContact = true;
      
      // Create contact without email (if we have company)
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          owner_user_id: userId,
          first_name: payload.first_name || '',
          last_name: payload.last_name || '',
          company: payload.company_name || null,
          company_id: companyId,
          phone: payload.phone || null,
          position: payload.position || null,
          source: payload.source || null,
          external_id: payload.external_id || null,
          tags: payload.tags || [],
        })
        .select()
        .single();

      if (contactError) throw contactError;
      contactId = newContact.id;
    }

    // Create a deal for new contacts in the cold pipeline as "Lead"
    let dealId: string | null = null;
    if (isNewContact && contactId) {
      const dealTitle = `${payload.first_name || ''} ${payload.last_name || ''} - ${payload.company_name || 'Lead'}`.trim();
      
      const { data: newDeal, error: dealError } = await supabase
        .from('deals')
        .insert({
          contact_id: contactId,
          setter_id: userId,
          title: dealTitle,
          stage: 'Lead',
          pipeline: 'cold',
          amount_eur: 0,
          probability_pct: 0,
        })
        .select()
        .single();

      if (!dealError && newDeal) {
        dealId = newDeal.id;
      }
    }

    console.log(`Lead created/updated: company=${companyId}, contact=${contactId}, deal=${dealId}`);

    return new Response(
      JSON.stringify({
        success: true,
        company_id: companyId,
        contact_id: contactId,
        deal_id: dealId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('API leads error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Ein interner Fehler ist aufgetreten'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
