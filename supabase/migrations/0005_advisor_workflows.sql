-- CL-006: Berater-Zuweisungen
-- CL-019: Profiloptimierung als Dienstleistung
-- CL-020: Checklisten-System
-- CL-022: Content-Pipeline

-- === Berater-Zuweisungen ===

CREATE TABLE IF NOT EXISTS public.advisor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  advisor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  UNIQUE (advisor_user_id, customer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_advisor ON public.advisor_assignments(advisor_user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_customer ON public.advisor_assignments(customer_user_id);

-- === Tone of Voice Profile ===

CREATE TABLE IF NOT EXISTS public.tone_of_voice_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid,
  tonality text,
  topics text[] DEFAULT '{}',
  no_gos text[] DEFAULT '{}',
  example_posts text[] DEFAULT '{}',
  target_audience text,
  communication_style text,
  raw_interview jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- === Profiloptimierung ===

CREATE TABLE IF NOT EXISTS public.profile_optimizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  customer_user_id uuid NOT NULL REFERENCES auth.users(id),
  advisor_user_id uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profile_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  optimization_id uuid NOT NULL REFERENCES public.profile_optimizations(id) ON DELETE CASCADE,
  section_type text NOT NULL CHECK (section_type IN ('headline', 'about', 'experience', 'banner', 'featured', 'skills', 'other')),
  current_text text,
  suggested_text text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revised')),
  advisor_note text,
  customer_note text,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sections_optimization ON public.profile_sections(optimization_id, "order");

-- === Checklisten ===

CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  created_by uuid REFERENCES auth.users(id),
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.checklist_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  "order" integer NOT NULL DEFAULT 0,
  default_due_days integer
);

CREATE INDEX IF NOT EXISTS idx_template_items_template ON public.checklist_template_items(template_id, "order");

CREATE TABLE IF NOT EXISTS public.checklist_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.checklist_templates(id),
  customer_user_id uuid NOT NULL REFERENCES auth.users(id),
  advisor_user_id uuid NOT NULL REFERENCES auth.users(id),
  org_id uuid,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.checklist_item_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.checklist_instances(id) ON DELETE CASCADE,
  template_item_id uuid NOT NULL REFERENCES public.checklist_template_items(id),
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  internal_note text,
  due_date date,
  UNIQUE (instance_id, template_item_id)
);

CREATE INDEX IF NOT EXISTS idx_item_statuses_instance ON public.checklist_item_statuses(instance_id);

-- === Content-Pipeline ===

CREATE TABLE IF NOT EXISTS public.content_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  customer_user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL DEFAULT 'Redaktionsplan',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.content_plans(id) ON DELETE SET NULL,
  org_id uuid,
  customer_user_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  body text,
  content_pillar text,
  status text NOT NULL DEFAULT 'idea' CHECK (status IN ('idea', 'draft', 'review', 'approved', 'scheduled', 'published')),
  scheduled_date date,
  published_url text,
  created_by uuid REFERENCES auth.users(id),
  assigned_to uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_items_plan ON public.content_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_content_items_customer ON public.content_items(customer_user_id, status);
CREATE INDEX IF NOT EXISTS idx_content_items_scheduled ON public.content_items(scheduled_date) WHERE scheduled_date IS NOT NULL;

-- === Generated Content (Content-Bibliothek) ===

CREATE TABLE IF NOT EXISTS public.generated_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid,
  type text NOT NULL CHECK (type IN ('lead_post', 'content_post', 'sales_script', 'opening_script', 'profile_optimization', 'other')),
  title text,
  body text NOT NULL,
  metadata jsonb DEFAULT '{}',
  bot_session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_content_user ON public.generated_content(user_id, type, created_at DESC);

-- === Bot Sessions ===

CREATE TABLE IF NOT EXISTS public.bot_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid,
  bot_type text NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_sessions_user ON public.bot_sessions(user_id, bot_type, created_at DESC);

-- === RLS Policies ===

-- Advisor Assignments
ALTER TABLE public.advisor_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage assignments" ON public.advisor_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_super_admin = true))
  );

CREATE POLICY "Advisors can read own assignments" ON public.advisor_assignments
  FOR SELECT USING (advisor_user_id = auth.uid());

CREATE POLICY "Customers can see their advisor" ON public.advisor_assignments
  FOR SELECT USING (customer_user_id = auth.uid());

-- ToV Profiles
ALTER TABLE public.tone_of_voice_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ToV" ON public.tone_of_voice_profiles
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Advisors can read assigned customer ToV" ON public.tone_of_voice_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.advisor_assignments WHERE advisor_user_id = auth.uid() AND customer_user_id = tone_of_voice_profiles.user_id)
  );

-- Profile Optimizations
ALTER TABLE public.profile_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors can manage assigned optimizations" ON public.profile_optimizations
  FOR ALL USING (
    advisor_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_super_admin = true))
  );

CREATE POLICY "Customers can read own optimizations" ON public.profile_optimizations
  FOR SELECT USING (customer_user_id = auth.uid());

CREATE POLICY "Sections follow optimization access" ON public.profile_sections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profile_optimizations po
      WHERE po.id = optimization_id
      AND (po.advisor_user_id = auth.uid() OR po.customer_user_id = auth.uid()
           OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_super_admin = true)))
    )
  );

-- Checklists
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_item_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and advisors can manage templates" ON public.checklist_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'advisor'))
  );

CREATE POLICY "Template items follow template access" ON public.checklist_template_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.checklist_templates ct
      WHERE ct.id = template_id
      AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'advisor'))
    )
  );

CREATE POLICY "Advisors manage assigned instances" ON public.checklist_instances
  FOR ALL USING (
    advisor_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_super_admin = true))
  );

CREATE POLICY "Customers can read own instances" ON public.checklist_instances
  FOR SELECT USING (customer_user_id = auth.uid());

CREATE POLICY "Item statuses follow instance access" ON public.checklist_item_statuses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.checklist_instances ci
      WHERE ci.id = instance_id
      AND (ci.advisor_user_id = auth.uid() OR ci.customer_user_id = auth.uid()
           OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_super_admin = true)))
    )
  );

-- Content Pipeline
ALTER TABLE public.content_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Content plans: advisor or customer or admin" ON public.content_plans
  FOR ALL USING (
    customer_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.advisor_assignments WHERE advisor_user_id = auth.uid() AND customer_user_id = content_plans.customer_user_id)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_super_admin = true))
  );

CREATE POLICY "Content items: advisor or customer or admin" ON public.content_items
  FOR ALL USING (
    customer_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.advisor_assignments WHERE advisor_user_id = auth.uid() AND customer_user_id = content_items.customer_user_id)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_super_admin = true))
  );

-- Generated Content
ALTER TABLE public.generated_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own generated content" ON public.generated_content
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can read all generated content" ON public.generated_content
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_super_admin = true))
  );

-- Bot Sessions
ALTER TABLE public.bot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bot sessions" ON public.bot_sessions
  FOR ALL USING (user_id = auth.uid());
