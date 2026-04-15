import { FeaturePageTemplate } from "@/components/landing/FeaturePageTemplate";
import { Phone, Users, Zap, FileText, Clock, Target, TrendingUp, Headphones, Play, PhoneCall, PhoneOff, Mic } from "lucide-react";

const PowerDialer = () => {
  // Apple-style Power Dialer mockup
  const PowerDialerMockup = () => (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-green-500/5 to-emerald-500/5 p-2">
      {/* Browser Chrome */}
      <div className="rounded-xl bg-[#0d1117] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="ml-4 text-xs text-gray-500">pitchfirst.io/dialer</span>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Active Call Card */}
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-500/30 flex items-center justify-center">
                  <PhoneCall className="h-6 w-6 text-green-400 animate-pulse" />
                </div>
                <div>
                  <div className="font-medium text-white">Max Mustermann</div>
                  <div className="text-sm text-green-400">Aktiver Anruf • 02:34</div>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <Mic className="h-5 w-5 text-white" />
                </div>
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <PhoneOff className="h-5 w-5 text-red-400" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Call Script */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <FileText className="h-4 w-4" />
              Call Script
            </div>
            <div className="text-sm text-gray-300">
              "Hallo <span className="text-primary font-medium">Max</span>, ich rufe an, weil ich gesehen habe, dass du mein Video angeschaut hast..."
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs">Nächster Schritt →</span>
              <span className="px-2 py-1 rounded-lg bg-white/5 text-gray-400 text-xs">Einwand: Kein Interesse</span>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-center">
              <div className="text-green-400 text-xs font-medium">✓ Termin gelegt</div>
            </div>
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 text-center">
              <div className="text-yellow-400 text-xs font-medium">↻ Rückruf</div>
            </div>
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-center">
              <div className="text-red-400 text-xs font-medium">✕ Kein Interesse</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <FeaturePageTemplate
      badge="Power Dialer"
      badgeIcon={Phone}
      title="Direkt aus dem CRM anrufen"
      subtitle="Rufe Leads mit einem Klick an – ohne Telefon-App, ohne Umwege. Alles integriert."
      heroImage=""
      heroImageAlt=""
      quickFeatures={[
        {
          icon: Phone,
          title: "Click-to-Call",
          description: "Ein Klick zum Anrufen"
        },
        {
          icon: FileText,
          title: "Call-Scripts",
          description: "Leitfaden immer griffbereit"
        },
        {
          icon: Headphones,
          title: "Softphone integriert",
          description: "Kein externes Tool nötig"
        }
      ]}
      sections={[
        {
          title: "Telefoniere direkt aus dem Browser",
          description: "Mit dem integrierten Power Dialer rufst du Leads direkt aus dem CRM an. Keine Telefon-App, keine manuellen Nummern eingeben. Während du telefonierst, siehst du alle Lead-Infos auf einen Blick.",
          features: [
            { icon: Phone, text: "Browser-basiertes Telefonieren" },
            { icon: Users, text: "Lead-Info während des Calls" },
            { icon: FileText, text: "Notizen in Echtzeit" },
            { icon: Clock, text: "Anruf-Protokollierung" }
          ],
          mockup: <PowerDialerMockup />
        },
        {
          title: "Call-Scripts für perfekte Gespräche",
          description: "Habe deinen Gesprächsleitfaden immer griffbereit. Das Script passt sich automatisch an den Lead an – mit personalisierten Platzhaltern für Namen, Firma und mehr.",
          features: [
            { icon: FileText, text: "Dynamische Platzhalter" },
            { icon: Target, text: "Einwand-Vorlagen" },
            { icon: Zap, text: "Quick Actions" },
            { icon: TrendingUp, text: "Erfolgs-Tracking" }
          ],
          reversed: true,
          mockup: (
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-white/10">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <div className="font-medium">Aktiver Anruf</div>
                  <div className="text-sm text-muted-foreground">Max Mustermann • 02:34</div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-background/30 border border-white/5 space-y-2">
                <div className="text-sm font-medium">Call Script</div>
                <div className="text-sm text-muted-foreground">
                  "Hallo <span className="text-primary">Max</span>, ich rufe an wegen..."
                </div>
              </div>
              <div className="flex gap-2">
                <div className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-500 text-sm">Termin gelegt</div>
                <div className="px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-500 text-sm">Rückruf</div>
              </div>
            </div>
          )
        }
      ]}
      benefits={[
        {
          icon: Zap,
          title: "Schneller arbeiten",
          description: "Keine Zeit mit Tool-Wechsel verschwenden"
        },
        {
          icon: Target,
          title: "Bessere Gespräche",
          description: "Alle Infos während des Calls griffbereit"
        },
        {
          icon: TrendingUp,
          title: "Mehr Abschlüsse",
          description: "Strukturierte Calls = bessere Ergebnisse"
        }
      ]}
    />
  );
};

export default PowerDialer;
