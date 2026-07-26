import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

/** Store encrypted credentials via Vault. Returns the credential row ID. */
export async function storeCredential(
  orgId: string,
  provider: string,
  credentials: Record<string, unknown>
): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("store_credential", {
    p_org_id: orgId,
    p_provider: provider,
    p_credentials: credentials,
  });
  if (error) throw new Error(`Failed to store credential: ${error.message}`);
  return data as string;
}

/** Retrieve decrypted credentials from Vault. Returns null if not found. */
export async function getCredential(
  orgId: string,
  provider: string
): Promise<Record<string, unknown> | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_credential", {
    p_org_id: orgId,
    p_provider: provider,
  });
  if (error) throw new Error(`Failed to get credential: ${error.message}`);
  return data as Record<string, unknown> | null;
}

/** Delete credentials from Vault and the credentials table. */
export async function deleteCredential(
  orgId: string,
  provider: string
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.rpc("delete_credential", {
    p_org_id: orgId,
    p_provider: provider,
  });
  if (error) throw new Error(`Failed to delete credential: ${error.message}`);
}
