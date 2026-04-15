import { FeaturePageTemplate } from "@/components/landing/FeaturePageTemplate";
import { Users, LayoutDashboard, Filter, Tag, Search, Clock, Target, TrendingUp, Zap, Mail, Phone, Eye, Star, Calendar, UserCheck, ArrowRight, CheckCircle, MessageSquare } from "lucide-react";

const CRM = () => {
  // Apple-style CRM Dashboard Mockup
  const CRMDashboardMockup = () => (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 p-2">
      {/* Browser Chrome */}
      <div className="rounded-xl bg-[#0d1117] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="ml-4 text-xs text-gray-500">pitchfirst.io/dashboard</span>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Leads", value: "247", color: "text-blue-400" },
              { label: "Hot Leads", value: "18", color: "text-orange-400" },
              { label: "Diese Woche", value: "+34", color: "text-green-400" },
              { label: "Termine", value: "12", color: "text-purple-400" }
            ].map((stat, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
          
          {/* Contact List */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
              <span className="text-sm font-medium">Letzte Aktivität</span>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center">
                  <Search className="h-3 w-3 text-gray-400" />
                </div>
                <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center">
                  <Filter className="h-3 w-3 text-gray-400" />
                </div>
              </div>
            </div>
            
            {[
              { name: "Max Mustermann", company: "Tech GmbH", status: "hot", action: "Video angesehen", time: "vor 2 Min" },
              { name: "Anna Schmidt", company: "Digital AG", status: "warm", action: "Seite besucht", time: "vor 15 Min" },
              { name: "Peter Meyer", company: "Sales Corp", status: "new", action: "Lead erstellt", time: "vor 1 Std" }
            ].map((contact, idx) => (
              <div key={idx} className="px-4 py-3 border-b border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    contact.status === 'hot' ? 'bg-orange-500/20' : 
                    contact.status === 'warm' ? 'bg-yellow-500/20' : 'bg-blue-500/20'
                  }`}>
                    <span className="text-xs font-medium">{contact.name.split(' ').map(n => n[0]).join('')}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium">{contact.name}</div>
                    <div className="text-xs text-gray-400">{contact.company}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-300">{contact.action}</div>
                  <div className="text-xs text-gray-500">{contact.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Setter-Closer Pipeline Mockup
  const SetterCloserPipelineMockup = () => (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-1">
      <div className="rounded-xl bg-slate-900/90 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Setter-Closer Pipeline</h3>
            <p className="text-xs text-slate-400">Erstgespräch → Beratungsgespräch</p>
          </div>
        </div>

        {/* Pipeline Stages */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          {[
            { stage: "Lead", count: 45, color: "bg-slate-600" },
            { stage: "Erstgespräch", count: 12, color: "bg-blue-500" },
            { stage: "Qualifiziert", count: 8, color: "bg-purple-500" },
            { stage: "Beratung", count: 5, color: "bg-amber-500" },
            { stage: "Gewonnen", count: 3, color: "bg-green-500" }
          ].map((col, idx) => (
            <div key={idx} className="text-center">
              <div className={`${col.color} rounded-lg py-2 px-1 mb-2`}>
                <p className="text-xs font-medium text-white truncate">{col.stage}</p>
              </div>
              <p className="text-lg font-bold text-white">{col.count}</p>
            </div>
          ))}
        </div>

        {/* Flow Visualization */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-4">Der Agentur-Vertriebsprozess</p>
          
          <div className="flex items-center justify-between">
            {[
              { step: "1", title: "Lead kommt rein", desc: "Via LinkedIn/Outreach" },
              { step: "2", title: "Erstgespräch", desc: "15-20 Min. Qualifizierung" },
              { step: "3", title: "Beratungsgespräch", desc: "45-60 Min. Closing" },
              { step: "4", title: "Abschluss", desc: "Deal gewonnen" }
            ].map((item, i) => (
              <div key={i} className="flex items-center">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mx-auto mb-2">
                    <span className="text-sm font-bold text-primary">{item.step}</span>
                  </div>
                  <p className="text-xs font-medium text-white">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
                {i < 3 && <ArrowRight className="h-4 w-4 text-slate-600 mx-2" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Two-Call System Mockup
  const TwoCallSystemMockup = () => (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-1">
      <div className="rounded-xl bg-slate-900/90 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Phone className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">2-Gespräche-System</h3>
            <p className="text-xs text-slate-400">Der Agentur-Standard</p>
          </div>
        </div>

        {/* Two Call Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Erstgespräch */}
          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-4 border border-blue-500/30">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Erstgespräch</p>
                <p className="text-xs text-blue-300">15-20 Minuten</p>
              </div>
            </div>
            
            <div className="space-y-2">
              {[
                "Bedarf & Situation klären",
                "Budget-Rahmen abfragen",
                "Entscheider identifizieren",
                "Termin für Beratung legen"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-blue-400" />
                  <span className="text-xs text-slate-300">{item}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs text-slate-400">Ziel: <span className="text-blue-400">Qualifizierung</span></p>
            </div>
          </div>

          {/* Beratungsgespräch */}
          <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl p-4 border border-amber-500/30">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                <UserCheck className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Beratungsgespräch</p>
                <p className="text-xs text-amber-300">45-60 Minuten</p>
              </div>
            </div>
            
            <div className="space-y-2">
              {[
                "Lösung präsentieren",
                "Case Studies zeigen",
                "Einwände behandeln",
                "Abschluss machen"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-amber-400" />
                  <span className="text-xs text-slate-300">{item}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs text-slate-400">Ziel: <span className="text-amber-400">Abschluss</span></p>
            </div>
          </div>
        </div>

        {/* Why it works */}
        <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-xs text-green-300">
            <span className="font-medium">💡 Warum 2 Gespräche?</span> Im Erstgespräch qualifizierst du. Im Beratungsgespräch schließt du ab. Keine Zeit verschwendet mit unqualifizierten Leads.
          </p>
        </div>
      </div>
    </div>
  );

  // Pipeline Tracking Mockup
  const PipelineTrackingMockup = () => (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-1">
      <div className="rounded-xl bg-slate-900/90 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Pipeline-Tracking</h3>
            <p className="text-xs text-slate-400">Jeder Schritt dokumentiert</p>
          </div>
        </div>

        {/* Deal Card Example */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-sm font-bold text-white">MS</span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Michael Schmidt</p>
                <p className="text-xs text-slate-400">TechStart GmbH • 5.000€</p>
              </div>
            </div>
            <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs">Beratungsgespräch</span>
          </div>

          {/* Timeline */}
          <div className="space-y-2 pl-5 border-l-2 border-slate-700">
            {[
              { date: "15.01.", action: "Lead erstellt", type: "lead" },
              { date: "16.01.", action: "Erstgespräch gebucht", type: "setting" },
              { date: "18.01.", action: "Erstgespräch ✓ Qualifiziert", type: "done" },
              { date: "20.01.", action: "Beratungsgespräch heute 14:00", type: "next" }
            ].map((event, i) => (
              <div key={i} className="flex items-center gap-3 relative">
                <div className={`absolute -left-[21px] w-3 h-3 rounded-full ${
                  event.type === 'next' ? 'bg-amber-500 animate-pulse' :
                  event.type === 'done' ? 'bg-green-500' : 'bg-slate-600'
                }`} />
                <span className="text-xs text-slate-500 w-12">{event.date}</span>
                <span className={`text-xs ${event.type === 'next' ? 'text-amber-400 font-medium' : 'text-slate-300'}`}>
                  {event.action}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Show-Rate Erstgespräch", value: "78%", color: "text-blue-400" },
            { label: "Show-Rate Beratung", value: "85%", color: "text-amber-400" },
            { label: "Close-Rate", value: "42%", color: "text-green-400" }
          ].map((stat, i) => (
            <div key={i} className="bg-slate-800/30 rounded-lg p-3 text-center border border-white/5">
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <FeaturePageTemplate
      badge="CRM & Deal-Pipeline"
      badgeIcon={Users}
      title="Die Pipeline für den Agentur-Vertrieb"
      subtitle="Erstgespräch → Beratungsgespräch → Abschluss. Das bewährte 2-Gespräche-System, perfekt abgebildet in deiner Pipeline."
      heroImage=""
      heroImageAlt=""
      quickFeatures={[
        {
          icon: Phone,
          title: "2-Gespräche-System",
          description: "Erstgespräch zur Qualifizierung, Beratungsgespräch zum Abschluss"
        },
        {
          icon: LayoutDashboard,
          title: "Klare Pipeline-Stufen",
          description: "Jeder Lead hat einen eindeutigen Status"
        },
        {
          icon: TrendingUp,
          title: "Conversion-Tracking",
          description: "Miss Show-Rates und Close-Rates"
        }
      ]}
      sections={[
        {
          badge: "Setter-Closer",
          badgeIcon: LayoutDashboard,
          title: "Die Pipeline für",
          highlightedTitle: "den Agentur-Vertrieb",
          description: "Das 2-Gespräche-System ist der Standard im Agenturmarkt: Im Erstgespräch qualifizierst du, im Beratungsgespräch schließt du ab. Unsere Pipeline bildet genau diesen Prozess ab – mit klaren Stufen und automatischen Erinnerungen.",
          features: [
            { icon: MessageSquare, text: "Erstgespräch-Stufe" },
            { icon: UserCheck, text: "Beratungsgespräch-Stufe" },
            { icon: Calendar, text: "Termin-Tracking" },
            { icon: CheckCircle, text: "Automatische Erinnerungen" }
          ],
          mockup: <SetterCloserPipelineMockup />
        },
        {
          badge: "2-Gespräche-System",
          badgeIcon: Phone,
          title: "Erstgespräch + Beratung",
          highlightedTitle: "= maximale Effizienz",
          description: "Warum 2 Gespräche? Im Erstgespräch (15-20 Min.) klärst du Bedarf, Budget und Entscheider. Nur qualifizierte Leads kommen ins Beratungsgespräch (45-60 Min.), wo du abschließt. Keine Zeit verschwendet mit unqualifizierten Leads.",
          features: [
            { icon: Clock, text: "Erstgespräch: 15-20 Min." },
            { icon: Target, text: "Ziel: Qualifizierung" },
            { icon: Calendar, text: "Beratung: 45-60 Min." },
            { icon: Zap, text: "Ziel: Abschluss" }
          ],
          mockup: <TwoCallSystemMockup />,
          reversed: true
        },
        {
          badge: "Tracking",
          badgeIcon: TrendingUp,
          title: "Jeder Schritt",
          highlightedTitle: "dokumentiert und messbar",
          description: "Verfolge jeden Deal von der ersten Kontaktaufnahme bis zum Abschluss. Sieh auf einen Blick: Show-Rates für Erstgespräche, Show-Rates für Beratungsgespräche, Close-Rates. Identifiziere Engpässe und optimiere gezielt.",
          features: [
            { icon: Eye, text: "Vollständige Timeline" },
            { icon: TrendingUp, text: "Show-Rate Tracking" },
            { icon: Target, text: "Close-Rate Analyse" },
            { icon: Zap, text: "Engpässe erkennen" }
          ],
          mockup: <PipelineTrackingMockup />
        },
        {
          title: "Alle deine Leads an einem Ort",
          description: "Importiere Leads aus LinkedIn, CSV oder per API. Alle Kontakte werden automatisch mit Tags, Notizen und Aktivitäten angereichert. Nie wieder zwischen Tools wechseln oder Daten manuell übertragen.",
          features: [
            { icon: Users, text: "Unbegrenzte Kontakte" },
            { icon: Tag, text: "Tags & Kategorien" },
            { icon: Search, text: "Volltext-Suche" },
            { icon: Clock, text: "Aktivitäts-Historie" }
          ],
          mockup: <CRMDashboardMockup />,
          reversed: true
        }
      ]}
      benefits={[
        {
          icon: Target,
          title: "Klarer Prozess",
          description: "Erstgespräch → Beratung → Abschluss. Jeder weiß, was zu tun ist."
        },
        {
          icon: Clock,
          title: "Zeit sparen",
          description: "Nur qualifizierte Leads kommen ins Beratungsgespräch"
        },
        {
          icon: TrendingUp,
          title: "Höhere Close-Rate",
          description: "Durch systematische Qualifizierung schließt du mehr ab"
        }
      ]}
    />
  );
};

export default CRM;
