import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * CL-151: HeyReach Sync Job
 * Called by Cron or manually from Admin Job Monitor.
 * For each customer with HeyReach credentials:
 *   1. Decrypt credentials via get_credential()
 *   2. Fetch outreach stats from HeyReach API
 *   3. Save to daily_metrics with source='api:heyreach'
 *   4. Update sync_jobs status
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { user_id: singleUserId } = await req.json().catch(() => ({}));

    // Find all customers with HeyReach credentials
    const { data: credentials } = await supabase
      .from("integration_credentials" as any)
      .select("id, org_id")
      .eq("provider", "heyreach")
      .eq("status", "connected");

    if (!credentials?.length && !singleUserId) {
      return new Response(JSON.stringify({ synced: 0, message: "No HeyReach credentials found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let synced = 0;
    let errors: string[] = [];
    const today = new Date().toISOString().split("T")[0];

    // Process each credential
    for (const cred of credentials || []) {
      try {
        // Get decrypted credentials
        const { data: decrypted } = await supabase.rpc("get_credential", {
          p_org_id: cred.org_id,
          p_provider: "heyreach",
        });

        if (!decrypted?.api_key) {
          errors.push(`Org ${cred.org_id}: No API key`);
          continue;
        }

        // Fetch from HeyReach API
        const res = await fetch("https://api.heyreach.io/api/v1/campaign/statistics", {
          method: "POST",
          headers: {
            "X-API-KEY": decrypted.api_key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from: today, to: today }),
        });

        if (!res.ok) {
          errors.push(`Org ${cred.org_id}: HeyReach ${res.status}`);

          // Update sync_jobs with error
          await supabase.from("sync_jobs" as any).upsert({
            org_id: cred.org_id,
            credential_id: cred.id,
            job_type: "heyreach_metrics",
            status: res.status === 429 ? "backoff" : "error",
            error_message: `HTTP ${res.status}`,
            last_run_at: new Date().toISOString(),
            retry_count: 1,
          }, { onConflict: "org_id,job_type" });
          continue;
        }

        const data = await res.json();

        // Find user_id for this org
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("org_id", cred.org_id)
          .limit(1)
          .maybeSingle();

        if (!profile) continue;

        // Map to daily_metrics
        const metricsToSave = [
          { slug: "kontaktanfragen_versendet", value: data.total_invites_sent || 0 },
          { slug: "kontaktanfragen_angenommen", value: data.total_invites_accepted || 0 },
          { slug: "antworten", value: data.total_replies || 0 },
          { slug: "positive_antworten", value: data.total_positive_replies || 0 },
        ];

        for (const m of metricsToSave) {
          // Check for existing manual entry — don't overwrite
          const { data: existing } = await supabase
            .from("daily_metrics" as any)
            .select("id, source")
            .eq("user_id", profile.id)
            .eq("metric_slug", m.slug)
            .eq("date", today)
            .maybeSingle();

          if (existing && existing.source === "manual") {
            // Manual entry exists — don't overwrite, note the conflict
            continue;
          }

          await supabase.from("daily_metrics" as any).upsert({
            user_id: profile.id,
            metric_slug: m.slug,
            date: today,
            value: m.value,
            source: "api:heyreach",
            is_zero_day: m.value === 0,
          }, { onConflict: "user_id,metric_slug,date" });
        }

        // Update sync_job
        await supabase.from("sync_jobs" as any).upsert({
          org_id: cred.org_id,
          credential_id: cred.id,
          job_type: "heyreach_metrics",
          status: "success",
          last_run_at: new Date().toISOString(),
          error_message: null,
          retry_count: 0,
          result_summary: { metrics_synced: metricsToSave.length, date: today },
        }, { onConflict: "org_id,job_type" });

        synced++;
      } catch (err: any) {
        errors.push(`Org ${cred.org_id}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({ synced, errors: errors.length, error_details: errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
