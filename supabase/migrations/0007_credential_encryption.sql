-- CL-027: Credential Encryption via Supabase Vault
-- Wrapper functions for Edge Functions to store/retrieve encrypted credentials

CREATE OR REPLACE FUNCTION public.store_credential(
  p_org_id uuid, p_provider text, p_credentials jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_cred_id uuid; v_secret_id uuid; v_secret_name text;
BEGIN
  v_secret_name := 'cred_' || p_org_id || '_' || p_provider;
  SELECT id INTO v_cred_id FROM public.integration_credentials WHERE org_id = p_org_id AND provider = p_provider;
  IF v_cred_id IS NULL THEN
    INSERT INTO public.integration_credentials (org_id, provider, credentials_encrypted, status)
    VALUES (p_org_id, p_provider, 'vault:' || v_secret_name, 'pending') RETURNING id INTO v_cred_id;
  ELSE
    UPDATE public.integration_credentials SET credentials_encrypted = 'vault:' || v_secret_name, updated_at = now() WHERE id = v_cred_id;
  END IF;
  DELETE FROM vault.secrets WHERE name = v_secret_name;
  SELECT vault.create_secret(p_credentials::text, v_secret_name) INTO v_secret_id;
  RETURN v_cred_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_credential(p_org_id uuid, p_provider text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_secret_name text; v_decrypted text;
BEGIN
  v_secret_name := 'cred_' || p_org_id || '_' || p_provider;
  SELECT decrypted_secret INTO v_decrypted FROM vault.decrypted_secrets WHERE name = v_secret_name LIMIT 1;
  IF v_decrypted IS NULL THEN RETURN NULL; END IF;
  RETURN v_decrypted::jsonb;
END; $$;

CREATE OR REPLACE FUNCTION public.delete_credential(p_org_id uuid, p_provider text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_secret_name text;
BEGIN
  v_secret_name := 'cred_' || p_org_id || '_' || p_provider;
  DELETE FROM vault.secrets WHERE name = v_secret_name;
  DELETE FROM public.integration_credentials WHERE org_id = p_org_id AND provider = p_provider;
END; $$;

CREATE OR REPLACE FUNCTION public.get_credential_status(p_org_id uuid, p_provider text)
RETURNS TABLE(id uuid, provider text, status text, last_tested_at timestamptz, has_credentials boolean)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT ic.id, ic.provider, ic.status, ic.last_tested_at,
    (ic.credentials_encrypted IS NOT NULL AND ic.credentials_encrypted != '') AS has_credentials
  FROM public.integration_credentials ic WHERE ic.org_id = p_org_id AND ic.provider = p_provider;
END; $$;
