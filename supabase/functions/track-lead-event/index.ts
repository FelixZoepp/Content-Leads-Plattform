import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { slug, event_type, event_data, page_url, session_id, member_code, member_user_id } = body;
    
    console.log(`Received tracking event: ${event_type} for slug: ${slug}`);
    console.log('Event data:', JSON.stringify(event_data));

    if (!slug || !event_type) {
      console.log('Missing required parameters');
      return new Response(
        JSON.stringify({ error: 'Missing slug or event_type parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get contact by slug
    const { data: contact, error: fetchError } = await supabase
      .from('contacts')
      .select('id, account_id')
      .eq('slug', slug)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching contact:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!contact) {
      console.log(`No contact found for slug: ${slug}`);
      return new Response(
        JSON.stringify({ error: 'Contact not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get IP and user agent from request
    const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null;
    const user_agent = req.headers.get('user-agent') || null;

    // Insert tracking event
    const { data: eventData, error: insertError } = await supabase
      .from('lead_tracking_events')
      .insert({
        contact_id: contact.id,
        account_id: contact.account_id,
        event_type,
        event_data: { ...(event_data || {}), ...(member_code ? { member_code, member_user_id } : {}) },
        page_url,
        session_id,
        ip_address,
        user_agent
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting tracking event:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to track event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully tracked ${event_type} event for contact ${contact.id}`);

    // Update contact fields based on event type
    if (event_type === 'page_view') {
      await supabase
        .from('contacts')
        .update({
          viewed: true,
          viewed_at: new Date().toISOString(),
          view_count: (await supabase.from('contacts').select('view_count').eq('id', contact.id).single()).data?.view_count + 1 || 1
        })
        .eq('id', contact.id);
    }

    // Check if lead score hit 100 → send webhook (Make, Zapier, etc.)
    const { data: updatedContact } = await supabase
      .from('contacts')
      .select('lead_score, first_name, last_name, company, email, phone, mobile, owner_user_id, workflow_status')
      .eq('id', contact.id)
      .single();

    if (updatedContact && updatedContact.lead_score >= 100) {
      try {
        // Get account webhook URL from integrations settings
        const { data: integrations } = await supabase
          .from('account_integrations')
          .select('enrichment_webhook_url')
          .eq('account_id', contact.account_id)
          .single();

        const webhookUrl = integrations?.enrichment_webhook_url;
        if (webhookUrl) {
          // Get team outreach stats
          const { data: teamContacts } = await supabase
            .from('contacts')
            .select('workflow_status')
            .eq('account_id', contact.account_id)
            .eq('lead_type', 'outbound');

          const statuses = (teamContacts || []).map((c: any) => c.workflow_status);
          const countIn = (list: string[]) => statuses.filter((s: string) => list.includes(s)).length;

          const SENT = ['vernetzung_ausstehend','vernetzung_angenommen','erstnachricht_gesendet','fu1_gesendet','fu2_gesendet','fu3_gesendet','reagiert_warm','positiv_geantwortet','termin_gebucht','abgeschlossen'];
          const MESSAGED = ['erstnachricht_gesendet','fu1_gesendet','fu2_gesendet','fu3_gesendet','reagiert_warm','positiv_geantwortet','termin_gebucht','abgeschlossen'];
          const FUS = ['fu1_gesendet','fu2_gesendet','fu3_gesendet','reagiert_warm','positiv_geantwortet','termin_gebucht','abgeschlossen'];
          const BOOKED = ['termin_gebucht','abgeschlossen'];

          // Get owner name
          let ownerName = '';
          if (updatedContact.owner_user_id) {
            const { data: owner } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', updatedContact.owner_user_id)
              .single();
            ownerName = owner?.name || '';
          }

          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'lead_score_100',
              lead: {
                id: contact.id,
                first_name: updatedContact.first_name,
                last_name: updatedContact.last_name,
                company: updatedContact.company,
                email: updatedContact.email,
                phone: updatedContact.phone || updatedContact.mobile,
                score: updatedContact.lead_score,
                workflow_status: updatedContact.workflow_status,
                owner: ownerName,
              },
              team_stats: {
                connections_sent: countIn(SENT),
                messages_sent: countIn(MESSAGED),
                followups_sent: countIn(FUS),
                appointments_booked: countIn(BOOKED),
                total_leads: statuses.length,
              },
              timestamp: new Date().toISOString(),
            }),
          });
          console.log(`Webhook sent for lead ${contact.id} (score 100)`);
        }
      } catch (webhookErr) {
        console.error('Webhook error:', webhookErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, event_id: eventData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in track-lead-event:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
