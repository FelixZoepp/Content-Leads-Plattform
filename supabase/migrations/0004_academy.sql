-- CL-010: Akademie Schema (Kurse, Lektionen, Fortschritt)

CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  title text NOT NULL,
  description text,
  cover_image_url text,
  "order" integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  unlock_mode text NOT NULL DEFAULT 'sequential' CHECK (unlock_mode IN ('sequential', 'berater', 'paket', 'open')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'video' CHECK (type IN ('video', 'text', 'download', 'quiz')),
  content_url text,
  content_body text,
  "order" integer NOT NULL DEFAULT 0,
  duration_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lessons_course ON public.lessons(course_id, "order");

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  score integer,
  UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON public.lesson_progress(user_id);

-- RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published courses visible to all authenticated" ON public.courses
  FOR SELECT USING (is_published = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage courses" ON public.courses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_super_admin = true))
  );

CREATE POLICY "Lessons visible if course is published" ON public.lessons
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.courses WHERE courses.id = course_id AND courses.is_published = true)
  );

CREATE POLICY "Admins can manage lessons" ON public.lessons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_super_admin = true))
  );

CREATE POLICY "Users can read own progress" ON public.lesson_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own progress" ON public.lesson_progress
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins and advisors can read all progress" ON public.lesson_progress
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'advisor'))
  );
