-- CL-106: Invitations v2 — token security, status tracking, product/advisor linkage
-- Changes:
--   1. Alter token column from uuid → text (hex token from crypto.getRandomValues)
--   2. Add product_id, advisor_id, onboarding_track_id FKs (nullable)
--   3. Add status with CHECK constraint
--   4. Add opened_at, reminder_count columns
-- Applied to prod: 2026-07-26

-- 1. Drop default on token so we can alter type
ALTER TABLE public.invitations
  ALTER COLUMN token DROP DEFAULT;

-- 2. Change token from uuid to text
ALTER TABLE public.invitations
  ALTER COLUMN token TYPE text USING token::text;

-- 3. Re-add a non-null constraint (no default — app always supplies the token)
ALTER TABLE public.invitations
  ALTER COLUMN token SET NOT NULL;

-- 4. Add new columns
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS product_id           uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS advisor_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS onboarding_track_id  uuid,
  ADD COLUMN IF NOT EXISTS status               text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','opened','registered','onboarding','completed','expired','revoked')),
  ADD COLUMN IF NOT EXISTS opened_at            timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_count       integer NOT NULL DEFAULT 0;

-- 5. Useful indexes
CREATE INDEX IF NOT EXISTS invitations_status_idx    ON public.invitations (status);
CREATE INDEX IF NOT EXISTS invitations_product_id_idx ON public.invitations (product_id);
CREATE INDEX IF NOT EXISTS invitations_advisor_id_idx ON public.invitations (advisor_id);

-- 6. RLS: admins can do everything; token-holders can read their own row
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invitations_admin_all    ON public.invitations;
DROP POLICY IF EXISTS invitations_token_select ON public.invitations;

CREATE POLICY invitations_admin_all ON public.invitations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Anonymous token-based read used by the set-password / onboarding flow
-- (token is passed as a query param, matched via service-role edge function — no direct RLS needed)
