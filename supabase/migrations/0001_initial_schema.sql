-- =============================================================================
-- Migration: 0001_initial_schema.sql
-- Content-Leads-Plattform - Initial database schema
-- Project: ciimklroqbmzcblnbgdk (eu-central-1)
-- Tables: 64 total
-- Note: RLS policies are applied in a separate migration (0002_rls_policies.sql)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Custom ENUM Types
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE activity_outcome AS ENUM ('reached', 'no_answer', 'interested', 'not_interested');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM ('call', 'email', 'dm', 'meeting', 'note');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'client', 'advisor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE benchmark_metric AS ENUM ('calls_per_day', 'meetings_per_week', 'offers_per_week');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE deal_stage AS ENUM ('New', 'Qualifiziert', 'Termin gesetzt', 'Angebot', 'Verhandlung', 'Gewonnen', 'Verloren', 'Lead', '1× nicht erreicht', '2× nicht erreicht', '3× nicht erreicht', 'Entscheider nicht erreichbar', 'Im Urlaub', 'Kein Interesse / Kein Bedarf', 'Termin gelegt', 'Setting terminiert', 'Setting No Show', 'Setting Follow Up', 'Closing terminiert', 'Closing No Show', 'Closing Follow Up', 'CC2 terminiert', 'Angebot versendet', 'Abgeschlossen');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lead_type AS ENUM ('inbound', 'outbound');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE linkedin_workflow_status AS ENUM ('neu', 'bereit_fuer_vernetzung', 'vernetzung_ausstehend', 'vernetzung_angenommen', 'erstnachricht_gesendet', 'kein_klick_fu_offen', 'fu1_gesendet', 'fu2_gesendet', 'fu3_gesendet', 'reagiert_warm', 'abgeschlossen');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE outreach_status AS ENUM ('offen', 'gesendet', 'follow_up', 'geschlossen');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_related_type AS ENUM ('deal', 'contact');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('open', 'done');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('setter', 'closer', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

-- Multi-tenant account/organization records
CREATE TABLE IF NOT EXISTS public.accounts (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "name" TEXT NOT NULL,
    "company_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "subscription_status" TEXT DEFAULT 'trial'::text,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "default_deal_amount" NUMERIC DEFAULT 0,
    "impressum_url" TEXT,
    "datenschutz_url" TEXT,
    PRIMARY KEY ("id")
);

-- Agency client tenants managed via the admin dashboard
CREATE TABLE IF NOT EXISTS public.tenants (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "user_id" UUID NOT NULL,
    "company_name" TEXT NOT NULL,
    "contact_name" TEXT,
    "linkedin_url" TEXT,
    "sheet_url" TEXT,
    "sheet_mapping" JSONB,
    "last_sync_at" TIMESTAMPTZ,
    "is_active" BOOLEAN DEFAULT true,
    "advisor_id" UUID,
    "product_palette" JSONB DEFAULT '[]'::jsonb,
    "total_customers" INTEGER,
    "existing_customers" INTEGER,
    "new_customers_monthly" INTEGER,
    "new_customer_volume" NUMERIC,
    "existing_customer_volume" NUMERIC,
    "order_volume_monthly" NUMERIC,
    "payment_default_rate" NUMERIC,
    "commission_rate_actual" NUMERIC,
    "commission_rate_target" NUMERIC,
    "sales_side_costs" NUMERIC,
    "sales_gross_salary" NUMERIC,
    "fulfillment_gross_salary" NUMERIC,
    "fulfillment_tool_costs" NUMERIC,
    "cost_per_customer_fulfillment" NUMERIC,
    "ltv_avg_customer" NUMERIC,
    "cac_actual" NUMERIC,
    "cac_target" NUMERIC,
    "aov_new_customer" NUMERIC,
    "aov_existing_customer" NUMERIC,
    "created_at" TIMESTAMPTZ DEFAULT now(),
    "updated_at" TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY ("id")
);

-- User profiles extending auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" user_role DEFAULT 'setter'::user_role NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "account_id" UUID -- Links user to their tenant account,
    "is_super_admin" BOOLEAN DEFAULT false NOT NULL -- Master admin with access to all accounts,
    "phone_number" TEXT,
    "onboarding_completed" BOOLEAN DEFAULT false,
    "onboarding_step" INTEGER DEFAULT 0,
    "member_code" INTEGER,
    "trial_ends_at" TIMESTAMPTZ,
    "invited_via" UUID,
    PRIMARY KEY ("id")
);

-- Company/organization records linked to contacts
CREATE TABLE IF NOT EXISTS public.companies (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "owner_user_id" UUID,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "phone" TEXT,
    "street" TEXT,
    "zip" TEXT,
    "city" TEXT,
    "country" TEXT,
    "account_id" UUID,
    PRIMARY KEY ("id")
);

-- LinkedIn and outreach campaign definitions
CREATE TABLE IF NOT EXISTS public.campaigns (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "account_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT DEFAULT 'draft'::text NOT NULL CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'completed'::text])),
    "start_date" DATE,
    "end_date" DATE,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "pitch_video_url" TEXT -- URL to the static 2min pitch video,
    "heygen_avatar_id" TEXT,
    "heygen_voice_id" TEXT,
    "landing_page_id" UUID,
    "assigned_user_id" UUID,
    PRIMARY KEY ("id")
);

-- Personalized lead landing pages
CREATE TABLE IF NOT EXISTS public.landing_pages (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "account_id" UUID,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "status" TEXT DEFAULT 'draft'::text NOT NULL,
    "custom_domain" TEXT,
    "prompt" TEXT,
    "content" JSONB DEFAULT '{}'::jsonb NOT NULL,
    "styles" JSONB DEFAULT '{}'::jsonb NOT NULL,
    "meta_title" TEXT,
    "meta_description" TEXT,
    "og_image_url" TEXT,
    "view_count" INTEGER DEFAULT 0,
    "calendar_url" TEXT,
    "share_token" UUID UNIQUE,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "published_at" TIMESTAMPTZ,
    PRIMARY KEY ("id")
);

-- CRM contacts with LinkedIn outreach workflow tracking
CREATE TABLE IF NOT EXISTS public.contacts (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "source" TEXT,
    "tags" TEXT[] DEFAULT '{}'::text[],
    "owner_user_id" UUID,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "stage" TEXT DEFAULT 'Lead'::text,
    "status" TEXT,
    "mobile" TEXT,
    "position" TEXT,
    "external_id" TEXT,
    "company_id" UUID,
    "account_id" UUID NOT NULL,
    "slug" TEXT UNIQUE,
    "video_url" TEXT,
    "viewed" BOOLEAN DEFAULT false,
    "viewed_at" TIMESTAMPTZ,
    "view_count" INTEGER DEFAULT 0,
    "lead_type" lead_type DEFAULT 'inbound'::lead_type,
    "outreach_message" TEXT,
    "personalized_url" TEXT,
    "outreach_status" outreach_status,
    "campaign_id" UUID,
    "lead_score" INTEGER DEFAULT 0,
    "workflow_status" linkedin_workflow_status DEFAULT 'neu'::linkedin_workflow_status,
    "connection_sent_at" TIMESTAMPTZ,
    "connection_accepted_at" TIMESTAMPTZ,
    "first_message_sent_at" TIMESTAMPTZ,
    "fu1_sent_at" TIMESTAMPTZ,
    "fu2_sent_at" TIMESTAMPTZ,
    "fu3_sent_at" TIMESTAMPTZ,
    "responded_at" TIMESTAMPTZ,
    "daily_messages_count" INTEGER DEFAULT 0,
    "last_message_date" DATE,
    "linkedin_url" TEXT,
    "video_status" TEXT DEFAULT 'pending'::text CHECK (video_status = ANY (ARRAY['pending'::text, 'generating_intro'::text, 'merging'::text, 'uploading'::text, 'ready'::text, 'error'::text])) -- Video generation workflow status,
    "intro_video_url" TEXT,
    "heygen_video_id" TEXT,
    "video_error" TEXT,
    "video_generated_at" TIMESTAMPTZ,
    "channels_active" TEXT[] DEFAULT '{}'::text[],
    "positive_reply_at" TIMESTAMPTZ,
    "appointment_booked_at" TIMESTAMPTZ,
    PRIMARY KEY ("id")
);

-- Sales pipeline deals/opportunities
CREATE TABLE IF NOT EXISTS public.deals (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "title" TEXT NOT NULL,
    "contact_id" UUID,
    "pipeline" TEXT DEFAULT 'Sales'::text,
    "stage" deal_stage DEFAULT 'New'::deal_stage NOT NULL,
    "amount_eur" NUMERIC DEFAULT 0,
    "probability_pct" INTEGER DEFAULT 0 CHECK (probability_pct >= 0 AND probability_pct <= 100),
    "setter_id" UUID,
    "closer_id" UUID,
    "next_action" TEXT,
    "due_date" DATE,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "account_id" UUID,
    PRIMARY KEY ("id")
);

-- Activity log: calls, emails, DMs, meetings, notes
CREATE TABLE IF NOT EXISTS public.activities (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "deal_id" UUID,
    "contact_id" UUID,
    "user_id" UUID NOT NULL,
    "type" activity_type NOT NULL,
    "timestamp" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "duration_min" INTEGER,
    "outcome" activity_outcome,
    "note" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "account_id" UUID,
    PRIMARY KEY ("id")
);

-- Task management linked to deals or contacts
CREATE TABLE IF NOT EXISTS public.tasks (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "title" TEXT NOT NULL,
    "related_type" task_related_type,
    "related_id" UUID,
    "assignee_id" UUID NOT NULL,
    "due_date" DATE,
    "status" task_status DEFAULT 'open'::task_status NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "account_id" UUID,
    PRIMARY KEY ("id")
);

-- Performance benchmarks per user and metric
CREATE TABLE IF NOT EXISTS public.benchmarks (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "metric" benchmark_metric NOT NULL,
    "target_value" INTEGER NOT NULL,
    "user_id" UUID,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Stripe subscription tracking per user
CREATE TABLE IF NOT EXISTS public.subscriptions (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "user_id" UUID NOT NULL,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "plan_name" TEXT NOT NULL CHECK (plan_name = ANY (ARRAY['basic'::text, 'pro'::text, 'enterprise'::text])),
    "billing_interval" TEXT NOT NULL CHECK (billing_interval = ANY (ARRAY['monthly'::text, 'yearly'::text])),
    "status" TEXT DEFAULT 'active'::text NOT NULL CHECK (status = ANY (ARRAY['active'::text, 'cancelled'::text, 'past_due'::text, 'trialing'::text])),
    "current_period_start" TIMESTAMPTZ,
    "current_period_end" TIMESTAMPTZ,
    "cancel_at_period_end" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- API key management for auth.users
CREATE TABLE IF NOT EXISTS public.api_keys (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "label" TEXT NOT NULL,
    "active" BOOLEAN DEFAULT true NOT NULL,
    "last_used_at" TIMESTAMPTZ,
    PRIMARY KEY ("id")
);

-- Phone call scripts for the sales team
CREATE TABLE IF NOT EXISTS public.call_scripts (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ DEFAULT now(),
    "updated_at" TIMESTAMPTZ DEFAULT now(),
    "system_context" TEXT -- System context for AI objection handling - product info, company info, general objection handling strategies,
    "account_id" UUID,
    PRIMARY KEY ("id")
);

-- Recorded call session data with scoring
CREATE TABLE IF NOT EXISTS public.call_sessions (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "deal_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "ended_at" TIMESTAMPTZ,
    "duration_seconds" INTEGER,
    "objections_detected" JSONB DEFAULT '[]'::jsonb,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "account_id" UUID,
    "recording_url" TEXT,
    "recording_duration_seconds" INTEGER,
    "transcript" TEXT,
    "summary" TEXT,
    "key_points" TEXT[],
    "action_items" TEXT[],
    "sentiment" TEXT,
    "summary_generated_at" TIMESTAMPTZ,
    PRIMARY KEY ("id")
);

-- Sales objections and counter-script library
CREATE TABLE IF NOT EXISTS public.objections (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "title" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT '{}'::text[] NOT NULL,
    "standard_response" TEXT NOT NULL,
    "category" TEXT,
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "account_id" UUID,
    PRIMARY KEY ("id")
);

-- Events from lead landing page views/interactions
CREATE TABLE IF NOT EXISTS public.lead_tracking_events (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "contact_id" UUID NOT NULL,
    "account_id" UUID,
    "event_type" TEXT NOT NULL CHECK (event_type = ANY (ARRAY['page_view'::text, 'video_play'::text, 'video_progress'::text, 'video_complete'::text, 'button_click'::text, 'scroll_depth'::text, 'time_on_page'::text, 'form_submit'::text, 'booking_click'::text, 'cta_click'::text])),
    "event_data" JSONB DEFAULT '{}'::jsonb,
    "page_url" TEXT,
    "session_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Follow-up message templates per campaign
CREATE TABLE IF NOT EXISTS public.followup_templates (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "campaign_id" UUID,
    "account_id" UUID,
    "template_type" TEXT NOT NULL CHECK (template_type = ANY (ARRAY['first_message'::text, 'fu1'::text, 'fu2'::text, 'fu3'::text])),
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_default" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Third-party integrations per account (LinkedIn, HeyGen, etc.)
CREATE TABLE IF NOT EXISTS public.account_integrations (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "account_id" UUID NOT NULL UNIQUE,
    "heygen_avatar_id" TEXT,
    "heygen_voice_id" TEXT,
    "heygen_api_key_id" UUID,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "smtp_host" TEXT,
    "smtp_port" INTEGER,
    "smtp_username" TEXT,
    "smtp_password_encrypted" TEXT,
    "smtp_from_email" TEXT,
    "smtp_from_name" TEXT,
    "telephony_provider" TEXT,
    "telephony_timezone" TEXT DEFAULT 'Europe/Berlin'::text,
    "telephony_country" TEXT DEFAULT 'DE'::text,
    "telephony_webhook_secret" TEXT,
    "telephony_webhook_verified" BOOLEAN DEFAULT false,
    "telephony_webhook_verified_at" TIMESTAMPTZ,
    "telephony_onboarding_completed" BOOLEAN DEFAULT false,
    PRIMARY KEY ("id")
);

-- Encrypted third-party API keys per account
CREATE TABLE IF NOT EXISTS public.encrypted_api_keys (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "account_id" UUID NOT NULL,
    "key_name" TEXT NOT NULL,
    "encrypted_value" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- User role assignments
CREATE TABLE IF NOT EXISTS public.user_roles (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "user_id" UUID NOT NULL,
    "role" app_role NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY ("id")
);

-- Daily KPI tracking entries per user
CREATE TABLE IF NOT EXISTS public.kpi_entries (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "user_id" UUID NOT NULL,
    "week_start_date" DATE NOT NULL,
    "leads_generated" INTEGER DEFAULT 0,
    "qualified_leads" INTEGER DEFAULT 0,
    "appointments_scheduled" INTEGER DEFAULT 0,
    "sales_closed" INTEGER DEFAULT 0,
    "revenue" NUMERIC DEFAULT 0,
    "posts_count" INTEGER DEFAULT 0,
    "impressions" INTEGER DEFAULT 0,
    "engagement_rate" NUMERIC DEFAULT 0,
    "new_followers" INTEGER DEFAULT 0,
    "date" DATE DEFAULT CURRENT_DATE,
    "dms_sent" INTEGER DEFAULT 0,
    "dm_replies" INTEGER DEFAULT 0,
    "mails_sent" INTEGER DEFAULT 0,
    "mail_opens" INTEGER DEFAULT 0,
    "mail_replies" INTEGER DEFAULT 0,
    "posts_published" INTEGER DEFAULT 0,
    "termine" INTEGER DEFAULT 0,
    "proposals" INTEGER DEFAULT 0,
    "abschluesse" INTEGER DEFAULT 0,
    "looms_sent" INTEGER DEFAULT 0,
    "looms_viewed" INTEGER DEFAULT 0,
    "comments_received" INTEGER DEFAULT 0,
    "leads_from_comments" INTEGER DEFAULT 0,
    "setting_calls" INTEGER DEFAULT 0,
    "closing_calls" INTEGER DEFAULT 0,
    "umsatz" NUMERIC DEFAULT 0,
    "training_done" BOOLEAN DEFAULT false,
    "training_einwand" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Periodic metrics snapshots per tenant
CREATE TABLE IF NOT EXISTS public.metrics_snapshot (
    "id" BIGINT DEFAULT nextval('metrics_snapshot_id_seq'::regclass) NOT NULL,
    "tenant_id" UUID NOT NULL,
    "period_date" DATE NOT NULL,
    "period_type" TEXT CHECK (period_type = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text])),
    "posts" INTEGER DEFAULT 0,
    "impressions" INTEGER DEFAULT 0,
    "likes" INTEGER DEFAULT 0,
    "comments" INTEGER DEFAULT 0,
    "new_followers" INTEGER DEFAULT 0,
    "leads_total" INTEGER DEFAULT 0,
    "leads_qualified" INTEGER DEFAULT 0,
    "appointments" INTEGER DEFAULT 0,
    "deals" INTEGER DEFAULT 0,
    "revenue" NUMERIC DEFAULT 0,
    "post_url" TEXT,
    "post_type" TEXT,
    "link_clicks" INTEGER DEFAULT 0,
    "followers_current" INTEGER DEFAULT 0,
    "settings_planned" INTEGER DEFAULT 0,
    "settings_held" INTEGER DEFAULT 0,
    "closings" INTEGER DEFAULT 0,
    "cash_collected" NUMERIC DEFAULT 0,
    "deal_volume" NUMERIC DEFAULT 0,
    "monthly_retainer" NUMERIC DEFAULT 0,
    "words_spoken" INTEGER DEFAULT 0,
    "calls_made" INTEGER DEFAULT 0,
    "calls_reached" INTEGER DEFAULT 0,
    "calls_interested" INTEGER DEFAULT 0,
    "closings_planned" INTEGER DEFAULT 0,
    "closings_held" INTEGER DEFAULT 0,
    "dms_sent" INTEGER DEFAULT 0,
    "dms_replies" INTEGER DEFAULT 0,
    "cold_emails_sent" INTEGER DEFAULT 0,
    "cold_emails_replies" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY ("id")
);

-- Tenant health scores over time
CREATE TABLE IF NOT EXISTS public.health_scores (
    "id" BIGINT DEFAULT nextval('health_scores_id_seq'::regclass) NOT NULL,
    "tenant_id" UUID NOT NULL,
    "score" INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    "color" TEXT CHECK (color = ANY (ARRAY['red'::text, 'amber'::text, 'green'::text])),
    "rationale_text" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY ("id")
);

-- AI-generated weekly/monthly summaries per tenant
CREATE TABLE IF NOT EXISTS public.ai_summaries (
    "id" BIGINT DEFAULT nextval('ai_summaries_id_seq'::regclass) NOT NULL,
    "tenant_id" UUID,
    "scope" TEXT CHECK (scope = ANY (ARRAY['client_daily'::text, 'client_weekly'::text, 'admin_portfolio'::text])),
    "summary_text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY ("id")
);

-- Customer satisfaction survey responses per tenant
CREATE TABLE IF NOT EXISTS public.csat_responses (
    "id" BIGINT DEFAULT nextval('csat_responses_id_seq'::regclass) NOT NULL,
    "tenant_id" UUID NOT NULL,
    "respondent_email" TEXT,
    "csat_1_5" INTEGER CHECK (csat_1_5 >= 1 AND csat_1_5 <= 5),
    "nps_0_10" INTEGER CHECK (nps_0_10 >= 0 AND nps_0_10 <= 10),
    "comment" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY ("id")
);

-- System and business alerts per tenant
CREATE TABLE IF NOT EXISTS public.alerts (
    "id" BIGINT DEFAULT nextval('alerts_id_seq'::regclass) NOT NULL,
    "tenant_id" UUID NOT NULL,
    "type" TEXT,
    "severity" TEXT CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now(),
    "resolved_at" TIMESTAMPTZ,
    PRIMARY KEY ("id")
);

-- Service fulfillment status tracking per tenant
CREATE TABLE IF NOT EXISTS public.fulfillment_tracking (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id" UUID NOT NULL UNIQUE,
    "deal_closed_at" DATE,
    "onboarding_started_at" DATE,
    "onboarding_completed_at" DATE,
    "project_start_date" DATE,
    "project_planned_end" DATE,
    "project_actual_end" DATE,
    "project_status" TEXT DEFAULT 'onboarding'::text NOT NULL CHECK (project_status = ANY (ARRAY['onboarding'::text, 'active'::text, 'paused'::text, 'completed'::text, 'cancelled'::text])),
    "milestones_total" INTEGER DEFAULT 0,
    "milestones_completed" INTEGER DEFAULT 0,
    "csat_score" NUMERIC,
    "nps_score" INTEGER,
    "contract_start" DATE,
    "contract_end" DATE,
    "contract_renewed" BOOLEAN DEFAULT false,
    "churn_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Financial MRR/ARR metrics per tenant
CREATE TABLE IF NOT EXISTS public.financial_tracking (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id" UUID NOT NULL,
    "period_month" DATE NOT NULL,
    "cash_collected" NUMERIC DEFAULT 0,
    "revenue_recurring" NUMERIC DEFAULT 0,
    "revenue_onetime" NUMERIC DEFAULT 0,
    "costs_ads" NUMERIC DEFAULT 0,
    "costs_tools" NUMERIC DEFAULT 0,
    "costs_personnel" NUMERIC DEFAULT 0,
    "costs_other" NUMERIC DEFAULT 0,
    "invoices_open_count" INTEGER DEFAULT 0,
    "invoices_open_amount" NUMERIC DEFAULT 0,
    "invoices_overdue_count" INTEGER DEFAULT 0,
    "invoices_overdue_amount" NUMERIC DEFAULT 0,
    "avg_days_to_payment" INTEGER DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Ideal Customer Profile definitions per tenant
CREATE TABLE IF NOT EXISTS public.icp_customers (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_name" TEXT NOT NULL,
    "industry" TEXT,
    "has_paid" BOOLEAN DEFAULT false,
    "days_to_payment" INTEGER,
    "deal_value" NUMERIC,
    "notes" TEXT,
    "sort_order" INTEGER DEFAULT 0,
    "contact_name" TEXT,
    "employee_count" TEXT,
    "annual_revenue" TEXT,
    "lead_source" TEXT,
    "close_duration" TEXT,
    "payment_status" TEXT,
    "payment_speed" TEXT,
    "collaboration_score" INTEGER DEFAULT 0,
    "result_score" INTEGER DEFAULT 0,
    "problem_awareness" TEXT,
    "close_date" DATE,
    "onboarding_date" DATE,
    "project_start_date" DATE,
    "project_end_date" DATE,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- General NPS/satisfaction survey responses
CREATE TABLE IF NOT EXISTS public.survey_responses (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id" UUID NOT NULL,
    "survey_id" TEXT NOT NULL,
    "answers" JSONB DEFAULT '{}'::jsonb NOT NULL,
    "tags" TEXT[] DEFAULT '{}'::text[],
    "testimonials" JSONB DEFAULT '[]'::jsonb,
    "nps" INTEGER,
    "avg_score" NUMERIC,
    "total_score" INTEGER DEFAULT 0,
    "review_clicked" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Configured outbound webhook endpoints
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "event_type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Outbound webhook delivery log
CREATE TABLE IF NOT EXISTS public.webhook_log (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "endpoint_id" UUID,
    "event_type" TEXT NOT NULL,
    "payload" JSONB DEFAULT '{}'::jsonb NOT NULL,
    "status_code" INTEGER,
    "response_body" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Transactional email send log
CREATE TABLE IF NOT EXISTS public.email_send_log (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "message_id" TEXT,
    "template_name" TEXT NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "status" TEXT NOT NULL CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'suppressed'::text, 'failed'::text, 'bounced'::text, 'complained'::text, 'dlq'::text])),
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Email sending state and rate-limit tracking
CREATE TABLE IF NOT EXISTS public.email_send_state (
    "id" INTEGER DEFAULT 1 NOT NULL CHECK (id = 1),
    "retry_after_until" TIMESTAMPTZ,
    "batch_size" INTEGER DEFAULT 10 NOT NULL,
    "send_delay_ms" INTEGER DEFAULT 200 NOT NULL,
    "auth_email_ttl_minutes" INTEGER DEFAULT 15 NOT NULL,
    "transactional_email_ttl_minutes" INTEGER DEFAULT 60 NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Suppressed/blocked email addresses
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "reason" TEXT NOT NULL CHECK (reason = ANY (ARRAY['unsubscribe'::text, 'bounce'::text, 'complaint'::text])),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Email unsubscribe token records
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "email" TEXT NOT NULL UNIQUE,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "used_at" TIMESTAMPTZ,
    PRIMARY KEY ("id")
);

-- AI-generated content assets
CREATE TABLE IF NOT EXISTS public.generated_assets (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "user_id" UUID NOT NULL,
    "asset_type" TEXT NOT NULL,
    "content" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now(),
    "updated_at" TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY ("id")
);

-- Daily task checklists per user
CREATE TABLE IF NOT EXISTS public.daily_tasks (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "user_id" UUID NOT NULL,
    "day_number" INTEGER NOT NULL,
    "task_text" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "completed" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY ("id")
);

-- LinkedIn content posts
CREATE TABLE IF NOT EXISTS public.content_posts (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "user_id" UUID NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "topic" TEXT NOT NULL,
    "caption" TEXT,
    "status" TEXT DEFAULT 'planned'::text CHECK (status = ANY (ARRAY['planned'::text, 'published'::text])),
    "post_type" TEXT DEFAULT 'content'::text CHECK (post_type = ANY (ARRAY['content'::text, 'lead'::text])),
    "created_at" TIMESTAMPTZ DEFAULT now(),
    "updated_at" TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY ("id")
);

-- Team member invitation records
CREATE TABLE IF NOT EXISTS public.invitations (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "token" UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    "account_id" UUID,
    "created_by" UUID NOT NULL,
    "email_hint" TEXT,
    "role" user_role DEFAULT 'setter'::user_role,
    "expires_at" TIMESTAMPTZ DEFAULT (now() + '7 days'::interval) NOT NULL,
    "used_at" TIMESTAMPTZ,
    "used_by" UUID,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Reusable email templates per account
CREATE TABLE IF NOT EXISTS public.email_templates (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "account_id" UUID,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "body_text" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Email send log per contact
CREATE TABLE IF NOT EXISTS public.email_logs (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "account_id" UUID,
    "contact_id" UUID,
    "template_id" UUID,
    "user_id" UUID NOT NULL,
    "from_email" TEXT NOT NULL,
    "to_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "status" TEXT DEFAULT 'sent'::text,
    "tracking_id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "opened_at" TIMESTAMPTZ,
    "open_count" INTEGER DEFAULT 0,
    "click_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Email open/click tracking events
CREATE TABLE IF NOT EXISTS public.email_tracking_events (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "email_log_id" UUID,
    "event_type" TEXT NOT NULL,
    "link_url" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Email drip campaign definitions
CREATE TABLE IF NOT EXISTS public.email_campaigns (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "account_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT DEFAULT 'draft'::text NOT NULL,
    "send_days" TEXT[] DEFAULT '{mon,tue,wed,thu,fri}'::text[],
    "send_start_hour" INTEGER DEFAULT 9,
    "send_end_hour" INTEGER DEFAULT 17,
    "timezone" TEXT DEFAULT 'Europe/Berlin'::text,
    "daily_send_limit" INTEGER DEFAULT 50,
    "total_leads" INTEGER DEFAULT 0,
    "total_sent" INTEGER DEFAULT 0,
    "total_opened" INTEGER DEFAULT 0,
    "total_clicked" INTEGER DEFAULT 0,
    "total_replied" INTEGER DEFAULT 0,
    "total_bounced" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Steps/sequence within email campaigns
CREATE TABLE IF NOT EXISTS public.email_campaign_steps (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "campaign_id" UUID NOT NULL,
    "step_order" INTEGER DEFAULT 1 NOT NULL,
    "delay_days" INTEGER DEFAULT 0 NOT NULL,
    "subject" TEXT NOT NULL,
    "body_text" TEXT NOT NULL,
    "variant" TEXT,
    "total_sent" INTEGER DEFAULT 0,
    "total_opened" INTEGER DEFAULT 0,
    "total_clicked" INTEGER DEFAULT 0,
    "total_replied" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Lead enrollment in email campaigns with step tracking
CREATE TABLE IF NOT EXISTS public.email_campaign_leads (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "campaign_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "status" TEXT DEFAULT 'active'::text NOT NULL,
    "current_step" INTEGER DEFAULT 0,
    "last_sent_at" TIMESTAMPTZ,
    "next_send_at" TIMESTAMPTZ,
    "opened_count" INTEGER DEFAULT 0,
    "clicked_count" INTEGER DEFAULT 0,
    "replied_at" TIMESTAMPTZ,
    "bounced_at" TIMESTAMPTZ,
    "ab_variant" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Lead enrichment credit usage per account
CREATE TABLE IF NOT EXISTS public.enrichment_credits (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "account_id" UUID NOT NULL,
    "month_year" TEXT NOT NULL,
    "phone_credits_used" INTEGER DEFAULT 0 NOT NULL,
    "email_credits_used" INTEGER DEFAULT 0 NOT NULL,
    "phone_credits_limit" INTEGER DEFAULT 100 NOT NULL,
    "email_credits_limit" INTEGER DEFAULT 100 NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Enrichment credit subscription plans per account
CREATE TABLE IF NOT EXISTS public.credit_subscriptions (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "account_id" UUID NOT NULL UNIQUE,
    "stripe_subscription_id" TEXT,
    "stripe_customer_id" TEXT,
    "package" TEXT NOT NULL CHECK (package = ANY (ARRAY['s'::text, 'm'::text, 'l'::text])),
    "extra_credits" INTEGER DEFAULT 100 NOT NULL,
    "status" TEXT DEFAULT 'active'::text NOT NULL CHECK (status = ANY (ARRAY['active'::text, 'canceled'::text, 'past_due'::text, 'incomplete'::text])),
    "current_period_end" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Lead list collections per account
CREATE TABLE IF NOT EXISTS public.lead_lists (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "account_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "search_filters" JSONB DEFAULT '{}'::jsonb,
    "total_leads" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Individual items in lead lists
CREATE TABLE IF NOT EXISTS public.lead_list_items (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "list_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "contact_id" UUID,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "position" TEXT,
    "company" TEXT,
    "industry" TEXT,
    "employee_count" TEXT,
    "city" TEXT,
    "country" TEXT,
    "website" TEXT,
    "linkedin_url" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "enriched" BOOLEAN DEFAULT false,
    "imported" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Full configuration templates for lead landing pages
CREATE TABLE IF NOT EXISTS public.lead_page_templates (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "account_id" UUID,
    "name" TEXT DEFAULT 'Standard-Vorlage'::text NOT NULL,
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "header_logo_text" TEXT DEFAULT 'Content-Leads'::text,
    "header_logo_accent" TEXT DEFAULT 'Content'::text,
    "header_nav_items" JSONB DEFAULT '["Warum wir?", "Unser Ansatz", "FAQ"]'::jsonb,
    "header_cta_text" TEXT DEFAULT '{{first_name}}, lass uns sprechen!'::text,
    "hero_headline" TEXT DEFAULT 'Hey {{first_name}}, sieh dir das 2-minütige Video an'::text,
    "hero_subheadline" TEXT DEFAULT '... und erfahre, wie {{company}} mit personalisierten Outreach-Kampagnen und starkem Content qualifizierte Leads generiert.'::text,
    "hero_cta_text" TEXT DEFAULT 'Gratis Termin vereinbaren'::text,
    "hero_video_caption" TEXT DEFAULT 'Nur für dich {{first_name}}, nimm dir die 2 Minuten und schau kurz rein!!'::text,
    "coaching_badge" TEXT DEFAULT 'Exklusives Coaching-Programm'::text,
    "coaching_headline" TEXT DEFAULT 'Die zwei Säulen für deinen LinkedIn-Erfolg'::text,
    "coaching_subheadline" TEXT DEFAULT 'Lerne, wie du mit Outreach Umsatz generierst und mit Content Anfragen bekommst'::text,
    "pillar1_title" TEXT DEFAULT 'Säule 1: Outreach'::text,
    "pillar1_subtitle" TEXT DEFAULT '= Umsatz generieren'::text,
    "pillar1_description" TEXT DEFAULT 'Wir zeigen dir, wie du personalisierte Kampagnen erstellst, die direkt bei deiner Zielgruppe ankommen.'::text,
    "pillar1_items" JSONB DEFAULT '["Du lernst hyperpersonalisierte Nachrichten zu schreiben", "Wie du direkte Terminbuchungen durch warme Kontakte bekommst", "Datengetriebene Zielgruppenansprache verstehen", "A/B-Tests für maximale Conversion durchführen", "Schritt-für-Schritt Anleitungen zum Nachmachen"]'::jsonb,
    "pillar2_title" TEXT DEFAULT 'Säule 2: Inbound Content'::text,
    "pillar2_subtitle" TEXT DEFAULT '= Anfragen generieren'::text,
    "pillar2_description" TEXT DEFAULT 'Lerne, wie du hochwertigen Content erstellst, der deine Expertise zeigt und organisch Leads anzieht.'::text,
    "pillar2_items" JSONB DEFAULT '["So schreibst du Posts, die viral gehen", "Thought Leadership aufbauen", "Die richtige Posting-Frequenz finden", "Community Building & Engagement-Strategien", "Branding & Sichtbarkeit systematisch steigern"]'::jsonb,
    "combined_headline" TEXT DEFAULT 'Outreach + Content = Maximale Wirkung'::text,
    "combined_text" TEXT DEFAULT 'Im Coaching lernst du beide Strategien zu meistern. Während dein Outreach aktiv Termine generiert, baut dein Content gleichzeitig Vertrauen und Autorität auf.'::text,
    "comparison_badge" TEXT DEFAULT '#1 LinkedIn Beratung in der DACH-Region'::text,
    "comparison_headline" TEXT DEFAULT 'Was uns von anderen unterscheidet'::text,
    "comparison_subheadline" TEXT DEFAULT 'Keine leeren Versprechungen – wir liefern Ergebnisse mit Garantie.'::text,
    "others_title" TEXT DEFAULT 'Andere Anbieter'::text,
    "others_items" JSONB DEFAULT '["Erste Ergebnisse nach 3-6 Monaten", "Keine Umsatzgarantie", "Nur Theorie, keine Umsetzungsbegleitung", "Standard-Inhalte für alle", "Du bist nach dem Kurs auf dich allein gestellt"]'::jsonb,
    "us_title" TEXT DEFAULT 'Unser Coaching bei Content-Leads'::text,
    "us_items" JSONB DEFAULT '["Erste Anfragen bereits in 7 Tagen", "Umsatzgarantie", "Intensive 1:1 Betreuung bei der Umsetzung", "Individuell auf deine Situation angepasst", "Persönlicher Coach dauerhaft an deiner Seite"]'::jsonb,
    "primary_color" TEXT DEFAULT '#06b6d4'::text,
    "secondary_color" TEXT DEFAULT '#a855f7'::text,
    "background_color" TEXT DEFAULT '#0f172a'::text,
    "text_color" TEXT DEFAULT '#f8fafc'::text,
    "accent_color" TEXT DEFAULT '#f59e0b'::text,
    "calendar_url" TEXT,
    "footer_company_name" TEXT DEFAULT 'Content-Leads'::text,
    "footer_tagline" TEXT DEFAULT 'Alle Rechte vorbehalten.'::text,
    "footer_impressum_url" TEXT DEFAULT 'https://content-leads.de/impressum'::text,
    "footer_datenschutz_url" TEXT DEFAULT 'https://content-leads.de/datenschutz'::text,
    "case_studies" JSONB DEFAULT '[]'::jsonb,
    "case_studies_headline" TEXT DEFAULT 'Das könnten deine Ergebnisse sein'::text,
    "case_studies_subheadline" TEXT DEFAULT 'Echte Kunden, echte Ergebnisse'::text,
    "case_studies_badge" TEXT DEFAULT 'Erfolgsgeschichten'::text,
    "guarantee_badge" TEXT DEFAULT 'Unsere Garantie'::text,
    "guarantee_headline" TEXT DEFAULT 'Deine Investition ist geschützt'::text,
    "guarantee_description" TEXT DEFAULT 'Wir sind so überzeugt von unserer Methode, dass wir dir eine 100% Zufriedenheitsgarantie geben.'::text,
    "guarantee_items" JSONB DEFAULT '["Geld-zurück-Garantie in den ersten 30 Tagen", "Kostenlose Nachbetreuung bei Fragen", "Lifetime-Zugang zu allen Updates"]'::jsonb,
    "faq_badge" TEXT DEFAULT 'Häufige Fragen'::text,
    "faq_headline" TEXT DEFAULT 'Noch Fragen?'::text,
    "faq_subheadline" TEXT DEFAULT 'Hier findest du Antworten auf die wichtigsten Fragen'::text,
    "faq_items" JSONB DEFAULT '[]'::jsonb,
    "cta_badge" TEXT DEFAULT 'Jetzt starten'::text,
    "cta_headline" TEXT DEFAULT 'Bereit für den nächsten Schritt, {{first_name}}?'::text,
    "cta_description" TEXT DEFAULT 'Vereinbare jetzt ein kostenloses Strategiegespräch und erfahre, wie wir dir helfen können.'::text,
    "cta_button_text" TEXT DEFAULT 'Kostenloses Gespräch buchen'::text,
    "testimonials_badge" TEXT DEFAULT 'Was unsere Kunden sagen'::text,
    "testimonials_headline" TEXT DEFAULT 'Echte Erfolgsgeschichten'::text,
    "testimonials_subheadline" TEXT DEFAULT 'Höre, was andere über ihre Erfahrungen berichten'::text,
    "testimonials" JSONB DEFAULT '[]'::jsonb,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Phone numbers configured per account for telephony
CREATE TABLE IF NOT EXISTS public.account_phone_numbers (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "account_id" UUID NOT NULL,
    "phone_number" TEXT NOT NULL,
    "label" TEXT,
    "is_primary" BOOLEAN DEFAULT false,
    "verified" BOOLEAN DEFAULT false,
    "verified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Team members linked to accounts with roles
CREATE TABLE IF NOT EXISTS public.account_team_members (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "account_id" UUID NOT NULL,
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "extension" TEXT,
    "phone_number" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Incoming telephony/call webhook events
CREATE TABLE IF NOT EXISTS public.telephony_webhook_events (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "account_id" UUID,
    "provider" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "call_id" TEXT,
    "from_number" TEXT,
    "to_number" TEXT,
    "status" TEXT,
    "duration_seconds" INTEGER,
    "recording_url" TEXT,
    "raw_payload" JSONB,
    "processed" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Outreach sequence definitions per account
CREATE TABLE IF NOT EXISTS public.sequences (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "account_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT DEFAULT 'draft'::text NOT NULL,
    "definition" JSONB DEFAULT '{"edges": [], "nodes": []}'::jsonb NOT NULL,
    "total_leads" INTEGER DEFAULT 0,
    "total_completed" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Leads enrolled in outreach sequences with state
CREATE TABLE IF NOT EXISTS public.sequence_leads (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "sequence_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "current_node_id" TEXT NOT NULL,
    "status" TEXT DEFAULT 'active'::text NOT NULL,
    "entered_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "next_action_at" TIMESTAMPTZ,
    "path_history" JSONB DEFAULT '[]'::jsonb,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Team performance challenges/competitions
CREATE TABLE IF NOT EXISTS public.team_challenges (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "account_id" UUID NOT NULL UNIQUE,
    "name" TEXT DEFAULT 'Team Challenge'::text NOT NULL,
    "goal_type" TEXT DEFAULT 'calls'::text NOT NULL,
    "goal_value" INTEGER DEFAULT 100 NOT NULL,
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "start_date" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "end_date" DATE,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Contact outreach progress tracked per team member
CREATE TABLE IF NOT EXISTS public.team_contact_progress (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "user_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "workflow_status" TEXT DEFAULT 'bereit_fuer_vernetzung'::text NOT NULL,
    "connection_sent_at" TIMESTAMPTZ,
    "connection_accepted_at" TIMESTAMPTZ,
    "first_message_sent_at" TIMESTAMPTZ,
    "fu1_sent_at" TIMESTAMPTZ,
    "fu2_sent_at" TIMESTAMPTZ,
    "fu3_sent_at" TIMESTAMPTZ,
    "responded_at" TIMESTAMPTZ,
    "positive_reply_at" TIMESTAMPTZ,
    "appointment_booked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Users assigned to campaigns
CREATE TABLE IF NOT EXISTS public.campaign_members (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "campaign_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT DEFAULT 'setter'::text NOT NULL,
    "joined_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Links between contacts and team members with outreach state
CREATE TABLE IF NOT EXISTS public.contact_member_links (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "contact_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "slug" TEXT,
    "personalized_url" TEXT,
    "video_url" TEXT,
    "video_status" TEXT DEFAULT 'pending'::text,
    "heygen_video_id" TEXT,
    "video_generated_at" TIMESTAMPTZ,
    "video_error" TEXT,
    "workflow_status" TEXT DEFAULT 'neu'::text,
    "connection_sent_at" TIMESTAMPTZ,
    "connection_accepted_at" TIMESTAMPTZ,
    "first_message_sent_at" TIMESTAMPTZ,
    "fu1_sent_at" TIMESTAMPTZ,
    "fu2_sent_at" TIMESTAMPTZ,
    "fu3_sent_at" TIMESTAMPTZ,
    "outreach_message" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Custom domain configurations per account
CREATE TABLE IF NOT EXISTS public.custom_domains (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "account_id" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "status" TEXT DEFAULT 'pending_dns'::text NOT NULL CHECK (status = ANY (ARRAY['pending_dns'::text, 'dns_verified'::text, 'ssl_active'::text, 'error'::text])),
    "verified" BOOLEAN DEFAULT false NOT NULL,
    "ssl_active" BOOLEAN DEFAULT false NOT NULL,
    "verified_at" TIMESTAMPTZ,
    "ssl_activated_at" TIMESTAMPTZ,
    "last_checked_at" TIMESTAMPTZ,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Feature flag access control per account
CREATE TABLE IF NOT EXISTS public.feature_access (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "account_id" UUID,
    "feature" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT false,
    "activated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY ("id")
);

-- AI assistant chat message history
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id" UUID,
    "user_id" UUID,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY ("id")
);

-- -----------------------------------------------------------------------------
-- Foreign Key Constraints
-- (Added after all tables are created to handle circular references)
-- -----------------------------------------------------------------------------

-- Foreign keys for tenants
ALTER TABLE public.tenants
    ADD CONSTRAINT IF NOT EXISTS "tenants_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES auth.users ("id");

-- Foreign keys for profiles
ALTER TABLE public.profiles
    ADD CONSTRAINT IF NOT EXISTS "profiles_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");
ALTER TABLE public.profiles
    ADD CONSTRAINT IF NOT EXISTS "profiles_id_fkey"
    FOREIGN KEY ("id") REFERENCES auth.users ("id");

-- Foreign keys for companies
ALTER TABLE public.companies
    ADD CONSTRAINT IF NOT EXISTS "companies_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");
ALTER TABLE public.companies
    ADD CONSTRAINT IF NOT EXISTS "companies_owner_user_id_fkey"
    FOREIGN KEY ("owner_user_id") REFERENCES auth.users ("id");

-- Foreign keys for campaigns
ALTER TABLE public.campaigns
    ADD CONSTRAINT IF NOT EXISTS "campaigns_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");
ALTER TABLE public.campaigns
    ADD CONSTRAINT IF NOT EXISTS "campaigns_landing_page_id_fkey"
    FOREIGN KEY ("landing_page_id") REFERENCES public.landing_pages ("id");

-- Foreign keys for landing_pages
ALTER TABLE public.landing_pages
    ADD CONSTRAINT IF NOT EXISTS "landing_pages_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");

-- Foreign keys for contacts
ALTER TABLE public.contacts
    ADD CONSTRAINT IF NOT EXISTS "contacts_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");
ALTER TABLE public.contacts
    ADD CONSTRAINT IF NOT EXISTS "contacts_campaign_id_fkey"
    FOREIGN KEY ("campaign_id") REFERENCES public.campaigns ("id");
ALTER TABLE public.contacts
    ADD CONSTRAINT IF NOT EXISTS "contacts_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES public.companies ("id");
ALTER TABLE public.contacts
    ADD CONSTRAINT IF NOT EXISTS "contacts_owner_user_id_fkey"
    FOREIGN KEY ("owner_user_id") REFERENCES public.profiles ("id");

-- Foreign keys for deals
ALTER TABLE public.deals
    ADD CONSTRAINT IF NOT EXISTS "deals_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");
ALTER TABLE public.deals
    ADD CONSTRAINT IF NOT EXISTS "deals_closer_id_fkey"
    FOREIGN KEY ("closer_id") REFERENCES public.profiles ("id");
ALTER TABLE public.deals
    ADD CONSTRAINT IF NOT EXISTS "deals_contact_id_fkey"
    FOREIGN KEY ("contact_id") REFERENCES public.contacts ("id");
ALTER TABLE public.deals
    ADD CONSTRAINT IF NOT EXISTS "deals_setter_id_fkey"
    FOREIGN KEY ("setter_id") REFERENCES public.profiles ("id");

-- Foreign keys for activities
ALTER TABLE public.activities
    ADD CONSTRAINT IF NOT EXISTS "activities_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");
ALTER TABLE public.activities
    ADD CONSTRAINT IF NOT EXISTS "activities_contact_id_fkey"
    FOREIGN KEY ("contact_id") REFERENCES public.contacts ("id");
ALTER TABLE public.activities
    ADD CONSTRAINT IF NOT EXISTS "activities_deal_id_fkey"
    FOREIGN KEY ("deal_id") REFERENCES public.deals ("id");
ALTER TABLE public.activities
    ADD CONSTRAINT IF NOT EXISTS "activities_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES public.profiles ("id");

-- Foreign keys for tasks
ALTER TABLE public.tasks
    ADD CONSTRAINT IF NOT EXISTS "tasks_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");
ALTER TABLE public.tasks
    ADD CONSTRAINT IF NOT EXISTS "tasks_assignee_id_fkey"
    FOREIGN KEY ("assignee_id") REFERENCES public.profiles ("id");

-- Foreign keys for benchmarks
ALTER TABLE public.benchmarks
    ADD CONSTRAINT IF NOT EXISTS "benchmarks_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES public.profiles ("id");

-- Foreign keys for subscriptions
ALTER TABLE public.subscriptions
    ADD CONSTRAINT IF NOT EXISTS "subscriptions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES auth.users ("id");

-- Foreign keys for api_keys
ALTER TABLE public.api_keys
    ADD CONSTRAINT IF NOT EXISTS "api_keys_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES auth.users ("id");

-- Foreign keys for call_sessions
ALTER TABLE public.call_sessions
    ADD CONSTRAINT IF NOT EXISTS "call_sessions_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");
ALTER TABLE public.call_sessions
    ADD CONSTRAINT IF NOT EXISTS "call_sessions_deal_id_fkey"
    FOREIGN KEY ("deal_id") REFERENCES public.deals ("id");

-- Foreign keys for lead_tracking_events
ALTER TABLE public.lead_tracking_events
    ADD CONSTRAINT IF NOT EXISTS "lead_tracking_events_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");
ALTER TABLE public.lead_tracking_events
    ADD CONSTRAINT IF NOT EXISTS "lead_tracking_events_contact_id_fkey"
    FOREIGN KEY ("contact_id") REFERENCES public.contacts ("id");

-- Foreign keys for followup_templates
ALTER TABLE public.followup_templates
    ADD CONSTRAINT IF NOT EXISTS "followup_templates_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");
ALTER TABLE public.followup_templates
    ADD CONSTRAINT IF NOT EXISTS "followup_templates_campaign_id_fkey"
    FOREIGN KEY ("campaign_id") REFERENCES public.campaigns ("id");

-- Foreign keys for account_integrations
ALTER TABLE public.account_integrations
    ADD CONSTRAINT IF NOT EXISTS "account_integrations_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");

-- Foreign keys for encrypted_api_keys
ALTER TABLE public.encrypted_api_keys
    ADD CONSTRAINT IF NOT EXISTS "encrypted_api_keys_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");

-- Foreign keys for user_roles
ALTER TABLE public.user_roles
    ADD CONSTRAINT IF NOT EXISTS "user_roles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES auth.users ("id");

-- Foreign keys for kpi_entries
ALTER TABLE public.kpi_entries
    ADD CONSTRAINT IF NOT EXISTS "kpi_entries_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES auth.users ("id");

-- Foreign keys for metrics_snapshot
ALTER TABLE public.metrics_snapshot
    ADD CONSTRAINT IF NOT EXISTS "metrics_snapshot_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES public.tenants ("id");

-- Foreign keys for health_scores
ALTER TABLE public.health_scores
    ADD CONSTRAINT IF NOT EXISTS "health_scores_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES public.tenants ("id");

-- Foreign keys for ai_summaries
ALTER TABLE public.ai_summaries
    ADD CONSTRAINT IF NOT EXISTS "ai_summaries_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES public.tenants ("id");

-- Foreign keys for csat_responses
ALTER TABLE public.csat_responses
    ADD CONSTRAINT IF NOT EXISTS "csat_responses_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES public.tenants ("id");

-- Foreign keys for alerts
ALTER TABLE public.alerts
    ADD CONSTRAINT IF NOT EXISTS "alerts_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES public.tenants ("id");

-- Foreign keys for fulfillment_tracking
ALTER TABLE public.fulfillment_tracking
    ADD CONSTRAINT IF NOT EXISTS "fulfillment_tracking_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES public.tenants ("id");

-- Foreign keys for financial_tracking
ALTER TABLE public.financial_tracking
    ADD CONSTRAINT IF NOT EXISTS "financial_tracking_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES public.tenants ("id");

-- Foreign keys for icp_customers
ALTER TABLE public.icp_customers
    ADD CONSTRAINT IF NOT EXISTS "icp_customers_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES public.tenants ("id");

-- Foreign keys for survey_responses
ALTER TABLE public.survey_responses
    ADD CONSTRAINT IF NOT EXISTS "survey_responses_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES public.tenants ("id");

-- Foreign keys for webhook_log
ALTER TABLE public.webhook_log
    ADD CONSTRAINT IF NOT EXISTS "webhook_log_endpoint_id_fkey"
    FOREIGN KEY ("endpoint_id") REFERENCES public.webhook_endpoints ("id");

-- Foreign keys for generated_assets
ALTER TABLE public.generated_assets
    ADD CONSTRAINT IF NOT EXISTS "generated_assets_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES auth.users ("id");

-- Foreign keys for daily_tasks
ALTER TABLE public.daily_tasks
    ADD CONSTRAINT IF NOT EXISTS "daily_tasks_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES auth.users ("id");

-- Foreign keys for content_posts
ALTER TABLE public.content_posts
    ADD CONSTRAINT IF NOT EXISTS "content_posts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES auth.users ("id");

-- Foreign keys for invitations
ALTER TABLE public.invitations
    ADD CONSTRAINT IF NOT EXISTS "invitations_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");
ALTER TABLE public.invitations
    ADD CONSTRAINT IF NOT EXISTS "invitations_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES auth.users ("id");
ALTER TABLE public.invitations
    ADD CONSTRAINT IF NOT EXISTS "invitations_used_by_fkey"
    FOREIGN KEY ("used_by") REFERENCES auth.users ("id");

-- Foreign keys for email_templates
ALTER TABLE public.email_templates
    ADD CONSTRAINT IF NOT EXISTS "email_templates_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");

-- Foreign keys for email_logs
ALTER TABLE public.email_logs
    ADD CONSTRAINT IF NOT EXISTS "email_logs_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");
ALTER TABLE public.email_logs
    ADD CONSTRAINT IF NOT EXISTS "email_logs_contact_id_fkey"
    FOREIGN KEY ("contact_id") REFERENCES public.contacts ("id");
ALTER TABLE public.email_logs
    ADD CONSTRAINT IF NOT EXISTS "email_logs_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES public.email_templates ("id");

-- Foreign keys for email_tracking_events
ALTER TABLE public.email_tracking_events
    ADD CONSTRAINT IF NOT EXISTS "email_tracking_events_email_log_id_fkey"
    FOREIGN KEY ("email_log_id") REFERENCES public.email_logs ("id");

-- Foreign keys for email_campaigns
ALTER TABLE public.email_campaigns
    ADD CONSTRAINT IF NOT EXISTS "email_campaigns_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");

-- Foreign keys for email_campaign_steps
ALTER TABLE public.email_campaign_steps
    ADD CONSTRAINT IF NOT EXISTS "email_campaign_steps_campaign_id_fkey"
    FOREIGN KEY ("campaign_id") REFERENCES public.email_campaigns ("id");

-- Foreign keys for email_campaign_leads
ALTER TABLE public.email_campaign_leads
    ADD CONSTRAINT IF NOT EXISTS "email_campaign_leads_campaign_id_fkey"
    FOREIGN KEY ("campaign_id") REFERENCES public.email_campaigns ("id");
ALTER TABLE public.email_campaign_leads
    ADD CONSTRAINT IF NOT EXISTS "email_campaign_leads_contact_id_fkey"
    FOREIGN KEY ("contact_id") REFERENCES public.contacts ("id");

-- Foreign keys for enrichment_credits
ALTER TABLE public.enrichment_credits
    ADD CONSTRAINT IF NOT EXISTS "enrichment_credits_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");

-- Foreign keys for credit_subscriptions
ALTER TABLE public.credit_subscriptions
    ADD CONSTRAINT IF NOT EXISTS "credit_subscriptions_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");

-- Foreign keys for lead_lists
ALTER TABLE public.lead_lists
    ADD CONSTRAINT IF NOT EXISTS "lead_lists_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");

-- Foreign keys for lead_list_items
ALTER TABLE public.lead_list_items
    ADD CONSTRAINT IF NOT EXISTS "lead_list_items_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");
ALTER TABLE public.lead_list_items
    ADD CONSTRAINT IF NOT EXISTS "lead_list_items_contact_id_fkey"
    FOREIGN KEY ("contact_id") REFERENCES public.contacts ("id");
ALTER TABLE public.lead_list_items
    ADD CONSTRAINT IF NOT EXISTS "lead_list_items_list_id_fkey"
    FOREIGN KEY ("list_id") REFERENCES public.lead_lists ("id");

-- Foreign keys for lead_page_templates
ALTER TABLE public.lead_page_templates
    ADD CONSTRAINT IF NOT EXISTS "lead_page_templates_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");

-- Foreign keys for account_phone_numbers
ALTER TABLE public.account_phone_numbers
    ADD CONSTRAINT IF NOT EXISTS "account_phone_numbers_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");

-- Foreign keys for account_team_members
ALTER TABLE public.account_team_members
    ADD CONSTRAINT IF NOT EXISTS "account_team_members_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");
ALTER TABLE public.account_team_members
    ADD CONSTRAINT IF NOT EXISTS "account_team_members_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES public.profiles ("id");

-- Foreign keys for telephony_webhook_events
ALTER TABLE public.telephony_webhook_events
    ADD CONSTRAINT IF NOT EXISTS "telephony_webhook_events_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");

-- Foreign keys for sequences
ALTER TABLE public.sequences
    ADD CONSTRAINT IF NOT EXISTS "sequences_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");

-- Foreign keys for sequence_leads
ALTER TABLE public.sequence_leads
    ADD CONSTRAINT IF NOT EXISTS "sequence_leads_contact_id_fkey"
    FOREIGN KEY ("contact_id") REFERENCES public.contacts ("id");
ALTER TABLE public.sequence_leads
    ADD CONSTRAINT IF NOT EXISTS "sequence_leads_sequence_id_fkey"
    FOREIGN KEY ("sequence_id") REFERENCES public.sequences ("id");

-- Foreign keys for team_challenges
ALTER TABLE public.team_challenges
    ADD CONSTRAINT IF NOT EXISTS "team_challenges_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");
ALTER TABLE public.team_challenges
    ADD CONSTRAINT IF NOT EXISTS "team_challenges_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES auth.users ("id");

-- Foreign keys for team_contact_progress
ALTER TABLE public.team_contact_progress
    ADD CONSTRAINT IF NOT EXISTS "team_contact_progress_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");
ALTER TABLE public.team_contact_progress
    ADD CONSTRAINT IF NOT EXISTS "team_contact_progress_contact_id_fkey"
    FOREIGN KEY ("contact_id") REFERENCES public.contacts ("id");
ALTER TABLE public.team_contact_progress
    ADD CONSTRAINT IF NOT EXISTS "team_contact_progress_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES public.profiles ("id");

-- Foreign keys for campaign_members
ALTER TABLE public.campaign_members
    ADD CONSTRAINT IF NOT EXISTS "campaign_members_campaign_id_fkey"
    FOREIGN KEY ("campaign_id") REFERENCES public.campaigns ("id");
ALTER TABLE public.campaign_members
    ADD CONSTRAINT IF NOT EXISTS "campaign_members_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES public.profiles ("id");

-- Foreign keys for contact_member_links
ALTER TABLE public.contact_member_links
    ADD CONSTRAINT IF NOT EXISTS "contact_member_links_campaign_id_fkey"
    FOREIGN KEY ("campaign_id") REFERENCES public.campaigns ("id");
ALTER TABLE public.contact_member_links
    ADD CONSTRAINT IF NOT EXISTS "contact_member_links_contact_id_fkey"
    FOREIGN KEY ("contact_id") REFERENCES public.contacts ("id");
ALTER TABLE public.contact_member_links
    ADD CONSTRAINT IF NOT EXISTS "contact_member_links_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES public.profiles ("id");

-- Foreign keys for custom_domains
ALTER TABLE public.custom_domains
    ADD CONSTRAINT IF NOT EXISTS "custom_domains_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");

-- Foreign keys for feature_access
ALTER TABLE public.feature_access
    ADD CONSTRAINT IF NOT EXISTS "feature_access_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES public.accounts ("id");

-- -----------------------------------------------------------------------------
-- Indexes (performance)
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON public.contacts ("account_id");
CREATE INDEX IF NOT EXISTS idx_contacts_owner_user_id ON public.contacts ("owner_user_id");
CREATE INDEX IF NOT EXISTS idx_contacts_campaign_id ON public.contacts ("campaign_id");
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON public.contacts ("company_id");
CREATE INDEX IF NOT EXISTS idx_contacts_slug ON public.contacts ("slug");
CREATE INDEX IF NOT EXISTS idx_contacts_workflow_status ON public.contacts ("workflow_status");
CREATE INDEX IF NOT EXISTS idx_contacts_outreach_status ON public.contacts ("outreach_status");
CREATE INDEX IF NOT EXISTS idx_deals_account_id ON public.deals ("account_id");
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON public.deals ("contact_id");
CREATE INDEX IF NOT EXISTS idx_deals_setter_id ON public.deals ("setter_id");
CREATE INDEX IF NOT EXISTS idx_deals_closer_id ON public.deals ("closer_id");
CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals ("stage");
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities ("user_id");
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON public.activities ("contact_id");
CREATE INDEX IF NOT EXISTS idx_activities_deal_id ON public.activities ("deal_id");
CREATE INDEX IF NOT EXISTS idx_activities_account_id ON public.activities ("account_id");
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON public.activities ("timestamp");
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks ("assignee_id");
CREATE INDEX IF NOT EXISTS idx_tasks_account_id ON public.tasks ("account_id");
CREATE INDEX IF NOT EXISTS idx_profiles_account_id ON public.profiles ("account_id");
CREATE INDEX IF NOT EXISTS idx_campaigns_account_id ON public.campaigns ("account_id");
CREATE INDEX IF NOT EXISTS idx_companies_account_id ON public.companies ("account_id");
CREATE INDEX IF NOT EXISTS idx_call_sessions_account_id ON public.call_sessions ("account_id");
CREATE INDEX IF NOT EXISTS idx_call_sessions_deal_id ON public.call_sessions ("deal_id");
CREATE INDEX IF NOT EXISTS idx_email_logs_account_id ON public.email_logs ("account_id");
CREATE INDEX IF NOT EXISTS idx_email_logs_contact_id ON public.email_logs ("contact_id");
CREATE INDEX IF NOT EXISTS idx_email_campaigns_account_id ON public.email_campaigns ("account_id");
CREATE INDEX IF NOT EXISTS idx_email_campaign_leads_campaign_id ON public.email_campaign_leads ("campaign_id");
CREATE INDEX IF NOT EXISTS idx_email_campaign_leads_contact_id ON public.email_campaign_leads ("contact_id");
CREATE INDEX IF NOT EXISTS idx_lead_list_items_list_id ON public.lead_list_items ("list_id");
CREATE INDEX IF NOT EXISTS idx_lead_list_items_contact_id ON public.lead_list_items ("contact_id");
CREATE INDEX IF NOT EXISTS idx_lead_list_items_account_id ON public.lead_list_items ("account_id");
CREATE INDEX IF NOT EXISTS idx_lead_lists_account_id ON public.lead_lists ("account_id");
CREATE INDEX IF NOT EXISTS idx_lead_tracking_events_contact_id ON public.lead_tracking_events ("contact_id");
CREATE INDEX IF NOT EXISTS idx_lead_tracking_events_account_id ON public.lead_tracking_events ("account_id");
CREATE INDEX IF NOT EXISTS idx_kpi_entries_user_id ON public.kpi_entries ("user_id");
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON public.tenants ("user_id");
CREATE INDEX IF NOT EXISTS idx_metrics_snapshot_tenant_id ON public.metrics_snapshot ("tenant_id");
CREATE INDEX IF NOT EXISTS idx_health_scores_tenant_id ON public.health_scores ("tenant_id");
CREATE INDEX IF NOT EXISTS idx_fulfillment_tracking_tenant_id ON public.fulfillment_tracking ("tenant_id");
CREATE INDEX IF NOT EXISTS idx_financial_tracking_tenant_id ON public.financial_tracking ("tenant_id");
CREATE INDEX IF NOT EXISTS idx_icp_customers_tenant_id ON public.icp_customers ("tenant_id");
CREATE INDEX IF NOT EXISTS idx_sequence_leads_sequence_id ON public.sequence_leads ("sequence_id");
CREATE INDEX IF NOT EXISTS idx_sequence_leads_contact_id ON public.sequence_leads ("contact_id");
CREATE INDEX IF NOT EXISTS idx_team_contact_progress_account_id ON public.team_contact_progress ("account_id");
CREATE INDEX IF NOT EXISTS idx_team_contact_progress_user_id ON public.team_contact_progress ("user_id");
CREATE INDEX IF NOT EXISTS idx_contact_member_links_contact_id ON public.contact_member_links ("contact_id");
CREATE INDEX IF NOT EXISTS idx_contact_member_links_user_id ON public.contact_member_links ("user_id");
CREATE INDEX IF NOT EXISTS idx_account_team_members_account_id ON public.account_team_members ("account_id");
CREATE INDEX IF NOT EXISTS idx_account_team_members_user_id ON public.account_team_members ("user_id");
CREATE INDEX IF NOT EXISTS idx_telephony_webhook_events_account_id ON public.telephony_webhook_events ("account_id");
CREATE INDEX IF NOT EXISTS idx_invitations_account_id ON public.invitations ("account_id");
CREATE INDEX IF NOT EXISTS idx_email_tracking_events_email_log_id ON public.email_tracking_events ("email_log_id");
CREATE INDEX IF NOT EXISTS idx_webhook_log_endpoint_id ON public.webhook_log ("endpoint_id");
CREATE INDEX IF NOT EXISTS idx_enrichment_credits_account_id ON public.enrichment_credits ("account_id");
CREATE INDEX IF NOT EXISTS idx_custom_domains_account_id ON public.custom_domains ("account_id");
CREATE INDEX IF NOT EXISTS idx_feature_access_account_id ON public.feature_access ("account_id");
CREATE INDEX IF NOT EXISTS idx_campaign_members_campaign_id ON public.campaign_members ("campaign_id");
CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON public.suppressed_emails ("email");
CREATE INDEX IF NOT EXISTS idx_account_integrations_account_id ON public.account_integrations ("account_id");
CREATE INDEX IF NOT EXISTS idx_encrypted_api_keys_account_id ON public.encrypted_api_keys ("account_id");

-- =============================================================================
-- End of migration 0001_initial_schema.sql
-- =============================================================================