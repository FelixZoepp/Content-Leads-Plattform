import { useEffect, useState, useRef, useCallback } from "react";
import { X, Phone, Calendar, FileText, TrendingUp, Clock, Mic, MicOff, Radio, Video, Eye, Link, Copy, Activity, Mail, Globe, Building2, MapPin, Edit3, Plus, MousePointer, ExternalLink, CheckCircle2, Euro, Save, Send, Lock, Play, Pause, Download, Loader2 } from "lucide-react";
import CallActivityLogger from "@/components/outreach/CallActivityLogger";
import JourneyTimeline from "@/components/outreach/JourneyTimeline";
import CallHistory from "@/components/outreach/CallHistory";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PIPELINE_STAGES, CALL_OUTCOMES, getCallOutcomeColor } from "@/lib/pipelineStages";
import { WhisperGeminiHandler, ObjectionHandling } from "@/utils/whisperGeminiHandler";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { UpgradePrompt } from "@/components/outreach/UpgradePrompt";
import { useQuery, useMutation } from "@tanstack/react-query";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  company: string | null;
  source: string | null;
  company_id: string | null;
  slug: string | null;
  video_url: string | null;
  viewed: boolean | null;
  viewed_at: string | null;
  view_count: number | null;
  lead_type: 'inbound' | 'outbound' | null;
  outreach_status: string | null;
  outreach_message: string | null;
  lead_score: number | null;
  personalized_url: string | null;
  video_status: string | null;
}

interface Company {
  name: string;
  website: string | null;
  phone: string | null;
  city: string | null;
}

interface Deal {
  id: string;
  title: string;
  stage: string;
  contact_id: string;
  amount_eur: number | null;
}

interface Activity {
  id: string;
  type: string;
  outcome: string | null;
  note: string | null;
  timestamp: string;
  duration_min: number | null;
}

interface EmailLog {
  id: string;
  subject: string;
  to_email: string;
  from_email: string;
  status: string | null;
  created_at: string;
  opened_at: string | null;
  open_count: number | null;
  click_count: number | null;
}

interface LeadDetailPanelProps {
  dealId: string;
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function LeadDetailPanel({ dealId, open, onClose, onUpdate }: LeadDetailPanelProps) {
  const { canUseLiveObjectionHandling, canUseEmailOutreach, loading: featureLoading } = useFeatureAccess();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [leadDialogContainer, setLeadDialogContainer] = useState<HTMLDivElement | null>(null);
  const leadDialogContentRef = useCallback((node: HTMLDivElement | null) => {
    setLeadDialogContainer(node);
  }, []);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [callScript, setCallScript] = useState<string>("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  
  // Video note state
  const [videoSlug, setVideoSlug] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  
  // Deal amount state
  const [dealAmount, setDealAmount] = useState<string>("");
  
  // Live call state
  const [isLiveCallActive, setIsLiveCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState<string>('disconnected');
  const [objectionHandlings, setObjectionHandlings] = useState<ObjectionHandling[]>([]);
  const handlerRef = useRef<WhisperGeminiHandler | null>(null);
  
  // Email state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  
  // Inline task creation state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskDueTime, setTaskDueTime] = useState("");
  const [taskNote, setTaskNote] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  
  // Fetch email templates
  const { data: emailTemplates = [] } = useQuery({
    queryKey: ['email-templates-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('id, name, subject, body_html')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as EmailTemplate[];
    },
    enabled: open && canUseEmailOutreach,
  });

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      if (!contact?.id) throw new Error("Kein Kontakt ausgewählt");
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          contactId: contact.id,
          templateId: selectedTemplateId || null,
          subject: emailSubject,
          bodyHtml: emailBody,
        }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("E-Mail erfolgreich gesendet");
      setEmailSubject("");
      setEmailBody("");
      setSelectedTemplateId("");
      fetchLeadData();
    },
    onError: (error: any) => {
      console.error('Email send error:', error);
      toast.error("Fehler beim Senden der E-Mail");
    }
  });

  useEffect(() => {
    if (dealId && open) {
      fetchLeadData();
    }
    
    return () => {
      // Cleanup on unmount
      if (handlerRef.current) {
        handlerRef.current.endSession();
      }
    };
  }, [dealId, open]);

  const fetchLeadData = async () => {
    if (!dealId) {
      setLoading(false);
      return;
    }
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();
      
      if (profile) setUserName(profile.name);

      // Get deal with contact
      const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .select(`
          *,
          contacts (*)
        `)
        .eq('id', dealId)
        .single();

      if (dealError) throw dealError;
      
      setDeal(dealData);
      setContact(dealData.contacts);
      setDealAmount(dealData.amount_eur?.toString() || '0');
      
      // Set video note fields
      if (dealData.contacts) {
        setVideoSlug(dealData.contacts.slug || '');
        setVideoUrl(dealData.contacts.video_url || '');
      }

      // Get company if exists
      if (dealData.contacts?.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', dealData.contacts.company_id)
          .single();
        
        if (companyData) setCompany(companyData);
      }

      // Get activities
      const { data: activitiesData } = await supabase
        .from('activities')
        .select('*')
        .eq('contact_id', dealData.contact_id)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (activitiesData) setActivities(activitiesData);

      // Get email logs
      const { data: emailLogsData } = await supabase
        .from('email_logs')
        .select('id, subject, to_email, from_email, status, created_at, opened_at, open_count, click_count')
        .eq('contact_id', dealData.contact_id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (emailLogsData) setEmailLogs(emailLogsData);

      // Get active call script
      const { data: scriptData } = await supabase
        .from('call_scripts')
        .select('content')
        .eq('is_active', true)
        .maybeSingle();

      if (scriptData) {
        // Replace template tags
        let parsedScript = scriptData.content;
        
        if (dealData.contacts) {
          parsedScript = parsedScript
            .replace(/\{\{first_name\}\}/g, dealData.contacts.first_name || '')
            .replace(/\{\{last_name\}\}/g, dealData.contacts.last_name || '')
            .replace(/\{\{email\}\}/g, dealData.contacts.email || '')
            .replace(/\{\{phone\}\}/g, dealData.contacts.phone || '')
            .replace(/\{\{position\}\}/g, dealData.contacts.position || '')
            .replace(/\{\{source\}\}/g, dealData.contacts.source || '')
            .replace(/\{\{company_name\}\}/g, dealData.contacts.company || '');
        }

        if (company) {
          parsedScript = parsedScript
            .replace(/\{\{website\}\}/g, company.website || '')
            .replace(/\{\{company_phone\}\}/g, company.phone || '')
            .replace(/\{\{city\}\}/g, company.city || '');
        }

        parsedScript = parsedScript
          .replace(/\{\{user_name\}\}/g, profile?.name || '')
          .replace(/\{\{stage\}\}/g, dealData.stage || '');

        setCallScript(parsedScript);
      }

    } catch (error) {
      console.error('Error fetching lead data:', error);
      toast.error("Fehler beim Laden der Lead-Daten");
    } finally {
      setLoading(false);
    }
  };

  const handleStageUpdate = async (newStage: string) => {
    if (!deal) return;

    try {
      const { error } = await supabase
        .from('deals')
        .update({ stage: newStage as any })
        .eq('id', deal.id);

      if (error) throw error;

      setDeal({ ...deal, stage: newStage });
      toast.success(`Status aktualisiert: ${newStage}`);
      
      // Notify parent to refresh pipeline
      onUpdate?.();
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error("Fehler beim Aktualisieren");
    }
  };

  const handleSaveDealAmount = async () => {
    if (!deal) return;

    try {
      const amount = parseFloat(dealAmount.replace(/[^\d.-]/g, '')) || 0;
      
      const { error } = await supabase
        .from('deals')
        .update({ amount_eur: amount })
        .eq('id', deal.id);

      if (error) throw error;

      setDeal({ ...deal, amount_eur: amount });
      toast.success("Dealvolumen gespeichert");
      onUpdate?.();
    } catch (error) {
      console.error('Error updating deal amount:', error);
      toast.error("Fehler beim Speichern");
    }
  };

  const handleAddNote = async () => {
    if (!note.trim() || !contact) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('activities')
        .insert({
          contact_id: contact.id,
          user_id: user.id,
          type: 'note',
          note: note.trim(),
        });

      if (error) throw error;

      toast.success("Notiz hinzugefügt");
      setNote("");
      fetchLeadData(); // Refresh activities
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error("Fehler beim Speichern");
    }
  };

  const handleSaveVideoNote = async () => {
    if (!contact) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          slug: videoSlug.trim() || null,
          video_url: videoUrl.trim() || null
        })
        .eq('id', contact.id);

      if (error) throw error;

      toast.success("Videonotiz gespeichert");
      fetchLeadData();
    } catch (error) {
      console.error('Error saving video note:', error);
      toast.error("Fehler beim Speichern");
    }
  };

  const startLiveCall = async () => {
    try {
      // Prepare context for AI
      const systemContext = callScript || "Keine System-Informationen verfügbar";
      const leadContext = `
Lead: ${contact.first_name} ${contact.last_name}
Company: ${contact.company || 'N/A'}
Position: ${contact.position || 'N/A'}
Source: ${contact.source || 'N/A'}
Stage: ${deal.stage}
      `.trim();
      
      // Initialize Whisper + Gemini handler
      handlerRef.current = new WhisperGeminiHandler(
        (handling) => {
          setObjectionHandlings(prev => [...prev, handling]);
          toast.info("Neue Einwandbehandlung verfügbar");
        },
        (status) => {
          setCallStatus(status);
        },
        (error) => {
          toast.error(error);
          stopLiveCall();
        }
      );
      
      await handlerRef.current.startSession(systemContext, leadContext);
      setIsLiveCallActive(true);
      
      toast.success("Live-Call gestartet - KI analysiert alle 5 Sekunden");
    } catch (error) {
      console.error('Error starting live call:', error);
      toast.error("Fehler beim Starten des Live-Calls");
      stopLiveCall();
    }
  };

  const stopLiveCall = () => {
    if (handlerRef.current) {
      handlerRef.current.endSession();
      handlerRef.current = null;
    }
    
    setIsLiveCallActive(false);
    setCallStatus('disconnected');
  };

  // Inline task creation handler
  const handleCreateTask = async () => {
    if (!taskTitle.trim()) {
      toast.error("Bitte gib einen Titel ein");
      return;
    }

    setIsCreatingTask(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Nicht angemeldet");
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

      let dueDatetime: string | null = null;
      if (taskDueDate) {
        // Create a local date object and convert to ISO string (which includes timezone offset)
        const timeStr = taskDueTime || '09:00';
        const localDate = new Date(`${taskDueDate}T${timeStr}:00`);
        dueDatetime = localDate.toISOString();
      }

      const taskData: any = {
        title: taskTitle.trim(),
        assignee_id: user.id,
        status: 'open',
        due_date: dueDatetime,
        account_id: profile?.account_id,
        related_type: 'contact',
        related_id: contact?.id,
      };

      if (deal?.id) {
        taskData.related_type = 'deal';
        taskData.related_id = deal.id;
      }

      const { error } = await supabase.from('tasks').insert(taskData);
      if (error) throw error;

      if (taskNote.trim() && contact?.id) {
        await supabase.from('activities').insert({
          contact_id: contact.id,
          user_id: user.id,
          type: 'note',
          note: `[Aufgabe: ${taskTitle}] ${taskNote}`,
          account_id: profile?.account_id,
        });
      }

      // Format confirmation message with date/time
      let confirmationMsg = "Aufgabe erstellt!";
      if (taskDueDate) {
        const timeStr = taskDueTime || '09:00';
        const localDate = new Date(`${taskDueDate}T${timeStr}:00`);
        const dateFormatted = localDate.toLocaleDateString('de-DE', { 
          weekday: 'short', 
          day: '2-digit', 
          month: '2-digit' 
        });
        const timeFormatted = localDate.toLocaleTimeString('de-DE', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        confirmationMsg = `Aufgabe erstellt für ${dateFormatted} um ${timeFormatted} Uhr`;
      }

      toast.success(confirmationMsg);
      setTaskTitle("");
      setTaskDueDate("");
      setTaskDueTime("");
      setTaskNote("");
      fetchLeadData();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error("Fehler beim Erstellen der Aufgabe");
    } finally {
      setIsCreatingTask(false);
    }
  };

  const setQuickDate = (days: number, time: string) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setTaskDueDate(date.toISOString().split('T')[0]);
    setTaskDueTime(time);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} kopiert`);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        ref={leadDialogContentRef}
        className="max-w-4xl max-h-[90vh] p-0 gap-0 glass-card flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Lead-Details</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Lädt...</p>
          </div>
        ) : !deal || !contact ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Lead nicht gefunden</p>
          </div>
        ) : (
          <div className="flex flex-col min-h-0 flex-1">
            {/* Header */}
            <div className="p-6 border-b border-white/5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {contact.first_name} {contact.last_name}
                  </h2>
                  <p className="text-base text-muted-foreground">{contact.company}</p>
                  {contact.position && (
                    <p className="text-sm text-muted-foreground/70 mt-1">{contact.position}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <div className="px-6 pt-4 border-b border-white/5">
                <TabsList className="bg-white/[0.03] border border-white/5 p-1 rounded-xl">
                  <TabsTrigger 
                    value="overview" 
                    className="rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
                  >
                    Übersicht
                  </TabsTrigger>
                  {contact.lead_type === 'outbound' && contact.personalized_url && (
                    <TabsTrigger 
                      value="personalized" 
                      className="rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
                    >
                      Personalisierte Seite
                    </TabsTrigger>
                  )}
                  <TabsTrigger 
                    value="activities" 
                    className="rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
                  >
                    Aktivitäten
                  </TabsTrigger>
                  <TabsTrigger 
                    value="call" 
                    className="rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
                  >
                    Call Script
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1 overflow-auto max-h-[calc(90vh-180px)]">
                <TabsContent value="overview" className="p-6 space-y-6 mt-0">
                  {/* Status Row with Lead Score */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="stat-card !p-4">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Lead Score</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-foreground">{contact.lead_score || 0}</span>
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              (contact.lead_score || 0) >= 70 ? 'bg-green-500' : 
                              (contact.lead_score || 0) >= 40 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, contact.lead_score || 0)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="stat-card !p-4">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Status</p>
                      <Badge 
                        variant="secondary" 
                        className={`${
                          (contact.lead_score || 0) >= 70 ? 'bg-green-500/20 text-green-400 border-green-500/30' : 
                          (contact.lead_score || 0) >= 40 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 
                          'bg-muted text-muted-foreground'
                        }`}
                      >
                        {(contact.lead_score || 0) >= 70 ? '🔥 Hot' : (contact.lead_score || 0) >= 40 ? 'Warm' : 'Cold'}
                      </Badge>
                    </div>
                    <div className="stat-card !p-4">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Ansichten</p>
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                        <span className="text-lg font-semibold text-foreground">{contact.view_count || 0}</span>
                        {contact.viewed && (
                          <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                            Gesehen
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="stat-card !p-4">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Phase</p>
                      <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                        {deal.stage}
                      </Badge>
                    </div>
                  </div>

                  {/* Deal Volume */}
                  <div className="stat-card !p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Dealvolumen</p>
                        <div className="flex items-center gap-2">
                          <Euro className="w-4 h-4 text-muted-foreground" />
                          <Input
                            type="text"
                            value={dealAmount}
                            onChange={(e) => setDealAmount(e.target.value)}
                            placeholder="0"
                            className="w-32 h-8 text-lg font-semibold"
                          />
                          <span className="text-muted-foreground">EUR</span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={handleSaveDealAmount}
                        className="ml-4"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Speichern
                      </Button>
                    </div>
                  </div>


                  {/* Contact Data */}
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4 font-medium">Kontaktdaten</h3>
                    <div className="space-y-2">
                      {contact.email && (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                              <Mail className="w-4 h-4 text-blue-400" />
                            </div>
                            <span className="text-sm text-foreground">{contact.email}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                            onClick={() => copyToClipboard(contact.email!, "E-Mail")}
                          >
                            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      )}

                      {contact.phone && (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                              <Phone className="w-4 h-4 text-green-400" />
                            </div>
                            <span className="text-sm text-foreground">{contact.phone}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                            onClick={() => copyToClipboard(contact.phone!, "Telefon")}
                          >
                            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      )}

                      {company?.website && (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                              <Globe className="w-4 h-4 text-purple-400" />
                            </div>
                            <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                              {company.website}
                            </a>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                            onClick={() => copyToClipboard(company.website!, "Website")}
                          >
                            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Company Info */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Unternehmen</span>
                      </div>
                      <p className="text-sm text-foreground">{contact.company || '—'}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Stadt</span>
                      </div>
                      <p className="text-sm text-foreground">{company?.city || '—'}</p>
                    </div>
                  </div>

                  {/* Quick Stage Actions */}
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4 font-medium">Pipeline Status</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {PIPELINE_STAGES.map((stage) => (
                        <Button
                          key={stage}
                          variant={deal.stage === stage ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleStageUpdate(stage)}
                          className="text-xs"
                        >
                          {stage}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Call Activity Logger */}
                  <CallActivityLogger
                    contactId={contact.id}
                    dealId={deal.id}
                    currentStage={deal.stage}
                    onActivityLogged={fetchLeadData}
                    onStageUpdate={(newStage) => {
                      setDeal({ ...deal, stage: newStage });
                      onUpdate?.();
                    }}
                  />

                  {/* Inline Task Creation */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Aufgabe erstellen
                      </span>
                    </div>
                    
                    <Input
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="Aufgaben-Titel, z.B. Follow-up Anruf"
                      className="bg-white/[0.02] border-white/10"
                    />
                    
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={taskDueDate === new Date().toISOString().split('T')[0] && taskDueTime === "14:00" ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setQuickDate(0, "14:00")}
                      >
                        Heute 14:00
                      </Button>
                      <Button
                        type="button"
                        variant={taskDueDate === new Date(Date.now() + 86400000).toISOString().split('T')[0] && taskDueTime === "09:00" ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setQuickDate(1, "09:00")}
                      >
                        Morgen 09:00
                      </Button>
                      <Button
                        type="button"
                        variant={taskDueDate === new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] && taskDueTime === "09:00" ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setQuickDate(7, "09:00")}
                      >
                        In 1 Woche
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="bg-white/[0.02] border-white/10 text-sm"
                      />
                      <Input
                        type="time"
                        value={taskDueTime}
                        onChange={(e) => setTaskDueTime(e.target.value)}
                        className="bg-white/[0.02] border-white/10 text-sm"
                      />
                    </div>
                    
                    <Textarea
                      value={taskNote}
                      onChange={(e) => setTaskNote(e.target.value)}
                      placeholder="Optionale Notiz zur Aufgabe..."
                      rows={2}
                      className="bg-white/[0.02] border-white/10"
                    />
                    
                    <Button 
                      onClick={handleCreateTask} 
                      className="w-full" 
                      disabled={!taskTitle.trim() || isCreatingTask}
                    >
                      {isCreatingTask ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Wird erstellt...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Aufgabe erstellen
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Add Note */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Notiz hinzufügen</span>
                    </div>
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Notiz zum Lead..."
                      rows={3}
                      className="bg-white/[0.02] border-white/5"
                    />
                    <Button onClick={handleAddNote} className="w-full mt-2" disabled={!note.trim()}>
                      Notiz speichern
                    </Button>
                  </div>

                  {/* Email Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5" />
                        E-Mail senden
                        {!canUseEmailOutreach && (
                          <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                            Pro
                          </Badge>
                        )}
                      </span>
                    </div>
                    
                    {!canUseEmailOutreach ? (
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <UpgradePrompt 
                          featureName="E-Mail Outreach" 
                          description="E-Mail-Versand aus dem CRM ist nur im Pro-Paket verfügbar."
                          className="border-0 bg-transparent p-0"
                        />
                      </div>
                    ) : !contact.email ? (
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                        <p className="text-sm text-muted-foreground">
                          Keine E-Mail-Adresse hinterlegt
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Template Selection */}
                        <div className="space-y-2">
                          <Label className="text-xs">Vorlage auswählen</Label>
                          <Select
                            value={selectedTemplateId}
                            onValueChange={(value) => {
                              setSelectedTemplateId(value);
                              const template = emailTemplates.find(t => t.id === value);
                              if (template) {
                                // Replace placeholders
                                let subject = template.subject
                                  .replace(/\{\{first_name\}\}/g, contact.first_name || '')
                                  .replace(/\{\{last_name\}\}/g, contact.last_name || '')
                                  .replace(/\{\{company\}\}/g, contact.company || '');
                                let body = template.body_html
                                  .replace(/\{\{first_name\}\}/g, contact.first_name || '')
                                  .replace(/\{\{last_name\}\}/g, contact.last_name || '')
                                  .replace(/\{\{company\}\}/g, contact.company || '');
                                setEmailSubject(subject);
                                setEmailBody(body);
                              }
                            }}
                          >
                            <SelectTrigger className="bg-white/[0.02] border-white/5">
                              <SelectValue placeholder="Vorlage wählen (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              {emailTemplates.map(template => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Subject */}
                        <div className="space-y-2">
                          <Label className="text-xs">Betreff</Label>
                          <Input
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            placeholder="E-Mail Betreff..."
                            className="bg-white/[0.02] border-white/5"
                          />
                        </div>

                        {/* Body */}
                        <div className="space-y-2">
                          <Label className="text-xs">Nachricht</Label>
                          <Textarea
                            value={emailBody}
                            onChange={(e) => setEmailBody(e.target.value)}
                            placeholder="E-Mail Text..."
                            rows={4}
                            className="bg-white/[0.02] border-white/5"
                          />
                        </div>

                        <Button 
                          onClick={() => sendEmailMutation.mutate()} 
                          className="w-full"
                          disabled={sendEmailMutation.isPending || !emailSubject.trim() || !emailBody.trim()}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {sendEmailMutation.isPending ? "Wird gesendet..." : "E-Mail senden"}
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="activities" className="p-6 space-y-6 mt-0">
                  {/* Journey Timeline */}
                  <div className="stat-card !p-0 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-white/5">
                      <div>
                        <h4 className="text-sm font-medium text-foreground">Journey Timeline</h4>
                        <p className="text-xs text-muted-foreground">Lead-Aktivitäten</p>
                      </div>
                    </div>
                    <div className="p-4">
                      <JourneyTimeline contactId={contact.id} />
                    </div>
                  </div>

                  {/* Call Recordings */}
                  <CallHistory dealId={deal.id} />

                  {/* Activity Log */}
                  <div className="stat-card !p-0 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-white/5">
                      <div>
                        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          Aktivitäten-Log
                        </h4>
                      </div>
                    </div>
                    <div className="p-4">
                      {activities.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Noch keine Aktivitäten</p>
                      ) : (
                        <div className="space-y-3">
                          {activities.map((activity) => (
                            <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Phone className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {activity.type}
                                  </Badge>
                                  {activity.outcome && (
                                    <Badge variant="outline" className="text-xs">
                                      {activity.outcome}
                                    </Badge>
                                  )}
                                </div>
                                {activity.note && (
                                  <p className="text-sm mt-1 text-muted-foreground">{activity.note}</p>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(activity.timestamp).toLocaleDateString('de-DE')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Email History */}
                  <div className="stat-card !p-0 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-white/5">
                      <div>
                        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          E-Mail-Historie
                        </h4>
                        <p className="text-xs text-muted-foreground">{emailLogs.length} E-Mails gesendet</p>
                      </div>
                    </div>
                    <div className="p-4">
                      {emailLogs.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Noch keine E-Mails gesendet</p>
                      ) : (
                        <div className="space-y-3">
                          {emailLogs.map((email) => (
                            <div key={email.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                <Mail className="w-3.5 h-3.5 text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                                    {email.subject}
                                  </span>
                                  {email.status && (
                                    <Badge 
                                      variant="outline" 
                                      className={`text-[10px] ${
                                        email.status === 'sent' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                                        email.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                                        'bg-muted text-muted-foreground'
                                      }`}
                                    >
                                      {email.status === 'sent' ? 'Gesendet' : email.status}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  {email.opened_at && (
                                    <span className="flex items-center gap-1 text-green-400">
                                      <Eye className="w-3 h-3" />
                                      Geöffnet ({email.open_count || 1}x)
                                    </span>
                                  )}
                                  {(email.click_count || 0) > 0 && (
                                    <span className="flex items-center gap-1 text-primary">
                                      <MousePointer className="w-3 h-3" />
                                      {email.click_count} Klicks
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(email.created_at).toLocaleDateString('de-DE')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Personalized Page Tab */}
                {contact.lead_type === 'outbound' && contact.personalized_url && (
                  <TabsContent value="personalized" className="p-6 space-y-6 mt-0">
                    <div className="stat-card !p-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Globe className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-foreground">Personalisierte Landing Page</h3>
                            <p className="text-xs text-muted-foreground">Für {contact.first_name} {contact.last_name}</p>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">URL</p>
                          <a 
                            href={contact.personalized_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-2 break-all"
                          >
                            {contact.personalized_url}
                            <ExternalLink className="w-4 h-4 shrink-0" />
                          </a>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => copyToClipboard(contact.personalized_url!, "URL")}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            URL kopieren
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => window.open(contact.personalized_url!, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Seite öffnen
                          </Button>
                        </div>

                        {/* Video Status */}
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Video-Status</p>
                          <div className="flex items-center gap-2">
                            <Video className={`w-4 h-4 ${
                              contact.video_status === 'ready' ? 'text-emerald-500' :
                              contact.video_status === 'generating_intro' ? 'text-amber-500 animate-pulse' :
                              contact.video_status === 'error' ? 'text-red-500' :
                              'text-muted-foreground'
                            }`} />
                            <span className="text-sm text-foreground">
                              {contact.video_status === 'ready' ? 'Video bereit' :
                               contact.video_status === 'generating_intro' ? 'Video wird generiert...' :
                               contact.video_status === 'pending' ? 'Ausstehend' :
                               contact.video_status === 'pending_auto' ? 'Wird automatisch generiert' :
                               contact.video_status === 'error' ? 'Fehler bei Generierung' :
                               contact.video_status || 'Kein Video'}
                            </span>
                          </div>
                        </div>

                        {/* View Stats */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Seitenaufrufe</p>
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4 text-muted-foreground" />
                              <span className="text-lg font-semibold text-foreground">{contact.view_count || 0}</span>
                            </div>
                          </div>
                          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                            <Badge 
                              variant="secondary" 
                              className={contact.viewed ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-muted text-muted-foreground'}
                            >
                              {contact.viewed ? 'Angesehen' : 'Noch nicht angesehen'}
                            </Badge>
                          </div>
                        </div>

                        {contact.viewed_at && (
                          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Zuletzt angesehen</p>
                            <span className="text-sm text-foreground">
                              {new Date(contact.viewed_at).toLocaleString('de-DE')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                )}

                <TabsContent value="call" className="p-6 space-y-6 mt-0">
                  {/* Live Call Section */}
                  {!canUseLiveObjectionHandling ? (
                    <div className="stat-card !p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Live-Call mit KI-Support</span>
                        <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                          Pro
                        </Badge>
                      </div>
                      <UpgradePrompt 
                        featureName="KI-Einwandbehandlung" 
                        description="Live-Call mit KI-gestützter Einwandbehandlung ist nur im Pro-Paket verfügbar."
                        className="border-0 bg-transparent p-0"
                      />
                    </div>
                  ) : isLiveCallActive ? (
                    <Card className="border-primary/30 bg-primary/5">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Radio className="h-4 w-4 text-destructive animate-pulse" />
                          Live-Call aktiv
                          <Badge variant={
                            callStatus === 'active' ? 'default' : 
                            callStatus === 'transcribing' ? 'secondary' : 
                            callStatus === 'analyzing' ? 'default' :
                            'outline'
                          }>
                            {callStatus === 'active' ? 'Aktiv' : 
                             callStatus === 'transcribing' ? 'Transkribiert' : 
                             callStatus === 'analyzing' ? 'Analysiert' : 
                             callStatus === 'listening' ? 'Hört zu' : 
                             callStatus}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {objectionHandlings.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">KI-Einwandbehandlungen:</Label>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {objectionHandlings.map((handling, idx) => (
                                <div key={idx} className="border border-primary/20 rounded-lg p-3 bg-primary/5">
                                  <div className="text-xs text-muted-foreground mb-1">
                                    Einwand: "{handling.objection}"
                                  </div>
                                  <div className="text-sm font-medium">
                                    {handling.response}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {new Date(handling.timestamp).toLocaleTimeString('de-DE')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {objectionHandlings.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            Whisper transkribiert alle 5 Sek. • Gemini analysiert auf Einwände
                          </p>
                        )}

                        <Button 
                          onClick={stopLiveCall} 
                          variant="destructive" 
                          className="w-full"
                        >
                          <MicOff className="mr-2 h-4 w-4" />
                          Call beenden
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="stat-card !p-4">
                      <Button 
                        onClick={startLiveCall} 
                        className="w-full"
                        variant="default"
                      >
                        <Mic className="mr-2 h-4 w-4" />
                        Live-Call mit KI-Support starten
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Externe Telefonie verbinden & KI erkennt Einwände live
                      </p>
                    </div>
                  )}

                  {/* Call Script */}
                  {callScript && (
                    <div className="stat-card !p-0 overflow-hidden">
                      <div className="flex items-center gap-2 p-4 border-b border-white/5">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <h4 className="text-sm font-medium text-foreground">Call Script</h4>
                      </div>
                      <div className="p-4">
                        <div className="whitespace-pre-wrap text-sm bg-white/[0.02] p-4 rounded-xl border border-white/5">
                          {callScript}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Video Note for Outbound */}
                  {contact.lead_type === 'outbound' && (
                    <div className="stat-card !p-0 overflow-hidden">
                      <div className="flex items-center p-4 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4 text-cyan-400" />
                          <h4 className="text-sm font-medium text-foreground">Videonotiz</h4>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm">Slug (für personalisierte URL)</Label>
                          <Input
                            value={videoSlug}
                            onChange={(e) => setVideoSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            placeholder="max-mustermann-acme"
                            className="bg-white/[0.02] border-white/5"
                          />
                          {videoSlug && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground">URL:</span>
                              <a 
                                href={`/p/${videoSlug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {window.location.origin}/p/{videoSlug}
                              </a>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm">Video URL</Label>
                          <Input
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://cdn.example.com/video.mp4"
                            className="bg-white/[0.02] border-white/5"
                          />
                        </div>

                        {contact.viewed !== null && (
                          <div className="flex items-center gap-2 text-sm p-3 bg-white/[0.02] rounded-xl border border-white/5">
                            <Eye className="w-4 h-4" />
                            {contact.viewed ? (
                              <span className="text-green-400">
                                Angesehen ({contact.view_count || 0}x)
                                {contact.viewed_at && ` • ${new Date(contact.viewed_at).toLocaleDateString('de-DE')}`}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Noch nicht angesehen</span>
                            )}
                          </div>
                        )}

                        <Button onClick={handleSaveVideoNote} className="w-full" size="sm">
                          Videonotiz speichern
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}