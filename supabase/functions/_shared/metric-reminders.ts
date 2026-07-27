import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * CL-148: Daily metric reminder logic.
 * Called by a Cron job (daily at configured time).
 * Checks which users haven't entered metrics today and sends reminders.
 */

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

export async function checkAndRemind(): Promise<{ reminded: number; skipped: number }> {
  const supabase = getSupabase();
  const today = new Date().toISOString().split("T")[0];
  const dayOfWeek = new Date().getDay(); // 0=Sun, 6=Sat

  // Skip weekends (configurable)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { reminded: 0, skipped: 0 };
  }

  // Get all users with active customer_products that have kennzahlen.taeglich feature
  const { data: activeUsers } = await supabase.rpc("get_users_with_feature", {
    p_feature_slug: "kennzahlen.taeglich",
  });

  // Fallback: get all non-admin users if RPC doesn't exist yet
  const userIds: string[] = activeUsers?.map((u: any) => u.user_id) || [];
  if (!userIds.length) return { reminded: 0, skipped: 0 };

  // Check who already entered today
  const { data: todayEntries } = await (supabase as any)
    .from("daily_metrics")
    .select("user_id")
    .eq("date", today)
    .in("user_id", userIds);

  const enteredToday = new Set((todayEntries || []).map((e: any) => e.user_id));
  const needsReminder = userIds.filter(id => !enteredToday.has(id));

  let reminded = 0;
  for (const userId of needsReminder) {
    // Get user email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.email) continue;

    // Send reminder via send-email Edge Function
    try {
      await supabase.functions.invoke("send-email", {
        body: {
          to: profile.email,
          subject: `Kennzahlen für heute eintragen`,
          html: `
            <p>Hallo ${(profile as any).name || ""},</p>
            <p>Du hast heute noch keine Kennzahlen eingetragen.</p>
            <p><a href="https://content-leads-platform.vercel.app/dashboard/metrics/daily" style="color: #C5A059; font-weight: bold;">Jetzt eintragen →</a></p>
            <p style="color: #888; font-size: 12px;">Dauert nur 30 Sekunden.</p>
          `,
        },
      });
      reminded++;
    } catch (err) {
      console.error(`Failed to remind ${userId}:`, err);
    }
  }

  return { reminded, skipped: enteredToday.size };
}

/**
 * Calculate compliance score for a user (last 7/30 days).
 * Returns percentage of days with at least one metric entry.
 */
export async function getComplianceScore(userId: string, days: number = 7): Promise<number> {
  const supabase = getSupabase();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: entries } = await (supabase as any)
    .from("daily_metrics")
    .select("date")
    .eq("user_id", userId)
    .gte("date", since.toISOString().split("T")[0]);

  const uniqueDays = new Set((entries || []).map((e: any) => e.date));

  // Count business days in the period
  let businessDays = 0;
  for (let d = new Date(since); d <= new Date(); d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) businessDays++;
  }

  return businessDays > 0 ? Math.round((uniqueDays.size / businessDays) * 100) : 0;
}
