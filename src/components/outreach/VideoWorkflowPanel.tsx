import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  CheckCircle2, 
  Loader2, 
  Link,
  Users,
  Sparkles,
  ExternalLink,
  Copy
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VideoWorkflowPanelProps {
  campaignId: string;
  campaignName: string;
}

export const VideoWorkflowPanel = ({ campaignId, campaignName }: VideoWorkflowPanelProps) => {
  const queryClient = useQueryClient();
  const [videoUrl, setVideoUrl] = useState('');

  // Fetch campaign settings
  const { data: campaign } = useQuery({
    queryKey: ['campaign-settings', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('pitch_video_url')
        .eq('id', campaignId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch outbound lead count
  const { data: leadCount } = useQuery({
    queryKey: ['campaign-lead-count', campaignId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('lead_type', 'outbound');
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Update video URL
  const updateVideoUrl = useMutation({
    mutationFn: async (url: string) => {
      const { error } = await supabase
        .from('campaigns')
        .update({ pitch_video_url: url })
        .eq('id', campaignId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Erklärvideo URL gespeichert');
      queryClient.invalidateQueries({ queryKey: ['campaign-settings', campaignId] });
    },
    onError: () => {
      toast.error('Fehler beim Speichern');
    },
  });

  const apiEndpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-campaign-video`;

  const copyApiExample = () => {
    const example = JSON.stringify({
      campaign_id: campaignId,
      video_url: "https://example.com/erklaervideo.mp4"
    }, null, 2);
    navigator.clipboard.writeText(example);
    toast.success('API-Beispiel kopiert');
  };

  return (
    <div className="space-y-6">
      {/* Workflow Overview */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            KI-Erklärvideo
          </CardTitle>
          <CardDescription>
            Erklärvideo für die Kampagne „{campaignName}"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div className="flex items-center gap-3 p-4 rounded-lg border border-border/50 bg-background/50">
            {campaign?.pitch_video_url ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Erklärvideo ist aktiv</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[400px]">{campaign.pitch_video_url}</p>
                </div>
                <Badge className="bg-green-500/20 text-green-400">Aktiv</Badge>
              </>
            ) : (
              <>
                <Video className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Kein Erklärvideo hinterlegt</p>
                  <p className="text-xs text-muted-foreground">Hinterlege eine URL oder nutze den API-Endpunkt</p>
                </div>
                <Badge className="bg-muted text-muted-foreground">Ausstehend</Badge>
              </>
            )}
          </div>

          {/* Manual URL Input */}
          <div className="space-y-2">
            <Label>Erklärvideo URL</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/erklaervideo.mp4"
                value={videoUrl || campaign?.pitch_video_url || ''}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              <Button 
                onClick={() => updateVideoUrl.mutate(videoUrl)}
                disabled={updateVideoUrl.isPending || !videoUrl}
              >
                {updateVideoUrl.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Speichern'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              YouTube, Vimeo, Loom oder direkte MP4-URL
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{leadCount} Leads sehen dieses Video</span>
            </div>
            {campaign?.pitch_video_url && (
              <a 
                href={campaign.pitch_video_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Video ansehen
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* API Integration */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link className="h-4 w-4" />
            API für externen Workflow
          </CardTitle>
          <CardDescription>
            Nutze diesen Endpunkt um das Erklärvideo via Make.com, n8n oder eigenem Workflow zu setzen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Endpunkt (POST)</Label>
            <div className="flex gap-2">
              <Input 
                value={apiEndpoint}
                readOnly 
                className="font-mono text-xs"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(apiEndpoint);
                  toast.success('URL kopiert');
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Request Body (JSON)</Label>
            <div className="relative">
              <pre className="bg-background/80 border border-border/50 rounded-lg p-4 text-xs font-mono overflow-x-auto">
{`{
  "campaign_id": "${campaignId}",
  "video_url": "https://..."
}`}
              </pre>
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute top-2 right-2"
                onClick={copyApiExample}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Header</Label>
            <p className="text-xs font-mono text-muted-foreground">
              x-api-key: <span className="text-foreground">dein_api_key</span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              API-Keys kannst du unter <span className="text-primary">Einstellungen → API-Keys</span> erstellen.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
