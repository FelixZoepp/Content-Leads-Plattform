import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Mail, Phone, Building, Upload, PhoneCall, UserPlus, Video, Eye, Link, TrendingUp, Megaphone, Pencil, Tag, Filter, X, Download, Users, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  tags: string[];
  source: string | null;
  stage: string | null;
  status: string | null;
  slug: string | null;
  video_url: string | null;
  viewed: boolean | null;
  viewed_at: string | null;
  view_count: number | null;
  lead_type: 'inbound' | 'outbound' | null;
  position: string | null;
  linkedin_url: string | null;
  lead_score: number | null;
  campaign_id: string | null;
  workflow_status: string | null;
}

interface EditingContact {
  id: string;
  first_name: string;
  last_name: string;
  company: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string;
}

const Contacts = () => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EditingContact | null>(null);
  const [filterLeadType, setFilterLeadType] = useState<string>("all");
  const [filterViewed, setFilterViewed] = useState<string>("all");
  const [filterScoreMin, setFilterScoreMin] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;
  
  // Form state
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    company: "",
    email: "",
    phone: "",
    lead_type: "outbound" as "inbound" | "outbound",
    source: "",
    video_url: "",
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [searchQuery, contacts, filterLeadType, filterViewed, filterScoreMin, filterTag]);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
      setFilteredContacts(data || []);
    } catch (error: any) {
      toast.error("Fehler beim Laden der Kontakte");
    } finally {
      setLoading(false);
    }
  };

  const filterContacts = () => {
    let filtered = [...contacts];

    // Text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.first_name.toLowerCase().includes(query) ||
        c.last_name.toLowerCase().includes(query) ||
        c.company?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.position?.toLowerCase().includes(query) ||
        c.tags?.some(t => t.toLowerCase().includes(query))
      );
    }

    // Lead type filter
    if (filterLeadType !== "all") {
      filtered = filtered.filter(c => c.lead_type === filterLeadType);
    }

    // Viewed filter
    if (filterViewed === "viewed") {
      filtered = filtered.filter(c => c.viewed === true);
    } else if (filterViewed === "not_viewed") {
      filtered = filtered.filter(c => !c.viewed);
    }

    // Score filter
    if (filterScoreMin === "hot") {
      filtered = filtered.filter(c => (c.lead_score || 0) >= 70);
    } else if (filterScoreMin === "warm") {
      filtered = filtered.filter(c => (c.lead_score || 0) >= 30);
    } else if (filterScoreMin === "cold") {
      filtered = filtered.filter(c => (c.lead_score || 0) < 30);
    }

    // Tag filter
    if (filterTag !== "all") {
      filtered = filtered.filter(c => c.tags?.includes(filterTag));
    }

    setFilteredContacts(filtered);
    setCurrentPage(1);
  };

  // Get all unique tags across contacts
  const allTags = [...new Set(contacts.flatMap(c => c.tags || []))].sort();

  // Bulk add tag to selected contacts
  const bulkAddTag = async (tag: string) => {
    if (!tag.trim() || selectedContacts.size === 0) return;
    try {
      for (const contactId of selectedContacts) {
        const contact = contacts.find(c => c.id === contactId);
        if (!contact) continue;
        const existingTags = contact.tags || [];
        if (existingTags.includes(tag.trim())) continue;
        await supabase
          .from("contacts")
          .update({ tags: [...existingTags, tag.trim()] })
          .eq("id", contactId);
      }
      toast.success(`Tag "${tag}" zu ${selectedContacts.size} Kontakten hinzugefügt`);
      setSelectedContacts(new Set());
      setTagInput("");
      fetchContacts();
    } catch {
      toast.error("Fehler beim Taggen");
    }
  };

  const toggleSelectContact = (id: string) => {
    const next = new Set(selectedContacts);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedContacts(next);
  };

  const toggleSelectAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const exportCSV = () => {
    const rows = filteredContacts.map(c => ({
      Vorname: c.first_name,
      Nachname: c.last_name,
      Firma: c.company || "",
      Position: c.position || "",
      "E-Mail": c.email || "",
      Telefon: c.phone || "",
      LinkedIn: c.linkedin_url || "",
      Tags: (c.tags || []).join("; "),
      Score: c.lead_score || 0,
      Typ: c.lead_type || "",
      Status: c.workflow_status || c.status || "",
      Gesehen: c.viewed ? "Ja" : "Nein",
    }));
    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(","),
      ...rows.map(r => headers.map(h => `"${String((r as any)[h]).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kontakte-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredContacts.length} Kontakte exportiert`);
  };

  const handleCreateContact = async () => {
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error("Vorname und Nachname sind erforderlich");
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Nicht angemeldet");
        return;
      }

      // Get user's account_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

      const { error } = await supabase
        .from('contacts')
        .insert({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          company: formData.company.trim() || null,
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          lead_type: formData.lead_type,
          source: formData.source.trim() || null,
          video_url: formData.lead_type === 'outbound' ? (formData.video_url.trim() || null) : null,
          owner_user_id: user.id,
          account_id: profile?.account_id || null,
        });

      if (error) throw error;

      toast.success(`Kontakt ${formData.first_name} ${formData.last_name} erstellt!`);
      setDialogOpen(false);
      setFormData({
        first_name: "",
        last_name: "",
        company: "",
        email: "",
        phone: "",
        lead_type: "outbound",
        source: "",
        video_url: "",
      });
      fetchContacts();
    } catch (error: any) {
      console.error('Error creating contact:', error);
      toast.error("Fehler beim Erstellen des Kontakts");
    } finally {
      setCreating(false);
    }
  };

  const createDealFromContact = async (contact: Contact) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Nicht angemeldet");
        return;
      }

      const { data: existingDeal } = await supabase
        .from('deals')
        .select('id')
        .eq('contact_id', contact.id)
        .maybeSingle();

      if (existingDeal) {
        toast.info(`Deal existiert bereits für ${contact.first_name} ${contact.last_name}`);
        navigate(`/pipeline`);
        return;
      }

      const { error } = await supabase
        .from('deals')
        .insert({
          contact_id: contact.id,
          title: `${contact.first_name} ${contact.last_name} - ${contact.company || 'Kaltakquise'}`,
          stage: 'Lead',
          pipeline: 'cold',
          amount_eur: 0,
          setter_id: user.id
        });

      if (error) throw error;

      toast.success(`Deal erstellt für ${contact.first_name} ${contact.last_name}`);
      navigate(`/pipeline`);
    } catch (error: any) {
      console.error('Error creating deal:', error);
      toast.error("Fehler beim Erstellen des Deals");
    }
  };

  const openEditDialog = (contact: Contact) => {
    setEditingContact({
      id: contact.id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      company: contact.company || '',
      email: contact.email || '',
      phone: contact.phone || '',
      position: contact.position || '',
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
        email: editingContact.email || null,
        phone: editingContact.phone || null,
        position: editingContact.position || null,
        linkedin_url: editingContact.linkedin_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingContact.id);

    if (error) {
      toast.error("Fehler beim Speichern");
      console.error(error);
    } else {
      toast.success("Kontakt aktualisiert");
      setIsEditDialogOpen(false);
      setEditingContact(null);
      fetchContacts();
    }
  };

  const startCallWithContact = async (contact: Contact) => {
    await createDealFromContact(contact);
    navigate(`/power-dialer`);
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Lädt Kontakte...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Kontakte</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/import-leads')}>
              <Upload className="w-4 h-4 mr-2" />
              Leads importieren
            </Button>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Neuer Kontakt
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Neuen Kontakt anlegen</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 mt-4">

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Vorname *</Label>
                      <Input 
                        value={formData.first_name}
                        onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                        placeholder="Max"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nachname *</Label>
                      <Input 
                        value={formData.last_name}
                        onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                        placeholder="Mustermann"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Firma</Label>
                    <Input 
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                      placeholder="Acme GmbH"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>E-Mail</Label>
                    <Input 
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="max@acme.de"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Telefon</Label>
                    <Input 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+49 123 456789"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Quelle</Label>
                    <Input 
                      value={formData.source}
                      onChange={(e) => setFormData({...formData, source: e.target.value})}
                      placeholder="LinkedIn, Website, etc."
                    />
                  </div>

                  {/* Video URL - nur für Outbound */}
                  {formData.lead_type === 'outbound' && (
                    <div className="space-y-2">
                      <Label>Video URL (für Videonotiz)</Label>
                      <Input 
                        value={formData.video_url}
                        onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                        placeholder="https://cdn.example.com/video.mp4"
                      />
                      <p className="text-xs text-muted-foreground">
                        Slug & personalisierte URL werden automatisch generiert
                      </p>
                    </div>
                  )}

                  <Button 
                    onClick={handleCreateContact} 
                    className="w-full mt-4"
                    disabled={creating}
                  >
                    {creating ? "Wird erstellt..." : "Kontakt erstellen"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="mb-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Name, Firma, E-Mail, Tags durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant={showFilters ? "secondary" : "outline"} onClick={() => setShowFilters(!showFilters)} className="gap-2">
              <Filter className="w-4 h-4" />
              Filter
              {(filterLeadType !== "all" || filterViewed !== "all" || filterScoreMin !== "all" || filterTag !== "all") && (
                <Badge variant="destructive" className="text-[10px] h-4 w-4 p-0 flex items-center justify-center">!</Badge>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-3 p-3 rounded-lg bg-muted/50 border">
              <Select value={filterLeadType} onValueChange={setFilterLeadType}>
                <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Lead-Typ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Typen</SelectItem>
                  <SelectItem value="outbound">Outbound</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterViewed} onValueChange={setFilterViewed}>
                <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Gesehen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="viewed">Seite angesehen</SelectItem>
                  <SelectItem value="not_viewed">Nicht angesehen</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterScoreMin} onValueChange={setFilterScoreMin}>
                <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Score" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Scores</SelectItem>
                  <SelectItem value="hot">🔥 Hot (70+)</SelectItem>
                  <SelectItem value="warm">🟡 Warm (30+)</SelectItem>
                  <SelectItem value="cold">❄️ Kalt (&lt;30)</SelectItem>
                </SelectContent>
              </Select>
              {allTags.length > 0 && (
                <Select value={filterTag} onValueChange={setFilterTag}>
                  <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Tag" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Tags</SelectItem>
                    {allTags.map(tag => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {(filterLeadType !== "all" || filterViewed !== "all" || filterScoreMin !== "all" || filterTag !== "all") && (
                <Button variant="ghost" size="sm" onClick={() => { setFilterLeadType("all"); setFilterViewed("all"); setFilterScoreMin("all"); setFilterTag("all"); }}>
                  <X className="w-3 h-3 mr-1" /> Zurücksetzen
                </Button>
              )}
            </div>
          )}

          {/* Bulk actions bar */}
          {selectedContacts.size > 0 && (
            <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/10 border border-primary/20 flex-wrap">
              <span className="text-sm font-medium">{selectedContacts.size} ausgewählt</span>
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  placeholder="Tag eingeben..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className="h-8 w-36"
                  onKeyDown={(e) => { if (e.key === "Enter" && tagInput) bulkAddTag(tagInput); }}
                />
                <Button size="sm" variant="secondary" onClick={() => bulkAddTag(tagInput)} disabled={!tagInput.trim()}>
                  <Tag className="w-3 h-3 mr-1" /> Tag
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={async () => {
                    if (!confirm(`${selectedContacts.size} Kontakte wirklich löschen?`)) return;
                    try {
                      const ids = Array.from(selectedContacts);
                      const { error } = await supabase.from("contacts").delete().in("id", ids);
                      if (error) throw error;
                      toast.success(`${ids.length} Kontakte gelöscht`);
                      setSelectedContacts(new Set());
                      fetchContacts();
                    } catch { toast.error("Fehler beim Löschen"); }
                  }}
                >
                  <X className="w-3 h-3 mr-1" /> Löschen
                </Button>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedContacts(new Set())}>Abwählen</Button>
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filteredContacts.length} von {contacts.length} Kontakten</span>
            <div className="flex items-center gap-2">
              {filteredContacts.length > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-6" onClick={exportCSV}>
                  <Download className="w-3 h-3 mr-1" /> CSV Export
                </Button>
              )}
              {filteredContacts.length > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-6" onClick={toggleSelectAll}>
                  {selectedContacts.size === filteredContacts.length ? "Alle abwählen" : "Alle auswählen"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Contacts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(contact => (
            <Card key={contact.id} className={`hover:shadow-md transition-shadow border-l-4 ${(contact.lead_score || 0) >= 70 ? 'border-l-red-500' : (contact.lead_score || 0) >= 30 ? 'border-l-amber-500' : 'border-l-cyan-500'} ${selectedContacts.has(contact.id) ? 'ring-2 ring-primary' : ''}`}
              onClick={() => toggleSelectContact(contact.id)}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={selectedContacts.has(contact.id)} onChange={() => {}} className="rounded" onClick={(e) => e.stopPropagation()} />
                    <h3 className="font-semibold text-lg">
                      {contact.first_name} {contact.last_name}
                    </h3>
                    {(contact.lead_score || 0) >= 70 && <Badge variant="destructive" className="text-[10px]">🔥 {contact.lead_score}</Badge>}
                    {(contact.lead_score || 0) >= 30 && (contact.lead_score || 0) < 70 && <Badge variant="secondary" className="text-[10px]">{contact.lead_score}</Badge>}
                    {contact.viewed && <Badge variant="outline" className="text-[10px]"><Eye className="w-3 h-3 mr-0.5" />Gesehen</Badge>}
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); openEditDialog(contact); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                {/* Tags */}
                {contact.tags && contact.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {contact.tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] bg-primary/5">{tag}</Badge>
                    ))}
                  </div>
                )}
                
                {contact.company && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Building className="w-4 h-4" />
                    <span>{contact.company}</span>
                  </div>
                )}

                {contact.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}

                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Phone className="w-4 h-4" />
                    <span>{contact.phone}</span>
                  </div>
                )}

                {contact.tags && contact.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {contact.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {contact.source && (
                  <p className="text-xs text-muted-foreground mt-3 mb-3">
                    Quelle: {contact.source}
                  </p>
                )}

                {/* Video Note Status - nur für Outbound */}
                {contact.lead_type === 'outbound' && contact.slug && (
                  <div className="mt-3 p-2 bg-cyan-500/5 rounded-lg space-y-1 border border-cyan-500/20">
                    <div className="flex items-center gap-2 text-xs">
                      <Video className="w-3 h-3 text-cyan-500" />
                      <a 
                        href={`/p/${contact.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-600 hover:underline truncate"
                      >
                        /p/{contact.slug}
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/p/${contact.slug}`);
                          toast.success("Link kopiert!");
                        }}
                        className="ml-auto"
                      >
                        <Link className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Eye className="w-3 h-3" />
                      {contact.viewed ? (
                        <span className="text-green-600">
                          Angesehen ({contact.view_count || 0}x)
                          {contact.viewed_at && ` • ${new Date(contact.viewed_at).toLocaleDateString('de-DE')}`}
                        </span>
                      ) : (
                        <span>Nicht angesehen</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={(e) => { e.stopPropagation(); createDealFromContact(contact); }}
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Deal
                  </Button>
                  {contact.phone && (
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1"
                      onClick={(e) => { e.stopPropagation(); startCallWithContact(contact); }}
                    >
                      <PhoneCall className="w-4 h-4 mr-1" />
                      Anrufen
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                    title="DSGVO: Alle Daten löschen"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm(`Alle Daten von ${contact.first_name} ${contact.last_name} unwiderruflich löschen? (DSGVO Art. 17)`)) return;
                      try {
                        // Delete tracking events, activities, deals, then contact (RLS ensures account scope)
                        const cid = contact.id;
                        await Promise.all([
                          supabase.from("lead_tracking_events").delete().eq("contact_id", cid),
                          supabase.from("activities").delete().eq("contact_id", cid),
                          supabase.from("deals").delete().eq("contact_id", cid),
                        ]);
                        await supabase.from("contacts").delete().eq("id", cid);
                        toast.success("Alle Daten gelöscht (DSGVO Art. 17)");
                        fetchContacts();
                      } catch { toast.error("Fehler beim Löschen"); }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredContacts.length === 0 && contacts.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h3 className="text-lg font-semibold mb-2">Noch keine Kontakte</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Importiere Leads in einer Kampagne oder erstelle Kontakte manuell.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => navigate("/campaigns")}>Zu Kampagnen</Button>
              <Button onClick={() => navigate("/import-leads")}>
                <Upload className="w-4 h-4 mr-2" /> Leads importieren
              </Button>
            </div>
          </div>
        )}
        {filteredContacts.length === 0 && contacts.length > 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Keine Kontakte für diesen Filter gefunden</p>
          </div>
        )}

        {/* Pagination */}
        {filteredContacts.length > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              Zurück
            </Button>
            <span className="text-sm text-muted-foreground">
              Seite {currentPage} von {Math.ceil(filteredContacts.length / PAGE_SIZE)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= Math.ceil(filteredContacts.length / PAGE_SIZE)}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Weiter
            </Button>
          </div>
        )}

        {/* Edit Contact Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Kontakt bearbeiten</DialogTitle>
            </DialogHeader>
            {editingContact && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Vorname</Label>
                    <Input 
                      value={editingContact.first_name}
                      onChange={(e) => setEditingContact({...editingContact, first_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nachname</Label>
                    <Input 
                      value={editingContact.last_name}
                      onChange={(e) => setEditingContact({...editingContact, last_name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Firma</Label>
                  <Input 
                    value={editingContact.company}
                    onChange={(e) => setEditingContact({...editingContact, company: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Input 
                    value={editingContact.position}
                    onChange={(e) => setEditingContact({...editingContact, position: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-Mail</Label>
                  <Input 
                    type="email"
                    value={editingContact.email}
                    onChange={(e) => setEditingContact({...editingContact, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input 
                    value={editingContact.phone}
                    onChange={(e) => setEditingContact({...editingContact, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn URL</Label>
                  <Input 
                    value={editingContact.linkedin_url}
                    onChange={(e) => setEditingContact({...editingContact, linkedin_url: e.target.value})}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <Button onClick={saveContact} className="w-full">
                  Speichern
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default Contacts;
