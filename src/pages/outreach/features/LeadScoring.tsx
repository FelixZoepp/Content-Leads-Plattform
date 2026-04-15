import { FeaturePageTemplate } from "@/components/landing/FeaturePageTemplate";
import { 
  Target, 
  Clock, 
  MousePointer, 
  Eye, 
  TrendingUp, 
  Bell,
  Zap,
  BarChart3,
  Activity,
  Play,
  ScrollText,
  Timer,
  Flame,
  ThermometerSun,
  Phone,
  PhoneCall,
  UserCheck,
  CheckCircle
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Lead Scoring Dashboard Mockup
const LeadScoringDashboardMockup = () => (
  <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-1">
    <div className="rounded-xl bg-slate-900/90 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Lead Scoring</h3>
            <p className="text-xs text-slate-400">Echtzeit-Bewertung</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-400">Live Tracking</span>
        </div>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Heiße Leads", value: "12", color: "from-red-500 to-orange-500", icon: Flame },
          { label: "Warme Leads", value: "34", color: "from-amber-500 to-yellow-500", icon: ThermometerSun },
          { label: "Neue Leads", value: "89", color: "from-blue-500 to-cyan-500", icon: Target }
        ].map((stat, i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="h-4 w-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Live Lead Activity */}
      <div className="bg-slate-800/30 rounded-xl p-4 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-white">Aktive Lead-Aktivität</span>
          <span className="text-xs text-slate-400">Letzte 5 Minuten</span>
        </div>
        
        {[
          { name: "Michael S.", company: "TechStart", score: 85, action: "Video angesehen", time: "vor 12s", hot: true },
          { name: "Sarah K.", company: "Digital AG", score: 72, action: "CTA geklickt", time: "vor 45s", hot: true },
          { name: "Thomas M.", company: "Consulting", score: 45, action: "Seite geöffnet", time: "vor 2m", hot: false }
        ].map((lead, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                lead.hot ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white' : 'bg-slate-700 text-slate-300'
              }`}>
                {lead.score}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{lead.name}</p>
                <p className="text-xs text-slate-400">{lead.company}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-primary">{lead.action}</p>
              <p className="text-xs text-slate-500">{lead.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Scoring Factors Mockup
const ScoringFactorsMockup = () => (
  <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-1">
    <div className="rounded-xl bg-slate-900/90 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Bewertungsfaktoren</h3>
          <p className="text-xs text-slate-400">Automatische Punktevergabe</p>
        </div>
      </div>

      <div className="space-y-4">
        {[
          { factor: "Verweildauer", icon: Clock, points: "+5 Punkte / 30 Sek.", value: 85, color: "bg-blue-500" },
          { factor: "Video angesehen", icon: Play, points: "+25 Punkte", value: 100, color: "bg-green-500" },
          { factor: "Scroll-Tiefe", icon: ScrollText, points: "+3 Punkte / 25%", value: 60, color: "bg-amber-500" },
          { factor: "CTA-Klick", icon: MousePointer, points: "+30 Punkte", value: 100, color: "bg-red-500" },
          { factor: "Mehrfacher Besuch", icon: Eye, points: "+15 Punkte", value: 45, color: "bg-purple-500" }
        ].map((item, i) => (
          <div key={i} className="bg-slate-800/30 rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                  <item.icon className="h-4 w-4 text-slate-300" />
                </div>
                <span className="text-sm font-medium text-white">{item.factor}</span>
              </div>
              <span className="text-xs text-primary font-medium">{item.points}</span>
            </div>
            <Progress value={item.value} className="h-2 bg-slate-700" indicatorClassName={item.color} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Real-time Score Calculation Mockup
const ScoreCalculationMockup = () => (
  <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-1">
    <div className="rounded-xl bg-slate-900/90 p-6">
      {/* Lead Profile */}
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
          <span className="text-2xl font-bold text-white">78</span>
        </div>
        <div>
          <h3 className="font-semibold text-white text-lg">Michael Schmidt</h3>
          <p className="text-sm text-slate-400">TechStart GmbH</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs">Heißer Lead</span>
            <span className="text-xs text-slate-500">Score: 78/100</span>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="space-y-4">
        <p className="text-xs text-slate-400 uppercase tracking-wider">Aktivitäts-Timeline</p>
        
        {[
          { time: "14:32:15", action: "Seite geöffnet", points: "+10", total: 10, icon: Eye },
          { time: "14:32:45", action: "30 Sek. auf Seite", points: "+5", total: 15, icon: Timer },
          { time: "14:33:18", action: "Video gestartet", points: "+15", total: 30, icon: Play },
          { time: "14:34:02", action: "Video komplett", points: "+25", total: 55, icon: Play },
          { time: "14:34:30", action: "50% Scroll-Tiefe", points: "+6", total: 61, icon: ScrollText },
          { time: "14:35:12", action: "CTA geklickt", points: "+30", total: 91, icon: MousePointer },
        ].map((event, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-20 text-xs text-slate-500 font-mono">{event.time}</div>
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
              <event.icon className="h-4 w-4 text-slate-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-white">{event.action}</p>
            </div>
            <div className="text-right">
              <span className="text-sm text-green-400 font-medium">{event.points}</span>
              <p className="text-xs text-slate-500">→ {event.total}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alert */}
      <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-orange-400" />
          <div>
            <p className="text-sm font-medium text-white">Lead ist heiß!</p>
            <p className="text-xs text-slate-300">Score über 70 erreicht – jetzt anrufen</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Hot Lead Alert Mockup
const HotLeadAlertMockup = () => (
  <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-1">
    <div className="rounded-xl bg-slate-900/90 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center animate-pulse">
          <Bell className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Hot Lead Benachrichtigung</h3>
          <p className="text-xs text-slate-400">Echtzeit-Alerts</p>
        </div>
      </div>

      {/* Notification Examples */}
      <div className="space-y-3">
        {[
          { 
            title: "🔥 Heißer Lead erkannt!", 
            message: "Michael S. hat Score 85 erreicht",
            action: "Video komplett angesehen + CTA geklickt",
            time: "Jetzt",
            urgent: true
          },
          { 
            title: "📈 Lead wird wärmer", 
            message: "Sarah K. steigt auf Score 65",
            action: "Verweildauer > 2 Minuten",
            time: "vor 3m",
            urgent: false
          },
          { 
            title: "👀 Neuer Seitenbesuch", 
            message: "Thomas M. ist zurück auf der Seite",
            action: "2. Besuch heute",
            time: "vor 8m",
            urgent: false
          }
        ].map((notif, i) => (
          <div 
            key={i} 
            className={`p-4 rounded-xl border ${
              notif.urgent 
                ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20 border-red-500/30' 
                : 'bg-slate-800/50 border-white/5'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <p className={`text-sm font-medium ${notif.urgent ? 'text-white' : 'text-slate-300'}`}>
                {notif.title}
              </p>
              <span className="text-xs text-slate-500">{notif.time}</span>
            </div>
            <p className="text-sm text-slate-400">{notif.message}</p>
            <p className="text-xs text-primary mt-1">{notif.action}</p>
          </div>
        ))}
      </div>

      {/* Settings hint */}
      <div className="mt-4 p-3 rounded-lg bg-slate-800/30 border border-white/5">
        <p className="text-xs text-slate-400">
          <span className="text-primary">Tipp:</span> Benachrichtigungen per E-Mail, Push oder Browser aktivieren
        </p>
      </div>
    </div>
  </div>
);

// Perfect Timing Call Mockup
const PerfectTimingMockup = () => (
  <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-1">
    <div className="rounded-xl bg-slate-900/90 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
            <PhoneCall className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Perfektes Timing</h3>
            <p className="text-xs text-slate-400">Höhere Erreichbarkeit</p>
          </div>
        </div>
      </div>

      {/* Comparison Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-xs text-slate-400 mb-2">Kaltakquise (Random)</p>
          <p className="text-3xl font-bold text-slate-500">~15%</p>
          <p className="text-xs text-slate-500">Erreichbarkeit</p>
        </div>
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-4 border border-green-500/30">
          <p className="text-xs text-green-400 mb-2">Mit Echtzeit-Tracking</p>
          <p className="text-3xl font-bold text-green-400">~65%</p>
          <p className="text-xs text-green-300">Erreichbarkeit</p>
        </div>
      </div>

      {/* Why it works */}
      <div className="space-y-3">
        <p className="text-xs text-slate-400 uppercase tracking-wider">Warum funktioniert das?</p>
        
        {[
          { icon: Eye, text: "Lead ist gerade aktiv am Gerät", desc: "Handy oder Laptop in der Hand" },
          { icon: Clock, text: "Lead hat gerade Zeit", desc: "Sonst würde er nicht auf der Seite sein" },
          { icon: Flame, text: "Lead ist gedanklich bei dir", desc: "Dein Angebot ist frisch im Kopf" },
          { icon: CheckCircle, text: "Lead erwartet deinen Anruf", desc: "Hat CTA geklickt oder Video gesehen" }
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30 border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <item.icon className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{item.text}</p>
              <p className="text-xs text-slate-400">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
            <Phone className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Michael S. ist JETZT online</p>
            <p className="text-xs text-green-300">Score 85 • Video gesehen • Seit 3 Min aktiv</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default function LeadScoring() {
  return (
    <FeaturePageTemplate
      badge="Intelligentes Lead Scoring"
      badgeIcon={Target}
      title="Ruf an, wenn der Lead online ist"
      subtitle="Unser Echtzeit-Tracking zeigt dir, wann deine Leads aktiv sind. Ruf genau dann an, wenn sie am Gerät sind – für bis zu 4x höhere Erreichbarkeit."
      heroImage=""
      heroImageAlt=""
      quickFeatures={[
        {
          icon: PhoneCall,
          title: "Perfektes Timing",
          description: "Ruf an, wenn der Lead gerade aktiv auf deiner Seite ist"
        },
        {
          icon: TrendingUp,
          title: "4x höhere Erreichbarkeit",
          description: "Von ~15% auf ~65% durch optimales Timing"
        },
        {
          icon: Bell,
          title: "Echtzeit-Benachrichtigungen",
          description: "Werde sofort informiert, wenn ein Lead heiß wird"
        }
      ]}
      sections={[
        {
          badge: "Live Tracking",
          badgeIcon: Activity,
          title: "Jede Aktion wird",
          highlightedTitle: "in Echtzeit bewertet",
          description: "Sobald ein Lead deine personalisierte Seite öffnet, beginnt das Tracking. Jede Sekunde Verweildauer, jeder Scroll, jeder Klick wird erfasst und in einen Score umgewandelt. Du siehst live, welche Leads gerade aktiv sind.",
          features: [
            { icon: Eye, text: "Seitenaufrufe tracken" },
            { icon: Clock, text: "Verweildauer messen" },
            { icon: ScrollText, text: "Scroll-Tiefe erfassen" },
            { icon: Play, text: "Video-Engagement" }
          ],
          mockup: <LeadScoringDashboardMockup />
        },
        {
          badge: "Bewertungssystem",
          badgeIcon: BarChart3,
          title: "Intelligente",
          highlightedTitle: "Punktevergabe",
          description: "Unser Algorithmus vergibt Punkte basierend auf dem Engagement-Level. Video komplett angesehen? +25 Punkte. CTA geklickt? +30 Punkte. Lange auf der Seite? Kontinuierlich steigende Punkte. So erkennst du sofort, wer wirklich interessiert ist.",
          features: [
            { icon: Timer, text: "+5 Punkte pro 30 Sekunden" },
            { icon: Play, text: "+25 Punkte bei Video-View" },
            { icon: MousePointer, text: "+30 Punkte bei CTA-Klick" },
            { icon: Eye, text: "+15 Punkte bei Rückkehr" }
          ],
          mockup: <ScoringFactorsMockup />,
          reversed: true
        },
        {
          badge: "Score-Berechnung",
          badgeIcon: TrendingUp,
          title: "Transparente",
          highlightedTitle: "Aktivitäts-Timeline",
          description: "Für jeden Lead siehst du exakt, wie sein Score entstanden ist. Eine detaillierte Timeline zeigt jede Aktion mit Zeitstempel und Punktzahl. So weißt du genau, was den Lead interessiert hat.",
          features: [
            { icon: Activity, text: "Komplette Aktivitäts-Historie" },
            { icon: BarChart3, text: "Punkte pro Aktion sichtbar" },
            { icon: Clock, text: "Zeitstempel für alles" },
            { icon: Flame, text: "Hot-Lead-Schwelle bei 70+" }
          ],
          mockup: <ScoreCalculationMockup />
        },
        {
          badge: "Benachrichtigungen",
          badgeIcon: Bell,
          title: "Werde sofort informiert,",
          highlightedTitle: "wenn ein Lead heiß wird",
          description: "Sobald ein Lead die Hot-Lead-Schwelle überschreitet, wirst du sofort benachrichtigt. Per Push, E-Mail oder direkt im Dashboard. So verpasst du nie den perfekten Moment zum Anrufen.",
          features: [
            { icon: Bell, text: "Push-Benachrichtigungen" },
            { icon: Zap, text: "Echtzeit-Alerts" },
            { icon: Flame, text: "Hot-Lead-Erkennung" },
            { icon: Target, text: "Priorisierte Anrufliste" }
          ],
          mockup: <HotLeadAlertMockup />,
          reversed: true
        },
        {
          badge: "Höhere Erreichbarkeit",
          badgeIcon: PhoneCall,
          title: "Ruf an, wenn der Lead",
          highlightedTitle: "gerade am Gerät ist",
          description: "Das größte Problem bei Kaltakquise? Niemand geht ran. Mit Echtzeit-Tracking rufst du genau dann an, wenn der Lead aktiv ist. Er hat das Handy in der Hand, dein Angebot im Kopf – und nimmt ab.",
          features: [
            { icon: UserCheck, text: "Lead ist gerade aktiv" },
            { icon: Clock, text: "Lead hat offensichtlich Zeit" },
            { icon: Flame, text: "Dein Angebot ist frisch im Kopf" },
            { icon: Phone, text: "Bis zu 4x höhere Erreichbarkeit" }
          ],
          mockup: <PerfectTimingMockup />
        }
      ]}
      benefits={[
        {
          icon: PhoneCall,
          title: "4x höhere Erreichbarkeit",
          description: "Von ~15% auf ~65% – weil du anrufst, wenn der Lead am Gerät ist"
        },
        {
          icon: Target,
          title: "Fokus auf A-Leads",
          description: "Verschwende keine Zeit mit kalten Leads – konzentriere dich auf die Heißen"
        },
        {
          icon: TrendingUp,
          title: "Höhere Conversion",
          description: "Perfektes Timing + warmer Lead = mehr abgeschlossene Deals"
        }
      ]}
    />
  );
}
