import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

/**
 * Create an instant alert for admins and assigned advisors.
 * Used when critical survey responses, health drops, or churn signals are detected.
 */
export async function createInstantAlert(opts: {
  tenantId?: string;
  userId?: string;
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  sourceRef?: Record<string, unknown>;
}): Promise<void> {
  const supabase = getSupabase();

  // Insert alert
  await supabase.from("alerts").insert({
    tenant_id: opts.tenantId,
    type: opts.type,
    severity: opts.severity,
    message: opts.message,
  });

  // If critical: also create an AI insight for tracking
  if (opts.severity === "critical" && opts.userId) {
    await supabase.from("ai_insights").insert({
      customer_user_id: opts.userId,
      insight_type: "churn_risk",
      title: `Kritisches Signal: ${opts.type}`,
      body: opts.message,
      confidence: 0.9,
      source_refs: opts.sourceRef ? [opts.sourceRef] : [],
    });
  }

  // TODO: Send email notification to admin + assigned advisor
  // This would use the send-email Edge Function
  console.log(`[alert] ${opts.severity}: ${opts.message}`);
}

/**
 * Check a survey response for critical signals and trigger alerts.
 * Called after each survey response is saved.
 */
export async function checkSurveyForAlerts(responseId: string): Promise<void> {
  const supabase = getSupabase();

  const { data: response } = await supabase
    .from("survey_response_entries")
    .select("*, surveys(title)")
    .eq("id", responseId)
    .single();

  if (!response) return;

  // NPS 0-3 = Detractor → critical alert
  if (response.nps_score !== null && response.nps_score <= 3) {
    await createInstantAlert({
      userId: response.user_id,
      type: "low_nps",
      severity: "critical",
      message: `NPS ${response.nps_score}/10 in Umfrage "${response.surveys?.title || "Unbekannt"}". Mögliche Kündigungsabsicht — sofort reagieren.`,
      sourceRef: { table: "survey_response_entries", id: response.id, field: "nps_score", value: response.nps_score },
    });
  }

  // Check for negative keywords in answers
  const answers = response.answers || {};
  const negativeKeywords = ["kündigen", "unzufrieden", "enttäuscht", "aufhören", "beenden", "schlecht", "mangelhaft"];

  for (const [key, value] of Object.entries(answers)) {
    if (typeof value === "string") {
      const lower = value.toLowerCase();
      for (const keyword of negativeKeywords) {
        if (lower.includes(keyword)) {
          await createInstantAlert({
            userId: response.user_id,
            type: "negative_feedback",
            severity: "warning",
            message: `Negatives Keyword "${keyword}" in Umfrage-Antwort. Frage: ${key}`,
            sourceRef: { table: "survey_response_entries", id: response.id, field: key, keyword },
          });
          break; // One alert per answer field is enough
        }
      }
    }
  }
}
