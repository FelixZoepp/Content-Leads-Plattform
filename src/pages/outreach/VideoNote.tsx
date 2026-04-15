import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { initializeTracking, attachVideoTracking } from "@/lib/leadTracker";
import { Play, ThumbsDown, ThumbsUp, Check, X, Calendar, MessageSquare, Users, Target, TrendingUp, Zap, ChevronDown, Pen, Megaphone, Star, CheckCircle, ExternalLink } from "lucide-react";
import linkedinPostImage from "@/assets/linkedin-post-screenshot.png";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Declare YouTube IFrame API types
declare global {
  interface Window {
    YT: {
      Player: new (elementId: string, options: {
        videoId: string;
        playerVars?: {
          autoplay?: number;
          rel?: number;
          controls?: number;
          modestbranding?: number;
          playsinline?: number;
        };
        events?: {
          onReady?: (event: { target: any }) => void;
          onStateChange?: (event: { data: number }) => void;
        };
      }) => any;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface ContactData {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  video_url: string | null;
  pitch_video_url: string | null;
  account_id: string | null;
  member_user_id?: string | null;
  [key: string]: any;
}

// Helper to check if URL is YouTube
const isYouTubeUrl = (url: string): boolean => {
  return url.includes('youtube.com') || url.includes('youtu.be');
};

// Helper to extract YouTube video ID
const getYouTubeVideoId = (url: string): string => {
  if (url.includes('youtu.be/')) {
    return url.split('youtu.be/')[1]?.split('?')[0] || '';
  } else if (url.includes('youtube.com/watch')) {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    return urlParams.get('v') || '';
  } else if (url.includes('youtube.com/embed/')) {
    return url.split('embed/')[1]?.split('?')[0] || '';
  }
  return '';
};

const VideoNote = () => {
  const { slug, memberCode } = useParams<{ slug: string; memberCode?: string }>();
  const [contact, setContact] = useState<ContactData | null>(null);
  const [memberUserId, setMemberUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [youtubeApiReady, setYoutubeApiReady] = useState(false);
  const [legalLinks, setLegalLinks] = useState({ impressum: "https://content-leads.de/impressum", datenschutz: "https://content-leads.de/datenschutz" });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const youtubePlayerRef = useRef<any>(null);
  const videoTrackingCleanupRef = useRef<null | (() => void)>(null);

  // The single video URL to play (campaign explainer video)
  const videoUrl = contact?.pitch_video_url || contact?.video_url;

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT) {
      setYoutubeApiReady(true);
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      setYoutubeApiReady(true);
    };

    return () => {
      window.onYouTubeIframeAPIReady = () => {};
    };
  }, []);

  // Initialize YouTube player
  const initYoutubePlayer = useCallback(() => {
    if (!youtubeApiReady || !videoUrl || !isYouTubeUrl(videoUrl)) return;
    if (youtubePlayerRef.current) return;

    const videoId = getYouTubeVideoId(videoUrl);
    if (!videoId) return;

    youtubePlayerRef.current = new window.YT.Player('youtube-player', {
      videoId,
      playerVars: {
        autoplay: 1,
        rel: 0,
        controls: 1,
        modestbranding: 1,
        playsinline: 1,
      },
      events: {
        onReady: (event: any) => {
          event.target.playVideo();
        },
      },
    });
  }, [youtubeApiReady, videoUrl]);

  useEffect(() => {
    if (slug) {
      loadContactAndTrackView();
    }
  }, [slug]);

  useEffect(() => {
    if (!slug || !contact) return;
    const cleanup = initializeTracking(slug);
    return () => cleanup();
  }, [slug, contact?.id]);

  // Attach video tracking
  useEffect(() => {
    if (!slug || !videoUrl || !videoRef.current) return;
    videoTrackingCleanupRef.current?.();
    videoTrackingCleanupRef.current = attachVideoTracking(slug, videoRef.current);
    return () => {
      videoTrackingCleanupRef.current?.();
      videoTrackingCleanupRef.current = null;
    };
  }, [slug, videoUrl, isVideoPlaying]);

  const loadContactAndTrackView = async () => {
    try {
      const rpcParams: Record<string, any> = { contact_slug: slug };
      if (memberCode) rpcParams.p_member_code = parseInt(memberCode, 10);
      const { data: contactResult, error: contactError } = await (supabase as any)
        .rpc('get_contact_by_slug', rpcParams);

      if (contactError) throw contactError;

      const contactData = Array.isArray(contactResult) ? contactResult[0] : contactResult;

      if (!contactData) {
        setError("Video nicht gefunden");
        setLoading(false);
        return;
      }

      setContact(contactData);
      if (contactData.member_user_id) setMemberUserId(contactData.member_user_id);

      // Load legal links from account settings
      if (contactData.account_id) {
        const { data: account } = await supabase
          .from('accounts')
          .select('impressum_url, datenschutz_url')
          .eq('id', contactData.account_id)
          .single();
        if (account) {
          setLegalLinks({
            impressum: (account as any).impressum_url || "https://content-leads.de/impressum",
            datenschutz: (account as any).datenschutz_url || "https://content-leads.de/datenschutz",
          });
        }
      }
    } catch (err) {
      console.error('Error loading video:', err);
      setError("Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayVideo = () => {
    setIsVideoPlaying(true);
    
    if (slug) {
      supabase.functions.invoke('track-video-view', {
        body: { slug, member_code: memberCode ? parseInt(memberCode, 10) : undefined, member_user_id: memberUserId }
      }).catch((trackError) => {
        console.error('Video view tracking error:', trackError);
      });
    }

    if (videoUrl && isYouTubeUrl(videoUrl)) {
      setTimeout(() => initYoutubePlayer(), 100);
    }
  };

  const scrollToVideo = () => {
    document.getElementById('video-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Play className="w-10 h-10 text-slate-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">
            {error || "Video nicht gefunden"}
          </h1>
          <p className="text-slate-400 leading-relaxed">
            Dieser Link ist leider ungültig oder abgelaufen.
          </p>
        </div>
      </div>
    );
  }

  const companyName = contact?.company || "dein Unternehmen";

  return (
    <div className="min-h-screen bg-[#0f172a]" style={{ fontFamily: "'Inter', sans-serif" }}>
      
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-bold text-white">
            <span className="text-cyan-400">Content</span>-Leads
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300">
            <a href="#vorteile" className="hover:text-white transition-colors">Warum wir?</a>
            <a href="#ansatz" className="hover:text-white transition-colors">Unser Ansatz</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>
          <a 
            href="https://calendly.com/zoepp-media/vorbereitungsgesprach-mit-felix-zoepp-klon"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold px-5 py-2.5 rounded-lg transition-all text-sm"
          >
            {contact.first_name}, lass uns sprechen!
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-8 lg:px-16">
          <div className="grid md:grid-cols-2 gap-16 lg:gap-24 items-center">
            
            {/* Left Content */}
            <div className="space-y-8">
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-white leading-[1.1]">
                Hey {contact.first_name}, sieh dir das Video an
              </h1>
              <p className="text-lg md:text-xl text-slate-300 leading-relaxed">
                … und erfahre, wie <span className="text-cyan-400 font-semibold">{companyName}</span> mit personalisierten Outreach-Kampagnen und starkem Content qualifizierte Leads generiert.
              </p>
              <a 
                href="https://calendly.com/zoepp-media/vorbereitungsgesprach-mit-felix-zoepp-klon"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold px-10 py-5 rounded-xl transition-all text-lg shadow-lg shadow-cyan-500/25"
              >
                <Calendar className="w-5 h-5" />
                Gratis Termin vereinbaren
              </a>
            </div>

            {/* Right - Video */}
            <div id="video-section" className="relative">
              {/* Pointing Hand */}
              <div className="absolute -top-12 right-1/4 text-6xl animate-bounce z-10">
                👇
              </div>
              
              <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-cyan-500/20 border border-slate-600/50 bg-slate-800">
                {videoUrl ? (
                  <>
                    {!isVideoPlaying ? (
                      <div 
                        className="relative cursor-pointer group"
                        onClick={handlePlayVideo}
                      >
                        {isYouTubeUrl(videoUrl) ? (
                          <div className="w-full aspect-video bg-slate-900 flex items-center justify-center">
                            <img 
                              src={`https://img.youtube.com/vi/${getYouTubeVideoId(videoUrl)}/maxresdefault.jpg`}
                              alt="Video thumbnail"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <video
                            src={videoUrl}
                            className="w-full aspect-video object-cover"
                            muted
                          />
                        )}
                        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <button className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold px-10 py-5 rounded-full flex items-center gap-4 transition-all transform group-hover:scale-105 shadow-xl shadow-cyan-500/40 text-lg">
                            <Play className="w-7 h-7 fill-current" />
                            Jetzt ansehen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full aspect-video">
                        {isYouTubeUrl(videoUrl) ? (
                          <div id="youtube-player" className="w-full h-full" />
                        ) : (
                          <video
                            ref={videoRef}
                            src={videoUrl}
                            controls
                            autoPlay
                            playsInline
                            className="w-full h-full"
                          />
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="aspect-video bg-slate-800 flex items-center justify-center">
                    <div className="text-center px-6">
                      <Play className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400 text-lg font-medium mb-2">Video wird vorbereitet...</p>
                      <p className="text-slate-500 text-sm max-w-md">
                        Das Erklärvideo wird gerade erstellt und ist bald verfügbar.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <p className="text-center text-slate-400 mt-6 text-base">
                Nur für dich {contact.first_name}, schau dir das Video kurz an!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Coaching Section */}
      <section id="vorteile" className="py-20 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-full text-sm font-medium mb-4">
              Exklusives Coaching-Programm
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Die zwei Säulen für deinen LinkedIn-Erfolg
            </h2>
            <p className="text-slate-400 text-lg">
              Lerne, wie du mit Outreach Umsatz generierst und mit Content Anfragen bekommst – für <span className="text-cyan-400">{companyName}</span>
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Outreach */}
            <div className="bg-gradient-to-br from-cyan-500/10 to-slate-800/50 rounded-2xl p-8 border border-cyan-500/30">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                  <Megaphone className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Säule 1: Outreach</h3>
                  <p className="text-cyan-400 text-sm">= Umsatz generieren</p>
                </div>
              </div>
              <p className="text-slate-400 mb-6">Wir zeigen dir, wie du personalisierte Kampagnen erstellst, die direkt bei deiner Zielgruppe ankommen.</p>
              <ul className="space-y-4">
                {[
                  "Du lernst hyperpersonalisierte Nachrichten zu schreiben",
                  "Wie du direkte Terminbuchungen durch warme Kontakte bekommst",
                  "Datengetriebene Zielgruppenansprache verstehen",
                  "A/B-Tests für maximale Conversion durchführen",
                  "Schritt-für-Schritt Anleitungen zum Nachmachen"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300">
                    <Check className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Content */}
            <div className="bg-gradient-to-br from-purple-500/10 to-slate-800/50 rounded-2xl p-8 border border-purple-500/30">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <Pen className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Säule 2: Inbound Content</h3>
                  <p className="text-purple-400 text-sm">= Anfragen generieren</p>
                </div>
              </div>
              <p className="text-slate-400 mb-6">Lerne, wie du hochwertigen Content erstellst, der deine Expertise zeigt und organisch Leads anzieht.</p>
              <ul className="space-y-4">
                {[
                  "So schreibst du Posts, die viral gehen",
                  "Thought Leadership aufbauen",
                  "Die richtige Posting-Frequenz finden",
                  "Community Building & Engagement-Strategien",
                  "Branding & Sichtbarkeit systematisch steigern"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300">
                    <Check className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Combined Effect */}
          <div className="mt-12 bg-slate-800/50 rounded-2xl p-8 border border-slate-700 text-center">
            <h3 className="text-xl font-bold text-white mb-4">
              🚀 Outreach + Content = Maximale Wirkung
            </h3>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Im Coaching lernst du beide Strategien zu meistern. Während dein Outreach aktiv Termine generiert, 
              baut dein Content gleichzeitig Vertrauen und Autorität auf. Das Ergebnis: planbar mehr Umsatz und Anfragen.
            </p>
          </div>
        </div>
      </section>

      {/* #1 LinkedIn Beratung Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/50 rounded-full px-6 py-2 mb-6">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              <span className="text-amber-300 font-semibold">#1 LinkedIn Beratung in der DACH-Region</span>
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Was uns von anderen unterscheidet
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Keine leeren Versprechungen – wir liefern Ergebnisse mit Garantie.
            </p>
          </div>

          {/* Comparison Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Others */}
            <div className="bg-red-500/5 rounded-2xl p-8 border border-red-500/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <X className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Andere Anbieter</h3>
              </div>
              <ul className="space-y-4">
                {[
                  "Erste Ergebnisse nach 3-6 Monaten",
                  "Keine Umsatzgarantie",
                  "Nur Theorie, keine Umsetzungsbegleitung",
                  "Standard-Inhalte für alle",
                  "Du bist nach dem Kurs auf dich allein gestellt"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300">
                    <X className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Us */}
            <div className="bg-green-500/5 rounded-2xl p-8 border border-green-500/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Unser Coaching bei Content-Leads</h3>
              </div>
              <ul className="space-y-4">
                {[
                  "Erste Anfragen bereits in 7 Tagen",
                  "Umsatzgarantie – wir verdoppeln dein Investment",
                  "Intensive 1:1 Betreuung bei der Umsetzung",
                  "Individuell auf deine Situation angepasst",
                  "Persönlicher Coach dauerhaft an deiner Seite"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* LinkedIn Post Section */}
      <section className="py-20 bg-slate-900/50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium mb-4">
              Content-Strategie in Aktion
            </span>
            <h2 className="text-3xl font-bold text-white mb-4">
              So sieht erfolgreicher LinkedIn Content aus
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Über 100.000 Impressionen mit einem einzigen Post – das ist die Kraft der richtigen Content-Strategie.
            </p>
          </div>

          <div className="flex justify-center">
            <div className="relative max-w-lg w-full">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl blur opacity-30" />
              <div className="relative bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
                <img 
                  src={linkedinPostImage} 
                  alt="Viraler LinkedIn Post mit über 100.000 Impressionen" 
                  className="w-full" 
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-full text-sm font-medium mb-4">
              Häufige Fragen
            </span>
            <h2 className="text-3xl font-bold text-white mb-4">Noch Fragen?</h2>
            <p className="text-slate-400">Hier findest du Antworten auf die wichtigsten Fragen</p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {[
              { q: "Wie schnell sehe ich Ergebnisse?", a: "Die meisten Kunden sehen erste Ergebnisse innerhalb der ersten 7 Tage. Durch unsere bewährte Methodik und intensive Betreuung sorgen wir dafür, dass du so schnell wie möglich ins Handeln kommst." },
              { q: "Brauche ich technische Vorkenntnisse?", a: "Nein, überhaupt nicht! Wir führen dich Schritt für Schritt durch den gesamten Prozess. Unsere Methoden sind für jeden verständlich und sofort umsetzbar." },
              { q: "Wie viel Zeit muss ich investieren?", a: "Wir empfehlen ca. 2-3 Stunden pro Woche für optimale Ergebnisse. Das Coaching ist so aufgebaut, dass es auch neben einem vollen Arbeitsalltag funktioniert." },
              { q: "Was kostet das Coaching?", a: "Die Investition besprechen wir individuell im Strategiegespräch, da wir das Programm auf deine spezifischen Bedürfnisse zuschneiden. Buche jetzt dein kostenloses Gespräch!" }
            ].map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="bg-slate-800/50 rounded-xl border border-slate-700 px-6">
                <AccordionTrigger className="text-white hover:text-cyan-400 text-left py-5">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-slate-400 pb-5">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-br from-cyan-500/10 to-purple-500/10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Bereit für den nächsten Schritt, {contact.first_name}?
          </h2>
          <p className="text-slate-300 text-lg mb-10 max-w-2xl mx-auto">
            Vereinbare jetzt ein kostenloses Strategiegespräch und erfahre, wie wir dir helfen können.
          </p>
          <a
            href="https://calendly.com/zoepp-media/vorbereitungsgesprach-mit-felix-zoepp-klon"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold px-12 py-5 rounded-xl transition-all text-lg shadow-lg shadow-cyan-500/25 hover:scale-105"
          >
            <Calendar className="w-6 h-6" />
            Kostenloses Gespräch buchen
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <span>© {new Date().getFullYear()} Content-Leads. Alle Rechte vorbehalten.</span>
          <div className="flex items-center gap-6">
            <a href={legalLinks.impressum} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Impressum</a>
            <a href={legalLinks.datenschutz} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Datenschutzerklärung</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default VideoNote;
