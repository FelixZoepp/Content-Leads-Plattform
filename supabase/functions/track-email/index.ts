import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

// 1x1 transparent GIF
const TRACKING_PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
  0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21,
  0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
  0x01, 0x00, 0x3b
]);

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const trackingId = url.searchParams.get('t');
    const eventType = url.searchParams.get('e'); // 'open' or 'click'
    const redirectUrl = url.searchParams.get('u');

    if (!trackingId || !eventType) {
      return new Response('Missing parameters', { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find email log by tracking ID (include contact_id and account_id)
    const { data: emailLog } = await supabase
      .from('email_logs')
      .select('id, contact_id, account_id, user_id, open_count, click_count')
      .eq('tracking_id', trackingId)
      .single();

    if (emailLog) {
      // Log tracking event in email_tracking_events
      await supabase.from('email_tracking_events').insert({
        email_log_id: emailLog.id,
        event_type: eventType,
        link_url: redirectUrl ? decodeURIComponent(redirectUrl) : null,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip'),
        user_agent: req.headers.get('user-agent'),
      });

      // Update email log counts
      if (eventType === 'open') {
        await supabase
          .from('email_logs')
          .update({ 
            open_count: (emailLog.open_count || 0) + 1,
            opened_at: new Date().toISOString()
          })
          .eq('id', emailLog.id);
      } else if (eventType === 'click') {
        await supabase
          .from('email_logs')
          .update({ 
            click_count: (emailLog.click_count || 0) + 1
          })
          .eq('id', emailLog.id);
      }

      // === LEAD ATTRIBUTION: Track in lead_tracking_events for scoring ===
      if (emailLog.contact_id) {
        const leadEventType = eventType === 'open' ? 'email_open' : 'email_click';

        // Insert lead tracking event (triggers calculate_lead_score via DB trigger)
        await supabase.from('lead_tracking_events').insert({
          contact_id: emailLog.contact_id,
          account_id: emailLog.account_id,
          event_type: leadEventType,
          event_data: {
            source: 'cold_mailing',
            tracking_id: trackingId,
            link_url: redirectUrl ? decodeURIComponent(redirectUrl) : null,
          },
        });

        // Update email_campaign_leads counters
        if (eventType === 'open') {
          // Find campaign lead entry for this contact and increment opened_count
          const { data: campaignLeads } = await supabase
            .from('email_campaign_leads')
            .select('id, opened_count')
            .eq('contact_id', emailLog.contact_id)
            .eq('status', 'active');

          if (campaignLeads && campaignLeads.length > 0) {
            for (const cl of campaignLeads) {
              await supabase.from('email_campaign_leads').update({
                opened_count: (cl.opened_count || 0) + 1,
                updated_at: new Date().toISOString(),
              }).eq('id', cl.id);
            }
          }
        } else if (eventType === 'click') {
          const { data: campaignLeads } = await supabase
            .from('email_campaign_leads')
            .select('id, clicked_count')
            .eq('contact_id', emailLog.contact_id)
            .eq('status', 'active');

          if (campaignLeads && campaignLeads.length > 0) {
            for (const cl of campaignLeads) {
              await supabase.from('email_campaign_leads').update({
                clicked_count: (cl.clicked_count || 0) + 1,
                updated_at: new Date().toISOString(),
              }).eq('id', cl.id);
            }
          }
        }

        // Log as activity for the contact
        if (emailLog.user_id) {
          await supabase.from('activities').insert({
            contact_id: emailLog.contact_id,
            account_id: emailLog.account_id,
            user_id: emailLog.user_id,
            type: 'email',
            note: eventType === 'open'
              ? 'Lead hat E-Mail geöffnet'
              : `Lead hat auf Link geklickt${redirectUrl ? ': ' + decodeURIComponent(redirectUrl) : ''}`,
            outcome: 'reached',
          });
        }

        // Update contact channels_active to include 'email'
        const { data: contact } = await supabase
          .from('contacts')
          .select('channels_active')
          .eq('id', emailLog.contact_id)
          .single();

        if (contact) {
          const channels = contact.channels_active || [];
          if (!channels.includes('email')) {
            await supabase.from('contacts').update({
              channels_active: [...channels, 'email'],
              updated_at: new Date().toISOString(),
            }).eq('id', emailLog.contact_id);
          }
        }
      }

      console.log(`Tracked ${eventType} for email ${emailLog.id}, contact ${emailLog.contact_id}`);
    }

    // For clicks, redirect to the original URL
    if (eventType === 'click' && redirectUrl) {
      return new Response(null, {
        status: 302,
        headers: { 'Location': decodeURIComponent(redirectUrl) },
      });
    }

    // For opens, return tracking pixel
    return new Response(TRACKING_PIXEL, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error: any) {
    console.error('Tracking error:', error);
    return new Response(TRACKING_PIXEL, {
      headers: { 'Content-Type': 'image/gif' },
    });
  }
});
