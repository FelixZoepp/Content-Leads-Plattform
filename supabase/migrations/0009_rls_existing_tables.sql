-- CL-003: RLS on existing core tables
-- Policies use account_id scope from profiles, with admin bypass

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users read own profile" ON public.profiles FOR SELECT USING (id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.is_super_admin = true)));
CREATE POLICY IF NOT EXISTS "Users update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY IF NOT EXISTS "Service can insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);

-- contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Account scoped contacts" ON public.contacts FOR ALL USING (account_id IN (SELECT p.account_id FROM public.profiles p WHERE p.id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true));

-- companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Account scoped companies" ON public.companies FOR ALL USING (account_id IN (SELECT p.account_id FROM public.profiles p WHERE p.id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true));

-- deals
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Account scoped deals" ON public.deals FOR ALL USING (account_id IN (SELECT p.account_id FROM public.profiles p WHERE p.id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true));

-- activities
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Account scoped activities" ON public.activities FOR ALL USING (account_id IN (SELECT p.account_id FROM public.profiles p WHERE p.id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true));

-- tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Account scoped tasks" ON public.tasks FOR ALL USING (account_id IN (SELECT p.account_id FROM public.profiles p WHERE p.id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true));

-- campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Account scoped campaigns" ON public.campaigns FOR ALL USING (account_id IN (SELECT p.account_id FROM public.profiles p WHERE p.id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true));

-- api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Own api keys" ON public.api_keys FOR ALL USING (user_id = auth.uid());

-- call_sessions
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Account scoped calls" ON public.call_sessions FOR ALL USING (account_id IN (SELECT p.account_id FROM public.profiles p WHERE p.id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true));

-- tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users read own tenant" ON public.tenants FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.is_super_admin = true)));
CREATE POLICY IF NOT EXISTS "Admins manage tenants" ON public.tenants FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.is_super_admin = true)));

-- metrics_snapshot
ALTER TABLE public.metrics_snapshot ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Tenant scoped metrics read" ON public.metrics_snapshot FOR SELECT USING (tenant_id IN (SELECT t.id FROM public.tenants t WHERE t.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.role = 'advisor' OR p.is_super_admin = true)));
CREATE POLICY IF NOT EXISTS "Tenant scoped metrics insert" ON public.metrics_snapshot FOR INSERT WITH CHECK (tenant_id IN (SELECT t.id FROM public.tenants t WHERE t.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.is_super_admin = true)));

-- health_scores
ALTER TABLE public.health_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Staff read health" ON public.health_scores FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.role = 'advisor' OR p.is_super_admin = true)) OR tenant_id IN (SELECT t.id FROM public.tenants t WHERE t.user_id = auth.uid()));

-- alerts
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Admin read alerts" ON public.alerts FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.is_super_admin = true)));
CREATE POLICY IF NOT EXISTS "Service insert alerts" ON public.alerts FOR INSERT WITH CHECK (true);

-- email tables
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Account scoped email_logs" ON public.email_logs FOR ALL USING (account_id IN (SELECT p.account_id FROM public.profiles p WHERE p.id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true));
CREATE POLICY IF NOT EXISTS "Account scoped email_templates" ON public.email_templates FOR ALL USING (account_id IN (SELECT p.account_id FROM public.profiles p WHERE p.id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true));
CREATE POLICY IF NOT EXISTS "Account scoped email_campaigns" ON public.email_campaigns FOR ALL USING (account_id IN (SELECT p.account_id FROM public.profiles p WHERE p.id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true));

-- subscriptions, feature_access, user_roles, invitations, account_integrations
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Own subscription" ON public.subscriptions FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.is_super_admin = true)));
CREATE POLICY IF NOT EXISTS "Own feature access" ON public.feature_access FOR SELECT USING (account_id IN (SELECT p.account_id FROM public.profiles p WHERE p.id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true));
CREATE POLICY IF NOT EXISTS "Own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.is_super_admin = true)));
CREATE POLICY IF NOT EXISTS "Account scoped invitations" ON public.invitations FOR ALL USING (account_id IN (SELECT p.account_id FROM public.profiles p WHERE p.id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true));
CREATE POLICY IF NOT EXISTS "Account scoped integrations" ON public.account_integrations FOR ALL USING (account_id IN (SELECT p.account_id FROM public.profiles p WHERE p.id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true));
