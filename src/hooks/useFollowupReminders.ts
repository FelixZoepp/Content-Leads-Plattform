import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OverdueContact {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  workflow_status: string;
  first_message_sent_at: string | null;
  fu1_sent_at: string | null;
  fu2_sent_at: string | null;
}

// FU1 after 3 days, FU2 after 4 days, FU3 after 7 days
const FU_DELAYS: Record<string, { field: string; days: number; label: string }> = {
  erstnachricht_gesendet: { field: "first_message_sent_at", days: 3, label: "Follow-up 1" },
  fu1_gesendet: { field: "fu1_sent_at", days: 4, label: "Follow-up 2" },
  fu2_gesendet: { field: "fu2_sent_at", days: 7, label: "Follow-up 3" },
};

export const useFollowupReminders = () => {
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    const checkReminders = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("account_id")
          .eq("id", user.id)
          .single();
        if (!profile?.account_id) return;

        // Fetch contacts with pending follow-ups
        const { data: contacts } = await supabase
          .from("contacts")
          .select("id, first_name, last_name, company, workflow_status, first_message_sent_at, fu1_sent_at, fu2_sent_at")
          .eq("account_id", profile.account_id)
          .eq("lead_type", "outbound")
          .in("workflow_status", ["erstnachricht_gesendet", "fu1_gesendet", "fu2_gesendet"])
          .eq("viewed", false);

        if (!contacts || contacts.length === 0) return;

        const now = Date.now();
        let overdueCount = 0;
        const overdueNames: string[] = [];

        for (const contact of contacts as OverdueContact[]) {
          const config = FU_DELAYS[contact.workflow_status];
          if (!config) continue;

          const sentAt = (contact as any)[config.field];
          if (!sentAt) continue;

          const dueAt = new Date(sentAt).getTime() + config.days * 24 * 60 * 60 * 1000;
          if (now >= dueAt) {
            overdueCount++;
            if (overdueNames.length < 3) {
              overdueNames.push(`${contact.first_name} ${contact.last_name} (${config.label})`);
            }
          }
        }

        if (overdueCount > 0) {
          const description = overdueNames.join(", ") + (overdueCount > 3 ? ` +${overdueCount - 3} weitere` : "");
          toast.warning(`${overdueCount} Follow-up${overdueCount > 1 ? "s" : ""} überfällig`, {
            description,
            duration: 15000,
            action: {
              label: "Zu Kampagnen",
              onClick: () => { window.location.href = "/campaigns"; },
            },
          });
        }
      } catch (err) {
        console.error("Error checking followup reminders:", err);
      }
    };

    // Check after 2 seconds (let app load first)
    setTimeout(checkReminders, 2000);
  }, []);
};
