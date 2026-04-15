import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CSVRow {
  company_name?: string;
  company?: string;
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
  linkedin_url?: string;
  mobile?: string;
}

interface DuplicateMatch {
  csvRowIndex: number;
  csvData: Record<string, string>;
  existingContact: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    company: string | null;
    linkedin_url: string | null;
  };
  matchReason: 'email' | 'linkedin' | 'name_company';
}

function parseCSV(csvData: string): { headers: string[]; rows: Array<{ index: number; data: CSVRow }> } {
  const lines = csvData.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must contain header row and at least one data row');
  }

  // Parse header - handle quoted fields
  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const rows: Array<{ index: number; data: CSVRow }> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    const row: CSVRow = {};

    headers.forEach((header, idx) => {
      if (values[idx]) {
        row[header as keyof CSVRow] = values[idx].trim();
      }
    });

    rows.push({ index: i - 1, data: row });
  }

  return { headers, rows };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

async function batchDuplicateCheck(
  supabase: any,
  accountId: string,
  validRows: Array<{ index: number; data: CSVRow }>
) {
  const duplicates: DuplicateMatch[] = [];

  const allEmails = validRows.map(r => r.data.email).filter((e): e is string => !!e);
  const allLinkedins = validRows.map(r => r.data.linkedin_url).filter((l): l is string => !!l);

  const existingByEmail: Record<string, any> = {};
  const existingByLinkedin: Record<string, any> = {};

  // Batch email lookup
  for (let i = 0; i < allEmails.length; i += 200) {
    const chunk = allEmails.slice(i, i + 200);
    const { data } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, company, linkedin_url')
      .eq('account_id', accountId)
      .in('email', chunk);
    if (data) {
      for (const c of data) {
        if (c.email) existingByEmail[c.email.toLowerCase()] = c;
      }
    }
  }

  // Batch linkedin lookup
  for (let i = 0; i < allLinkedins.length; i += 200) {
    const chunk = allLinkedins.slice(i, i + 200);
    const { data } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, company, linkedin_url')
      .eq('account_id', accountId)
      .in('linkedin_url', chunk);
    if (data) {
      for (const c of data) {
        if (c.linkedin_url) existingByLinkedin[c.linkedin_url] = c;
      }
    }
  }

  let newLeadsCount = 0;

  for (const { index, data: row } of validRows) {
    let foundDuplicate = false;

    if (row.email && existingByEmail[row.email.toLowerCase()]) {
      duplicates.push({
        csvRowIndex: index,
        csvData: row as Record<string, string>,
        existingContact: existingByEmail[row.email.toLowerCase()],
        matchReason: 'email',
      });
      foundDuplicate = true;
    }

    if (!foundDuplicate && row.linkedin_url && existingByLinkedin[row.linkedin_url]) {
      duplicates.push({
        csvRowIndex: index,
        csvData: row as Record<string, string>,
        existingContact: existingByLinkedin[row.linkedin_url],
        matchReason: 'linkedin',
      });
      foundDuplicate = true;
    }

    if (!foundDuplicate) {
      newLeadsCount++;
    }
  }

  return { duplicates, newLeadsCount };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('id', user.id)
      .single();

    if (!profile?.account_id) throw new Error('User account not found');
    const accountId = profile.account_id;

    const { csvData, leadType, campaignId, mode, duplicateActions } = await req.json();
    if (!csvData) throw new Error('Missing CSV data');

    const isOutbound = leadType === 'outbound';
    const isPreviewMode = mode === 'check_duplicates';
    console.log(`Import type: ${leadType}, campaign_id: ${campaignId || 'none'}, mode: ${mode || 'import'}`);

    const { rows: parsedRows } = parseCSV(csvData);
    console.log(`Parsed ${parsedRows.length} rows`);

    // DUPLICATE CHECK MODE
    if (isPreviewMode) {
      console.log(`Running batch duplicate check for ${parsedRows.length} rows...`);
      const { duplicates, newLeadsCount } = await batchDuplicateCheck(supabase, accountId, parsedRows);
      console.log(`Batch duplicate check complete: ${duplicates.length} duplicates, ${newLeadsCount} new`);

      return new Response(
        JSON.stringify({
          mode: 'check_duplicates',
          duplicates,
          newLeadsCount,
          parsedRows: parsedRows.map(r => ({ index: r.index, data: r.data })),
          parseErrors: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // IMPORT MODE — use batch inserts
    const actionMap: Record<number, 'update' | 'skip' | 'create'> = {};
    if (duplicateActions && Array.isArray(duplicateActions)) {
      for (const action of duplicateActions) {
        actionMap[action.csvRowIndex] = action.action;
      }
    }

    // Separate rows into: skip, update, create
    const rowsToSkip: number[] = [];
    const rowsToUpdate: Array<{ index: number; data: CSVRow }> = [];
    const rowsToCreate: Array<{ index: number; data: CSVRow }> = [];

    for (const row of parsedRows) {
      const action = actionMap[row.index];
      if (action === 'skip') {
        rowsToSkip.push(row.index);
      } else if (action === 'update') {
        rowsToUpdate.push(row);
      } else {
        rowsToCreate.push(row);
      }
    }

    let imported_count = 0;
    let updated_count = 0;
    const skipped_count = rowsToSkip.length;
    const errors: Array<{ row: number; message: string }> = [];

    // Process updates individually (they need existing contact lookup)
    for (const { index, data: row } of rowsToUpdate) {
      try {
        let existingContact = null;
        if (row.email) {
          const { data } = await supabase
            .from('contacts')
            .select('id')
            .eq('email', row.email)
            .eq('account_id', accountId)
            .maybeSingle();
          existingContact = data;
        }
        if (!existingContact && row.linkedin_url) {
          const { data } = await supabase
            .from('contacts')
            .select('id')
            .eq('linkedin_url', row.linkedin_url)
            .eq('account_id', accountId)
            .maybeSingle();
          existingContact = data;
        }
        if (existingContact) {
          const companyName = row.company_name || row.company;
          await supabase
            .from('contacts')
            .update({
              first_name: row.first_name || '',
              last_name: row.last_name || '',
              company: companyName || null,
              phone: row.phone || null,
              mobile: row.mobile || null,
              position: row.position || null,
              source: row.source || null,
              linkedin_url: row.linkedin_url || null,
              email: row.email || null,
              campaign_id: campaignId || null,
            })
            .eq('id', existingContact.id);
          updated_count++;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ row: index + 2, message: msg });
      }
    }

    // Batch create new contacts in chunks of 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < rowsToCreate.length; i += BATCH_SIZE) {
      const chunk = rowsToCreate.slice(i, i + BATCH_SIZE);
      const contactInserts = chunk.map(({ data: row }) => {
        const companyName = row.company_name || row.company;
        return {
          owner_user_id: user.id,
          account_id: accountId,
          first_name: row.first_name || '',
          last_name: row.last_name || '',
          company: companyName || null,
          email: row.email || null,
          phone: row.phone || null,
          mobile: row.mobile || null,
          position: row.position || null,
          source: row.source || null,
          linkedin_url: row.linkedin_url || null,
          external_id: row.external_id || null,
          lead_type: isOutbound ? 'outbound' : 'inbound',
          workflow_status: isOutbound ? 'bereit_fuer_vernetzung' : null,
          campaign_id: campaignId || null,
        };
      });

      try {
        const { data: insertedContacts, error: insertError } = await supabase
          .from('contacts')
          .insert(contactInserts)
          .select('id');

        if (insertError) {
          console.error(`Batch insert error (rows ${i}-${i + chunk.length}):`, insertError);
          // Fallback: try one-by-one for this chunk
          for (let j = 0; j < chunk.length; j++) {
            try {
              const { error: singleErr } = await supabase
                .from('contacts')
                .insert(contactInserts[j]);
              if (singleErr) throw singleErr;
              imported_count++;
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Unknown error';
              errors.push({ row: chunk[j].index + 2, message: msg });
            }
          }
        } else {
          imported_count += insertedContacts?.length || chunk.length;
        }
      } catch (error) {
        console.error(`Chunk error:`, error);
        const msg = error instanceof Error ? error.message : 'Unknown error';
        for (const { index } of chunk) {
          errors.push({ row: index + 2, message: msg });
        }
      }
    }

    const result = { imported_count, updated_count, skipped_count, errors };
    console.log('Import completed:', JSON.stringify({ imported_count, updated_count, skipped_count, errorCount: errors.length }));

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Import leads error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
