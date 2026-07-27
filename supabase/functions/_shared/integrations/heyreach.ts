import type { IntegrationProvider } from "./interface.ts";

/**
 * HeyReach Integration — customer-owned API keys for outreach data sync.
 * Imports outreach KPIs (connection requests, replies, meetings) into daily_metrics.
 */
export class HeyReachProvider implements IntegrationProvider {
  readonly name = "heyreach";
  readonly type = "customer" as const;

  async test(credentials: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
    const apiKey = credentials.api_key as string;
    if (!apiKey) return { ok: false, error: "API-Key fehlt" };

    try {
      const res = await fetch("https://api.heyreach.io/api/v1/user/me", {
        headers: { "X-API-KEY": apiKey },
      });
      if (res.ok) return { ok: true };
      if (res.status === 401) return { ok: false, error: "Ungültiger API-Key" };
      return { ok: false, error: `HTTP ${res.status}` };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async execute(params: {
    action: string;
    input: Record<string, unknown>;
    credentials?: Record<string, unknown>;
  }): Promise<{ jobId?: string; result?: unknown; async: boolean }> {
    const apiKey = params.credentials?.api_key as string;
    if (!apiKey) throw new Error("HeyReach API-Key fehlt");

    if (params.action === "sync_metrics") {
      const { from_date, to_date } = params.input;

      // Fetch campaign stats from HeyReach
      const res = await fetch("https://api.heyreach.io/api/v1/campaign/statistics", {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: from_date,
          to: to_date,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`HeyReach ${res.status}: ${err}`);
      }

      const data = await res.json();

      // Map HeyReach fields to our metric slugs
      const mapped = {
        kontaktanfragen_versendet: data.total_invites_sent || 0,
        kontaktanfragen_angenommen: data.total_invites_accepted || 0,
        antworten: data.total_replies || 0,
        positive_antworten: data.total_positive_replies || 0,
      };

      return { result: mapped, async: false };
    }

    throw new Error(`Unknown action: ${params.action}`);
  }

  async getUsage(credentials?: Record<string, unknown>): Promise<{
    callsThisMonth: number;
    costCentsThisMonth: number;
  }> {
    // HeyReach is customer-paid, we don't track costs
    return { callsThisMonth: 0, costCentsThisMonth: 0 };
  }
}
