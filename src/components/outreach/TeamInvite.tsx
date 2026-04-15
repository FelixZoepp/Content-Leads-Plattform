import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Mail, Loader2, Trash2, Shield } from "lucide-react";

interface TeamMember {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  is_super_admin: boolean;
  created_at: string;
}

export default function TeamInvite() {
  const { session } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("setter");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      loadTeam();
    }
  }, [session?.user?.id]);

  const loadTeam = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id, role, is_super_admin")
        .eq("id", session!.user.id)
        .single();

      if (!profile?.account_id) return;
      setIsAdmin(profile.role === "admin" || profile.is_super_admin === true);

      const { data: teamMembers } = await supabase
        .from("profiles")
        .select("id, name, email, role, is_super_admin, created_at")
        .eq("account_id", profile.account_id)
        .order("created_at", { ascending: true });

      setMembers((teamMembers || []) as TeamMember[]);
    } catch (err) {
      console.error("Error loading team:", err);
    } finally {
      setLoading(false);
    }
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim() || !inviteName.trim()) {
      toast.error("Email und Name sind erforderlich");
      return;
    }

    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-team-member", {
        body: {
          email: inviteEmail.trim(),
          name: inviteName.trim(),
          role: inviteRole,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(data?.message || "Einladung gesendet!");

      // Open Stripe Checkout for team slot (50€/month)
      try {
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke("create-team-slot-checkout", {
          body: {
            origin: window.location.origin,
            invitedEmail: inviteEmail.trim(),
          },
        });
        if (!checkoutError && checkoutData?.url) {
          window.location.href = checkoutData.url;
          return; // Redirect to Stripe
        }
      } catch (checkoutErr) {
        console.error("Checkout error:", checkoutErr);
        // Non-blocking: invite still succeeded even if checkout fails
      }

      setInviteEmail("");
      setInviteName("");
      setInviteRole("setter");
      loadTeam();
    } catch (err: any) {
      console.error("Invite error:", err);
      toast.error(err.message || "Fehler beim Einladen");
    } finally {
      setInviting(false);
    }
  };

  const removeMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Möchtest du ${memberName} wirklich aus dem Team entfernen?`)) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ account_id: null })
        .eq("id", memberId);
      if (error) throw error;
      toast.success(`${memberName} wurde aus dem Team entfernt`);
      loadTeam();
    } catch (err: any) {
      console.error("Remove member error:", err);
      toast.error(err.message || "Fehler beim Entfernen");
    }
  };

  const getRoleBadge = (role: string | null, isSuperAdmin: boolean) => {
    if (isSuperAdmin) return <Badge className="bg-purple-600">Super Admin</Badge>;
    switch (role) {
      case "admin": return <Badge className="bg-blue-600">Admin</Badge>;
      case "closer": return <Badge variant="secondary">Closer</Badge>;
      default: return <Badge variant="outline">Setter</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Team ({members.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Members List */}
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {(member.name || member.email || "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{member.name || "Unbenannt"}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getRoleBadge(member.role, member.is_super_admin)}
                {member.id === session?.user?.id && (
                  <Badge variant="outline" className="text-[10px]">Du</Badge>
                )}
                {isAdmin && member.id !== session?.user?.id && !member.is_super_admin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeMember(member.id, member.name || "Unbenannt")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Invite Form (only for admins) */}
        {isAdmin && (
          <div className="border-t pt-4">
            <h4 className="font-medium text-sm flex items-center gap-2 mb-4">
              <UserPlus className="w-4 h-4" />
              Teammitglied einladen
            </h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    placeholder="Max Mustermann"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">E-Mail</Label>
                  <Input
                    type="email"
                    placeholder="max@firma.de"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Label className="text-xs">Rolle</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="setter">Setter</SelectItem>
                      <SelectItem value="closer">Closer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={inviteMember} disabled={inviting || !inviteEmail.trim() || !inviteName.trim()}>
                  {inviting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  Einladen
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Das Teammitglied erhält Zugang zur Software unter deinem Account. Alle Daten (Leads, Kampagnen, Tracking) werden geteilt.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
