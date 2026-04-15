import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Gift, Play, ArrowRight, Check, Users, TrendingUp, Wallet, Star } from "lucide-react";
import pitchfirstLogo from "@/assets/pitchfirst-logo-white.png";

const Partner = () => {
  const navigate = useNavigate();

  const benefits = [
    {
      icon: Wallet,
      title: "30% Provision",
      description: "Auf jeden Kunden, den du vermittelst – monatlich wiederkehrend"
    },
    {
      icon: TrendingUp,
      title: "Lifetime Earnings",
      description: "Solange der Kunde zahlt, verdienst du mit – für immer"
    },
    {
      icon: Users,
      title: "Exklusiv für Kunden",
      description: "Nur aktive Nutzer können Partner werden"
    },
    {
      icon: Star,
      title: "Authentisch empfehlen",
      description: "Teile nur, wovon du selbst überzeugt bist"
    }
  ];

  const steps = [
    {
      number: "1",
      title: "Kunde werden",
      description: "Starte mit PitchFirst und erlebe selbst, wie du mehr Termine über LinkedIn bekommst."
    },
    {
      number: "2",
      title: "Ergebnisse erzielen",
      description: "Nutze die KI-Landingpages und das Tracking, um deine ersten Erfolge zu feiern."
    },
    {
      number: "3",
      title: "Partner-Link holen",
      description: "Im Dashboard findest du deinen persönlichen Affiliate-Link – bereit zum Teilen."
    },
    {
      number: "4",
      title: "Geld verdienen",
      description: "Für jeden zahlenden Kunden erhältst du 30% – jeden Monat, solange er Kunde ist."
    }
  ];

  const faqs = [
    {
      question: "Muss ich erst Kunde sein?",
      answer: "Ja. Das Partner-Programm ist exklusiv für aktive PitchFirst-Nutzer. So stellst du sicher, dass du authentisch empfehlen kannst."
    },
    {
      question: "Wie hoch ist die Provision?",
      answer: "30% auf jeden vermittelten Kunden – lebenslang. Solange dein geworbener Kunde zahlt, erhältst du monatlich deine Provision."
    },
    {
      question: "Wann wird ausgezahlt?",
      answer: "Auszahlungen erfolgen monatlich über unser Partner-Portal (Rewardful). Du siehst jederzeit deine Earnings im Dashboard."
    },
    {
      question: "Gibt es ein Limit?",
      answer: "Nein. Du kannst so viele Kunden werben wie du möchtest – ohne Obergrenze für deine Einnahmen."
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0e27] relative">
      {/* Blurred Ellipse Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/20 rounded-full blur-[120px]"></div>
      </div>
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/10 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center">
              <img src={pitchfirstLogo} alt="pitchfirst.io Logo" className="h-8 md:h-10" />
            </a>
            <div className="flex gap-2 md:gap-4">
              <Button variant="ghost" onClick={() => navigate("/auth")} className="text-white hover:bg-white/10 text-sm px-2 md:px-4">
                Anmelden
              </Button>
              <Button 
                onClick={() => window.open("https://calendly.com/zoepp-media/vorgesprach-demo-software", "_blank")} 
                className="bg-white text-primary hover:bg-white/90 text-sm px-3 md:px-4"
              >
                Demo
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 md:pt-40 pb-12 md:pb-20 px-4 md:px-6">
        <div className="container mx-auto text-center max-w-4xl relative z-[1]">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs md:text-sm font-medium mb-6">
            <Gift className="h-4 w-4" />
            Partner-Programm
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white leading-tight">
            Verdiene <span className="bg-gradient-to-r from-primary via-blue-400 to-purple-400 bg-clip-text text-transparent">30% Lifetime</span><br />
            mit PitchFirst
          </h1>
          
          <p className="text-base md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Werde Kunde, überzeuge dich selbst von der Software – und verdiene dann 30% für jeden Kunden, den du bringst. Für immer.
          </p>
          
          <div className="flex gap-4 justify-center flex-wrap">
            <Button 
              size="lg" 
              onClick={() => window.open("https://calendly.com/zoepp-media/vorgesprach-demo-software", "_blank")}
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 px-6 md:px-8 h-12 md:h-14"
            >
              <Play className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              Demo ansehen
            </Button>
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="bg-gradient-to-r from-primary to-blue-500 hover:opacity-90 text-white shadow-2xl shadow-primary/50 px-6 md:px-8 h-12 md:h-14"
            >
              <Gift className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              Jetzt Kunde werden
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 md:py-16 px-4 md:px-6 relative z-[1]">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 text-center">
              <div className="text-3xl md:text-5xl font-bold text-primary mb-2">30%</div>
              <div className="text-white font-medium text-sm md:text-base mb-1">Provision</div>
              <div className="text-gray-400 text-xs md:text-sm">Pro Kunde</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 text-center">
              <div className="text-3xl md:text-5xl font-bold text-primary mb-2">∞</div>
              <div className="text-white font-medium text-sm md:text-base mb-1">Lifetime</div>
              <div className="text-gray-400 text-xs md:text-sm">Wiederkehrend</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 text-center">
              <div className="text-3xl md:text-5xl font-bold text-primary mb-2">0€</div>
              <div className="text-white font-medium text-sm md:text-base mb-1">Einstieg</div>
              <div className="text-gray-400 text-xs md:text-sm">Als Kunde</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 md:py-20 px-4 md:px-6 relative z-[1]">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 text-white">
              Warum Partner werden?
            </h2>
            <p className="text-gray-300 text-sm md:text-lg max-w-2xl mx-auto">
              Als PitchFirst-Partner profitierst du von einem der großzügigsten Affiliate-Programme im SaaS-Bereich.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">{benefit.title}</h3>
                  <p className="text-gray-400 text-sm">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-12 md:py-20 px-4 md:px-6 relative z-[1]">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 text-white">
              So wirst du Partner
            </h2>
            <p className="text-gray-300 text-sm md:text-lg max-w-2xl mx-auto">
              In 4 einfachen Schritten zum passiven Einkommen
            </p>
          </div>
          
          <div className="space-y-4 md:space-y-6">
            {steps.map((step, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-start gap-4 md:gap-6">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg md:text-xl">{step.number}</span>
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-white mb-1">{step.title}</h3>
                  <p className="text-gray-400 text-sm md:text-base">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Customer First Section */}
      <section className="py-12 md:py-16 px-4 md:px-6 relative z-[1]">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 rounded-2xl p-6 md:p-10">
            <h3 className="text-xl md:text-2xl font-bold text-white mb-4 text-center">
              Warum erst Kunde werden?
            </h3>
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-gray-300 text-sm md:text-base">
                  <span className="text-white font-medium">Authentische Empfehlungen:</span> Du kannst nur empfehlen, was du selbst nutzt und wovon du überzeugt bist.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-gray-300 text-sm md:text-base">
                  <span className="text-white font-medium">Eigene Erfahrung:</span> Erlebe die Ergebnisse selbst – mehr Termine, besseres Tracking, höhere Abschlussquoten.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-gray-300 text-sm md:text-base">
                  <span className="text-white font-medium">Glaubwürdigkeit:</span> Deine Empfehlungen sind echte Erfolgsgeschichten, nicht leere Versprechen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 md:py-20 px-4 md:px-6 relative z-[1]">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 text-white">
              Häufige Fragen
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-5 md:p-6">
                <h4 className="text-white font-semibold mb-2">{faq.question}</h4>
                <p className="text-gray-400 text-sm">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-20 px-4 md:px-6 relative z-[1]">
        <div className="container mx-auto max-w-4xl">
          <div className="relative rounded-2xl md:rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-blue-500 to-purple-500"></div>
            <div className="relative p-8 md:p-12 lg:p-16 text-center text-white">
              <Gift className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-6 opacity-90" />
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                Bereit zu starten?
              </h2>
              <p className="text-base md:text-lg mb-8 opacity-95 max-w-xl mx-auto">
                Werde jetzt Kunde, erlebe PitchFirst selbst – und verdiene 30% für jeden Kunden, den du bringst.
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button 
                  size="lg" 
                  onClick={() => window.open("https://calendly.com/zoepp-media/vorgesprach-demo-software", "_blank")}
                  variant="outline"
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20 px-6 md:px-8 h-12 md:h-14"
                >
                  <Play className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                  Erst Demo ansehen
                </Button>
                <Button 
                  size="lg" 
                  onClick={() => navigate("/auth")}
                  className="bg-white text-primary hover:bg-gray-100 shadow-2xl px-6 md:px-8 h-12 md:h-14 font-bold"
                >
                  Jetzt Kunde werden
                  <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4 md:px-6 bg-[#0a0e27] relative z-[1]">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <a href="/" className="flex items-center">
              <img src={pitchfirstLogo} alt="pitchfirst.io Logo" className="h-8" />
            </a>
            <div className="flex gap-6 text-sm text-gray-400">
              <a href="/" className="hover:text-white transition-colors">Startseite</a>
              <a href="https://www.pitchfirst.io/datenschutz" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Datenschutz</a>
              <a href="https://www.pitchfirst.io/impressum" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Impressum</a>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-white/10 text-center text-xs text-gray-500">
            © 2025 pitchfirst.io. Eine Marke der Zoepp Media UG.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Partner;