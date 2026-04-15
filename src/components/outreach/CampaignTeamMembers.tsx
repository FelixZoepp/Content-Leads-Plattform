import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { UserPlus, Users, Trash2, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

interface CampaignMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: { name: string; email: string; avatar_url: string | null };
  linkCount?: number;
  connectedCount?: number;
  messageSentCount?: number;
}

interface TeamMemberOption {
  id: string;
  name: string;
  email: string;
}

interface CampaignTeamMembersProps {
  campaignId: string;
  campaignName: string;
}

export const CampaignTeamMembers = ({ campaignId, campaignName }: CampaignTeamMembersProps) => {
  const [members, setMembers] = useState<CampaignMember[]>([]);
  const [availableMembers, setAvailableMembers] = useState<TeamMemberOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [generatingLinks, setGeneratingLinks] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
    fetchAvailableMembers();
  }, [campaignId]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("campaign_members")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("joined_at");

      if (error) throw error;

      // Get profiles for members
      const userIds = (data || []).map(m => m.user_id);
      if (userIds.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email, avatar_url")
        .in("id", userIds);

      // Get link stats per member
      const { data: linkStats } = await supabase
        .from("contact_member_links")
        .select("user_id, workflow_status")
        .eq("campaign_id", campaignId);

      const enriched: CampaignMember[] = (data || []).map(m => {
        const profile = profiles?.find(p => p.id === m.user_id);
        const memberLinks = linkStats?.filter(l => l.user_id === m.user_id) || [];
        return {
          ...m,
          profile: profile ? { name: profile.name || "Unbekannt", email: profile.email || "", avatar_url: profile.avatar_url } : undefined,
          linkCount: memberLinks.length,
          connectedCount: memberLinks.filter(l => l.workflow_status !== "neu").length,
          messageSentCount: memberLinks.filter(l => 
            ["erstnachricht_gesendet", "fu1_gesendet", "fu2_gesendet", "fu3_gesendet", "reagiert_warm", "abgeschlossen"].includes(l.workflow_status || "")
          ).length,
        };
      });

      setMembers(enriched);
    } catch (err) {
      console.error("Error fetching campaign members:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("account_id").eq("id", user.id).single();
      if (!profile?.account_id) return;

      const { data } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("account_id", profile.account_id)
        .order("name");

      setAvailableMembers((data || []) as TeamMemberOption[]);
    } catch (err) {
      console.error("Error fetching available members:", err);
    }
  };

  const addMember = async () => {
    if (!selectedUserId) return;
    setAdding(true);
    try {
      const { error } = await supabase
        .from("campaign_members")
        .insert({ campaign_id: campaignId, user_id: selectedUserId, role: "setter" });

      if (error) {
        if (error.code === "23505") {
          toast.error("Dieses Teammitglied ist bereits in der Kampagne");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Teammitglied hinzugefügt");
      setSelectedUserId("");
      fetchMembers();
    } catch (err) {
      console.error("Error adding member:", err);
      toast.error("Fehler beim Hinzufügen");
    } finally {
      setAdding(false);
    }
  };

  const removeMember = async (memberId: string, userId: string) => {
    try {
      // Delete member links first
      await supabase
        .from("contact_member_links")
        .delete()
        .eq("campaign_id", campaignId)
        .eq("user_id", userId);

      const { error } = await supabase
        .from("campaign_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
      toast.success("Teammitglied entfernt");
      fetchMembers();
    } catch (err) {
      console.error("Error removing member:", err);
      toast.error("Fehler beim Entfernen");
    }
  };

  const generateLinksForMember = async (userId: string) => {
    setGeneratingLinks(userId);
    try {
      // Get all contacts in this campaign
      const { data: contacts, error: contactsError } = await supabase
        .from("contacts")
        .select("id")
        .eq("campaign_id", campaignId);

      if (contactsError) throw contactsError;

      if (!contacts || contacts.length === 0) {
        toast.error("Keine Leads in dieser Kampagne");
        return;
      }

      // Check existing links
      const { data: existingLinks } = await supabase
        .from("contact_member_links")
        .select("contact_id")
        .eq("campaign_id", campaignId)
        .eq("user_id", userId);

      const existingContactIds = new Set((existingLinks || []).map(l => l.contact_id));
      const newContacts = contacts.filter(c => !existingContactIds.has(c.id));

      if (newContacts.length === 0) {
        toast.info("Alle Links wurden bereits generiert");
        return;
      }

      // Insert in batches of 100
      const batchSize = 100;
      let created = 0;
      for (let i = 0; i < newContacts.length; i += batchSize) {
        const batch = newContacts.slice(i, i + batchSize).map(c => ({
          contact_id: c.id,
          campaign_id: campaignId,
          user_id: userId,
        }));

        const { error } = await supabase.from("contact_member_links").insert(batch);
        if (error) throw error;
        created += batch.length;
      }

      toast.success(`${created} personalisierte Links für dieses Teammitglied generiert`);
      fetchMembers();
    } catch (err) {
      console.error("Error generating links:", err);
      toast.error("Fehler beim Generieren der Links");
    } finally {
      setGeneratingLinks(null);
    }
  };

  const existingMemberIds = new Set(members.map(m => m.user_id));
  const filteredAvailable = availableMembers.filter(m => !existingMemberIds.has(m.id));

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Lädt Team...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Add member */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Teammitglied zur Kampagne einladen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Teammitglied auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {filteredAvailable.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({m.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addMember} disabled={!selectedUserId || adding}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Einladen
            </Button>
          </div>
          {filteredAvailable.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Alle Teammitglieder sind bereits in dieser Kampagne.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Members list */}
      {members.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Noch keine Teammitglieder in dieser Kampagne</p>
          <p className="text-sm mt-1">Lade Teammitglieder ein, damit sie sich eigenständig mit den Leads vernetzen können.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {members.map(member => (
            <Card key={member.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      {member.profile?.avatar_url ? (
                        <img src={member.profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        (member.profile?.name || "?")[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{member.profile?.name || "Unbekannt"}</p>
                      <p className="text-sm text-muted-foreground">{member.profile?.email}</p>
                    </div>
                    <Badge variant="secondary" className="ml-2">{member.role}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateLinksForMember(member.user_id)}
                      disabled={generatingLinks === member.user_id}
                    >
                      {generatingLinks === member.user_id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <Copy className="w-4 h-4 mr-1" />
                      )}
                      Links generieren
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeMember(member.id, member.user_id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Stats */}
                {(member.linkCount || 0) > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Links</p>
                      <p className="text-lg font-bold">{member.linkCount}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Vernetzt</p>
                      <p className="text-lg font-bold">{member.connectedCount}</p>
                      <Progress 
                        value={((member.connectedCount || 0) / (member.linkCount || 1)) * 100} 
                        className="h-1 mt-1" 
                      />
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Nachricht gesendet</p>
                      <p className="text-lg font-bold">{member.messageSentCount}</p>
                      <Progress 
                        value={((member.messageSentCount || 0) / (member.linkCount || 1)) * 100} 
                        className="h-1 mt-1" 
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
