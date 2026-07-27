-- CL-118 + CL-119: Recordings, Transcripts, and Dossier Pipeline
-- recordings: audio files uploaded by advisors with consent
-- transcripts: Whisper transcriptions
-- dossier_fields/dossiers completeness_score column added

-- ── recordings ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.recordings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  advisor_user_id  uuid NOT NULL REFERENCES auth.users(id),
  storage_url   text NOT NULL,
  duration_sec  integer,
  mime_type     text,
  status        text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'processing', 'transcribed', 'deleted')),
  consent_given_at timestamptz NOT NULL,
  consent_text     text NOT NULL,
  deleted_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recordings_customer ON public.recordings(customer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recordings_advisor  ON public.recordings(advisor_user_id);

-- ── transcripts ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.transcripts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id  uuid NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  customer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_text     text NOT NULL,
  model         text NOT NULL DEFAULT 'whisper-1',
  language      text NOT NULL DEFAULT 'de',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transcripts_recording ON public.transcripts(recording_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_customer  ON public.transcripts(customer_user_id);

-- ── dossier completeness_score ────────────────────────────────────────────────
-- Only add the column if the dossiers table exists and the column is missing.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dossiers') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dossiers' AND column_name = 'completeness_score') THEN
      ALTER TABLE public.dossiers ADD COLUMN completeness_score integer NOT NULL DEFAULT 0;
    END IF;
  END IF;
END $$;

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

-- Recordings: advisors can manage recordings they created; admins full access
CREATE POLICY "Advisors manage own recordings" ON public.recordings
  FOR ALL USING (
    advisor_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.is_super_admin = true)
    )
  );

-- Transcripts: follow recording access
CREATE POLICY "Transcripts follow recording access" ON public.transcripts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.recordings r
      WHERE r.id = recording_id
        AND (
          r.advisor_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND (profiles.role = 'admin' OR profiles.is_super_admin = true)
          )
        )
    )
  );
