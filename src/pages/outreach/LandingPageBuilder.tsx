import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import {
  Plus, Globe, Eye, Trash2, Pencil, Copy, MoreVertical,
  FileText, Loader2, Search, LayoutGrid, List, Share2, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import FunnelBuilder from "@/components/outreach/landing-builder/FunnelBuilder";

interface LandingPage {
  id: string;
  name: string;
  slug: string;
  status: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

const LandingPageBuilder = () => {
  const { session } = useAuth();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletePageId, setDeletePageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedTemplate, setSelectedTemplate] = useState("video-pitch");

  useEffect(() => {
    if (session?.user?.id) loadPages();
  }, [session?.user?.id]);

  const loadPages = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("id", session!.user.id)
        .single();

      if (!profile?.account_id) return;

      const { data, error } = await supabase
        .from("landing_pages")
        .select("id, name, slug, status, view_count, created_at, updated_at")
        .eq("account_id", profile.account_id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setPages(data || []);
    } catch (err) {
      console.error("Error loading pages:", err);
      toast.error("Fehler beim Laden der Seiten");
    } finally {
      setLoading(false);
    }
  };

  const createPage = async () => {
    if (!newPageName.trim()) return;
    setCreating(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("id", session!.user.id)
        .single();

      if (!profile?.account_id) throw new Error("Kein Account gefunden");

      const slug = newPageSlug.trim() || newPageName.trim().toLowerCase()
        .replace(/[^a-z0-9äöüß]+/g, "-")
        .replace(/^-|-$/g, "")
        .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");

      const TEMPLATES: Record<string, any[]> = {
        "video-pitch": [
          { id: "blk_1", type: "spacer", settings: { height: 32 } },
          { id: "blk_2", type: "heading", settings: { text: "Hallo {{lead.firstName}}, wir haben etwas für {{lead.company}}", level: "h1", align: "center", color: "#ffffff", fontSize: 32 } },
          { id: "blk_3", type: "spacer", settings: { height: 8 } },
          { id: "blk_4", type: "text", settings: { text: "Wir haben eine maßgeschneiderte Lösung für {{lead.company}} erstellt.", align: "center", color: "#ffffffcc", fontSize: 16, lineHeight: 1.6 } },
          { id: "blk_5", type: "spacer", settings: { height: 24 } },
          { id: "blk_6", type: "video", settings: { src: "{{lead.videoUrl}}", posterSrc: "", autoplay: false, controls: true, borderRadius: 12 } },
          { id: "blk_7", type: "spacer", settings: { height: 24 } },
          { id: "blk_8", type: "button", settings: { text: "Termin buchen →", url: "{{sender.calendarLink}}", bgColor: "#6C5CE7", textColor: "#ffffff", borderRadius: 50, fontSize: 18, fullWidth: true, paddingY: 16, animation: "pulse" } },
        ],
        "quiz-funnel": [
          { id: "blk_1", type: "spacer", settings: { height: 32 } },
          { id: "blk_2", type: "heading", settings: { text: "{{lead.firstName}}, eine kurze Frage:", level: "h1", align: "center", color: "#ffffff", fontSize: 28 } },
          { id: "blk_3", type: "spacer", settings: { height: 16 } },
          { id: "blk_4", type: "quiz", settings: { question: "Was ist aktuell eure größte Herausforderung bei {{lead.company}}?", options: ["Lead-Generierung", "Conversion", "Skalierung", "Kosten senken"], multiSelect: false, style: "cards" } },
          { id: "blk_5", type: "spacer", settings: { height: 24 } },
          { id: "blk_6", type: "text", settings: { text: "Basierend auf deiner Antwort haben wir eine Lösung vorbereitet:", align: "center", color: "#ffffffcc", fontSize: 16, lineHeight: 1.6 } },
          { id: "blk_7", type: "video", settings: { src: "{{lead.videoUrl}}", posterSrc: "", autoplay: false, controls: true, borderRadius: 12 } },
          { id: "blk_8", type: "spacer", settings: { height: 24 } },
          { id: "blk_9", type: "button", settings: { text: "Kostenloses Strategiegespräch →", url: "{{sender.calendarLink}}", bgColor: "#00b894", textColor: "#ffffff", borderRadius: 50, fontSize: 18, fullWidth: true, paddingY: 16, animation: "pulse" } },
        ],
        "social-proof": [
          { id: "blk_1", type: "spacer", settings: { height: 32 } },
          { id: "blk_2", type: "logo", settings: { text: "Vertraut von führenden Unternehmen", logos: ["Kunde 1", "Kunde 2", "Kunde 3", "Kunde 4"] } },
          { id: "blk_3", type: "spacer", settings: { height: 24 } },
          { id: "blk_4", type: "heading", settings: { text: "{{lead.firstName}}, so helfen wir {{lead.company}}", level: "h1", align: "center", color: "#ffffff", fontSize: 30 } },
          { id: "blk_5", type: "spacer", settings: { height: 8 } },
          { id: "blk_6", type: "social", settings: { number: "150+", label: "Unternehmen vertrauen uns" } },
          { id: "blk_7", type: "spacer", settings: { height: 16 } },
          { id: "blk_8", type: "video", settings: { src: "{{lead.videoUrl}}", posterSrc: "", autoplay: false, controls: true, borderRadius: 12 } },
          { id: "blk_9", type: "spacer", settings: { height: 16 } },
          { id: "blk_10", type: "testimonial", settings: { quote: "Die Zusammenarbeit war hervorragend. Absolute Empfehlung!", author: "Max Mustermann", role: "CEO, Beispiel GmbH", avatar: "", rating: 5 } },
          { id: "blk_11", type: "spacer", settings: { height: 16 } },
          { id: "blk_12", type: "timer", settings: { hours: 48, label: "Angebot gültig für", bgColor: "#ff6b6b22", textColor: "#ff6b6b" } },
          { id: "blk_13", type: "spacer", settings: { height: 16 } },
          { id: "blk_14", type: "button", settings: { text: "Jetzt Termin sichern →", url: "{{sender.calendarLink}}", bgColor: "#6C5CE7", textColor: "#ffffff", borderRadius: 50, fontSize: 18, fullWidth: true, paddingY: 16, animation: "glow" } },
        ],
        "minimal": [
          { id: "blk_1", type: "spacer", settings: { height: 48 } },
          { id: "blk_2", type: "heading", settings: { text: "Hi {{lead.firstName}}.", level: "h1", align: "center", color: "#ffffff", fontSize: 36 } },
          { id: "blk_3", type: "spacer", settings: { height: 16 } },
          { id: "blk_4", type: "text", settings: { text: "Ich habe ein kurzes Video für {{lead.company}} aufgenommen.", align: "center", color: "#ffffffaa", fontSize: 18, lineHeight: 1.6 } },
          { id: "blk_5", type: "spacer", settings: { height: 32 } },
          { id: "blk_6", type: "video", settings: { src: "{{lead.videoUrl}}", posterSrc: "", autoplay: false, controls: true, borderRadius: 16 } },
          { id: "blk_7", type: "spacer", settings: { height: 32 } },
          { id: "blk_8", type: "button", settings: { text: "Lass uns sprechen", url: "{{sender.calendarLink}}", bgColor: "#ffffff", textColor: "#0a0a0f", borderRadius: 12, fontSize: 16, fullWidth: false, paddingY: 14, animation: "none" } },
          { id: "blk_9", type: "spacer", settings: { height: 48 } },
        ],
        "case-study": [
          { id: "blk_1", type: "spacer", settings: { height: 32 } },
          { id: "blk_2", type: "heading", settings: { text: "{{lead.firstName}}, so haben wir Unternehmen wie {{lead.company}} geholfen", level: "h1", align: "center", color: "#ffffff", fontSize: 28 } },
          { id: "blk_3", type: "spacer", settings: { height: 8 } },
          { id: "blk_4", type: "text", settings: { text: "Echte Ergebnisse aus der Zusammenarbeit mit Unternehmen in deiner Branche.", align: "center", color: "#ffffffcc", fontSize: 16, lineHeight: 1.6 } },
          { id: "blk_5", type: "spacer", settings: { height: 24 } },
          { id: "blk_6", type: "video", settings: { src: "{{lead.videoUrl}}", posterSrc: "", autoplay: false, controls: true, borderRadius: 12 } },
          { id: "blk_7", type: "spacer", settings: { height: 24 } },
          { id: "blk_8", type: "heading", settings: { text: "Fallstudie: +127% mehr qualifizierte Termine", level: "h2", align: "center", color: "#ffffff", fontSize: 22 } },
          { id: "blk_9", type: "spacer", settings: { height: 8 } },
          { id: "blk_10", type: "text", settings: { text: "<b>Ausgangslage:</b> Das Sales-Team hat über LinkedIn manuell Leads angeschrieben – ohne Tracking, ohne Systematik.\n\n<b>Lösung:</b> Personalisierte Video-Pitches mit automatischem Lead-Scoring und Follow-up-Sequenzen.\n\n<b>Ergebnis:</b> 127% mehr Settings in 60 Tagen. Die Annahmerate bei Vernetzungen stieg von 22% auf 58%.", align: "left", color: "#ffffffcc", fontSize: 15, lineHeight: 1.7 } },
          { id: "blk_11", type: "spacer", settings: { height: 16 } },
          { id: "blk_12", type: "testimonial", settings: { quote: "Wir konnten unser Setting-Team von 2 auf 5 Leute skalieren, weil das System endlich funktioniert.", author: "Markus B.", role: "Head of Sales", avatar: "", rating: 5 } },
          { id: "blk_13", type: "spacer", settings: { height: 24 } },
          { id: "blk_14", type: "button", settings: { text: "Gleiche Ergebnisse für {{lead.company}} →", url: "{{sender.calendarLink}}", bgColor: "#6C5CE7", textColor: "#ffffff", borderRadius: 50, fontSize: 18, fullWidth: true, paddingY: 16, animation: "pulse" } },
        ],
        "linkedin-authority": [
          { id: "blk_1", type: "spacer", settings: { height: 32 } },
          { id: "blk_2", type: "social", settings: { number: "2.847+", label: "Setter-Termine in 12 Monaten generiert" } },
          { id: "blk_3", type: "spacer", settings: { height: 16 } },
          { id: "blk_4", type: "heading", settings: { text: "{{lead.firstName}}, dein Team verdient ein System das funktioniert", level: "h1", align: "center", color: "#ffffff", fontSize: 28 } },
          { id: "blk_5", type: "spacer", settings: { height: 8 } },
          { id: "blk_6", type: "text", settings: { text: "Die meisten Sales-Teams verbrennen 80% ihrer Zeit mit manuellem Outreach. Hier ist warum {{lead.company}} das nicht muss.", align: "center", color: "#ffffffcc", fontSize: 16, lineHeight: 1.6 } },
          { id: "blk_7", type: "spacer", settings: { height: 24 } },
          { id: "blk_8", type: "video", settings: { src: "{{lead.videoUrl}}", posterSrc: "", autoplay: false, controls: true, borderRadius: 12 } },
          { id: "blk_9", type: "spacer", settings: { height: 24 } },
          { id: "blk_10", type: "logo", settings: { text: "Bekannt aus", logos: ["LinkedIn", "Sales Hacker", "OMR", "Gründerszene"] } },
          { id: "blk_11", type: "spacer", settings: { height: 16 } },
          { id: "blk_12", type: "testimonial", settings: { quote: "Endlich ein System, das LinkedIn-Outreach messbar macht. Unsere Closer haben jetzt eine volle Pipeline.", author: "Sandra K.", role: "VP Sales, SaaS Startup", avatar: "", rating: 5 } },
          { id: "blk_13", type: "spacer", settings: { height: 8 } },
          { id: "blk_14", type: "testimonial", settings: { quote: "Von 3 auf 15 Termine pro Woche. Die personalisierten Videos machen den Unterschied.", author: "Thomas L.", role: "Gründer, Agentur", avatar: "", rating: 5 } },
          { id: "blk_15", type: "spacer", settings: { height: 24 } },
          { id: "blk_16", type: "timer", settings: { hours: 24, label: "Dein Slot ist reserviert für", bgColor: "#6C5CE722", textColor: "#6C5CE7" } },
          { id: "blk_17", type: "spacer", settings: { height: 16 } },
          { id: "blk_18", type: "button", settings: { text: "Kostenloses Strategiegespräch buchen →", url: "{{sender.calendarLink}}", bgColor: "#00b894", textColor: "#ffffff", borderRadius: 50, fontSize: 18, fullWidth: true, paddingY: 16, animation: "glow" } },
        ],
        "ab-test": [
          { id: "blk_1", type: "spacer", settings: { height: 32 } },
          { id: "blk_2", type: "heading", settings: { text: "{{lead.firstName}}, kurze Frage zu {{lead.company}}", level: "h1", align: "center", color: "#ffffff", fontSize: 30 } },
          { id: "blk_3", type: "spacer", settings: { height: 16 } },
          { id: "blk_4", type: "quiz", settings: { question: "Was beschreibt eure aktuelle LinkedIn-Strategie am besten?", options: ["Wir posten Content, aber haben kein Outreach-System", "Wir machen manuelles Outreach ohne Tracking", "Wir nutzen Tools, aber die Ergebnisse sind mäßig", "Wir haben noch gar keine LinkedIn-Strategie"], multiSelect: false, style: "cards" } },
          { id: "blk_5", type: "spacer", settings: { height: 24 } },
          { id: "blk_6", type: "heading", settings: { text: "Hier ist, was wir für Teams wie deins gebaut haben:", level: "h2", align: "center", color: "#ffffff", fontSize: 22 } },
          { id: "blk_7", type: "spacer", settings: { height: 8 } },
          { id: "blk_8", type: "video", settings: { src: "{{lead.videoUrl}}", posterSrc: "", autoplay: false, controls: true, borderRadius: 12 } },
          { id: "blk_9", type: "spacer", settings: { height: 16 } },
          { id: "blk_10", type: "social", settings: { number: "58%", label: "durchschnittliche Vernetzungs-Annahmerate unserer Kunden" } },
          { id: "blk_11", type: "spacer", settings: { height: 16 } },
          { id: "blk_12", type: "testimonial", settings: { quote: "Wir haben unsere Antwortrate verdreifacht. Die personalisierten Landing Pages sind ein Game Changer.", author: "Julia M.", role: "Head of Growth", avatar: "", rating: 5 } },
          { id: "blk_13", type: "spacer", settings: { height: 24 } },
          { id: "blk_14", type: "button", settings: { text: "So funktioniert es für {{lead.company}} →", url: "{{sender.calendarLink}}", bgColor: "#6C5CE7", textColor: "#ffffff", borderRadius: 50, fontSize: 18, fullWidth: true, paddingY: 16, animation: "pulse" } },
        ],
      };

      const templateBlocks = TEMPLATES[selectedTemplate] || TEMPLATES["video-pitch"];
      const defaultContent = {
        slides: [{ id: "slide_1", name: "Startseite", blocks: templateBlocks }],
        settings: {
          name: newPageName.trim(),
          slug,
          customDomain: "",
          favicon: "",
          metaTitle: newPageName.trim(),
          metaDescription: "",
          theme: selectedTemplate === "minimal" ? 0 : selectedTemplate === "social-proof" ? 1 : 0,
          accentOverride: "",
          maxWidth: 480,
          blockGap: 20,
          padding: 24,
          impressumUrl: "",
          datenschutzUrl: "",
        },
      };

      const { data, error } = await supabase
        .from("landing_pages")
        .insert({
          name: newPageName.trim(),
          slug,
          status: "draft",
          content: defaultContent as any,
          styles: {} as any,
          user_id: session!.user.id,
          account_id: profile.account_id,
          meta_title: newPageName.trim(),
        })
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error("Eine Seite mit diesem Slug existiert bereits");
          return;
        }
        throw error;
      }

      toast.success("Seite erstellt");
      setShowCreateDialog(false);
      setNewPageName("");
      setNewPageSlug("");
      setEditingPageId(data.id);
    } catch (err) {
      console.error("Error creating page:", err);
      toast.error("Fehler beim Erstellen der Seite");
    } finally {
      setCreating(false);
    }
  };

  const deletePage = async (id: string) => {
    try {
      const { error } = await supabase.from("landing_pages").delete().eq("id", id);
      if (error) throw error;
      setPages(pages.filter((p) => p.id !== id));
      toast.success("Seite gelöscht");
    } catch (err) {
      console.error("Error deleting page:", err);
      toast.error("Fehler beim Löschen");
    }
    setDeletePageId(null);
  };

  const duplicatePage = async (page: LandingPage) => {
    try {
      const { data: original } = await supabase
        .from("landing_pages")
        .select("*")
        .eq("id", page.id)
        .single();

      if (!original) throw new Error("Seite nicht gefunden");

      const { error } = await supabase.from("landing_pages").insert({
        name: `${original.name} (Kopie)`,
        slug: `${original.slug}-copy-${Date.now()}`,
        status: "draft",
        content: original.content,
        styles: original.styles,
        user_id: session!.user.id,
        account_id: original.account_id,
        meta_title: original.meta_title,
        meta_description: original.meta_description,
        calendar_url: original.calendar_url,
      });

      if (error) throw error;
      toast.success("Seite dupliziert");
      loadPages();
    } catch (err) {
      console.error("Error duplicating page:", err);
      toast.error("Fehler beim Duplizieren");
    }
  };

  const sharePage = async (page: LandingPage) => {
    try {
      // Check if already has a share token
      const { data: existing } = await supabase
        .from("landing_pages")
        .select("share_token")
        .eq("id", page.id)
        .single();

      let token = (existing as any)?.share_token;
      if (!token) {
        token = crypto.randomUUID();
        const { error } = await supabase
          .from("landing_pages")
          .update({ share_token: token } as any)
          .eq("id", page.id);
        if (error) throw error;
      }

      const shareUrl = `${window.location.origin}/landing-pages?import=${token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share-Link kopiert! Andere Nutzer können diese Vorlage importieren.");
    } catch (err) {
      console.error("Error sharing page:", err);
      toast.error("Fehler beim Teilen");
    }
  };

  const importSharedTemplate = async (token: string) => {
    try {
      const { data: shared, error: fetchErr } = await (supabase as any)
        .from("landing_pages")
        .select("name, content, styles, meta_title, meta_description, calendar_url")
        .eq("share_token", token)
        .single();

      if (fetchErr || !shared) {
        toast.error("Vorlage nicht gefunden oder Link ungültig");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("id", session!.user.id)
        .single();

      const slug = `imported-${Date.now()}`;
      const { error } = await supabase.from("landing_pages").insert({
        name: `${shared.name} (Import)`,
        slug,
        status: "draft",
        content: shared.content,
        styles: shared.styles,
        user_id: session!.user.id,
        account_id: profile?.account_id,
        meta_title: shared.meta_title,
        meta_description: shared.meta_description,
        calendar_url: shared.calendar_url,
      });

      if (error) throw error;
      toast.success(`Vorlage "${shared.name}" importiert!`);
      loadPages();
      // Clean URL
      window.history.replaceState({}, "", "/landing-pages");
    } catch (err) {
      console.error("Error importing template:", err);
      toast.error("Fehler beim Importieren");
    }
  };

  // Check for import token in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const importToken = params.get("import");
    if (importToken && session?.user?.id) {
      importSharedTemplate(importToken);
    }
  }, [session?.user?.id]);

  const togglePublish = async (page: LandingPage) => {
    const newStatus = page.status === "published" ? "draft" : "published";
    try {
      const { error } = await supabase
        .from("landing_pages")
        .update({
          status: newStatus,
          published_at: newStatus === "published" ? new Date().toISOString() : null,
        })
        .eq("id", page.id);

      if (error) throw error;
      setPages(pages.map((p) => (p.id === page.id ? { ...p, status: newStatus } : p)));
      toast.success(newStatus === "published" ? "Seite veröffentlicht!" : "Seite als Entwurf gespeichert");
    } catch (err) {
      console.error("Error toggling publish:", err);
      toast.error("Fehler beim Ändern des Status");
    }
  };

  // If editing a page, show the full-screen builder
  if (editingPageId) {
    return (
      <FunnelBuilder
        pageId={editingPageId}
        onClose={() => {
          setEditingPageId(null);
          loadPages();
        }}
      />
    );
  }

  const filteredPages = pages.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Lead Pages</h1>
          <p className="text-muted-foreground mt-1">
            Erstelle personalisierte Funnel-Seiten mit Variablen für deine Leads
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Neue Seite
        </Button>
      </div>

      {/* Search & View Toggle */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Seiten durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/5 border-white/10"
          />
        </div>
        <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {filteredPages.length === 0 && !searchQuery && (
        <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-2xl">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Noch keine Lead Pages</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Erstelle deine erste personalisierte Funnel-Seite mit Drag & Drop Builder und Variablen
          </p>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Erste Seite erstellen
          </Button>
        </div>
      )}

      {filteredPages.length === 0 && searchQuery && (
        <div className="text-center py-16 text-muted-foreground">
          Keine Seiten gefunden für "{searchQuery}"
        </div>
      )}

      {/* Grid View */}
      {viewMode === "grid" && filteredPages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPages.map((page) => (
            <div
              key={page.id}
              className="group relative bg-card border border-white/10 rounded-xl overflow-hidden hover:border-primary/30 transition-all cursor-pointer"
              onClick={() => setEditingPageId(page.id)}
            >
              {/* Preview placeholder */}
              <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <div className="w-16 h-28 bg-black/30 rounded-xl border border-white/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white/30" />
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{page.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">/lp/{page.slug}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingPageId(page.id); }}>
                        <Pencil className="w-4 h-4 mr-2" /> Bearbeiten
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); togglePublish(page); }}>
                        <Globe className="w-4 h-4 mr-2" />
                        {page.status === "published" ? "Deaktivieren" : "Veröffentlichen"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicatePage(page); }}>
                        <Copy className="w-4 h-4 mr-2" /> Duplizieren
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); sharePage(page); }}>
                        <Share2 className="w-4 h-4 mr-2" /> Als Vorlage teilen
                      </DropdownMenuItem>
                      {page.status === "published" && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(`/lp/${page.slug}`, "_blank"); }}>
                          <Eye className="w-4 h-4 mr-2" /> Ansehen
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeletePageId(page.id); }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {page.view_count || 0}
                    </span>
                    <span>
                      {formatDistanceToNow(new Date(page.updated_at), { addSuffix: true, locale: de })}
                    </span>
                  </div>
                  <Badge variant={page.status === "published" ? "default" : "secondary"} className="text-[10px]">
                    {page.status === "published" ? (
                      <>
                        <Globe className="w-3 h-3 mr-1" /> Live
                      </>
                    ) : (
                      "Entwurf"
                    )}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && filteredPages.length > 0 && (
        <div className="border border-white/10 rounded-xl overflow-hidden">
          {filteredPages.map((page, i) => (
            <div
              key={page.id}
              className={`flex items-center gap-4 p-4 hover:bg-white/5 cursor-pointer transition-colors ${
                i < filteredPages.length - 1 ? "border-b border-white/10" : ""
              }`}
              onClick={() => setEditingPageId(page.id)}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{page.name}</h4>
                <p className="text-xs text-muted-foreground">/lp/{page.slug}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Eye className="w-3 h-3" />
                {page.view_count || 0}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {formatDistanceToNow(new Date(page.updated_at), { addSuffix: true, locale: de })}
              </span>
              <Badge variant={page.status === "published" ? "default" : "secondary"} className="text-[10px]">
                {page.status === "published" ? "Live" : "Entwurf"}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingPageId(page.id); }}>
                    <Pencil className="w-4 h-4 mr-2" /> Bearbeiten
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); togglePublish(page); }}>
                    <Globe className="w-4 h-4 mr-2" />
                    {page.status === "published" ? "Deaktivieren" : "Veröffentlichen"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicatePage(page); }}>
                    <Copy className="w-4 h-4 mr-2" /> Duplizieren
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeletePageId(page.id); }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Löschen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Lead Page erstellen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Seitenname</label>
              <Input
                placeholder="z.B. Outreach Q1 Kampagne"
                value={newPageName}
                onChange={(e) => {
                  setNewPageName(e.target.value);
                  if (!newPageSlug) {
                    // Auto-generate slug from name
                  }
                }}
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">URL Slug (optional)</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/lp/</span>
                <Input
                  placeholder="auto-generiert"
                  value={newPageSlug}
                  onChange={(e) => setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Template wählen</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "video-pitch", name: "Video Pitch", desc: "Video + CTA Button", emoji: "🎬" },
                  { id: "quiz-funnel", name: "Quiz Funnel", desc: "Quiz → Video → CTA", emoji: "❓" },
                  { id: "social-proof", name: "Social Proof", desc: "Logos + Testimonial + Timer", emoji: "⭐" },
                  { id: "minimal", name: "Minimal", desc: "Clean & einfach", emoji: "✨" },
                  { id: "case-study", name: "Fallstudie", desc: "Case Study + Ergebnisse + Testimonial", emoji: "📊" },
                  { id: "linkedin-authority", name: "LinkedIn Authority", desc: "Social Proof + 2 Testimonials + Timer", emoji: "🏆" },
                  { id: "ab-test", name: "Quiz + Fallstudie", desc: "Quiz → Video → Stats + Testimonial", emoji: "🧪" },
                ].map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedTemplate === tpl.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="text-lg mb-1">{tpl.emoji}</div>
                    <div className="text-sm font-medium">{tpl.name}</div>
                    <div className="text-[10px] text-muted-foreground">{tpl.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={createPage} disabled={!newPageName.trim() || creating}>
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Erstellen & Bearbeiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePageId} onOpenChange={() => setDeletePageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Seite löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Die Seite und alle zugehörigen Daten werden dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletePageId && deletePage(deletePageId)}
            >
              Endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  );
};

export default LandingPageBuilder;
