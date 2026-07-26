import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, GripVertical, Pencil, Trash2, Eye, EyeOff,
  Video, FileText, Download, HelpCircle, Save, Loader2, ChevronDown, ChevronUp, X
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  order: number;
  is_published: boolean;
  unlock_mode: string;
  lessons?: Lesson[];
}

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  type: string;
  content_url: string | null;
  content_body: string | null;
  order: number;
  duration_minutes: number | null;
}

const TYPE_ICONS: Record<string, typeof Video> = { video: Video, text: FileText, download: Download, quiz: HelpCircle };
const UNLOCK_LABELS: Record<string, string> = { sequential: "Sequenziell", berater: "Berater-Freigabe", paket: "Nach Paket", open: "Offen" };

export default function AcademyCMS() {
  const nav = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);
  const [editingLesson, setEditingLesson] = useState<Partial<Lesson> | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadCourses(); }, []);

  async function loadCourses() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("courses")
      .select("*, lessons(*)")
      .order("order");
    const sorted = (data || []).map((c: any) => ({
      ...c,
      lessons: (c.lessons || []).sort((a: any, b: any) => a.order - b.order),
    }));
    setCourses(sorted);
    setLoading(false);
  }

  async function saveCourse() {
    if (!editingCourse?.title) return;
    setSaving(true);
    if (editingCourse.id) {
      await (supabase as any).from("courses").update({
        title: editingCourse.title,
        description: editingCourse.description,
        cover_image_url: editingCourse.cover_image_url,
        unlock_mode: editingCourse.unlock_mode || "sequential",
        is_published: editingCourse.is_published ?? false,
      }).eq("id", editingCourse.id);
    } else {
      const maxOrder = Math.max(0, ...courses.map(c => c.order));
      await (supabase as any).from("courses").insert({
        title: editingCourse.title,
        description: editingCourse.description,
        cover_image_url: editingCourse.cover_image_url,
        unlock_mode: editingCourse.unlock_mode || "sequential",
        is_published: editingCourse.is_published ?? false,
        order: maxOrder + 1,
      });
    }
    setEditingCourse(null);
    setSaving(false);
    await loadCourses();
  }

  async function deleteCourse(id: string) {
    if (!confirm("Kurs wirklich löschen? Alle Lektionen werden ebenfalls gelöscht.")) return;
    await (supabase as any).from("courses").delete().eq("id", id);
    await loadCourses();
  }

  async function togglePublish(course: Course) {
    await (supabase as any).from("courses").update({ is_published: !course.is_published }).eq("id", course.id);
    await loadCourses();
  }

  async function saveLesson() {
    if (!editingLesson?.title || !editingLesson.course_id) return;
    setSaving(true);
    if (editingLesson.id) {
      await (supabase as any).from("lessons").update({
        title: editingLesson.title,
        type: editingLesson.type || "video",
        content_url: editingLesson.content_url,
        content_body: editingLesson.content_body,
        duration_minutes: editingLesson.duration_minutes,
      }).eq("id", editingLesson.id);
    } else {
      const course = courses.find(c => c.id === editingLesson.course_id);
      const maxOrder = Math.max(0, ...(course?.lessons || []).map(l => l.order));
      await (supabase as any).from("lessons").insert({
        course_id: editingLesson.course_id,
        title: editingLesson.title,
        type: editingLesson.type || "video",
        content_url: editingLesson.content_url,
        content_body: editingLesson.content_body,
        duration_minutes: editingLesson.duration_minutes,
        order: maxOrder + 1,
      });
    }
    setEditingLesson(null);
    setSaving(false);
    await loadCourses();
  }

  async function deleteLesson(id: string) {
    if (!confirm("Lektion wirklich löschen?")) return;
    await (supabase as any).from("lessons").delete().eq("id", id);
    await loadCourses();
  }

  async function moveLesson(lessonId: string, courseId: string, direction: "up" | "down") {
    const course = courses.find(c => c.id === courseId);
    if (!course?.lessons) return;
    const idx = course.lessons.findIndex(l => l.id === lessonId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= course.lessons.length) return;
    const a = course.lessons[idx];
    const b = course.lessons[swapIdx];
    await Promise.all([
      (supabase as any).from("lessons").update({ order: b.order }).eq("id", a.id),
      (supabase as any).from("lessons").update({ order: a.order }).eq("id", b.id),
    ]);
    await loadCourses();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => nav("/dashboard/admin")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-2">
            <ArrowLeft className="w-4 h-4" /> Admin Dashboard
          </button>
          <h1 className="text-2xl font-bold text-white">Akademie verwalten</h1>
          <p className="text-sm text-gray-400 mt-1">{courses.length} Kurse, {courses.reduce((s, c) => s + (c.lessons?.length || 0), 0)} Lektionen</p>
        </div>
        <button
          onClick={() => setEditingCourse({ title: "", description: "", unlock_mode: "sequential", is_published: false })}
          className="flex items-center gap-2 px-4 py-2 bg-[#D4A22A] text-black font-medium rounded-lg hover:bg-[#B88B1F] transition-colors"
        >
          <Plus className="w-4 h-4" /> Neuer Kurs
        </button>
      </div>

      {/* Course List */}
      <div className="space-y-3">
        {courses.map(course => (
          <div key={course.id} className="bg-[#111827] border border-[#1E293B] rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <GripVertical className="w-4 h-4 text-gray-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-medium truncate">{course.title}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${course.is_published ? "bg-green-400/10 text-green-400" : "bg-gray-500/10 text-gray-500"}`}>
                    {course.is_published ? "Veröffentlicht" : "Entwurf"}
                  </span>
                  <span className="text-[10px] text-gray-500 bg-[#1A2235] px-2 py-0.5 rounded">
                    {UNLOCK_LABELS[course.unlock_mode] || course.unlock_mode}
                  </span>
                </div>
                {course.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{course.description}</p>}
              </div>
              <span className="text-xs text-gray-500">{course.lessons?.length || 0} Lektionen</span>
              <button onClick={() => togglePublish(course)} className="p-1.5 rounded hover:bg-[#1A2235] transition" title={course.is_published ? "Ausblenden" : "Veröffentlichen"}>
                {course.is_published ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
              </button>
              <button onClick={() => setEditingCourse(course)} className="p-1.5 rounded hover:bg-[#1A2235] transition">
                <Pencil className="w-4 h-4 text-gray-400" />
              </button>
              <button onClick={() => deleteCourse(course.id)} className="p-1.5 rounded hover:bg-red-500/10 transition">
                <Trash2 className="w-4 h-4 text-red-400/50 hover:text-red-400" />
              </button>
              <button onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)} className="p-1.5 rounded hover:bg-[#1A2235] transition">
                {expandedCourse === course.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
            </div>

            {expandedCourse === course.id && (
              <div className="border-t border-[#1E293B] p-4 pt-3 space-y-2">
                {(course.lessons || []).map((lesson, li) => {
                  const Icon = TYPE_ICONS[lesson.type] || FileText;
                  return (
                    <div key={lesson.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1A2235]/50">
                      <span className="text-xs text-gray-600 w-5 text-right">{li + 1}.</span>
                      <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm text-gray-300 flex-1 truncate">{lesson.title}</span>
                      {lesson.duration_minutes && <span className="text-xs text-gray-600">{lesson.duration_minutes} Min</span>}
                      <button onClick={() => moveLesson(lesson.id, course.id, "up")} disabled={li === 0} className="p-1 rounded hover:bg-[#1A2235] disabled:opacity-20">
                        <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <button onClick={() => moveLesson(lesson.id, course.id, "down")} disabled={li === (course.lessons?.length || 0) - 1} className="p-1 rounded hover:bg-[#1A2235] disabled:opacity-20">
                        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <button onClick={() => setEditingLesson(lesson)} className="p-1 rounded hover:bg-[#1A2235]">
                        <Pencil className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <button onClick={() => deleteLesson(lesson.id)} className="p-1 rounded hover:bg-red-500/10">
                        <Trash2 className="w-3.5 h-3.5 text-red-400/50" />
                      </button>
                    </div>
                  );
                })}
                <button
                  onClick={() => setEditingLesson({ course_id: course.id, title: "", type: "video" })}
                  className="flex items-center gap-2 text-sm text-[#D4A22A] hover:text-[#E9CB8B] transition px-3 py-2"
                >
                  <Plus className="w-4 h-4" /> Lektion hinzufügen
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Course Editor Modal */}
      {editingCourse && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setEditingCourse(null)}>
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{editingCourse.id ? "Kurs bearbeiten" : "Neuer Kurs"}</h2>
              <button onClick={() => setEditingCourse(null)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Titel</label>
              <input value={editingCourse.title || ""} onChange={e => setEditingCourse(c => c ? { ...c, title: e.target.value } : c)}
                className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm" placeholder="Kurs-Titel" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Beschreibung</label>
              <textarea value={editingCourse.description || ""} onChange={e => setEditingCourse(c => c ? { ...c, description: e.target.value } : c)}
                rows={3} className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm resize-y" placeholder="Kurze Beschreibung" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Cover-Bild URL</label>
              <input value={editingCourse.cover_image_url || ""} onChange={e => setEditingCourse(c => c ? { ...c, cover_image_url: e.target.value } : c)}
                className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm" placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Freischaltung</label>
                <select value={editingCourse.unlock_mode || "sequential"} onChange={e => setEditingCourse(c => c ? { ...c, unlock_mode: e.target.value } : c)}
                  className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm">
                  <option value="sequential">Sequenziell</option>
                  <option value="open">Offen</option>
                  <option value="berater">Berater-Freigabe</option>
                  <option value="paket">Nach Paket</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                  <input type="checkbox" checked={editingCourse.is_published ?? false} onChange={e => setEditingCourse(c => c ? { ...c, is_published: e.target.checked } : c)} className="rounded" />
                  Veröffentlicht
                </label>
              </div>
            </div>
            <button onClick={saveCourse} disabled={saving || !editingCourse.title}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D4A22A] text-black font-medium rounded-lg hover:bg-[#B88B1F] transition disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Speichern
            </button>
          </div>
        </div>
      )}

      {/* Lesson Editor Modal */}
      {editingLesson && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setEditingLesson(null)}>
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{editingLesson.id ? "Lektion bearbeiten" : "Neue Lektion"}</h2>
              <button onClick={() => setEditingLesson(null)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Titel</label>
              <input value={editingLesson.title || ""} onChange={e => setEditingLesson(l => l ? { ...l, title: e.target.value } : l)}
                className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm" placeholder="Lektions-Titel" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Typ</label>
                <select value={editingLesson.type || "video"} onChange={e => setEditingLesson(l => l ? { ...l, type: e.target.value } : l)}
                  className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm">
                  <option value="video">Video</option>
                  <option value="text">Text</option>
                  <option value="download">Download</option>
                  <option value="quiz">Quiz</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Dauer (Minuten)</label>
                <input type="number" value={editingLesson.duration_minutes || ""} onChange={e => setEditingLesson(l => l ? { ...l, duration_minutes: parseInt(e.target.value) || null } : l)}
                  className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm" placeholder="z.B. 15" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                {editingLesson.type === "video" ? "Video-URL (YouTube, Vimeo, Direktlink)" : editingLesson.type === "download" ? "Download-URL" : "Content-URL"}
              </label>
              <input value={editingLesson.content_url || ""} onChange={e => setEditingLesson(l => l ? { ...l, content_url: e.target.value } : l)}
                className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm" placeholder="https://..." />
            </div>
            {(editingLesson.type === "text" || editingLesson.type === "quiz") && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Inhalt (HTML/Text)</label>
                <textarea value={editingLesson.content_body || ""} onChange={e => setEditingLesson(l => l ? { ...l, content_body: e.target.value } : l)}
                  rows={6} className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm font-mono resize-y" placeholder="<h2>Titel</h2><p>Inhalt...</p>" />
              </div>
            )}
            <button onClick={saveLesson} disabled={saving || !editingLesson.title}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D4A22A] text-black font-medium rounded-lg hover:bg-[#B88B1F] transition disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Speichern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
