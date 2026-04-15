import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Phone, CheckCircle } from "lucide-react";
import pitchfirstLogo from "@/assets/pitchfirst-logo-white.png";

interface FeatureItem {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}

interface FeatureSection {
  badge?: string;
  badgeIcon?: React.ComponentType<{ className?: string }>;
  title: string;
  highlightedTitle?: string;
  description: string;
  features?: FeatureItem[];
  image?: string;
  imageAlt?: string;
  reversed?: boolean;
  mockup?: React.ReactNode;
}

interface FeaturePageTemplateProps {
  badge: string;
  badgeIcon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  heroImage: string;
  heroImageAlt: string;
  quickFeatures: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
  }[];
  sections: FeatureSection[];
  benefits: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
  }[];
}

export const FeaturePageTemplate = ({
  badge,
  badgeIcon: BadgeIcon,
  title,
  subtitle,
  heroImage,
  heroImageAlt,
  quickFeatures,
  sections,
  benefits,
}: FeaturePageTemplateProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate("/")}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück
              </Button>
              <img src={pitchfirstLogo} alt="PitchFirst" className="h-8" />
            </div>
            <a 
              href="https://calendly.com/zoepp-media/vorgesprach-demo-software"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="bg-primary hover:bg-primary/90">
                <Phone className="h-4 w-4 mr-2" />
                Demo buchen
              </Button>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-12 px-4 md:px-6 relative">
        <div className="container mx-auto max-w-5xl text-center">
          <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 px-4 py-2 text-sm uppercase tracking-wider">
            <BadgeIcon className="h-4 w-4 mr-2" />
            {badge}
          </Badge>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            {title}
          </h1>
          
          <p className="text-xl md:text-2xl text-primary/80 mb-12 max-w-3xl mx-auto">
            {subtitle}
          </p>

          {/* Hero Screenshot - only show if image provided */}
          {heroImage && (
            <div className="relative max-w-4xl mx-auto">
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-primary/20 bg-gradient-to-br from-primary/5 to-blue-500/5">
                <img 
                  src={heroImage} 
                  alt={heroImageAlt}
                  className="w-full"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Quick Features */}
      <section className="py-12 px-4 md:px-6">
        <div className="container mx-auto max-w-5xl">
          <p className="text-center text-sm uppercase tracking-wider text-muted-foreground mb-8">
            Alle Funktionen auf einen Blick
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {quickFeatures.map((feature, idx) => (
              <div key={idx} className="text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4">
        <div className="border-t border-white/10" />
      </div>

      {/* Feature Sections */}
      {sections.map((section, idx) => (
        <section 
          key={idx} 
          className={`py-20 px-4 md:px-6 ${idx % 2 === 1 ? 'bg-muted/30' : ''}`}
        >
          <div className="container mx-auto max-w-6xl">
            <div className={`grid lg:grid-cols-2 gap-12 items-center ${section.reversed ? '' : ''}`}>
              {/* Text Content */}
              <div className={`space-y-6 ${section.reversed ? 'order-1 lg:order-2' : ''}`}>
                {section.badge && section.badgeIcon && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                    <section.badgeIcon className="h-3 w-3 mr-1" />
                    {section.badge}
                  </Badge>
                )}
                <h2 className="text-3xl md:text-4xl font-bold">
                  {section.title}
                  {section.highlightedTitle && (
                    <span className="text-primary block">{section.highlightedTitle}</span>
                  )}
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {section.description}
                </p>
                
                {section.features && (
                  <div className="grid sm:grid-cols-2 gap-4 pt-4">
                    {section.features.map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <feature.icon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm">{feature.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Image/Mockup */}
              <div className={section.reversed ? 'order-2 lg:order-1' : ''}>
                {section.mockup ? (
                  section.mockup
                ) : section.image ? (
                  <div className="rounded-2xl overflow-hidden border border-white/10 shadow-xl">
                    <img 
                      src={section.image} 
                      alt={section.imageAlt || section.title}
                      className="w-full"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Benefits Section */}
      <section className="py-20 px-4 md:px-6 bg-muted/30">
        <div className="container mx-auto max-w-5xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Deine Vorteile
          </h2>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            Was du mit diesem Feature erreichst
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="text-center p-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <benefit.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 md:px-6">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Bereit loszulegen?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Lass uns in einer kurzen Demo zeigen, wie du dieses Feature für dein Business nutzen kannst.
          </p>
          <a 
            href="https://calendly.com/zoepp-media/vorgesprach-demo-software"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button 
              size="lg"
              className="bg-gradient-to-r from-primary to-blue-500 hover:opacity-90 text-white shadow-2xl shadow-primary/50 px-10 h-14 text-lg"
            >
              <Phone className="mr-2 h-5 w-5" />
              Kostenlose Demo buchen
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 md:px-6 border-t border-white/10">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <img src={pitchfirstLogo} alt="PitchFirst" className="h-6" />
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="/agb" className="hover:text-foreground transition-colors">Impressum</a>
              <a href="/agb" className="hover:text-foreground transition-colors">Datenschutz</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FeaturePageTemplate;
