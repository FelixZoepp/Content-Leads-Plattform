import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Ungültiges Token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('id', user.id)
      .single();

    if (!profile?.account_id) {
      return new Response(JSON.stringify({ error: 'Kein Account gefunden' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'search') {
      return await handleSearch(body, corsHeaders);
    }

    if (action === 'verify_linkedin') {
      return await handleVerifyLinkedin(body, corsHeaders);
    }

    if (action === 'save_list') {
      return await handleSaveList(supabase, body, profile.account_id, user.id, corsHeaders);
    }

    if (action === 'import_to_contacts') {
      return await handleImportToContacts(supabase, body, profile.account_id, user.id, corsHeaders);
    }

    if (action === 'enrich_list') {
      return await handleEnrichList(supabase, body, profile.account_id, user.id, corsHeaders);
    }

    if (action === 'add_to_list') {
      return await handleAddToList(supabase, body, profile.account_id, corsHeaders);
    }

    if (action === 'list_stats') {
      return await handleListStats(supabase, body, profile.account_id, corsHeaders);
    }

    return new Response(JSON.stringify({ error: 'Unbekannte Aktion' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Lead search error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Interner Fehler' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ─── SEARCH: Firecrawl-based real company search + LinkedIn check ───

async function handleSearch(body: any, corsHeaders: Record<string, string>) {
  const { industry, location, employee_count, count = 10 } = body;

  if (!industry) {
    return new Response(JSON.stringify({ error: 'Branche ist erforderlich' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  if (!FIRECRAWL_API_KEY) {
    return new Response(JSON.stringify({ error: 'Firecrawl ist nicht konfiguriert. Bitte unter Einstellungen verbinden.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'AI-Konfiguration fehlt' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const locationFilter = location || 'Deutschland';
  const employeeFilterText = employee_count && employee_count !== 'all' ? ` ${employee_count} Mitarbeiter` : '';

  try {
    // Step 1: Search for PEOPLE profiles via Firecrawl – focus on linkedin.com/in/ personal profiles
    const queries = [
      `${industry} Geschäftsführer CEO Inhaber ${locationFilter}${employeeFilterText} site:linkedin.com/in`,
      `${industry} Entscheider Managing Director ${locationFilter} site:linkedin.com/in`,
      `${industry} Gründer Founder ${locationFilter}${employeeFilterText} site:linkedin.com/in`,
    ];

    console.log('Firecrawl search queries:', queries);

    // Run all queries in parallel - NO scrapeOptions for speed
    const firecrawlResults = await Promise.all(
      queries.map(async (query) => {
        try {
          const resp = await fetch('https://api.firecrawl.dev/v1/search', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              limit: Math.min(count * 2, 20),
              lang: 'de',
              country: 'de',
            }),
          });
          if (!resp.ok) {
            console.error('Firecrawl query failed:', await resp.text());
            return [];
          }
          const data = await resp.json();
          return data.data || data.results || [];
        } catch (err) {
          console.error('Firecrawl query error:', err);
          return [];
        }
      })
    );

    // Deduplicate results by URL – only keep linkedin.com/in/ personal profiles
    const seenUrls = new Set<string>();
    const allResults: any[] = [];
    for (const results of firecrawlResults) {
      for (const r of results) {
        const url = (r.url || '').toLowerCase();
        // Skip company pages, search pages, job pages, and non-profile URLs
        if (url.includes('linkedin.com/company') || url.includes('/search') || url.includes('/jobs') || url.includes('/posts')) {
          continue;
        }
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          allResults.push(r);
        }
      }
    }

    console.log(`Firecrawl returned ${allResults.length} unique results`);

    if (allResults.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        leads: [],
        count: 0,
        verified_count: 0,
        source: 'firecrawl',
        message: 'Keine Ergebnisse gefunden. Versuche andere Suchkriterien.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Combine scraped content
    const scrapedContent = allResults.map((r: any, i: number) => {
      const title = r.title || '';
      const description = r.description || '';
      const url = r.url || '';
      return `--- Ergebnis ${i + 1} ---\nURL: ${url}\nTitel: ${title}\nBeschreibung: ${description}`;
    }).join('\n\n');

    // Step 2: Use AI to extract ONLY real data from scraped content
    const employeeInstruction = employee_count && employee_count !== 'all'
      ? `\n- WICHTIG: Nur Unternehmen mit ca. ${employee_count} Mitarbeitern. Schätze anhand der Quellen die Größe. Unternehmen die offensichtlich nicht in diese Größe passen, NICHT aufnehmen.`
      : '';

    const extractionPrompt = `Du bist ein B2B-Lead-Researcher. Analysiere die folgenden LinkedIn-Profil-Suchergebnisse und extrahiere ECHTE Personen (keine Unternehmen!).

STRIKTE REGELN:
- Extrahiere NUR PERSONEN die TATSÄCHLICH in den Suchergebnissen erwähnt werden – KEINE Unternehmensseiten
- Die Ergebnisse stammen von LinkedIn-Personenprofilen (linkedin.com/in/) – extrahiere Name, Position und Firma daraus
- ERFINDE KEINE Daten. Wenn ein Feld nicht aus den Quellen ableitbar ist, setze es auf ""
- Maximal ${count} Leads
- Nur Branche "${industry}" in "${locationFilter}"${employeeInstruction}
- Jeder Lead muss einen echten Vor- und Nachnamen und eine echte Firma haben
- Wenn du weniger als ${count} echte Leads findest, gib nur die echten zurück
- Wenn eine LinkedIn-URL (linkedin.com/in/...) direkt im Ergebnis steht, übernimm sie in linkedin_url

Gib ein JSON-Array zurück mit:
- first_name (string, aus den Quellen)
- last_name (string, aus den Quellen)
- position (string, z.B. Geschäftsführer - aus den Quellen)
- company (string, echter Firmenname aus den Quellen)
- industry (string)
- employee_count (string, z.B. "10-50" - nur wenn aus Quellen ableitbar, sonst "")
- city (string, nur wenn aus Quellen ableitbar, sonst "")
- country (string, "Deutschland" als Standard)
- website (string, echte Domain aus den Quellen, sonst "")
- linkedin_url (string, die LinkedIn-Profil-URL aus dem Ergebnis falls vorhanden, sonst "")

Antworte NUR mit validem JSON-Array. Keine Erklärungen.

SUCHERGEBNISSE:
${scrapedContent}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Du bist ein exakter Datenextrahierer. Antworte nur mit validem JSON. Erfinde NIEMALS Daten.' },
          { role: 'user', content: extractionPrompt },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI API error:', errText);
      return new Response(JSON.stringify({ error: 'Lead-Extraktion fehlgeschlagen' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    let leads: any[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        leads = JSON.parse(jsonMatch[0]);
      } else {
        leads = JSON.parse(content);
      }
    } catch (parseErr) {
      console.error('Failed to parse AI response:', content);
      return new Response(JSON.stringify({ error: 'KI-Antwort konnte nicht verarbeitet werden' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter out leads without real names
    leads = leads.filter((l: any) => l.first_name && l.last_name && l.company);

    console.log(`Extracted ${leads.length} leads from AI, now verifying LinkedIn...`);

    // Step 3: Verify LinkedIn for ALL leads before returning – only keep leads with a confirmed profile
    const verifiedLeads: any[] = [];
    const batchSize = 5;
    const leadsToCheck = leads.slice(0, Math.max(count * 3, leads.length)); // check more than needed to fill quota

    for (let i = 0; i < leadsToCheck.length && verifiedLeads.length < count; i += batchSize) {
      const batch = leadsToCheck.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (lead: any) => {
          try {
            const query = `"${lead.first_name} ${lead.last_name}" "${lead.company}" site:linkedin.com/in`;
            const resp = await fetch('https://api.firecrawl.dev/v1/search', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ query, limit: 3, lang: 'de', country: 'de' }),
            });
            if (resp.ok) {
              const data = await resp.json();
              const results = data.data || data.results || [];
              const match = results.find((r: any) => {
                const url = (r.url || '').toLowerCase();
                return url.includes('linkedin.com/in/') && !url.includes('/search');
              });
              if (match) {
                return { ...lead, linkedin_url: match.url, linkedin_verified: true };
              }
            }
          } catch (err) {
            console.error(`LinkedIn check failed for ${lead.first_name} ${lead.last_name}:`, err);
          }
          return null; // no LinkedIn = excluded
        })
      );

      for (const result of batchResults) {
        if (result && verifiedLeads.length < count) {
          verifiedLeads.push(result);
        }
      }
    }

    console.log(`${verifiedLeads.length} leads with verified LinkedIn profiles`);

    return new Response(JSON.stringify({
      success: true,
      leads: verifiedLeads,
      count: verifiedLeads.length,
      verified_count: verifiedLeads.length,
      source: 'firecrawl',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Search pipeline error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Suchfehler' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── VERIFY LINKEDIN (async, per-lead) ───

async function handleVerifyLinkedin(body: any, corsHeaders: Record<string, string>) {
  const { leads } = body;
  if (!leads?.length) {
    return new Response(JSON.stringify({ error: 'Keine Leads angegeben' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  if (!FIRECRAWL_API_KEY) {
    return new Response(JSON.stringify({ error: 'Firecrawl nicht konfiguriert' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check up to 5 leads at a time to stay within timeout
  const batch = leads.slice(0, 5);
  const results = await Promise.all(
    batch.map(async (lead: any, idx: number) => {
      try {
        const query = `"${lead.first_name} ${lead.last_name}" "${lead.company}" site:linkedin.com/in`;
        const resp = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query, limit: 3, lang: 'de', country: 'de' }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const results = data.data || data.results || [];
          const match = results.find((r: any) => {
            const url = (r.url || '').toLowerCase();
            return url.includes('linkedin.com/in/') && !url.includes('/search');
          });
          if (match) {
            return { index: idx, linkedin_url: match.url, linkedin_verified: true };
          }
        }
      } catch (err) {
        console.error(`LinkedIn check failed for ${lead.first_name} ${lead.last_name}:`, err);
      }
      return { index: idx, linkedin_url: '', linkedin_verified: false };
    })
  );

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ─── SAVE LIST ───

async function handleSaveList(supabase: any, body: any, accountId: string, userId: string, corsHeaders: Record<string, string>) {
  const { name, description, leads, filters } = body;

  if (!name || !leads?.length) {
    return new Response(JSON.stringify({ error: 'Name und Leads sind erforderlich' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: list, error: listErr } = await supabase
    .from('lead_lists')
    .insert({
      account_id: accountId,
      created_by: userId,
      name,
      description: description || null,
      search_filters: filters || {},
      total_leads: leads.length,
    })
    .select()
    .single();

  if (listErr) {
    console.error('Error creating list:', listErr);
    return new Response(JSON.stringify({ error: 'Fehler beim Erstellen der Liste' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const items = leads.map((lead: any) => ({
    list_id: list.id,
    account_id: accountId,
    first_name: lead.first_name,
    last_name: lead.last_name,
    position: lead.position || null,
    company: lead.company || null,
    industry: lead.industry || null,
    employee_count: lead.employee_count || null,
    city: lead.city || null,
    country: lead.country || null,
    website: lead.website || null,
    linkedin_url: lead.linkedin_url || null,
  }));

  const { error: itemsErr } = await supabase
    .from('lead_list_items')
    .insert(items);

  if (itemsErr) {
    console.error('Error inserting items:', itemsErr);
  }

  return new Response(JSON.stringify({ success: true, list_id: list.id, count: leads.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ─── ADD TO EXISTING LIST ───

async function handleAddToList(supabase: any, body: any, accountId: string, corsHeaders: Record<string, string>) {
  const { list_id, leads } = body;

  if (!list_id || !leads?.length) {
    return new Response(JSON.stringify({ error: 'Liste und Leads sind erforderlich' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify list belongs to account
  const { data: list, error: listErr } = await supabase
    .from('lead_lists')
    .select('id, total_leads')
    .eq('id', list_id)
    .eq('account_id', accountId)
    .single();

  if (listErr || !list) {
    return new Response(JSON.stringify({ error: 'Liste nicht gefunden' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const items = leads.map((lead: any) => ({
    list_id: list.id,
    account_id: accountId,
    first_name: lead.first_name,
    last_name: lead.last_name,
    position: lead.position || null,
    company: lead.company || null,
    industry: lead.industry || null,
    employee_count: lead.employee_count || null,
    city: lead.city || null,
    country: lead.country || null,
    website: lead.website || null,
    linkedin_url: lead.linkedin_url || null,
  }));

  const { error: itemsErr } = await supabase
    .from('lead_list_items')
    .insert(items);

  if (itemsErr) {
    console.error('Error inserting items:', itemsErr);
    return new Response(JSON.stringify({ error: 'Fehler beim Hinzufügen' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Update total_leads count
  await supabase
    .from('lead_lists')
    .update({ total_leads: (list.total_leads || 0) + leads.length })
    .eq('id', list_id);

  return new Response(JSON.stringify({ success: true, added: leads.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ─── IMPORT TO CONTACTS ───

async function handleImportToContacts(supabase: any, body: any, accountId: string, userId: string, corsHeaders: Record<string, string>) {
  const { item_ids } = body;

  if (!item_ids?.length) {
    return new Response(JSON.stringify({ error: 'Keine Items ausgewählt' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: items, error: fetchErr } = await supabase
    .from('lead_list_items')
    .select('*')
    .in('id', item_ids)
    .eq('account_id', accountId)
    .eq('imported', false);

  if (fetchErr || !items?.length) {
    return new Response(JSON.stringify({ error: 'Keine importierbaren Items gefunden' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let imported = 0;
  for (const item of items) {
    const { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .insert({
        account_id: accountId,
        owner_user_id: userId,
        first_name: item.first_name,
        last_name: item.last_name,
        position: item.position,
        company: item.company,
        city: item.city,
        country: item.country,
        website: item.website,
        linkedin_url: item.linkedin_url,
        email: item.email,
        phone: item.phone,
        source: 'Firecrawl-Recherche',
        lead_type: 'inbound',
        tags: [item.industry].filter(Boolean),
      })
      .select('id')
      .single();

    if (!contactErr && contact) {
      await supabase
        .from('lead_list_items')
        .update({ imported: true, contact_id: contact.id })
        .eq('id', item.id);
      imported++;
    }
  }

  return new Response(JSON.stringify({ success: true, imported }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ─── ENRICH LIST ───

async function handleEnrichList(supabase: any, body: any, accountId: string, userId: string, corsHeaders: Record<string, string>) {
  const { list_id } = body;

  if (!list_id) {
    return new Response(JSON.stringify({ error: 'list_id ist erforderlich' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: integration } = await supabase
    .from('account_integrations')
    .select('enrichment_webhook_url')
    .eq('account_id', accountId)
    .single();

  if (!integration?.enrichment_webhook_url) {
    return new Response(JSON.stringify({ error: 'Kein Enrichment-Webhook konfiguriert. Bitte unter Integrationen einrichten.' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: credits, error: creditsErr } = await supabase
    .rpc('get_enrichment_credits', { p_account_id: accountId });

  if (creditsErr || !credits) {
    return new Response(JSON.stringify({ error: 'Fehler beim Laden der Credits' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const creditsUsed = credits.phone_credits_used || 0;
  const creditsLimit = credits.phone_credits_limit || 100;
  const creditsAvailable = creditsLimit - creditsUsed;

  const { data: items, error: fetchErr } = await supabase
    .from('lead_list_items')
    .select('*')
    .eq('list_id', list_id)
    .eq('account_id', accountId)
    .eq('enriched', false);

  if (fetchErr || !items?.length) {
    return new Response(JSON.stringify({ error: 'Keine Leads zum Anreichern gefunden' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const maxItems = Math.min(items.length, creditsAvailable);
  if (maxItems <= 0) {
    return new Response(JSON.stringify({ 
      error: 'Kein Credit-Kontingent mehr verfügbar. Bitte Credits aufstocken.',
      credits: { available: creditsAvailable }
    }), {
      status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const itemsToEnrich = items.slice(0, maxItems);
  let enriched = 0;
  let imported = 0;
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const callbackUrl = `${supabaseUrl}/functions/v1/enrich-lead`;

  for (const item of itemsToEnrich) {
    try {
      let contactId = item.contact_id;
      if (!contactId) {
        const { data: contact, error: contactErr } = await supabase
          .from('contacts')
          .insert({
            account_id: accountId,
            owner_user_id: userId,
            first_name: item.first_name,
            last_name: item.last_name,
            position: item.position,
            company: item.company,
            city: item.city,
            country: item.country,
            website: item.website,
            linkedin_url: item.linkedin_url,
            email: item.email,
            phone: item.phone,
            source: 'Firecrawl-Recherche',
            lead_type: 'inbound',
            tags: [item.industry].filter(Boolean),
          })
          .select('id')
          .single();

        if (contactErr || !contact) {
          console.error(`Failed to import item ${item.id}:`, contactErr);
          continue;
        }

        contactId = contact.id;
        await supabase
          .from('lead_list_items')
          .update({ imported: true, contact_id: contactId })
          .eq('id', item.id);
        imported++;
      }

      const webhookPayload = {
        contact_id: contactId,
        first_name: item.first_name,
        last_name: item.last_name,
        email: item.email,
        phone: item.phone,
        position: item.position,
        company: item.company,
        linkedin_url: item.linkedin_url,
        website: item.website,
        city: item.city,
        country: item.country,
        callback_url: callbackUrl,
        account_id: accountId,
      };

      const webhookResponse = await fetch(integration.enrichment_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });

      if (webhookResponse.ok) {
        const contentType = webhookResponse.headers.get('content-type') || '';
        let syncEnriched = false;

        if (contentType.includes('application/json')) {
          const responseData = await webhookResponse.json();
          if (responseData.data && typeof responseData.data === 'object') {
            const updateFields: Record<string, unknown> = {};
            const contactFields = ['first_name', 'last_name', 'email', 'phone', 'mobile', 'position', 'company', 'linkedin_url', 'website', 'street', 'city', 'country'];
            for (const field of contactFields) {
              if (responseData.data[field] !== undefined && responseData.data[field] !== null) {
                updateFields[field] = responseData.data[field];
              }
            }
            if (Object.keys(updateFields).length > 0) {
              updateFields.updated_at = new Date().toISOString();
              await supabase.from('contacts').update(updateFields).eq('id', contactId);

              const itemUpdate: Record<string, unknown> = { enriched: true };
              if (updateFields.email) itemUpdate.email = updateFields.email;
              if (updateFields.phone) itemUpdate.phone = updateFields.phone;
              await supabase.from('lead_list_items').update(itemUpdate).eq('id', item.id);

              syncEnriched = true;
            }
          }
        }

        if (!syncEnriched) {
          await supabase.from('lead_list_items').update({ enriched: true }).eq('id', item.id);
        }

        enriched++;
      } else {
        console.error(`Webhook error for item ${item.id}: ${webhookResponse.status}`);
      }
    } catch (err) {
      console.error(`Enrich error for item ${item.id}:`, err);
    }
  }

  // Only deduct credits for successfully enriched leads
  const creditUpdate: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    phone_credits_used: (credits.phone_credits_used || 0) + enriched,
  };
  await supabase.from('enrichment_credits').update(creditUpdate).eq('id', credits.id);

  return new Response(JSON.stringify({ 
    success: true, 
    enriched, 
    imported,
    total: itemsToEnrich.length,
    remaining_credits: Math.max(0, creditsAvailable - enriched),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ─── LIST STATS ───

async function handleListStats(supabase: any, body: any, accountId: string, corsHeaders: Record<string, string>) {
  const { list_ids } = body;

  if (!list_ids?.length) {
    return new Response(JSON.stringify({ error: 'list_ids erforderlich' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const stats: Record<string, { total: number; enriched: number; imported: number }> = {};

  for (const listId of list_ids) {
    const { data: items } = await supabase
      .from('lead_list_items')
      .select('enriched, imported')
      .eq('list_id', listId)
      .eq('account_id', accountId);

    if (items) {
      stats[listId] = {
        total: items.length,
        enriched: items.filter((i: any) => i.enriched).length,
        imported: items.filter((i: any) => i.imported).length,
      };
    }
  }

  return new Response(JSON.stringify({ success: true, stats }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
