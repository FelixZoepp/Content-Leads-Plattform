-- CL-002: Tenant-Konsolidierung — organisations als zentrale Mandanten-Entität
CREATE TABLE IF NOT EXISTS public.organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_name text,
  email text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  subscription_status text,
  contact_name text,
  industry text,
  onboarding_completed boolean DEFAULT false,
  sheet_url text,
  sheet_mapping jsonb,
  last_sync_at timestamptz,
  revenue_recurring numeric,
  current_leads_per_month integer,
  current_revenue_monthly numeric,
  monthly_budget numeric,
  primary_goal text,
  goal_leads_monthly integer,
  goal_revenue_monthly numeric,
  linkedin_account_url text,
  current_offer text,
  offer_price numeric,
  closing_rate numeric,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id);

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own org" ON public.organisations
  FOR SELECT USING (
    id IN (SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.is_super_admin = true))
  );

CREATE POLICY "Admins can manage orgs" ON public.organisations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.is_super_admin = true))
  );
