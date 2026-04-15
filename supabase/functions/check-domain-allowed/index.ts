import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * check-domain-allowed
 *
 * Called by Caddy's on_demand_tls "ask" endpoint.
 * Caddy sends: GET /check-domain-allowed?domain=example.com
 * Returns 200 if domain is in our custom_domains table (verified).
 * Returns 404 if not → Caddy will NOT provision a certificate.
 *
 * This prevents abuse: only domains that users have actually registered
 * and verified get SSL certificates provisioned.
 */

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const domain = url.searchParams.get('domain')?.toLowerCase().replace(/^www\./, '')

  if (!domain) {
    return new Response('Missing domain parameter', { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase
    .from('custom_domains')
    .select('id')
    .eq('domain', domain)
    .eq('verified', true)
    .maybeSingle()

  if (error) {
    console.error('check-domain-allowed error:', error)
    return new Response('Internal error', { status: 500 })
  }

  if (data) {
    // Domain is verified → allow SSL cert provisioning
    // Also mark ssl_active if not yet set
    await supabase
      .from('custom_domains')
      .update({ ssl_active: true, ssl_activated_at: new Date().toISOString(), status: 'ssl_active' })
      .eq('domain', domain)
      .eq('ssl_active', false)

    return new Response('OK', { status: 200 })
  }

  // Domain not found or not verified → deny
  return new Response('Domain not allowed', { status: 404 })
})
