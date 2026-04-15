import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Props {
  tenantId: string;
  currentAdvisorId: string | null;
  onUpdate?: () => void;
}

interface Advisor {
  user_id: string;
  full_name: string | null;
}

export function AdvisorAssignment({ tenantId, currentAdvisorId, onUpdate }: Props) {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAdvisors();
  }, []);

  const loadAdvisors = async () => {
    // Get all users with advisor role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "advisor");

    if (!roles?.length) return;

    const userIds = roles.map(r => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    setAdvisors(profiles || []);
  };

  const handleAssign = async (advisorId: string) => {
    setLoading(true);
    const value = advisorId === "none" ? null : advisorId;
    const { error } = await supabase
      .from("tenants")
      .update({ advisor_id: value })
      .eq("id", tenantId);

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berater zugewiesen ✓" });
      onUpdate?.();
    }
    setLoading(false);
  };

  if (!advisors.length) {
    return <Badge variant="outline" className="text-xs text-muted-foreground">Keine Berater</Badge>;
  }

  return (
    <Select
      value={currentAdvisorId || "none"}
      onValueChange={handleAssign}
      disabled={loading}
    >
      <SelectTrigger className="w-[160px] h-8 text-xs">
        <SelectValue placeholder="Berater wählen" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Kein Berater</SelectItem>
        {advisors.map((a) => (
          <SelectItem key={a.user_id} value={a.user_id}>
            {a.full_name || a.user_id.slice(0, 8)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
