import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * serve-lead-page
 *
 * Called by the Caddy reverse proxy for custom domain requests.
 * Resolves domain → account → template, parses path → lead + member,
 * renders a fully personalized, mobile-optimized HTML lead page.
 *
 * URL format: https://wolf-leads.de/max-mueller/1001
 *   - wolf-leads.de = custom domain → resolves to account
 *   - max-mueller = lead slug → resolves to contact
 *   - 1001 = member_code → resolves to team member
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function esc(str: string | null | undefined): string {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

function personalize(text: string, firstName: string, company: string): string {
  return text
    .replace(/\{\{first_name\}\}/g, esc(firstName))
    .replace(/\{\{company\}\}/g, esc(company))
}

Deno.serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Get original host and path from Caddy headers
  const host = (
    req.headers.get('x-forwarded-host') ||
    req.headers.get('host') || ''
  ).toLowerCase().replace(/^www\./, '')

  const url = new URL(req.url)
  const originalPath = req.headers.get('x-original-path') || url.pathname
  const path = originalPath.replace(/^\/+|\/+$/g, '')

  console.log(`serve-lead-page: host=${host}, path=${path}`)

  // ── 1. Domain → Account ──
  const { data: domainRecord } = await supabase
    .from('custom_domains')
    .select('account_id')
    .eq('domain', host)
    .eq('verified', true)
    .maybeSingle()

  if (!domainRecord) {
    return html(notFoundPage(), 404)
  }

  const accountId = domainRecord.account_id

  // ── 2. Parse path ──
  const segments = path.split('/').filter(Boolean)

  if (segments.length === 0) {
    // Root → branded landing
    const { data: account } = await supabase
      .from('accounts')
      .select('name, company_name, logo_url, primary_brand_color')
      .eq('id', accountId)
      .single()
    return html(rootPage(account, host))
  }

  // Support /p/slug format (skip "p" prefix)
  let slug: string
  let memberCode: string | undefined
  if (segments[0] === 'p' && segments.length >= 2) {
    slug = segments[1]
    memberCode = segments[2] // optional member code after slug
  } else if (segments.length >= 1) {
    slug = segments[0]
    memberCode = segments[1]
  } else {
    return html(notFoundPage(), 404)
  }

  // ── 3. Fetch lead via slug ──
  const { data: contactResult } = await supabase
    .rpc('get_contact_by_slug', { contact_slug: slug })

  const contact = Array.isArray(contactResult) ? contactResult[0] : contactResult
  if (!contact) {
    return html(notFoundPage(), 404)
  }

  // ── 4. Fetch all data in parallel ──
  const [accountRes, templateRes, memberRes] = await Promise.all([
    supabase
      .from('accounts')
      .select('name, company_name, logo_url, primary_brand_color, secondary_brand_color, tagline, service_description')
      .eq('id', accountId)
      .single(),
    supabase
      .from('lead_page_templates')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
    contact.member_user_id
      ? supabase
          .from('profiles')
          .select('name, email, phone_number, calendar_url, avatar_url')
          .eq('id', contact.member_user_id)
          .single()
      : Promise.resolve({ data: null }),
  ])

  const account = accountRes.data
  const template = templateRes.data
  const member = memberRes.data

  // ── 5. Track page view ──
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || ''
  const userAgent = req.headers.get('user-agent') || ''

  supabase.from('lead_tracking_events').insert({
    contact_id: contact.id,
    event_type: 'page_view',
    event_data: { domain: host, slug, member_code: memberCode, member_user_id: contact.member_user_id },
    ip_address: clientIp,
    user_agent: userAgent,
  }).then(() => {}).then(null, (e: unknown) => console.error('tracking error:', e))

  // ── 6. Render ──
  const firstName = contact.first_name || ''
  const lastName = contact.last_name || ''
  const company = contact.company || 'dein Unternehmen'
  const videoUrl = contact.pitch_video_url || contact.video_url

  const page = renderLeadPage({
    firstName,
    lastName,
    company,
    videoUrl,
    account,
    template,
    member,
    host,
    slug,
    memberCode,
  })

  return html(page)
})

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}

// ─── Render Functions ─────────────────────────────────

interface RenderData {
  firstName: string
  lastName: string
  company: string
  videoUrl: string | null
  account: any
  template: any
  member: any
  host: string
  slug: string
  memberCode: number
}

function renderLeadPage(d: RenderData): string {
  // Colors
  const p = d.template?.primary_color || d.account?.primary_brand_color || '#06b6d4'
  const s = d.template?.secondary_color || d.account?.secondary_brand_color || '#a855f7'
  const bg = d.template?.background_color || '#0f172a'
  const txt = d.template?.text_color || '#f8fafc'
  const accent = d.template?.accent_color || '#f59e0b'

  // Template data with defaults
  const t = {
    headerLogoText: d.template?.header_logo_text || d.account?.company_name || d.account?.name || '',
    headerLogoAccent: d.template?.header_logo_accent || '',
    headerCta: personalize(d.template?.header_cta_text || '{{first_name}}, lass uns sprechen!', d.firstName, d.company),
    heroHeadline: personalize(d.template?.hero_headline || 'Hey {{first_name}}, sieh dir das kurz an', d.firstName, d.company),
    heroSub: personalize(d.template?.hero_subheadline || 'Eine persönliche Nachricht für dich.', d.firstName, d.company),
    heroCtaText: d.template?.hero_cta_text || 'Gratis Termin vereinbaren',
    videoCaption: personalize(d.template?.hero_video_caption || 'Nur für dich {{first_name}}, schau kurz rein!', d.firstName, d.company),

    coachingBadge: d.template?.coaching_badge || '',
    coachingHeadline: d.template?.coaching_headline || '',
    coachingSub: personalize(d.template?.coaching_subheadline || '', d.firstName, d.company),
    pillar1Title: d.template?.pillar1_title || '',
    pillar1Sub: d.template?.pillar1_subtitle || '',
    pillar1Items: (d.template?.pillar1_items as string[]) || [],
    pillar2Title: d.template?.pillar2_title || '',
    pillar2Sub: d.template?.pillar2_subtitle || '',
    pillar2Items: (d.template?.pillar2_items as string[]) || [],
    combinedHeadline: d.template?.combined_headline || '',
    combinedText: d.template?.combined_text || '',

    compBadge: d.template?.comparison_badge || '',
    compHeadline: d.template?.comparison_headline || '',
    compSub: d.template?.comparison_subheadline || '',
    othersTitle: d.template?.others_title || 'Andere',
    othersItems: (d.template?.others_items as string[]) || [],
    usTitle: d.template?.us_title || 'Wir',
    usItems: (d.template?.us_items as string[]) || [],

    caseStudies: (d.template?.case_studies as any[]) || [],
    caseStudiesBadge: d.template?.case_studies_badge || '',
    caseStudiesHeadline: personalize(d.template?.case_studies_headline || '', d.firstName, d.company),
    caseStudiesSub: d.template?.case_studies_subheadline || '',

    testimonials: (d.template?.testimonials as any[]) || [],
    testimonialsBadge: d.template?.testimonials_badge || '',
    testimonialsHeadline: d.template?.testimonials_headline || '',
    testimonialsSub: d.template?.testimonials_subheadline || '',

    guaranteeBadge: d.template?.guarantee_badge || '',
    guaranteeHeadline: d.template?.guarantee_headline || '',
    guaranteeDesc: d.template?.guarantee_description || '',
    guaranteeItems: (d.template?.guarantee_items as string[]) || [],

    faqBadge: d.template?.faq_badge || '',
    faqHeadline: d.template?.faq_headline || '',
    faqSub: d.template?.faq_subheadline || '',
    faqItems: (d.template?.faq_items as any[]) || [],

    ctaHeadline: personalize(d.template?.cta_headline || 'Bereit, {{first_name}}?', d.firstName, d.company),
    ctaDesc: d.template?.cta_description || '',
    ctaButton: d.template?.cta_button_text || 'Jetzt Termin buchen',

    footerCompany: d.template?.footer_company_name || d.account?.company_name || '',
    footerTagline: d.template?.footer_tagline || 'Alle Rechte vorbehalten.',
    impressumUrl: d.template?.footer_impressum_url || '',
    datenschutzUrl: d.template?.footer_datenschutz_url || '',
  }

  const calendarUrl = d.member?.calendar_url || d.template?.calendar_url || ''
  const logoUrl = d.account?.logo_url || ''
  const memberName = esc(d.member?.name || '')
  const memberEmail = esc(d.member?.email || '')
  const memberPhone = esc(d.member?.phone_number || '')
  const memberAvatar = d.member?.avatar_url || ''

  const trackUrl = `${SUPABASE_URL}/functions/v1/track-lead-event`

  // ── Video Section ──
  let videoHtml = ''
  if (d.videoUrl) {
    const isYT = d.videoUrl.includes('youtube.com') || d.videoUrl.includes('youtu.be')
    if (isYT) {
      let ytId = ''
      if (d.videoUrl.includes('youtu.be/')) ytId = d.videoUrl.split('youtu.be/')[1]?.split('?')[0] || ''
      else if (d.videoUrl.includes('v=')) { const m = d.videoUrl.match(/[?&]v=([^&]+)/); ytId = m?.[1] || '' }
      else if (d.videoUrl.includes('/embed/')) ytId = d.videoUrl.split('/embed/')[1]?.split('?')[0] || ''
      videoHtml = `
        <div class="vid-wrap" id="vid-wrap">
          <div class="vid-overlay" id="vid-overlay" onclick="playVid()">
            <img src="https://img.youtube.com/vi/${ytId}/maxresdefault.jpg" alt="Video" class="vid-thumb">
            <div class="play-ov"><button class="play-btn">&#9654; Jetzt ansehen</button></div>
          </div>
          <div id="vid-player" style="display:none">
            <iframe id="yt-frame" src="https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1" style="width:100%;aspect-ratio:16/9;border:none" allow="autoplay;encrypted-media" allowfullscreen></iframe>
          </div>
        </div>`
    } else {
      videoHtml = `
        <div class="vid-wrap" id="vid-wrap">
          <div class="vid-overlay" id="vid-overlay" onclick="playVid()">
            <video src="${esc(d.videoUrl)}" class="vid-thumb" muted playsinline></video>
            <div class="play-ov"><button class="play-btn">&#9654; Jetzt ansehen</button></div>
          </div>
          <div id="vid-player" style="display:none">
            <video id="lead-vid" src="${esc(d.videoUrl)}" controls autoplay playsinline style="width:100%;aspect-ratio:16/9"></video>
          </div>
        </div>`
    }
  } else {
    videoHtml = `<div class="vid-wrap" style="aspect-ratio:16/9;display:flex;align-items:center;justify-content:center"><p style="opacity:.5">Video wird vorbereitet...</p></div>`
  }

  // ── Pillar Items ──
  const pillar1Html = t.pillar1Items.map(i => `<li><svg class="ck" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="${p}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${esc(i)}</span></li>`).join('')
  const pillar2Html = t.pillar2Items.map(i => `<li><svg class="ck" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="${s}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${esc(i)}</span></li>`).join('')

  // ── Case Studies ──
  const caseStudiesHtml = t.caseStudies.length > 0 ? `
    <section class="sec">
      <div class="sec-inner">
        <div class="sec-hdr">
          ${t.caseStudiesBadge ? `<span class="badge" style="background:${accent}22;color:${accent};border-color:${accent}44">${esc(t.caseStudiesBadge)}</span>` : ''}
          <h2>${esc(t.caseStudiesHeadline)}</h2>
          ${t.caseStudiesSub ? `<p class="sub">${esc(t.caseStudiesSub)}</p>` : ''}
        </div>
        <div class="cs-grid">
          ${t.caseStudies.map(cs => `
            <div class="cs-card" style="border-color:${accent}33;background:${accent}0a">
              <div class="cs-stars">${'&#9733;'.repeat(cs.rating || 5)}</div>
              <h4>${esc(cs.title)}</h4>
              <p class="cs-type">${esc(cs.company_type)}</p>
              <div class="cs-rev"><s>${esc(cs.before_revenue)}</s> → <strong style="color:${p}">${esc(cs.after_revenue)}</strong> <small>${esc(cs.timeframe)}</small></div>
              <p class="cs-desc">${esc(cs.description)}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>` : ''

  // ── Comparison ──
  const comparisonHtml = (t.othersItems.length > 0 || t.usItems.length > 0) ? `
    <section class="sec sec-alt">
      <div class="sec-inner">
        <div class="sec-hdr">
          ${t.compBadge ? `<span class="badge" style="background:${s}22;color:${s};border-color:${s}44">${esc(t.compBadge)}</span>` : ''}
          <h2>${esc(t.compHeadline)}</h2>
          ${t.compSub ? `<p class="sub">${esc(t.compSub)}</p>` : ''}
        </div>
        <div class="comp-grid">
          <div class="comp-card comp-bad">
            <h4>&#10005; ${esc(t.othersTitle)}</h4>
            <ul>${t.othersItems.map(i => `<li><span class="x-icon">&#10005;</span>${esc(i)}</li>`).join('')}</ul>
          </div>
          <div class="comp-card comp-good">
            <h4>&#10003; ${esc(t.usTitle)}</h4>
            <ul>${t.usItems.map(i => `<li><span class="ck-icon">&#10003;</span>${esc(i)}</li>`).join('')}</ul>
          </div>
        </div>
      </div>
    </section>` : ''

  // ── Testimonials ──
  const testimonialsHtml = t.testimonials.length > 0 ? `
    <section class="sec">
      <div class="sec-inner">
        <div class="sec-hdr">
          ${t.testimonialsBadge ? `<span class="badge" style="background:${p}22;color:${p};border-color:${p}44">${esc(t.testimonialsBadge)}</span>` : ''}
          <h2>${esc(t.testimonialsHeadline)}</h2>
          ${t.testimonialsSub ? `<p class="sub">${esc(t.testimonialsSub)}</p>` : ''}
        </div>
        <div class="testi-grid">
          ${t.testimonials.map((tm: any) => `
            <div class="testi-card" style="border-color:${p}33;background:${p}08">
              <p class="testi-quote">"${esc(tm.quote)}"</p>
              <div class="testi-author">
                ${tm.image_url ? `<img src="${esc(tm.image_url)}" alt="${esc(tm.author)}" class="testi-img">` : `<div class="testi-avatar" style="background:${p};color:${bg}">${esc(tm.author?.charAt(0) || '')}</div>`}
                <div><strong>${esc(tm.author)}</strong><br><small>${esc(tm.role)}, ${esc(tm.company)}</small></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>` : ''

  // ── Guarantee ──
  const guaranteeHtml = t.guaranteeItems.length > 0 ? `
    <section class="sec sec-alt" style="background:${accent}0a">
      <div class="sec-inner">
        <div class="sec-hdr">
          ${t.guaranteeBadge ? `<span class="badge" style="background:${accent}22;color:${accent};border-color:${accent}44">${esc(t.guaranteeBadge)}</span>` : ''}
          <h2>${esc(t.guaranteeHeadline)}</h2>
          ${t.guaranteeDesc ? `<p class="sub">${esc(t.guaranteeDesc)}</p>` : ''}
        </div>
        <div class="guar-items">
          ${t.guaranteeItems.map(i => `<span class="guar-pill" style="border-color:${accent}44;background:${accent}15"><span class="ck-icon" style="color:${accent}">&#10003;</span>${esc(i)}</span>`).join('')}
        </div>
      </div>
    </section>` : ''

  // ── FAQ ──
  const faqHtml = t.faqItems.length > 0 ? `
    <section class="sec" style="background:${p}08">
      <div class="sec-inner">
        <div class="sec-hdr">
          ${t.faqBadge ? `<span class="badge" style="background:${p}22;color:${p};border-color:${p}44">${esc(t.faqBadge)}</span>` : ''}
          <h2>${esc(t.faqHeadline)}</h2>
          ${t.faqSub ? `<p class="sub">${esc(t.faqSub)}</p>` : ''}
        </div>
        <div class="faq-list">
          ${t.faqItems.map((fq: any) => `
            <details class="faq-item" style="border-color:${p}33">
              <summary style="color:${p}">${esc(fq.question)}</summary>
              <p>${esc(fq.answer)}</p>
            </details>
          `).join('')}
        </div>
      </div>
    </section>` : ''

  // ── Member Contact Card ──
  const memberCardHtml = (memberName || memberEmail) ? `
    <section class="sec sec-alt">
      <div class="sec-inner">
        <div class="member-card">
          ${memberAvatar ? `<img src="${esc(memberAvatar)}" alt="${memberName}" class="member-img">` : `<div class="member-avatar" style="background:${p};color:${bg}">${memberName.charAt(0)}</div>`}
          <div class="member-info">
            <h3>Dein Ansprechpartner</h3>
            <p class="member-name">${memberName}</p>
            ${memberEmail ? `<a href="mailto:${memberEmail}" class="member-link">${memberEmail}</a>` : ''}
            ${memberPhone ? `<a href="tel:${memberPhone}" class="member-link">${memberPhone}</a>` : ''}
            ${calendarUrl ? `<a href="${esc(calendarUrl)}" target="_blank" rel="noopener" class="member-cta" style="background:${p};color:${bg}">Termin buchen</a>` : ''}
          </div>
        </div>
      </div>
    </section>` : ''

  // ── Coaching Section ──
  const coachingHtml = (t.pillar1Items.length > 0 || t.pillar2Items.length > 0) ? `
    <section class="sec sec-alt" style="background:${p}0a">
      <div class="sec-inner">
        <div class="sec-hdr">
          ${t.coachingBadge ? `<span class="badge" style="background:${p}22;color:${p};border-color:${p}44">${esc(t.coachingBadge)}</span>` : ''}
          <h2>${esc(t.coachingHeadline)}</h2>
          ${t.coachingSub ? `<p class="sub">${esc(t.coachingSub)}</p>` : ''}
        </div>
        <div class="pillar-grid">
          ${t.pillar1Items.length > 0 ? `
          <div class="pillar-card" style="border-color:${p}44;background:${p}11">
            <div class="pillar-hdr">
              <h3>${esc(t.pillar1Title)}</h3>
              <span class="pillar-sub">${esc(t.pillar1Sub)}</span>
            </div>
            <ul>${pillar1Html}</ul>
          </div>` : ''}
          ${t.pillar2Items.length > 0 ? `
          <div class="pillar-card" style="border-color:${s}44;background:${s}11">
            <div class="pillar-hdr">
              <h3>${esc(t.pillar2Title)}</h3>
              <span class="pillar-sub">${esc(t.pillar2Sub)}</span>
            </div>
            <ul>${pillar2Html}</ul>
          </div>` : ''}
        </div>
        ${t.combinedHeadline ? `<div class="combined" style="background:${accent}15;border-color:${accent}33"><h3>${esc(t.combinedHeadline)}</h3><p>${esc(t.combinedText)}</p></div>` : ''}
      </div>
    </section>` : ''

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.firstName)}, schau dir das kurz an</title>
<meta name="description" content="Persönliche Nachricht für ${esc(d.firstName)} ${esc(d.lastName)}">
<meta property="og:title" content="${esc(d.firstName)}, schau dir das kurz an">
<meta property="og:description" content="Eine persönliche Nachricht von ${esc(t.footerCompany)}">
<meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--p:${p};--s:${s};--bg:${bg};--txt:${txt};--acc:${accent}}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',-apple-system,sans-serif;background:var(--bg);color:var(--txt);line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}

/* Header */
.hdr{border-bottom:1px solid ${txt}15;position:sticky;top:0;background:${bg}ee;backdrop-filter:blur(12px);z-index:50}
.hdr-in{max-width:1200px;margin:0 auto;padding:.75rem 1.25rem;display:flex;align-items:center;justify-content:space-between}
.logo{font-size:1.15rem;font-weight:700;display:flex;align-items:center;gap:.5rem}
.logo img{height:2rem;width:auto}
.logo-accent{color:var(--p)}
.hdr-cta{background:var(--p);color:var(--bg);font-weight:600;padding:.5rem 1rem;border-radius:.5rem;font-size:.8rem;transition:opacity .2s;white-space:nowrap}
.hdr-cta:hover{opacity:.9}

/* Hero */
.hero{padding:3rem 1.25rem 2rem}
.hero-in{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:center}
@media(max-width:768px){.hero-in{grid-template-columns:1fr;gap:1.5rem;text-align:center}}
.hero h1{font-size:clamp(1.75rem,5vw,3rem);font-weight:800;line-height:1.1;margin-bottom:1rem}
.hero .sub{font-size:1.05rem;opacity:.8;margin-bottom:1.5rem}
.accent{color:var(--p);font-weight:600}
.cta-btn{display:inline-flex;align-items:center;gap:.5rem;background:var(--p);color:var(--bg);font-weight:600;padding:.9rem 1.75rem;border-radius:.75rem;font-size:1rem;border:none;cursor:pointer;transition:transform .15s,opacity .15s;text-decoration:none}
.cta-btn:hover{transform:scale(1.03);opacity:.95}

/* Video */
.vid-wrap{border-radius:.75rem;overflow:hidden;border:1px solid ${txt}20;background:${txt}08;box-shadow:0 20px 40px ${p}15}
.vid-overlay{position:relative;cursor:pointer}
.vid-thumb{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}
.play-ov{position:absolute;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;transition:background .2s}
.vid-overlay:hover .play-ov{background:rgba(0,0,0,.35)}
.play-btn{background:var(--p);color:var(--bg);font-weight:600;padding:1rem 2rem;border-radius:9999px;border:none;cursor:pointer;font-size:1rem;box-shadow:0 8px 20px ${p}40;transition:transform .15s}
.play-btn:hover{transform:scale(1.05)}
.vid-caption{text-align:center;opacity:.7;margin-top:1rem;font-size:.9rem}

/* Sections */
.sec{padding:3.5rem 1.25rem}
.sec-alt{background:${txt}04}
.sec-inner{max-width:1000px;margin:0 auto}
.sec-hdr{text-align:center;margin-bottom:2rem}
.sec-hdr h2{font-size:1.75rem;font-weight:700;margin-bottom:.5rem}
.sec-hdr .sub{opacity:.6;max-width:600px;margin:0 auto}
.badge{display:inline-block;padding:.25rem .75rem;border-radius:9999px;font-size:.75rem;font-weight:500;margin-bottom:.75rem;border:1px solid}

/* Pillars */
.pillar-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem}
@media(max-width:640px){.pillar-grid{grid-template-columns:1fr}}
.pillar-card{border-radius:.75rem;padding:1.5rem;border:1px solid}
.pillar-hdr h3{font-size:1.1rem;font-weight:600;margin-bottom:.15rem}
.pillar-sub{font-size:.8rem;opacity:.6}
.pillar-card ul{list-style:none;margin-top:1rem;display:flex;flex-direction:column;gap:.6rem}
.pillar-card li{display:flex;align-items:flex-start;gap:.5rem;font-size:.875rem}
.ck{width:1rem;height:1rem;flex-shrink:0;margin-top:.15rem}
.combined{margin-top:1.25rem;padding:1.25rem;border-radius:.75rem;text-align:center;border:1px solid}
.combined h3{font-size:1.1rem;margin-bottom:.35rem}
.combined p{font-size:.9rem;opacity:.8}

/* Case Studies */
.cs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem}
.cs-card{border-radius:.75rem;padding:1.25rem;border:1px solid}
.cs-stars{color:var(--acc);font-size:1rem;margin-bottom:.35rem}
.cs-card h4{font-weight:600;margin-bottom:.15rem}
.cs-type{font-size:.75rem;opacity:.5;margin-bottom:.5rem}
.cs-rev{font-size:.875rem;margin-bottom:.5rem;display:flex;align-items:center;gap:.35rem;flex-wrap:wrap}
.cs-rev s{opacity:.5}
.cs-rev small{opacity:.5;font-size:.75rem}
.cs-desc{font-size:.85rem;opacity:.8}

/* Comparison */
.comp-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;max-width:800px;margin:0 auto}
@media(max-width:640px){.comp-grid{grid-template-columns:1fr}}
.comp-card{border-radius:.75rem;padding:1.25rem;border:1px solid}
.comp-bad{border-color:#ef444440;background:#ef44440a}
.comp-good{border-color:#22c55e40;background:#22c55e0a}
.comp-card h4{font-weight:600;margin-bottom:.75rem;display:flex;align-items:center;gap:.35rem}
.comp-bad h4{color:#ef4444}
.comp-good h4{color:#22c55e}
.comp-card ul{list-style:none;display:flex;flex-direction:column;gap:.5rem}
.comp-card li{display:flex;align-items:flex-start;gap:.4rem;font-size:.85rem;opacity:.85}
.x-icon{color:#ef4444;flex-shrink:0}
.ck-icon{color:#22c55e;flex-shrink:0}

/* Testimonials */
.testi-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;max-width:800px;margin:0 auto}
@media(max-width:640px){.testi-grid{grid-template-columns:1fr}}
.testi-card{border-radius:.75rem;padding:1.25rem;border:1px solid}
.testi-quote{font-style:italic;font-size:1rem;margin-bottom:1rem;opacity:.9}
.testi-author{display:flex;align-items:center;gap:.75rem}
.testi-img{width:2.5rem;height:2.5rem;border-radius:50%;object-fit:cover}
.testi-avatar{width:2.5rem;height:2.5rem;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem}
.testi-author strong{display:block;font-size:.875rem}
.testi-author small{opacity:.6;font-size:.75rem}

/* Guarantee */
.guar-items{display:flex;flex-wrap:wrap;justify-content:center;gap:.5rem}
.guar-pill{display:inline-flex;align-items:center;gap:.35rem;padding:.4rem .85rem;border-radius:9999px;border:1px solid;font-size:.85rem;font-weight:500}

/* FAQ */
.faq-list{max-width:700px;margin:0 auto;display:flex;flex-direction:column;gap:.75rem}
.faq-item{border-radius:.75rem;padding:1rem 1.25rem;border:1px solid;background:var(--bg)}
.faq-item summary{font-weight:600;font-size:1rem;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center}
.faq-item summary::after{content:'+';font-size:1.25rem;opacity:.5;transition:transform .2s}
.faq-item[open] summary::after{transform:rotate(45deg)}
.faq-item p{margin-top:.5rem;opacity:.75;font-size:.9rem}

/* Member Card */
.member-card{display:flex;align-items:center;gap:1.5rem;max-width:500px;margin:0 auto;padding:1.5rem;border-radius:1rem;background:${txt}08;border:1px solid ${txt}15}
@media(max-width:640px){.member-card{flex-direction:column;text-align:center}}
.member-img{width:4.5rem;height:4.5rem;border-radius:50%;object-fit:cover;border:3px solid var(--p)}
.member-avatar{width:4.5rem;height:4.5rem;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.5rem;flex-shrink:0}
.member-info h3{font-size:.8rem;text-transform:uppercase;letter-spacing:.05em;opacity:.5;margin-bottom:.25rem}
.member-name{font-size:1.1rem;font-weight:600;margin-bottom:.35rem}
.member-link{display:block;font-size:.85rem;color:var(--p);margin-bottom:.25rem}
.member-link:hover{text-decoration:underline}
.member-cta{display:inline-flex;align-items:center;gap:.35rem;padding:.5rem 1.25rem;border-radius:.5rem;font-weight:600;font-size:.85rem;margin-top:.5rem;transition:opacity .15s}
.member-cta:hover{opacity:.9}

/* CTA */
.cta-sec{padding:4rem 1.25rem;text-align:center;background:linear-gradient(135deg,var(--p),var(--s))}
.cta-sec h2{font-size:clamp(1.5rem,4vw,2rem);font-weight:700;margin-bottom:1rem}
.cta-sec p{font-size:1rem;opacity:.9;margin-bottom:2rem;max-width:550px;margin-left:auto;margin-right:auto}
.cta-sec .cta-btn{background:var(--acc);color:#fff;font-size:1.1rem;padding:1rem 2rem;box-shadow:0 8px 24px rgba(0,0,0,.25)}

/* Footer */
.foot{border-top:1px solid ${txt}12;padding:1.5rem 1.25rem}
.foot-in{max-width:1000px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.75rem;font-size:.8rem;opacity:.5}
.foot a:hover{opacity:1}
.foot-links{display:flex;gap:1.25rem}
</style>
</head>
<body>

<!-- Header -->
<header class="hdr">
  <div class="hdr-in">
    <div class="logo">
      ${logoUrl ? `<img src="${esc(logoUrl)}" alt="Logo">` : `<span><span class="logo-accent">${esc(t.headerLogoAccent)}</span>${esc(t.headerLogoText.replace(t.headerLogoAccent, ''))}</span>`}
    </div>
    ${calendarUrl ? `<a href="${esc(calendarUrl)}" target="_blank" rel="noopener" class="hdr-cta">${esc(t.headerCta)}</a>` : ''}
  </div>
</header>

<!-- Hero -->
<section class="hero">
  <div class="hero-in">
    <div>
      <h1>${t.heroHeadline}</h1>
      <p class="sub">${t.heroSub}</p>
      ${calendarUrl ? `<a href="${esc(calendarUrl)}" target="_blank" rel="noopener" class="cta-btn">&#128197; ${esc(t.heroCtaText)}</a>` : ''}
    </div>
    <div>
      ${videoHtml}
      <p class="vid-caption">${t.videoCaption}</p>
    </div>
  </div>
</section>

${coachingHtml}
${caseStudiesHtml}
${comparisonHtml}
${testimonialsHtml}
${guaranteeHtml}
${faqHtml}
${memberCardHtml}

<!-- CTA -->
<section class="cta-sec">
  <h2>${t.ctaHeadline}</h2>
  <p>${esc(t.ctaDesc)}</p>
  ${calendarUrl ? `<a href="${esc(calendarUrl)}" target="_blank" rel="noopener" class="cta-btn">&#128197; ${esc(t.ctaButton)}</a>` : (memberEmail ? `<a href="mailto:${memberEmail}" class="cta-btn">&#9993; ${esc(t.ctaButton)}</a>` : '')}
  <p style="font-size:.8rem;opacity:.6;margin-top:1rem">Unverbindlich &amp; kostenlos</p>
</section>

<!-- Footer -->
<footer class="foot">
  <div class="foot-in">
    <span>&copy; ${new Date().getFullYear()} ${esc(t.footerCompany)}. ${esc(t.footerTagline)}</span>
    <div class="foot-links">
      ${t.impressumUrl ? `<a href="${esc(t.impressumUrl)}" target="_blank" rel="noopener">Impressum</a>` : ''}
      ${t.datenschutzUrl ? `<a href="${esc(t.datenschutzUrl)}" target="_blank" rel="noopener">Datenschutz</a>` : ''}
    </div>
  </div>
</footer>

<script>
function playVid(){
  document.getElementById('vid-overlay').style.display='none';
  var p=document.getElementById('vid-player');p.style.display='block';
  var v=document.getElementById('lead-vid');if(v)v.play();
  var f=document.getElementById('yt-frame');if(f)f.src=f.src+'&autoplay=1';
  trk('video_play');
}
function trk(t,d){
  try{fetch('${trackUrl}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event_type:t,slug:'${d.slug}',event_data:Object.assign({domain:'${d.host}',slug:'${d.slug}',member_code:${d.memberCode}},d||{})})}).catch(function(){});}catch(e){}
}
trk('page_view');
</script>
</body>
</html>`
}

function notFoundPage(): string {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nicht gefunden</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',-apple-system,sans-serif;background:#0f172a;color:#94a3b8;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:1rem;text-align:center}h1{color:#fff;font-size:1.5rem;margin-bottom:.75rem}</style></head><body><div><h1>Seite nicht gefunden</h1><p>Dieser Link ist leider ungültig oder abgelaufen.</p></div></body></html>`
}

function rootPage(account: any, host: string): string {
  const name = esc(account?.company_name || account?.name || host)
  const c = account?.primary_brand_color || '#06b6d4'
  const logo = account?.logo_url || ''
  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh}.c{text-align:center;padding:2rem}h1{font-size:2rem;margin-bottom:.5rem;color:${c}}img{height:3rem;margin-bottom:1rem}p{opacity:.6}</style></head><body><div class="c">${logo ? `<img src="${esc(logo)}" alt="${name}">` : ''}<h1>${name}</h1><p>Personalisierte Lead-Seiten</p></div></body></html>`
}
