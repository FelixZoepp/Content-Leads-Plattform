import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Required fields for validation
const REQUIRED_FIELDS = [
  'date', 'posts', 'impressions', 'likes', 'comments', 
  'new_followers', 'leads_total', 'leads_qualified', 
  'appointments', 'deals'
];

// Utility functions
function toISODate(v: any): string | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v).trim());
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function toNum(v: any): number {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const cleaned = String(v).trim().replace(',', '.');
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantId, dryRun = false } = await req.json();
    console.log(`Starting sync for tenant ${tenantId}, dryRun=${dryRun}`);
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get tenant's sheet URL and mapping
    const { data: tenant, error: tenantError } = await supabaseClient
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();

    if (tenantError) throw tenantError;
    if (!tenant.sheet_url) {
      return new Response(JSON.stringify({ 
        error: "NO_SHEET_URL",
        message: "Kein Google Sheet verbunden. Bitte verbinde erst ein Sheet.",
        userAction: "Verbinde dein Google Sheet in den Einstellungen."
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract Google Sheets ID from URL
    const sheetIdMatch = tenant.sheet_url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      return new Response(JSON.stringify({ 
        error: "INVALID_URL",
        message: "Ungültige Google Sheets URL",
        userAction: "Bitte überprüfe den Sheet-Link."
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sheetId = sheetIdMatch[1];

    // Construct CSV export URL
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    
    console.log("Fetching sheet data from:", csvUrl);
    
    // Pre-flight check: Fetch CSV data
    const csvResponse = await fetch(csvUrl);
    if (!csvResponse.ok) {
      const errorCode = csvResponse.status === 403 ? "PERMISSION_DENIED" : "FETCH_FAILED";
      const message = csvResponse.status === 403 
        ? "Zugriff verweigert. Sheet ist nicht freigegeben."
        : `Fehler beim Laden: ${csvResponse.statusText}`;
      
      return new Response(JSON.stringify({ 
        error: errorCode,
        message,
        userAction: csvResponse.status === 403 
          ? "Bitte stelle sicher, dass das Sheet mit 'Jeder mit dem Link - Betrachter' freigegeben ist."
          : "Bitte überprüfe den Sheet-Link und versuche es erneut."
      }), {
        status: csvResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const csvText = await csvResponse.text();
    console.log("CSV text length:", csvText.length);
    
    // Parse CSV properly
    const lines = csvText.split('\n').filter(line => line.trim());
    console.log("Total lines found:", lines.length);
    
    if (lines.length < 1) {
      return new Response(JSON.stringify({ 
        error: "EMPTY_SHEET",
        message: "Sheet ist leer",
        userAction: "Bitte füge mindestens eine Header-Zeile und eine Datenzeile hinzu."
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (lines.length < 2) {
      return new Response(JSON.stringify({ 
        error: "NO_DATA_ROWS",
        message: "Keine Datenzeilen gefunden",
        userAction: "Bitte füge mindestens eine Datenzeile unterhalb der Header-Zeile hinzu."
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const rows = lines.map(line => parseCSVLine(line));
    const headers = rows[0].map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));
    const mapping = tenant.sheet_mapping || {};
    
    console.log("Headers found:", headers);
    console.log("Mapping:", mapping);

    // Build column mapping
    const columnMap: Record<string, number> = {
      date: mapping.date ?? headers.findIndex(h => ['datum', 'date', 'tag'].includes(h)),
      posts: mapping.posts ?? headers.findIndex(h => ['posts', 'beiträge', 'beitrage'].includes(h)),
      impressions: mapping.impressions ?? headers.findIndex(h => ['impressions', 'impressionen', 'reichweite'].includes(h)),
      likes: mapping.likes ?? headers.findIndex(h => ['likes', 'gefällt_mir', 'gefallt_mir'].includes(h)),
      comments: mapping.comments ?? headers.findIndex(h => ['comments', 'kommentare', 'bemerkungen'].includes(h)),
      new_followers: mapping.new_followers ?? headers.findIndex(h => ['neue_follower', 'new_followers', 'follower'].includes(h)),
      leads_total: mapping.leads_total ?? headers.findIndex(h => ['leads_total', 'leads_gesamt', 'total_leads'].includes(h)),
      leads_qualified: mapping.leads_qualified ?? headers.findIndex(h => ['leads_qualified', 'leads_qualifiziert', 'qualifizierte_leads'].includes(h)),
      appointments: mapping.appointments ?? headers.findIndex(h => ['appointments', 'termine', 'meetings'].includes(h)),
      deals: mapping.deals ?? headers.findIndex(h => ['deals', 'abschlüsse', 'abschlusse'].includes(h)),
      revenue: mapping.revenue ?? headers.findIndex(h => ['revenue', 'umsatz', 'einnahmen'].includes(h)),
    };
    
    // Validate mapping - check for missing required fields
    const missingFields = REQUIRED_FIELDS.filter(field => columnMap[field] === -1);
    if (missingFields.length > 0) {
      console.log("Missing fields:", missingFields);
      return new Response(JSON.stringify({ 
        error: "HEADER_MISMATCH",
        message: `Fehlende Pflichtfelder: ${missingFields.join(', ')}`,
        missingFields,
        availableHeaders: headers,
        userAction: "Bitte passe das Mapping an oder füge die fehlenden Spalten im Sheet hinzu.",
        mappingStatus: REQUIRED_FIELDS.map(field => ({
          field,
          ok: columnMap[field] !== -1,
          mappedTo: columnMap[field] !== -1 ? headers[columnMap[field]] : null
        }))
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse data rows (skip header)
    const metricsToInsert = [];
    const parseErrors = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 2 || !row.some(cell => cell.trim())) continue; // Skip empty rows

      try {
        const dateStr = row[columnMap.date]?.trim();
        if (!dateStr) {
          parseErrors.push({ row: i + 1, error: 'Kein Datum', data: row });
          continue;
        }

        // Parse date with better handling
        const periodDate = toISODate(dateStr);
        if (!periodDate) {
          parseErrors.push({ 
            row: i + 1, 
            error: `Ungültiges Datumsformat: "${dateStr}". Bitte Format DD.MM.YYYY oder YYYY-MM-DD verwenden.`, 
            data: row 
          });
          continue;
        }

        const metric = {
          tenant_id: tenantId,
          period_date: periodDate,
          period_type: 'daily',
          posts: toNum(row[columnMap.posts]),
          impressions: toNum(row[columnMap.impressions]),
          likes: toNum(row[columnMap.likes]),
          comments: toNum(row[columnMap.comments]),
          new_followers: toNum(row[columnMap.new_followers]),
          leads_total: toNum(row[columnMap.leads_total]),
          leads_qualified: toNum(row[columnMap.leads_qualified]),
          appointments: toNum(row[columnMap.appointments]),
          deals: toNum(row[columnMap.deals]),
          revenue: toNum(row[columnMap.revenue]),
        };

        metricsToInsert.push(metric);
      } catch (error) {
        console.error(`Error parsing row ${i}:`, error);
        parseErrors.push({ row: i + 1, error: String(error), data: row });
        continue;
      }
    }

    if (metricsToInsert.length === 0) {
      return new Response(JSON.stringify({ 
        error: "PARSE_ERROR",
        message: "Keine gültigen Datenzeilen gefunden",
        parseErrors: parseErrors.slice(0, 10),
        userAction: "Bitte überprüfe die Datumsformate und Zahlenwerte in deinem Sheet."
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log(`Parsed ${metricsToInsert.length} metrics, ${parseErrors.length} errors`);
    
    // Dry run mode - return preview without inserting
    if (dryRun) {
      return new Response(JSON.stringify({ 
        success: true,
        dryRun: true,
        preview: metricsToInsert.slice(0, 5),
        totalRows: metricsToInsert.length,
        parseErrors: parseErrors.slice(0, 5),
        message: `${metricsToInsert.length} Zeilen bereit zum Import${parseErrors.length > 0 ? ` (${parseErrors.length} Fehler übersprungen)` : ''}`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Real sync - upsert metrics
    console.log("Upserting metrics...");
    const { error: metricsError, count } = await supabaseClient
      .from("metrics_snapshot")
      .upsert(metricsToInsert, { 
        onConflict: 'tenant_id,period_date,period_type',
        count: 'exact'
      });

    if (metricsError) {
      console.error("Upsert error:", metricsError);
      return new Response(JSON.stringify({ 
        error: "UPSERT_FAILED",
        message: "Fehler beim Speichern der Daten",
        details: metricsError.message,
        userAction: "Bitte kontaktiere den Support."
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update last sync time
    await supabaseClient
      .from("tenants")
      .update({ 
        last_sync_at: new Date().toISOString()
      })
      .eq("id", tenantId);

    console.log(`Sync complete: ${metricsToInsert.length} rows processed`);

    return new Response(JSON.stringify({ 
      success: true, 
      rowsProcessed: metricsToInsert.length,
      parseErrors: parseErrors.length,
      message: `${metricsToInsert.length} Zeilen erfolgreich synchronisiert${parseErrors.length > 0 ? ` (${parseErrors.length} Fehler übersprungen)` : ''}`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error syncing sheet:", error);
    return new Response(JSON.stringify({ 
      error: "UNEXPECTED_ERROR",
      message: (error as Error).message,
      userAction: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut."
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
