import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Euro, TrendingUp, Phone, Megaphone, ExternalLink, Video } from "lucide-react";
import { toast } from "sonner";
import { getPipelineStages, getStageColor } from "@/lib/pipelineStages";
import LeadDetailPanel from "@/components/outreach/LeadDetailPanel";
import PhoneIntegration from "@/components/outreach/PhoneIntegration";
import SoftphoneDialog from "@/components/outreach/SoftphoneDialog";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors, useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Deal {
  id: string;
  title: string;
  stage: string;
  pipeline: string;
  amount_eur: number;
  due_date: string | null;
  next_action: string | null;
  contacts: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    mobile: string | null;
    lead_score?: number;
    campaign_id?: string;
    personalized_url?: string | null;
    video_status?: string | null;
  } | null;
  setter: { name: string } | null;
  closer: { name: string } | null;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
}

const Pipeline = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [showPhoneSetup, setShowPhoneSetup] = useState(false);
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>(() => {
    return searchParams.get('campaign') || 'all';
  });
  
  // Softphone state
  const [softphoneOpen, setSoftphoneOpen] = useState(false);
  const [softphoneContact, setSoftphoneContact] = useState<{
    phone: string;
    name: string;
    contactId: string;
    dealId: string;
  } | null>(null);

  const handleStartCall = (deal: Deal) => {
    const contact = deal.contacts;
    if (!contact) return;
    
    const phoneNumber = contact.phone || contact.mobile;
    if (!phoneNumber) {
      toast.error('Keine Telefonnummer vorhanden');
      return;
    }
    
    setSoftphoneContact({
      phone: phoneNumber,
      name: `${contact.first_name} ${contact.last_name}`,
      contactId: contact.id,
      dealId: deal.id
    });
    setSoftphoneOpen(true);
  };
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Use only cold pipeline stages for outreach
  const stages = getPipelineStages('cold');

  useEffect(() => {
    fetchCampaigns();
    fetchDeals();
  }, []);

  // Filter deals when campaign selection changes
  useEffect(() => {
    if (selectedCampaign === 'all') {
      setDeals(allDeals);
    } else {
      const filtered = allDeals.filter(deal => 
        deal.contacts?.campaign_id === selectedCampaign
      );
      setDeals(filtered);
    }
    // Update URL
    if (selectedCampaign === 'all') {
      searchParams.delete('campaign');
    } else {
      searchParams.set('campaign', selectedCampaign);
    }
    setSearchParams(searchParams, { replace: true });
  }, [selectedCampaign, allDeals]);

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from('campaigns')
      .select('id, name, status')
      .order('name');
    setCampaigns(data || []);
  };

  const fetchDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          contacts (id, first_name, last_name, phone, mobile, lead_score, campaign_id, personalized_url, video_status),
          setter:setter_id (name),
          closer:closer_id (name)
        `)
        .eq('pipeline', 'cold')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Deals fetch error:', error);
        throw error;
      }
      
      setAllDeals(data as any || []);
      // Initial filter will happen in the useEffect
    } catch (error: any) {
      console.error('Error in fetchDeals:', error);
      toast.error(`Fehler beim Laden der Deals: ${error.message || 'Unbekannter Fehler'}`);
    } finally {
      setLoading(false);
    }
  };

  const getDueDateColor = (dueDate: string | null) => {
    if (!dueDate) return "";
    const today = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays < 0) return "bg-[hsl(var(--danger))] text-[hsl(var(--danger-foreground))]";
    if (diffDays === 0) return "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]";
    if (diffDays <= 7) return "bg-muted text-muted-foreground";
    return "";
  };

  const getStageDeals = (stage: string) => {
    return deals.filter(deal => deal.stage === stage);
  };

  const getPipelineStats = () => {
    const total = deals.length;
    const totalValue = deals.reduce((sum, deal) => sum + Number(deal.amount_eur), 0);
    const hotLeads = deals.filter(d => d.stage === 'Heißer Lead - Anrufen').length;
    const settings = deals.filter(d => d.stage === 'Setting').length;
    const closings = deals.filter(d => d.stage === 'Closing').length;
    const won = deals.filter(d => d.stage === 'Abgeschlossen').length;
    return { total, totalValue, hotLeads, settings, closings, won };
  };

  const stats = getPipelineStats();

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDealId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDealId(null);

    if (!over) return;

    const dealId = active.id as string;
    const overId = over.id as string;
    
    // Determine the target stage - could be a stage name directly or a deal id
    // If overId matches a stage name, use it; otherwise find the stage of the deal we're over
    let newStage: string;
    if (stages.includes(overId as any)) {
      newStage = overId;
    } else {
      // We're over another deal, find its stage
      const overDeal = deals.find(d => d.id === overId);
      if (!overDeal) return;
      newStage = overDeal.stage;
    }
    
    const deal = deals.find(d => d.id === dealId);

    if (!deal || deal.stage === newStage) return;

    // Optimistic update - update both filtered and all deals
    setDeals(deals.map(d => d.id === dealId ? { ...d, stage: newStage } : d));
    setAllDeals(allDeals.map(d => d.id === dealId ? { ...d, stage: newStage } : d));

    try {
      const { error } = await supabase
        .from('deals')
        .update({ stage: newStage as any })
        .eq('id', dealId);

      if (error) throw error;
      
      toast.success(`Deal nach "${newStage}" verschoben`);
    } catch (error: any) {
      console.error('Error updating deal stage:', error);
      toast.error('Fehler beim Verschieben des Deals');
      // Revert optimistic update
      fetchDeals();
    }
  };

  const activeDeal = deals.find(d => d.id === activeDealId);

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Lädt Pipeline...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-4 md:space-y-6">
        {/* Header - Mobile optimized */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-bold">Outreach Pipeline</h1>
            <p className="text-muted-foreground text-xs md:text-sm mt-1">Leads aus Ihren Kampagnen</p>
          </div>
          <div className="flex gap-2 md:gap-3 items-center flex-wrap">
            {/* Campaign Selector */}
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-full md:w-[220px] glass-card border-white/10">
                <Megaphone className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Kampagne wählen" />
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10 z-50">
                <SelectItem value="all">Alle Kampagnen</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${campaign.status === 'active' ? 'bg-emerald-500' : 'bg-muted'}`} />
                      {campaign.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm" onClick={() => setShowPhoneSetup(!showPhoneSetup)} className="shrink-0">
              <Phone className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Telefon</span>
            </Button>
            <Button size="sm" onClick={() => window.location.href = "/power-dialer"} className="shrink-0">
              <Phone className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Power Dialer</span>
            </Button>
          </div>
        </div>

        {showPhoneSetup && (
          <div className="mb-4 md:mb-6">
            <PhoneIntegration />
          </div>
        )}

        {/* KPI Badge Bar - Horizontal scroll on mobile */}
        <div className="flex gap-2 md:gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap scrollbar-hide">
          <Badge variant="secondary" className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm shrink-0">
            <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
            {stats.total} Deals
          </Badge>
          <Badge variant="secondary" className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm shrink-0">
            <Euro className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
            €{stats.totalValue.toLocaleString()}
          </Badge>
          <Badge variant="secondary" className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm bg-orange-500/20 text-orange-400 border border-orange-500/30 shrink-0">
            🔥 {stats.hotLeads}
          </Badge>
          <Badge variant="secondary" className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0">
            📅 {stats.settings}
          </Badge>
          <Badge variant="secondary" className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
            🎯 {stats.closings}
          </Badge>
          <Badge variant="secondary" className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] shrink-0">
            ✅ {stats.won}
          </Badge>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Mobile: Vertical stack, Desktop: Horizontal scroll */}
          <div className="flex flex-col md:grid gap-4 md:gap-6 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(260px, 1fr))` }}>
            {stages.map(stage => {
            const stageDeals = getStageDeals(stage);
            const totalAmount = stageDeals.reduce((sum, deal) => sum + Number(deal.amount_eur), 0);

            return (
              <DroppableStage key={stage} stage={stage} stageColor={getStageColor(stage)} stageDeals={stageDeals} totalAmount={totalAmount} isDragging={!!activeDealId}>
                {stageDeals.map(deal => (
                  <DraggableDealCard
                    key={deal.id}
                    deal={deal}
                    onOpenDetail={() => setSelectedDealId(deal.id)}
                    onStartCall={() => handleStartCall(deal)}
                  />
                ))}
              </DroppableStage>
            );
          })}
          </div>
          
          <DragOverlay>
            {activeDeal && (
              <Card className="opacity-80 rotate-3 cursor-grabbing shadow-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{activeDeal.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    <Euro className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">€{Number(activeDeal.amount_eur).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </DragOverlay>
        </DndContext>

        <LeadDetailPanel 
          dealId={selectedDealId || ""} 
          open={!!selectedDealId}
          onClose={() => setSelectedDealId(null)}
          onUpdate={fetchDeals}
        />

        {/* Softphone Dialog */}
        <SoftphoneDialog
          open={softphoneOpen}
          onClose={() => {
            setSoftphoneOpen(false);
            setSoftphoneContact(null);
          }}
          phoneNumber={softphoneContact?.phone || ""}
          contactName={softphoneContact?.name || ""}
          contactId={softphoneContact?.contactId}
          dealId={softphoneContact?.dealId}
        />
      </div>
    </>
  );
};

// Droppable Stage Component
interface DroppableStageProps {
  stage: string;
  stageColor: string;
  stageDeals: Deal[];
  totalAmount: number;
  isDragging: boolean;
  children: React.ReactNode;
}

const DroppableStage = ({ stage, stageColor, stageDeals, totalAmount, isDragging, children }: DroppableStageProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: { type: 'stage' }
  });

  return (
    <div 
      ref={setNodeRef}
      className={`
        min-w-full md:min-w-[260px] rounded-xl p-3 md:p-4 transition-all duration-200
        bg-white/[0.02] border border-white/10
        ${isOver ? 'ring-2 ring-primary bg-primary/10 border-primary/30 scale-[1.02]' : ''}
        ${isDragging && !isOver ? 'border-dashed border-white/20' : ''}
      `}
    >
      {/* Stage Header */}
      <div className="mb-3 md:mb-4 pb-2 md:pb-3 border-b border-white/10 flex items-center justify-between md:block">
        <Badge className={`${stageColor} text-xs md:text-sm`}>{stage}</Badge>
        <div className="text-xs md:text-sm text-muted-foreground md:mt-2">
          {stageDeals.length} Deals • €{totalAmount.toLocaleString()}
        </div>
      </div>

      {/* Drop Zone Indicator */}
      {isDragging && (
        <div className={`
          mb-3 py-2 px-3 rounded-lg border-2 border-dashed text-center text-xs
          transition-all duration-200
          ${isOver 
            ? 'border-primary bg-primary/20 text-primary' 
            : 'border-white/20 text-muted-foreground'
          }
        `}>
          {isOver ? '↓ Hier ablegen' : 'Hierher ziehen'}
        </div>
      )}

      <SortableContext items={stageDeals.map(d => d.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 min-h-[80px]">
          {children}
          {stageDeals.length === 0 && !isDragging && (
            <div className="text-center py-6 text-muted-foreground/50 text-sm">
              Keine Deals
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

// Draggable Deal Card Component
interface DraggableDealCardProps {
  deal: Deal;
  onOpenDetail: () => void;
  onStartCall: () => void;
}

const DraggableDealCard = ({ deal, onOpenDetail, onStartCall }: DraggableDealCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: deal.id,
    data: { type: 'deal', deal }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getDueDateColor = (dueDate: string | null) => {
    if (!dueDate) return "";
    const today = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays < 0) return "bg-[hsl(var(--danger))] text-[hsl(var(--danger-foreground))]";
    if (diffDays === 0) return "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]";
    if (diffDays <= 7) return "bg-muted text-muted-foreground";
    return "";
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`
        transition-all duration-200 cursor-grab active:cursor-grabbing
        hover:shadow-lg hover:scale-[1.02] hover:border-primary/30
        ${isDragging ? 'ring-2 ring-primary shadow-xl rotate-2' : ''}
      `}
      {...attributes}
      {...listeners}
    >
      <CardHeader className="pb-3" onClick={(e) => {
        e.stopPropagation();
        onOpenDetail();
      }}>
        <CardTitle className="text-base">{deal.title}</CardTitle>
        {deal.contacts && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {deal.contacts.first_name} {deal.contacts.last_name}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onStartCall();
              }}
              disabled={!deal.contacts?.phone && !deal.contacts?.mobile}
            >
              <Phone className="h-4 w-4" />
            </Button>
          </div>
        )}
        {deal.setter && (
          <p className="text-xs text-muted-foreground">
            Setter: {deal.setter.name}
          </p>
        )}
        {deal.closer && (
          <p className="text-xs text-muted-foreground">
            Closer: {deal.closer.name}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Euro className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">€{Number(deal.amount_eur).toLocaleString()}</span>
        </div>
        
        {deal.due_date && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Badge variant="secondary" className={getDueDateColor(deal.due_date)}>
              {new Date(deal.due_date).toLocaleDateString('de-DE')}
            </Badge>
          </div>
        )}

        {deal.next_action && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            📋 {deal.next_action}
          </p>
        )}

        {!deal.next_action && (
          <Badge variant="destructive" className="text-xs">
            Keine nächste Aktion
          </Badge>
        )}

      </CardContent>
    </Card>
  );
};

export default Pipeline;