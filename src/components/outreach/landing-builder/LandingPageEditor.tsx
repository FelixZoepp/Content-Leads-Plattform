import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Palette, Type, Layout, MessageSquare, HelpCircle } from "lucide-react";

interface LandingPageContent {
  hero?: {
    headline: string;
    subheadline: string;
    ctaText: string;
    ctaLink: string;
  };
  benefits?: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  features?: Array<{
    title: string;
    description: string;
    bulletPoints: string[];
  }>;
  testimonials?: Array<{
    quote: string;
    author: string;
    company: string;
    role: string;
    image_url?: string;
  }>;
  faq?: Array<{
    question: string;
    answer: string;
  }>;
  cta?: {
    headline: string;
    description: string;
    buttonText: string;
    buttonLink: string;
  };
  footer?: {
    companyName: string;
    tagline: string;
  };
}

interface LandingPageStyles {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
}

interface LandingPageEditorProps {
  content: LandingPageContent;
  styles: LandingPageStyles;
  onContentChange: (content: LandingPageContent) => void;
  onStylesChange: (styles: LandingPageStyles) => void;
}

export const LandingPageEditor = ({
  content,
  styles,
  onContentChange,
  onStylesChange,
}: LandingPageEditorProps) => {
  const updateHero = (field: string, value: string) => {
    onContentChange({
      ...content,
      hero: { ...content.hero!, [field]: value },
    });
  };

  const updateCta = (field: string, value: string) => {
    onContentChange({
      ...content,
      cta: { ...content.cta!, [field]: value },
    });
  };

  const updateFooter = (field: string, value: string) => {
    onContentChange({
      ...content,
      footer: { ...content.footer!, [field]: value },
    });
  };

  const updateBenefit = (index: number, field: string, value: string) => {
    const benefits = [...(content.benefits || [])];
    benefits[index] = { ...benefits[index], [field]: value };
    onContentChange({ ...content, benefits });
  };

  const addBenefit = () => {
    onContentChange({
      ...content,
      benefits: [...(content.benefits || []), { icon: "CheckCircle", title: "", description: "" }],
    });
  };

  const removeBenefit = (index: number) => {
    const benefits = [...(content.benefits || [])];
    benefits.splice(index, 1);
    onContentChange({ ...content, benefits });
  };

  const updateTestimonial = (index: number, field: string, value: string) => {
    const testimonials = [...(content.testimonials || [])];
    testimonials[index] = { ...testimonials[index], [field]: value };
    onContentChange({ ...content, testimonials });
  };

  const addTestimonial = () => {
    onContentChange({
      ...content,
      testimonials: [...(content.testimonials || []), { quote: "", author: "", company: "", role: "", image_url: "" }],
    });
  };

  const removeTestimonial = (index: number) => {
    const testimonials = [...(content.testimonials || [])];
    testimonials.splice(index, 1);
    onContentChange({ ...content, testimonials });
  };

  const updateFaq = (index: number, field: string, value: string) => {
    const faq = [...(content.faq || [])];
    faq[index] = { ...faq[index], [field]: value };
    onContentChange({ ...content, faq });
  };

  const addFaq = () => {
    onContentChange({
      ...content,
      faq: [...(content.faq || []), { question: "", answer: "" }],
    });
  };

  const removeFaq = (index: number) => {
    const faq = [...(content.faq || [])];
    faq.splice(index, 1);
    onContentChange({ ...content, faq });
  };

  const fontOptions = ["Inter", "Poppins", "Roboto", "Open Sans", "Lato", "Montserrat"];

  return (
    <Card className="glass-card border-white/10">
      <CardContent className="p-0">
        <Tabs defaultValue="styles" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-white/10 bg-transparent p-0">
            <TabsTrigger value="styles" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              <Palette className="w-4 h-4" />
              Design
            </TabsTrigger>
            <TabsTrigger value="hero" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              <Layout className="w-4 h-4" />
              Hero
            </TabsTrigger>
            <TabsTrigger value="benefits" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              <Type className="w-4 h-4" />
              Vorteile
            </TabsTrigger>
            <TabsTrigger value="testimonials" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              <MessageSquare className="w-4 h-4" />
              Testimonials
            </TabsTrigger>
            <TabsTrigger value="faq" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              <HelpCircle className="w-4 h-4" />
              FAQ
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px]">
            {/* Styles Tab */}
            <TabsContent value="styles" className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Primärfarbe</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="color"
                      value={styles.primaryColor}
                      onChange={(e) => onStylesChange({ ...styles, primaryColor: e.target.value })}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={styles.primaryColor}
                      onChange={(e) => onStylesChange({ ...styles, primaryColor: e.target.value })}
                      className="flex-1 bg-white/5 border-white/10"
                    />
                  </div>
                </div>
                <div>
                  <Label>Sekundärfarbe</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="color"
                      value={styles.secondaryColor}
                      onChange={(e) => onStylesChange({ ...styles, secondaryColor: e.target.value })}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={styles.secondaryColor}
                      onChange={(e) => onStylesChange({ ...styles, secondaryColor: e.target.value })}
                      className="flex-1 bg-white/5 border-white/10"
                    />
                  </div>
                </div>
                <div>
                  <Label>Akzentfarbe</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="color"
                      value={styles.accentColor}
                      onChange={(e) => onStylesChange({ ...styles, accentColor: e.target.value })}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={styles.accentColor}
                      onChange={(e) => onStylesChange({ ...styles, accentColor: e.target.value })}
                      className="flex-1 bg-white/5 border-white/10"
                    />
                  </div>
                </div>
                <div>
                  <Label>Hintergrund</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="color"
                      value={styles.backgroundColor}
                      onChange={(e) => onStylesChange({ ...styles, backgroundColor: e.target.value })}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={styles.backgroundColor}
                      onChange={(e) => onStylesChange({ ...styles, backgroundColor: e.target.value })}
                      className="flex-1 bg-white/5 border-white/10"
                    />
                  </div>
                </div>
                <div>
                  <Label>Textfarbe</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="color"
                      value={styles.textColor}
                      onChange={(e) => onStylesChange({ ...styles, textColor: e.target.value })}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={styles.textColor}
                      onChange={(e) => onStylesChange({ ...styles, textColor: e.target.value })}
                      className="flex-1 bg-white/5 border-white/10"
                    />
                  </div>
                </div>
                <div>
                  <Label>Schriftart</Label>
                  <select
                    value={styles.fontFamily}
                    onChange={(e) => onStylesChange({ ...styles, fontFamily: e.target.value })}
                    className="w-full mt-1 h-10 rounded-md bg-white/5 border border-white/10 px-3"
                  >
                    {fontOptions.map((font) => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>
              </div>
            </TabsContent>

            {/* Hero Tab */}
            <TabsContent value="hero" className="p-4 space-y-4">
              {content.hero && (
                <>
                  <div>
                    <Label>Überschrift</Label>
                    <Input
                      value={content.hero.headline}
                      onChange={(e) => updateHero("headline", e.target.value)}
                      className="mt-1 bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <Label>Unterüberschrift</Label>
                    <Textarea
                      value={content.hero.subheadline}
                      onChange={(e) => updateHero("subheadline", e.target.value)}
                      className="mt-1 bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Button Text</Label>
                      <Input
                        value={content.hero.ctaText}
                        onChange={(e) => updateHero("ctaText", e.target.value)}
                        className="mt-1 bg-white/5 border-white/10"
                      />
                    </div>
                    <div>
                      <Label>Button Link</Label>
                      <Input
                        value={content.hero.ctaLink}
                        onChange={(e) => updateHero("ctaLink", e.target.value)}
                        className="mt-1 bg-white/5 border-white/10"
                      />
                    </div>
                  </div>
                </>
              )}

              {content.cta && (
                <div className="pt-4 border-t border-white/10">
                  <h4 className="font-medium mb-3">Abschluss-CTA</h4>
                  <div className="space-y-3">
                    <div>
                      <Label>Überschrift</Label>
                      <Input
                        value={content.cta.headline}
                        onChange={(e) => updateCta("headline", e.target.value)}
                        className="mt-1 bg-white/5 border-white/10"
                      />
                    </div>
                    <div>
                      <Label>Beschreibung</Label>
                      <Textarea
                        value={content.cta.description}
                        onChange={(e) => updateCta("description", e.target.value)}
                        className="mt-1 bg-white/5 border-white/10"
                      />
                    </div>
                    <div>
                      <Label>Button Text</Label>
                      <Input
                        value={content.cta.buttonText}
                        onChange={(e) => updateCta("buttonText", e.target.value)}
                        className="mt-1 bg-white/5 border-white/10"
                      />
                    </div>
                  </div>
                </div>
              )}

              {content.footer && (
                <div className="pt-4 border-t border-white/10">
                  <h4 className="font-medium mb-3">Footer</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Firmenname</Label>
                      <Input
                        value={content.footer.companyName}
                        onChange={(e) => updateFooter("companyName", e.target.value)}
                        className="mt-1 bg-white/5 border-white/10"
                      />
                    </div>
                    <div>
                      <Label>Slogan</Label>
                      <Input
                        value={content.footer.tagline}
                        onChange={(e) => updateFooter("tagline", e.target.value)}
                        className="mt-1 bg-white/5 border-white/10"
                      />
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Benefits Tab */}
            <TabsContent value="benefits" className="p-4 space-y-4">
              {(content.benefits || []).map((benefit, index) => (
                <div key={index} className="p-4 rounded-lg border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Vorteil {index + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeBenefit(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div>
                    <Label>Titel</Label>
                    <Input
                      value={benefit.title}
                      onChange={(e) => updateBenefit(index, "title", e.target.value)}
                      className="mt-1 bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <Label>Beschreibung</Label>
                    <Textarea
                      value={benefit.description}
                      onChange={(e) => updateBenefit(index, "description", e.target.value)}
                      className="mt-1 bg-white/5 border-white/10"
                    />
                  </div>
                </div>
              ))}
              <Button onClick={addBenefit} variant="outline" className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Vorteil hinzufügen
              </Button>
            </TabsContent>

            {/* Testimonials Tab */}
            <TabsContent value="testimonials" className="p-4 space-y-4">
              {(content.testimonials || []).map((testimonial, index) => (
                <div key={index} className="p-4 rounded-lg border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Testimonial {index + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeTestimonial(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div>
                    <Label>Zitat</Label>
                    <Textarea
                      value={testimonial.quote}
                      onChange={(e) => updateTestimonial(index, "quote", e.target.value)}
                      className="mt-1 bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <Label>Bild-URL</Label>
                    <Input
                      value={testimonial.image_url || ""}
                      onChange={(e) => updateTestimonial(index, "image_url", e.target.value)}
                      placeholder="https://..."
                      className="mt-1 bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={testimonial.author}
                        onChange={(e) => updateTestimonial(index, "author", e.target.value)}
                        className="mt-1 bg-white/5 border-white/10"
                      />
                    </div>
                    <div>
                      <Label>Position</Label>
                      <Input
                        value={testimonial.role}
                        onChange={(e) => updateTestimonial(index, "role", e.target.value)}
                        className="mt-1 bg-white/5 border-white/10"
                      />
                    </div>
                    <div>
                      <Label>Firma</Label>
                      <Input
                        value={testimonial.company}
                        onChange={(e) => updateTestimonial(index, "company", e.target.value)}
                        className="mt-1 bg-white/5 border-white/10"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button onClick={addTestimonial} variant="outline" className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Testimonial hinzufügen
              </Button>
            </TabsContent>

            {/* FAQ Tab */}
            <TabsContent value="faq" className="p-4 space-y-4">
              {(content.faq || []).map((item, index) => (
                <div key={index} className="p-4 rounded-lg border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">FAQ {index + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeFaq(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div>
                    <Label>Frage</Label>
                    <Input
                      value={item.question}
                      onChange={(e) => updateFaq(index, "question", e.target.value)}
                      className="mt-1 bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <Label>Antwort</Label>
                    <Textarea
                      value={item.answer}
                      onChange={(e) => updateFaq(index, "answer", e.target.value)}
                      className="mt-1 bg-white/5 border-white/10"
                    />
                  </div>
                </div>
              ))}
              <Button onClick={addFaq} variant="outline" className="w-full gap-2">
                <Plus className="w-4 h-4" />
                FAQ hinzufügen
              </Button>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
};
