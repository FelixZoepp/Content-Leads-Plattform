import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, PhoneOff, Mic, MicOff, AlertTriangle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { RealtimeChat } from '@/utils/RealtimeAudio';
import { supabase } from '@/integrations/supabase/client';
import AITrainerPanel from './AITrainerPanel';
import { useAITrainer } from '@/hooks/useAITrainer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

interface RealtimeCallProps {
  contactName: string;
  contactId?: string;
  dealId?: string;
  onCallEnd: () => void;
  systemPrompt?: string;
  leadContext?: string;
}

type MicrophoneStatus = 'checking' | 'available' | 'denied' | 'unavailable';

const RealtimeCall: React.FC<RealtimeCallProps> = ({ 
  contactName,
  contactId,
  dealId,
  onCallEnd,
  systemPrompt,
  leadContext = ''
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [microphoneStatus, setMicrophoneStatus] = useState<MicrophoneStatus>('checking');
  const chatRef = useRef<RealtimeChat | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const { canUseCallSummaries, canUseLiveObjectionHandling } = useFeatureAccess();

  // Check microphone availability on mount
  useEffect(() => {
    checkMicrophone();
  }, []);

  const checkMicrophone = async () => {
    try {
      // First check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicrophoneStatus('unavailable');
        return;
      }

      // Check permission state if available
      if (navigator.permissions) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (permissionStatus.state === 'denied') {
            setMicrophoneStatus('denied');
            return;
          }
        } catch {
          // Permission query not supported, continue with getUserMedia check
        }
      }

      // Try to get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop all tracks immediately - we just wanted to check access
      stream.getTracks().forEach(track => track.stop());
      setMicrophoneStatus('available');
    } catch (error: any) {
      console.error('Microphone check error:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setMicrophoneStatus('denied');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setMicrophoneStatus('unavailable');
      } else {
        setMicrophoneStatus('unavailable');
      }
    }
  };
  
  // AI Trainer integration
  const aiTrainer = useAITrainer({
    onObjectionDetected: (objection) => {
      console.log('Objection detected in call:', objection);
    }
  });

  const handleMessage = (event: any) => {
    console.log('Received message:', event.type);
    
    if (event.type === 'response.audio_transcript.delta') {
      setTranscript(prev => [...prev, `AI: ${event.delta}`]);
    } else if (event.type === 'conversation.item.input_audio_transcription.completed') {
      setTranscript(prev => [...prev, `Du: ${event.transcript}`]);
    } else if (event.type === 'error') {
      console.error('OpenAI error:', event);
      toast.error(`Fehler: ${event.error?.message || 'Unbekannter Fehler'}`);
    }
  };

  const handleError = (error: string) => {
    toast.error(error);
    endConversation();
  };

  const startConversation = async () => {
    try {
      setIsConnecting(true);
      const defaultPrompt = `Du führst ein professionelles Verkaufsgespräch mit ${contactName}. Sei freundlich, höre aufmerksam zu und stelle relevante Fragen, um den Bedarf zu verstehen.`;
      
      chatRef.current = new RealtimeChat(handleMessage, handleError);
      await chatRef.current.init(systemPrompt || defaultPrompt);
      
      // Start AI Trainer for objection detection
      const systemContext = systemPrompt || defaultPrompt;
      const contextInfo = leadContext || `Gespräch mit ${contactName}`;
      await aiTrainer.startTrainer(systemContext, contextInfo);
      
      setIsConnected(true);
      setIsConnecting(false);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      
      toast.success("Verbindung hergestellt");
    } catch (error) {
      console.error('Error starting conversation:', error);
      setIsConnecting(false);
      toast.error(error instanceof Error ? error.message : 'Fehler beim Verbinden');
    }
  };

  const endConversation = async () => {
    try {
      setIsSummarizing(true);
      
      // Stop AI Trainer
      aiTrainer.stopTrainer();
      
      // Get recording and transcript before disconnecting
      const recording = await chatRef.current?.getRecording();
      const fullTranscript = chatRef.current?.getTranscript() || '';
      
      let savedSessionId: string | null = null;
      
      if (recording && dealId) {
        savedSessionId = await saveRecording(recording);
      }
      
      chatRef.current?.disconnect();
      setIsConnected(false);
      setIsConnecting(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Generate summary if we have transcript and session
      if (fullTranscript && savedSessionId) {
        await generateSummary(savedSessionId, fullTranscript);
      }
      
      // Clear objections for next call
      aiTrainer.clearObjections();
      
      setIsSummarizing(false);
      onCallEnd();
    } catch (error) {
      console.error('Error ending conversation:', error);
      setIsSummarizing(false);
      toast.error('Fehler beim Beenden des Calls');
    }
  };

  const saveRecording = async (recording: Blob): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${user.id}/${dealId || 'unknown'}_${timestamp}.webm`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('call-recordings')
        .upload(fileName, recording, {
          contentType: 'audio/webm',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('call-recordings')
        .getPublicUrl(fileName);

      // Save to call_sessions
      if (dealId) {
        const { data: sessionData, error: sessionError } = await supabase
          .from('call_sessions')
          .insert({
            deal_id: dealId,
            user_id: user.id,
            recording_url: publicUrl,
            recording_duration_seconds: callDuration,
            started_at: new Date(Date.now() - callDuration * 1000).toISOString(),
            ended_at: new Date().toISOString(),
            duration_seconds: callDuration
          })
          .select('id')
          .single();

        if (sessionError) throw sessionError;
        
        // Create activity log entry for the call
        if (contactId) {
          await supabase
            .from('activities')
            .insert({
              contact_id: contactId,
              deal_id: dealId,
              user_id: user.id,
              type: 'call',
              outcome: 'reached',
              duration_min: Math.ceil(callDuration / 60),
              note: `WebRTC Call - ${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, '0')} Min.`
            });
        }
        
        toast.success('Call-Recording gespeichert');
        return sessionData?.id || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error saving recording:', error);
      toast.error('Fehler beim Speichern der Aufnahme');
      return null;
    }
  };

  const generateSummary = async (sessionId: string, transcript: string) => {
    // Check if user has access to call summaries
    if (!canUseCallSummaries) {
      console.log('Call summary feature requires Pro plan');
      toast.info('KI-Zusammenfassungen sind nur im Pro-Paket verfügbar');
      return;
    }

    try {
      console.log('Generating summary for session:', sessionId);
      toast.info('Generiere Call-Zusammenfassung...');
      
      const { data, error } = await supabase.functions.invoke('summarize-call', {
        body: { sessionId, transcript }
      });

      if (error) throw error;

      console.log('Summary generated:', data);
      toast.success('Call-Zusammenfassung erstellt');
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Fehler beim Generieren der Zusammenfassung');
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // TODO: Implement actual mute/unmute
    toast.info(isMuted ? "Mikrofon aktiviert" : "Mikrofon stummgeschaltet");
  };

  useEffect(() => {
    return () => {
      chatRef.current?.disconnect();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex gap-4 w-full">
      {/* Call Card */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>WebRTC Call: {contactName}</span>
            {isConnected && (
              <span className="text-sm font-normal text-muted-foreground">
                {formatDuration(callDuration)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Microphone Warning */}
          {microphoneStatus === 'denied' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Mikrofon-Zugriff wurde verweigert. Bitte erlaube den Zugriff in deinen Browser-Einstellungen und lade die Seite neu.
              </AlertDescription>
            </Alert>
          )}
          {microphoneStatus === 'unavailable' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Kein Mikrofon gefunden. Bitte schließe ein Mikrofon an und lade die Seite neu.
              </AlertDescription>
            </Alert>
          )}
          {microphoneStatus === 'checking' && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm">Mikrofon wird geprüft...</span>
            </div>
          )}

          {!isConnected && !isConnecting ? (
            <div className="text-center py-8">
              <Button 
                onClick={startConversation}
                size="lg"
                className="bg-success hover:bg-success/90"
                disabled={microphoneStatus !== 'available'}
              >
                <Phone className="mr-2 h-5 w-5" />
                Anruf starten
              </Button>
              {microphoneStatus === 'available' && (
                <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1">
                  <Mic className="h-3 w-3" /> Mikrofon bereit
                </p>
              )}
            </div>
          ) : isConnecting ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Verbinde...</p>
            </div>
          ) : (
            <>
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={toggleMute}
                  variant="outline"
                  size="lg"
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                <Button 
                  onClick={endConversation}
                  variant="destructive"
                  size="lg"
                  disabled={isSummarizing}
                >
                  <PhoneOff className="mr-2 h-5 w-5" />
                  {isSummarizing ? 'Speichert...' : 'Auflegen'}
                </Button>
              </div>

              {transcript.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <h4 className="text-sm font-semibold mb-2">Transkript:</h4>
                  <div className="space-y-1 text-sm">
                    {transcript.map((line, i) => (
                      <div key={i} className={line.startsWith('Du:') ? 'text-primary' : 'text-foreground'}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* AI Trainer Panel - Pro Feature */}
      <div className="w-80 min-h-[400px]">
        {canUseLiveObjectionHandling ? (
          <AITrainerPanel
            isActive={aiTrainer.isActive}
            status={aiTrainer.status}
            objections={aiTrainer.objections}
            error={aiTrainer.error}
          />
        ) : (
          <Card className="h-full border-dashed border-muted-foreground/30">
            <CardContent className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">KI-Einwandbehandlung</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Live-Einwandbehandlung ist nur im Pro-Paket verfügbar.
              </p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => window.open("https://buy.stripe.com/bJe3cv3p4fw68Mv9COgMw0b", "_blank")}
              >
                Auf Pro upgraden
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RealtimeCall;