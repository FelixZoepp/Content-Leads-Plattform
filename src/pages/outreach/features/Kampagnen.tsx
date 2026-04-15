import { FeaturePageTemplate } from "@/components/landing/FeaturePageTemplate";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target,
  Zap,
  PieChart,
  Activity,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  MessageSquare,
  UserPlus,
  Eye,
  Percent,
  LayoutGrid
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Campaign Dashboard Mockup
const CampaignDashboardMockup = () => (
  <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-1">
    <div className="rounded-xl bg-slate-900/90 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <LayoutGrid className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Kampagnen-Übersicht</h3>
            <p className="text-xs text-slate-400">3 aktive Kampagnen</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">+12% diese Woche</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Vernetzungen", value: "847", change: "+23", up: true, icon: UserPlus },
          { label: "Annahmerate", value: "42%", change: "+5%", up: true, icon: Percent },
          { label: "Antworten", value: "156", change: "+18", up: true, icon: MessageSquare },
          { label: "Termine", value: "34", change: "+7", up: true, icon: Calendar }
        ].map((kpi, i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <kpi.icon className="h-4 w-4 text-slate-400" />
              <span className={`text-xs flex items-center gap-0.5 ${kpi.up ? 'text-green-400' : 'text-red-400'}`}>
                {kpi.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {kpi.change}
              </span>
            </div>
            <p className="text-xl font-bold text-white">{kpi.value}</p>
            <p className="text-xs text-slate-400">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Campaign List */}
      <div className="space-y-3">
        {[
          { name: "SaaS Founders Q1", status: "aktiv", leads: 312, rate: 48, responses: 67, color: "from-green-500 to-emerald-500" },
          { name: "Agency Owners", status: "aktiv", leads: 245, rate: 39, responses: 52, color: "from-blue-500 to-cyan-500" },
          { name: "E-Commerce Leads", status: "aktiv", leads: 290, rate: 41, responses: 37, color: "from-purple-500 to-pink-500" }
        ].map((campaign, i) => (
          <div key={i} className="bg-slate-800/30 rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${campaign.color}`} />
                <span className="text-sm font-medium text-white">{campaign.name}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">{campaign.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-semibold text-white">{campaign.leads}</p>
                <p className="text-xs text-slate-400">Leads</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-primary">{campaign.rate}%</p>
                <p className="text-xs text-slate-400">Annahmerate</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-white">{campaign.responses}</p>
                <p className="text-xs text-slate-400">Antworten</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// KPI Analytics Mockup
const KPIAnalyticsMockup = () => (
  <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-1">
    <div className="rounded-xl bg-slate-900/90 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-white">KPI-Analyse</h3>
          <p className="text-xs text-slate-400">Letzte 30 Tage</p>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div className="space-y-4 mb-6">
        <p className="text-xs text-slate-400 uppercase tracking-wider">Conversion Funnel</p>
        
        {[
          { stage: "Vernetzungen gesendet", value: 500, percent: 100, color: "bg-blue-500" },
          { stage: "Angenommen", value: 210, percent: 42, color: "bg-cyan-500" },
          { stage: "Erstnachricht gesendet", value: 180, percent: 36, color: "bg-purple-500" },
          { stage: "Antwort erhalten", value: 72, percent: 14, color: "bg-pink-500" },
          { stage: "Termin gebucht", value: 28, percent: 6, color: "bg-green-500" }
        ].map((stage, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-white">{stage.stage}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">{stage.value}</span>
                <span className="text-xs text-slate-400">({stage.percent}%)</span>
              </div>
            </div>
            <Progress value={stage.percent} className="h-2 bg-slate-700" indicatorClassName={stage.color} />
          </div>
        ))}
      </div>

      {/* Conversion Rates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-xs text-slate-400 mb-1">Annahmerate</p>
          <p className="text-2xl font-bold text-primary">42%</p>
          <p className="text-xs text-green-400">+5% vs. Vormonat</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-xs text-slate-400 mb-1">Response Rate</p>
          <p className="text-2xl font-bold text-primary">34%</p>
          <p className="text-xs text-green-400">+8% vs. Vormonat</p>
        </div>
      </div>
    </div>
  </div>
);

// Campaign Comparison Mockup
const CampaignComparisonMockup = () => (
  <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-1">
    <div className="rounded-xl bg-slate-900/90 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <PieChart className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Kampagnen-Vergleich</h3>
          <p className="text-xs text-slate-400">Performance-Benchmarking</p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-800/50">
              <th className="text-left text-xs text-slate-400 p-3">Kampagne</th>
              <th className="text-center text-xs text-slate-400 p-3">Annahme</th>
              <th className="text-center text-xs text-slate-400 p-3">Response</th>
              <th className="text-center text-xs text-slate-400 p-3">Conv.</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: "SaaS Founders", acceptance: 48, response: 38, conversion: 12, best: true },
              { name: "Agency Owners", acceptance: 39, response: 29, conversion: 8, best: false },
              { name: "E-Commerce", acceptance: 41, response: 22, conversion: 6, best: false }
            ].map((row, i) => (
              <tr key={i} className={`border-t border-white/5 ${row.best ? 'bg-green-500/10' : ''}`}>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white">{row.name}</span>
                    {row.best && <span className="text-xs text-green-400">🏆</span>}
                  </div>
                </td>
                <td className="text-center p-3">
                  <span className={`text-sm font-medium ${row.acceptance >= 45 ? 'text-green-400' : 'text-white'}`}>
                    {row.acceptance}%
                  </span>
                </td>
                <td className="text-center p-3">
                  <span className={`text-sm font-medium ${row.response >= 35 ? 'text-green-400' : 'text-white'}`}>
                    {row.response}%
                  </span>
                </td>
                <td className="text-center p-3">
                  <span className={`text-sm font-medium ${row.conversion >= 10 ? 'text-green-400' : 'text-white'}`}>
                    {row.conversion}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Insight */}
      <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <p className="text-xs text-amber-300">
          <span className="font-medium">💡 Insight:</span> "SaaS Founders" hat die beste Performance. Messaging-Strategie auf andere Kampagnen übertragen?
        </p>
      </div>
    </div>
  </div>
);

// Dynamic Limits Mockup
const DynamicLimitsMockup = () => (
  <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-1">
    <div className="rounded-xl bg-slate-900/90 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Intelligente Limits</h3>
          <p className="text-xs text-slate-400">Basierend auf Account-Wärme</p>
        </div>
      </div>

      {/* Account Health */}
      <div className="bg-slate-800/30 rounded-xl p-4 border border-white/5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-white">Account-Wärme</span>
          <span className="text-sm font-medium text-green-400">Optimal</span>
        </div>
        <Progress value={78} className="h-3 bg-slate-700" indicatorClassName="bg-gradient-to-r from-green-500 to-emerald-500" />
        <div className="flex justify-between mt-2">
          <span className="text-xs text-slate-400">Kalt</span>
          <span className="text-xs text-slate-400">Warm</span>
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-3">
        <p className="text-xs text-slate-400 uppercase tracking-wider">Empfohlene Limits</p>
        
        {[
          { metric: "Vernetzungen / Tag", current: 20, recommended: 25, reason: "Annahmerate >45%" },
          { metric: "Nachrichten / Tag", current: 15, recommended: 15, reason: "Optimal" },
          { metric: "Follow-ups / Tag", current: 10, recommended: 12, reason: "Response Rate steigt" }
        ].map((limit, i) => (
          <div key={i} className="bg-slate-800/30 rounded-lg p-3 border border-white/5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-white">{limit.metric}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">{limit.current}</span>
                <span className="text-xs text-slate-500">→</span>
                <span className={`text-sm font-medium ${limit.recommended > limit.current ? 'text-green-400' : 'text-primary'}`}>
                  {limit.recommended}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500">{limit.reason}</p>
          </div>
        ))}
      </div>

      {/* Apply Button */}
      <button className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-medium">
        Empfehlungen übernehmen
      </button>
    </div>
  </div>
);

export default function Kampagnen() {
  return (
    <FeaturePageTemplate
      badge="Kampagnen-Management"
      badgeIcon={LayoutGrid}
      title="Alle KPIs auf einen Blick"
      subtitle="Verwalte deine LinkedIn-Kampagnen mit vollständiger Transparenz. Annahmeraten, Response Rates, Conversions – alles in einem Dashboard."
      heroImage=""
      heroImageAlt=""
      quickFeatures={[
        {
          icon: BarChart3,
          title: "Vollständige Analytics",
          description: "Annahmeraten, Response Rates und Conversion Tracking"
        },
        {
          icon: PieChart,
          title: "Kampagnen-Vergleich",
          description: "Benchmarke deine Kampagnen gegeneinander"
        },
        {
          icon: Activity,
          title: "Intelligente Limits",
          description: "Dynamische Empfehlungen basierend auf Performance"
        }
      ]}
      sections={[
        {
          badge: "Dashboard",
          badgeIcon: LayoutGrid,
          title: "Alle Kampagnen",
          highlightedTitle: "in einer Übersicht",
          description: "Sieh auf einen Blick, wie deine Kampagnen performen. Vernetzungen, Annahmeraten, Antworten und Termine – alle wichtigen Kennzahlen sofort sichtbar. Keine Excel-Tabellen, keine manuellen Berechnungen.",
          features: [
            { icon: UserPlus, text: "Vernetzungen tracken" },
            { icon: Percent, text: "Annahmeraten messen" },
            { icon: MessageSquare, text: "Antworten zählen" },
            { icon: Calendar, text: "Termine erfassen" }
          ],
          mockup: <CampaignDashboardMockup />
        },
        {
          badge: "Analytics",
          badgeIcon: BarChart3,
          title: "Vollständiger",
          highlightedTitle: "Conversion Funnel",
          description: "Verfolge jeden Schritt deiner Leads – von der Vernetzungsanfrage bis zum gebuchten Termin. Identifiziere genau, wo Leads abspringen und optimiere gezielt.",
          features: [
            { icon: TrendingUp, text: "Funnel-Visualisierung" },
            { icon: Percent, text: "Conversion Rates pro Stufe" },
            { icon: ArrowUpRight, text: "Trend-Vergleiche" },
            { icon: Target, text: "Drop-off Analyse" }
          ],
          mockup: <KPIAnalyticsMockup />,
          reversed: true
        },
        {
          badge: "Benchmarking",
          badgeIcon: PieChart,
          title: "Vergleiche deine",
          highlightedTitle: "Kampagnen-Performance",
          description: "Welche Kampagne performt am besten? Vergleiche Annahmeraten, Response Rates und Conversions side-by-side. Erkenne Gewinner-Strategien und übertrage sie auf andere Kampagnen.",
          features: [
            { icon: BarChart3, text: "Side-by-side Vergleich" },
            { icon: CheckCircle, text: "Best Performer markiert" },
            { icon: Zap, text: "Actionable Insights" },
            { icon: Target, text: "Optimierungsvorschläge" }
          ],
          mockup: <CampaignComparisonMockup />
        },
        {
          badge: "Intelligenz",
          badgeIcon: Activity,
          title: "Dynamische Limits",
          highlightedTitle: "basierend auf Daten",
          description: "Unser System analysiert deine Account-Wärme und Performance-Daten und empfiehlt optimale tägliche Limits. Hohe Annahmerate? Mehr Vernetzungen möglich. Account noch kalt? Konservative Limits zum Schutz.",
          features: [
            { icon: Activity, text: "Account-Wärme Analyse" },
            { icon: TrendingUp, text: "Performance-basierte Limits" },
            { icon: CheckCircle, text: "Automatische Empfehlungen" },
            { icon: Eye, text: "LinkedIn-konform bleiben" }
          ],
          mockup: <DynamicLimitsMockup />,
          reversed: true
        }
      ]}
      benefits={[
        {
          icon: Eye,
          title: "Volle Transparenz",
          description: "Alle KPIs auf einen Blick – keine versteckten Zahlen, keine Überraschungen"
        },
        {
          icon: TrendingUp,
          title: "Datengetriebene Entscheidungen",
          description: "Optimiere basierend auf echten Zahlen, nicht auf Bauchgefühl"
        },
        {
          icon: Zap,
          title: "Mehr Ergebnisse",
          description: "Durch Benchmarking und Optimierung holst du das Maximum raus"
        }
      ]}
    />
  );
}
