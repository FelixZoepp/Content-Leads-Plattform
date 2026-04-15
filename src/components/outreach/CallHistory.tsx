import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Download, Clock, TrendingUp, TrendingDown, Minus, CheckSquare, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface CallSession {
  id: string;
  deal_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  recording_url: string | null;
  recording_duration_seconds: number | null;
  summary: string | null;
  key_points: string[] | null;
  action_items: string[] | null;
  sentiment: string | null;
}

interface CallHistoryProps {
  contactId?: string;
  dealId?: string;
}

const CallHistory: React.FC<CallHistoryProps> = ({ contactId, dealId }) => {
  const [sessions, setSessions] = useState<CallSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchCallHistory();
  }, [contactId, dealId]);

  const fetchCallHistory = async () => {
    try {
      let query = supabase
        .from('call_sessions')
        .select('*')
        .not('recording_url', 'is', null)
        .order('started_at', { ascending: false })
        .limit(10);

      if (dealId) {
        query = query.eq('deal_id', dealId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Generate signed URLs for private bucket
      const sessionsWithSignedUrls = await Promise.all(
        (data || []).map(async (session) => {
          if (session.recording_url) {
            // Extract path from URL - format: userId/dealId_timestamp.webm
            const urlParts = session.recording_url.split('/call-recordings/');
            if (urlParts[1]) {
              const path = urlParts[1];
              const { data: signedData } = await supabase.storage
                .from('call-recordings')
                .createSignedUrl(path, 3600); // 1 hour expiry
              
              if (signedData?.signedUrl) {
                return { ...session, recording_url: signedData.signedUrl };
              }
            }
          }
          return session;
        })
      );
      
      setSessions(sessionsWithSignedUrls);
    } catch (error) {
      console.error('Error fetching call history:', error);
      toast.error('Fehler beim Laden der Call-History');
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = (session: CallSession) => {
    if (!session.recording_url) return;

    if (playingId === session.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = session.recording_url;
        audioRef.current.play();
        setPlayingId(session.id);
      }
    }
  };

  const downloadRecording = async (session: CallSession) => {
    if (!session.recording_url) return;

    try {
      const response = await fetch(session.recording_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `call_${session.id}_${format(new Date(session.started_at), 'yyyy-MM-dd_HH-mm')}.webm`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download gestartet');
    } catch (error) {
      console.error('Error downloading recording:', error);
      toast.error('Fehler beim Download');
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSentimentIcon = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      case 'neutral':
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSentimentLabel = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive':
        return 'Positiv';
      case 'negative':
        return 'Negativ';
      case 'neutral':
      default:
        return 'Neutral';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Call-Aufnahmen</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Keine Aufnahmen vorhanden
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Call-Aufnahmen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <audio
          ref={audioRef}
          onEnded={() => setPlayingId(null)}
          className="hidden"
        />
        
        {sessions.map((session) => (
          <div
            key={session.id}
            className="border rounded-lg overflow-hidden"
          >
            <div className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(session.started_at), 'dd. MMM yyyy, HH:mm', { locale: de })}
                  </span>
                  {session.sentiment && (
                    <Badge variant="outline" className="ml-2 gap-1">
                      {getSentimentIcon(session.sentiment)}
                      {getSentimentLabel(session.sentiment)}
                    </Badge>
                  )}
                </div>
                {session.recording_duration_seconds && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Dauer: {formatDuration(session.recording_duration_seconds)}
                  </p>
                )}
              </div>
              
              <div className="flex gap-2">
                {session.summary && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => togglePlay(session)}
                >
                  {playingId === session.id ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadRecording(session)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Summary Section */}
            {expandedId === session.id && session.summary && (
              <div className="border-t p-4 bg-muted/30 space-y-3">
                <div>
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Zusammenfassung
                  </h4>
                  <p className="text-sm text-muted-foreground">{session.summary}</p>
                </div>

                {session.key_points && session.key_points.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Hauptpunkte:</h4>
                    <ul className="space-y-1">
                      {session.key_points.map((point, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {session.action_items && session.action_items.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" />
                      Handlungsschritte:
                    </h4>
                    <ul className="space-y-1">
                      {session.action_items.map((item, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <CheckSquare className="h-3 w-3 mt-1 text-muted-foreground" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default CallHistory;