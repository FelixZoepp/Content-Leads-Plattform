import { useState } from "react";
import { Mic, Eye, Video, Users, Phone, Sparkles, CheckCircle, Play, Clock, Bell, Calendar, ArrowRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface UniqueFeature {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  mockup: React.ReactNode;
}

// Mockup Components
const LiveObjectionMockup = () => (
  <div className="bg-[#0d1117] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
      <div className="w-3 h-3 rounded-full bg-red-500" />
      <div className="w-3 h-3 rounded-full bg-yellow-500" />
      <div className="w-3 h-3 rounded-full bg-green-500" />
      <span className="ml-3 text-xs text-gray-500">Live Call - Max Mustermann</span>
      <div className="ml-auto flex items-center gap-2">
        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          LIVE
        </span>
      </div>
    </div>
    <div className="p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Mic className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-1">Lead sagt:</p>
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <p className="text-white text-sm">"Das ist mir gerade zu teuer..."</p>
          </div>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-xl p-4 border border-primary/30">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-primary text-sm font-medium">KI-Antwortvorschlag</span>
        </div>
        <p className="text-white text-sm leading-relaxed">
          "Verstehe ich total. Darf ich fragen: Wenn der Preis keine Rolle spielen würde – wäre das grundsätzlich interessant für Sie?"
        </p>
        <div className="flex gap-2 mt-3">
          <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs">✓ Einwand isolieren</span>
          <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs">Interesse prüfen</span>
        </div>
      </div>
    </div>
  </div>
);

const RealtimeTrackingMockup = () => (
  <div className="bg-[#0d1117] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
      <div className="w-3 h-3 rounded-full bg-red-500" />
      <div className="w-3 h-3 rounded-full bg-yellow-500" />
      <div className="w-3 h-3 rounded-full bg-green-500" />
      <span className="ml-3 text-xs text-gray-500">Echtzeit-Dashboard</span>
    </div>
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg animate-pulse">
        <Bell className="w-5 h-5 text-orange-400" />
        <div className="flex-1">
          <p className="text-orange-400 text-sm font-medium">Hot Lead aktiv!</p>
          <p className="text-xs text-gray-400">Thomas Schmidt schaut gerade dein Video</p>
        </div>
        <span className="text-xs text-orange-400">Jetzt</span>
      </div>
      
      <div className="space-y-3">
        {[
          { name: "Thomas Schmidt", action: "Video 75%", time: "vor 2 Min", hot: true },
          { name: "Lisa Weber", action: "CTA geklickt", time: "vor 5 Min", hot: true },
          { name: "Michael Braun", action: "Seite geöffnet", time: "vor 12 Min", hot: false },
        ].map((lead, idx) => (
          <div key={idx} className={cn(
            "flex items-center gap-3 p-3 rounded-lg border",
            lead.hot ? "bg-primary/10 border-primary/30" : "bg-white/5 border-white/10"
          )}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
              lead.hot ? "bg-primary text-primary-foreground" : "bg-gray-700 text-gray-300"
            )}>
              {lead.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1">
              <p className="text-white text-sm">{lead.name}</p>
              <p className="text-xs text-gray-400">{lead.action}</p>
            </div>
            <span className="text-xs text-gray-500">{lead.time}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Apple-style Landing Page with embedded video mockup
const AIVideoLandingMockup = () => (
  <div className="bg-[#0d1117] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
    {/* Browser Chrome */}
    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
      <div className="w-3 h-3 rounded-full bg-red-500" />
      <div className="w-3 h-3 rounded-full bg-yellow-500" />
      <div className="w-3 h-3 rounded-full bg-green-500" />
      <div className="ml-3 flex-1 bg-white/10 rounded-full px-3 py-1">
        <span className="text-xs text-gray-400">pitchfirst.io/p/max-mustermann</span>
      </div>
    </div>
    
    {/* Landing Page Content */}
    <div className="p-4 space-y-4 bg-gradient-to-b from-[#0d1117] to-[#1a1f2e]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary/30" />
          <span className="text-xs text-white font-medium">Deine Agentur</span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px]">● Live</span>
      </div>
      
      {/* Hero with Video */}
      <div className="text-center space-y-3">
        <p className="text-primary text-[10px] font-medium uppercase tracking-wider">Persönlich für dich</p>
        <h3 className="text-white text-sm font-bold">Hey Max, ich hab dir was aufgenommen...</h3>
        
        {/* Small Video Player */}
        <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-purple-500/20 aspect-video max-w-[200px] mx-auto border border-white/10">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-5 h-5 text-white ml-0.5" />
            </div>
          </div>
          <div className="absolute bottom-2 left-2 right-2">
            <div className="h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-primary rounded-full" />
            </div>
          </div>
        </div>
        
        {/* Tracking badges */}
        <div className="flex justify-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[8px]">✓ Personalisiert</span>
          <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[8px]">KI-Video</span>
        </div>
      </div>
      
      {/* Benefits Section */}
      <div className="space-y-2">
        {["Mehr Reichweite für dein Business", "Bewährte Strategien", "1:1 Betreuung"].map((text, idx) => (
          <div key={idx} className="flex items-center gap-2 text-[10px] text-gray-300">
            <CheckCircle className="w-3 h-3 text-primary flex-shrink-0" />
            {text}
          </div>
        ))}
      </div>
      
      {/* CTA */}
      <button className="w-full py-2.5 rounded-lg bg-gradient-to-r from-primary to-blue-500 text-white text-xs font-medium flex items-center justify-center gap-2">
        <Calendar className="w-3.5 h-3.5" />
        Termin buchen
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
      
      {/* Testimonial */}
      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
        <div className="flex gap-0.5 mb-1">
          {[...Array(5)].map((_, i) => <Star key={i} className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />)}
        </div>
        <p className="text-[9px] text-gray-400 italic">"Super persönlicher Pitch!"</p>
      </div>
    </div>
  </div>
);

const CRMPipelineMockup = () => (
  <div className="bg-[#0d1117] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
      <div className="w-3 h-3 rounded-full bg-red-500" />
      <div className="w-3 h-3 rounded-full bg-yellow-500" />
      <div className="w-3 h-3 rounded-full bg-green-500" />
      <span className="ml-3 text-xs text-gray-500">Deal Pipeline</span>
    </div>
    <div className="p-4">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {[
          { stage: "Erstgespräch", count: 8, color: "blue" },
          { stage: "Beratung", count: 5, color: "purple" },
          { stage: "Abschluss", count: 3, color: "green" },
        ].map((stage, idx) => (
          <div key={idx} className="min-w-[130px] flex-shrink-0">
            <div className={cn(
              "px-3 py-2 rounded-t-lg text-xs font-medium flex items-center justify-between",
              stage.color === "blue" && "bg-blue-500/20 text-blue-400",
              stage.color === "purple" && "bg-purple-500/20 text-purple-400",
              stage.color === "green" && "bg-green-500/20 text-green-400"
            )}>
              {stage.stage}
              <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">{stage.count}</span>
            </div>
            <div className="bg-white/5 rounded-b-lg p-2 space-y-2 min-h-[120px]">
              {[1, 2].map((_, cardIdx) => (
                <div key={cardIdx} className="bg-white/5 rounded p-2 border border-white/10">
                  <p className="text-white text-xs mb-1">Lead #{idx * 2 + cardIdx + 1}</p>
                  <p className="text-[10px] text-gray-500">€{(Math.random() * 10000).toFixed(0)}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const PowerDialerMockup = () => (
  <div className="bg-[#0d1117] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
      <div className="w-3 h-3 rounded-full bg-red-500" />
      <div className="w-3 h-3 rounded-full bg-yellow-500" />
      <div className="w-3 h-3 rounded-full bg-green-500" />
      <span className="ml-3 text-xs text-gray-500">Power Dialer</span>
    </div>
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium">Thomas Schmidt</p>
          <p className="text-sm text-gray-400">+49 176 1234567</p>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-400">02:34</span>
        </div>
      </div>
      
      <div className="flex justify-center gap-4">
        <button className="w-14 h-14 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
          <Phone className="w-6 h-6 rotate-[135deg]" />
        </button>
        <button className="w-14 h-14 rounded-full bg-green-500 text-white flex items-center justify-center animate-pulse">
          <Phone className="w-6 h-6" />
        </button>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-center">
        {["Termin", "Nachfassen", "Kein Interesse"].map((outcome, idx) => (
          <button key={idx} className="py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300">
            {outcome}
          </button>
        ))}
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">Warteschlange</span>
        <span className="text-primary">12 Leads übrig</span>
      </div>
    </div>
  </div>
);

const uniqueFeatures: UniqueFeature[] = [
  {
    id: "objection",
    icon: Mic,
    title: "Live KI-Einwandbehandlung",
    description: "Während du telefonierst, erkennt die KI Einwände und zeigt dir sofort die passende Antwort – in Echtzeit.",
    mockup: <LiveObjectionMockup />
  },
  {
    id: "tracking",
    icon: Eye,
    title: "Echtzeit-Tracking",
    description: "Sieh live, wenn ein Lead deine Seite besucht, das Video schaut oder auf den CTA klickt.",
    mockup: <RealtimeTrackingMockup />
  },
  {
    id: "video",
    icon: Video,
    title: "KI-Video-Landingpages",
    description: "Für jeden Lead wird automatisch eine personalisierte Landingpage mit Video erstellt.",
    mockup: <AIVideoLandingMockup />
  },
  {
    id: "crm",
    icon: Users,
    title: "CRM mit Pipeline-System",
    description: "Alle Leads, Deals und Aktivitäten in einem System mit klarem Erstgespräch-/Beratungsgespräch-Prinzip.",
    mockup: <CRMPipelineMockup />
  },
  {
    id: "dialer",
    icon: Phone,
    title: "Power Dialer integriert",
    description: "Rufe Leads direkt aus dem CRM an. Keine Telefon-App, keine Umwege – alles in einem System.",
    mockup: <PowerDialerMockup />
  }
];

export const UniqueFeatures = () => {
  const [activeFeature, setActiveFeature] = useState(uniqueFeatures[0].id);
  const currentFeature = uniqueFeatures.find(f => f.id === activeFeature)!;

  return (
    <section className="py-16 md:py-24 px-4 md:px-6 relative z-[1]">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white">
            Diese Features gibt es <span className="text-primary italic underline decoration-primary/50 underline-offset-4">nur bei PitchFirst</span>:
          </h2>
        </div>

        {/* Content - Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Left: Feature List - 50% width */}
          <div className="w-full lg:w-1/2 space-y-1.5 order-2 lg:order-1">
            {uniqueFeatures.map((feature) => {
              const isActive = activeFeature === feature.id;
              const Icon = feature.icon;
              
              return (
                <button
                  key={feature.id}
                  onClick={() => setActiveFeature(feature.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all duration-300",
                    isActive 
                      ? "bg-white/10 border-primary/50" 
                      : "bg-white/[0.02] border-white/10 hover:bg-white/5 hover:border-white/20"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-300",
                      isActive ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={cn(
                        "font-medium text-sm transition-colors",
                        isActive ? "text-white" : "text-white/70"
                      )}>
                        {feature.title}
                      </h3>
                      <p className={cn(
                        "text-xs text-gray-500 mt-0.5 line-clamp-1",
                        isActive ? "text-gray-400" : ""
                      )}>
                        {feature.description}
                      </p>
                    </div>
                    {isActive && (
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Mockup - 50% width */}
          <div className="w-full lg:w-1/2 relative order-1 lg:order-2">
            {/* Glow Effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-blue-500/10 to-purple-500/20 rounded-3xl blur-3xl opacity-40" />
            
            {/* Mockup Container */}
            <div className="relative min-h-[350px] md:min-h-[400px] flex items-center justify-center">
              {uniqueFeatures.map((feature) => (
                <div
                  key={feature.id}
                  className={cn(
                    "w-full transition-all duration-500 ease-out",
                    activeFeature === feature.id 
                      ? "opacity-100 translate-y-0 scale-100 relative" 
                      : "opacity-0 translate-y-4 scale-95 absolute inset-0 pointer-events-none"
                  )}
                >
                  {feature.mockup}
                </div>
              ))}
            </div>
            
            {/* Mobile indicator dots */}
            <div className="flex justify-center gap-2 mt-4 lg:hidden">
              {uniqueFeatures.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => setActiveFeature(feature.id)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    activeFeature === feature.id 
                      ? "bg-primary w-5" 
                      : "bg-white/30 w-1.5 hover:bg-white/50"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UniqueFeatures;
