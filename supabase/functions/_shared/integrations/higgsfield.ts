import type { IntegrationProvider } from "./interface.ts";

/**
 * Higgsfield Integration — headless API for image/video generation.
 * Platform-owned credentials (costs tracked per customer).
 *
 * This adapter is designed for server-side use in Edge Functions and Cron jobs.
 * No MCP, no browser session, no user interaction needed.
 */
export class HiggsFieldProvider implements IntegrationProvider {
  readonly name = "higgsfield";
  readonly type = "platform" as const;

  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || Deno.env.get("HIGGSFIELD_API_KEY") || "";
    this.baseUrl = "https://api.higgsfield.ai/v1"; // TODO: verify actual endpoint
  }

  async test(): Promise<{ ok: boolean; error?: string }> {
    if (!this.apiKey) return { ok: false, error: "HIGGSFIELD_API_KEY not set" };

    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return { ok: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async execute(params: {
    action: string;
    input: Record<string, unknown>;
  }): Promise<{ jobId?: string; result?: unknown; async: boolean }> {
    if (!this.apiKey) throw new Error("HIGGSFIELD_API_KEY not set");

    const { action, input } = params;

    if (action === "generate_image") {
      const res = await fetch(`${this.baseUrl}/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: input.prompt,
          width: input.width || 1080,
          height: input.height || 1080,
          style: input.style,
          // TODO: Add character/element references for consistent brand imagery
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Higgsfield ${res.status}: ${err}`);
      }

      const data = await res.json();
      return {
        jobId: data.id || data.job_id,
        async: true, // Higgsfield jobs are async — need polling
      };
    }

    throw new Error(`Unknown action: ${action}`);
  }

  async pollJob(jobId: string): Promise<{
    status: "pending" | "running" | "done" | "failed";
    result?: unknown;
    error?: string;
    progress?: number;
  }> {
    if (!this.apiKey) throw new Error("HIGGSFIELD_API_KEY not set");

    const res = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    if (!res.ok) {
      return { status: "failed", error: `HTTP ${res.status}` };
    }

    const data = await res.json();

    // Map Higgsfield status to our standard
    const statusMap: Record<string, "pending" | "running" | "done" | "failed"> = {
      queued: "pending",
      processing: "running",
      completed: "done",
      failed: "failed",
    };

    return {
      status: statusMap[data.status] || "pending",
      result: data.output_url ? { url: data.output_url } : undefined,
      error: data.error,
      progress: data.progress,
    };
  }

  async getUsage(): Promise<{ callsThisMonth: number; costCentsThisMonth: number }> {
    // TODO: Implement when Higgsfield provides usage API
    return { callsThisMonth: 0, costCentsThisMonth: 0 };
  }
}
