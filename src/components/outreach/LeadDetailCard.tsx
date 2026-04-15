import { useState } from "react";
import { 
  Mail, 
  Phone, 
  Globe, 
  Copy, 
  Building2, 
  MapPin,
  Edit3,
  Plus,
  Play,
  MousePointer,
  ExternalLink,
  Eye,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

interface LeadEvent {
  id: string;
  type: string;
  label: string;
  timestamp: string;
  color: "blue" | "purple" | "orange" | "green";
}

interface LeadData {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  parentCompany?: string;
  dealId?: string;
  email?: string;
  phone?: string;
  website?: string;
  country?: string;
  leadScore: number;
  outreachStatus: string;
  leadStatus: "hot" | "warm" | "cold";
  note?: string;
  events: LeadEvent[];
}

interface LeadDetailCardProps {
  lead: LeadData;
  onClose?: () => void;
}

const LeadDetailCard = ({ lead, onClose }: LeadDetailCardProps) => {
  const [activeTab, setActiveTab] = useState("activities");

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} kopiert`);
  };

  const getStatusColor = (status: "hot" | "warm" | "cold") => {
    switch (status) {
      case "hot":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "warm":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "cold":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "booking":
        return <ExternalLink className="w-3.5 h-3.5" />;
      case "click":
        return <MousePointer className="w-3.5 h-3.5" />;
      case "video_complete":
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "video_start":
        return <Play className="w-3.5 h-3.5" />;
      case "page_view":
        return <Eye className="w-3.5 h-3.5" />;
      default:
        return <Eye className="w-3.5 h-3.5" />;
    }
  };

  const getEventColor = (color: string) => {
    switch (color) {
      case "blue":
        return "bg-blue-500/20 text-blue-400";
      case "purple":
        return "bg-purple-500/20 text-purple-400";
      case "orange":
        return "bg-orange-500/20 text-orange-400";
      case "green":
        return "bg-green-500/20 text-green-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const scorePercentage = Math.min(lead.leadScore, 100);
  const scoreColor = scorePercentage >= 70 
    ? "bg-gradient-to-r from-orange-500 to-red-500" 
    : scorePercentage >= 40 
      ? "bg-gradient-to-r from-amber-500 to-orange-500"
      : "bg-gradient-to-r from-blue-500 to-cyan-500";

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="glass-card overflow-hidden">
        {/* Header Section */}
        <div className="p-6 border-b border-white/5">
          <h2 className="text-2xl font-bold text-foreground mb-1">
            {lead.firstName} {lead.lastName}
          </h2>
          <p className="text-base text-muted-foreground mb-1">{lead.company}</p>
          {(lead.parentCompany || lead.dealId) && (
            <p className="text-xs text-muted-foreground/70">
              {lead.parentCompany && <span>{lead.parentCompany}</span>}
              {lead.parentCompany && lead.dealId && <span> • </span>}
              {lead.dealId && <span>{lead.dealId}</span>}
            </p>
          )}
        </div>

        {/* Status / Metrics Row */}
        <div className="p-6 border-b border-white/5">
          <div className="grid grid-cols-3 gap-4">
            {/* Lead Score */}
            <div className="stat-card !p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Lead Score</p>
              <p className="text-2xl font-bold text-foreground mb-2">{lead.leadScore}</p>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${scoreColor} transition-all duration-500`}
                  style={{ width: `${scorePercentage}%` }}
                />
              </div>
            </div>

            {/* Outreach Status */}
            <div className="stat-card !p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Outreach Status</p>
              <div className="mt-1">
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 text-muted-foreground border border-white/10">
                  {lead.outreachStatus}
                </span>
              </div>
            </div>

            {/* Lead Status */}
            <div className="stat-card !p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Lead Status</p>
              <div className="mt-1">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border ${getStatusColor(lead.leadStatus)}`}>
                  {lead.leadStatus === "hot" ? "Hot" : lead.leadStatus === "warm" ? "Warm" : "Cold"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Data Section */}
        <div className="p-6 border-b border-white/5">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4 font-medium">Kontaktdaten</h3>
          <div className="space-y-2">
            {lead.email && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-sm text-foreground">{lead.email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  onClick={() => copyToClipboard(lead.email!, "E-Mail")}
                >
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
            )}

            {lead.phone && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-sm text-foreground">{lead.phone}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  onClick={() => copyToClipboard(lead.phone!, "Telefon")}
                >
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
            )}

            {lead.website && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-sm text-foreground">{lead.website}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  onClick={() => copyToClipboard(lead.website!, "Website")}
                >
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Company / Address Section */}
        <div className="p-6 border-b border-white/5">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Unternehmen</span>
              </div>
              <p className="text-sm text-foreground">{lead.company}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Adresse</span>
              </div>
              <p className="text-sm text-foreground">{lead.country || "—"}</p>
            </div>
          </div>
        </div>

        {/* Lead Note Section */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Lead-Notiz</span>
            <Button variant="link" size="sm" className="text-primary text-xs h-auto p-0">
              <Edit3 className="w-3 h-3 mr-1" />
              Bearbeiten
            </Button>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 min-h-[80px]">
            <p className="text-sm text-muted-foreground italic">
              {lead.note || "Keine Notiz vorhanden..."}
            </p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="px-6 pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full bg-white/[0.03] border border-white/5 p-1 rounded-xl">
              <TabsTrigger 
                value="activities" 
                className="flex-1 rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-sm"
              >
                Aktivitäten
              </TabsTrigger>
              <TabsTrigger 
                value="responses" 
                className="flex-1 rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-sm"
              >
                Antworten
              </TabsTrigger>
              <TabsTrigger 
                value="assets" 
                className="flex-1 rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-sm"
              >
                Assets
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activities" className="mt-4">
              {/* Journey Timeline */}
              <div className="stat-card !p-0 overflow-hidden mb-4">
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                  <div>
                    <h4 className="text-sm font-medium text-foreground">Journey Timeline</h4>
                    <p className="text-xs text-muted-foreground">({lead.events.length} Ereignisse)</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Hinzufügen
                  </Button>
                </div>

                <div className="divide-y divide-white/5">
                  {lead.events.map((event, index) => (
                    <div 
                      key={event.id} 
                      className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getEventColor(event.color)}`}>
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{event.label}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {event.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="responses" className="mt-4">
              <div className="p-8 text-center text-muted-foreground text-sm">
                Keine Antworten vorhanden
              </div>
            </TabsContent>

            <TabsContent value="assets" className="mt-4">
              <div className="p-8 text-center text-muted-foreground text-sm">
                Keine Assets vorhanden
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Bottom padding */}
        <div className="h-6" />
      </div>
    </div>
  );
};

export default LeadDetailCard;

// Demo component with sample data
export const LeadDetailCardDemo = () => {
  const sampleLead: LeadData = {
    id: "1",
    firstName: "Markus",
    lastName: "Bechert",
    company: "Stümpfig Consulting GmbH",
    parentCompany: "Dealsky GmbH",
    dealId: "5465 2025",
    email: "c.stuempfig@dealsky.io",
    phone: "+49 123 456789",
    website: "https://www.dealsky.io",
    country: "Deutschland",
    leadScore: 100,
    outreachStatus: "Ausstehend",
    leadStatus: "hot",
    note: "",
    events: [
      { id: "1", type: "booking", label: "Booking-Seite geöffnet", timestamp: "gerade eben", color: "blue" },
      { id: "2", type: "click", label: "Menü CTA-Button geklickt", timestamp: "vor 2 Min.", color: "purple" },
      { id: "3", type: "video_complete", label: "Video: 100% angesehen", timestamp: "vor 5 Min.", color: "green" },
      { id: "4", type: "video_start", label: "Video gestartet", timestamp: "18.11.2025, 18:40", color: "orange" },
      { id: "5", type: "page_view", label: "Landing Page besucht", timestamp: "18.11.2025, 18:38", color: "blue" },
    ],
  };

  return (
    <div className="min-h-screen p-8 noise-bg dotted-grid">
      <LeadDetailCard lead={sampleLead} />
    </div>
  );
};
