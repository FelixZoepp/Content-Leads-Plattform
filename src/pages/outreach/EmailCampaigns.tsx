import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccountFilter } from "@/hooks/useAccountFilter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Mail, Send, Pause, Play, BarChart3, Users, MousePointer, Eye, MessageSquare, Loader2, Trash2, ArrowRight, Clock, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface EmailCampaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  total_leads: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_replied: number;
  total_bounced: number;
  send_start_hour: number;
  send_end_hour: number;
  daily_send_limit: number;
  send_days: string[];
  created_at: string;
}

interface CampaignStep {
  id: string;
  campaign_id: string;
  step_order: number;
  delay_days: number;
  subject: string;
  body_text: string;
  variant: string | null;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_replied: number;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Entwurf", variant: "secondary" },
  active: { label: "Aktiv", variant: "default" },
  paused: { label: "Pausiert", variant: "outline" },
  completed: { label: "Abgeschlossen", variant: "secondary" },
};

const EmailCampaigns = () => {
  const { accountId, loading: accountLoading } = useAccountFilter();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Fetch campaigns
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['email-campaigns', accountId],
    queryFn: async () => {
      if (!accountId) return [];
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EmailCampaign[];
    },
    enabled: !!accountId,
  });

  // Create campaign
  const createCampaign = useMutation({
    mutationFn: async () => {
      if (!accountId || !newName.trim()) throw new Error("Name erforderlich");
      const { error } = await supabase.from('email_campaigns').insert({
        account_id: accountId,
        name: newName.trim(),
        description: newDesc.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      toast.success("Kampagne erstellt");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Toggle campaign status
  const toggleStatus = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      const { error } = await supabase.from('email_campaigns').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast.success("Status aktualisiert");
    },
  });

  const selectedCampaignData = campaigns.find(c => c.id === selectedCampaign);

  if (accountLoading || isLoading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cold Mailing</h1>
            <p className="text-muted-foreground text-sm">Erstelle und verwalte E-Mail-Sequenzen für deine Leads</p>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Neue Kampagne</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neue E-Mail-Kampagne</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="z.B. Q1 Outreach SaaS" />
                </div>
                <div>
                  <Label>Beschreibung (optional)</Label>
                  <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Ziel und Zielgruppe..." />
                </div>
                <Button onClick={() => createCampaign.mutate()} disabled={createCampaign.isPending || !newName.trim()}>
                  {createCampaign.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Erstellen
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {selectedCampaign && selectedCampaignData ? (
          <CampaignDetail campaign={selectedCampaignData} onBack={() => setSelectedCampaign(null)} accountId={accountId} />
        ) : (
          <>
            {/* Campaign List */}
            {campaigns.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold text-foreground mb-1">Noch keine E-Mail-Kampagnen</h3>
                  <p className="text-sm text-muted-foreground mb-4">Erstelle deine erste Cold-Mailing-Kampagne</p>
                  <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Neue Kampagne</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {campaigns.map(campaign => {
                  const openRate = campaign.total_sent > 0 ? ((campaign.total_opened / campaign.total_sent) * 100).toFixed(1) : "0";
                  const clickRate = campaign.total_sent > 0 ? ((campaign.total_clicked / campaign.total_sent) * 100).toFixed(1) : "0";
                  const replyRate = campaign.total_sent > 0 ? ((campaign.total_replied / campaign.total_sent) * 100).toFixed(1) : "0";
                  const status = statusConfig[campaign.status] || statusConfig.draft;

                  return (
                    <Card key={campaign.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedCampaign(campaign.id)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">{campaign.name}</h3>
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </div>
                            {campaign.description && <p className="text-xs text-muted-foreground mb-3">{campaign.description}</p>}
                            <div className="flex gap-6 text-xs">
                              <div className="flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">{campaign.total_leads} Leads</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Send className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">{campaign.total_sent} gesendet</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">{openRate}% geöffnet</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MousePointer className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">{clickRate}% geklickt</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">{replyRate}% geantwortet</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            {(campaign.status === 'active' || campaign.status === 'paused') && (
                              <Button variant="ghost" size="icon" onClick={() => toggleStatus.mutate({ id: campaign.id, currentStatus: campaign.status })}>
                                {campaign.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              </Button>
                            )}
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

// Campaign Detail View
const CampaignDetail = ({ campaign, onBack, accountId }: { campaign: EmailCampaign; onBack: () => void; accountId: string | null }) => {
  const queryClient = useQueryClient();
  const [showAddStep, setShowAddStep] = useState(false);
  const [stepSubject, setStepSubject] = useState("");
  const [stepBody, setStepBody] = useState("");
  const [stepDelay, setStepDelay] = useState(0);

  // Fetch steps
  const { data: steps = [] } = useQuery({
    queryKey: ['email-campaign-steps', campaign.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_campaign_steps')
        .select('*')
        .eq('campaign_id', campaign.id)
        .is('variant', null)
        .order('step_order', { ascending: true });
      if (error) throw error;
      return data as CampaignStep[];
    },
  });

  // Fetch lead count
  const { data: leadCount = 0 } = useQuery({
    queryKey: ['email-campaign-leads-count', campaign.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('email_campaign_leads')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id);
      if (error) throw error;
      return count || 0;
    },
  });

  // Add step
  const addStep = useMutation({
    mutationFn: async () => {
      const nextOrder = steps.length + 1;
      const { error } = await supabase.from('email_campaign_steps').insert({
        campaign_id: campaign.id,
        step_order: nextOrder,
        delay_days: nextOrder === 1 ? 0 : stepDelay,
        subject: stepSubject,
        body_text: stepBody,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaign-steps', campaign.id] });
      setShowAddStep(false);
      setStepSubject("");
      setStepBody("");
      setStepDelay(3);
      toast.success("Schritt hinzugefügt");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Delete step
  const deleteStep = useMutation({
    mutationFn: async (stepId: string) => {
      const { error } = await supabase.from('email_campaign_steps').delete().eq('id', stepId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaign-steps', campaign.id] });
      toast.success("Schritt gelöscht");
    },
  });

  // Add leads from contacts
  const addLeads = useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error("Kein Account");
      // Get contacts with email that aren't already in this campaign
      const { data: existingLeads } = await supabase
        .from('email_campaign_leads')
        .select('contact_id')
        .eq('campaign_id', campaign.id);
      
      const existingIds = (existingLeads || []).map(l => l.contact_id);
      
      const query = supabase
        .from('contacts')
        .select('id')
        .eq('account_id', accountId)
        .not('email', 'is', null);
      
      if (existingIds.length > 0) {
        query.not('id', 'in', `(${existingIds.join(',')})`);
      }
      
      const { data: contacts, error: contactErr } = await query.limit(500);
      if (contactErr) throw contactErr;
      if (!contacts || contacts.length === 0) throw new Error("Keine neuen Kontakte mit E-Mail gefunden");
      
      const inserts = contacts.map(c => ({
        campaign_id: campaign.id,
        contact_id: c.id,
        status: 'active',
      }));
      
      const { error } = await supabase.from('email_campaign_leads').insert(inserts);
      if (error) throw error;
      
      // Update campaign lead count
      await supabase.from('email_campaigns').update({ total_leads: (campaign.total_leads || 0) + contacts.length }).eq('id', campaign.id);
      
      return contacts.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['email-campaign-leads-count', campaign.id] });
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast.success(`${count} Leads hinzugefügt`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openRate = campaign.total_sent > 0 ? ((campaign.total_opened / campaign.total_sent) * 100) : 0;
  const clickRate = campaign.total_sent > 0 ? ((campaign.total_clicked / campaign.total_sent) * 100) : 0;
  const replyRate = campaign.total_sent > 0 ? ((campaign.total_replied / campaign.total_sent) * 100) : 0;
  const bounceRate = campaign.total_sent > 0 ? ((campaign.total_bounced / campaign.total_sent) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>← Zurück</Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">{campaign.name}</h2>
          {campaign.description && <p className="text-sm text-muted-foreground">{campaign.description}</p>}
        </div>
        <Badge variant={statusConfig[campaign.status]?.variant || "secondary"}>
          {statusConfig[campaign.status]?.label || campaign.status}
        </Badge>
      </div>

      <Tabs defaultValue="sequence">
        <TabsList>
          <TabsTrigger value="sequence">Sequenz</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="leads">Leads ({leadCount})</TabsTrigger>
          <TabsTrigger value="settings">Einstellungen</TabsTrigger>
        </TabsList>

        {/* Sequence Tab */}
        <TabsContent value="sequence" className="space-y-4">
          {steps.map((step, idx) => (
            <Card key={step.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {idx === 0 ? "Sofort" : `+${step.delay_days} Tage`}
                      </Badge>
                      <span className="text-sm font-medium text-foreground">Schritt {step.step_order}</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">Betreff: {step.subject}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{step.body_text}</p>
                    {step.total_sent > 0 && (
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{step.total_sent} gesendet</span>
                        <span>{step.total_sent > 0 ? ((step.total_opened / step.total_sent) * 100).toFixed(1) : 0}% geöffnet</span>
                        <span>{step.total_sent > 0 ? ((step.total_clicked / step.total_sent) * 100).toFixed(1) : 0}% geklickt</span>
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteStep.mutate(step.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {steps.length > 0 && (
            <div className="flex justify-center">
              <div className="w-px h-6 bg-border" />
            </div>
          )}

          <Dialog open={showAddStep} onOpenChange={setShowAddStep}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full border-dashed">
                <Plus className="h-4 w-4 mr-2" />
                {steps.length === 0 ? "Erste E-Mail hinzufügen" : "Follow-up hinzufügen"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{steps.length === 0 ? "Erste E-Mail" : `Follow-up ${steps.length}`}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {steps.length > 0 && (
                  <div>
                    <Label>Verzögerung (Tage nach vorherigem Schritt)</Label>
                    <Input type="number" min={1} value={stepDelay} onChange={e => setStepDelay(Number(e.target.value))} />
                  </div>
                )}
                <div>
                  <Label>Betreff</Label>
                  <Input value={stepSubject} onChange={e => setStepSubject(e.target.value)} placeholder="z.B. Kurze Frage zu {{company}}" />
                  <p className="text-xs text-muted-foreground mt-1">Variablen: {"{{first_name}}, {{last_name}}, {{company}}, {{position}}"}</p>
                </div>
                <div>
                  <Label>Inhalt</Label>
                  <Textarea rows={8} value={stepBody} onChange={e => setStepBody(e.target.value)} placeholder="Hallo {{first_name}},&#10;&#10;ich wollte kurz..." />
                </div>
                <Button onClick={() => addStep.mutate()} disabled={addStep.isPending || !stepSubject.trim() || !stepBody.trim()}>
                  {addStep.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Hinzufügen
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Send className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold text-foreground">{campaign.total_sent}</p>
                <p className="text-xs text-muted-foreground">Gesendet</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Eye className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold text-foreground">{openRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Öffnungsrate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <MousePointer className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold text-foreground">{clickRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Klickrate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <MessageSquare className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold text-foreground">{replyRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Antwortrate</p>
              </CardContent>
            </Card>
          </div>

          {campaign.total_bounced > 0 && (
            <Card className="border-destructive/30">
              <CardContent className="p-4 flex items-center gap-3">
                <Badge variant="destructive">{bounceRate.toFixed(1)}%</Badge>
                <span className="text-sm text-muted-foreground">{campaign.total_bounced} Bounces</span>
              </CardContent>
            </Card>
          )}

          {/* Per-Step Analytics */}
          {steps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Schritt-Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {steps.map(step => {
                  const sOpenRate = step.total_sent > 0 ? (step.total_opened / step.total_sent) * 100 : 0;
                  return (
                    <div key={step.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-foreground font-medium">Schritt {step.step_order}: {step.subject}</span>
                        <span className="text-muted-foreground">{step.total_sent} gesendet</span>
                      </div>
                      <Progress value={sOpenRate} className="h-2" />
                      <p className="text-xs text-muted-foreground">{sOpenRate.toFixed(1)}% geöffnet</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{leadCount} Leads in dieser Kampagne</p>
            <Button onClick={() => addLeads.mutate()} disabled={addLeads.isPending} size="sm">
              {addLeads.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Kontakte mit E-Mail hinzufügen
            </Button>
          </div>

          <CampaignLeadsList campaignId={campaign.id} />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Versand-Einstellungen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Versand-Start (Uhrzeit)</Label>
                  <Input type="number" min={0} max={23} defaultValue={campaign.send_start_hour} />
                </div>
                <div>
                  <Label>Versand-Ende (Uhrzeit)</Label>
                  <Input type="number" min={0} max={23} defaultValue={campaign.send_end_hour} />
                </div>
              </div>
              <div>
                <Label>Tägliches Limit</Label>
                <Input type="number" min={1} max={200} defaultValue={campaign.daily_send_limit} />
                <p className="text-xs text-muted-foreground mt-1">Max. E-Mails pro Tag für diese Kampagne</p>
              </div>
              <div>
                <Label>Versandtage</Label>
                <p className="text-xs text-muted-foreground">{(campaign.send_days || []).join(', ') || 'Mo–Fr'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Campaign Leads List
const CampaignLeadsList = ({ campaignId }: { campaignId: string }) => {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['email-campaign-leads', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_campaign_leads')
        .select('*, contacts(first_name, last_name, email, company)')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>;
  if (leads.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Noch keine Leads hinzugefügt</p>;

  const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active: { label: "Aktiv", variant: "default" },
    paused: { label: "Pausiert", variant: "outline" },
    completed: { label: "Fertig", variant: "secondary" },
    bounced: { label: "Bounce", variant: "destructive" },
    replied: { label: "Geantwortet", variant: "default" },
    unsubscribed: { label: "Abgemeldet", variant: "destructive" },
  };

  return (
    <div className="space-y-2">
      {leads.map((lead: any) => {
        const contact = lead.contacts;
        const badge = statusBadge[lead.status] || statusBadge.active;
        return (
          <Card key={lead.id}>
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {contact?.first_name} {contact?.last_name}
                  {contact?.company && <span className="text-muted-foreground"> – {contact.company}</span>}
                </p>
                <p className="text-xs text-muted-foreground">{contact?.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-muted-foreground text-right">
                  <span>Schritt {lead.current_step || 0}</span>
                  {lead.opened_count > 0 && <span className="ml-2">👁 {lead.opened_count}</span>}
                  {lead.clicked_count > 0 && <span className="ml-2">🖱 {lead.clicked_count}</span>}
                </div>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default EmailCampaigns;
