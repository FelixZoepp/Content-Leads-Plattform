import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const ONLINE_THRESHOLD_MS = 30000; // 30 seconds - if viewed_at is within this, lead is "online"

interface OnlineLead {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  viewed_at: string;
  lead_score: number | null;
  phone: string | null;
  mobile: string | null;
}

export const useLeadOnlineStatus = () => {
  const [onlineLeads, setOnlineLeads] = useState<OnlineLead[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkOnlineLeads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("id", user.id)
        .single();

      if (!profile?.account_id) return;

      const threshold = new Date(Date.now() - ONLINE_THRESHOLD_MS).toISOString();

      const { data } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, company, viewed_at, lead_score, phone, mobile")
        .eq("account_id", profile.account_id)
        .eq("viewed", true)
        .gte("viewed_at", threshold)
        .order("viewed_at", { ascending: false })
        .limit(20);

      setOnlineLeads((data || []) as OnlineLead[]);
    } catch (err) {
      console.error("Error checking online leads:", err);
    }
  };

  useEffect(() => {
    checkOnlineLeads();
    // Check every 5 seconds
    intervalRef.current = setInterval(checkOnlineLeads, 5000);

    // Also listen for realtime updates on contacts.viewed_at
    const channel = supabase
      .channel("lead-online-status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "contacts" },
        (payload) => {
          const updated = payload.new as any;
          if (updated.viewed_at) {
            checkOnlineLeads();
          }
        }
      )
      .subscribe();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  return { onlineLeads, isAnyOnline: onlineLeads.length > 0 };
};
