import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AuditEntry {
  org_id?: string;
  actor_id: string;
  action: "INSERT" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "INVITE" | "IMPERSONATE";
  resource_type: string;
  resource_id?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  ip_address?: string;
  impersonated_by?: string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error } = await supabase.rpc("log_audit", {
    p_org_id: entry.org_id ?? null,
    p_actor_id: entry.actor_id,
    p_action: entry.action,
    p_resource_type: entry.resource_type,
    p_resource_id: entry.resource_id ?? null,
    p_old_value: entry.old_value ?? null,
    p_new_value: entry.new_value ?? null,
    p_ip_address: entry.ip_address ?? null,
    p_impersonated_by: entry.impersonated_by ?? null,
  });

  if (error) {
    console.error("[audit] Failed to log:", error.message, entry);
  }
}
