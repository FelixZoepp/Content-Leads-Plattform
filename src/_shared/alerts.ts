import { supabase } from "@/integrations/supabase/client";

export interface SurveyAlertPayload {
  survey_id: string;
  survey_title: string;
  tenant_id: string;
  company_name: string;
  response_id: string;
  sentiment: string;
  theme_tags: string[];
  answers: Record<string, any>;
}

/**
 * Checks a batch of survey responses for critical signals and inserts
 * alerts into the `alerts` table for any that warrant attention.
 */
export async function checkSurveyForAlerts(
  responses: SurveyAlertPayload[]
): Promise<void> {
  const alertsToInsert: Array<{
    tenant_id: string;
    type: string;
    severity: "high" | "medium" | "low";
    message: string;
    resolved_at: null;
    created_at: string;
  }> = [];

  for (const r of responses) {
    const isNegativeSentiment = r.sentiment?.toLowerCase() === "negativ";

    // Check for NPS detractor in answers (key often "weiterempfehlung" or any nps-type question)
    const npsValue = Object.entries(r.answers || {}).find(([, v]) => {
      const n = Number(v);
      return !isNaN(n) && n >= 0 && n <= 10;
    })?.[1];
    const isNpsDetractor = npsValue !== undefined && Number(npsValue) <= 6;

    // Critical: negative sentiment + detractor
    if (isNegativeSentiment && isNpsDetractor) {
      alertsToInsert.push({
        tenant_id: r.tenant_id,
        type: "survey_critical",
        severity: "high",
        message: `Kritische Umfrage-Antwort von ${r.company_name}: negatives Sentiment + NPS Detractor (${npsValue})`,
        resolved_at: null,
        created_at: new Date().toISOString(),
      });
      continue;
    }

    // High: negative sentiment alone
    if (isNegativeSentiment) {
      alertsToInsert.push({
        tenant_id: r.tenant_id,
        type: "survey_negative_sentiment",
        severity: "high",
        message: `Negatives Sentiment in Umfrage-Antwort von ${r.company_name} (${r.survey_title})`,
        resolved_at: null,
        created_at: new Date().toISOString(),
      });
    }

    // Medium: NPS detractor alone
    if (!isNegativeSentiment && isNpsDetractor) {
      alertsToInsert.push({
        tenant_id: r.tenant_id,
        type: "survey_nps_detractor",
        severity: "medium",
        message: `NPS Detractor in ${r.survey_title}: ${r.company_name} gab ${npsValue}/10`,
        resolved_at: null,
        created_at: new Date().toISOString(),
      });
    }

    // Medium: critical theme tags
    const criticalTags = ["Kündigung", "Problem", "Unzufrieden", "Abbruch", "Churn"];
    const hasCriticalTag = r.theme_tags?.some(tag =>
      criticalTags.some(ct => tag.toLowerCase().includes(ct.toLowerCase()))
    );
    if (hasCriticalTag) {
      alertsToInsert.push({
        tenant_id: r.tenant_id,
        type: "survey_critical_theme",
        severity: "medium",
        message: `Kritisches Thema in Umfrage von ${r.company_name}: ${r.theme_tags.join(", ")}`,
        resolved_at: null,
        created_at: new Date().toISOString(),
      });
    }
  }

  if (alertsToInsert.length === 0) return;

  await (supabase as any)
    .from("alerts")
    .insert(alertsToInsert)
    .catch(() => null); // non-blocking
}
