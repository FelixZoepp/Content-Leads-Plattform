import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { 
  Play, Calendar, Check, X, Star, CheckCircle, Megaphone, Pen, 
  ArrowLeft, Monitor, Eye, Smartphone, Tablet
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { LeadPageTemplate, CaseStudy, FAQItem, Testimonial, defaultTemplate } from "@/components/outreach/landing-builder/LeadPageTemplatePreview";

type DeviceView = "mobile" | "tablet" | "desktop";

const deviceWidths: Record<DeviceView, string> = {
  mobile: "375px",
  tablet: "768px",
  desktop: "100%"
};

const LeadPagePreview = () => {
  const navigate = useNavigate();
  const [template, setTemplate] = useState<LeadPageTemplate>(defaultTemplate);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceView, setDeviceView] = useState<DeviceView>("desktop");

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("id", user.id)
        .single();

      if (!profile?.account_id) {
        setIsLoading(false);
        return;
      }

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
          calendar_url: data.calendar_url || "",
          footer_company_name: data.footer_company_name || account?.company_name || defaultTemplate.footer_company_name,
          footer_tagline: data.footer_tagline || account?.tagline || defaultTemplate.footer_tagline,
          footer_impressum_url: data.footer_impressum_url || defaultTemplate.footer_impressum_url,
          footer_datenschutz_url: data.footer_datenschutz_url || defaultTemplate.footer_datenschutz_url,
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
        setTemplate({ 
          ...defaultTemplate,
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: defaultTemplate.background_color }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Lade Vorschau...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Fixed Control Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
          <Button 
            onClick={() => navigate("/landing-pages")}
            variant="ghost"
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zum Editor
          </Button>

          {/* Device Toggle */}
          <ToggleGroup 
            type="single" 
            value={deviceView} 
            onValueChange={(v) => v && setDeviceView(v as DeviceView)}
            className="bg-muted rounded-lg p-1"
          >
            <ToggleGroupItem value="mobile" aria-label="Mobile" className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3">
              <Smartphone className="w-4 h-4 mr-2" />
              Mobile
            </ToggleGroupItem>
            <ToggleGroupItem value="tablet" aria-label="Tablet" className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3">
              <Tablet className="w-4 h-4 mr-2" />
              Tablet
            </ToggleGroupItem>
            <ToggleGroupItem value="desktop" aria-label="Desktop" className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3">
              <Monitor className="w-4 h-4 mr-2" />
              Desktop
            </ToggleGroupItem>
          </ToggleGroup>

          <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-2">
            <Eye className="w-4 h-4 mr-2" />
            Testseiten-Vorschau
          </Badge>
        </div>
      </div>

      {/* Preview Container with device frame */}
      <div className="pt-20 pb-8 px-4 flex justify-center">
        <div 
          className={`transition-all duration-300 ease-out ${deviceView !== "desktop" ? "shadow-2xl rounded-2xl border-8 border-slate-800 bg-slate-800" : ""}`}
          style={{ 
            width: deviceWidths[deviceView],
            maxWidth: "100%"
          }}
        >
          {/* Device notch for mobile */}
          {deviceView === "mobile" && (
            <div className="bg-slate-800 py-2 flex justify-center">
              <div className="w-24 h-6 bg-black rounded-full" />
            </div>
          )}
          
          <div 
            className={`${deviceView !== "desktop" ? "rounded-b-xl overflow-hidden" : ""}`}
            style={{ backgroundColor: template.background_color, color: template.text_color }}
          >
            <div className={deviceView === "desktop" ? "max-w-6xl mx-auto" : ""}>
        {/* Header */}
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
          <div className="mt-8 p-6 rounded-xl text-center max-w-3xl mx-auto" style={{ backgroundColor: `${template.accent_color}15`, border: `1px solid ${template.accent_color}30` }}>
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

        {/* Testimonials Section */}
        {template.testimonials && template.testimonials.length > 0 && (
          <section className="py-16 px-6">
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
        <section className="py-16 px-6" style={{ backgroundColor: `${template.accent_color}08` }}>
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
          <section className="py-16 px-6" style={{ backgroundColor: `${template.primary_color}05` }}>
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
                  style={{ borderColor: `${template.primary_color}20`, backgroundColor: template.background_color }}
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
          className="py-16 px-6 text-center"
          style={{ 
            background: `linear-gradient(135deg, ${template.primary_color} 0%, ${template.secondary_color} 100%)`,
            color: '#fff'
          }}
        >
          <div className="max-w-3xl mx-auto">
            <Calendar className="w-12 h-12 mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl font-bold mb-4">
              {template.cta_headline.replace("{{first_name}}", "Max")}
            </h2>
            <p className="text-lg opacity-90 mb-8">
              {template.cta_description}
            </p>
            <a
              href={template.calendar_url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg cursor-pointer hover:scale-105 transition-transform"
              style={{ backgroundColor: template.accent_color, color: '#fff' }}
            >
              <Calendar className="w-5 h-5" />
              {template.cta_button_text}
            </a>
            <p className="text-sm opacity-60 mt-4">Unverbindlich & kostenlos</p>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadPagePreview;
