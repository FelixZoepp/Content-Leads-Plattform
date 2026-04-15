import { FeaturePageTemplate } from "@/components/landing/FeaturePageTemplate";
import { Mic, Sparkles, MessageSquare, Zap, Target, TrendingUp, Lightbulb, CheckCircle, AlertTriangle, Volume2 } from "lucide-react";

const LiveEinwandbehandlung = () => {
  // Apple-style Live Objection Handler Mockup
  const LiveObjectionMockup = () => (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-orange-500/5 to-yellow-500/5 p-2">
      {/* Browser Chrome */}
      <div className="rounded-xl bg-[#0d1117] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="ml-4 text-xs text-gray-500">pitchfirst.io/dialer • Aktiver Anruf</span>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Live Indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400 text-xs font-medium">LIVE</span>
            </div>
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-primary animate-pulse" />
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`w-1 bg-primary rounded-full ${
                    i < 3 ? 'h-4' : i < 4 ? 'h-2' : 'h-1'
                  } animate-pulse`} style={{ animationDelay: `${i * 100}ms` }} />
                ))}
              </div>
              <span className="text-xs text-gray-400">KI hört zu...</span>
            </div>
          </div>

          {/* Detected Objection */}
          <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span className="font-medium text-orange-400">Einwand erkannt!</span>
            </div>
            <div className="bg-black/30 rounded-lg p-3">
              <p className="text-white italic">"Das ist mir zu teuer, ich muss erstmal mit meinem Partner sprechen."</p>
            </div>
          </div>
          
          {/* AI Response Suggestion */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Lightbulb className="h-4 w-4" />
              Empfohlene Antwort
            </div>
            <p className="text-sm text-gray-300">
              "Ich verstehe vollkommen. Darf ich fragen – was genau möchten Sie mit Ihrem Partner besprechen? Den Preis oder die Lösung an sich? 
              <span className="text-primary"> Vielleicht kann ich Ihnen dabei helfen, die wichtigsten Punkte zusammenzufassen...</span>"
            </p>
            <div className="flex gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-sm flex items-center gap-1 cursor-pointer hover:bg-primary/30 transition-colors">
                <CheckCircle className="h-3 w-3" />
                Verwenden
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-sm cursor-pointer hover:bg-white/10 transition-colors">
                Andere Variante
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <FeaturePageTemplate
      badge="Live KI-Einwandbehandlung"
      badgeIcon={Mic}
      title="KI-Coach während des Calls"
      subtitle="Die KI erkennt Einwände in Echtzeit und zeigt dir sofort die passende Antwort – direkt während du telefonierst."
      heroImage=""
      heroImageAlt=""
      quickFeatures={[
        {
          icon: Mic,
          title: "Echtzeit-Erkennung",
          description: "Einwände werden sofort erkannt"
        },
        {
          icon: MessageSquare,
          title: "Passende Antworten",
          description: "Vorformulierte Reaktionen"
        },
        {
          icon: Sparkles,
          title: "KI-gestützt",
          description: "Lernt aus deinen besten Calls"
        }
      ]}
      sections={[
        {
          title: "Nie mehr sprachlos bei Einwänden",
          description: "Die KI hört deinem Gespräch zu und erkennt automatisch, wenn der Lead einen Einwand äußert. Sofort erscheint auf deinem Bildschirm eine passende Antwort – du musst nur noch ablesen.",
          features: [
            { icon: Mic, text: "Automatische Spracherkennung" },
            { icon: Lightbulb, text: "Intelligente Einwand-Erkennung" },
            { icon: MessageSquare, text: "Sofortige Antwort-Vorschläge" },
            { icon: CheckCircle, text: "Anpassbare Antworten" }
          ],
          mockup: <LiveObjectionMockup />
        },
        {
          title: "Dein persönlicher Sales-Coach",
          description: "Die KI lernt aus deinen erfolgreichsten Gesprächen und schlägt dir bewährte Formulierungen vor. Mit der Zeit werden die Vorschläge immer besser auf deinen Stil abgestimmt.",
          features: [
            { icon: Sparkles, text: "Lernt aus deinen Calls" },
            { icon: Target, text: "Personalisierte Vorschläge" },
            { icon: TrendingUp, text: "Erfolgsstatistiken" },
            { icon: Zap, text: "Schnelle Reaktionszeit" }
          ],
          reversed: true,
          mockup: (
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 p-6 space-y-4">
              {/* Stats Overview */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-primary">94%</div>
                  <div className="text-xs text-gray-400">Erkennungsrate</div>
                </div>
                <div className="bg-background/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">+23%</div>
                  <div className="text-xs text-gray-400">Abschlussrate</div>
                </div>
              </div>
              
              {/* Common Objections */}
              <div className="bg-background/30 rounded-lg p-4 space-y-3">
                <div className="text-sm font-medium">Häufigste Einwände</div>
                <div className="space-y-2">
                  {[
                    { text: "Zu teuer", count: 47, success: 78 },
                    { text: "Kein Interesse", count: 32, success: 45 },
                    { text: "Keine Zeit", count: 28, success: 62 }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">{item.text}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{item.count}x</span>
                        <span className="text-green-400">{item.success}% gewonnen</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        }
      ]}
      benefits={[
        {
          icon: Target,
          title: "Souveräner auftreten",
          description: "Nie mehr nach Worten suchen bei schwierigen Einwänden"
        },
        {
          icon: TrendingUp,
          title: "Höhere Abschlussquote",
          description: "Bessere Einwandbehandlung = mehr gewonnene Deals"
        },
        {
          icon: Zap,
          title: "Schneller lernen",
          description: "Neue Mitarbeiter werden schneller produktiv"
        }
      ]}
    />
  );
};

export default LiveEinwandbehandlung;
