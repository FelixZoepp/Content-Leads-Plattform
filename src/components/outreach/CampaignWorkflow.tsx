import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAutoVideoGeneration } from "@/hooks/useAutoVideoGeneration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Users, 
  UserPlus, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  XCircle,
  ExternalLink,
  Copy,
  Flame,
  RefreshCw,
  Upload,
  FileText,
  Linkedin,
  Plus,
  Trash2,
  Settings2,
  Pencil,
  AlertTriangle,
  TrendingDown
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

type WorkflowStatus =
  | 'neu'
  | 'bereit_fuer_vernetzung'
  | 'vernetzung_ausstehend'
  | 'vernetzung_angenommen'
  | 'erstnachricht_gesendet'
  | 'kein_klick_fu_offen'
  | 'fu1_gesendet'
  | 'fu2_gesendet'
  | 'fu3_gesendet'
  | 'reagiert_warm'
  | 'positiv_geantwortet'
  | 'termin_gebucht'
  | 'abgeschlossen';

interface WorkflowContact {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  workflow_status: WorkflowStatus | null;
  connection_sent_at: string | null;
  connection_accepted_at: string | null;
  first_message_sent_at: string | null;
  fu1_sent_at: string | null;
  fu2_sent_at: string | null;
  fu3_sent_at: string | null;
  outreach_message: string | null;
  personalized_url: string | null;
  viewed: boolean | null;
  lead_score: number | null;
  linkedin_url: string | null;
  owner_user_id: string | null;
  // For team mode: is this lead globally booked by anyone?
  globally_booked: boolean;
}

interface EditingContact {
  id: string;
  first_name: string;
  last_name: string;
  company: string;
  position: string;
  email: string;
  phone: string;
  linkedin_url: string;
}

interface FollowupTemplate {
  id: string;
  campaign_id: string | null;
  template_type: string;
  name: string;
  content: string;
  is_default: boolean;
}

interface CampaignWorkflowProps {
  campaignId: string;
  campaignName: string;
}

// --- URL GENERATION HELPER ---
function generateLeadSlug(firstName: string, lastName: string, company: string | null): string {
  const base = [firstName, lastName, company]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9äöüß-]/g, "")
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  // Use crypto-secure random for slug suffix (16 chars = ~82 bits entropy)
  const arr = new Uint8Array(10);
  crypto.getRandomValues(arr);
  const rand = Array.from(arr, b => b.toString(36).slice(-1)).join("").slice(0, 16);
  return `${base}-${rand}`;
}

function buildLeadPageUrl(
  leadSlug: string,
  memberCode: number | null,
  customDomain?: string | null
): string {
  if (customDomain) {
    // Custom domain: no /p/ prefix, Caddy handles all traffic
    return memberCode
      ? `https://${customDomain}/${leadSlug}/${memberCode}`
      : `https://${customDomain}/${leadSlug}`;
  }
  // Fallback: SPA route with /p/ prefix
  const origin = window.location.origin;
  return memberCode
    ? `${origin}/p/${leadSlug}/${memberCode}`
    : `${origin}/p/${leadSlug}`;
}

function buildPersonalizedUrl(
  landingPageSlug: string,
  contact: { id: string; first_name: string; last_name: string; company: string | null; position: string | null; email: string | null; phone: string | null; },
  trackingId: string,
  pitchVideoUrl?: string | null,
  customDomain?: string | null
): string {
  const origin = customDomain ? `https://${customDomain}` : window.location.origin;
  const params = new URLSearchParams();
  // Only include non-sensitive data in URL - NO email, phone, or LinkedIn
  if (contact.first_name) params.set("fn", contact.first_name);
  if (contact.last_name) params.set("ln", contact.last_name);
  if (contact.company) params.set("co", contact.company);
  if (contact.position) params.set("pos", contact.position);
  if (pitchVideoUrl) params.set("video", pitchVideoUrl);
  params.set("cid", contact.id);
  params.set("tid", trackingId);
  return `${origin}/lp/${landingPageSlug}?${params.toString()}`;
}

const STATUS_LABELS: Record<WorkflowStatus, string> = {
  'neu': 'Neu',
  'bereit_fuer_vernetzung': 'Bereit für Vernetzung',
  'vernetzung_ausstehend': 'Vernetzung ausstehend',
  'vernetzung_angenommen': 'Vernetzung angenommen',
  'erstnachricht_gesendet': 'Erstnachricht gesendet',
  'kein_klick_fu_offen': 'Kein Klick – FU offen',
  'fu1_gesendet': 'FU 1 gesendet',
  'fu2_gesendet': 'FU 2 gesendet',
  'fu3_gesendet': 'FU 3 gesendet',
  'reagiert_warm': 'Geantwortet',
  'positiv_geantwortet': 'Positiv geantwortet',
  'termin_gebucht': 'Termin gebucht',
  'abgeschlossen': 'Abgeschlossen'
};

export function CampaignWorkflow({ campaignId, campaignName }: CampaignWorkflowProps) {
  const [contacts, setContacts] = useState<WorkflowContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayMessageCount, setTodayMessageCount] = useState(0);
  const [todayConnectionCount, setTodayConnectionCount] = useState(0);
  const [todayFuCount, setTodayFuCount] = useState(0);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [templates, setTemplates] = useState<FollowupTemplate[]>([]);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', content: '', template_type: 'first_message' });
  const [editingLinkedIn, setEditingLinkedIn] = useState<string | null>(null);
  const [linkedInInput, setLinkedInInput] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EditingContact | null>(null);
  const [landingPageSlug, setLandingPageSlug] = useState<string | null>(null);
  const [pitchVideoUrl, setPitchVideoUrl] = useState<string | null>(null);
  const [accountDomain, setAccountDomain] = useState<string | null>(null);
  const [generatingUrls, setGeneratingUrls] = useState(false);
  const [hideBooked, setHideBooked] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasTeam, setHasTeam] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);
  const MAX_DAILY_MESSAGES = 10;
  const MAX_DAILY_CONNECTIONS = 15;
  const MAX_DAILY_FOLLOWUPS = 20;

  // Fetch linked landing page slug
  useEffect(() => {
    const fetchLandingPage = async () => {
      // Get campaign's landing_page_id
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      // Store pitch video URL
      if (campaign?.pitch_video_url) setPitchVideoUrl(campaign.pitch_video_url);

      const lpId = (campaign as any)?.landing_page_id;
      if (lpId) {
        const { data: lp } = await supabase
          .from("landing_pages")
          .select("slug")
          .eq("id", lpId)
          .single();
        if (lp?.slug) setLandingPageSlug(lp.slug);
      }
    };
    fetchLandingPage();
  }, [campaignId]);

  // Generate personalized URLs for contacts that don't have one
  const generateUrlsForContacts = async (contactsToProcess?: WorkflowContact[]) => {
    if (!landingPageSlug) {
      toast.error("Keine Lead Page mit dieser Kampagne verknüpft. Verknüpfe zuerst eine Lead Page in den Kampagnen-Einstellungen.");
      return;
    }

    setGeneratingUrls(true);
    try {
      const targets = contactsToProcess || contacts.filter(c => !c.personalized_url);
      if (targets.length === 0) {
        toast.info("Alle Leads haben bereits eine personalisierte URL");
        setGeneratingUrls(false);
        return;
      }

      let successCount = 0;
      for (const contact of targets) {
        const slug = generateLeadSlug(contact.first_name, contact.last_name, contact.company);
        const trackingId = `trk_${contact.id.slice(0, 8)}`;
        const url = buildPersonalizedUrl(landingPageSlug, contact, trackingId, pitchVideoUrl, accountDomain);

        const { error } = await supabase
          .from("contacts")
          .update({
            slug,
            personalized_url: url,
            updated_at: new Date().toISOString(),
          })
          .eq("id", contact.id);

        if (!error) successCount++;
      }

      toast.success(`${successCount} personalisierte URLs generiert`);
      fetchContacts();
    } catch (err) {
      console.error("Error generating URLs:", err);
      toast.error("Fehler beim Generieren der URLs");
    } finally {
      setGeneratingUrls(false);
    }
  };

  // Load team info on mount
  useEffect(() => {
    const loadTeamInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);
      const { data: profile } = await supabase.from('profiles').select('account_id, role, is_super_admin').eq('id', user.id).single();
      if (!profile?.account_id) return;
      setIsAdmin(profile.role === 'admin' || profile.is_super_admin === true);
      // Load custom domain for URL generation
      const { data: account } = await supabase.from('accounts').select('custom_domain').eq('id', profile.account_id).single();
      if (account?.custom_domain) setAccountDomain(account.custom_domain);
      const { data: members } = await supabase.from('profiles').select('id, name').eq('account_id', profile.account_id);
      if (members && members.length > 1) {
        setHasTeam(true);
        setTeamMembers(members.map(m => ({ id: m.id, name: m.name || 'Unbenannt' })));
      }
    };
    loadTeamInfo();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    // Load base contact data
    const { data: rawContacts, error } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, company, position, email, phone, workflow_status, connection_sent_at, connection_accepted_at, first_message_sent_at, fu1_sent_at, fu2_sent_at, fu3_sent_at, outreach_message, personalized_url, viewed, lead_score, linkedin_url, owner_user_id')
      .eq('campaign_id', campaignId)
      .eq('lead_type', 'outbound')
      .order('created_at', { ascending: true });

    if (error) {
      toast.error("Fehler beim Laden der Kontakte");
      console.error(error);
      setLoading(false);
      return;
    }

    let finalContacts: WorkflowContact[] = [];

    if (hasTeam && currentUserId) {
      // TEAM MODE: Load per-user progress
      const contactIds = (rawContacts || []).map(c => c.id);

      if (contactIds.length > 0) {
        // Ensure progress rows exist for current user
        const { data: existingProgress } = await (supabase as any)
          .from('team_contact_progress')
          .select('contact_id')
          .eq('user_id', currentUserId)
          .in('contact_id', contactIds);

        const existingIds = new Set((existingProgress || []).map(p => p.contact_id));
        const missing = contactIds.filter(id => !existingIds.has(id));

        if (missing.length > 0) {
          const { data: profile } = await supabase.from('profiles').select('account_id').eq('id', currentUserId).single();
          if (profile?.account_id) {
            // Batch insert in chunks of 500
            for (let i = 0; i < missing.length; i += 500) {
              const chunk = missing.slice(i, i + 500);
              await (supabase as any).from('team_contact_progress').insert(
                chunk.map(cid => ({
                  contact_id: cid,
                  user_id: currentUserId,
                  account_id: profile.account_id,
                  workflow_status: 'bereit_fuer_vernetzung',
                }))
              );
            }
          }
        }

        // Load user's progress
        const { data: myProgress } = await (supabase as any)
          .from('team_contact_progress')
          .select('contact_id, workflow_status, connection_sent_at, connection_accepted_at, first_message_sent_at, fu1_sent_at, fu2_sent_at, fu3_sent_at, responded_at, positive_reply_at, appointment_booked_at')
          .eq('user_id', currentUserId)
          .in('contact_id', contactIds);

        const progressMap = new Map<string, any>();
        (myProgress || []).forEach(p => progressMap.set(p.contact_id, p));

        // Merge: contact base data + user's progress
        const BOOKED = ['termin_gebucht', 'abgeschlossen'];
        finalContacts = (rawContacts || []).map(c => {
          const prog = progressMap.get(c.id);
          const globallyBooked = BOOKED.includes(c.workflow_status || '');
          return {
            ...c,
            // Override workflow fields with user's own progress
            workflow_status: globallyBooked ? c.workflow_status : (prog?.workflow_status || 'bereit_fuer_vernetzung'),
            connection_sent_at: prog?.connection_sent_at || null,
            connection_accepted_at: prog?.connection_accepted_at || null,
            first_message_sent_at: prog?.first_message_sent_at || null,
            fu1_sent_at: prog?.fu1_sent_at || null,
            fu2_sent_at: prog?.fu2_sent_at || null,
            fu3_sent_at: prog?.fu3_sent_at || null,
            globally_booked: globallyBooked,
          } as WorkflowContact;
        });
      }
    } else {
      // SOLO MODE: Use contacts directly
      finalContacts = (rawContacts || []).map(c => ({ ...c, globally_booked: false } as WorkflowContact));
    }

    setContacts(finalContacts);

    // Count today's activities
    const today = new Date().toISOString().split('T')[0];
    setTodayMessageCount(finalContacts.filter(c => c.first_message_sent_at?.startsWith(today)).length);
    setTodayConnectionCount(finalContacts.filter(c => c.connection_sent_at?.startsWith(today)).length);
    setTodayFuCount(finalContacts.filter(c =>
      c.fu1_sent_at?.startsWith(today) || c.fu2_sent_at?.startsWith(today) || c.fu3_sent_at?.startsWith(today)
    ).length);

    setLoading(false);
  };

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('followup_templates')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setTemplates(data as FollowupTemplate[]);
    }
  };

  // Auto-process pending videos when connection is accepted
  useAutoVideoGeneration({ campaignId, enabled: true });

  useEffect(() => {
    fetchContacts();
    fetchTemplates();
  }, [campaignId]);

  const saveLinkedInUrl = async (contactId: string, url: string) => {
    const { error } = await supabase
      .from('contacts')
      .update({ linkedin_url: url || null, updated_at: new Date().toISOString() })
      .eq('id', contactId);

    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      toast.success("LinkedIn-URL gespeichert");
      setEditingLinkedIn(null);
      fetchContacts();
    }
  };

  const openEditDialog = (contact: WorkflowContact) => {
    setEditingContact({
      id: contact.id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      company: contact.company || '',
      position: contact.position || '',
      email: contact.email || '',
      phone: contact.phone || '',
      linkedin_url: contact.linkedin_url || '',
    });
    setIsEditDialogOpen(true);
  };

  const saveContact = async () => {
    if (!editingContact) return;

    const { error } = await supabase
      .from('contacts')
      .update({
        first_name: editingContact.first_name,
        last_name: editingContact.last_name,
        company: editingContact.company || null,
        position: editingContact.position || null,
        email: editingContact.email || null,
        phone: editingContact.phone || null,
        linkedin_url: editingContact.linkedin_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingContact.id);

    if (error) {
      toast.error("Fehler beim Speichern");
      console.error(error);
    } else {
      toast.success("Lead aktualisiert");
      setIsEditDialogOpen(false);
      setEditingContact(null);
      fetchContacts();
    }
  };

  const createTemplate = async () => {
    if (!newTemplate.name || !newTemplate.content) {
      toast.error("Name und Inhalt sind erforderlich");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("account_id")
      .eq("id", user.id)
      .single();

    const { error } = await supabase
      .from('followup_templates')
      .insert({
        campaign_id: campaignId,
        account_id: profile?.account_id,
        name: newTemplate.name,
        content: newTemplate.content,
        template_type: newTemplate.template_type,
      });

    if (error) {
      toast.error("Fehler beim Erstellen");
      console.error(error);
    } else {
      toast.success("Vorlage erstellt");
      setNewTemplate({ name: '', content: '', template_type: 'first_message' });
      fetchTemplates();
    }
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from('followup_templates')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Fehler beim Löschen");
    } else {
      toast.success("Vorlage gelöscht");
      fetchTemplates();
    }
  };

  const copyTemplateContent = (content: string, contact?: WorkflowContact) => {
    // Replace placeholders with contact data
    let personalizedContent = content;
    if (contact) {
      personalizedContent = personalizedContent
        .replace(/\{\{first_name\}\}/gi, contact.first_name || '')
        .replace(/\{\{last_name\}\}/gi, contact.last_name || '')
        .replace(/\{\{company\}\}/gi, contact.company || '')
        .replace(/\{\{position\}\}/gi, contact.position || '')
        .replace(/\{\{personalized_url\}\}/gi, contact.personalized_url || '');
    }
    navigator.clipboard.writeText(personalizedContent);
    toast.success("Personalisierte Vorlage kopiert!");
  };

  // Default templates for all message types
  const DEFAULT_TEMPLATES: Record<string, string> = {
    first_message: `Hey {{first_name}},

ich habe mir {{company}} angeschaut und eine personalisierte Seite für euch erstellt:

{{personalized_url}}

Schau gerne mal rein – bin gespannt auf dein Feedback!

LG`,
    fu1: `Hey {{first_name}},

hast du dir meine Seite schon angeschaut?

{{personalized_url}}

Würde mich freuen, wenn du mal kurz reinschaust!

LG`,
    fu2: `Hey {{first_name}},

ich wollte nochmal nachhaken – hast du die Seite gesehen?

{{personalized_url}}

Falls du Fragen hast, meld dich gerne.

LG`,
    fu3: `Hey {{first_name}},

letzte Erinnerung zu meiner Seite:

{{personalized_url}}

Wenn es gerade nicht passt, kein Problem. Aber vielleicht ist es ja doch interessant für {{company}}.

LG`
  };

  const getTemplateForType = (type: string, contact?: WorkflowContact): string => {
    // Check for custom templates first
    const customTemplates = templates.filter(t => t.template_type === type);
    if (customTemplates.length > 0) {
      return customTemplates[0].content;
    }
    // Fall back to default template
    return DEFAULT_TEMPLATES[type] || '';
  };

  const copyPersonalizedFollowup = (type: string, contact: WorkflowContact) => {
    const template = getTemplateForType(type, contact);
    copyTemplateContent(template, contact);
  };

  const updateStatus = async (contactId: string, newStatus: WorkflowStatus, timestampField?: string) => {
    const now = new Date().toISOString();

    if (hasTeam && currentUserId) {
      // TEAM MODE: Update team_contact_progress
      const progressUpdate: Record<string, any> = {
        workflow_status: newStatus,
      };
      if (timestampField) {
        progressUpdate[timestampField] = now;
      }

      const { error } = await (supabase as any)
        .from('team_contact_progress')
        .update(progressUpdate)
        .eq('contact_id', contactId)
        .eq('user_id', currentUserId);

      if (error) {
        toast.error("Fehler beim Aktualisieren");
        console.error(error);
        return;
      }

      // If appointment booked → also mark globally on contacts table
      if (newStatus === 'termin_gebucht' || newStatus === 'abgeschlossen') {
        await supabase
          .from('contacts')
          .update({ workflow_status: newStatus, updated_at: now })
          .eq('id', contactId);
      }
    } else {
      // SOLO MODE: Update contacts directly
      const updateData: Record<string, any> = {
        workflow_status: newStatus,
        updated_at: now,
      };
      if (timestampField) {
        updateData[timestampField] = now;
      }

      const { error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', contactId);

      if (error) {
        toast.error("Fehler beim Aktualisieren");
        console.error(error);
        return;
      }
    }

    toast.success("Status aktualisiert");
    fetchContacts();
  };

  const copyMessage = (contact: WorkflowContact) => {
    // Use outreach_message if set, otherwise use default first_message template
    const rawMessage = contact.outreach_message || getTemplateForType('first_message', contact);
    if (!rawMessage) {
      toast.error("Keine Nachricht vorhanden");
      return;
    }
    // Always personalize with contact data
    const personalized = rawMessage
      .replace(/\{\{first_name\}\}/gi, contact.first_name || '')
      .replace(/\{\{last_name\}\}/gi, contact.last_name || '')
      .replace(/\{\{company\}\}/gi, contact.company || '')
      .replace(/\{\{position\}\}/gi, contact.position || '')
      .replace(/\{\{personalized_url\}\}/gi, contact.personalized_url || '');
    navigator.clipboard.writeText(personalized);
    toast.success(`Nachricht für ${contact.first_name} kopiert!`);
  };

  const importLeads = async () => {
    if (!importText.trim()) {
      toast.error("Bitte füge Lead-Daten ein");
      return;
    }

    setImporting(true);
    try {
      // Get user's account_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Nicht eingeloggt");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("id", user.id)
        .single();

      // Parse CSV/text - support both comma and semicolon
      const lines = importText.trim().split('\n');
      const leads: Array<{
        first_name: string;
        last_name: string;
        company?: string;
        position?: string;
        linkedin_url?: string;
      }> = [];

      for (const line of lines) {
        const parts = line.includes(';') ? line.split(';') : line.split(',');
        if (parts.length >= 2) {
          leads.push({
            first_name: parts[0]?.trim() || '',
            last_name: parts[1]?.trim() || '',
            company: parts[2]?.trim() || undefined,
            position: parts[3]?.trim() || undefined,
            linkedin_url: parts[4]?.trim() || undefined,
          });
        }
      }

      if (leads.length === 0) {
        toast.error("Keine gültigen Leads gefunden. Format: Vorname, Nachname, Firma, Position, LinkedIn-URL");
        return;
      }

      // Duplicate detection: check existing contacts by name+company or linkedin_url
      const { data: existingContacts } = await supabase
        .from('contacts')
        .select('first_name, last_name, company, linkedin_url')
        .eq('account_id', profile?.account_id);

      const existingSet = new Set(
        (existingContacts || []).map(c =>
          `${c.first_name?.toLowerCase()}|${c.last_name?.toLowerCase()}|${(c.company || '').toLowerCase()}`
        )
      );
      const existingLinkedIn = new Set(
        (existingContacts || []).filter(c => c.linkedin_url).map(c => c.linkedin_url!.toLowerCase())
      );

      const newLeads = leads.filter(lead => {
        const key = `${lead.first_name.toLowerCase()}|${lead.last_name.toLowerCase()}|${(lead.company || '').toLowerCase()}`;
        const liMatch = lead.linkedin_url && existingLinkedIn.has(lead.linkedin_url.toLowerCase());
        return !existingSet.has(key) && !liMatch;
      });

      const duplicateCount = leads.length - newLeads.length;
      if (duplicateCount > 0) {
        toast.info(`${duplicateCount} Duplikat${duplicateCount > 1 ? 'e' : ''} übersprungen (bereits im Account)`);
      }

      if (newLeads.length === 0) {
        toast.warning("Alle Leads sind bereits vorhanden");
        setImporting(false);
        return;
      }

      // Insert leads - shared pool (no owner) for team accounts, assigned for solo
      const leadsToInsert = newLeads.map(lead => ({
        first_name: lead.first_name,
        last_name: lead.last_name,
        company: lead.company || null,
        position: lead.position || null,
        linkedin_url: lead.linkedin_url || null,
        campaign_id: campaignId,
        lead_type: 'outbound' as const,
        workflow_status: 'bereit_fuer_vernetzung' as const,
        account_id: profile?.account_id,
        owner_user_id: hasTeam ? null : user.id,
      }));

      const { data: insertedContacts, error } = await supabase
        .from('contacts')
        .insert(leadsToInsert)
        .select('id, first_name, last_name, company, position, email, phone');

      if (error) throw error;

      toast.success(`${newLeads.length} Leads importiert${duplicateCount > 0 ? ` (${duplicateCount} Duplikate übersprungen)` : ''}`);

      // Auto-generate personalized URLs if landing page is linked
      if (landingPageSlug && insertedContacts && insertedContacts.length > 0) {
        let urlCount = 0;
        for (const contact of insertedContacts) {
          const slug = generateLeadSlug(contact.first_name || '', contact.last_name || '', contact.company);
          const trackingId = `trk_${contact.id.slice(0, 8)}`;
          const url = buildPersonalizedUrl(landingPageSlug, {
            id: contact.id,
            first_name: contact.first_name || '',
            last_name: contact.last_name || '',
            company: contact.company,
            position: contact.position,
            email: contact.email,
            phone: contact.phone,
          }, trackingId, pitchVideoUrl, accountDomain);

          await supabase
            .from('contacts')
            .update({ slug, personalized_url: url, updated_at: new Date().toISOString() })
            .eq('id', contact.id);
          urlCount++;
        }
        toast.success(`${urlCount} personalisierte Tracking-URLs generiert`);
      }

      setImportText("");
      setIsImportDialogOpen(false);
      fetchContacts();
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error("Fehler beim Import: " + error.message);
    } finally {
      setImporting(false);
    }
  };

  // Filter out globally booked leads (terminiert) if toggle is on
  const BOOKED_STATUSES: WorkflowStatus[] = ['termin_gebucht', 'abgeschlossen'];
  const activeContacts = hideBooked
    ? contacts.filter(c => !c.globally_booked && !BOOKED_STATUSES.includes(c.workflow_status!))
    : contacts;
  const bookedCount = contacts.filter(c => c.globally_booked || BOOKED_STATUSES.includes(c.workflow_status!)).length;

  // Filter contacts by status
  const pendingConnections = activeContacts.filter(c => c.workflow_status === 'vernetzung_ausstehend');
  const readyForConnection = activeContacts.filter(c =>
    c.workflow_status === 'neu' || c.workflow_status === 'bereit_fuer_vernetzung'
  );
  const acceptedConnections = activeContacts.filter(c => c.workflow_status === 'vernetzung_angenommen');
  
  // Follow-up due logic (use poolContacts for team-filtered view)
  const fu1Due = activeContacts.filter(c => {
    if (c.workflow_status !== 'erstnachricht_gesendet' || !c.first_message_sent_at || c.viewed) return false;
    const sentDate = new Date(c.first_message_sent_at);
    const dueDate = new Date(sentDate.getTime() + 3 * 24 * 60 * 60 * 1000);
    return new Date() >= dueDate;
  });

  const fu2Due = activeContacts.filter(c => {
    if (c.workflow_status !== 'fu1_gesendet' || !c.fu1_sent_at || c.viewed) return false;
    const sentDate = new Date(c.fu1_sent_at);
    const dueDate = new Date(sentDate.getTime() + 4 * 24 * 60 * 60 * 1000);
    return new Date() >= dueDate;
  });

  const fu3Due = activeContacts.filter(c => {
    if (c.workflow_status !== 'fu2_gesendet' || !c.fu2_sent_at || c.viewed) return false;
    const sentDate = new Date(c.fu2_sent_at);
    const dueDate = new Date(sentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    return new Date() >= dueDate;
  });

  const warmLeads = activeContacts.filter(c => c.workflow_status === 'reagiert_warm');
  const positiveReplies = activeContacts.filter(c => c.workflow_status === 'positiv_geantwortet');
  const appointmentsBooked = activeContacts.filter(c => c.workflow_status === 'termin_gebucht');
  
  // Calculate acceptance rate over last 7+ days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const connectionsSentLast7Days = contacts.filter(c => {
    if (!c.connection_sent_at) return false;
    return new Date(c.connection_sent_at) >= sevenDaysAgo;
  });
  
  const connectionsAcceptedLast7Days = contacts.filter(c => {
    if (!c.connection_sent_at || !c.connection_accepted_at) return false;
    return new Date(c.connection_sent_at) >= sevenDaysAgo;
  });
  
  const acceptanceRate = connectionsSentLast7Days.length >= 5 
    ? Math.round((connectionsAcceptedLast7Days.length / connectionsSentLast7Days.length) * 100)
    : null; // Only calculate if we have at least 5 data points
  
  const showLowAcceptanceWarning = acceptanceRate !== null && acceptanceRate < 20;
  
  // Daily limits - these reset at midnight
  const connectionsRemaining = MAX_DAILY_CONNECTIONS - todayConnectionCount;
  const messagesRemaining = MAX_DAILY_MESSAGES - todayMessageCount;
  const followupsRemaining = MAX_DAILY_FOLLOWUPS - todayFuCount;

  const ContactCard = ({ contact, actions, showLinkedIn = false }: { contact: WorkflowContact; actions: React.ReactNode; showLinkedIn?: boolean }) => (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {contact.first_name} {contact.last_name}
          </span>
          {contact.linkedin_url && (
            <a 
              href={contact.linkedin_url} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <Linkedin className="h-4 w-4 text-[#0A66C2] hover:text-[#004182]" />
            </a>
          )}
          {contact.viewed && (
            <Badge variant="destructive" className="text-xs">
              <Flame className="h-3 w-3 mr-1" />
              Hot
            </Badge>
          )}
          {contact.lead_score && contact.lead_score >= 70 && !contact.viewed && (
            <Badge variant="secondary" className="text-xs">
              Score: {contact.lead_score}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {contact.position ? `${contact.position} @ ` : ''}{contact.company || 'Keine Firma'}
        </p>
      </div>
      <div className="flex items-center gap-1 ml-4 flex-shrink-0">
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEditDialog(contact)}>
          <Pencil className="h-4 w-4" />
        </Button>
        {showLinkedIn && (
          <Popover open={editingLinkedIn === contact.id} onOpenChange={(open) => {
            if (open) {
              setEditingLinkedIn(contact.id);
              setLinkedInInput(contact.linkedin_url || '');
            } else {
              setEditingLinkedIn(null);
            }
          }}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <Linkedin className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <Label>LinkedIn Profil-URL</Label>
                <Input 
                  placeholder="https://linkedin.com/in/..."
                  value={linkedInInput}
                  onChange={(e) => setLinkedInInput(e.target.value)}
                />
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => saveLinkedInUrl(contact.id, linkedInInput)}
                >
                  Speichern
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
        {actions}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Import and Templates Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium">Daily Workflow für {campaignName}</h3>
          {hasTeam && (
            <Badge variant="outline" className="text-xs">
              {contacts.length} Leads im Pool
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Generate URLs Button */}
          {landingPageSlug && (
            <Button
              variant="outline"
              onClick={() => generateUrlsForContacts()}
              disabled={generatingUrls}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {generatingUrls ? "Generiere..." : `URLs generieren (${contacts.filter(c => !c.personalized_url).length})`}
            </Button>
          )}
          {/* Templates Dialog */}
          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings2 className="h-4 w-4 mr-2" />
                Vorlagen ({templates.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Follow-up Nachrichtenvorlagen
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {/* Create new template */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Neue Vorlage erstellen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Name</Label>
                        <Input 
                          placeholder="z.B. Freundliche Erinnerung"
                          value={newTemplate.name}
                          onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Typ</Label>
                        <Select 
                          value={newTemplate.template_type}
                          onValueChange={(v) => setNewTemplate({ ...newTemplate, template_type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="first_message">Erstnachricht</SelectItem>
                            <SelectItem value="fu1">Follow-up 1</SelectItem>
                            <SelectItem value="fu2">Follow-up 2</SelectItem>
                            <SelectItem value="fu3">Follow-up 3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Nachrichtentext</Label>
                      <Textarea 
                        placeholder="Hallo {vorname}, ..."
                        value={newTemplate.content}
                        onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                        className="h-24"
                      />
                    </div>
                    <Button onClick={createTemplate} disabled={!newTemplate.name || !newTemplate.content}>
                      <Plus className="h-4 w-4 mr-2" />
                      Vorlage erstellen
                    </Button>
                  </CardContent>
                </Card>

                {/* Existing templates */}
                {templates.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Noch keine Vorlagen erstellt
                  </p>
                ) : (
                  <div className="space-y-2">
                    {['first_message', 'fu1', 'fu2', 'fu3'].map(type => {
                      const typeTemplates = templates.filter(t => t.template_type === type);
                      if (typeTemplates.length === 0) return null;
                      
                      const typeLabel = {
                        'first_message': 'Erstnachricht',
                        'fu1': 'Follow-up 1',
                        'fu2': 'Follow-up 2',
                        'fu3': 'Follow-up 3'
                      }[type];
                      
                      return (
                        <div key={type}>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">{typeLabel}</h4>
                          {typeTemplates.map(template => (
                            <div key={template.id} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg border mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium">{template.name}</p>
                                <p className="text-sm text-muted-foreground line-clamp-2">{template.content}</p>
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => copyTemplateContent(template.content)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() => deleteTemplate(template.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Import Dialog */}
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Leads importieren
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Leads in Kampagne importieren
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Lead-Daten (CSV Format)</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Füge Leads ein: Vorname, Nachname, Firma, Position, LinkedIn-URL (pro Zeile)
                  </p>
                  <Textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder={`Max, Mustermann, Firma GmbH, CEO, https://linkedin.com/in/max-mustermann\nAnna, Schmidt, Beispiel AG, Marketing Manager, https://linkedin.com/in/anna-schmidt\nThomas, Müller, Startup Inc, Founder, https://linkedin.com/in/thomas-mueller`}
                    className="h-48 font-mono text-sm"
                  />
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Tipp:</strong> Kopiere Daten aus Excel/Sheets. Trennzeichen: Komma oder Semikolon.
                    <br />Alle importierten Leads werden auf "Bereit für Vernetzung" gesetzt.
                  </p>
                </div>
                <Button 
                  onClick={importLeads} 
                  disabled={importing || !importText.trim()} 
                  className="w-full"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importiere...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Leads importieren
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Team: Show active/booked counts and toggle */}
      {hasTeam && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{activeContacts.length} aktive Leads</span>
            {bookedCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {bookedCount} terminiert
              </Badge>
            )}
          </div>
          {bookedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHideBooked(!hideBooked)}
              className="text-xs"
            >
              {hideBooked ? "Terminierte anzeigen" : "Terminierte ausblenden"}
            </Button>
          )}
        </div>
      )}

      {/* Daily Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Vernetzungen prüfen</span>
            </div>
            <p className="text-2xl font-bold">{pendingConnections.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Vernetzungen heute</span>
            </div>
            <p className="text-2xl font-bold">
              <span className={connectionsRemaining <= 0 ? "text-destructive" : "text-muted-foreground"}>
                {connectionsRemaining > 0 ? connectionsRemaining : 0}
              </span>
              {' / '}
              <span>{MAX_DAILY_CONNECTIONS}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Reset um Mitternacht
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Erstnachrichten heute</span>
            </div>
            <p className="text-2xl font-bold">
              <span className={messagesRemaining <= 0 ? "text-destructive" : "text-muted-foreground"}>
                {messagesRemaining > 0 ? messagesRemaining : 0}
              </span>
              {' / '}
              <span>{MAX_DAILY_MESSAGES}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Reset um Mitternacht
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Follow-ups heute</span>
            </div>
            <p className="text-2xl font-bold">
              <span className={followupsRemaining <= 0 ? "text-destructive" : "text-muted-foreground"}>
                {followupsRemaining > 0 ? followupsRemaining : 0}
              </span>
              {' / '}
              <span>{MAX_DAILY_FOLLOWUPS}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {fu1Due.length + fu2Due.length + fu3Due.length} fällig
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Acceptance Rate Warning */}
      {showLowAcceptanceWarning && (
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <AlertTitle className="text-amber-500 flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Niedrige Annahmequote: {acceptanceRate}%
          </AlertTitle>
          <AlertDescription className="text-amber-200/80 mt-2">
            <p className="mb-2">
              In den letzten 7 Tagen wurden nur {connectionsAcceptedLast7Days.length} von {connectionsSentLast7Days.length} Vernetzungsanfragen angenommen.
            </p>
            <p className="font-medium">Empfehlungen:</p>
            <ul className="list-disc list-inside mt-1 space-y-1 text-sm">
              <li>Reduziere die täglichen Vernetzungen auf 8-10</li>
              <li>Überprüfe deine Zielgruppe – passt sie zu deinem Angebot?</li>
              <li>Optimiere dein LinkedIn-Profil (Headline, Foto, About)</li>
              <li>Prüfe ob deine Vernetzungsanfragen personalisiert sind</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Warm Leads Alert - Geantwortet, needs action */}
      {warmLeads.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Flame className="h-5 w-5 text-destructive" />
              {warmLeads.length} Leads haben geantwortet - Jetzt qualifizieren!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {warmLeads.map(contact => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    actions={
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => updateStatus(contact.id, 'positiv_geantwortet', 'positive_reply_at')}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Positiv
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(contact.id, 'abgeschlossen')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Negativ
                        </Button>
                      </div>
                    }
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Positive Replies - Ready for appointment booking */}
      {positiveReplies.length > 0 && (
        <Card className="border-green-500 bg-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {positiveReplies.length} positive Antworten - Termin buchen!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {positiveReplies.map(contact => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    actions={
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => updateStatus(contact.id, 'termin_gebucht', 'appointment_booked_at')}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Termin gebucht
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(contact.id, 'abgeschlossen')}
                        >
                          Abschließen
                        </Button>
                      </div>
                    }
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Appointments Booked - Close the deal */}
      {appointmentsBooked.length > 0 && (
        <Card className="border-blue-500 bg-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              {appointmentsBooked.length} Termine gebucht
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {appointmentsBooked.map(contact => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    actions={
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => updateStatus(contact.id, 'abgeschlossen')}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Abgeschlossen
                      </Button>
                    }
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Workflow Tabs */}
      <Tabs defaultValue="connections" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="connections" className="relative">
            Vernetzungen
            {pendingConnections.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                {pendingConnections.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="new-connections">
            Neue ({connectionsRemaining > 0 ? Math.min(connectionsRemaining, readyForConnection.length) : 0})
          </TabsTrigger>
          <TabsTrigger value="first-messages">
            Erstnachrichten ({Math.min(acceptedConnections.length, messagesRemaining)})
          </TabsTrigger>
          <TabsTrigger value="followups">
            Follow-ups ({fu1Due.length + fu2Due.length + fu3Due.length})
          </TabsTrigger>
        </TabsList>

        {/* Step 1: Check Connections */}
        <TabsContent value="connections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Schritt 1: Vernetzungsstatus prüfen</CardTitle>
              <p className="text-sm text-muted-foreground">
                Prüfe auf LinkedIn, ob diese Vernetzungsanfragen angenommen wurden.
              </p>
            </CardHeader>
            <CardContent>
              {pendingConnections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>Keine offenen Vernetzungen zu prüfen!</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {pendingConnections.map(contact => (
                      <ContactCard 
                        key={contact.id} 
                        contact={contact}
                        showLinkedIn={true}
                        actions={
                          <>
                            {contact.linkedin_url && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => window.open(contact.linkedin_url!, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => updateStatus(contact.id, 'vernetzung_angenommen', 'connection_accepted_at')}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Angenommen
                            </Button>
                          </>
                        }
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new-connections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Schritt 2: Neue Vernetzungen senden</CardTitle>
              <p className="text-sm text-muted-foreground">
                {connectionsRemaining > 0 
                  ? `Du kannst heute noch ${Math.min(connectionsRemaining, readyForConnection.length)} Vernetzungsanfragen senden.`
                  : "Du hast heute das Limit erreicht. Morgen kannst du wieder neue senden."
                }
              </p>
            </CardHeader>
            <CardContent>
              {connectionsRemaining <= 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2" />
                  <p>Tageslimit erreicht! Morgen geht's weiter.</p>
                </div>
              ) : readyForConnection.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-emerald-500" />
                  <p>Keine neuen Leads für Vernetzung verfügbar.</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {readyForConnection.slice(0, connectionsRemaining).map(contact => (
                      <ContactCard 
                        key={contact.id} 
                        contact={contact}
                        showLinkedIn={true}
                        actions={
                          <>
                            {contact.linkedin_url && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => window.open(contact.linkedin_url!, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              size="sm"
                              onClick={() => updateStatus(contact.id, 'vernetzung_ausstehend', 'connection_sent_at')}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Vernetzung gesendet
                            </Button>
                          </>
                        }
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 3: First Messages */}
        <TabsContent value="first-messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Schritt 3: Erstnachrichten senden</CardTitle>
              <p className="text-sm text-muted-foreground">
                {messagesRemaining > 0 
                  ? `Du kannst heute noch ${messagesRemaining} Erstnachrichten senden (max. 8/Tag).`
                  : "Du hast heute bereits 8 Nachrichten gesendet. Morgen geht's weiter!"
                }
              </p>
            </CardHeader>
            <CardContent>
              {messagesRemaining <= 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2" />
                  <p>Tageslimit erreicht! Morgen geht's weiter.</p>
                </div>
              ) : acceptedConnections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>Keine offenen Erstnachrichten.</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {acceptedConnections.slice(0, messagesRemaining).map(contact => (
                      <ContactCard 
                        key={contact.id} 
                        contact={contact}
                        showLinkedIn={true}
                        actions={
                          <>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-2">
                                <p className="text-xs text-muted-foreground mb-2">Vorlage für {contact.first_name} kopieren:</p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="w-full justify-start text-left"
                                  onClick={() => copyPersonalizedFollowup('first_message', contact)}
                                >
                                  Standard-Erstnachricht
                                </Button>
                                {templates.filter(t => t.template_type === 'first_message').map(t => (
                                  <Button
                                    key={t.id}
                                    size="sm"
                                    variant="ghost"
                                    className="w-full justify-start text-left"
                                    onClick={() => copyTemplateContent(t.content, contact)}
                                  >
                                    {t.name}
                                  </Button>
                                ))}
                              </PopoverContent>
                            </Popover>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyMessage(contact)}
                              title={`Nachricht für ${contact.first_name} ${contact.last_name} kopieren`}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => updateStatus(contact.id, 'erstnachricht_gesendet', 'first_message_sent_at')}
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Gesendet
                            </Button>
                            <Button 
                              size="sm"
                              variant="secondary"
                              onClick={() => updateStatus(contact.id, 'reagiert_warm', 'responded_at')}
                            >
                              Hat geantwortet
                            </Button>
                          </>
                        }
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 4: Follow-ups */}
        <TabsContent value="followups" className="space-y-4">
          {/* FU1 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Follow-up 1 (nach 3 Tagen)</CardTitle>
            </CardHeader>
            <CardContent>
              {fu1Due.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Keine FU1 fällig</p>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {fu1Due.map(contact => (
                      <ContactCard 
                        key={contact.id} 
                        contact={contact}
                        showLinkedIn={true}
                        actions={
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => copyPersonalizedFollowup('fu1', contact)}
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              FU1 kopieren
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => updateStatus(contact.id, 'fu1_gesendet', 'fu1_sent_at')}
                            >
                              FU1 gesendet
                            </Button>
                            <Button 
                              size="sm"
                              variant="secondary"
                              onClick={() => updateStatus(contact.id, 'reagiert_warm', 'responded_at')}
                            >
                              Hat geantwortet
                            </Button>
                          </>
                        }
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* FU2 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Follow-up 2 (nach 7 Tagen)</CardTitle>
            </CardHeader>
            <CardContent>
              {fu2Due.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Keine FU2 fällig</p>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {fu2Due.map(contact => (
                      <ContactCard 
                        key={contact.id} 
                        contact={contact}
                        showLinkedIn={true}
                        actions={
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => copyPersonalizedFollowup('fu2', contact)}
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              FU2 kopieren
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => updateStatus(contact.id, 'fu2_gesendet', 'fu2_sent_at')}
                            >
                              FU2 gesendet
                            </Button>
                            <Button 
                              size="sm"
                              variant="secondary"
                              onClick={() => updateStatus(contact.id, 'reagiert_warm', 'responded_at')}
                            >
                              Hat geantwortet
                            </Button>
                          </>
                        }
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* FU3 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Follow-up 3 (nach 14 Tagen)</CardTitle>
            </CardHeader>
            <CardContent>
              {fu3Due.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Keine FU3 fällig</p>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {fu3Due.map(contact => (
                      <ContactCard 
                        key={contact.id} 
                        contact={contact}
                        showLinkedIn={true}
                        actions={
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => copyPersonalizedFollowup('fu3', contact)}
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              FU3 kopieren
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => updateStatus(contact.id, 'fu3_gesendet', 'fu3_sent_at')}
                            >
                              FU3 gesendet
                            </Button>
                            <Button 
                              size="sm"
                              variant="secondary"
                              onClick={() => updateStatus(contact.id, 'reagiert_warm', 'responded_at')}
                            >
                              Hat geantwortet
                            </Button>
                            <Button 
                              size="sm"
                              variant="destructive"
                              onClick={() => updateStatus(contact.id, 'abgeschlossen')}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        }
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pipeline Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pipeline Übersicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {(Object.entries(STATUS_LABELS) as [WorkflowStatus, string][]).map(([status, label]) => {
              const count = contacts.filter(c => c.workflow_status === status).length;
              return (
                <div key={status} className="p-2 bg-muted/50 rounded text-center">
                  <p className="text-xs text-muted-foreground truncate">{label}</p>
                  <p className="text-xl font-bold">{count}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Contact Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Lead bearbeiten
            </DialogTitle>
          </DialogHeader>
          {editingContact && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Vorname</Label>
                  <Input 
                    value={editingContact.first_name}
                    onChange={(e) => setEditingContact({ ...editingContact, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nachname</Label>
                  <Input 
                    value={editingContact.last_name}
                    onChange={(e) => setEditingContact({ ...editingContact, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Firma</Label>
                <Input 
                  value={editingContact.company}
                  onChange={(e) => setEditingContact({ ...editingContact, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Input 
                  value={editingContact.position}
                  onChange={(e) => setEditingContact({ ...editingContact, position: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>E-Mail</Label>
                  <Input 
                    type="email"
                    value={editingContact.email}
                    onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input 
                    value={editingContact.phone}
                    onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>LinkedIn URL</Label>
                <Input 
                  value={editingContact.linkedin_url}
                  onChange={(e) => setEditingContact({ ...editingContact, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsEditDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button className="flex-1" onClick={saveContact}>
                  Speichern
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
