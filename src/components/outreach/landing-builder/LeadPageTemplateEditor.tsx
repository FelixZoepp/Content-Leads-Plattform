import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Wand2, Save, Loader2, Palette, Type, Layout, Users, 
  Check, X, Star, Megaphone, Pen, Plus, Trash2, RotateCcw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LeadPageTemplate {
  id?: string;
  name: string;
  is_active: boolean;
  header_logo_text: string;
  header_logo_accent: string;
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
}

const defaultTemplate: LeadPageTemplate = {
  name: "Standard-Vorlage",
  is_active: true,
  header_logo_text: "Content-Leads",
  header_logo_accent: "Content",
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
  footer_datenschutz_url: "https://content-leads.de/datenschutz"
};

interface LeadPageTemplateEditorProps {
  template: LeadPageTemplate;
  onTemplateChange: (template: LeadPageTemplate) => void;
  onSave: () => void;
  isSaving: boolean;
}

export const LeadPageTemplateEditor = ({ 
  template, 
  onTemplateChange, 
  onSave,
  isSaving 
}: LeadPageTemplateEditorProps) => {
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

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
        onTemplateChange({
          ...template,
          ...data.template,
          // Ensure arrays are properly handled
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
    onTemplateChange(defaultTemplate);
    toast.success("Vorlage auf Standard zurückgesetzt");
  };

  const updateListItem = (
    field: "pillar1_items" | "pillar2_items" | "others_items" | "us_items" | "header_nav_items",
    index: number,
    value: string
  ) => {
    const newItems = [...template[field]];
    newItems[index] = value;
    onTemplateChange({ ...template, [field]: newItems });
  };

  const addListItem = (field: "pillar1_items" | "pillar2_items" | "others_items" | "us_items") => {
    onTemplateChange({ ...template, [field]: [...template[field], "Neuer Punkt"] });
  };

  const removeListItem = (field: "pillar1_items" | "pillar2_items" | "others_items" | "us_items", index: number) => {
    const newItems = template[field].filter((_, i) => i !== index);
    onTemplateChange({ ...template, [field]: newItems });
  };

  return (
    <Card className="glass-card border-white/10">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            Lead-Seiten Vorlage bearbeiten
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Zurücksetzen
            </Button>
            <Button onClick={onSave} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Speichern
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Customization */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Mit KI anpassen</h3>
          </div>
          <Textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="z.B. 'Passe die Seite für eine Immobilienmakler-Agentur an, die sich auf Luxusimmobilien spezialisiert hat. Verwende ein elegantes, hochwertiges Design mit Gold-Akzenten.'"
            className="min-h-[100px] bg-white/5 border-white/10 mb-3"
          />
          <Button 
            onClick={handleAICustomize} 
            disabled={isGenerating || !aiPrompt.trim()}
            className="w-full gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                KI passt Vorlage an...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Mit KI anpassen
              </>
            )}
          </Button>
        </div>

        {/* Manual Editor Tabs */}
        <Tabs defaultValue="hero" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-white/5 p-1">
            <TabsTrigger value="hero" className="gap-1 text-xs">
              <Layout className="w-3 h-3" />
              Hero
            </TabsTrigger>
            <TabsTrigger value="coaching" className="gap-1 text-xs">
              <Users className="w-3 h-3" />
              Coaching
            </TabsTrigger>
            <TabsTrigger value="comparison" className="gap-1 text-xs">
              <Star className="w-3 h-3" />
              Vergleich
            </TabsTrigger>
            <TabsTrigger value="colors" className="gap-1 text-xs">
              <Palette className="w-3 h-3" />
              Farben
            </TabsTrigger>
            <TabsTrigger value="footer" className="gap-1 text-xs">
              <Type className="w-3 h-3" />
              Footer
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            {/* Hero Tab */}
            <TabsContent value="hero" className="space-y-4 m-0">
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Logo Text</label>
                  <div className="flex gap-2">
                    <Input
                      value={template.header_logo_accent}
                      onChange={(e) => onTemplateChange({ ...template, header_logo_accent: e.target.value })}
                      placeholder="Akzent"
                      className="w-1/3 bg-white/5 border-white/10"
                    />
                    <Input
                      value={template.header_logo_text}
                      onChange={(e) => onTemplateChange({ ...template, header_logo_text: e.target.value })}
                      placeholder="Vollständiger Name"
                      className="flex-1 bg-white/5 border-white/10"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Hero Headline</label>
                  <Input
                    value={template.hero_headline}
                    onChange={(e) => onTemplateChange({ ...template, hero_headline: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Nutze {"{{first_name}}"} für Personalisierung</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Hero Subheadline</label>
                  <Textarea
                    value={template.hero_subheadline}
                    onChange={(e) => onTemplateChange({ ...template, hero_subheadline: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Nutze {"{{company}}"} für Firmenname</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">CTA Button</label>
                    <Input
                      value={template.hero_cta_text}
                      onChange={(e) => onTemplateChange({ ...template, hero_cta_text: e.target.value })}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Header CTA</label>
                    <Input
                      value={template.header_cta_text}
                      onChange={(e) => onTemplateChange({ ...template, header_cta_text: e.target.value })}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Video Caption</label>
                  <Input
                    value={template.hero_video_caption}
                    onChange={(e) => onTemplateChange({ ...template, hero_video_caption: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Kalender URL</label>
                  <Input
                    value={template.calendar_url}
                    onChange={(e) => onTemplateChange({ ...template, calendar_url: e.target.value })}
                    placeholder="https://calendly.com/..."
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Coaching Tab */}
            <TabsContent value="coaching" className="space-y-4 m-0">
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Badge</label>
                  <Input
                    value={template.coaching_badge}
                    onChange={(e) => onTemplateChange({ ...template, coaching_badge: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Headline</label>
                  <Input
                    value={template.coaching_headline}
                    onChange={(e) => onTemplateChange({ ...template, coaching_headline: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Subheadline</label>
                  <Input
                    value={template.coaching_subheadline}
                    onChange={(e) => onTemplateChange({ ...template, coaching_subheadline: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>

                {/* Pillar 1 */}
                <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Megaphone className="w-4 h-4 text-cyan-400" />
                    <span className="font-medium text-sm">Säule 1</span>
                  </div>
                  <div className="space-y-2">
                    <Input
                      value={template.pillar1_title}
                      onChange={(e) => onTemplateChange({ ...template, pillar1_title: e.target.value })}
                      placeholder="Titel"
                      className="bg-white/5 border-white/10"
                    />
                    <Input
                      value={template.pillar1_subtitle}
                      onChange={(e) => onTemplateChange({ ...template, pillar1_subtitle: e.target.value })}
                      placeholder="Untertitel"
                      className="bg-white/5 border-white/10"
                    />
                    <Textarea
                      value={template.pillar1_description}
                      onChange={(e) => onTemplateChange({ ...template, pillar1_description: e.target.value })}
                      placeholder="Beschreibung"
                      className="bg-white/5 border-white/10"
                    />
                    <div className="space-y-1">
                      {template.pillar1_items.map((item, i) => (
                        <div key={i} className="flex gap-2">
                          <Input
                            value={item}
                            onChange={(e) => updateListItem("pillar1_items", i, e.target.value)}
                            className="flex-1 bg-white/5 border-white/10 text-sm"
                          />
                          <Button variant="ghost" size="icon" onClick={() => removeListItem("pillar1_items", i)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => addListItem("pillar1_items")} className="gap-1">
                        <Plus className="w-3 h-3" /> Hinzufügen
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Pillar 2 */}
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Pen className="w-4 h-4 text-purple-400" />
                    <span className="font-medium text-sm">Säule 2</span>
                  </div>
                  <div className="space-y-2">
                    <Input
                      value={template.pillar2_title}
                      onChange={(e) => onTemplateChange({ ...template, pillar2_title: e.target.value })}
                      placeholder="Titel"
                      className="bg-white/5 border-white/10"
                    />
                    <Input
                      value={template.pillar2_subtitle}
                      onChange={(e) => onTemplateChange({ ...template, pillar2_subtitle: e.target.value })}
                      placeholder="Untertitel"
                      className="bg-white/5 border-white/10"
                    />
                    <Textarea
                      value={template.pillar2_description}
                      onChange={(e) => onTemplateChange({ ...template, pillar2_description: e.target.value })}
                      placeholder="Beschreibung"
                      className="bg-white/5 border-white/10"
                    />
                    <div className="space-y-1">
                      {template.pillar2_items.map((item, i) => (
                        <div key={i} className="flex gap-2">
                          <Input
                            value={item}
                            onChange={(e) => updateListItem("pillar2_items", i, e.target.value)}
                            className="flex-1 bg-white/5 border-white/10 text-sm"
                          />
                          <Button variant="ghost" size="icon" onClick={() => removeListItem("pillar2_items", i)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => addListItem("pillar2_items")} className="gap-1">
                        <Plus className="w-3 h-3" /> Hinzufügen
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Combined */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Kombinierter Effekt</label>
                  <Input
                    value={template.combined_headline}
                    onChange={(e) => onTemplateChange({ ...template, combined_headline: e.target.value })}
                    placeholder="Headline"
                    className="bg-white/5 border-white/10 mb-2"
                  />
                  <Textarea
                    value={template.combined_text}
                    onChange={(e) => onTemplateChange({ ...template, combined_text: e.target.value })}
                    placeholder="Text"
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Comparison Tab */}
            <TabsContent value="comparison" className="space-y-4 m-0">
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Badge</label>
                  <Input
                    value={template.comparison_badge}
                    onChange={(e) => onTemplateChange({ ...template, comparison_badge: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Headline</label>
                  <Input
                    value={template.comparison_headline}
                    onChange={(e) => onTemplateChange({ ...template, comparison_headline: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Subheadline</label>
                  <Input
                    value={template.comparison_subheadline}
                    onChange={(e) => onTemplateChange({ ...template, comparison_subheadline: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>

                {/* Others */}
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <X className="w-4 h-4 text-red-400" />
                    <Input
                      value={template.others_title}
                      onChange={(e) => onTemplateChange({ ...template, others_title: e.target.value })}
                      className="bg-white/5 border-white/10 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    {template.others_items.map((item, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={item}
                          onChange={(e) => updateListItem("others_items", i, e.target.value)}
                          className="flex-1 bg-white/5 border-white/10 text-sm"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeListItem("others_items", i)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addListItem("others_items")} className="gap-1">
                      <Plus className="w-3 h-3" /> Hinzufügen
                    </Button>
                  </div>
                </div>

                {/* Us */}
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <Input
                      value={template.us_title}
                      onChange={(e) => onTemplateChange({ ...template, us_title: e.target.value })}
                      className="bg-white/5 border-white/10 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    {template.us_items.map((item, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={item}
                          onChange={(e) => updateListItem("us_items", i, e.target.value)}
                          className="flex-1 bg-white/5 border-white/10 text-sm"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeListItem("us_items", i)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addListItem("us_items")} className="gap-1">
                      <Plus className="w-3 h-3" /> Hinzufügen
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Colors Tab */}
            <TabsContent value="colors" className="space-y-4 m-0">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Primärfarbe</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={template.primary_color}
                      onChange={(e) => onTemplateChange({ ...template, primary_color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={template.primary_color}
                      onChange={(e) => onTemplateChange({ ...template, primary_color: e.target.value })}
                      className="flex-1 bg-white/5 border-white/10"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Sekundärfarbe</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={template.secondary_color}
                      onChange={(e) => onTemplateChange({ ...template, secondary_color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={template.secondary_color}
                      onChange={(e) => onTemplateChange({ ...template, secondary_color: e.target.value })}
                      className="flex-1 bg-white/5 border-white/10"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Akzentfarbe</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={template.accent_color}
                      onChange={(e) => onTemplateChange({ ...template, accent_color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={template.accent_color}
                      onChange={(e) => onTemplateChange({ ...template, accent_color: e.target.value })}
                      className="flex-1 bg-white/5 border-white/10"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Hintergrund</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={template.background_color}
                      onChange={(e) => onTemplateChange({ ...template, background_color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={template.background_color}
                      onChange={(e) => onTemplateChange({ ...template, background_color: e.target.value })}
                      className="flex-1 bg-white/5 border-white/10"
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-muted-foreground mb-1 block">Textfarbe</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={template.text_color}
                      onChange={(e) => onTemplateChange({ ...template, text_color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={template.text_color}
                      onChange={(e) => onTemplateChange({ ...template, text_color: e.target.value })}
                      className="flex-1 bg-white/5 border-white/10"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Footer Tab */}
            <TabsContent value="footer" className="space-y-4 m-0">
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Firmenname</label>
                  <Input
                    value={template.footer_company_name}
                    onChange={(e) => onTemplateChange({ ...template, footer_company_name: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Tagline</label>
                  <Input
                    value={template.footer_tagline}
                    onChange={(e) => onTemplateChange({ ...template, footer_tagline: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Impressum Link</label>
                  <Input
                    value={template.footer_impressum_url}
                    onChange={(e) => onTemplateChange({ ...template, footer_impressum_url: e.target.value })}
                    placeholder="https://example.com/impressum"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Datenschutz Link</label>
                  <Input
                    value={template.footer_datenschutz_url}
                    onChange={(e) => onTemplateChange({ ...template, footer_datenschutz_url: e.target.value })}
                    placeholder="https://example.com/datenschutz"
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export { defaultTemplate };
