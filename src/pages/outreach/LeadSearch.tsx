import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search, Sparkles, Save, Download, Zap, Building2, MapPin, Users,
  Loader2, ListPlus, ExternalLink, Linkedin, CheckCircle, XCircle,
  Globe, Mail, Tag, ChevronRight, SlidersHorizontal, Monitor,
  Megaphone, Briefcase, Banknote, Heart, Factory, Car, Truck,
  Leaf, UtensilsCrossed, GraduationCap, Newspaper, Phone as PhoneIcon,
  Shield, Wrench, ShoppingBag, FlaskConical, Hash, Plus, FolderPlus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAccountFilter } from "@/hooks/useAccountFilter";


interface SearchLead {
  first_name: string;
  last_name: string;
  position: string;
  company: string;
  industry: string;
  employee_count: string;
  city: string;
  country: string;
  website: string;
  linkedin_url: string;
  linkedin_verified?: boolean;
}

interface SavedList {
  id: string;
  name: string;
  description: string | null;
  total_leads: number;
  search_filters: any;
  created_at: string;
}

interface ListStats {
  total: number;
  enriched: number;
  imported: number;
}

const INDUSTRIES = [
  { value: "Software & IT", label: "Software & IT", icon: Monitor },
  { value: "E-Commerce", label: "E-Commerce", icon: ShoppingBag },
  { value: "Marketing & Werbung", label: "Marketing & Werbung", icon: Megaphone },
  { value: "Beratung & Consulting", label: "Beratung & Consulting", icon: Briefcase },
  { value: "Finanzdienstleistungen", label: "Finanzdienstleistungen", icon: Banknote },
  { value: "Immobilien", label: "Immobilien", icon: Building2 },
  { value: "Gesundheitswesen", label: "Gesundheitswesen", icon: Heart },
  { value: "Maschinenbau", label: "Maschinenbau", icon: Factory },
  { value: "Automotive", label: "Automotive", icon: Car },
  { value: "Logistik & Transport", label: "Logistik & Transport", icon: Truck },
  { value: "Energie & Umwelt", label: "Energie & Umwelt", icon: Leaf },
  { value: "Lebensmittel & Gastronomie", label: "Lebensmittel & Gastronomie", icon: UtensilsCrossed },
  { value: "Bildung & Coaching", label: "Bildung & Coaching", icon: GraduationCap },
  { value: "Medien & Verlag", label: "Medien & Verlag", icon: Newspaper },
  { value: "Telekommunikation", label: "Telekommunikation", icon: PhoneIcon },
  { value: "Versicherungen", label: "Versicherungen", icon: Shield },
  { value: "Personaldienstleistung", label: "Personaldienstleistung", icon: Users },
  { value: "Handwerk & Bau", label: "Handwerk & Bau", icon: Wrench },
  { value: "Einzelhandel", label: "Einzelhandel", icon: ShoppingBag },
  { value: "Pharma & Chemie", label: "Pharma & Chemie", icon: FlaskConical },
];

const EMPLOYEE_COUNTS = [
  { value: "1-10", label: "1-10 Mitarbeiter" },
  { value: "11-50", label: "11-50 Mitarbeiter" },
  { value: "51-200", label: "51-200 Mitarbeiter" },
  { value: "201-500", label: "201-500 Mitarbeiter" },
  { value: "501-1000", label: "501-1.000 Mitarbeiter" },
  { value: "1000+", label: "1.000+ Mitarbeiter" },
];

const LeadSearch = () => {
  const navigate = useNavigate();
  const { accountId } = useAccountFilter();

  const [activeTab, setActiveTab] = useState("search");

  // Search filters
  const [industry, setIndustry] = useState("");
  const [customIndustry, setCustomIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [resultCount, setResultCount] = useState("10");

  // Results
  const [leads, setLeads] = useState<SearchLead[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());

  // Save dialog (new list)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [listName, setListName] = useState("");
  const [listDescription, setListDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Add to existing list dialog
  const [addToListDialogOpen, setAddToListDialogOpen] = useState(false);
  const [addToListId, setAddToListId] = useState("");
  const [addingToList, setAddingToList] = useState(false);

  // Saved lists
  const [savedLists, setSavedLists] = useState<SavedList[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [listStats, setListStats] = useState<Record<string, ListStats>>({});
  const [enrichingListId, setEnrichingListId] = useState<string | null>(null);

  useEffect(() => {
    fetchSavedLists();
  }, []);

  const fetchSavedLists = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_lists')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setSavedLists((data as SavedList[]) || []);
        if (data.length > 0) {
          fetchListStats(data.map((l: any) => l.id));
        }
      }
    } catch { /* ignore */ }
    setLoadingLists(false);
  };

  const fetchListStats = async (listIds: string[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('search-leads', {
        body: { action: 'list_stats', list_ids: listIds },
      });
      if (!error && data?.stats) {
        setListStats(data.stats);
      }
    } catch { /* ignore */ }
  };

  const handleEnrichList = async (listId: string) => {
    setEnrichingListId(listId);
    try {
      const { data, error } = await supabase.functions.invoke('search-leads', {
        body: { action: 'enrich_list', list_id: listId },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`${data.enriched} von ${data.total} Leads angereichert${data.imported > 0 ? `, ${data.imported} neu importiert` : ''}`);
        fetchSavedLists();
      } else {
        toast.error(data?.error || 'Fehler bei der Anreicherung');
      }
    } catch (err: any) {
      console.error('Enrich error:', err);
      toast.error('Fehler bei der Anreicherung');
    } finally {
      setEnrichingListId(null);
    }
  };

  const handleSearch = async () => {
    const searchIndustry = industry === "custom" ? customIndustry : industry;
    if (!searchIndustry.trim()) {
      toast.error("Bitte wähle eine Branche aus");
      return;
    }
    setSearching(true);
    setLeads([]);
    setSelectedLeads(new Set());
    try {
      const { data, error } = await supabase.functions.invoke('search-leads', {
        body: {
          action: 'search',
          industry: searchIndustry,
          location: location || undefined,
          employee_count: employeeCount || undefined,
          count: parseInt(resultCount),
        },
      });
      if (error) throw error;
      if (data?.leads && data.leads.length > 0) {
        setLeads(data.leads);
        toast.success(`${data.leads.length} Entscheider mit LinkedIn-Profil gefunden`);
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.info("Keine Ergebnisse mit LinkedIn-Profil gefunden");
      }
    } catch (err: any) {
      console.error('Search error:', err);
      toast.error("Fehler bei der KI-Recherche");
    } finally {
      setSearching(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map((_, i) => i)));
    }
  };

  const toggleSelect = (index: number) => {
    const next = new Set(selectedLeads);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedLeads(next);
  };

  const getLeadsToSave = () => {
    return selectedLeads.size > 0
      ? Array.from(selectedLeads).map(i => leads[i])
      : leads;
  };

  const handleSaveList = async () => {
    if (!listName.trim()) {
      toast.error("Bitte gib einen Listennamen ein");
      return;
    }
    const leadsToSave = getLeadsToSave();
    if (leadsToSave.length === 0) {
      toast.error("Keine Leads zum Speichern");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-leads', {
        body: {
          action: 'save_list',
          name: listName,
          description: listDescription || undefined,
          leads: leadsToSave,
          filters: {
            industry: industry === "custom" ? customIndustry : industry,
            location,
            employee_count: employeeCount,
          },
        },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Liste "${listName}" mit ${leadsToSave.length} Leads gespeichert`);
        setSaveDialogOpen(false);
        setListName("");
        setListDescription("");
        fetchSavedLists();
      } else {
        toast.error(data?.error || "Fehler beim Speichern");
      }
    } catch {
      toast.error("Fehler beim Speichern der Liste");
    } finally {
      setSaving(false);
    }
  };

  const handleAddToExistingList = async () => {
    if (!addToListId) {
      toast.error("Bitte wähle eine Liste aus");
      return;
    }
    const leadsToAdd = getLeadsToSave();
    if (leadsToAdd.length === 0) {
      toast.error("Keine Leads zum Hinzufügen");
      return;
    }
    setAddingToList(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-leads', {
        body: {
          action: 'add_to_list',
          list_id: addToListId,
          leads: leadsToAdd,
        },
      });
      if (error) throw error;
      if (data?.success) {
        const listObj = savedLists.find(l => l.id === addToListId);
        toast.success(`${leadsToAdd.length} Leads zu "${listObj?.name}" hinzugefügt`);
        setAddToListDialogOpen(false);
        setAddToListId("");
        fetchSavedLists();
      } else {
        toast.error(data?.error || "Fehler beim Hinzufügen");
      }
    } catch {
      toast.error("Fehler beim Hinzufügen zur Liste");
    } finally {
      setAddingToList(false);
    }
  };

  const handleImportSelected = async (listId: string) => {
    try {
      const { data: items, error } = await supabase
        .from('lead_list_items')
        .select('id')
        .eq('list_id', listId)
        .eq('imported', false);
      if (error || !items?.length) {
        toast.error("Keine neuen Leads zum Importieren");
        return;
      }
      const { data, error: importErr } = await supabase.functions.invoke('search-leads', {
        body: {
          action: 'import_to_contacts',
          item_ids: items.map(i => i.id),
        },
      });
      if (importErr) throw importErr;
      if (data?.success) {
        toast.success(`${data.imported} Leads als Kontakte importiert`);
        fetchSavedLists();
      }
    } catch {
      toast.error("Fehler beim Importieren");
    }
  };

  // Group leads by company for card display
  const companyGroups = leads.reduce<Record<string, { company: string; industry: string; city: string; country: string; website: string; employee_count: string; leads: (SearchLead & { idx: number })[] }>>((acc, lead, idx) => {
    const key = lead.company || `unknown-${idx}`;
    if (!acc[key]) {
      acc[key] = {
        company: lead.company,
        industry: lead.industry,
        city: lead.city,
        country: lead.country,
        website: lead.website,
        employee_count: lead.employee_count,
        leads: [],
      };
    }
    acc[key].leads.push({ ...lead, idx });
    return acc;
  }, {});

  const companyList = Object.values(companyGroups);

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Search Bar */}
        <div className="flex flex-col items-center gap-4 pt-2 pb-4">
          <h1 className="text-2xl font-bold text-foreground">Finde passende Entscheider</h1>
          <div className="w-full max-w-2xl relative">
            <Input
              value={industry === "custom" ? customIndustry : (industry || "")}
              onChange={(e) => {
                setIndustry("custom");
                setCustomIndustry(e.target.value);
              }}
              placeholder="Branche oder Unternehmen suchen..."
              className="h-12 pl-5 pr-14 text-base rounded-full border-primary/30 bg-background shadow-sm"
            />
            <Button
              size="icon"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full h-9 w-9"
              onClick={handleSearch}
              disabled={searching}
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full max-w-xs">
            <TabsTrigger value="search" className="flex-1 gap-1.5">
              <Search className="w-4 h-4" />
              Suche
              {leads.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{leads.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="lists" className="flex-1 gap-1.5">
              <ListPlus className="w-4 h-4" />
              Listen
              {savedLists.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{savedLists.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ─── SEARCH TAB ─── */}
          <TabsContent value="search" className="mt-4">
            <div className="flex gap-6">
              {/* Sidebar Filters */}
              <aside className="hidden md:block w-64 shrink-0 space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Kategorie</Label>
                  <Select value={industry} onValueChange={(v) => { setIndustry(v); if (v !== "custom") setCustomIndustry(""); }}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Alle Kategorien" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="all">Alle Kategorien</SelectItem>
                      {INDUSTRIES.map(ind => {
                        const Icon = ind.icon;
                        return (
                          <SelectItem key={ind.value} value={ind.value}>
                            <span className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                              {ind.label}
                            </span>
                          </SelectItem>
                        );
                      })}
                      <SelectItem value="custom">
                        <span className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-muted-foreground shrink-0" />
                          Eigene Branche...
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {industry === "custom" && (
                    <Input
                      value={customIndustry}
                      onChange={(e) => setCustomIndustry(e.target.value)}
                      placeholder="z.B. Biotechnologie"
                      className="mt-1"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Standort</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="z.B. München"
                      className="pl-9 bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Mitarbeiteranzahl</Label>
                  <Select value={employeeCount} onValueChange={setEmployeeCount}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Alle Größen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Größen</SelectItem>
                      {EMPLOYEE_COUNTS.map(ec => (
                        <SelectItem key={ec.value} value={ec.value}>
                          <span className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                            {ec.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Anzahl Ergebnisse</Label>
                  <Select value={resultCount} onValueChange={setResultCount}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 Leads</SelectItem>
                      <SelectItem value="10">10 Leads</SelectItem>
                      <SelectItem value="20">20 Leads</SelectItem>
                      <SelectItem value="30">30 Leads</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleSearch} disabled={searching} className="w-full" size="lg">
                  {searching ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Recherchiert...</>
                  ) : (
                    <><Search className="w-4 h-4 mr-2" />Suchen</>
                  )}
                </Button>
              </aside>

              {/* Main Content */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* Results Header */}
                {leads.length > 0 && (
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-sm text-muted-foreground">
                      {leads.length} Entscheider in {companyList.length} Unternehmen
                    </p>
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Linkedin className="w-3 h-3" />
                      Alle mit LinkedIn verifiziert
                    </Badge>
                    <div className="flex items-center gap-2">
                      {selectedLeads.size > 0 && (
                        <span className="text-xs text-muted-foreground">{selectedLeads.size} ausgewählt</span>
                      )}
                      {/* Add to existing list */}
                      {savedLists.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAddToListDialogOpen(true)}
                        >
                          <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
                          Zu Liste hinzufügen
                        </Button>
                      )}
                      {/* Save as new list */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setListName(`${industry === "custom" ? customIndustry : industry} - ${new Date().toLocaleDateString('de-DE')}`);
                          setSaveDialogOpen(true);
                        }}
                      >
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        Neue Liste
                      </Button>
                      <div className="flex items-center gap-1">
                        <Checkbox
                          checked={selectedLeads.size === leads.length && leads.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                        <span className="text-xs text-muted-foreground">Alle</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Searching state */}
                {searching && (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-foreground">KI recherchiert & prüft LinkedIn...</p>
                      <p className="text-sm text-muted-foreground mt-1">Nur Leads mit bestätigtem LinkedIn-Profil werden angezeigt</p>
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!searching && leads.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                      <Search className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Starte deine Recherche</p>
                      <p className="text-sm text-muted-foreground mt-1">Wähle Filter links und klicke auf Suchen</p>
                    </div>
                  </div>
                )}

                {/* Company Cards */}
                {!searching && companyList.map((group, gIdx) => (
                  <Card key={gIdx} className="border-border overflow-hidden hover:border-primary/30 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-border">
                          <Building2 className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-base font-semibold text-foreground truncate">{group.company}</h3>
                              <p className="text-sm text-muted-foreground mt-0.5">{group.industry}</p>
                            </div>
                            <Badge variant="secondary" className="shrink-0 text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              {group.employee_count}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                            {(group.city || group.country) && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {[group.city, group.country].filter(Boolean).join(', ')}
                              </span>
                            )}
                            {group.website && (
                              <a
                                href={group.website.startsWith('http') ? group.website : `https://${group.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-primary transition-colors"
                              >
                                <Globe className="w-3 h-3" />
                                {group.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                              </a>
                            )}
                          </div>
                          <div className="mt-3 border-t border-border/50 pt-3 space-y-2">
                            {group.leads.map((lead) => (
                              <div key={lead.idx} className="flex items-center justify-between gap-2 group/lead">
                                <div className="flex items-center gap-3 min-w-0">
                                  <Checkbox
                                    checked={selectedLeads.has(lead.idx)}
                                    onCheckedChange={() => toggleSelect(lead.idx)}
                                  />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                      {lead.first_name} {lead.last_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">{lead.position}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {lead.linkedin_verified ? (
                                    <a
                                      href={lead.linkedin_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400 transition-colors"
                                    >
                                      <Linkedin className="w-3.5 h-3.5" />
                                      <CheckCircle className="w-3 h-3 text-green-500" />
                                    </a>
                                  ) : (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <XCircle className="w-3 h-3" />
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          {group.industry && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Tag className="w-3 h-3" />
                              {group.industry}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {group.website && (
                            <Button variant="ghost" size="sm" className="text-xs h-8" asChild>
                              <a
                                href={group.website.startsWith('http') ? group.website : `https://${group.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Webseite anschauen
                              </a>
                            </Button>
                          )}
                          {group.leads[0]?.linkedin_url && (
                            <Button size="sm" className="text-xs h-8" asChild>
                              <a
                                href={group.leads[0].linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Profil anschauen
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ─── LISTS TAB ─── */}
          <TabsContent value="lists" className="mt-4">
            <div className="space-y-4">
              {loadingLists ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : savedLists.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                    <ListPlus className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Noch keine Listen</p>
                    <p className="text-sm text-muted-foreground mt-1">Suche Leads und speichere sie in einer Liste</p>
                  </div>
                  <Button variant="outline" onClick={() => setActiveTab("search")}>
                    <Search className="w-4 h-4 mr-2" />
                    Zur Suche
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedLists.map(list => {
                    const stats = listStats[list.id];
                    const enrichedPct = stats ? Math.round((stats.enriched / stats.total) * 100) : 0;
                    return (
                      <Card key={list.id} className="border-border hover:border-primary/30 transition-colors">
                        <CardContent className="p-5 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0">
                              <h4 className="font-semibold text-foreground truncate">{list.name}</h4>
                              {list.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{list.description}</p>
                              )}
                            </div>
                            <Badge variant="secondary" className="shrink-0">{list.total_leads} Leads</Badge>
                          </div>
                          {stats && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Angereichert</span>
                                <span className="font-medium text-foreground">{stats.enriched}/{stats.total} ({enrichedPct}%)</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div className="bg-primary rounded-full h-1.5 transition-all duration-300" style={{ width: `${enrichedPct}%` }} />
                              </div>
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {list.search_filters?.industry && <span>Branche: {list.search_filters.industry}</span>}
                            {list.search_filters?.location && <span> • {list.search_filters.location}</span>}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => handleImportSelected(list.id)}>
                              <Download className="w-3.5 h-3.5 mr-1" />
                              Importieren
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => handleEnrichList(list.id)}
                              disabled={enrichingListId === list.id || (stats?.enriched === stats?.total && stats?.total > 0)}
                            >
                              {enrichingListId === list.id ? (
                                <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Anreichern...</>
                              ) : stats?.enriched === stats?.total && stats?.total > 0 ? (
                                <><Zap className="w-3.5 h-3.5 mr-1" />Vollständig</>
                              ) : (
                                <><Zap className="w-3.5 h-3.5 mr-1" />Anreichern</>
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Erstellt am {new Date(list.created_at).toLocaleDateString('de-DE')}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Save as new list Dialog */}
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue Lead-Liste erstellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Listenname *</Label>
                <Input value={listName} onChange={(e) => setListName(e.target.value)} placeholder="z.B. IT-Entscheider München" />
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Input value={listDescription} onChange={(e) => setListDescription(e.target.value)} placeholder="Optional..." />
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedLeads.size > 0
                  ? `${selectedLeads.size} ausgewählte Leads werden gespeichert`
                  : `Alle ${leads.length} Leads werden gespeichert`}
              </p>
              <Button onClick={handleSaveList} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {saving ? "Wird gespeichert..." : "Liste speichern"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add to existing list Dialog */}
        <Dialog open={addToListDialogOpen} onOpenChange={setAddToListDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leads zu Liste hinzufügen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Liste auswählen</Label>
                <Select value={addToListId} onValueChange={setAddToListId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Liste wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {savedLists.map(list => (
                      <SelectItem key={list.id} value={list.id}>
                        <span className="flex items-center gap-2">
                          <ListPlus className="w-4 h-4 text-muted-foreground shrink-0" />
                          {list.name} ({list.total_leads} Leads)
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedLeads.size > 0
                  ? `${selectedLeads.size} ausgewählte Leads werden hinzugefügt`
                  : `Alle ${leads.length} Leads werden hinzugefügt`}
              </p>
              <Button onClick={handleAddToExistingList} disabled={addingToList || !addToListId} className="w-full">
                {addingToList ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FolderPlus className="w-4 h-4 mr-2" />}
                {addingToList ? "Wird hinzugefügt..." : "Zu Liste hinzufügen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default LeadSearch;
