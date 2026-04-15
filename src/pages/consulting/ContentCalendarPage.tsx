import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Plus, Loader2, Sparkles, X, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format,
  addMonths, subMonths, isSameMonth, isSameDay, startOfWeek, endOfWeek,
  isToday
} from "date-fns";
import { de } from "date-fns/locale";

interface ContentPost {
  id: string;
  scheduled_date: string;
  topic: string;
  caption: string | null;
  status: string;
  post_type: string;
}

export default function ContentCalendarPage() {
  const { user, tenantId } = useAuth();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editPost, setEditPost] = useState<ContentPost | null>(null);

  // Form state
  const [topic, setTopic] = useState("");
  const [caption, setCaption] = useState("");
  const [postType, setPostType] = useState<"content" | "lead">("content");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadPosts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
    const { data } = await (supabase as any)
      .from("content_posts")
      .select("*")
      .eq("user_id", user.id)
      .gte("scheduled_date", start)
      .lte("scheduled_date", end)
      .order("scheduled_date");
    setPosts((data as ContentPost[]) || []);
    setLoading(false);
  }, [user, currentMonth]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const openNewPost = (date: Date) => {
    setSelectedDate(date);
    setEditPost(null);
    setTopic("");
    setCaption("");
    setPostType("content");
    setModalOpen(true);
  };

  const openEditPost = (post: ContentPost) => {
    setSelectedDate(new Date(post.scheduled_date));
    setEditPost(post);
    setTopic(post.topic);
    setCaption(post.caption || "");
    setPostType((post.post_type as "content" | "lead") || "content");
    setModalOpen(true);
  };

  const generateCaption = async () => {
    if (!topic.trim()) {
      toast({ title: "Bitte Thema eingeben", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      let userProfile: any = {};
      if (tenantId) {
        const { data } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
        userProfile = data || {};
      }
      const { data, error } = await supabase.functions.invoke("generate-asset", {
        body: { assetType: "caption_generator", userProfile, customPrompt: `Post-Typ: ${postType === "lead" ? "Lead-Post mit CTA" : "Content-Post"}\nThema: ${topic}` },
      });
      if (error) throw error;
      setCaption(data.content);
    } catch {
      toast({ title: "Fehler", description: "Caption-Generierung fehlgeschlagen.", variant: "destructive" });
    }
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!user || !selectedDate || !topic.trim()) return;
    setSaving(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      if (editPost) {
        await (supabase as any)
          .from("content_posts")
          .update({ topic, caption: caption || null, scheduled_date: dateStr, post_type: postType })
          .eq("id", editPost.id);
      } else {
        await (supabase as any).from("content_posts").insert({
          user_id: user.id,
          scheduled_date: dateStr,
          topic,
          caption: caption || null,
          post_type: postType,
        });
      }
      toast({ title: "Gespeichert" });
      setModalOpen(false);
      loadPosts();
    } catch {
      toast({ title: "Fehler", variant: "destructive" });
    }
    setSaving(false);
  };

  const toggleStatus = async (post: ContentPost) => {
    const newStatus = post.status === "published" ? "planned" : "published";
    await (supabase as any).from("content_posts").update({ status: newStatus }).eq("id", post.id);
    loadPosts();
  };

  // This week's posts
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const thisWeekPosts = posts.filter((p) => {
    const d = new Date(p.scheduled_date);
    return d >= weekStart && d <= weekEnd;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Content-Kalender</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Plane und verwalte deine LinkedIn-Posts</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Calendar Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-border/50 bg-card p-5"
        >
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-sm font-semibold text-foreground">
              {format(currentMonth, "MMMM yyyy", { locale: de })}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
              <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px">
              {days.map((day) => {
                const inMonth = isSameMonth(day, currentMonth);
                const dayPosts = posts.filter((p) => isSameDay(new Date(p.scheduled_date), day));
                const today = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => openNewPost(day)}
                    className={`min-h-[80px] p-1.5 rounded-lg border text-left transition-colors ${
                      today
                        ? "border-[#534AB7]/50 bg-[#534AB7]/5"
                        : inMonth
                        ? "border-border/30 hover:bg-secondary/30"
                        : "border-transparent opacity-40"
                    }`}
                  >
                    <p className={`text-[11px] font-medium ${today ? "text-[#534AB7]" : "text-foreground"}`}>
                      {format(day, "d")}
                    </p>
                    <div className="space-y-0.5 mt-1">
                      {dayPosts.slice(0, 2).map((post) => (
                        <div
                          key={post.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditPost(post);
                          }}
                          className={`text-[9px] px-1 py-0.5 rounded truncate cursor-pointer ${
                            post.status === "published"
                              ? "bg-green-500/15 text-green-400"
                              : post.post_type === "lead"
                              ? "bg-amber-500/15 text-amber-400"
                              : "bg-[#534AB7]/15 text-[#534AB7]"
                          }`}
                        >
                          {post.topic}
                        </div>
                      ))}
                      {dayPosts.length > 2 && (
                        <p className="text-[9px] text-muted-foreground">+{dayPosts.length - 2}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* This Week sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border/50 bg-card p-5"
        >
          <h2 className="text-sm font-semibold text-foreground mb-3">Diese Woche</h2>
          {thisWeekPosts.length === 0 ? (
            <p className="text-xs text-muted-foreground">Noch keine Posts geplant.</p>
          ) : (
            <div className="space-y-2">
              {thisWeekPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-start gap-2 p-2 rounded-lg border border-border/30 cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => openEditPost(post)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStatus(post);
                    }}
                    className="mt-0.5 shrink-0"
                  >
                    {post.status === "published" ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{post.topic}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(post.scheduled_date), "EEEE, d. MMM", { locale: de })}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[9px] shrink-0 ${
                      post.status === "published"
                        ? "bg-green-500/15 text-green-400 border-green-500/30"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {post.status === "published" ? "Veröffentlicht" : "Geplant"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Post Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editPost ? "Post bearbeiten" : "Neuer Post"}
              {selectedDate && (
                <span className="text-sm text-muted-foreground font-normal ml-2">
                  — {format(selectedDate, "d. MMMM yyyy", { locale: de })}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-xs">Thema</Label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="z.B. 5 Fehler bei der Kaltakquise"
                  className="mt-1"
                />
              </div>
              <div className="w-32">
                <Label className="text-xs">Post-Typ</Label>
                <div className="flex gap-1 mt-1">
                  <button
                    onClick={() => setPostType("content")}
                    className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${
                      postType === "content"
                        ? "bg-[#534AB7]/15 text-[#534AB7] border-[#534AB7]/30"
                        : "border-border text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    Content
                  </button>
                  <button
                    onClick={() => setPostType("lead")}
                    className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${
                      postType === "lead"
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        : "border-border text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    Lead
                  </button>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Caption</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateCaption}
                  disabled={generating || !topic.trim()}
                  className="h-7 text-xs"
                >
                  {generating ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-1" />
                  )}
                  Mit KI generieren
                </Button>
              </div>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Caption wird hier angezeigt..."
                rows={8}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Abbrechen
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !topic.trim()}
                className="bg-[#534AB7] hover:bg-[#4339a0]"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Speichern
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
