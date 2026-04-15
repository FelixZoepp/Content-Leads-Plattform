import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabase = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log('[PROCESS-EMAIL-CAMPAIGN] Starting...');

    // Get all active campaigns
    const { data: campaigns, error: campErr } = await supabase
      .from('email_campaigns')
      .select('*, account_integrations!inner(smtp_host, smtp_port, smtp_username, smtp_password_encrypted, smtp_from_email, smtp_from_name)')
      .eq('status', 'active');

    // Fallback: get campaigns and integrations separately
    const { data: activeCampaigns, error: campErr2 } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('status', 'active');

    if (campErr2 || !activeCampaigns || activeCampaigns.length === 0) {
      console.log('[PROCESS-EMAIL-CAMPAIGN] No active campaigns found');
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalProcessed = 0;

    for (const campaign of activeCampaigns) {
      // Check if current time is within send window
      const now = new Date();
      const currentHour = now.getHours(); // Server time, ideally we'd convert to campaign timezone
      if (currentHour < (campaign.send_start_hour || 9) || currentHour >= (campaign.send_end_hour || 17)) {
        console.log(`[PROCESS-EMAIL-CAMPAIGN] Campaign ${campaign.name}: outside send window`);
        continue;
      }

      // Check send day
      const dayMap: Record<number, string> = { 0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat' };
      const currentDay = dayMap[now.getDay()];
      if (!(campaign.send_days || ['mon','tue','wed','thu','fri']).includes(currentDay)) {
        console.log(`[PROCESS-EMAIL-CAMPAIGN] Campaign ${campaign.name}: not a send day`);
        continue;
      }

      // Get SMTP settings for this account
      const { data: integration } = await supabase
        .from('account_integrations')
        .select('smtp_host, smtp_port, smtp_username, smtp_password_encrypted, smtp_from_email, smtp_from_name')
        .eq('account_id', campaign.account_id)
        .single();

      if (!integration?.smtp_host || !integration?.smtp_username) {
        console.log(`[PROCESS-EMAIL-CAMPAIGN] Campaign ${campaign.name}: no SMTP configured`);
        continue;
      }

      // Get campaign steps
      const { data: steps } = await supabase
        .from('email_campaign_steps')
        .select('*')
        .eq('campaign_id', campaign.id)
        .is('variant', null)
        .order('step_order', { ascending: true });

      if (!steps || steps.length === 0) {
        console.log(`[PROCESS-EMAIL-CAMPAIGN] Campaign ${campaign.name}: no steps`);
        continue;
      }

      // Get leads ready to send (next_send_at <= now OR not started yet)
      const { data: leadsToProcess } = await supabase
        .from('email_campaign_leads')
        .select('*, contacts(id, first_name, last_name, email, company, position)')
        .eq('campaign_id', campaign.id)
        .eq('status', 'active')
        .or(`next_send_at.lte.${now.toISOString()},next_send_at.is.null`)
        .limit(campaign.daily_send_limit || 50);

      if (!leadsToProcess || leadsToProcess.length === 0) {
        console.log(`[PROCESS-EMAIL-CAMPAIGN] Campaign ${campaign.name}: no leads to process`);
        continue;
      }

      // Init SMTP client
      const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
      const client = new SMTPClient({
        connection: {
          hostname: integration.smtp_host,
          port: integration.smtp_port || 587,
          tls: true,
          auth: {
            username: integration.smtp_username,
            password: integration.smtp_password_encrypted || '',
          },
        },
      });

      let sentCount = 0;

      for (const lead of leadsToProcess) {
        const contact = lead.contacts as any;
        if (!contact?.email) continue;

        const currentStep = lead.current_step || 0;
        const nextStepIndex = currentStep; // 0-based
        if (nextStepIndex >= steps.length) {
          // All steps completed
          await supabase.from('email_campaign_leads').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', lead.id);
          continue;
        }

        const step = steps[nextStepIndex];

        // Personalize content
        const personalize = (text: string) => {
          return text
            .replace(/\{\{first_name\}\}/g, contact.first_name || '')
            .replace(/\{\{last_name\}\}/g, contact.last_name || '')
            .replace(/\{\{company\}\}/g, contact.company || '')
            .replace(/\{\{position\}\}/g, contact.position || '');
        };

        const subject = personalize(step.subject);
        const bodyText = personalize(step.body_text);

        // Convert to HTML
        const escaped = bodyText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const htmlBody = `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">${escaped.replace(/\n/g, '<br>')}</div>`;

        // Tracking
        const trackingId = crypto.randomUUID();
        const trackingPixel = `<img src="${supabaseUrl}/functions/v1/track-email?t=${trackingId}&e=open" width="1" height="1" style="display:none" />`;
        const trackedHtml = htmlBody.replace(
          /(https?:\/\/[^\s<]+)/g,
          (url: string) => {
            const encodedUrl = encodeURIComponent(url);
            return `<a href="${supabaseUrl}/functions/v1/track-email?t=${trackingId}&e=click&u=${encodedUrl}">${url}</a>`;
          }
        ) + trackingPixel;

        try {
          await client.send({
            from: integration.smtp_from_name
              ? `${integration.smtp_from_name} <${integration.smtp_from_email || integration.smtp_username}>`
              : integration.smtp_from_email || integration.smtp_username,
            to: contact.email,
            subject,
            content: "auto",
            html: trackedHtml,
          });

          // Log email
          await supabase.from('email_logs').insert({
            account_id: campaign.account_id,
            contact_id: contact.id,
            user_id: campaign.account_id, // Use account_id as fallback
            from_email: integration.smtp_from_email || integration.smtp_username,
            to_email: contact.email,
            subject,
            body_html: bodyText,
            tracking_id: trackingId,
            status: 'sent',
          });

          // Update lead progress
          const nextStep = currentStep + 1;
          const nextDelay = nextStep < steps.length ? steps[nextStep].delay_days : 0;
          const nextSendAt = nextStep < steps.length
            ? new Date(Date.now() + nextDelay * 24 * 60 * 60 * 1000).toISOString()
            : null;

          await supabase.from('email_campaign_leads').update({
            current_step: nextStep,
            last_sent_at: new Date().toISOString(),
            next_send_at: nextSendAt,
            status: nextStep >= steps.length ? 'completed' : 'active',
            updated_at: new Date().toISOString(),
          }).eq('id', lead.id);

          // Update step stats
          await supabase.from('email_campaign_steps').update({
            total_sent: (step.total_sent || 0) + 1,
          }).eq('id', step.id);

          // Update contact channels_active
          try {
            await supabase.rpc('update_contact_channels', { p_contact_id: contact.id, p_channel: 'email' });
          } catch {
            // Fallback: direct update
            await supabase.from('contacts').update({
              channels_active: ['email'],
              updated_at: new Date().toISOString(),
            }).eq('id', contact.id);
          }

          sentCount++;
          totalProcessed++;

        } catch (sendErr: any) {
          console.error(`[PROCESS-EMAIL-CAMPAIGN] Failed to send to ${contact.email}:`, sendErr.message);
          // Mark as bounced if it's a delivery error
          if (sendErr.message?.includes('550') || sendErr.message?.includes('invalid') || sendErr.message?.includes('bounce')) {
            await supabase.from('email_campaign_leads').update({
              status: 'bounced',
              bounced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq('id', lead.id);
          }
        }
      }

      await client.close();

      // Update campaign stats
      if (sentCount > 0) {
        await supabase.from('email_campaigns').update({
          total_sent: (campaign.total_sent || 0) + sentCount,
          updated_at: new Date().toISOString(),
        }).eq('id', campaign.id);
      }

      console.log(`[PROCESS-EMAIL-CAMPAIGN] Campaign ${campaign.name}: sent ${sentCount} emails`);
    }

    return new Response(
      JSON.stringify({ success: true, processed: totalProcessed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[PROCESS-EMAIL-CAMPAIGN] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
