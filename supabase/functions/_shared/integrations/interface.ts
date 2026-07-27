/**
 * Unified Integration Interface.
 * All external providers implement this interface.
 * See AUTOMATION.md for the Perspective API bruchstelle.
 */
export interface IntegrationProvider {
  readonly name: string;
  readonly type: "platform" | "customer"; // platform = paid by us, customer = customer's own key

  /** Test if credentials are valid */
  test(credentials: Record<string, unknown>): Promise<{ ok: boolean; error?: string }>;

  /** Execute a job (sync, generate, etc.) */
  execute(params: {
    action: string;
    input: Record<string, unknown>;
    credentials?: Record<string, unknown>;
  }): Promise<{ jobId?: string; result?: unknown; async: boolean }>;

  /** Poll an async job for completion */
  pollJob?(jobId: string, credentials?: Record<string, unknown>): Promise<{
    status: "pending" | "running" | "done" | "failed";
    result?: unknown;
    error?: string;
    progress?: number;
  }>;

  /** Get usage/cost info */
  getUsage?(credentials?: Record<string, unknown>): Promise<{
    callsThisMonth: number;
    costCentsThisMonth: number;
  }>;
}
