import { FeaturePageTemplate } from "@/components/landing/FeaturePageTemplate";
import { Video, Sparkles, Users, Clock, Zap, Target, TrendingUp, CheckCircle, Play, User, ArrowRight, Link2, UserCheck } from "lucide-react";

const KIVideos = () => {
  // 2-Phase Video Workflow Mockup
  const VideoWorkflowMockup = () => (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-purple-500/5 to-pink-500/5 p-4">
      <div className="space-y-4">
        {/* Phase 1: Intro */}
        <div className="bg-[#0d1117] rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">1</div>
            <div>
              <p className="text-white font-medium text-sm">Personalisiertes Intro</p>
              <p className="text-xs text-gray-500">6-8 Sekunden • KI-generiert</p>
            </div>
          </div>
          <div className="aspect-video bg-gradient-to-br from-primary/30 to-purple-500/30 rounded-lg relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-2">
                  <User className="h-6 w-6 text-white" />
                </div>
                <p className="text-white text-sm font-medium">"Hey Max!"</p>
                <p className="text-white/60 text-xs">Dein Avatar spricht den Lead an</p>
              </div>
            </div>
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/50 text-[10px] text-white">
              0:06
            </div>
          </div>
        </div>

        {/* Connection Arrow */}
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <Link2 className="w-4 h-4 text-primary" />
          <span className="text-xs text-primary">nahtlos verbunden</span>
          <Link2 className="w-4 h-4 text-primary" />
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        {/* Phase 2: Pitch */}
        <div className="bg-[#0d1117] rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">2</div>
            <div>
              <p className="text-white font-medium text-sm">Dein Pitch-Video</p>
              <p className="text-xs text-gray-500">~1 Minute • Einmal aufnehmen</p>
            </div>
          </div>
          <div className="aspect-video bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <Play className="h-6 w-6 text-white ml-0.5" />
              </div>
            </div>
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <span className="px-2 py-1 rounded bg-black/50 text-[10px] text-white">Dein Angebot</span>
              <span className="px-2 py-1 rounded bg-black/50 text-[10px] text-white">1:00</span>
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/30 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <div>
              <p className="text-green-400 font-medium text-sm">Klares Angebot für den Lead</p>
              <p className="text-xs text-green-400/70">Persönliche Ansprache + professioneller Pitch = mehr Termine</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Trigger Automation Mockup
  const AutoTriggerMockup = () => (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4">
      <div className="bg-[#0d1117] rounded-xl border border-white/10 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-3 text-xs text-gray-500">Automatischer Workflow</span>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Timeline */}
          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-blue-400" />
                </div>
                <div className="w-0.5 h-8 bg-gradient-to-b from-blue-500 to-primary" />
              </div>
              <div className="flex-1 pt-1">
                <p className="text-white font-medium text-sm">Vernetzung angenommen</p>
                <p className="text-xs text-gray-500">Lead akzeptiert deine Anfrage auf LinkedIn</p>
              </div>
              <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded h-fit">Trigger</span>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center animate-pulse">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="w-0.5 h-8 bg-gradient-to-b from-primary to-green-500" />
              </div>
              <div className="flex-1 pt-1">
                <p className="text-white font-medium text-sm">KI generiert Intro-Video</p>
                <p className="text-xs text-gray-500">6-8 Sek. personalisiert auf den Lead</p>
              </div>
              <span className="text-xs text-primary bg-primary/20 px-2 py-1 rounded h-fit">Auto</span>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                  <Video className="w-5 h-5 text-green-400" />
                </div>
              </div>
              <div className="flex-1 pt-1">
                <p className="text-white font-medium text-sm">Video bereit zum Versand</p>
                <p className="text-xs text-gray-500">Intro + Pitch auf der Lead-Seite eingebettet</p>
              </div>
              <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded h-fit">Fertig</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-primary">~30s</p>
              <p className="text-xs text-gray-500">Generierungszeit</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-400">100%</p>
              <p className="text-xs text-gray-500">Automatisiert</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Batch Generation Mockup
  const BatchGenerationMockup = () => (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4">
      <div className="bg-[#0d1117] rounded-xl border border-white/10 p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-medium text-white">Video-Generierung</div>
            <div className="text-sm text-gray-500">47 von 100 Videos fertig</div>
          </div>
        </div>
        
        {/* Progress */}
        <div className="space-y-2">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="w-[47%] h-full bg-gradient-to-r from-purple-500 to-pink-500" />
          </div>
        </div>
        
        {/* Video List */}
        <div className="space-y-2">
          {[
            { name: "Max Mustermann", status: "done" },
            { name: "Anna Schmidt", status: "done" },
            { name: "Peter Meyer", status: "processing" },
            { name: "Laura Weber", status: "pending" }
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
              <span className="text-sm text-white">{item.name}</span>
              <span className={`text-xs px-2 py-1 rounded ${
                item.status === 'done' ? 'bg-green-500/20 text-green-400' :
                item.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-white/10 text-gray-400'
              }`}>
                {item.status === 'done' ? '✓ Fertig' : 
                 item.status === 'processing' ? '⟳ Generiert...' : 'Ausstehend'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <FeaturePageTemplate
      badge="KI-Video Generierung"
      badgeIcon={Video}
      title="Personalisierte KI-Videos"
      subtitle="Erstelle automatisch Videos, die jeden Lead persönlich ansprechen – skalierbar und ohne Aufwand."
      heroImage=""
      heroImageAlt=""
      quickFeatures={[
        {
          icon: Video,
          title: "2-Phasen-Video",
          description: "Personalisiertes Intro + dein Pitch-Video"
        },
        {
          icon: Sparkles,
          title: "Automatische Generierung",
          description: "Startet sobald Vernetzung angenommen wird"
        },
        {
          icon: Zap,
          title: "Unter 30 Sekunden",
          description: "KI generiert Intro in Echtzeit"
        }
      ]}
      sections={[
        {
          badge: "So funktioniert's",
          badgeIcon: Video,
          title: "2 Videos. 1 klares Angebot.",
          description: "Sobald ein Lead deine Vernetzungsanfrage auf LinkedIn annimmt, generiert die KI automatisch ein 6-8 Sekunden Intro-Video, in dem dein Avatar den Lead persönlich anspricht. Dieses Intro wird nahtlos mit deinem 1-Minuten Pitch-Video verbunden – so entsteht ein klares, personalisiertes Angebot für jeden einzelnen Kontakt.",
          features: [
            { icon: User, text: "6-8 Sek. personalisiertes Intro" },
            { icon: Video, text: "~1 Min. Pitch-Video von dir" },
            { icon: Link2, text: "Nahtlos zusammengeschnitten" },
            { icon: Target, text: "Klares Angebot für den Lead" }
          ],
          mockup: <VideoWorkflowMockup />
        },
        {
          badge: "Automatisierung",
          badgeIcon: Zap,
          title: "Startet automatisch bei Vernetzung",
          highlightedTitle: "",
          description: "Du musst nichts mehr manuell anstoßen. Sobald ein Lead deine LinkedIn-Anfrage akzeptiert, startet der Prozess automatisch: Die KI generiert das personalisierte Intro und bindet es auf der Lead-Seite ein. Der Lead kann das Video sofort ansehen.",
          features: [
            { icon: UserCheck, text: "Trigger: Vernetzung angenommen" },
            { icon: Sparkles, text: "KI generiert in ~30 Sekunden" },
            { icon: CheckCircle, text: "Automatisch auf Lead-Seite" },
            { icon: Clock, text: "Kein manueller Aufwand" }
          ],
          mockup: <AutoTriggerMockup />,
          reversed: true
        },
        {
          badge: "Skalierung",
          badgeIcon: TrendingUp,
          title: "Hunderte Videos, ein Aufwand",
          description: "Du nimmst einmalig dein Pitch-Video auf. Die KI erledigt den Rest. Egal ob 10 oder 1.000 Leads – jeder bekommt sein persönliches Video ohne zusätzlichen Zeitaufwand für dich.",
          features: [
            { icon: Zap, text: "Batch-Generierung möglich" },
            { icon: Target, text: "Höhere Response-Rate" },
            { icon: TrendingUp, text: "Mehr Termine, weniger Aufwand" },
            { icon: CheckCircle, text: "Volle Kontrolle über Inhalte" }
          ],
          mockup: <BatchGenerationMockup />
        }
      ]}
      benefits={[
        {
          icon: TrendingUp,
          title: "3x höhere Antwortrate",
          description: "Personalisierte Videos werden deutlich häufiger angesehen und beantwortet"
        },
        {
          icon: Clock,
          title: "90% Zeitersparnis",
          description: "Was früher Stunden dauerte, erledigt die KI in Sekunden"
        },
        {
          icon: Target,
          title: "Mehr Termine",
          description: "Persönliche Ansprache führt zu mehr gebuchten Demos"
        }
      ]}
    />
  );
};

export default KIVideos;
