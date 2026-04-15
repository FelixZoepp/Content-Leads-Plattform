import { FeaturePageTemplate } from "@/components/landing/FeaturePageTemplate";
import { Sparkles, Zap, Palette, FileText, Target, TrendingUp, Clock, CheckCircle, Wand2 } from "lucide-react";

const KIKonfigurator = () => {
  // Apple-style AI Configurator Mockup
  const AIConfiguratorMockup = () => (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-primary/5 to-purple-500/5 p-2">
      {/* Browser Chrome */}
      <div className="rounded-xl bg-[#0d1117] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="ml-4 text-xs text-gray-500">pitchfirst.io/konfigurator</span>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Prompt Input */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Wand2 className="h-4 w-4" />
              Beschreibe deine Zielgruppe
            </div>
            <div className="bg-black/30 rounded-lg p-3">
              <p className="text-gray-300 text-sm">
                "Erstelle eine Seite für IT-Entscheider in mittelständischen Unternehmen. 
                Fokus auf ROI und Zeitersparnis. Professioneller, aber nicht steifer Ton."
              </p>
            </div>
          </div>
          
          {/* Generation Progress */}
          <div className="bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                <span className="font-medium text-white">KI generiert...</span>
              </div>
              <span className="text-sm text-primary">75%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="w-3/4 h-full bg-gradient-to-r from-primary to-purple-500" />
            </div>
          </div>
          
          {/* Generated Elements */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Headline", status: "done", preview: "Mehr Zeit für das Wesentliche" },
              { label: "Subheadline", status: "done", preview: "Automatisiere dein Outreach" },
              { label: "CTA Text", status: "processing", preview: "..." },
              { label: "Farben", status: "pending", preview: "—" }
            ].map((item, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{item.label}</span>
                  {item.status === 'done' && <CheckCircle className="h-3 w-3 text-green-400" />}
                  {item.status === 'processing' && <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
                </div>
                <div className="text-sm text-white truncate">{item.preview}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <FeaturePageTemplate
      badge="KI-Konfigurator"
      badgeIcon={Sparkles}
      title="Seiten mit KI erstellen"
      subtitle="Beschreibe was du möchtest – die KI erstellt die perfekte Lead-Seite für dich. In Sekunden."
      heroImage=""
      heroImageAlt=""
      quickFeatures={[
        {
          icon: Sparkles,
          title: "Prompt-basiert",
          description: "Beschreibe, die KI baut"
        },
        {
          icon: Palette,
          title: "Design anpassen",
          description: "Farben, Texte, Layout"
        },
        {
          icon: Zap,
          title: "Sofort fertig",
          description: "In Sekunden generiert"
        }
      ]}
      sections={[
        {
          title: "Beschreibe einfach, was du willst",
          description: "Statt stundenlang an Texten zu feilen, sagst du der KI einfach was du brauchst: 'Erstelle eine Seite für IT-Entscheider mit Fokus auf Effizienz'. Die KI generiert Headlines, Texte und passt die Farben an.",
          features: [
            { icon: FileText, text: "Automatische Texterstellung" },
            { icon: Palette, text: "Farbschema anpassen" },
            { icon: Target, text: "Zielgruppen-Optimierung" },
            { icon: CheckCircle, text: "Volle Kontrolle behalten" }
          ],
          mockup: <AIConfiguratorMockup />
        },
        {
          title: "Iterieren bis es perfekt ist",
          description: "Gefällt dir etwas nicht? Sag es der KI. Sie passt einzelne Abschnitte an, ändert den Ton oder optimiert für andere Zielgruppen. Schneller als jeder Designer.",
          features: [
            { icon: Zap, text: "Schnelle Anpassungen" },
            { icon: Sparkles, text: "Intelligente Vorschläge" },
            { icon: TrendingUp, text: "A/B-Test Varianten" },
            { icon: Clock, text: "Seiten in Minuten" }
          ],
          reversed: true,
          mockup: (
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-primary/10 to-purple-500/10 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium">KI-Konfigurator</span>
              </div>
              
              <div className="bg-background/50 backdrop-blur rounded-xl border border-white/10 p-4">
                <p className="text-sm text-muted-foreground mb-3">Dein Prompt:</p>
                <p className="text-sm italic">"Erstelle eine Seite für IT-Entscheider mit Fokus auf ROI und Zeitersparnis"</p>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Generiere personalisierte Inhalte...
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {["Headline", "Texte", "Design"].map((item) => (
                  <div key={item} className="bg-primary/10 rounded-lg p-3 text-center text-sm">
                    <CheckCircle className="h-4 w-4 text-primary mx-auto mb-1" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )
        }
      ]}
      benefits={[
        {
          icon: Clock,
          title: "Stunden sparen",
          description: "Was früher Tage dauerte, erledigst du in Minuten"
        },
        {
          icon: Target,
          title: "Bessere Ergebnisse",
          description: "KI-optimierte Texte für deine Zielgruppe"
        },
        {
          icon: Zap,
          title: "Mehr Varianten",
          description: "Teste verschiedene Ansätze ohne Aufwand"
        }
      ]}
    />
  );
};

export default KIKonfigurator;
