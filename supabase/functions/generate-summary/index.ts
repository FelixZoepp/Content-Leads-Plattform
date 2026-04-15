import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantId, scope, prompt: customPrompt } = await req.json();

    // Handle admin portfolio report (no tenantId needed)
    if (scope === "admin_portfolio" && customPrompt) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Du bist ein Portfolio-Manager für eine LinkedIn-Agentur. Erstelle strukturierte, priorisierte Reports auf Deutsch." },
            { role: "user", content: customPrompt },
          ],
        }),
      });

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit erreicht." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI-Credits aufgebraucht." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!aiResponse.ok) throw new Error("AI Gateway Error");

      const aiData = await aiResponse.json();
      const summaryText = aiData.choices[0].message.content;

      const { data: summary, error: summaryError } = await supabaseClient
        .from("ai_summaries")
        .insert({ tenant_id: null, scope: "admin_portfolio", summary_text: summaryText })
        .select()
        .single();

      if (summaryError) throw summaryError;

      return new Response(JSON.stringify({ summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle onboarding initial assessment
    if (scope === "onboarding_initial") {
      const { data: tenant } = await supabaseClient
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .single();

      if (!tenant) throw new Error("Tenant not found");

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const totalCosts = (tenant.ads_spend_monthly || 0) + (tenant.tools_costs_monthly || 0) + (tenant.personnel_costs_monthly || 0) + (tenant.delivery_costs_monthly || 0) + (tenant.other_costs_monthly || 0);
      const totalRevenue = (tenant.revenue_recurring || 0) + (tenant.revenue_onetime || 0);
      const profit = totalRevenue - totalCosts;

      const onboardingPrompt = `Analysiere folgendes Unternehmensprofil und erstelle eine detaillierte Ausgangslage mit Handlungsempfehlungen.

UNTERNEHMENSDATEN:
- Firma: ${tenant.company_name}
- Branche: ${tenant.industry || "Nicht angegeben"}
- Teamgröße: ${tenant.team_size || "Nicht angegeben"}
- Zielgruppe: ${tenant.target_audience || "Nicht angegeben"}

LINKEDIN-STATUS:
- Aktuelle Follower: ${tenant.linkedin_followers_current || 0}
- Posting-Frequenz: ${tenant.posting_frequency || "Nicht angegeben"}
- Erfahrungslevel: ${tenant.linkedin_experience || "Nicht angegeben"}

AKTUELLES ANGEBOT:
- Offer: ${tenant.current_offer || "Nicht angegeben"}
- Angebotspreis: ${tenant.offer_price || 0}€
- Vertragslaufzeit: ${tenant.contract_duration || "Nicht angegeben"}
- Closing-Rate: ${tenant.closing_rate || 0}%

MONATLICHE FINANZEN:
- Einnahmen wiederkehrend: ${tenant.revenue_recurring || 0}€
- Einnahmen einmalig: ${tenant.revenue_onetime || 0}€
- Gesamtumsatz: ${totalRevenue}€
- Ads/Werbung: ${tenant.ads_spend_monthly || 0}€
- Tools & Software: ${tenant.tools_costs_monthly || 0}€
- Personal: ${tenant.personnel_costs_monthly || 0}€
- Delivery/Fulfillment: ${tenant.delivery_costs_monthly || 0}€
- Sonstige Kosten: ${tenant.other_costs_monthly || 0}€
- Gesamtkosten: ${totalCosts}€
- Gewinn/Verlust: ${profit}€
- Marge: ${tenant.margin_percent || 0}%

KENNZAHLEN:
- Leads/Monat: ${tenant.current_leads_per_month || 0}
- Monatsumsatz: ${tenant.current_revenue_monthly || 0}€
- Conversion-Rate: ${tenant.current_conversion_rate || 0}%
- Kosten pro Lead: ${tenant.cost_per_lead || 0}€
- Kosten pro Termin: ${tenant.cost_per_appointment || 0}€
- Kosten pro Kunde: ${tenant.cost_per_customer || 0}€
- Marketingbudget: ${tenant.monthly_budget || 0}€

ZIELE:
- Hauptziel: ${tenant.primary_goal || "Nicht angegeben"}
- Ziel-Leads/Monat: ${tenant.goal_leads_monthly || 0}
- Ziel-Umsatz/Monat: ${tenant.goal_revenue_monthly || 0}€
- Zeitrahmen: ${tenant.goal_timeframe || "Nicht angegeben"}

DEINE ANALYSE MUSS folgendes Format haben:

## 📊 Ausgangslage & Unit Economics
Bewerte den finanziellen Stand: Umsatz, Kosten, Marge, Gewinn. Berechne und bewerte die Unit Economics (Cost per Lead, Cost per Customer, Customer Lifetime Value basierend auf Vertragslaufzeit × Preis). Benenne klar wo Geld verbrannt wird und wo Potenzial liegt.

## 🚦 Status-Einordnung
- 🔴 **Kritisch**: [Bereiche mit sofortigem Handlungsbedarf – z.B. negative Marge, zu hohe Leadkosten]
- 🟡 **Ausbaufähig**: [Bereiche mit Optimierungspotenzial – z.B. Closing-Rate, Delivery-Kosten]
- 🟢 **Solide Basis**: [Bereiche die gut funktionieren]

## 🎯 3-Schritte-Anleitung

### Schritt 1: Sofort umsetzen (Woche 1-2)
[Konkrete Maßnahme mit erwartetem finanziellen Impact – z.B. "Closing-Rate von X% auf Y% steigern = Z€ mehr Umsatz"]

### Schritt 2: Optimieren (Woche 3-4)
[Kostenoptimierung oder Revenue-Hebel mit konkreten Zahlen]

### Schritt 3: Skalieren (Monat 2-3)
[Wachstumsstrategie basierend auf den Zieldaten]

## 📈 Realistische Prognose
Basierend auf allen Daten: Was ist in ${tenant.goal_timeframe || "6 Monaten"} bei konsequenter Umsetzung realistisch? Nenne konkrete Zahlen für Leads, Umsatz und Marge.

Sei direkt, ehrlich und faktenbasiert. Nutze die konkreten Zahlen. Max 500 Wörter.`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Du bist ein erfahrener LinkedIn-Marketing-Stratege. Du analysierst Unternehmensdaten und gibst klare, umsetzbare Empfehlungen auf Deutsch." },
            { role: "user", content: onboardingPrompt },
          ],
        }),
      });

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit erreicht." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI-Credits aufgebraucht." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!aiResponse.ok) throw new Error("AI Gateway Error");

      const aiData = await aiResponse.json();
      const summaryText = aiData.choices[0].message.content;

      const { data: summary, error: summaryError } = await supabaseClient
        .from("ai_summaries")
        .insert({ tenant_id: tenantId, scope: "onboarding_initial", summary_text: summaryText })
        .select()
        .single();

      if (summaryError) throw summaryError;

      return new Response(JSON.stringify({ summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recent metrics
    const { data: metrics, error: metricsError } = await supabaseClient
      .from("metrics_snapshot")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("period_date", { ascending: false })
      .limit(28);

    if (metricsError) throw metricsError;

    // Get benchmarks
    const { data: benchmarks } = await supabaseClient
      .from("benchmarks")
      .select("*")
      .eq("tenant_id", tenantId);

    // Get latest health score
    const { data: healthScore } = await supabaseClient
      .from("health_scores")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Get recent CSAT
    const { data: feedback } = await supabaseClient
      .from("csat_responses")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Calculate averages
    const len = metrics?.length || 1;
    const sum = (field: string) => metrics?.reduce((acc: number, m: any) => acc + (parseFloat(m[field]) || 0), 0) || 0;
    const avg = (field: string) => sum(field) / len;

    const latestMetrics = metrics?.[0];
    const previousMetrics = metrics?.[7];

    // Build benchmark classification
    const benchmarkMap: Record<string, any> = {};
    benchmarks?.forEach((b: any) => {
      benchmarkMap[b.metric_key] = {
        label: b.metric_label,
        tier1_max: Number(b.tier1_max),
        tier2_max: Number(b.tier2_max),
        unit: b.unit,
      };
    });

    const classify = (key: string, value: number) => {
      const b = benchmarkMap[key];
      if (!b) return { tier: "unbekannt", label: b?.label || key, value };
      if (value <= b.tier1_max) return { tier: "rot", label: b.label, value, benchmark: `≤${b.tier1_max}` };
      if (value <= b.tier2_max) return { tier: "gelb", label: b.label, value, benchmark: `${b.tier1_max+1}-${b.tier2_max}` };
      return { tier: "grün", label: b.label, value, benchmark: `>${b.tier2_max}` };
    };

    // Classify current metrics
    const classifications: any[] = [];
    const metricKeys: Record<string, string> = {
      impressions: "impressions",
      leads_total: "leads_total",
      leads_qualified: "leads_qualified",
      calls_made: "calls_made",
      calls_reached: "calls_reached",
      appointments: "appointments",
      deals: "deals",
      cash_collected: "cash_collected",
    };

    // Use weekly sums (last 7 days)
    const last7 = metrics?.slice(0, 7) || [];
    const weekSum = (field: string) => last7.reduce((acc: number, m: any) => acc + (parseFloat(m[field]) || 0), 0);

    for (const [key, field] of Object.entries(metricKeys)) {
      const val = weekSum(field);
      if (benchmarkMap[key]) {
        classifications.push(classify(key, val));
      }
    }

    // Rate-based metrics from latest day
    const rateMetrics: Record<string, number> = {};
    if (latestMetrics) {
      const lt = parseFloat(latestMetrics.leads_total) || 0;
      const lq = parseFloat(latestMetrics.leads_qualified) || 0;
      rateMetrics.lead_quality_rate = lt > 0 ? (lq / lt) * 100 : 0;

      const sp = parseFloat(latestMetrics.settings_planned) || 0;
      const sh = parseFloat(latestMetrics.settings_held) || 0;
      rateMetrics.setting_show_rate = sp > 0 ? (sh / sp) * 100 : 0;

      const cp = parseFloat(latestMetrics.closings_planned) || 0;
      const ch = parseFloat(latestMetrics.closings_held) || 0;
      rateMetrics.closing_show_rate = cp > 0 ? (ch / cp) * 100 : 0;

      const d = parseFloat(latestMetrics.deals) || 0;
      rateMetrics.closing_rate = ch > 0 ? (d / ch) * 100 : 0;
    }

    for (const [key, val] of Object.entries(rateMetrics)) {
      if (benchmarkMap[key]) {
        classifications.push(classify(key, Math.round(val * 10) / 10));
      }
    }

    const hasBenchmarks = benchmarks && benchmarks.length > 0;

    const benchmarkSection = hasBenchmarks
      ? `\n\nBENCHMARK-KLASSIFIZIERUNG (Pflicht: beziehe dich auf jede Stufe!):\n${classifications
          .map(c => `- ${c.label}: ${c.value} → Stufe ${c.tier === "rot" ? "1 (ROT - unter Benchmark)" : c.tier === "gelb" ? "2 (GELB - im Rahmen)" : "3 (GRÜN - über Benchmark)"}`)
          .join("\n")}`
      : "";

    const systemPrompt = scope === "admin_portfolio"
      ? "Du bist ein Customer Success Manager. Analysiere die Portfolio-Daten und gib konkrete, handlungsorientierte Empfehlungen auf Deutsch."
      : `Du bist ein Performance-Analyst für eine LinkedIn-Agentur. Du analysierst KPIs und gibst dem Kunden konkrete, umsetzbare Empfehlungen auf Deutsch.

WICHTIG: Deine Analyse MUSS folgendes Format haben:

## 📊 Stufen-Einordnung
Ordne JEDE Kennzahl einer der 3 Stufen zu:
- 🔴 Stufe 1 (Unter Benchmark): Sofortiger Handlungsbedarf
- 🟡 Stufe 2 (Im Rahmen): Optimierungspotenzial  
- 🟢 Stufe 3 (Über Benchmark): Weiter ausbauen

## 🎯 3-Schritte-Anleitung

### Schritt 1: Sofort umsetzen (diese Woche)
[Konkrete Maßnahme für die kritischste 🔴 Kennzahl]

### Schritt 2: Diese Woche optimieren
[Konkrete Maßnahme für 🟡 Kennzahlen]

### Schritt 3: Langfristig skalieren
[Strategie um 🟢 Kennzahlen weiter auszubauen]

Sei faktenbasiert, nutze NUR die gegebenen Daten. Kein Smalltalk.`;

    const userPrompt = `Analysiere folgende Performance-Daten der letzten Woche:

WOCHENWERTE (letzte 7 Tage):
- Impressionen: ${weekSum("impressions")}
- Kommentare: ${weekSum("comments")}
- DMs gesendet: ${weekSum("dms_sent")}
- Leads gesamt: ${weekSum("leads_total")}
- MQL: ${weekSum("leads_qualified")}
- Anwahlen: ${weekSum("calls_made")}
- Erreicht: ${weekSum("calls_reached")}
- Termine: ${weekSum("appointments")}
- Deals: ${weekSum("deals")}
- Cash Collected: ${weekSum("cash_collected")}€

QUOTEN (letzter Tag):
- MQL-Quote: ${(rateMetrics.lead_quality_rate || 0).toFixed(1)}%
- Setting Show-Rate: ${(rateMetrics.setting_show_rate || 0).toFixed(1)}%
- Closing Show-Rate: ${(rateMetrics.closing_show_rate || 0).toFixed(1)}%
- Closing-Rate: ${(rateMetrics.closing_rate || 0).toFixed(1)}%

VORWOCHE zum Vergleich:
- Leads: ${previousMetrics?.leads_total || 0}
- Deals: ${previousMetrics?.deals || 0}
- Umsatz: ${previousMetrics?.revenue || 0}€

4-WOCHEN-DURCHSCHNITT:
- Leads/Tag: ${avg("leads_total").toFixed(1)}
- Deals/Tag: ${avg("deals").toFixed(1)}
- Umsatz/Tag: ${avg("revenue").toFixed(2)}€

Health Score: ${healthScore?.score || "N/A"}/100 (${healthScore?.color || "unbekannt"})
${benchmarkSection}

Erstelle die Analyse im vorgegebenen Format mit Stufen-Einordnung und 3-Schritte-Anleitung. Max 250 Wörter.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit erreicht. Bitte später erneut versuchen." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResponse.status === 402) {
      return new Response(JSON.stringify({ error: "AI-Credits aufgebraucht. Bitte Credits aufladen." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway Error:", aiResponse.status, errorText);
      throw new Error("AI Gateway Error");
    }

    const aiData = await aiResponse.json();
    const summaryText = aiData.choices[0].message.content;

    // Save summary
    const { data: summary, error: summaryError } = await supabaseClient
      .from("ai_summaries")
      .insert({
        tenant_id: tenantId,
        scope: scope,
        summary_text: summaryText,
      })
      .select()
      .single();

    if (summaryError) throw summaryError;

    return new Response(JSON.stringify({ summary, classifications }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating summary:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
