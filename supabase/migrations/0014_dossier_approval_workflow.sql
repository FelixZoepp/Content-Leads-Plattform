-- CL-121 + CL-122: Dossier Approval Workflow & Conflict Detection
-- Adds version tracking to dossiers and conflict_with to dossier_fields.

DO $$
BEGIN
  -- dossiers.version
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dossiers') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dossiers' AND column_name = 'version') THEN
      ALTER TABLE public.dossiers ADD COLUMN version integer NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dossiers' AND column_name = 'parent_dossier_id') THEN
      ALTER TABLE public.dossiers ADD COLUMN parent_dossier_id uuid REFERENCES public.dossiers(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- dossier_fields.conflict_with
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dossier_fields') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dossier_fields' AND column_name = 'conflict_with') THEN
      ALTER TABLE public.dossier_fields ADD COLUMN conflict_with uuid REFERENCES public.dossier_fields(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;
