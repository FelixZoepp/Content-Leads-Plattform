import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * verify-domain
 *
 * Checks domain verification status via Vercel Domains API.
 * Called from the DomainSettings UI as a fallback / direct Supabase call.
 * The primary flow uses /api/domains/status on Vercel, but this edge function
 * keeps backward compatibility and can be used for cron-based checks.
 */

const VERCEL_API_TOKEN = Deno.env.get('VERCEL_API_TOKEN') || ''
const VERCEL_PROJECT_ID = Deno.env.get('VERCEL_PROJECT_ID') || ''

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Authenticate the caller
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Nicht autorisiert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Nicht autorisiert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { domain, account_id } = await req.json()

    if (!domain || !account_id) {
      return new Response(
        JSON.stringify({ error: 'Domain und Account-ID erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user belongs to this account and is admin
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.account_id !== account_id || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Keine Berechtigung. Nur Admins können Domains verwalten.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean domain input
    const cleanDomain = domain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '')
      .replace(/^www\./, '')
      .trim()

    if (!cleanDomain || !cleanDomain.includes('.')) {
      return new Response(
        JSON.stringify({ error: 'Ungültige Domain.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Verifying domain via Vercel API: ${cleanDomain} for account: ${account_id}`)

    // Check if domain is taken by another account
    const { data: existingDomain } = await supabase
      .from('custom_domains')
      .select('id, account_id')
      .ilike('domain', cleanDomain)
      .neq('account_id', account_id)
      .maybeSingle()

    if (existingDomain) {
      return new Response(
        JSON.stringify({
          verified: false,
          error: 'Diese Domain wird bereits von einem anderen Account verwendet.',
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check domain status on Vercel
    let isVerified = false
    let sslActive = false
    let errorMessage: string | null = null
    let verification: any[] = []

    if (VERCEL_API_TOKEN && VERCEL_PROJECT_ID) {
      const vercelRes = await fetch(
        `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(cleanDomain)}`,
        { headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` } }
      )

      if (vercelRes.ok) {
        const vercelDomain = await vercelRes.json()
        verification = vercelDomain.verification || []

        if (!vercelDomain.verified) {
          errorMessage = 'Domain-Inhaberschaft noch nicht verifiziert. Bitte setze den TXT-Record.'
        } else if (vercelDomain.misconfigured) {
          isVerified = true
          errorMessage = 'DNS-Records zeigen noch nicht auf Vercel. Bitte A-Record auf 76.76.21.21 setzen.'
        } else {
          isVerified = true
          sslActive = true
        }
      } else {
        errorMessage = 'Domain nicht bei Vercel registriert. Bitte zuerst über die Einstellungen hinzufügen.'
      }
    } else {
      // Fallback: DNS lookup if Vercel env vars not set
      errorMessage = 'Vercel API nicht konfiguriert. Bitte Domain über die Einstellungen verwalten.'
    }

    // Upsert domain record
    const now = new Date().toISOString()
    const domainData: Record<string, any> = {
      account_id,
      domain: cleanDomain,
      last_checked_at: now,
      verified: isVerified,
      ssl_active: sslActive,
      status: sslActive ? 'ssl_active' : (isVerified ? 'dns_verified' : 'pending_dns'),
      last_error: errorMessage,
    }

    if (isVerified) domainData.verified_at = now
    if (sslActive) domainData.ssl_activated_at = now

    const { data: existing } = await supabase
      .from('custom_domains')
      .select('id')
      .eq('account_id', account_id)
      .maybeSingle()

    let result
    if (existing) {
      const { data, error } = await supabase
        .from('custom_domains')
        .update(domainData)
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      result = data
    } else {
      const { data, error } = await supabase
        .from('custom_domains')
        .insert(domainData)
        .select()
        .single()
      if (error) throw error
      result = data
    }

    return new Response(
      JSON.stringify({
        verified: isVerified,
        ssl_active: sslActive,
        domain: result,
        verification,
        message: sslActive
          ? 'Domain erfolgreich verifiziert! SSL-Zertifikat wird automatisch von Vercel verwaltet.'
          : errorMessage,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Domain verification error:', error)
    return new Response(
      JSON.stringify({ error: 'Fehler bei der Domain-Verifizierung: ' + (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
