import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, PlayCircle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  sort_order: number | null;
}

interface CourseWithProgress extends Course {
  totalLessons: number;
  completedLessons: number;
  progressPct: number;
}

export default function AcademyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchCourses();
  }, [user]);

  async function fetchCourses() {
    setLoading(true);
    try {
      // Fetch published courses
      const { data: coursesData, error: coursesError } = await (supabase as any)
        .from("courses")
        .select("id, title, description, cover_image_url, sort_order")
        .eq("published", true)
        .order("sort_order", { ascending: true });

      if (coursesError || !coursesData) {
        setCourses([]);
        return;
      }

      // Fetch all lessons for these courses
      const courseIds = coursesData.map((c: Course) => c.id);

      const { data: lessonsData } = await (supabase as any)
        .from("lessons")
        .select("id, course_id")
        .in("course_id", courseIds);

      // Fetch completed lessons for user
      const lessonIds = (lessonsData ?? []).map((l: any) => l.id);

      const { data: progressData } = lessonIds.length > 0
        ? await (supabase as any)
            .from("lesson_progress")
            .select("lesson_id")
            .eq("user_id", user!.id)
            .eq("completed", true)
            .in("lesson_id", lessonIds)
        : { data: [] };

      const completedSet = new Set((progressData ?? []).map((p: any) => p.lesson_id));

      const withProgress: CourseWithProgress[] = coursesData.map((course: Course) => {
        const courseLessons = (lessonsData ?? []).filter((l: any) => l.course_id === course.id);
        const total = courseLessons.length;
        const completed = courseLessons.filter((l: any) => completedSet.has(l.id)).length;
        return {
          ...course,
          totalLessons: total,
          completedLessons: completed,
          progressPct: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      });

      setCourses(withProgress);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="glass-panel fade-up">
        <div className="relative z-[2]">
          <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">
            Academy
          </span>
          <h1 className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>
            Deine Kurse
          </h1>
          <p className="text-[13px] text-[rgba(249,249,249,0.5)] mt-1">
            {loading ? "Lädt…" : `${courses.length} Kurs${courses.length !== 1 ? "e" : ""} verfügbar`}
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && courses.length === 0 && (
        <div className="glass-panel fade-up text-center py-12">
          <div className="relative z-[2]">
            <BookOpen className="w-10 h-10 text-[rgba(249,249,249,0.2)] mx-auto mb-3" />
            <p className="text-[14px] text-[rgba(249,249,249,0.4)]">
              Noch keine Kurse verfügbar
            </p>
          </div>
        </div>
      )}

      {/* Course Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course, i) => (
            <button
              key={course.id}
              onClick={() => navigate(`/dashboard/training/${course.id}`)}
              className="glass-panel fade-up text-left group cursor-pointer w-full"
              style={{ animationDelay: `${i * 60}ms`, padding: 0 }}
            >
              {/* Cover image */}
              {course.cover_image_url ? (
                <div className="relative overflow-hidden rounded-t-xl" style={{ height: 160 }}>
                  <img
                    src={course.cover_image_url}
                    alt={course.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(to bottom, transparent 40%, rgba(10,11,11,0.85))",
                    }}
                  />
                </div>
              ) : (
                <div
                  className="rounded-t-xl flex items-center justify-center"
                  style={{
                    height: 160,
                    background: "linear-gradient(135deg, rgba(197,160,89,0.1), rgba(119,90,25,0.05))",
                    borderBottom: "1px solid rgba(249,249,249,0.06)",
                  }}
                >
                  <BookOpen className="w-12 h-12 text-[rgba(197,160,89,0.3)]" />
                </div>
              )}

              {/* Content */}
              <div className="relative z-[2] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[15px] font-semibold text-white leading-snug">
                      {course.title}
                    </h2>
                    {course.description && (
                      <p className="text-[12px] text-[rgba(249,249,249,0.45)] mt-1 line-clamp-2">
                        {course.description}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-[rgba(249,249,249,0.3)] flex-shrink-0 mt-0.5 transition-transform group-hover:translate-x-1" />
                </div>

                {/* Progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-[rgba(249,249,249,0.4)]">
                      {course.completedLessons}/{course.totalLessons} Lektionen
                    </span>
                    <span className="text-[11px] text-[#E9CB8B]">
                      {course.progressPct}%
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: "rgba(249,249,249,0.06)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${course.progressPct}%`,
                        background: course.progressPct === 100
                          ? "linear-gradient(90deg, #3a7d5a, #7FC29B)"
                          : "linear-gradient(90deg, #775A19, #C5A059)",
                        boxShadow: course.progressPct > 0 ? "0 0 8px rgba(197,160,89,0.35)" : "none",
                      }}
                    />
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <PlayCircle className="w-3.5 h-3.5 text-[#E9CB8B]" />
                  <span className="text-[11px] text-[#E9CB8B]">
                    {course.completedLessons === 0 ? "Starten" : course.progressPct === 100 ? "Wiederholen" : "Fortsetzen"}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
