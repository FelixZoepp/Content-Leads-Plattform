import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const HOT_LEAD_THRESHOLD = 70;

// Notification sound - short alert beep encoded as base64 data URI
const ALERT_SOUND_URL = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkZiYl5GKfnBibHmGjpOTj4d8cGJteoiRlpSQiHxwYm17iJGWlJCIfHBibXuIkZaUkIh8cGJte4iRlpSQiHxwYm17iJGWlJCIfA==";

interface HotLeadData {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  lead_score: number;
  campaign_id: string | null;
  account_id: string;
  phone: string | null;
  mobile: string | null;
  position: string | null;
}

interface UseHotLeadNotificationsOptions {
  onHotLeadCall?: (lead: HotLeadData) => void;
}

export const useHotLeadNotifications = (options?: UseHotLeadNotificationsOptions) => {
  const notifiedLeads = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Request browser notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    // Pre-load alert sound
    audioRef.current = new Audio(ALERT_SOUND_URL);
    audioRef.current.volume = 0.7;
  }, []);

  const playAlertSound = useCallback(() => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    } catch {}
  }, []);

  const showBrowserNotification = useCallback((lead: HotLeadData) => {
    if ("Notification" in window && Notification.permission === "granted") {
      const notification = new Notification(
        `🔥 Hot Lead: ${lead.first_name} ${lead.last_name}`,
        {
          body: `${lead.company || "Unbekannt"} - Score ${lead.lead_score}\n${lead.phone || lead.mobile || "Keine Nummer"}\nJetzt anrufen!`,
          icon: "/favicon.ico",
          tag: `hot-lead-${lead.id}`,
          requireInteraction: true,
        }
      );
      notification.onclick = () => {
        window.focus();
        if (options?.onHotLeadCall) {
          options.onHotLeadCall(lead);
        } else {
          window.location.href = "/pipeline";
        }
        notification.close();
      };
    }
  }, [options]);

  useEffect(() => {
    const channel = supabase
      .channel("hot-lead-notifications")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "contacts",
        },
        async (payload) => {
          const newLead = payload.new as HotLeadData;
          const oldLead = payload.old as { id: string; lead_score: number };

          const wasNotHot = (oldLead.lead_score || 0) < HOT_LEAD_THRESHOLD;
          const isNowHot = (newLead.lead_score || 0) >= HOT_LEAD_THRESHOLD;

          if (wasNotHot && isNowHot && !notifiedLeads.current.has(newLead.id)) {
            notifiedLeads.current.add(newLead.id);

            // 1. Play sound alert
            playAlertSound();

            // 2. Browser push notification (works even on other tabs)
            showBrowserNotification(newLead);

            // 3. Auto-create deal with campaign's assigned user
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;

              // Get default deal amount from account
              let dealAmount = 0;
              const { data: account } = await supabase
                .from('accounts')
                .select('default_deal_amount')
                .eq('id', newLead.account_id)
                .single();
              if (account?.default_deal_amount) {
                dealAmount = Number(account.default_deal_amount);
              }
              let setterId = user.id;
              if (newLead.campaign_id) {
                const { data: campaign } = await supabase
                  .from('campaigns')
                  .select('assigned_user_id')
                  .eq('id', newLead.campaign_id)
                  .single();
                if (campaign?.assigned_user_id) {
                  setterId = campaign.assigned_user_id;
                }
              }

              const { data: existingDeal } = await supabase
                .from('deals')
                .select('id')
                .eq('contact_id', newLead.id)
                .maybeSingle();

              if (!existingDeal) {
                await supabase.from('deals').insert({
                  contact_id: newLead.id,
                  title: `${newLead.first_name} ${newLead.last_name} - ${newLead.company || 'Hot Lead'}`,
                  stage: 'Heißer Lead - Anrufen' as any,
                  pipeline: 'cold',
                  amount_eur: dealAmount,
                  setter_id: setterId,
                  account_id: newLead.account_id,
                  next_action: 'Sofort anrufen!'
                });
              }
            } catch (error) {
              console.error('Error auto-creating deal:', error);
            }

            // 4. Webhook notification (Slack, Zapier, Make, etc.)
            try {
              const { data: { user: currentUser } } = await supabase.auth.getUser();
              if (currentUser) {
                const { data: integrations } = await supabase
                  .from('account_integrations')
                  .select('enrichment_webhook_url')
                  .eq('account_id', newLead.account_id)
                  .single();

                const webhookUrl = (integrations as any)?.enrichment_webhook_url;
                // Validate webhook URL - must be https, no localhost/internal IPs
                const isValidWebhook = (url: string) => {
                  try {
                    const u = new URL(url);
                    return u.protocol === 'https:' && !['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254'].includes(u.hostname);
                  } catch { return false; }
                };
                if (webhookUrl && isValidWebhook(webhookUrl)) {
                  fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      event: 'hot_lead_detected',
                      lead: {
                        name: `${newLead.first_name} ${newLead.last_name}`,
                        company: newLead.company,
                        score: newLead.lead_score,
                        phone: newLead.phone || newLead.mobile,
                      },
                      timestamp: new Date().toISOString(),
                    }),
                  }).catch(() => {});
                }
              }
            } catch {}

            // 5. In-app toast with "Sofort anrufen" button
            const phoneNumber = newLead.phone || newLead.mobile;
            toast.success(
              `🔥 Hot Lead: ${newLead.first_name} ${newLead.last_name}`,
              {
                description: `${newLead.company || "Unbekannt"} • Score ${newLead.lead_score}${phoneNumber ? ` • ${phoneNumber}` : ""}`,
                duration: 30000, // 30 seconds - important notification
                action: phoneNumber && options?.onHotLeadCall
                  ? {
                      label: "⚡ Sofort anrufen",
                      onClick: () => options.onHotLeadCall!(newLead),
                    }
                  : {
                      label: "Zur Pipeline",
                      onClick: () => { window.location.href = "/pipeline"; },
                    },
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playAlertSound, showBrowserNotification, options]);
};
