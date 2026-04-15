import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Play, Calendar, Check, X, Star, CheckCircle, Megaphone, Pen, 
  Users, Loader2, ExternalLink, Save, Wand2, Palette, Type, 
  Layout, Plus, Trash2, Upload, ImageIcon, Sparkles,
  Eye, Settings2, Brush, Trophy, Video, Monitor
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LeadPageTemplate {
  id?: string;
  name: string;
  is_active: boolean;
  header_logo_text: string;
  header_logo_accent: string;
  header_logo_url: string;
  header_nav_items: string[];
  header_cta_text: string;
  hero_headline: string;
  hero_subheadline: string;
  hero_cta_text: string;
  hero_video_caption: string;
  coaching_badge: string;
  coaching_headline: string;
  coaching_subheadline: string;
  pillar1_title: string;
  pillar1_subtitle: string;
  pillar1_description: string;
  pillar1_items: string[];
  pillar2_title: string;
  pillar2_subtitle: string;
  pillar2_description: string;
  pillar2_items: string[];
  combined_headline: string;
  combined_text: string;
  comparison_badge: string;
  comparison_headline: string;
  comparison_subheadline: string;
  others_title: string;
  others_items: string[];
  us_title: string;
  us_items: string[];
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  accent_color: string;
  calendar_url: string;
  footer_company_name: string;
  footer_tagline: string;
  footer_impressum_url: string;
  footer_datenschutz_url: string;
  // Case Studies
  case_studies_badge: string;
  case_studies_headline: string;
  case_studies_subheadline: string;
  case_studies: CaseStudy[];
  // Guarantee Section
  guarantee_badge: string;
  guarantee_headline: string;
  guarantee_description: string;
  guarantee_items: string[];
  // FAQ Section
  faq_badge: string;
  faq_headline: string;
  faq_subheadline: string;
  faq_items: FAQItem[];
  // CTA Section
  cta_badge: string;
  cta_headline: string;
  cta_description: string;
  cta_button_text: string;
  // Testimonials Section
  testimonials_badge: string;
  testimonials_headline: string;
  testimonials_subheadline: string;
  testimonials: Testimonial[];
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  image_url?: string;
}

export interface CaseStudy {
  title: string;
  company_type: string;
  before_revenue: string;
  after_revenue: string;
  timeframe: string;
  description: string;
  video_url: string;
  rating: number;
}

export const defaultTemplate: LeadPageTemplate = {
  name: "Standard-Vorlage",
  is_active: true,
  header_logo_text: "Content-Leads",
  header_logo_accent: "Content",
  header_logo_url: "",
  header_nav_items: ["Warum wir?", "Unser Ansatz", "FAQ"],
  header_cta_text: "{{first_name}}, lass uns sprechen!",
  hero_headline: "Hey {{first_name}}, sieh dir das 2-minütige Video an",
  hero_subheadline: "… und erfahre, wie {{company}} mit personalisierten Outreach-Kampagnen und starkem Content qualifizierte Leads generiert.",
  hero_cta_text: "Gratis Termin vereinbaren",
  hero_video_caption: "Nur für dich {{first_name}}, nimm dir die 2 Minuten und schau kurz rein!!",
  coaching_badge: "Exklusives Coaching-Programm",
  coaching_headline: "Die zwei Säulen für deinen LinkedIn-Erfolg",
  coaching_subheadline: "Lerne, wie du mit Outreach Umsatz generierst und mit Content Anfragen bekommst – für {{company}}",
  pillar1_title: "Säule 1: Outreach",
  pillar1_subtitle: "= Umsatz generieren",
  pillar1_description: "Wir zeigen dir, wie du personalisierte Kampagnen erstellst, die direkt bei deiner Zielgruppe ankommen.",
  pillar1_items: [
    "Du lernst hyperpersonalisierte Nachrichten zu schreiben",
    "Wie du direkte Terminbuchungen durch warme Kontakte bekommst",
    "Datengetriebene Zielgruppenansprache verstehen",
    "A/B-Tests für maximale Conversion durchführen",
    "Schritt-für-Schritt Anleitungen zum Nachmachen"
  ],
  pillar2_title: "Säule 2: Inbound Content",
  pillar2_subtitle: "= Anfragen generieren",
  pillar2_description: "Lerne, wie du hochwertigen Content erstellst, der deine Expertise zeigt und organisch Leads anzieht.",
  pillar2_items: [
    "So schreibst du Posts, die viral gehen",
    "Thought Leadership aufbauen",
    "Die richtige Posting-Frequenz finden",
    "Community Building & Engagement-Strategien",
    "Branding & Sichtbarkeit systematisch steigern"
  ],
  combined_headline: "🚀 Outreach + Content = Maximale Wirkung",
  combined_text: "Im Coaching lernst du beide Strategien zu meistern. Während dein Outreach aktiv Termine generiert, baut dein Content gleichzeitig Vertrauen und Autorität auf. Das Ergebnis: planbar mehr Umsatz und Anfragen.",
  comparison_badge: "#1 LinkedIn Beratung in der DACH-Region",
  comparison_headline: "Was uns von anderen unterscheidet",
  comparison_subheadline: "Keine leeren Versprechungen – wir liefern Ergebnisse mit Garantie.",
  others_title: "Andere Anbieter",
  others_items: [
    "Erste Ergebnisse nach 3-6 Monaten",
    "Keine Umsatzgarantie",
    "Nur Theorie, keine Umsetzungsbegleitung",
    "Standard-Inhalte für alle",
    "Du bist nach dem Kurs auf dich allein gestellt"
  ],
  us_title: "Unser Coaching bei Content-Leads",
  us_items: [
    "Erste Anfragen bereits in 7 Tagen",
    "Umsatzgarantie – wir verdoppeln dein Investment",
    "Intensive 1:1 Betreuung bei der Umsetzung",
    "Individuell auf deine Situation angepasst",
    "Persönlicher Coach dauerhaft an deiner Seite"
  ],
  primary_color: "#06b6d4",
  secondary_color: "#a855f7",
  background_color: "#0f172a",
  text_color: "#f8fafc",
  accent_color: "#f59e0b",
  calendar_url: "",
  footer_company_name: "Content-Leads",
  footer_tagline: "Alle Rechte vorbehalten.",
  footer_impressum_url: "https://content-leads.de/impressum",
  footer_datenschutz_url: "https://content-leads.de/datenschutz",
  // Case Studies
  case_studies_badge: "Erfolgsgeschichten",
  case_studies_headline: "Das könnten deine Ergebnisse sein",
  case_studies_subheadline: "Echte Kunden, echte Ergebnisse – keine leeren Versprechen",
  case_studies: [
    {
      title: "Daddel GmbH",
      company_type: "Webseitenagentur",
      before_revenue: "10.000€",
      after_revenue: "20.000€+",
      timeframe: "in 60 Tagen",
      description: "Von sporadischen Anfragen zu planbarem Wachstum durch LinkedIn Outreach",
      video_url: "https://www.youtube.com/embed/evcR2kC6otA",
      rating: 5
    },
    {
      title: "Teo Hentzschel",
      company_type: "Webseitenagentur",
      before_revenue: "0€",
      after_revenue: "10.000€",
      timeframe: "in 3 Tagen",
      description: "Erster Deal direkt nach Start der LinkedIn Kampagne abgeschlossen",
      video_url: "",
      rating: 5
    },
    {
      title: "Hendrik Hoffmann",
      company_type: "Webseitenagentur",
      before_revenue: "unregelmäßig",
      after_revenue: "5-stellig",
      timeframe: "in 30 Tagen",
      description: "Zusätzlicher Cashflow durch systematische Kaltakquise auf LinkedIn",
      video_url: "",
      rating: 5
    }
  ],
  // Guarantee Section
  guarantee_badge: "Unsere Garantie",
  guarantee_headline: "Deine Investition ist geschützt",
  guarantee_description: "Wir sind so überzeugt von unserer Methode, dass wir dir eine 100% Zufriedenheitsgarantie geben. Wenn du nicht zufrieden bist, bekommst du dein Geld zurück.",
  guarantee_items: [
    "Geld-zurück-Garantie in den ersten 30 Tagen",
    "Kostenlose Nachbetreuung bei Fragen",
    "Lifetime-Zugang zu allen Updates"
  ],
  // FAQ Section
  faq_badge: "Häufige Fragen",
  faq_headline: "Noch Fragen?",
  faq_subheadline: "Hier findest du Antworten auf die wichtigsten Fragen",
  faq_items: [
    { question: "Wie schnell sehe ich Ergebnisse?", answer: "Die meisten Kunden sehen erste Ergebnisse innerhalb der ersten 7 Tage." },
    { question: "Brauche ich technische Vorkenntnisse?", answer: "Nein, wir führen dich Schritt für Schritt durch den gesamten Prozess." },
    { question: "Wie viel Zeit muss ich investieren?", answer: "Wir empfehlen ca. 2-3 Stunden pro Woche für optimale Ergebnisse." }
  ],
  // CTA Section
  cta_badge: "Jetzt starten",
  cta_headline: "Bereit für den nächsten Schritt, {{first_name}}?",
  cta_description: "Vereinbare jetzt ein kostenloses Strategiegespräch und erfahre, wie wir dir helfen können.",
  cta_button_text: "Kostenloses Gespräch buchen",
  // Testimonials Section
  testimonials_badge: "Was unsere Kunden sagen",
  testimonials_headline: "Echte Erfolgsgeschichten",
  testimonials_subheadline: "Höre, was andere über ihre Erfahrungen berichten",
  testimonials: [
    { quote: "Innerhalb von 2 Wochen hatte ich meinen ersten Abschluss über LinkedIn. Absolut empfehlenswert!", author: "Michael S.", role: "Geschäftsführer", company: "Digital Consulting GmbH" },
    { quote: "Die persönliche Betreuung ist einzigartig. Man fühlt sich wirklich gut aufgehoben.", author: "Sarah K.", role: "Marketing Managerin", company: "TechStart AG" }
  ]
};

interface LeadPageTemplatePreviewProps {
  calendarUrl?: string;
  onSave?: () => void | Promise<void>;
}

export const LeadPageTemplatePreview = ({ calendarUrl, onSave }: LeadPageTemplatePreviewProps) => {
  const [template, setTemplate] = useState<LeadPageTemplate>(defaultTemplate);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"preview" | "editor">("preview");
  const [activeEditorTab, setActiveEditorTab] = useState("branding");
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  // Refs for preview sections
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const headerSectionRef = useRef<HTMLElement>(null);
  const heroSectionRef = useRef<HTMLElement>(null);
  const coachingSectionRef = useRef<HTMLElement>(null);
  const comparisonSectionRef = useRef<HTMLElement>(null);
  const footerSectionRef = useRef<HTMLElement>(null);

  // Scroll to section when editor tab changes
  const scrollToSection = useCallback((tabValue: string) => {
    const sectionId = `preview-${tabValue}`;
    const sectionElement = document.getElementById(sectionId);
    
    if (sectionElement && previewScrollRef.current) {
      // Find the ScrollArea viewport (it's the scrollable container)
      const scrollContainer = previewScrollRef.current.closest('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = sectionElement.getBoundingClientRect();
        const scrollTop = elementRect.top - containerRect.top + scrollContainer.scrollTop;
        
        scrollContainer.scrollTo({
          top: scrollTop - 20,
          behavior: 'smooth'
        });
      } else {
        // Fallback: use scrollIntoView
        sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, []);

  // Handle editor tab change
  const handleEditorTabChange = useCallback((value: string) => {
    setActiveEditorTab(value);
    scrollToSection(value);
  }, [scrollToSection]);

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("id", user.id)
        .single();

      if (!profile?.account_id) return;
      setAccountId(profile.account_id);

      // Load account branding data
      const { data: account } = await supabase
        .from("accounts")
        .select("logo_url, primary_brand_color, secondary_brand_color, company_name, tagline")
        .eq("id", profile.account_id)
        .single();

      const { data, error } = await supabase
        .from("lead_page_templates")
        .select("*")
        .eq("account_id", profile.account_id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setTemplateId(data.id);
        setTemplate({
          id: data.id,
          name: data.name,
          is_active: data.is_active,
          header_logo_text: data.header_logo_text || defaultTemplate.header_logo_text,
          header_logo_accent: data.header_logo_accent || defaultTemplate.header_logo_accent,
          header_logo_url: account?.logo_url || "",
          header_nav_items: (data.header_nav_items as string[]) || defaultTemplate.header_nav_items,
          header_cta_text: data.header_cta_text || defaultTemplate.header_cta_text,
          hero_headline: data.hero_headline || defaultTemplate.hero_headline,
          hero_subheadline: data.hero_subheadline || defaultTemplate.hero_subheadline,
          hero_cta_text: data.hero_cta_text || defaultTemplate.hero_cta_text,
          hero_video_caption: data.hero_video_caption || defaultTemplate.hero_video_caption,
          coaching_badge: data.coaching_badge || defaultTemplate.coaching_badge,
          coaching_headline: data.coaching_headline || defaultTemplate.coaching_headline,
          coaching_subheadline: data.coaching_subheadline || defaultTemplate.coaching_subheadline,
          pillar1_title: data.pillar1_title || defaultTemplate.pillar1_title,
          pillar1_subtitle: data.pillar1_subtitle || defaultTemplate.pillar1_subtitle,
          pillar1_description: data.pillar1_description || defaultTemplate.pillar1_description,
          pillar1_items: (data.pillar1_items as string[]) || defaultTemplate.pillar1_items,
          pillar2_title: data.pillar2_title || defaultTemplate.pillar2_title,
          pillar2_subtitle: data.pillar2_subtitle || defaultTemplate.pillar2_subtitle,
          pillar2_description: data.pillar2_description || defaultTemplate.pillar2_description,
          pillar2_items: (data.pillar2_items as string[]) || defaultTemplate.pillar2_items,
          combined_headline: data.combined_headline || defaultTemplate.combined_headline,
          combined_text: data.combined_text || defaultTemplate.combined_text,
          comparison_badge: data.comparison_badge || defaultTemplate.comparison_badge,
          comparison_headline: data.comparison_headline || defaultTemplate.comparison_headline,
          comparison_subheadline: data.comparison_subheadline || defaultTemplate.comparison_subheadline,
          others_title: data.others_title || defaultTemplate.others_title,
          others_items: (data.others_items as string[]) || defaultTemplate.others_items,
          us_title: data.us_title || defaultTemplate.us_title,
          us_items: (data.us_items as string[]) || defaultTemplate.us_items,
          primary_color: data.primary_color || account?.primary_brand_color || defaultTemplate.primary_color,
          secondary_color: data.secondary_color || account?.secondary_brand_color || defaultTemplate.secondary_color,
          background_color: data.background_color || defaultTemplate.background_color,
          text_color: data.text_color || defaultTemplate.text_color,
          accent_color: data.accent_color || defaultTemplate.accent_color,
          calendar_url: data.calendar_url || calendarUrl || "",
          footer_company_name: data.footer_company_name || account?.company_name || defaultTemplate.footer_company_name,
          footer_tagline: data.footer_tagline || account?.tagline || defaultTemplate.footer_tagline,
          footer_impressum_url: data.footer_impressum_url || defaultTemplate.footer_impressum_url,
          footer_datenschutz_url: data.footer_datenschutz_url || defaultTemplate.footer_datenschutz_url,
          // Case Studies
          case_studies_badge: data.case_studies_badge || defaultTemplate.case_studies_badge,
          case_studies_headline: data.case_studies_headline || defaultTemplate.case_studies_headline,
          case_studies_subheadline: data.case_studies_subheadline || defaultTemplate.case_studies_subheadline,
          case_studies: (data.case_studies as unknown as CaseStudy[]) || defaultTemplate.case_studies,
          // Guarantee Section
          guarantee_badge: data.guarantee_badge || defaultTemplate.guarantee_badge,
          guarantee_headline: data.guarantee_headline || defaultTemplate.guarantee_headline,
          guarantee_description: data.guarantee_description || defaultTemplate.guarantee_description,
          guarantee_items: (data.guarantee_items as string[]) || defaultTemplate.guarantee_items,
          // FAQ Section
          faq_badge: data.faq_badge || defaultTemplate.faq_badge,
          faq_headline: data.faq_headline || defaultTemplate.faq_headline,
          faq_subheadline: data.faq_subheadline || defaultTemplate.faq_subheadline,
          faq_items: (data.faq_items as unknown as FAQItem[]) || defaultTemplate.faq_items,
          // CTA Section
          cta_badge: data.cta_badge || defaultTemplate.cta_badge,
          cta_headline: data.cta_headline || defaultTemplate.cta_headline,
          cta_description: data.cta_description || defaultTemplate.cta_description,
          cta_button_text: data.cta_button_text || defaultTemplate.cta_button_text,
          // Testimonials Section
          testimonials_badge: data.testimonials_badge || defaultTemplate.testimonials_badge,
          testimonials_headline: data.testimonials_headline || defaultTemplate.testimonials_headline,
          testimonials_subheadline: data.testimonials_subheadline || defaultTemplate.testimonials_subheadline,
          testimonials: (data.testimonials as unknown as Testimonial[]) || defaultTemplate.testimonials,
        });
      } else {
        // Use account branding data if no template exists
        setTemplate({ 
          ...defaultTemplate, 
          calendar_url: calendarUrl || "",
          header_logo_url: account?.logo_url || "",
          primary_color: account?.primary_brand_color || defaultTemplate.primary_color,
          secondary_color: account?.secondary_brand_color || defaultTemplate.secondary_color,
          footer_company_name: account?.company_name || defaultTemplate.footer_company_name,
          footer_tagline: account?.tagline || defaultTemplate.footer_tagline,
        });
      }
    } catch (error) {
      console.error("Error loading template:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTemplate = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("id", user.id)
        .single();

      if (!profile?.account_id) throw new Error("No account found");

      const templateData = {
        account_id: profile.account_id,
        name: template.name,
        is_active: true,
        header_logo_text: template.header_logo_text,
        header_logo_accent: template.header_logo_accent,
        header_nav_items: template.header_nav_items,
        header_cta_text: template.header_cta_text,
        hero_headline: template.hero_headline,
        hero_subheadline: template.hero_subheadline,
        hero_cta_text: template.hero_cta_text,
        hero_video_caption: template.hero_video_caption,
        coaching_badge: template.coaching_badge,
        coaching_headline: template.coaching_headline,
        coaching_subheadline: template.coaching_subheadline,
        pillar1_title: template.pillar1_title,
        pillar1_subtitle: template.pillar1_subtitle,
        pillar1_description: template.pillar1_description,
        pillar1_items: template.pillar1_items,
        pillar2_title: template.pillar2_title,
        pillar2_subtitle: template.pillar2_subtitle,
        pillar2_description: template.pillar2_description,
        pillar2_items: template.pillar2_items,
        combined_headline: template.combined_headline,
        combined_text: template.combined_text,
        comparison_badge: template.comparison_badge,
        comparison_headline: template.comparison_headline,
        comparison_subheadline: template.comparison_subheadline,
        others_title: template.others_title,
        others_items: template.others_items,
        us_title: template.us_title,
        us_items: template.us_items,
        primary_color: template.primary_color,
        secondary_color: template.secondary_color,
        background_color: template.background_color,
        text_color: template.text_color,
        accent_color: template.accent_color,
        calendar_url: template.calendar_url,
        footer_company_name: template.footer_company_name,
        footer_tagline: template.footer_tagline,
        // Case Studies
        case_studies_badge: template.case_studies_badge,
        case_studies_headline: template.case_studies_headline,
        case_studies_subheadline: template.case_studies_subheadline,
        case_studies: template.case_studies as unknown as any,
        // Guarantee Section
        guarantee_badge: template.guarantee_badge,
        guarantee_headline: template.guarantee_headline,
        guarantee_description: template.guarantee_description,
        guarantee_items: template.guarantee_items,
        // FAQ Section
        faq_badge: template.faq_badge,
        faq_headline: template.faq_headline,
        faq_subheadline: template.faq_subheadline,
        faq_items: template.faq_items as unknown as any,
        // CTA Section
        cta_badge: template.cta_badge,
        cta_headline: template.cta_headline,
        cta_description: template.cta_description,
        cta_button_text: template.cta_button_text,
        // Testimonials Section
        testimonials_badge: template.testimonials_badge,
        testimonials_headline: template.testimonials_headline,
        testimonials_subheadline: template.testimonials_subheadline,
        testimonials: template.testimonials as unknown as any,
      };

      // Also save branding to account
      await supabase
        .from("accounts")
        .update({
          logo_url: template.header_logo_url,
          primary_brand_color: template.primary_color,
          secondary_brand_color: template.secondary_color,
          company_name: template.footer_company_name,
          tagline: template.footer_tagline,
        })
        .eq("id", profile.account_id);

      if (templateId) {
        const { error } = await supabase
          .from("lead_page_templates")
          .update(templateData)
          .eq("id", templateId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("lead_page_templates")
          .insert([templateData])
          .select()
          .single();

        if (error) throw error;
        setTemplateId(data.id);
      }

      toast.success("Vorlage gespeichert!");
      
      // Call onSave callback if provided
      if (onSave) {
        await onSave();
      }
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast.error(error.message || "Fehler beim Speichern");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAICustomize = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Bitte gib eine Beschreibung ein");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("customize-lead-template", {
        body: { prompt: aiPrompt, currentTemplate: template }
      });

      if (error) throw error;

      if (data.template) {
        setTemplate({
          ...template,
          ...data.template,
          pillar1_items: data.template.pillar1_items || template.pillar1_items,
          pillar2_items: data.template.pillar2_items || template.pillar2_items,
          others_items: data.template.others_items || template.others_items,
          us_items: data.template.us_items || template.us_items,
          header_nav_items: data.template.header_nav_items || template.header_nav_items,
        });
        toast.success("Vorlage mit KI angepasst!");
        setAiPrompt("");
      }
    } catch (error: any) {
      console.error("AI customization error:", error);
      toast.error(error.message || "Fehler bei der KI-Anpassung");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setTemplate(defaultTemplate);
    toast.success("Vorlage auf Standard zurückgesetzt");
  };

  const updateListItem = (
    field: "pillar1_items" | "pillar2_items" | "others_items" | "us_items" | "header_nav_items",
    index: number,
    value: string
  ) => {
    const newItems = [...template[field]];
    newItems[index] = value;
    setTemplate({ ...template, [field]: newItems });
  };

  const addListItem = (field: "pillar1_items" | "pillar2_items" | "others_items" | "us_items") => {
    setTemplate({ ...template, [field]: [...template[field], "Neuer Punkt"] });
  };

  const removeListItem = (field: "pillar1_items" | "pillar2_items" | "others_items" | "us_items", index: number) => {
    const newItems = template[field].filter((_, i) => i !== index);
    setTemplate({ ...template, [field]: newItems });
  };

  // Logo upload handlers
  const handleLogoUpload = useCallback(async (file: File) => {
    if (!accountId) {
      toast.error("Account nicht gefunden");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Bitte nur Bilddateien hochladen");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Datei ist zu groß (max. 5MB)");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${accountId}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("account-logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("account-logos")
        .getPublicUrl(fileName);

      setTemplate({ ...template, header_logo_url: publicUrl });
      toast.success("Logo hochgeladen!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Fehler beim Hochladen");
    } finally {
      setUploading(false);
    }
  }, [accountId, template]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleLogoUpload(file);
  }, [handleLogoUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLogoUpload(file);
  }, [handleLogoUpload]);

  const removeLogo = () => {
    setTemplate({ ...template, header_logo_url: "" });
  };

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-[2rem] p-8 backdrop-blur-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/40 to-secondary/40 blur-xl animate-pulse" />
              <Loader2 className="w-10 h-10 animate-spin text-primary relative z-10" />
            </div>
            <p className="text-muted-foreground">Lade Vorlage...</p>
          </div>
        </div>
      </div>
    );
  }

  const firstName = "{{first_name}}";
  const companyName = "{{company}}";

  return (
    <div className="space-y-8">
      {/* Glassmorphism Header Bar */}
      <div className="relative overflow-hidden rounded-2xl p-5 backdrop-blur-xl bg-card/80 border border-border shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Lead-Seiten Editor</h2>
              <p className="text-sm text-muted-foreground">Personalisierte Landing Pages mit KI</p>
            </div>
          </div>
          
          {/* View Toggle */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex rounded-xl bg-white/5 border border-white/10 p-1">
              <button
                onClick={() => setActiveView("preview")}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeView === "preview"
                    ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Vorschau</span>
              </button>
              <button
                onClick={() => setActiveView("editor")}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeView === "editor"
                    ? "bg-gradient-to-r from-secondary/20 to-secondary/10 text-secondary border border-secondary/20 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">Bearbeiten</span>
              </button>
            </div>

            <div className="hidden sm:block h-8 w-px bg-white/10" />

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open("/landing-pages/preview", "_blank")}
              className="gap-2 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Vorschau öffnen</span>
            </Button>
            <Button 
              onClick={saveTemplate} 
              disabled={isSaving} 
              className="gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="hidden sm:inline">Speichern</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Stacked Layout */}
      <div className="space-y-8">
        {/* Preview Panel - Full Width */}
        <div className={`${activeView === "editor" ? "hidden" : ""} lg:block`}>
          <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-xl">
            {/* Preview Header */}
            <div className="relative z-10 px-5 py-4 border-b border-border bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-sm text-muted-foreground font-mono">/p/lead-slug</span>
                </div>
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  <Eye className="w-3 h-3 mr-1" />
                  Live Vorschau
                </Badge>
              </div>
            </div>

            {/* Preview Content - Taller */}
            <ScrollArea 
              className="rounded-b-2xl h-[65vh]" 
              style={{ 
                backgroundColor: template.background_color,
                color: template.text_color 
              }}
            >
              <div className="p-0" ref={previewScrollRef}>
                {/* Header Preview */}
                <header id="preview-branding" ref={headerSectionRef} className="border-b px-6 py-4 scroll-mt-4" style={{ borderColor: `${template.text_color}15` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {template.header_logo_url ? (
                        <img src={template.header_logo_url} alt="Logo" className="h-10 w-auto object-contain" />
                      ) : (
                        <div className="text-xl font-bold">
                          <span style={{ color: template.primary_color }}>{template.header_logo_accent}</span>
                          {template.header_logo_text.replace(template.header_logo_accent, "")}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm opacity-70">
                      {template.header_nav_items.map((item, i) => (
                        <span key={i} className="hover:opacity-100 cursor-pointer transition-opacity">{item}</span>
                      ))}
                    </div>
                    <div 
                      className="font-semibold px-4 py-2 rounded-lg text-sm cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: template.primary_color, color: template.background_color }}
                    >
                      {template.header_cta_text.replace("{{first_name}}", firstName)}
                    </div>
                  </div>
                </header>

                {/* Hero Section Preview */}
                <section id="preview-hero" ref={heroSectionRef} className="py-16 px-6 scroll-mt-4">
                  <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                      <h1 className="text-4xl font-bold leading-tight">
                        {template.hero_headline.replace("{{first_name}}", firstName)}
                      </h1>
                      <p className="text-lg opacity-80 leading-relaxed">
                        {template.hero_subheadline
                          .replace("{{first_name}}", firstName)
                          .replace("{{company}}", companyName)}
                      </p>
                      <div 
                        className="inline-flex items-center gap-3 font-semibold px-6 py-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: template.primary_color, color: template.background_color }}
                      >
                        <Calendar className="w-5 h-5" />
                        {template.hero_cta_text}
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute -top-8 right-1/4 text-5xl animate-bounce">👇</div>
                      <div className="rounded-xl overflow-hidden border aspect-video flex items-center justify-center" style={{ backgroundColor: `${template.primary_color}10`, borderColor: `${template.text_color}20` }}>
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: `${template.primary_color}30` }}>
                            <Play className="w-8 h-8" style={{ color: template.primary_color }} />
                          </div>
                          <p className="text-sm opacity-60">Personalisiertes Video</p>
                        </div>
                      </div>
                      <p className="text-center mt-3 opacity-70">
                        {template.hero_video_caption.replace("{{first_name}}", firstName)}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Coaching Section Preview */}
                <section id="preview-coaching" ref={coachingSectionRef} className="py-16 px-6 scroll-mt-4" style={{ backgroundColor: `${template.primary_color}08` }}>
                  <div className="text-center mb-12">
                    <Badge className="mb-4" style={{ backgroundColor: `${template.primary_color}20`, color: template.primary_color, borderColor: `${template.primary_color}30` }}>
                      {template.coaching_badge}
                    </Badge>
                    <h2 className="text-3xl font-bold mb-4">{template.coaching_headline}</h2>
                    <p className="opacity-70 max-w-2xl mx-auto">{template.coaching_subheadline.replace("{{company}}", companyName)}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* Pillar 1 */}
                    <div className="rounded-xl p-6 border" style={{ backgroundColor: `${template.primary_color}10`, borderColor: `${template.primary_color}30` }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${template.primary_color}30` }}>
                          <Megaphone className="w-5 h-5" style={{ color: template.primary_color }} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{template.pillar1_title}</h3>
                          <p className="text-sm opacity-60">{template.pillar1_subtitle}</p>
                        </div>
                      </div>
                      <ul className="space-y-3">
                        {template.pillar1_items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: template.primary_color }} />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Pillar 2 */}
                    <div className="rounded-xl p-6 border" style={{ backgroundColor: `${template.secondary_color}10`, borderColor: `${template.secondary_color}30` }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${template.secondary_color}30` }}>
                          <Pen className="w-5 h-5" style={{ color: template.secondary_color }} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{template.pillar2_title}</h3>
                          <p className="text-sm opacity-60">{template.pillar2_subtitle}</p>
                        </div>
                      </div>
                      <ul className="space-y-3">
                        {template.pillar2_items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: template.secondary_color }} />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Combined */}
                  <div className="mt-8 p-6 rounded-xl text-center max-w-3xl mx-auto" style={{ backgroundColor: `${template.accent_color}15`, border: `1px solid ${template.accent_color}30` }}>
                    <h3 className="text-xl font-semibold mb-2">{template.combined_headline}</h3>
                    <p className="opacity-80">{template.combined_text}</p>
                  </div>
                </section>

                {/* Case Studies Section */}
                {template.case_studies.length > 0 && (
                  <section id="preview-case-studies" className="py-16 px-6 scroll-mt-4">
                    <div className="text-center mb-12">
                      <Badge className="mb-4" style={{ backgroundColor: `${template.accent_color}20`, color: template.accent_color, borderColor: `${template.accent_color}30` }}>
                        {template.case_studies_badge}
                      </Badge>
                      <h2 className="text-3xl font-bold mb-4">{template.case_studies_headline.replace("{{first_name}}", firstName)}</h2>
                      <p className="opacity-70">{template.case_studies_subheadline}</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                      {template.case_studies.map((study, index) => (
                        <div key={index} className="rounded-xl p-6 border" style={{ backgroundColor: `${template.accent_color}08`, borderColor: `${template.accent_color}20` }}>
                          <div className="flex items-center gap-1 mb-3">
                            {[...Array(study.rating)].map((_, i) => (
                              <Star key={i} className="w-4 h-4 fill-current" style={{ color: template.accent_color }} />
                            ))}
                          </div>
                          <h3 className="font-semibold mb-1">{study.title}</h3>
                          <p className="text-xs opacity-60 mb-3">{study.company_type}</p>
                          <div className="flex items-center gap-2 mb-3 text-sm">
                            <span className="line-through opacity-50">{study.before_revenue}</span>
                            <span>→</span>
                            <span className="font-semibold" style={{ color: template.primary_color }}>{study.after_revenue}</span>
                            <span className="text-xs opacity-60">{study.timeframe}</span>
                          </div>
                          <p className="text-sm opacity-80">{study.description}</p>
                          {study.video_url && (
                            <div className="mt-4 aspect-video rounded-lg overflow-hidden flex items-center justify-center cursor-pointer transition-colors" style={{ backgroundColor: `${template.text_color}12` }}>
                              <div className="p-3 rounded-full" style={{ backgroundColor: `${template.primary_color}30` }}>
                                <Play className="w-6 h-6" style={{ color: template.primary_color }} />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Comparison Section Preview */}
                <section id="preview-comparison" ref={comparisonSectionRef} className="py-16 px-6 scroll-mt-4" style={{ backgroundColor: `${template.secondary_color}05` }}>
                  <div className="text-center mb-12">
                    <Badge className="mb-4" style={{ backgroundColor: `${template.secondary_color}20`, color: template.secondary_color, borderColor: `${template.secondary_color}30` }}>
                      {template.comparison_badge}
                    </Badge>
                    <h2 className="text-3xl font-bold mb-4">{template.comparison_headline}</h2>
                    <p className="opacity-70">{template.comparison_subheadline}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Others */}
                    <div className="rounded-xl p-6 border border-destructive/20 bg-destructive/5">
                      <h3 className="font-semibold text-destructive mb-4 flex items-center gap-2">
                        <X className="w-5 h-5" />
                        {template.others_title}
                      </h3>
                      <ul className="space-y-3">
                        {template.others_items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm opacity-80">
                            <X className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Us */}
                    <div className="rounded-xl p-6 border border-emerald-500/20 bg-emerald-500/5">
                      <h3 className="font-semibold text-emerald-500 mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        {template.us_title}
                      </h3>
                      <ul className="space-y-3">
                        {template.us_items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Testimonials Section */}
                {template.testimonials && template.testimonials.length > 0 && (
                  <section id="preview-testimonials" className="py-16 px-6 scroll-mt-4">
                    <div className="text-center mb-12">
                      <Badge className="mb-4" style={{ backgroundColor: `${template.primary_color}20`, color: template.primary_color, borderColor: `${template.primary_color}30` }}>
                        {template.testimonials_badge}
                      </Badge>
                      <h2 className="text-3xl font-bold mb-4">{template.testimonials_headline}</h2>
                      <p className="opacity-70">{template.testimonials_subheadline}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                      {template.testimonials.map((testimonial, index) => (
                        <div 
                          key={index} 
                          className="rounded-xl p-6 border"
                          style={{ borderColor: `${template.primary_color}20`, backgroundColor: `${template.primary_color}05` }}
                        >
                          <p className="italic text-lg mb-4 opacity-90">"{testimonial.quote}"</p>
                          <div className="flex items-center gap-3">
                            {testimonial.image_url ? (
                              <img
                                src={testimonial.image_url}
                                alt={testimonial.author}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                                style={{ backgroundColor: template.primary_color, color: template.background_color }}
                              >
                                {testimonial.author.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold">{testimonial.author}</p>
                              <p className="text-sm opacity-60">{testimonial.role}, {testimonial.company}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Guarantee Section */}
                <section id="preview-guarantee" className="py-16 px-6 scroll-mt-4" style={{ backgroundColor: `${template.accent_color}08` }}>
                  <div className="text-center mb-12">
                    <Badge className="mb-4" style={{ backgroundColor: `${template.accent_color}20`, color: template.accent_color, borderColor: `${template.accent_color}30` }}>
                      {template.guarantee_badge}
                    </Badge>
                    <h2 className="text-3xl font-bold mb-4">{template.guarantee_headline}</h2>
                    <p className="opacity-70 max-w-2xl mx-auto">{template.guarantee_description}</p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
                    {template.guarantee_items.map((item, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-2 px-4 py-2 rounded-full border"
                        style={{ borderColor: `${template.accent_color}30`, backgroundColor: `${template.accent_color}10` }}
                      >
                        <CheckCircle className="w-5 h-5" style={{ color: template.accent_color }} />
                        <span className="text-sm font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* FAQ Section */}
                {template.faq_items && template.faq_items.length > 0 && (
                  <section id="preview-faq" className="py-16 px-6 scroll-mt-4" style={{ backgroundColor: `${template.primary_color}05` }}>
                    <div className="text-center mb-12">
                      <Badge className="mb-4" style={{ backgroundColor: `${template.primary_color}20`, color: template.primary_color, borderColor: `${template.primary_color}30` }}>
                        {template.faq_badge}
                      </Badge>
                      <h2 className="text-3xl font-bold mb-4">{template.faq_headline}</h2>
                      <p className="opacity-70">{template.faq_subheadline}</p>
                    </div>

                    <div className="space-y-4 max-w-3xl mx-auto">
                      {template.faq_items.map((faq, index) => (
                        <div 
                          key={index}
                          className="rounded-xl p-6 border"
                          style={{ borderColor: `${template.primary_color}20`, backgroundColor: `${template.background_color}` }}
                        >
                          <h4 className="font-semibold text-lg mb-2" style={{ color: template.primary_color }}>
                            {faq.question}
                          </h4>
                          <p className="opacity-75">{faq.answer}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* CTA Section with Calendar */}
                <section 
                  id="preview-cta" 
                  className="py-16 px-6 text-center scroll-mt-4"
                  style={{ 
                    background: `linear-gradient(135deg, ${template.primary_color} 0%, ${template.secondary_color} 100%)`,
                    color: '#fff'
                  }}
                >
                  <div className="max-w-3xl mx-auto">
                    <Calendar className="w-12 h-12 mx-auto mb-6 opacity-80" />
                    <h2 className="text-3xl font-bold mb-4">
                      {template.cta_headline.replace("{{first_name}}", firstName)}
                    </h2>
                    <p className="text-lg opacity-90 mb-8">
                      {template.cta_description}
                    </p>
                    <div
                      className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg cursor-pointer hover:scale-105 transition-transform"
                      style={{ backgroundColor: template.accent_color, color: '#fff' }}
                    >
                      <Calendar className="w-5 h-5" />
                      {template.cta_button_text}
                    </div>
                    <p className="text-sm opacity-60 mt-4">Unverbindlich & kostenlos</p>
                  </div>
                </section>

                {/* Footer Preview */}
                <footer id="preview-colors" ref={footerSectionRef} className="py-8 px-6 border-t text-center scroll-mt-4" style={{ borderColor: `${template.text_color}15` }}>
                  <p className="text-sm opacity-60 mb-3">
                    © {new Date().getFullYear()} {template.footer_company_name}. {template.footer_tagline}
                  </p>
                  <div className="flex items-center justify-center gap-4 text-xs opacity-50">
                    {template.footer_impressum_url && (
                      <a href={template.footer_impressum_url} target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity">
                        Impressum
                      </a>
                    )}
                    {template.footer_datenschutz_url && (
                      <a href={template.footer_datenschutz_url} target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity">
                        Datenschutz
                      </a>
                    )}
                  </div>
                </footer>
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Editor Panel */}
        <div className={`${activeView === "preview" ? "hidden" : ""} lg:block`}>
          <div className="relative overflow-hidden rounded-[2rem] backdrop-blur-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/[0.02] via-transparent to-primary/[0.02] pointer-events-none" />
            
            {/* Editor Header */}
            <div className="relative z-10 p-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/20">
                  <Brush className="w-4 h-4 text-secondary" />
                </div>
                <span className="font-medium text-foreground">Design anpassen</span>
              </div>
            </div>

            <div className="relative z-10 p-5 space-y-5">
              {/* AI Customization - Premium Look */}
              <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 border border-primary/20 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                      <Wand2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">KI-Assistent</h3>
                      <p className="text-xs text-muted-foreground">Beschreibe deine Änderungen</p>
                    </div>
                  </div>
                  
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="z.B. 'Passe die Seite für eine Immobilienmakler-Agentur an, die sich auf Luxusimmobilien spezialisiert hat.'"
                    className="min-h-[80px] bg-white/[0.03] border-white/10 rounded-xl mb-4 focus:border-primary/50 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                  />
                  
                  <Button 
                    onClick={handleAICustomize} 
                    disabled={isGenerating || !aiPrompt.trim()}
                    className="w-full gap-2 rounded-xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:from-primary/90 hover:via-primary/80 hover:to-primary/70 shadow-[0_0_25px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:shadow-none"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        KI arbeitet...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Mit KI anpassen
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Editor Tabs with Liquid Glass */}
              <Tabs value={activeEditorTab} onValueChange={handleEditorTabChange} className="w-full">
                <TabsList className="w-full flex flex-wrap h-auto gap-1.5 p-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  {[
                    { value: "branding", icon: ImageIcon, label: "Branding" },
                    { value: "hero", icon: Layout, label: "Hero" },
                    { value: "coaching", icon: Users, label: "Coaching" },
                    { value: "comparison", icon: Star, label: "Vergleich" },
                    { value: "case-studies", icon: Trophy, label: "Fallstudien" },
                    { value: "testimonials", icon: Users, label: "Testimonials" },
                    { value: "colors", icon: Palette, label: "Farben" },
                  ].map((tab) => (
                    <TabsTrigger 
                      key={tab.value} 
                      value={tab.value} 
                      className="flex-1 gap-1.5 text-xs rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-white/10 data-[state=active]:to-white/5 data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:shadow-[0_2px_10px_rgba(0,0,0,0.2)] transition-all duration-200"
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <ScrollArea className="h-[calc(100vh-420px)] min-h-[400px] mt-4 pr-3">
                  {/* Branding Tab */}
                  <TabsContent value="branding" className="space-y-4 m-0">
                    <div className="space-y-4">
                      {/* Logo Upload */}
                      <div className="rounded-xl p-4 bg-white/[0.03] border border-white/[0.06]">
                        <label className="text-sm font-medium text-foreground mb-3 block">Logo</label>
                        {template.header_logo_url ? (
                          <div className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                            <img src={template.header_logo_url} alt="Logo" className="h-14 w-auto object-contain" />
                            <div className="flex-1">
                              <p className="text-sm text-muted-foreground">Logo aktiv</p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={removeLogo}
                              className="rounded-xl hover:bg-red-500/10 hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className={`p-6 rounded-xl border-2 border-dashed transition-all duration-300 ${
                              isDragging 
                                ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(6,182,212,0.2)]" 
                                : "border-white/20 hover:border-white/40 hover:bg-white/[0.02]"
                            }`}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                          >
                            <div className="flex flex-col items-center gap-3 text-center">
                              {uploading ? (
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                              ) : (
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                                  <Upload className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  {uploading ? "Wird hochgeladen..." : "Logo hierher ziehen"}
                                </p>
                                {!uploading && (
                                  <label className="cursor-pointer">
                                    <span className="text-primary hover:underline text-sm">oder Datei auswählen</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={handleFileSelect}
                                    />
                                  </label>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground/60">PNG, JPG bis 5MB</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Company Info */}
                      <div className="grid gap-4">
                        <div className="rounded-xl p-4 bg-white/[0.03] border border-white/[0.06]">
                          <label className="text-sm font-medium text-foreground mb-2 block">Firmenname</label>
                          <Input
                            value={template.footer_company_name}
                            onChange={(e) => setTemplate({ ...template, footer_company_name: e.target.value })}
                            className="bg-white/[0.03] border-white/10 rounded-xl focus:border-primary/50"
                          />
                        </div>
                        <div className="rounded-xl p-4 bg-white/[0.03] border border-white/[0.06]">
                          <label className="text-sm font-medium text-foreground mb-2 block">Tagline</label>
                          <Input
                            value={template.footer_tagline}
                            onChange={(e) => setTemplate({ ...template, footer_tagline: e.target.value })}
                            className="bg-white/[0.03] border-white/10 rounded-xl focus:border-primary/50"
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Hero Tab */}
                  <TabsContent value="hero" className="space-y-4 m-0">
                    <div className="space-y-4">
                      <div className="rounded-xl p-4 bg-white/[0.03] border border-white/[0.06]">
                        <label className="text-sm font-medium text-foreground mb-2 block">Hero Headline</label>
                        <Input
                          value={template.hero_headline}
                          onChange={(e) => setTemplate({ ...template, hero_headline: e.target.value })}
                          className="bg-white/[0.03] border-white/10 rounded-xl"
                        />
                        <p className="text-xs text-muted-foreground/60 mt-2">Nutze {"{{first_name}}"} für Personalisierung</p>
                      </div>
                      
                      <div className="rounded-xl p-4 bg-white/[0.03] border border-white/[0.06]">
                        <label className="text-sm font-medium text-foreground mb-2 block">Subheadline</label>
                        <Textarea
                          value={template.hero_subheadline}
                          onChange={(e) => setTemplate({ ...template, hero_subheadline: e.target.value })}
                          className="bg-white/[0.03] border-white/10 rounded-xl min-h-[80px]"
                        />
                        <p className="text-xs text-muted-foreground/60 mt-2">Nutze {"{{company}}"} für Firmenname</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl p-4 bg-white/[0.03] border border-white/[0.06]">
                          <label className="text-sm font-medium text-foreground mb-2 block">CTA Button</label>
                          <Input
                            value={template.hero_cta_text}
                            onChange={(e) => setTemplate({ ...template, hero_cta_text: e.target.value })}
                            className="bg-white/[0.03] border-white/10 rounded-xl"
                          />
                        </div>
                        <div className="rounded-xl p-4 bg-white/[0.03] border border-white/[0.06]">
                          <label className="text-sm font-medium text-foreground mb-2 block">Header CTA</label>
                          <Input
                            value={template.header_cta_text}
                            onChange={(e) => setTemplate({ ...template, header_cta_text: e.target.value })}
                            className="bg-white/[0.03] border-white/10 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="rounded-xl p-4 bg-white/[0.03] border border-white/[0.06]">
                        <label className="text-sm font-medium text-foreground mb-2 block">Kalender URL</label>
                        <Input
                          value={template.calendar_url}
                          onChange={(e) => setTemplate({ ...template, calendar_url: e.target.value })}
                          placeholder="https://calendly.com/..."
                          className="bg-white/[0.03] border-white/10 rounded-xl"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Coaching Tab */}
                  <TabsContent value="coaching" className="space-y-4 m-0">
                    <div className="space-y-4">
                      <div className="rounded-xl p-4 bg-white/[0.03] border border-white/[0.06]">
                        <label className="text-sm font-medium text-foreground mb-2 block">Coaching Headline</label>
                        <Input
                          value={template.coaching_headline}
                          onChange={(e) => setTemplate({ ...template, coaching_headline: e.target.value })}
                          className="bg-white/[0.03] border-white/10 rounded-xl"
                        />
                      </div>

                      {/* Pillar 1 */}
                      <div className="rounded-xl p-4 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 rounded-lg bg-cyan-500/20">
                            <Megaphone className="w-4 h-4 text-cyan-400" />
                          </div>
                          <span className="font-medium text-foreground">Säule 1: Outreach</span>
                        </div>
                        <div className="space-y-3">
                          <Input
                            value={template.pillar1_title}
                            onChange={(e) => setTemplate({ ...template, pillar1_title: e.target.value })}
                            placeholder="Titel"
                            className="bg-white/[0.03] border-white/10 rounded-xl"
                          />
                          <div className="space-y-2">
                            {template.pillar1_items.map((item, i) => (
                              <div key={i} className="flex gap-2">
                                <Input
                                  value={item}
                                  onChange={(e) => updateListItem("pillar1_items", i, e.target.value)}
                                  className="flex-1 bg-white/[0.03] border-white/10 rounded-xl text-sm"
                                />
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => removeListItem("pillar1_items", i)}
                                  className="rounded-xl hover:bg-red-500/10 hover:text-red-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ))}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => addListItem("pillar1_items")} 
                              className="w-full rounded-xl border-dashed border-white/20 hover:border-cyan-500/50 hover:bg-cyan-500/10"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1.5" /> Punkt hinzufügen
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Pillar 2 */}
                      <div className="rounded-xl p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 rounded-lg bg-purple-500/20">
                            <Pen className="w-4 h-4 text-purple-400" />
                          </div>
                          <span className="font-medium text-foreground">Säule 2: Content</span>
                        </div>
                        <div className="space-y-3">
                          <Input
                            value={template.pillar2_title}
                            onChange={(e) => setTemplate({ ...template, pillar2_title: e.target.value })}
                            placeholder="Titel"
                            className="bg-white/[0.03] border-white/10 rounded-xl"
                          />
                          <div className="space-y-2">
                            {template.pillar2_items.map((item, i) => (
                              <div key={i} className="flex gap-2">
                                <Input
                                  value={item}
                                  onChange={(e) => updateListItem("pillar2_items", i, e.target.value)}
                                  className="flex-1 bg-white/[0.03] border-white/10 rounded-xl text-sm"
                                />
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => removeListItem("pillar2_items", i)}
                                  className="rounded-xl hover:bg-red-500/10 hover:text-red-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ))}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => addListItem("pillar2_items")} 
                              className="w-full rounded-xl border-dashed border-white/20 hover:border-purple-500/50 hover:bg-purple-500/10"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1.5" /> Punkt hinzufügen
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Comparison Tab */}
                  <TabsContent value="comparison" className="space-y-4 m-0">
                    <div className="space-y-4">
                      <div className="rounded-xl p-4 bg-white/[0.03] border border-white/[0.06]">
                        <label className="text-sm font-medium text-foreground mb-2 block">Vergleichs-Headline</label>
                        <Input
                          value={template.comparison_headline}
                          onChange={(e) => setTemplate({ ...template, comparison_headline: e.target.value })}
                          className="bg-white/[0.03] border-white/10 rounded-xl"
                        />
                      </div>

                      {/* Others */}
                      <div className="rounded-xl p-4 bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 rounded-lg bg-red-500/20">
                            <X className="w-4 h-4 text-red-400" />
                          </div>
                          <span className="font-medium text-foreground">Andere Anbieter</span>
                        </div>
                        <div className="space-y-2">
                          {template.others_items.map((item, i) => (
                            <div key={i} className="flex gap-2">
                              <Input
                                value={item}
                                onChange={(e) => updateListItem("others_items", i, e.target.value)}
                                className="flex-1 bg-white/[0.03] border-white/10 rounded-xl text-sm"
                              />
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeListItem("others_items", i)}
                                className="rounded-xl hover:bg-red-500/10 hover:text-red-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ))}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => addListItem("others_items")} 
                            className="w-full rounded-xl border-dashed border-white/20 hover:border-red-500/50 hover:bg-red-500/10"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> Punkt hinzufügen
                          </Button>
                        </div>
                      </div>

                      {/* Us */}
                      <div className="rounded-xl p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 rounded-lg bg-emerald-500/20">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          </div>
                          <span className="font-medium text-foreground">Unser Coaching</span>
                        </div>
                        <div className="space-y-2">
                          {template.us_items.map((item, i) => (
                            <div key={i} className="flex gap-2">
                              <Input
                                value={item}
                                onChange={(e) => updateListItem("us_items", i, e.target.value)}
                                className="flex-1 bg-white/[0.03] border-white/10 rounded-xl text-sm"
                              />
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeListItem("us_items", i)}
                                className="rounded-xl hover:bg-red-500/10 hover:text-red-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ))}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => addListItem("us_items")} 
                            className="w-full rounded-xl border-dashed border-white/20 hover:border-emerald-500/50 hover:bg-emerald-500/10"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> Punkt hinzufügen
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Case Studies Tab */}
                  <TabsContent value="case-studies" className="space-y-4 m-0">
                    <div className="space-y-4">
                      {/* Section Headlines */}
                      <div className="rounded-xl p-4 bg-white/[0.03] border border-white/[0.06]">
                        <label className="text-sm font-medium text-foreground mb-3 block">Sektion Überschriften</label>
                        <div className="space-y-3">
                          <Input
                            value={template.case_studies_badge}
                            onChange={(e) => setTemplate({ ...template, case_studies_badge: e.target.value })}
                            placeholder="Badge (z.B. Erfolgsgeschichten)"
                            className="bg-white/[0.03] border-white/10 rounded-xl"
                          />
                          <Input
                            value={template.case_studies_headline}
                            onChange={(e) => setTemplate({ ...template, case_studies_headline: e.target.value })}
                            placeholder="Headline"
                            className="bg-white/[0.03] border-white/10 rounded-xl"
                          />
                          <Input
                            value={template.case_studies_subheadline}
                            onChange={(e) => setTemplate({ ...template, case_studies_subheadline: e.target.value })}
                            placeholder="Subheadline"
                            className="bg-white/[0.03] border-white/10 rounded-xl"
                          />
                        </div>
                      </div>

                      {/* Individual Case Studies */}
                      {template.case_studies.map((study, index) => (
                        <div 
                          key={index} 
                          className="rounded-xl p-4 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-amber-500/20">
                                <Trophy className="w-4 h-4 text-amber-400" />
                              </div>
                              <span className="font-medium text-foreground">Fallstudie {index + 1}</span>
                            </div>
                            {template.case_studies.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const newStudies = template.case_studies.filter((_, i) => i !== index);
                                  setTemplate({ ...template, case_studies: newStudies });
                                }}
                                className="rounded-xl hover:bg-red-500/10 hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <Input
                                value={study.title}
                                onChange={(e) => {
                                  const newStudies = [...template.case_studies];
                                  newStudies[index] = { ...study, title: e.target.value };
                                  setTemplate({ ...template, case_studies: newStudies });
                                }}
                                placeholder="Name/Firma"
                                className="bg-white/[0.03] border-white/10 rounded-xl"
                              />
                              <Input
                                value={study.company_type}
                                onChange={(e) => {
                                  const newStudies = [...template.case_studies];
                                  newStudies[index] = { ...study, company_type: e.target.value };
                                  setTemplate({ ...template, case_studies: newStudies });
                                }}
                                placeholder="Branche/Typ"
                                className="bg-white/[0.03] border-white/10 rounded-xl"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <Input
                                value={study.before_revenue}
                                onChange={(e) => {
                                  const newStudies = [...template.case_studies];
                                  newStudies[index] = { ...study, before_revenue: e.target.value };
                                  setTemplate({ ...template, case_studies: newStudies });
                                }}
                                placeholder="Vorher"
                                className="bg-white/[0.03] border-white/10 rounded-xl text-sm"
                              />
                              <Input
                                value={study.after_revenue}
                                onChange={(e) => {
                                  const newStudies = [...template.case_studies];
                                  newStudies[index] = { ...study, after_revenue: e.target.value };
                                  setTemplate({ ...template, case_studies: newStudies });
                                }}
                                placeholder="Nachher"
                                className="bg-white/[0.03] border-white/10 rounded-xl text-sm"
                              />
                              <Input
                                value={study.timeframe}
                                onChange={(e) => {
                                  const newStudies = [...template.case_studies];
                                  newStudies[index] = { ...study, timeframe: e.target.value };
                                  setTemplate({ ...template, case_studies: newStudies });
                                }}
                                placeholder="Zeitraum"
                                className="bg-white/[0.03] border-white/10 rounded-xl text-sm"
                              />
                            </div>
                            <Textarea
                              value={study.description}
                              onChange={(e) => {
                                const newStudies = [...template.case_studies];
                                newStudies[index] = { ...study, description: e.target.value };
                                setTemplate({ ...template, case_studies: newStudies });
                              }}
                              placeholder="Beschreibung der Erfolgsgeschichte"
                              className="bg-white/[0.03] border-white/10 rounded-xl min-h-[60px]"
                            />
                            <div className="flex items-center gap-2">
                              <Video className="w-4 h-4 text-muted-foreground" />
                              <Input
                                value={study.video_url}
                                onChange={(e) => {
                                  const newStudies = [...template.case_studies];
                                  newStudies[index] = { ...study, video_url: e.target.value };
                                  setTemplate({ ...template, case_studies: newStudies });
                                }}
                                placeholder="YouTube Embed URL (optional)"
                                className="flex-1 bg-white/[0.03] border-white/10 rounded-xl text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Add Case Study Button */}
                      <Button
                        variant="outline"
                        onClick={() => {
                          const newStudy: CaseStudy = {
                            title: "Neue Fallstudie",
                            company_type: "Branche",
                            before_revenue: "0€",
                            after_revenue: "10.000€",
                            timeframe: "in 30 Tagen",
                            description: "Beschreibung der Erfolgsgeschichte",
                            video_url: "",
                            rating: 5
                          };
                          setTemplate({ ...template, case_studies: [...template.case_studies, newStudy] });
                        }}
                        className="w-full rounded-xl border-dashed border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/10"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Fallstudie hinzufügen
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Testimonials Tab */}
                  <TabsContent value="testimonials" className="space-y-4 m-0">
                    <div className="space-y-4">
                      <div className="rounded-xl p-4 bg-white/[0.03] border border-white/[0.06] space-y-3">
                        <label className="text-sm font-medium text-foreground block">Abschnitts-Einstellungen</label>
                        <div>
                          <label className="text-xs text-muted-foreground">Badge</label>
                          <Input
                            value={template.testimonials_badge}
                            onChange={(e) => setTemplate({ ...template, testimonials_badge: e.target.value })}
                            className="mt-1 bg-white/[0.03] border-white/10 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Überschrift</label>
                          <Input
                            value={template.testimonials_headline}
                            onChange={(e) => setTemplate({ ...template, testimonials_headline: e.target.value })}
                            className="mt-1 bg-white/[0.03] border-white/10 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Unterüberschrift</label>
                          <Input
                            value={template.testimonials_subheadline}
                            onChange={(e) => setTemplate({ ...template, testimonials_subheadline: e.target.value })}
                            className="mt-1 bg-white/[0.03] border-white/10 rounded-xl"
                          />
                        </div>
                      </div>

                      {template.testimonials.map((testimonial, tIdx) => (
                        <div key={tIdx} className="rounded-xl p-4 bg-white/[0.03] border border-white/[0.06] space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Testimonial {tIdx + 1}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                const updated = template.testimonials.filter((_, i) => i !== tIdx);
                                setTemplate({ ...template, testimonials: updated });
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Image Upload */}
                          <div>
                            <label className="text-xs text-muted-foreground">Profilbild</label>
                            {testimonial.image_url ? (
                              <div className="mt-1 flex items-center gap-3">
                                <img
                                  src={testimonial.image_url}
                                  alt={testimonial.author}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs text-destructive hover:text-destructive"
                                  onClick={() => {
                                    const updated = [...template.testimonials];
                                    updated[tIdx] = { ...updated[tIdx], image_url: "" };
                                    setTemplate({ ...template, testimonials: updated });
                                  }}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Entfernen
                                </Button>
                              </div>
                            ) : (
                              <div className="mt-1">
                                <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl border border-dashed border-white/20 hover:border-white/40 bg-white/[0.02] transition-colors">
                                  <Upload className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">Bild hochladen</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file || !accountId) return;
                                      if (!file.type.startsWith("image/")) {
                                        toast.error("Bitte nur Bilddateien hochladen");
                                        return;
                                      }
                                      if (file.size > 5 * 1024 * 1024) {
                                        toast.error("Datei ist zu groß (max. 5MB)");
                                        return;
                                      }
                                      try {
                                        const fileExt = file.name.split(".").pop();
                                        const fileName = `${accountId}/testimonial-${tIdx}-${Date.now()}.${fileExt}`;
                                        const { error: uploadError } = await supabase.storage
                                          .from("account-logos")
                                          .upload(fileName, file, { upsert: true });
                                        if (uploadError) throw uploadError;
                                        const { data: { publicUrl } } = supabase.storage
                                          .from("account-logos")
                                          .getPublicUrl(fileName);
                                        const updated = [...template.testimonials];
                                        updated[tIdx] = { ...updated[tIdx], image_url: publicUrl };
                                        setTemplate({ ...template, testimonials: updated });
                                        toast.success("Bild hochgeladen!");
                                      } catch (error: any) {
                                        console.error("Upload error:", error);
                                        toast.error(error.message || "Fehler beim Hochladen");
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="text-xs text-muted-foreground">Zitat</label>
                            <Textarea
                              value={testimonial.quote}
                              onChange={(e) => {
                                const updated = [...template.testimonials];
                                updated[tIdx] = { ...updated[tIdx], quote: e.target.value };
                                setTemplate({ ...template, testimonials: updated });
                              }}
                              className="mt-1 bg-white/[0.03] border-white/10 rounded-xl"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground">Name</label>
                              <Input
                                value={testimonial.author}
                                onChange={(e) => {
                                  const updated = [...template.testimonials];
                                  updated[tIdx] = { ...updated[tIdx], author: e.target.value };
                                  setTemplate({ ...template, testimonials: updated });
                                }}
                                className="mt-1 bg-white/[0.03] border-white/10 rounded-xl"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Position</label>
                              <Input
                                value={testimonial.role}
                                onChange={(e) => {
                                  const updated = [...template.testimonials];
                                  updated[tIdx] = { ...updated[tIdx], role: e.target.value };
                                  setTemplate({ ...template, testimonials: updated });
                                }}
                                className="mt-1 bg-white/[0.03] border-white/10 rounded-xl"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Firma</label>
                              <Input
                                value={testimonial.company}
                                onChange={(e) => {
                                  const updated = [...template.testimonials];
                                  updated[tIdx] = { ...updated[tIdx], company: e.target.value };
                                  setTemplate({ ...template, testimonials: updated });
                                }}
                                className="mt-1 bg-white/[0.03] border-white/10 rounded-xl"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      <Button
                        variant="outline"
                        className="w-full gap-2 rounded-xl border-dashed border-white/20 hover:border-white/40 bg-white/[0.02]"
                        onClick={() => {
                          setTemplate({
                            ...template,
                            testimonials: [...template.testimonials, { quote: "", author: "", role: "", company: "", image_url: "" }],
                          });
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        Testimonial hinzufügen
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Colors Tab */}
                  <TabsContent value="colors" className="space-y-4 m-0">
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { key: "primary_color", label: "Primärfarbe", gradient: "from-cyan-500/20 to-cyan-500/5" },
                        { key: "secondary_color", label: "Sekundärfarbe", gradient: "from-purple-500/20 to-purple-500/5" },
                        { key: "background_color", label: "Hintergrund", gradient: "from-slate-500/20 to-slate-500/5" },
                        { key: "text_color", label: "Textfarbe", gradient: "from-white/20 to-white/5" },
                        { key: "accent_color", label: "Akzentfarbe", gradient: "from-amber-500/20 to-amber-500/5" },
                      ].map((color) => (
                        <div 
                          key={color.key} 
                          className={`rounded-xl p-4 bg-gradient-to-br ${color.gradient} border border-white/[0.08]`}
                        >
                          <label className="text-sm font-medium text-foreground mb-3 block">{color.label}</label>
                          <div className="flex gap-3 items-center">
                            <div className="relative">
                              <input
                                type="color"
                                value={(template as any)[color.key]}
                                onChange={(e) => setTemplate({ ...template, [color.key]: e.target.value })}
                                className="w-12 h-12 rounded-xl cursor-pointer border-2 border-white/20 overflow-hidden"
                                style={{ backgroundColor: (template as any)[color.key] }}
                              />
                              <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20 pointer-events-none" />
                            </div>
                            <Input
                              value={(template as any)[color.key]}
                              onChange={(e) => setTemplate({ ...template, [color.key]: e.target.value })}
                              className="bg-white/[0.03] border-white/10 rounded-xl text-sm font-mono"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
      {/* Fullscreen Preview Modal */}
      <Dialog open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 overflow-hidden bg-transparent border-0">
          <div className="relative w-full h-full overflow-hidden rounded-[2rem] backdrop-blur-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/[0.1] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            {/* Header */}
            <div className="relative z-10 p-4 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                </div>
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground font-mono">/p/lead-slug</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  <Eye className="w-3 h-3 mr-1" />
                  Vollbild-Vorschau
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsFullscreenOpen(false)}
                  className="rounded-xl hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Fullscreen Content */}
            <ScrollArea 
              className="h-[calc(95vh-80px)]" 
              style={{ 
                backgroundColor: template.background_color,
                color: template.text_color 
              }}
            >
              <div className="max-w-6xl mx-auto">
                {/* Header Preview */}
                <header className="border-b px-6 py-4" style={{ borderColor: `${template.text_color}15` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {template.header_logo_url ? (
                        <img src={template.header_logo_url} alt="Logo" className="h-10 w-auto object-contain" />
                      ) : (
                        <div className="text-xl font-bold">
                          <span style={{ color: template.primary_color }}>{template.header_logo_accent}</span>
                          {template.header_logo_text.replace(template.header_logo_accent, "")}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm opacity-70">
                      {template.header_nav_items.map((item, i) => (
                        <span key={i} className="hover:opacity-100 cursor-pointer transition-opacity">{item}</span>
                      ))}
                    </div>
                    <div 
                      className="font-semibold px-4 py-2 rounded-lg text-sm cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: template.primary_color, color: template.background_color }}
                    >
                      {template.header_cta_text.replace("{{first_name}}", "Max")}
                    </div>
                  </div>
                </header>

                {/* Hero Section */}
                <section className="py-16 px-6">
                  <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                      <h1 className="text-4xl font-bold leading-tight">
                        {template.hero_headline.replace("{{first_name}}", "Max")}
                      </h1>
                      <p className="text-lg opacity-80 leading-relaxed">
                        {template.hero_subheadline
                          .replace("{{first_name}}", "Max")
                          .replace("{{company}}", "Muster GmbH")}
                      </p>
                      <div 
                        className="inline-flex items-center gap-3 font-semibold px-6 py-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: template.primary_color, color: template.background_color }}
                      >
                        <Calendar className="w-5 h-5" />
                        {template.hero_cta_text}
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute -top-8 right-1/4 text-5xl animate-bounce">👇</div>
                      <div className="rounded-xl overflow-hidden border aspect-video flex items-center justify-center" style={{ backgroundColor: `${template.primary_color}10`, borderColor: `${template.text_color}20` }}>
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: `${template.primary_color}30` }}>
                            <Play className="w-8 h-8" style={{ color: template.primary_color }} />
                          </div>
                          <p className="text-sm opacity-60">Personalisiertes Video</p>
                        </div>
                      </div>
                      <p className="text-center mt-3 opacity-70">
                        {template.hero_video_caption.replace("{{first_name}}", "Max")}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Coaching Section */}
                <section className="py-16 px-6" style={{ backgroundColor: `${template.primary_color}08` }}>
                  <div className="text-center mb-12">
                    <Badge className="mb-4" style={{ backgroundColor: `${template.primary_color}20`, color: template.primary_color, borderColor: `${template.primary_color}30` }}>
                      {template.coaching_badge}
                    </Badge>
                    <h2 className="text-3xl font-bold mb-4">{template.coaching_headline}</h2>
                    <p className="opacity-70 max-w-2xl mx-auto">{template.coaching_subheadline.replace("{{company}}", "Muster GmbH")}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* Pillar 1 */}
                    <div className="rounded-xl p-6 border" style={{ backgroundColor: `${template.primary_color}10`, borderColor: `${template.primary_color}30` }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${template.primary_color}30` }}>
                          <Megaphone className="w-5 h-5" style={{ color: template.primary_color }} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{template.pillar1_title}</h3>
                          <p className="text-sm opacity-60">{template.pillar1_subtitle}</p>
                        </div>
                      </div>
                      <ul className="space-y-3">
                        {template.pillar1_items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: template.primary_color }} />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Pillar 2 */}
                    <div className="rounded-xl p-6 border" style={{ backgroundColor: `${template.secondary_color}10`, borderColor: `${template.secondary_color}30` }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${template.secondary_color}30` }}>
                          <Pen className="w-5 h-5" style={{ color: template.secondary_color }} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{template.pillar2_title}</h3>
                          <p className="text-sm opacity-60">{template.pillar2_subtitle}</p>
                        </div>
                      </div>
                      <ul className="space-y-3">
                        {template.pillar2_items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: template.secondary_color }} />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Combined */}
                  <div className="mt-8 p-6 rounded-xl text-center max-w-3xl mx-auto" style={{ backgroundColor: `${template.accent_color}15`, borderColor: `${template.accent_color}30`, border: `1px solid ${template.accent_color}30` }}>
                    <h3 className="text-xl font-semibold mb-2">{template.combined_headline}</h3>
                    <p className="opacity-80">{template.combined_text}</p>
                  </div>
                </section>

                {/* Case Studies Section */}
                {template.case_studies.length > 0 && (
                  <section className="py-16 px-6">
                    <div className="text-center mb-12">
                      <Badge className="mb-4" style={{ backgroundColor: `${template.accent_color}20`, color: template.accent_color, borderColor: `${template.accent_color}30` }}>
                        {template.case_studies_badge}
                      </Badge>
                      <h2 className="text-3xl font-bold mb-4">{template.case_studies_headline.replace("{{first_name}}", "Max")}</h2>
                      <p className="opacity-70">{template.case_studies_subheadline}</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                      {template.case_studies.map((study, index) => (
                        <div key={index} className="rounded-xl p-6 border" style={{ backgroundColor: `${template.accent_color}08`, borderColor: `${template.accent_color}20` }}>
                          <div className="flex items-center gap-1 mb-3">
                            {[...Array(study.rating)].map((_, i) => (
                              <Star key={i} className="w-4 h-4 fill-current" style={{ color: template.accent_color }} />
                            ))}
                          </div>
                          <h3 className="font-semibold mb-1">{study.title}</h3>
                          <p className="text-xs opacity-60 mb-3">{study.company_type}</p>
                          <div className="flex items-center gap-2 mb-3 text-sm">
                            <span className="line-through opacity-50">{study.before_revenue}</span>
                            <span>→</span>
                            <span className="font-semibold" style={{ color: template.primary_color }}>{study.after_revenue}</span>
                            <span className="text-xs opacity-60">{study.timeframe}</span>
                          </div>
                          <p className="text-sm opacity-80">{study.description}</p>
                          {study.video_url && (
                            <div className="mt-4 aspect-video rounded-lg overflow-hidden flex items-center justify-center" style={{ backgroundColor: `${template.text_color}12` }}>
                              <div className="p-3 rounded-full" style={{ backgroundColor: `${template.primary_color}30` }}>
                                <Play className="w-6 h-6" style={{ color: template.primary_color }} />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Comparison Section */}
                <section className="py-16 px-6" style={{ backgroundColor: `${template.secondary_color}05` }}>
                  <div className="text-center mb-12">
                    <Badge className="mb-4" style={{ backgroundColor: `${template.secondary_color}20`, color: template.secondary_color, borderColor: `${template.secondary_color}30` }}>
                      {template.comparison_badge}
                    </Badge>
                    <h2 className="text-3xl font-bold mb-4">{template.comparison_headline}</h2>
                    <p className="opacity-70">{template.comparison_subheadline}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Others */}
                    <div className="rounded-xl p-6 border border-destructive/20 bg-destructive/5">
                      <h3 className="font-semibold text-destructive mb-4 flex items-center gap-2">
                        <X className="w-5 h-5" />
                        {template.others_title}
                      </h3>
                      <ul className="space-y-3">
                        {template.others_items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm opacity-80">
                            <X className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Us */}
                    <div className="rounded-xl p-6 border border-emerald-500/20 bg-emerald-500/5">
                      <h3 className="font-semibold text-emerald-500 mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        {template.us_title}
                      </h3>
                      <ul className="space-y-3">
                        {template.us_items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Footer */}
                <footer className="py-8 px-6 border-t text-center" style={{ borderColor: `${template.text_color}15` }}>
                  <p className="text-sm opacity-60 mb-3">
                    © {new Date().getFullYear()} {template.footer_company_name}. {template.footer_tagline}
                  </p>
                  <div className="flex items-center justify-center gap-4 text-xs opacity-50">
                    {template.footer_impressum_url && (
                      <a href={template.footer_impressum_url} target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity">
                        Impressum
                      </a>
                    )}
                    {template.footer_datenschutz_url && (
                      <a href={template.footer_datenschutz_url} target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity">
                        Datenschutz
                      </a>
                    )}
                  </div>
                </footer>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};


