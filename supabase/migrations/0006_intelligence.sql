-- CL-028: Zufriedenheitsumfragen
-- CL-030: AI Insights + Upsell-Signale

-- === Surveys ===

CREATE TABLE IF NOT EXISTS public.surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  title text NOT NULL,
  questions jsonb NOT NULL DEFAULT '[]',
  trigger_type text NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'days_after_onboarding', 'recurring')),
  trigger_days integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Separate from existing survey_responses — this is the new structured system
CREATE TABLE IF NOT EXISTS public.survey_response_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  org_id uuid,
  answers jsonb NOT NULL DEFAULT '{}',
  nps_score integer CHECK (nps_score IS NULL OR (nps_score >= 0 AND nps_score <= 10)),
  sentiment text CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  theme_tags text[] DEFAULT '{}',
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON public.survey_response_entries(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_user ON public.survey_response_entries(user_id);

-- === AI Insights ===

CREATE TABLE IF NOT EXISTS public.ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  customer_user_id uuid REFERENCES auth.users(id),
  insight_type text NOT NULL CHECK (insight_type IN ('health', 'need', 'upsell', 'churn_risk', 'opportunity', 'feedback_summary')),
  title text NOT NULL,
  body text NOT NULL,
  confidence numeric(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  source_refs jsonb NOT NULL DEFAULT '[]',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_customer ON public.ai_insights(customer_user_id, insight_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_org ON public.ai_insights(org_id, created_at DESC);

-- === Upsell Signals ===

CREATE TABLE IF NOT EXISTS public.upsell_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  customer_user_id uuid NOT NULL REFERENCES auth.users(id),
  insight_id uuid REFERENCES public.ai_insights(id),
  signal_type text NOT NULL,
  recommended_offer text,
  rationale text NOT NULL,
  counter_indication text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'confirmed', 'dismissed', 'acted_on')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upsell_customer ON public.upsell_signals(customer_user_id, status);

-- === Pitch Templates ===

CREATE TABLE IF NOT EXISTS public.pitch_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  upsell_signal_id uuid REFERENCES public.upsell_signals(id),
  customer_user_id uuid NOT NULL REFERENCES auth.users(id),
  message_text text NOT NULL,
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'phone', 'linkedin')),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- === Integration Credentials (encrypted) ===

CREATE TABLE IF NOT EXISTS public.integration_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  provider text NOT NULL CHECK (provider IN ('heyreach', 'smtp', 'twilio', 'google_sheets', 'custom')),
  credentials_encrypted text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('connected', 'error', 'expired', 'pending')),
  last_tested_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, provider)
);

-- === Sync Jobs ===

CREATE TABLE IF NOT EXISTS public.sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  credential_id uuid REFERENCES public.integration_credentials(id) ON DELETE SET NULL,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'error', 'backoff')),
  last_run_at timestamptz,
  next_run_at timestamptz,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 5,
  result_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_org ON public.sync_jobs(org_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_next ON public.sync_jobs(next_run_at) WHERE status IN ('pending', 'backoff');

-- === RLS ===

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_response_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upsell_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitch_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;

-- Surveys: admins manage, customers see active
CREATE POLICY "Admins manage surveys" ON public.surveys
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_super_admin = true))
  );

CREATE POLICY "Active surveys visible to all auth" ON public.surveys
  FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

-- Survey responses: users submit own, admins/advisors read
CREATE POLICY "Users submit own responses" ON public.survey_response_entries
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read own responses" ON public.survey_response_entries
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins read all responses" ON public.survey_response_entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_super_admin = true))
  );

-- AI Insights: admins + advisors (assigned) + customer (own)
CREATE POLICY "Admins read all insights" ON public.ai_insights
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_super_admin = true))
  );

CREATE POLICY "Customers read own insights" ON public.ai_insights
  FOR SELECT USING (customer_user_id = auth.uid());

CREATE POLICY "Advisors read assigned insights" ON public.ai_insights
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.advisor_assignments WHERE advisor_user_id = auth.uid() AND customer_user_id = ai_insights.customer_user_id)
  );

-- Upsell + Pitch: admin only
CREATE POLICY "Admins manage upsell signals" ON public.upsell_signals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_super_admin = true))
  );

CREATE POLICY "Admins manage pitch templates" ON public.pitch_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_super_admin = true))
  );

-- Integration Credentials: admin only (no customer access to raw credentials)
CREATE POLICY "Admins manage credentials" ON public.integration_credentials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_super_admin = true))
  );

-- Sync Jobs: admin can manage, customer can read own org
CREATE POLICY "Admins manage sync jobs" ON public.sync_jobs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_super_admin = true))
  );
