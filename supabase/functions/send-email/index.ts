import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  contactId: string;
  templateId?: string;
  subject: string;
  bodyHtml: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !user) {
      throw new Error('Invalid user');
    }

    // Get user's profile and account
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('id', user.id)
      .single();

    if (!profile?.account_id) {
      throw new Error('User has no account');
    }

    // Get SMTP settings
    const { data: integration } = await supabase
      .from('account_integrations')
      .select('smtp_host, smtp_port, smtp_username, smtp_password_encrypted, smtp_from_email, smtp_from_name')
      .eq('account_id', profile.account_id)
      .single();

    if (!integration?.smtp_host || !integration?.smtp_username) {
      throw new Error('SMTP not configured. Please configure SMTP settings first.');
    }

    const { contactId, templateId, subject, bodyHtml }: SendEmailRequest = await req.json();

    // Get contact email
    const { data: contact } = await supabase
      .from('contacts')
      .select('email, first_name, last_name')
      .eq('id', contactId)
      .single();

    if (!contact?.email) {
      throw new Error('Contact has no email address');
    }

    // Generate tracking ID
    const trackingId = crypto.randomUUID();
    
    // Convert plain text to HTML (preserve line breaks)
    const convertToHtml = (text: string): string => {
      // Escape HTML special characters
      const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      // Convert newlines to <br> and wrap in paragraph
      return `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">${escaped.replace(/\n/g, '<br>')}</div>`;
    };
    
    const htmlBody = convertToHtml(bodyHtml);
    
    // Add tracking pixel
    const trackingPixel = `<img src="${supabaseUrl}/functions/v1/track-email?t=${trackingId}&e=open" width="1" height="1" style="display:none" />`;
    
    // Rewrite links for click tracking (handle plain text URLs)
    const trackedHtml = htmlBody.replace(
      /(https?:\/\/[^\s<]+)/g,
      (url) => {
        const encodedUrl = encodeURIComponent(url);
        return `<a href="${supabaseUrl}/functions/v1/track-email?t=${trackingId}&e=click&u=${encodedUrl}">${url}</a>`;
      }
    ) + trackingPixel;

    // Send email via SMTP
    // Using Deno's smtp library through dynamic import
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

    await client.send({
      from: integration.smtp_from_name 
        ? `${integration.smtp_from_name} <${integration.smtp_from_email || integration.smtp_username}>`
        : integration.smtp_from_email || integration.smtp_username,
      to: contact.email,
      subject: subject,
      content: "auto",
      html: trackedHtml,
    });

    await client.close();

    // Log the email
    const { data: emailLog, error: logError } = await supabase
      .from('email_logs')
      .insert({
        account_id: profile.account_id,
        contact_id: contactId,
        template_id: templateId || null,
        user_id: user.id,
        from_email: integration.smtp_from_email || integration.smtp_username,
        to_email: contact.email,
        subject: subject,
        body_html: bodyHtml,
        tracking_id: trackingId,
        status: 'sent',
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to log email:', logError);
    }

    // Also log as activity
    await supabase.from('activities').insert({
      account_id: profile.account_id,
      contact_id: contactId,
      user_id: user.id,
      type: 'email',
      note: `E-Mail gesendet: ${subject}`,
    });

    console.log(`Email sent successfully to ${contact.email}`);

    return new Response(
      JSON.stringify({ success: true, emailLogId: emailLog?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
