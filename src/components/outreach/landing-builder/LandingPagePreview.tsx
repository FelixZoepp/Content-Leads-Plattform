import { Card } from "@/components/ui/card";
import { 
  CheckCircle, Zap, Shield, Star, Clock, Users, Award, Target, 
  TrendingUp, Rocket, BarChart, Globe, Play, Calendar
} from "lucide-react";

export interface LandingPageContent {
  hero?: {
    headline: string;
    subheadline: string;
    videoPlaceholder?: boolean;
  };
  benefits?: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  offer?: {
    title: string;
    description: string;
    bulletPoints: string[];
  };
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

export interface LandingPageStyles {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
}

interface LandingPagePreviewProps {
  content: LandingPageContent;
  styles: LandingPageStyles;
  calendarUrl?: string;
}

const iconMap: Record<string, any> = {
  CheckCircle, Zap, Shield, Star, Clock, Users, Award, Target,
  TrendingUp, Rocket, BarChart
};

export const LandingPagePreview = ({ content, styles, calendarUrl }: LandingPagePreviewProps) => {
  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName] || CheckCircle;
    return <Icon className="w-6 h-6" />;
  };

  // Extract calendar embed type
  const getCalendarEmbed = () => {
    if (!calendarUrl) return null;
    
    // Calendly embed
    if (calendarUrl.includes('calendly.com')) {
      const cleanUrl = calendarUrl.replace(/\/$/, '');
      return (
        <div className="mt-6 rounded-xl overflow-hidden bg-white" style={{ minHeight: '630px' }}>
          <iframe
            src={`${cleanUrl}?hide_gdpr_banner=1&background_color=ffffff&text_color=1f2937&primary_color=${styles.primaryColor.replace('#', '')}`}
            width="100%"
            height="630"
            frameBorder="0"
            title="Termin buchen"
          />
        </div>
      );
    }
    
    // Cal.com embed
    if (calendarUrl.includes('cal.com')) {
      return (
        <div className="mt-6 rounded-xl overflow-hidden bg-white" style={{ minHeight: '630px' }}>
          <iframe
            src={calendarUrl}
            width="100%"
            height="630"
            frameBorder="0"
            title="Termin buchen"
          />
        </div>
      );
    }

    // Generic link (fallback button)
    return null;
  };

  if (!content.hero) {
    return (
      <Card className="glass-card border-white/10 p-12 text-center">
        <div className="text-muted-foreground">
          <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Generiere eine Landing Page, um die Vorschau zu sehen</p>
        </div>
      </Card>
    );
  }

  const calendarEmbed = getCalendarEmbed();

  return (
    <Card className="overflow-hidden border-0 rounded-xl shadow-2xl">
      <div 
        className="min-h-[600px]"
        style={{ 
          backgroundColor: styles.backgroundColor,
          color: styles.textColor,
          fontFamily: styles.fontFamily
        }}
      >
        {/* Hero Section with Video */}
        <section 
          className="py-12 px-6"
          style={{ 
            background: `linear-gradient(135deg, ${styles.primaryColor} 0%, ${styles.secondaryColor} 100%)`,
            color: '#fff'
          }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Text Content */}
              <div className="text-left">
                <h1 className="text-2xl md:text-4xl font-bold mb-4">
                  {content.hero.headline}
                </h1>
                <p className="text-base md:text-lg opacity-90 mb-6">
                  {content.hero.subheadline}
                </p>
                <div className="flex items-center gap-2 text-sm opacity-75">
                  <Calendar className="w-4 h-4" />
                  <span>Persönliche Nachricht für Sie</span>
                </div>
              </div>
              
              {/* Video Placeholder */}
              <div className="relative">
                <div 
                  className="aspect-video rounded-xl bg-black/30 backdrop-blur-sm flex items-center justify-center border-2 border-white/20 shadow-2xl"
                >
                  <div className="text-center">
                    <div 
                      className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                      style={{ backgroundColor: styles.accentColor }}
                    >
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                    <p className="text-sm opacity-75">Ihr persönliches Video</p>
                    <p className="text-xs opacity-50 mt-1">{"{{firstName}}"}, schauen Sie sich das an!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        {content.benefits && content.benefits.length > 0 && (
          <section className="py-10 px-6">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-xl font-bold text-center mb-6" style={{ color: styles.primaryColor }}>
                Ihre Vorteile auf einen Blick
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {content.benefits.map((benefit, index) => (
                  <div 
                    key={index} 
                    className="text-center p-5 rounded-xl transition-transform hover:-translate-y-1" 
                    style={{ backgroundColor: `${styles.primaryColor}10` }}
                  >
                    <div 
                      className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                      style={{ backgroundColor: styles.primaryColor, color: '#fff' }}
                    >
                      {getIcon(benefit.icon)}
                    </div>
                    <h3 className="font-semibold text-base mb-2">{benefit.title}</h3>
                    <p className="text-sm opacity-75">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Offer Section */}
        {content.offer && (
          <section className="py-10 px-6" style={{ backgroundColor: `${styles.primaryColor}05` }}>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-xl font-bold mb-4" style={{ color: styles.primaryColor }}>
                {content.offer.title}
              </h2>
              <p className="mb-6 opacity-80">{content.offer.description}</p>
              <div className="inline-block text-left bg-white rounded-xl p-6 shadow-md">
                <ul className="space-y-3">
                  {content.offer.bulletPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle 
                        className="w-5 h-5 mt-0.5 shrink-0" 
                        style={{ color: styles.accentColor }} 
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* CTA Section - Calendar Booking */}
        {content.cta && (
          <section 
            className="py-12 px-6 text-center"
            style={{ 
              background: `linear-gradient(135deg, ${styles.primaryColor} 0%, ${styles.secondaryColor} 100%)`,
              color: '#fff'
            }}
          >
            <div className="max-w-3xl mx-auto">
              <Calendar className="w-10 h-10 mx-auto mb-4 opacity-80" />
              <h2 className="text-xl md:text-2xl font-bold mb-3">
                {content.cta.headline}
              </h2>
              <p className="text-base opacity-90 mb-6">
                {content.cta.description}
              </p>
              
              {calendarEmbed ? (
                calendarEmbed
              ) : (
                <>
                  <a
                    href={calendarUrl || content.cta.buttonLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-8 py-3 rounded-xl font-semibold text-base transition-all hover:scale-105 hover:shadow-lg"
                    style={{ backgroundColor: styles.accentColor, color: '#fff' }}
                  >
                    <span className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      {content.cta.buttonText}
                    </span>
                  </a>
                  {!calendarUrl && (
                    <p className="text-xs opacity-60 mt-4">
                      Tipp: Hinterlege deinen Kalender-Link in den Einstellungen
                    </p>
                  )}
                </>
              )}
              
              <p className="text-xs opacity-60 mt-4">
                Unverbindlich & kostenlos
              </p>
            </div>
          </section>
        )}

        {/* Footer */}
        {content.footer && (
          <footer className="py-6 px-6 text-center" style={{ backgroundColor: styles.textColor, color: styles.backgroundColor }}>
            <p className="font-semibold">{content.footer.companyName}</p>
            <p className="text-sm opacity-75">{content.footer.tagline}</p>
          </footer>
        )}
      </div>
    </Card>
  );
};
