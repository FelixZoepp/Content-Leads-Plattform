-- CL-015: Prompt-Registry + AI-Usage-Logging
-- Versionierte Prompt-Templates, ohne Deploy änderbar
-- Cost-Tracking pro Kunde und Modell

CREATE TABLE IF NOT EXISTS public.prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  version integer NOT NULL DEFAULT 1,
  system_prompt text NOT NULL,
  user_prompt_template text NOT NULL,
  model text NOT NULL DEFAULT 'claude-sonnet-4-5-20241022',
  temperature numeric(3,2) NOT NULL DEFAULT 0.7,
  max_tokens integer NOT NULL DEFAULT 2048,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Keep old versions
CREATE TABLE IF NOT EXISTS public.prompt_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.prompt_templates(id) ON DELETE CASCADE,
  version integer NOT NULL,
  system_prompt text NOT NULL,
  user_prompt_template text NOT NULL,
  model text NOT NULL,
  temperature numeric(3,2) NOT NULL,
  max_tokens integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_template ON public.prompt_template_versions(template_id, version DESC);

-- AI usage/cost tracking
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  user_id uuid REFERENCES auth.users(id),
  prompt_template_id uuid REFERENCES public.prompt_templates(id),
  prompt_name text,
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cost_cents numeric(10,4) NOT NULL DEFAULT 0,
  duration_ms integer,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_org ON public.ai_usage_log(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON public.ai_usage_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_template ON public.ai_usage_log(prompt_template_id);

-- RLS
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Prompts: admins can CRUD, everyone can read active
CREATE POLICY "Anyone can read active prompts" ON public.prompt_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage prompts" ON public.prompt_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.is_super_admin = true)
    )
  );

CREATE POLICY "Anyone can read prompt versions" ON public.prompt_template_versions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage prompt versions" ON public.prompt_template_versions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.is_super_admin = true)
    )
  );

-- AI usage: admins see all, users see own
CREATE POLICY "Users can read own AI usage" ON public.ai_usage_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can read all AI usage" ON public.ai_usage_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.is_super_admin = true)
    )
  );

-- Service role inserts usage logs
CREATE POLICY "Service can insert AI usage" ON public.ai_usage_log
  FOR INSERT WITH CHECK (true);

-- Auto-version on prompt update
CREATE OR REPLACE FUNCTION public.version_prompt_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.system_prompt IS DISTINCT FROM NEW.system_prompt
     OR OLD.user_prompt_template IS DISTINCT FROM NEW.user_prompt_template
     OR OLD.model IS DISTINCT FROM NEW.model THEN
    INSERT INTO public.prompt_template_versions (template_id, version, system_prompt, user_prompt_template, model, temperature, max_tokens)
    VALUES (OLD.id, OLD.version, OLD.system_prompt, OLD.user_prompt_template, OLD.model, OLD.temperature, OLD.max_tokens);
    NEW.version := OLD.version + 1;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prompt_versioning
  BEFORE UPDATE ON public.prompt_templates
  FOR EACH ROW EXECUTE FUNCTION public.version_prompt_on_update();

-- Seed initial prompts for Content-Leads
INSERT INTO public.prompt_templates (name, description, system_prompt, user_prompt_template, model, temperature, max_tokens)
VALUES
  ('ai_chat', 'Allgemeiner Content-Leads KI-Assistent',
   'Du bist der Content-Leads KI-Assistent. Du hilfst Kunden bei Fragen zu LinkedIn-Marketing, Content-Erstellung und Lead-Generierung. Antworte immer auf Deutsch, professionell aber freundlich. Verwende keine Emojis.',
   '{{message}}',
   'claude-sonnet-4-5-20241022', 0.7, 2048),

  ('tone_of_voice_interview', 'Tone-of-Voice Profil-Interview',
   'Du führst ein strukturiertes Interview, um das Tone-of-Voice-Profil eines LinkedIn-Nutzers zu erstellen. Stelle nacheinander Fragen zu: 1) Zielgruppe, 2) Tonalität (formell/locker), 3) Kernthemen, 4) No-Go-Themen, 5) Beispiel-Posts die gefallen, 6) Kommunikationsstil. Fasse am Ende alles als strukturiertes Profil zusammen.',
   '{{message}}',
   'claude-sonnet-4-5-20241022', 0.6, 3000),

  ('lead_post_generator', 'LinkedIn Lead-Post Generator',
   'Du erstellst LinkedIn Lead-Posts, die Aufmerksamkeit erregen und Leads generieren. Nutze das Tone-of-Voice-Profil des Nutzers. Erstelle immer: 1) Einen starken Hook (erste Zeile), 2) Den Haupttext, 3) Einen Call-to-Action. Biete 2-3 Varianten an.

Tone-of-Voice-Profil:
{{tov_profile}}',
   'Thema: {{topic}}\nZielgruppe: {{audience}}\nZiel: {{goal}}',
   'claude-sonnet-4-5-20241022', 0.8, 3000),

  ('content_post_generator', 'LinkedIn Content-Post Generator',
   'Du erstellst LinkedIn Content-Posts, die Mehrwert bieten und Expertise zeigen. Nutze das Tone-of-Voice-Profil des Nutzers. Strukturiere den Post klar mit Hook, Story/Insight, Takeaway.

Tone-of-Voice-Profil:
{{tov_profile}}',
   'Thema: {{topic}}\nContent-Säule: {{pillar}}\nFormat: {{format}}',
   'claude-sonnet-4-5-20241022', 0.8, 3000),

  ('sales_script_generator', 'Sales-Skript Generator',
   'Du erstellst Vertriebs-Skripte für telefonische oder LinkedIn-Akquise. Berücksichtige Zielgruppe, Angebot und Kanal. Erstelle 2-3 Varianten mit unterschiedlichem Einstieg. Jedes Skript enthält: Eröffnung, Bedarfsermittlung, Pitch, Einwandbehandlung, Abschluss.',
   'Zielgruppe: {{audience}}\nAngebot: {{offer}}\nKanal: {{channel}}\nPreis: {{price}}',
   'claude-sonnet-4-5-20241022', 0.7, 4000),

  ('profile_optimization', 'LinkedIn-Profiloptimierung (Coaching)',
   'Du analysierst LinkedIn-Profile und gibst strukturierte Optimierungsvorschläge. Gehe Sektion für Sektion durch: 1) Headline, 2) About/Info, 3) Erfahrung, 4) Featured/Hervorgehoben, 5) Banner-Bild, 6) Skills/Kompetenzen. Pro Sektion: Ist-Zustand bewerten, konkreten Verbesserungsvorschlag machen, Begründung geben.',
   'LinkedIn-Profil:\n{{profile_text}}\n\nZielgruppe: {{audience}}\nZiel: {{goal}}',
   'claude-sonnet-4-5-20241022', 0.6, 4000),

  ('health_analysis', 'Kunden-Gesundheitsanalyse',
   'Du analysierst Kundendaten und bewertest die Zufriedenheit/Gesundheit eines Kunden. Berücksichtige: Kennzahlen-Entwicklung, Akademie-Nutzung, Checklisten-Fortschritt, Umfrage-Antworten. Gib eine Ampel-Bewertung (grün/gelb/rot) mit Begründung. Jede Aussage muss auf konkrete Datenpunkte verweisen.',
   'Kundendaten:\n{{customer_data}}',
   'claude-sonnet-4-5-20241022', 0.4, 3000),

  ('upsell_analysis', 'Upsell-Signal-Erkennung',
   'Du analysierst Kundendaten auf Upsell-Potenzial. Identifiziere: 1) Ob ein Upsell-Signal vorliegt (ja/nein), 2) Konkreten Aufhänger, 3) Empfohlenes Angebot, 4) Gegenanzeige (warum NICHT upsellen). Jede Aussage mit Datenpunkt belegen. Sei konservativ — lieber kein Signal als ein falsches.',
   'Kundendaten:\n{{customer_data}}\nVerfügbare Angebote:\n{{offers}}',
   'claude-sonnet-4-5-20241022', 0.3, 2000)
ON CONFLICT (name) DO NOTHING;
