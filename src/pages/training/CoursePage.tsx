import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Circle, Lock, ArrowLeft, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Course {
  id: string;
  title: string;
  description: string | null;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  content_type: string | null;
}

interface LessonWithStatus extends Lesson {
  completed: boolean;
  unlocked: boolean;
}

export default function CoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<LessonWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !courseId) return;
    fetchData();
  }, [user, courseId]);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch course
      const { data: courseData } = await (supabase as any)
        .from("courses")
        .select("id, title, description")
        .eq("id", courseId)
        .maybeSingle();

      if (!courseData) {
        navigate("/dashboard/training");
        return;
      }
      setCourse(courseData);

      // Fetch lessons ordered
      const { data: lessonsData } = await (supabase as any)
        .from("lessons")
        .select("id, title, description, sort_order, content_type")
        .eq("course_id", courseId)
        .order("sort_order", { ascending: true });

      const lessonList: Lesson[] = lessonsData ?? [];

      // Fetch progress
      const lessonIds = lessonList.map((l) => l.id);
      const { data: progressData } = lessonIds.length > 0
        ? await (supabase as any)
            .from("lesson_progress")
            .select("lesson_id")
            .eq("user_id", user!.id)
            .eq("completed", true)
            .in("lesson_id", lessonIds)
        : { data: [] };

      const completedSet = new Set((progressData ?? []).map((p: any) => p.lesson_id));

      // Sequential unlock: lesson 0 always unlocked; lesson N unlocked if lesson N-1 completed
      const withStatus: LessonWithStatus[] = lessonList.map((lesson, idx) => {
        const completed = completedSet.has(lesson.id);
        const unlocked = idx === 0 || completedSet.has(lessonList[idx - 1].id);
        return { ...lesson, completed, unlocked };
      });

      setLessons(withStatus);
    } finally {
      setLoading(false);
    }
  }

  const completedCount = lessons.filter((l) => l.completed).length;
  const progressPct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  function contentTypeLabel(type: string | null) {
    if (type === "video") return "Video";
    if (type === "text") return "Text";
    if (type === "download") return "Download";
    return "Lektion";
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <button
        onClick={() => navigate("/dashboard/training")}
        className="flex items-center gap-2 text-[12px] text-[rgba(249,249,249,0.4)] hover:text-[rgba(249,249,249,0.8)] transition-colors fade-up"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Alle Kurse
      </button>

      {/* Header */}
      {loading ? (
        <div className="glass-panel fade-up">
          <div className="relative z-[2] h-10 flex items-center">
            <div className="w-6 h-6 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      ) : course && (
        <div className="glass-panel fade-up">
          <div className="relative z-[2]">
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">
              Kurs
            </span>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>
                  {course.title}
                </h1>
                {course.description && (
                  <p className="text-[13px] text-[rgba(249,249,249,0.5)] mt-1">
                    {course.description}
                  </p>
                )}
                <p className="text-[12px] text-[rgba(249,249,249,0.35)] mt-2">
                  {completedCount}/{lessons.length} Lektionen abgeschlossen
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <div
                  className="text-3xl text-white"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {progressPct}
                  <span className="text-lg text-[#E9CB8B]">%</span>
                </div>
                <div
                  className="w-24 h-1.5 rounded-full mt-2 overflow-hidden"
                  style={{ background: "rgba(249,249,249,0.06)" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progressPct}%`,
                      background: progressPct === 100
                        ? "linear-gradient(90deg, #3a7d5a, #7FC29B)"
                        : "linear-gradient(90deg, #775A19, #C5A059)",
                      boxShadow: "0 0 12px rgba(197,160,89,0.4)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lessons list */}
      {!loading && (
        <div className="space-y-2">
          {lessons.map((lesson, i) => (
            <button
              key={lesson.id}
              disabled={!lesson.unlocked}
              onClick={() => lesson.unlocked && navigate(`/dashboard/training/${courseId}/${lesson.id}`)}
              className={[
                "glass-panel fade-up w-full text-left group",
                lesson.unlocked ? "cursor-pointer" : "cursor-not-allowed opacity-50",
              ].join(" ")}
              style={{ animationDelay: `${i * 50}ms`, padding: "16px 20px" }}
            >
              <div className="relative z-[2] flex items-center gap-4">
                {/* Number badge */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] flex-shrink-0"
                  style={{
                    fontFamily: "var(--font-serif)",
                    background: lesson.completed
                      ? "rgba(127,194,155,0.12)"
                      : lesson.unlocked
                      ? "linear-gradient(135deg, rgba(197,160,89,0.15), rgba(119,90,25,0.08))"
                      : "rgba(249,249,249,0.03)",
                    border: `1px solid ${
                      lesson.completed
                        ? "rgba(127,194,155,0.25)"
                        : lesson.unlocked
                        ? "rgba(197,160,89,0.25)"
                        : "rgba(249,249,249,0.06)"
                    }`,
                    color: lesson.completed
                      ? "#7FC29B"
                      : lesson.unlocked
                      ? "#E9CB8B"
                      : "rgba(249,249,249,0.2)",
                  }}
                >
                  {i + 1}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-semibold text-white truncate">
                      {lesson.title}
                    </h3>
                    {lesson.content_type && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{
                          background: "rgba(249,249,249,0.06)",
                          color: "rgba(249,249,249,0.4)",
                          border: "1px solid rgba(249,249,249,0.08)",
                        }}
                      >
                        {contentTypeLabel(lesson.content_type)}
                      </span>
                    )}
                  </div>
                  {lesson.description && (
                    <p className="text-[12px] text-[rgba(249,249,249,0.4)] mt-0.5 truncate">
                      {lesson.description}
                    </p>
                  )}
                </div>

                {/* Status icon */}
                <div className="flex-shrink-0">
                  {lesson.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-[#7FC29B]" />
                  ) : !lesson.unlocked ? (
                    <Lock className="w-4 h-4 text-[rgba(249,249,249,0.2)]" />
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <PlayCircle className="w-5 h-5 text-[rgba(249,249,249,0.25)] group-hover:text-[#E9CB8B] transition-colors" />
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && lessons.length === 0 && (
        <div className="glass-panel fade-up text-center py-10">
          <div className="relative z-[2]">
            <p className="text-[13px] text-[rgba(249,249,249,0.4)]">
              Noch keine Lektionen in diesem Kurs
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
