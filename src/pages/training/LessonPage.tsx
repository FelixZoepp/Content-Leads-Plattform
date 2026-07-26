import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  content_type: string | null;
  video_url: string | null;
  content_html: string | null;
  download_url: string | null;
  download_label: string | null;
  sort_order: number;
}

export default function LessonPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [completed, setCompleted] = useState(false);
  const [marking, setMarking] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !courseId || !lessonId) return;
    fetchData();
  }, [user, courseId, lessonId]);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch this lesson
      const { data: lessonData } = await (supabase as any)
        .from("lessons")
        .select(
          "id, title, description, content_type, video_url, content_html, download_url, download_label, sort_order"
        )
        .eq("id", lessonId)
        .maybeSingle();

      if (!lessonData) {
        navigate(`/dashboard/training/${courseId}`);
        return;
      }
      setLesson(lessonData);

      // Fetch all lessons in course for prev/next navigation
      const { data: allData } = await (supabase as any)
        .from("lessons")
        .select("id, title, description, content_type, video_url, content_html, download_url, download_label, sort_order")
        .eq("course_id", courseId)
        .order("sort_order", { ascending: true });

      setAllLessons(allData ?? []);

      // Check if already completed
      const { data: progressData } = await (supabase as any)
        .from("lesson_progress")
        .select("id")
        .eq("user_id", user!.id)
        .eq("lesson_id", lessonId)
        .eq("completed", true)
        .maybeSingle();

      setCompleted(!!progressData);
    } finally {
      setLoading(false);
    }
  }

  async function markCompleted() {
    if (!user || !lessonId || completed || marking) return;
    setMarking(true);
    try {
      await (supabase as any).from("lesson_progress").upsert(
        {
          user_id: user.id,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_id" }
      );
      setCompleted(true);
    } finally {
      setMarking(false);
    }
  }

  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < allLessons.length - 1
      ? allLessons[currentIndex + 1]
      : null;

  function getVideoEmbedUrl(url: string): string {
    // YouTube
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
    );
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    // Return as-is (direct embed URL)
    return url;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Back to course */}
      <button
        onClick={() => navigate(`/dashboard/training/${courseId}`)}
        className="flex items-center gap-2 text-[12px] text-[rgba(249,249,249,0.4)] hover:text-[rgba(249,249,249,0.8)] transition-colors fade-up"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Zurück zum Kurs
      </button>

      {/* Lesson header */}
      <div className="glass-panel fade-up">
        <div className="relative z-[2]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">
                Lektion {currentIndex + 1} von {allLessons.length}
              </span>
              <h1
                className="text-xl text-white leading-snug"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {lesson.title}
              </h1>
              {lesson.description && (
                <p className="text-[13px] text-[rgba(249,249,249,0.5)] mt-1">
                  {lesson.description}
                </p>
              )}
            </div>
            {completed && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-[#7FC29B]" />
                <span className="text-[12px] text-[#7FC29B]">Abgeschlossen</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video player */}
      {lesson.content_type === "video" && lesson.video_url && (
        <div className="glass-panel fade-up overflow-hidden" style={{ padding: 0 }}>
          <div className="relative" style={{ paddingTop: "56.25%" /* 16:9 */ }}>
            <iframe
              src={getVideoEmbedUrl(lesson.video_url)}
              title={lesson.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
              style={{ border: "none" }}
            />
          </div>
        </div>
      )}

      {/* HTML / Markdown content */}
      {lesson.content_html && (
        <div className="glass-panel fade-up">
          <div
            className="relative z-[2] prose prose-invert max-w-none"
            style={{
              color: "rgba(249,249,249,0.8)",
              fontSize: "14px",
              lineHeight: "1.75",
            }}
            dangerouslySetInnerHTML={{ __html: lesson.content_html }}
          />
        </div>
      )}

      {/* Download */}
      {lesson.content_type === "download" && lesson.download_url && (
        <div className="glass-panel fade-up">
          <div className="relative z-[2] flex items-center justify-between">
            <div>
              <p className="text-[13px] text-white font-medium">
                {lesson.download_label ?? "Datei herunterladen"}
              </p>
              <p className="text-[11px] text-[rgba(249,249,249,0.4)] mt-0.5">
                Klicke auf den Button, um die Datei zu speichern
              </p>
            </div>
            <a
              href={lesson.download_url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
              style={{
                background: "linear-gradient(135deg, rgba(197,160,89,0.2), rgba(119,90,25,0.1))",
                border: "1px solid rgba(197,160,89,0.3)",
                color: "#E9CB8B",
              }}
            >
              <Download className="w-4 h-4" />
              Herunterladen
            </a>
          </div>
        </div>
      )}

      {/* Mark as completed */}
      <div className="glass-panel fade-up">
        <div className="relative z-[2] flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] text-white font-medium">
              {completed ? "Du hast diese Lektion abgeschlossen" : "Lektion abschließen"}
            </p>
            <p className="text-[11px] text-[rgba(249,249,249,0.4)] mt-0.5">
              {completed
                ? "Gut gemacht! Du kannst zur nächsten Lektion weitergehen."
                : "Markiere die Lektion als abgeschlossen, um weiterzukommen."}
            </p>
          </div>
          <button
            disabled={completed || marking}
            onClick={markCompleted}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
            style={
              completed
                ? {
                    background: "rgba(127,194,155,0.12)",
                    border: "1px solid rgba(127,194,155,0.25)",
                    color: "#7FC29B",
                  }
                : {
                    background: "linear-gradient(135deg, #C5A059, #775A19)",
                    border: "1px solid rgba(197,160,89,0.4)",
                    color: "#fff",
                    boxShadow: "0 0 16px rgba(197,160,89,0.25)",
                  }
            }
          >
            {marking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : completed ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : null}
            {completed ? "Abgeschlossen" : "Als abgeschlossen markieren"}
          </button>
        </div>
      </div>

      {/* Navigation: Prev / Next */}
      <div className="flex items-center justify-between gap-3 fade-up pb-6">
        {prevLesson ? (
          <button
            onClick={() => navigate(`/dashboard/training/${courseId}/${prevLesson.id}`)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] transition-all group"
            style={{
              background: "rgba(249,249,249,0.04)",
              border: "1px solid rgba(249,249,249,0.08)",
              color: "rgba(249,249,249,0.6)",
            }}
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline truncate max-w-[140px]">{prevLesson.title}</span>
            <span className="sm:hidden">Zurück</span>
          </button>
        ) : (
          <div />
        )}

        {nextLesson ? (
          <button
            onClick={() => navigate(`/dashboard/training/${courseId}/${nextLesson.id}`)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all group ml-auto"
            style={{
              background: completed
                ? "linear-gradient(135deg, rgba(197,160,89,0.18), rgba(119,90,25,0.08))"
                : "rgba(249,249,249,0.04)",
              border: `1px solid ${completed ? "rgba(197,160,89,0.3)" : "rgba(249,249,249,0.08)"}`,
              color: completed ? "#E9CB8B" : "rgba(249,249,249,0.4)",
            }}
          >
            <span className="hidden sm:inline truncate max-w-[140px]">{nextLesson.title}</span>
            <span className="sm:hidden">Weiter</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        ) : completed ? (
          <button
            onClick={() => navigate(`/dashboard/training/${courseId}`)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all ml-auto"
            style={{
              background: "linear-gradient(135deg, rgba(127,194,155,0.18), rgba(58,125,90,0.08))",
              border: "1px solid rgba(127,194,155,0.3)",
              color: "#7FC29B",
            }}
          >
            <CheckCircle2 className="w-4 h-4" />
            Kurs abgeschlossen
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
