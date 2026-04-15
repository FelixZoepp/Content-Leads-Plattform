import { useState, useEffect } from "react";
import { Phone, Mic, Lightbulb, MessageSquare, Sparkles, CheckCircle } from "lucide-react";

const objectionScenarios = [
  {
    transcript: "Das ist mir zu teuer...",
    objection: "Preis-Einwand",
    response: "Ich verstehe. Lassen Sie mich fragen: Was kostet Sie ein verlorener Lead, den Sie hätten erreichen können? Mit 80% besserer Erreichbarkeit rechnet sich das Tool meist in der ersten Woche.",
    category: "Preis"
  },
  {
    transcript: "Wir haben bereits ein CRM...",
    objection: "Bestehende Lösung",
    response: "Perfekt! pitchfirst.io ersetzt Ihr CRM nicht, sondern ergänzt es um Echtzeit-Tracking und KI-Einwandbehandlung. Die Integration dauert 5 Minuten.",
    category: "Konkurrenz"
  },
  {
    transcript: "Ich muss das mit meinem Team besprechen...",
    objection: "Entscheidungsverzögerung",
    response: "Absolut verständlich. Was wäre, wenn ich Ihnen eine kurze Demo-Session für Ihr gesamtes Team anbiete? So können alle Fragen direkt beantwortet werden.",
    category: "Timing"
  }
];

export const AIObjectionDemo = () => {
  const [currentScenario, setCurrentScenario] = useState(0);
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'speaking' | 'detecting' | 'responding'>('idle');
  const [displayedTranscript, setDisplayedTranscript] = useState("");
  const [showObjection, setShowObjection] = useState(false);
  const [displayedResponse, setDisplayedResponse] = useState("");
  const [isCallActive, setIsCallActive] = useState(false);

  useEffect(() => {
    if (!isCallActive) return;

    const scenario = objectionScenarios[currentScenario];
    let timeout: ReturnType<typeof setTimeout>;

    const runAnimation = async () => {
      // Phase 1: Speaking - type out transcript
      setAnimationPhase('speaking');
      setDisplayedTranscript("");
      setShowObjection(false);
      setDisplayedResponse("");

      for (let i = 0; i <= scenario.transcript.length; i++) {
        await new Promise(r => setTimeout(r, 50));
        setDisplayedTranscript(scenario.transcript.slice(0, i));
      }

      // Phase 2: Detecting
      await new Promise(r => setTimeout(r, 300));
      setAnimationPhase('detecting');
      
      await new Promise(r => setTimeout(r, 800));
      setShowObjection(true);

      // Phase 3: Responding - type out response
      await new Promise(r => setTimeout(r, 400));
      setAnimationPhase('responding');

      for (let i = 0; i <= scenario.response.length; i++) {
        await new Promise(r => setTimeout(r, 15));
        setDisplayedResponse(scenario.response.slice(0, i));
      }

      // Wait and move to next scenario
      await new Promise(r => setTimeout(r, 4000));
      setCurrentScenario((prev) => (prev + 1) % objectionScenarios.length);
    };

    runAnimation();

    return () => clearTimeout(timeout);
  }, [currentScenario, isCallActive]);

  const scenario = objectionScenarios[currentScenario];

  return (
    <section id="ai-trainer" className="py-12 md:py-20 px-4 md:px-6 relative z-[1]">
      <div className="container mx-auto max-w-6xl scroll-animate scroll-fade-up">
        <div className="text-center mb-8 md:mb-16">
          <p className="text-primary text-xs md:text-sm font-medium mb-2 md:mb-4">Live KI-Einwandbehandlung</p>
          <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold mb-3 md:mb-4 text-white px-2">
            Dein KI-Trainer flüstert dir<br />
            <span className="bg-gradient-to-r from-primary via-blue-400 to-purple-400 bg-clip-text text-transparent">
              die perfekte Antwort ein
            </span>
          </h2>
          <p className="text-gray-300 text-sm md:text-lg max-w-2xl mx-auto px-2">
            Während du telefonierst, erkennt die KI Einwände in Echtzeit und zeigt dir sofort die passende Reaktion.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 md:gap-12 items-center">
          {/* Left: Description */}
          <div className="space-y-6">
            <div className="space-y-4">
              {[
                { icon: Mic, title: "Echtzeit-Erkennung", desc: "Die KI hört mit und analysiert das Gespräch live" },
                { icon: Lightbulb, title: "Sofortige Einwand-Erkennung", desc: "Einwände werden in Millisekunden erkannt und kategorisiert" },
                { icon: MessageSquare, title: "Passende Antwort-Vorschläge", desc: "Du bekommst sofort eine erprobte Reaktion vorgeschlagen" },
                { icon: Sparkles, title: "Lernende KI", desc: "Das System lernt aus deinen erfolgreichen Gesprächen" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-primary/30 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-white font-medium">{item.title}</div>
                    <div className="text-gray-400 text-sm">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Interactive Demo */}
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-2">
            <div className="rounded-xl bg-[#0d1117] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isCallActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                  <span className="text-white text-sm font-medium">
                    {isCallActive ? 'Anruf aktiv' : 'Anruf starten'}
                  </span>
                </div>
                <button
                  onClick={() => setIsCallActive(!isCallActive)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isCallActive 
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                      : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  }`}
                >
                  {isCallActive ? 'Beenden' : 'Demo starten'}
                </button>
              </div>

              <div className="p-4 md:p-6 space-y-4">
                {/* Call UI */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium">Max Müller</div>
                    <div className="text-gray-400 text-sm">Müller Digital GmbH</div>
                  </div>
                  {isCallActive && (
                    <div className="flex items-center gap-1">
                      {[1,2,3].map((i) => (
                        <div 
                          key={i} 
                          className="w-1 bg-green-400 rounded-full animate-pulse"
                          style={{ 
                            height: `${12 + Math.random() * 12}px`,
                            animationDelay: `${i * 0.15}s`
                          }}
                        ></div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Transcript */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 min-h-[80px]">
                  <div className="flex items-center gap-2 mb-2">
                    <Mic className={`h-4 w-4 ${animationPhase === 'speaking' ? 'text-red-400' : 'text-gray-500'}`} />
                    <span className="text-gray-400 text-xs">Live-Transkript</span>
                  </div>
                  <p className="text-white text-sm md:text-base">
                    {isCallActive ? (
                      <>
                        {displayedTranscript}
                        {animationPhase === 'speaking' && <span className="animate-pulse">|</span>}
                      </>
                    ) : (
                      <span className="text-gray-500 italic">Klicke "Demo starten" um die KI in Aktion zu sehen...</span>
                    )}
                  </p>
                </div>

                {/* AI Detection */}
                <div className={`p-4 rounded-xl border transition-all duration-500 ${
                  showObjection 
                    ? 'bg-primary/10 border-primary/30' 
                    : 'bg-white/[0.03] border-white/10'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className={`h-4 w-4 ${animationPhase === 'detecting' ? 'text-yellow-400 animate-pulse' : showObjection ? 'text-primary' : 'text-gray-500'}`} />
                    <span className="text-gray-400 text-xs">KI-Einwandtrainer</span>
                    {animationPhase === 'detecting' && (
                      <span className="text-yellow-400 text-xs animate-pulse">Analysiere...</span>
                    )}
                  </div>

                  {showObjection ? (
                    <div className="space-y-3 animate-fade-in">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-medium">
                          Einwand erkannt
                        </span>
                        <span className="px-2 py-1 rounded bg-primary/20 text-primary text-xs">
                          {scenario.category}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <p className="text-white text-sm">
                            {displayedResponse}
                            {animationPhase === 'responding' && displayedResponse.length < scenario.response.length && (
                              <span className="animate-pulse">|</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm italic">
                      {isCallActive ? 'Warte auf Einwand...' : 'Bereit zur Analyse'}
                    </p>
                  )}
                </div>

                {/* Scenario indicators */}
                {isCallActive && (
                  <div className="flex justify-center gap-2 pt-2">
                    {objectionScenarios.map((_, idx) => (
                      <div 
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-all ${
                          idx === currentScenario ? 'bg-primary w-6' : 'bg-white/20'
                        }`}
                      ></div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
