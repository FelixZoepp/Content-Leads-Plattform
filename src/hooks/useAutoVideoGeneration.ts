import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseAutoVideoGenerationOptions {
  campaignId: string;
  enabled?: boolean;
  pollInterval?: number; // in milliseconds
}

export function useAutoVideoGeneration({ 
  campaignId, 
  enabled = true,
  pollInterval = 30000 // Default: check every 30 seconds
}: UseAutoVideoGenerationOptions) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProcessingRef = useRef(false);

  const processPendingVideos = useCallback(async () => {
    if (isProcessingRef.current) return;
    
    try {
      isProcessingRef.current = true;

      // Check if there are any pending_auto videos
      const { data: pendingCount } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('video_status', 'pending_auto');

      if (!pendingCount || pendingCount.length === 0) {
        return;
      }

      console.log('Processing pending auto videos...');

      // Call the edge function to process pending videos
      const { data, error } = await supabase.functions.invoke('process-pending-videos', {
        body: { campaignId }
      });

      if (error) {
        console.error('Error processing pending videos:', error);
        return;
      }

      if (data?.processed > 0) {
        toast.success(`${data.processed} Video(s) werden generiert`, {
          description: 'Die Videos werden automatisch erstellt.'
        });
      }

    } catch (error) {
      console.error('Auto video generation error:', error);
    } finally {
      isProcessingRef.current = false;
    }
  }, [campaignId]);

  // Set up polling
  useEffect(() => {
    if (!enabled || !campaignId) return;

    // Process immediately on mount
    processPendingVideos();

    // Set up interval
    intervalRef.current = setInterval(processPendingVideos, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, campaignId, pollInterval, processPendingVideos]);

  // Listen for realtime updates when workflow_status changes
  useEffect(() => {
    if (!enabled || !campaignId) return;

    const channel = supabase
      .channel(`video-auto-gen-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contacts',
          filter: `campaign_id=eq.${campaignId}`
        },
        (payload) => {
          const newRecord = payload.new as { video_status?: string };
          // If a contact just got pending_auto status, process immediately
          if (newRecord.video_status === 'pending_auto') {
            processPendingVideos();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, campaignId, processPendingVideos]);

  return {
    processPendingVideos
  };
}
