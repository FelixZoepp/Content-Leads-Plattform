import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  X, 
  Sparkles, 
  ArrowRight, 
  Phone, 
  Mail, 
  Brain, 
  Mic,
  BarChart3,
  Crown,
  ArrowLeft,
  Users,
  TrendingUp
} from "lucide-react";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

interface FeatureRow {
  name: string;
  description: string;
  starter: boolean | string;
  pro: boolean | string;
  scale: boolean | string;
  highlight?: 'pro' | 'scale';
}

const features: FeatureRow[] = [
  // Core Features - All Plans
  {
    name: "Kampagnen & CRM",
    description: "Erstelle und verwalte LinkedIn-Kampagnen mit integriertem CRM",
    starter: true,
    pro: true,
    scale: true,
  },
  {
    name: "Unbegrenzte KI-Landingpages",
    description: "Automatisch generierte, personalisierte Landingpages für jeden Lead",
    starter: true,
    pro: true,
    scale: true,
  },
  {
    name: "Echtzeit-Tracking & Lead-Scoring",
    description: "Verfolge Page Views, Video-Views und berechne Lead-Scores",
    starter: true,
    pro: true,
    scale: true,
  },
  {
    name: "Manuelles Telefonieren mit Notizen",
    description: "Rufe Leads an und dokumentiere deine Gespräche",
    starter: true,
    pro: true,
    scale: true,
  },
  // Pro Features (Pro + Scale)
  {
    name: "KI-Telefonie (Power Dialer)",
    description: "Automatisches Wählen durch Lead-Listen direkt im Browser",
    starter: false,
    pro: true,
    scale: true,
    highlight: 'pro',
  },
  {
    name: "KI-Anrufzusammenfassungen",
    description: "Automatische Zusammenfassung nach jedem Call mit Aktionspunkten",
    starter: false,
    pro: true,
    scale: true,
    highlight: 'pro',
  },
  {
    name: "KI Live-Einwandbehandlung",
    description: "Echtzeit-Coaching während des Calls mit passenden Antworten",
    starter: false,
    pro: true,
    scale: true,
    highlight: 'pro',
  },
  {
    name: "E-Mail-Vorlagen & Mail-Outreach",
    description: "Erstelle E-Mail-Templates und versende automatisierte Follow-ups",
    starter: false,
    pro: true,
    scale: true,
    highlight: 'pro',
  },
  // Scale-Only Features
  {
    name: "Team-Management",
    description: "Mehrere Nutzer verwalten, Rollen zuweisen, Team koordinieren",
    starter: false,
    pro: false,
    scale: true,
    highlight: 'scale',
  },
  {
    name: "Erweiterte Team-Analytics",
    description: "Team-übergreifende KPIs, Reports und Performance-Tracking",
    starter: false,
    pro: false,
    scale: true,
    highlight: 'scale',
  },
  // Seats
  {
    name: "Nutzer-Seats",
    description: "Anzahl der inkludierten Benutzer-Accounts",
    starter: "1 Seat",
    pro: "1 Seat (+Add-on)",
    scale: "3 Seats inkl.",
  },
];

export default function Upgrade() {
  const navigate = useNavigate();
  const { currentTier } = useFeatureAccess();

  const isCurrentPlan = (plan: string) => currentTier === plan;

  return (
    <>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
          <div className="text-center">
            <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20">
              <Sparkles className="mr-1 h-3 w-3" />
              Preise & Pakete
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Unsere Pakete im Überblick
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Buche eine Demo um das passende Paket für dich zu finden.
            </p>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Starter Plan */}
          <Card className={`relative ${isCurrentPlan('starter') ? 'border-primary ring-2 ring-primary/20' : ''}`}>
            {isCurrentPlan('starter') && (
              <div className="absolute -top-3 left-4">
                <Badge className="bg-primary text-primary-foreground">Dein Plan</Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-2xl">Starter</CardTitle>
              <CardDescription>Perfekt für den Einstieg</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-sm text-muted-foreground">
                Perfekt für den Einstieg
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground border-b pb-4">
                <Users className="h-4 w-4" />
                <span>1 Nutzer-Seat</span>
              </div>

              <div className="space-y-3">
                {features.filter(f => f.starter === true).slice(0, 6).map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature.name}</span>
                  </div>
                ))}
              </div>

              <a 
                href="https://calendly.com/zoepp-media/vorgesprach-demo-software"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button variant="outline" className="w-full">
                  {isCurrentPlan('starter') ? "Aktueller Plan" : "Demo buchen"}
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className={`relative border-primary bg-gradient-to-b from-primary/5 to-transparent ${isCurrentPlan('pro') ? 'ring-2 ring-primary/20' : ''}`}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">
                <Crown className="mr-1 h-3 w-3" />
                {isCurrentPlan('pro') ? "Dein Plan" : "Beliebt"}
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                Pro
                <Sparkles className="h-5 w-5 text-primary" />
              </CardTitle>
              <CardDescription>Alle KI-Features inklusive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-sm text-muted-foreground">
                Alle KI-Features inklusive
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground border-b pb-4">
                <Users className="h-4 w-4" />
                <span>1 Seat (+1 Add-on für 49€)</span>
              </div>

              {/* Pro Feature Highlights */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-2">
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">Power Dialer</span>
                </div>
                <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">KI-Einwände</span>
                </div>
                <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-2">
                  <Mic className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">Call Summary</span>
                </div>
                <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">E-Mail Outreach</span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Alles aus Starter, plus:</p>
                {features.filter(f => f.highlight === 'pro').map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">{feature.name}</span>
                  </div>
                ))}
              </div>

              <a 
                href="https://calendly.com/zoepp-media/vorgesprach-demo-software"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button className="w-full bg-primary hover:bg-primary/90">
                  {isCurrentPlan('pro') ? "Aktueller Plan" : "Demo buchen"}
                  {!isCurrentPlan('pro') && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Scale Plan */}
          <Card className={`relative bg-gradient-to-b from-amber-500/10 to-transparent ${isCurrentPlan('scale') ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-amber-500/50'}`}>
            {isCurrentPlan('scale') && (
              <div className="absolute -top-3 left-4">
                <Badge className="bg-amber-500 text-white">Dein Plan</Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                Scale
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </CardTitle>
              <CardDescription>Für Teams mit Wachstumsfokus</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-sm text-muted-foreground">
                Für Teams mit Wachstumsfokus
              </div>

              <div className="flex items-center gap-2 text-sm font-medium text-amber-600 border-b pb-4">
                <Users className="h-4 w-4" />
                <span>3 Nutzer-Seats inklusive</span>
              </div>

              {/* Scale Feature Highlights */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 bg-amber-500/10 rounded-lg px-3 py-2">
                  <Users className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-medium">Team-Mgmt</span>
                </div>
                <div className="flex items-center gap-2 bg-amber-500/10 rounded-lg px-3 py-2">
                  <BarChart3 className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-medium">Team-Analytics</span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Alles aus Pro, plus:</p>
                {features.filter(f => f.highlight === 'scale').map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">{feature.name}</span>
                  </div>
                ))}
              </div>

              <a 
                href="https://calendly.com/zoepp-media/vorgesprach-demo-software"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                  {isCurrentPlan('scale') ? "Aktueller Plan" : "Demo buchen"}
                  {!isCurrentPlan('scale') && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>

        {/* Feature Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Detaillierter Feature-Vergleich
            </CardTitle>
            <CardDescription>
              Alle Features im Überblick
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-4 px-4 font-medium">Feature</th>
                    <th className="text-center py-4 px-4 font-medium w-28">Starter</th>
                    <th className="text-center py-4 px-4 font-medium w-28 bg-primary/5">Pro</th>
                    <th className="text-center py-4 px-4 font-medium w-28 bg-amber-500/5">Scale</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((feature, idx) => (
                    <tr key={idx} className={`border-b last:border-0 ${
                      feature.highlight === 'scale' ? 'bg-amber-500/5' : 
                      feature.highlight === 'pro' ? 'bg-primary/5' : ''
                    }`}>
                      <td className="py-4 px-4">
                        <div>
                          <p className={`font-medium ${
                            feature.highlight === 'scale' ? 'text-amber-600' : 
                            feature.highlight === 'pro' ? 'text-primary' : ''
                          }`}>
                            {feature.highlight === 'scale' && <TrendingUp className="inline h-4 w-4 mr-1" />}
                            {feature.highlight === 'pro' && <Sparkles className="inline h-4 w-4 mr-1" />}
                            {feature.name}
                          </p>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </td>
                      <td className="text-center py-4 px-4">
                        {typeof feature.starter === 'boolean' ? (
                          feature.starter ? (
                            <Check className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          <span className="text-sm font-medium">{feature.starter}</span>
                        )}
                      </td>
                      <td className="text-center py-4 px-4 bg-primary/5">
                        {typeof feature.pro === 'boolean' ? (
                          feature.pro ? (
                            <Check className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          <span className="text-sm font-medium">{feature.pro}</span>
                        )}
                      </td>
                      <td className="text-center py-4 px-4 bg-amber-500/5">
                        {typeof feature.scale === 'boolean' ? (
                          feature.scale ? (
                            <Check className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          <span className="text-sm font-medium">{feature.scale}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="mt-12 text-center">
          <Card className="border-primary bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 p-8">
            <div className="max-w-2xl mx-auto">
              <Phone className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Noch Fragen?</h2>
              <p className="text-muted-foreground mb-6">
                Buche eine Demo – wir beraten dich gerne zum passenden Paket.
              </p>
              <a 
                href="https://calendly.com/zoepp-media/vorgesprach-demo-software"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button 
                  size="lg"
                  className="bg-primary hover:bg-primary/90"
                >
                  <Phone className="mr-2 h-5 w-5" />
                  Demo Termin buchen
                </Button>
              </a>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
