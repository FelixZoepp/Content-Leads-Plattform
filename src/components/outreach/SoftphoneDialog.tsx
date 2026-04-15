import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, User, Clock, AlertCircle, Loader2, Circle, FileText, Brain, ScrollText, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TwilioClient, TwilioClientCallbacks } from "@/lib/twilioClient";
import { SipClient, SipClientConfig, SipClientCallbacks } from "@/lib/sipClient";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useAITrainer } from "@/hooks/useAITrainer";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SoftphoneDialogProps {
  open: boolean;
  onClose: () => void;
  phoneNumber: string;
  contactName: string;
  contactId?: string;
  dealId?: string;
}

interface LeadData {
  first_name: string;
  last_name: string;
  company: string | null;
  position: string | null;
  email: string | null;
  industry: string | null;
  city: string | null;
}

type CallStatus = 'idle' | 'connecting' | 'registering' | 'dialing' | 'ringing' | 'connected' | 'ended' | 'error';
type ProcessingStatus = 'idle' | 'uploading' | 'transcribing' | 'summarizing' | 'done' | 'error';

interface SipSettings {
  sip_provider: string | null;
  sip_server: string | null;
  sip_domain: string | null;
  sip_username: string | null;
  sip_password_encrypted: string | null;
  sip_display_name: string | null;
  sip_enabled: boolean;
}

interface CallSummary {
  summary: string;
  key_points: string[];
  action_items: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export default function SoftphoneDialog({
  open,
  onClose,
  phoneNumber,
  contactName,
  contactId,
  dealId
}: SoftphoneDialogProps) {
  const { canUseCallSummaries, canUseLiveObjectionHandling } = useFeatureAccess();
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sipSettings, setSipSettings] = useState<SipSettings | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle');
  const [callSummary, setCallSummary] = useState<CallSummary | null>(null);
  const [callSessionId, setCallSessionId] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [useTwilio, setUseTwilio] = useState(false);
  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [callScript, setCallScript] = useState<string>("");
  const [systemContext, setSystemContext] = useState<string>("");
  const [showScript, setShowScript] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [engagementEvents, setEngagementEvents] = useState<any[]>([]);
  const [showEngagement, setShowEngagement] = useState(true);
  const [callNote, setCallNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // AI Trainer for live objection handling
  const aiTrainer = useAITrainer();

  const twilioClientRef = useRef<TwilioClient | null>(null);
  const sipClientRef = useRef<SipClient | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callStartTimeRef = useRef<Date | null>(null);
  
  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Load SIP settings + lead data + call script
  useEffect(() => {
    if (open) {
      loadSipSettings();
      loadLeadAndScript();
    }
  }, [open, contactId]);

  // Start/stop AI trainer when call connects/ends
  useEffect(() => {
    if (callStatus === 'connected' && canUseLiveObjectionHandling && !aiTrainer.isActive) {
      const leadCtx = leadData
        ? `Lead: ${leadData.first_name} ${leadData.last_name}, Firma: ${leadData.company || 'unbekannt'}, Position: ${leadData.position || 'unbekannt'}, Branche: ${leadData.industry || 'unbekannt'}, Stadt: ${leadData.city || 'unbekannt'}`
        : `Lead: ${contactName}`;
      aiTrainer.startTrainer(systemContext || 'Du bist ein Sales-Coach. Erkenne Einwände und gib konkrete Antwortvorschläge auf Deutsch.', leadCtx);
    }
    if ((callStatus === 'ended' || callStatus === 'error') && aiTrainer.isActive) {
      aiTrainer.stopTrainer();
    }
  }, [callStatus]);

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      cleanup();
      if (aiTrainer.isActive) aiTrainer.stopTrainer();
    };
  }, []);

  const loadLeadAndScript = async () => {
    try {
      // Load lead data
      if (contactId) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('first_name, last_name, company, position, email, city')
          .eq('id', contactId)
          .single();
        if (contact) setLeadData({ ...contact, industry: null } as LeadData);

        // Load engagement events for this contact
        const { data: events } = await supabase
          .from('lead_tracking_events')
          .select('event_type, event_data, created_at')
          .eq('contact_id', contactId)
          .order('created_at', { ascending: false })
          .limit(15);
        if (events) setEngagementEvents(events);
      }

      // Load active call script
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('account_id').eq('id', user.id).single();
      if (!profile?.account_id) return;

      const { data: script } = await supabase
        .from('call_scripts')
        .select('content, system_context')
        .eq('account_id', profile.account_id)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (script) {
        setSystemContext(script.system_context || '');
        // Personalize script with lead data
        let personalizedScript = script.content || '';
        const ld = leadData;
        const userName = user.user_metadata?.full_name || user.email || '';
        personalizedScript = personalizedScript
          .replace(/\{\{first_name\}\}/gi, ld?.first_name || contactName.split(' ')[0] || '')
          .replace(/\{\{last_name\}\}/gi, ld?.last_name || contactName.split(' ').slice(1).join(' ') || '')
          .replace(/\{\{company_name\}\}/gi, ld?.company || '')
          .replace(/\{\{company\}\}/gi, ld?.company || '')
          .replace(/\{\{position\}\}/gi, ld?.position || '')
          .replace(/\{\{industry\}\}/gi, ld?.industry || '')
          .replace(/\{\{city\}\}/gi, ld?.city || '')
          .replace(/\{\{user_name\}\}/gi, userName)
          .replace(/\{\{phone\}\}/gi, phoneNumber || '');
        setCallScript(personalizedScript);
      }
    } catch (err) {
      console.error('Error loading lead/script:', err);
    }
  };

  // Re-personalize script when leadData loads
  useEffect(() => {
    if (leadData && callScript) {
      loadLeadAndScript();
    }
  }, [leadData?.first_name]);

  // Start call when dialog opens and settings are loaded
  useEffect(() => {
    if (open && sipSettings && callStatus === 'idle') {
      startCall();
    }
  }, [open, sipSettings]);

  const loadSipSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

      if (!profile?.account_id) throw new Error("Kein Account gefunden");

      const { data, error } = await supabase
        .from('account_integrations')
        .select('sip_provider, sip_server, sip_domain, sip_username, sip_password_encrypted, sip_display_name, sip_enabled')
        .eq('account_id', profile.account_id)
        .maybeSingle();

      if (error) throw error;

      // Check if Twilio is configured (provider is twilio or secrets exist)
      if (data?.sip_provider === 'twilio') {
        setUseTwilio(true);
        setSipSettings(data as SipSettings);
        return;
      }

      if (!data || !data.sip_enabled) {
        // Try Twilio by default if no SIP settings
        setUseTwilio(true);
        setSipSettings({ sip_enabled: true, sip_provider: 'twilio' } as SipSettings);
        return;
      }

      if (!data.sip_server || !data.sip_username || !data.sip_password_encrypted) {
        setErrorMessage("SIP-Zugangsdaten unvollständig. Bitte konfiguriere deine SIP-Einstellungen.");
        setCallStatus('error');
        return;
      }

      setSipSettings(data as SipSettings);
    } catch (error: any) {
      console.error('Error loading SIP settings:', error);
      const errorMessage = error?.message || (typeof error === 'string' ? error : 'Fehler beim Laden der SIP-Einstellungen');
      setErrorMessage(errorMessage);
      setCallStatus('error');
    }
  };

  const cleanup = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (twilioClientRef.current) {
      twilioClientRef.current.disconnect();
      twilioClientRef.current = null;
    }
    if (sipClientRef.current) {
      sipClientRef.current.disconnect();
      sipClientRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
    stopRecording();
  }, []);

  const startRecording = (localStream: MediaStream, remoteStream: MediaStream) => {
    try {
      console.log('Starting call recording...');
      
      // Create AudioContext to mix both streams
      audioContextRef.current = new AudioContext();
      destinationRef.current = audioContextRef.current.createMediaStreamDestination();
      
      // Connect local audio (microphone)
      const localSource = audioContextRef.current.createMediaStreamSource(localStream);
      localSource.connect(destinationRef.current);
      
      // Connect remote audio
      const remoteSource = audioContextRef.current.createMediaStreamSource(remoteStream);
      remoteSource.connect(destinationRef.current);
      
      // Create MediaRecorder for mixed stream
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      mediaRecorderRef.current = new MediaRecorder(destinationRef.current.stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });
      
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        console.log('Recording stopped, chunks:', audioChunksRef.current.length);
      };
      
      mediaRecorderRef.current.start(1000); // Collect data every second
      setIsRecording(true);
      console.log('Recording started with mimeType:', mimeType);
      
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsRecording(false);
  };

  const processRecording = async (sessionId: string) => {
    if (audioChunksRef.current.length === 0) {
      console.log('No audio chunks to process');
      return;
    }

    try {
      // Create blob from chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
      console.log('Audio blob size:', audioBlob.size, 'bytes');
      
      if (audioBlob.size < 1000) {
        console.log('Recording too short, skipping processing');
        return;
      }

      // Step 1: Upload to Supabase Storage
      setProcessingStatus('uploading');
      toast.info('Aufnahme wird hochgeladen...');
      
      const fileName = `call_${sessionId}_${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('call-recordings')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: false
        });

      if (uploadError) {
        // Storage bucket might not exist, log but continue with transcription
        console.error('Upload error (storage might not be configured):', uploadError);
      } else {
        // Get public URL and update session
        const { data: urlData } = supabase.storage
          .from('call-recordings')
          .getPublicUrl(fileName);
        
        await supabase
          .from('call_sessions')
          .update({ 
            recording_url: urlData.publicUrl,
            recording_duration_seconds: callDuration
          })
          .eq('id', sessionId);
      }

      // Step 2: Transcribe audio
      setProcessingStatus('transcribing');
      toast.info('Transkribiere Aufnahme...');
      
      // Convert blob to base64
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: base64Audio, mimeType: 'audio/webm;codecs=opus' }
      });

      if (transcriptError || transcriptData?.error) {
        throw new Error(transcriptData?.error || transcriptError?.message || 'Transkription fehlgeschlagen');
      }

      const transcript = transcriptData.text;
      console.log('Transcript:', transcript?.substring(0, 100) + '...');

      if (!transcript || transcript.length < 10) {
        console.log('Transcript too short, skipping summary');
        setProcessingStatus('done');
        return;
      }

      // Step 3: Generate AI summary (only for Pro users)
      if (canUseCallSummaries) {
        setProcessingStatus('summarizing');
        toast.info('Generiere KI-Zusammenfassung...');

        const { data: summaryData, error: summaryError } = await supabase.functions.invoke('summarize-call', {
          body: { sessionId, transcript }
        });

        if (summaryError || summaryData?.error) {
          console.error('Summary error:', summaryData?.error || summaryError);
          // Don't throw, just log - summary is optional
        } else {
          setCallSummary(summaryData);
        }
      } else {
        console.log('Call summary feature requires Pro plan');
        toast.info('KI-Zusammenfassungen sind nur im Pro-Paket verfügbar');
      }

      setProcessingStatus('done');
      toast.success('Anruf verarbeitet! Transkript und Zusammenfassung gespeichert.');

    } catch (error: any) {
      console.error('Error processing recording:', error);
      setProcessingStatus('error');
      const errorMessage = error?.message || (typeof error === 'string' ? error : 'Unbekannter Fehler');
      toast.error(`Verarbeitung fehlgeschlagen: ${errorMessage}`);
    }
  };

  const startCall = async () => {
    if (!sipSettings) return;

    setCallStatus('connecting');
    setErrorMessage(null);
    setProcessingStatus('idle');
    setCallSummary(null);

    try {
      let localStreamForRecording: MediaStream | null = null;

      // Use Twilio if configured
      if (useTwilio) {
        console.log('Starting Twilio call...');
        
        const twilioCallbacks: TwilioClientCallbacks = {
          onReady: () => {
            console.log('Twilio ready - starting call');
            setCallStatus('dialing');
            twilioClientRef.current?.call(phoneNumber);
          },
          onError: (error) => {
            console.error('Twilio error:', error);
            setErrorMessage(`Twilio-Fehler: ${error}`);
            setCallStatus('error');
          },
          onIncoming: (from) => {
            console.log('Incoming call from:', from);
          },
          onCallConnecting: () => {
            console.log('Twilio call connecting...');
            setCallStatus('ringing');
          },
          onCallConnected: () => {
            console.log('Twilio call connected!');
            setCallStatus('connected');
            callStartTimeRef.current = new Date();
            startCallTimer();
            logCallStart();
          },
          onCallEnded: async (reason) => {
            console.log('Twilio call ended:', reason);
            setCallStatus('ended');
            stopCallTimer();
            stopRecording();
            
            if (callSessionId) {
              await processRecording(callSessionId);
            }
          },
          onCallFailed: (error) => {
            console.error('Twilio call failed:', error);
            setErrorMessage(`Anruf fehlgeschlagen: ${error}`);
            setCallStatus('error');
            stopRecording();
          },
          onRemoteAudio: (stream) => {
            console.log('Twilio remote audio received');
            setRemoteStream(stream);
            if (audioRef.current) {
              audioRef.current.srcObject = stream;
              audioRef.current.play().catch(console.error);
            }
            
            if (localStreamForRecording) {
              startRecording(localStreamForRecording, stream);
            }
          },
          onLocalAudio: (stream) => {
            console.log('Twilio local audio captured');
            localStreamForRecording = stream;
          }
        };

        twilioClientRef.current = new TwilioClient(twilioCallbacks);
        
        setCallStatus('registering');
        await twilioClientRef.current.connect();
        
      } else {
        // Use SIP client for other providers
        console.log('Starting SIP call...');
        const password = atob(sipSettings.sip_password_encrypted || '');

        const config: SipClientConfig = {
          sipServer: sipSettings.sip_server!,
          login: sipSettings.sip_username!,
          password: password,
          domain: sipSettings.sip_domain || sipSettings.sip_server!.replace('wss://', '').split('/')[0],
          displayName: sipSettings.sip_display_name || undefined
        };

        const callbacks: SipClientCallbacks = {
          onRegistered: () => {
            console.log('SIP Registered - starting call');
            setCallStatus('dialing');
            sipClientRef.current?.call(phoneNumber);
          },
          onUnregistered: () => {
            console.log('SIP Unregistered');
          },
          onRegistrationFailed: (error) => {
            console.error('Registration failed:', error);
            setErrorMessage(`Registrierung fehlgeschlagen: ${error}`);
            setCallStatus('error');
          },
          onCallConnecting: () => {
            console.log('Call connecting...');
            setCallStatus('ringing');
          },
          onCallConnected: () => {
            console.log('Call connected!');
            setCallStatus('connected');
            callStartTimeRef.current = new Date();
            startCallTimer();
            logCallStart();
          },
          onCallEnded: async (reason) => {
            console.log('Call ended:', reason);
            setCallStatus('ended');
            stopCallTimer();
            stopRecording();
            
            if (callSessionId) {
              await processRecording(callSessionId);
            }
          },
          onCallFailed: (error) => {
            console.error('Call failed:', error);
            setErrorMessage(`Anruf fehlgeschlagen: ${error}`);
            setCallStatus('error');
            stopRecording();
          },
          onRemoteAudio: (stream) => {
            console.log('Remote audio received');
            setRemoteStream(stream);
            if (audioRef.current) {
              audioRef.current.srcObject = stream;
              audioRef.current.play().catch(console.error);
            }
            
            if (localStreamForRecording) {
              startRecording(localStreamForRecording, stream);
            }
          },
          onLocalAudio: (stream) => {
            console.log('Local audio captured');
            localStreamForRecording = stream;
          }
        };

        sipClientRef.current = new SipClient(config, callbacks);
        
        setCallStatus('registering');
        await sipClientRef.current.connect();
      }
      
    } catch (error: any) {
      console.error('Call start error:', error);
      const errorMessage = error?.message || (typeof error === 'string' ? error : 'Fehler beim Starten des Anrufs');
      setErrorMessage(errorMessage);
      setCallStatus('error');
    }
  };

  const startCallTimer = () => {
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  const logCallStart = async () => {
    if (!dealId) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

      const { data, error } = await supabase.from('call_sessions').insert({
        deal_id: dealId,
        user_id: user.id,
        account_id: profile?.account_id,
        started_at: new Date().toISOString()
      }).select('id').single();

      if (error) throw error;
      
      setCallSessionId(data.id);
      console.log('Call session created:', data.id);
    } catch (error) {
      console.error('Error logging call start:', error);
    }
  };

  const handleHangup = async () => {
    if (twilioClientRef.current) {
      await twilioClientRef.current.hangup();
    }
    if (sipClientRef.current) {
      await sipClientRef.current.hangup();
    }
    
    // Update call session with end time
    if (callSessionId) {
      await supabase
        .from('call_sessions')
        .update({ 
          ended_at: new Date().toISOString(),
          duration_seconds: callDuration
        })
        .eq('id', callSessionId);
    }
    
    cleanup();
    setCallStatus('ended');
    toast.info(`Anruf beendet (${formatDuration(callDuration)})`);
  };

  const handleClose = () => {
    if (callStatus === 'connected' || callStatus === 'ringing' || callStatus === 'dialing') {
      handleHangup();
    }
    cleanup();
    setCallStatus('idle');
    setCallDuration(0);
    setErrorMessage(null);
    setSipSettings(null);
    setProcessingStatus('idle');
    setCallSummary(null);
    setCallSessionId(null);
    onClose();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast.info(isMuted ? "Mikrofon aktiviert" : "Mikrofon stumm");
  };

  const toggleSpeaker = () => {
    if (audioRef.current) {
      audioRef.current.muted = isSpeakerOn;
    }
    setIsSpeakerOn(!isSpeakerOn);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = (): string => {
    switch (callStatus) {
      case 'idle': return 'Bereit';
      case 'connecting': return 'Verbinde...';
      case 'registering': return 'Registriere...';
      case 'dialing': return 'Wähle...';
      case 'ringing': return 'Klingelt...';
      case 'connected': return 'Verbunden';
      case 'ended': return 'Beendet';
      case 'error': return 'Fehler';
      default: return '';
    }
  };

  const getStatusColor = (): string => {
    switch (callStatus) {
      case 'connected': return 'bg-green-500';
      case 'ringing':
      case 'dialing': return 'bg-yellow-500 animate-pulse';
      case 'error': return 'bg-red-500';
      case 'ended': return 'bg-muted';
      default: return 'bg-blue-500';
    }
  };

  const getProcessingProgress = (): number => {
    switch (processingStatus) {
      case 'uploading': return 25;
      case 'transcribing': return 50;
      case 'summarizing': return 75;
      case 'done': return 100;
      default: return 0;
    }
  };

  const getSentimentEmoji = (sentiment: string): string => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😞';
      default: return '😐';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            Softphone
            {isRecording && (
              <Badge variant="destructive" className="animate-pulse ml-2">
                <Circle className="w-2 h-2 mr-1 fill-current" />
                REC
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Hidden audio element for remote audio */}
        <audio ref={audioRef} autoPlay />

        <div className="space-y-6 py-4">
          {/* Contact Info */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">{contactName}</h3>
            <p className="text-muted-foreground font-mono">{phoneNumber}</p>
          </div>

          {/* Status */}
          <div className="flex justify-center items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
            <span className="text-sm font-medium">{getStatusText()}</span>
            {callStatus === 'connected' && (
              <Badge variant="secondary" className="font-mono">
                <Clock className="w-3 h-3 mr-1" />
                {formatDuration(callDuration)}
              </Badge>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Loading States */}
          {(callStatus === 'connecting' || callStatus === 'registering' || callStatus === 'dialing') && (
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Call Controls */}
          {callStatus === 'connected' && (
            <div className="flex justify-center gap-4">
              <Button
                variant={isMuted ? "destructive" : "outline"}
                size="icon"
                className="w-12 h-12 rounded-full"
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              <Button
                variant={!isSpeakerOn ? "destructive" : "outline"}
                size="icon"
                className="w-12 h-12 rounded-full"
                onClick={toggleSpeaker}
              >
                {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>
            </div>
          )}

          {/* Engagement Timeline - what the lead did on the landing page */}
          {engagementEvents.length > 0 && (callStatus === 'connected' || callStatus === 'ringing' || callStatus === 'dialing') && (
            <div className="rounded-lg border border-amber-500/20 overflow-hidden">
              <div
                className="flex items-center justify-between px-3 py-2 bg-amber-500/5 cursor-pointer"
                onClick={() => setShowEngagement(!showEngagement)}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">Lead-Aktivität</span>
                  <Badge variant="outline" className="text-[10px]">{engagementEvents.length}</Badge>
                </div>
                {showEngagement ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
              {showEngagement && (
                <ScrollArea className="max-h-32">
                  <div className="p-2 space-y-1">
                    {engagementEvents.map((evt, i) => {
                      const typeLabels: Record<string, string> = {
                        page_view: "📄 Seite angesehen",
                        video_play: "▶️ Video gestartet",
                        video_progress: "🎬 Video geschaut",
                        video_complete: "✅ Video komplett",
                        cta_click: "🔘 CTA geklickt",
                        button_click: "👆 Button geklickt",
                        booking_click: "📅 Termin-Link geklickt",
                        form_submit: "📝 Formular abgesendet",
                        scroll_depth: "📜 Gescrollt",
                      };
                      const timeAgo = Math.round((Date.now() - new Date(evt.created_at).getTime()) / 60000);
                      const timeStr = timeAgo < 1 ? "gerade eben" : timeAgo < 60 ? `vor ${timeAgo} Min` : `vor ${Math.round(timeAgo / 60)} Std`;
                      return (
                        <div key={i} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/30">
                          <span>{typeLabels[evt.event_type] || evt.event_type}</span>
                          <span className="text-muted-foreground">{timeStr}</span>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {/* Personalized Call Script */}
          {callScript && (callStatus === 'connected' || callStatus === 'ringing' || callStatus === 'dialing') && (
            <div className="rounded-lg border border-border overflow-hidden">
              <div
                className="flex items-center justify-between px-3 py-2 bg-muted/50 cursor-pointer"
                onClick={() => setShowScript(!showScript)}
              >
                <div className="flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Gesprächsleitfaden</span>
                  {leadData && (
                    <Badge variant="outline" className="text-[10px]">
                      {leadData.first_name} {leadData.last_name}
                    </Badge>
                  )}
                </div>
                {showScript ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
              {showScript && (
                <ScrollArea className="max-h-48">
                  <div className="p-3 text-sm whitespace-pre-wrap leading-relaxed">
                    {callScript}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {/* Live AI Objection Handling */}
          {canUseLiveObjectionHandling && (callStatus === 'connected' || aiTrainer.objections.length > 0) && (
            <div className="rounded-lg border border-primary/20 overflow-hidden">
              <div
                className="flex items-center justify-between px-3 py-2 bg-primary/5 cursor-pointer"
                onClick={() => setShowAIPanel(!showAIPanel)}
              >
                <div className="flex items-center gap-2">
                  <Brain className={`w-4 h-4 ${aiTrainer.isActive ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
                  <span className="text-sm font-medium">KI-Einwandbehandlung</span>
                  {aiTrainer.objections.length > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      {aiTrainer.objections.length}
                    </Badge>
                  )}
                  <span className={`text-[10px] ${aiTrainer.status === 'listening' ? 'text-green-500' : aiTrainer.status === 'analyzing' ? 'text-purple-500' : 'text-muted-foreground'}`}>
                    {aiTrainer.status === 'listening' ? '● Hört zu' : aiTrainer.status === 'analyzing' ? '● Analysiert' : aiTrainer.status === 'transcribing' ? '● Transkribiert' : aiTrainer.status === 'connecting' ? '● Verbinde...' : ''}
                  </span>
                </div>
                {showAIPanel ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
              {showAIPanel && (
                <div className="p-3">
                  {aiTrainer.error && (
                    <div className="mb-2 p-2 bg-destructive/10 rounded text-xs text-destructive flex items-center gap-2">
                      <AlertCircle className="w-3 h-3" />
                      {aiTrainer.error}
                    </div>
                  )}
                  {aiTrainer.objections.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">KI hört zu und erkennt Einwände...</p>
                      <p className="text-[10px] mt-1 opacity-60">Antwortvorschläge erscheinen hier automatisch</p>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-56">
                      <div className="space-y-3">
                        {aiTrainer.objections.map((obj, idx) => (
                          <div key={idx} className="rounded-lg border border-border p-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between mb-1.5">
                              <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
                                Einwand erkannt
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(obj.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground italic mb-2">"{obj.objection}"</p>
                            <div className="bg-green-500/10 border border-green-500/20 rounded-md p-2.5">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Lightbulb className="w-3 h-3 text-green-600" />
                                <span className="text-[10px] font-semibold text-green-600">Sag das:</span>
                              </div>
                              <p className="text-sm text-foreground leading-relaxed">{obj.response}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Processing Status */}
          {processingStatus !== 'idle' && processingStatus !== 'error' && (
            <div className="space-y-3 p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {processingStatus === 'done' ? (
                    <Brain className="w-4 h-4 text-green-500" />
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  )}
                  <span>
                    {processingStatus === 'uploading' && 'Lade Aufnahme hoch...'}
                    {processingStatus === 'transcribing' && 'Transkribiere...'}
                    {processingStatus === 'summarizing' && 'Generiere Zusammenfassung...'}
                    {processingStatus === 'done' && 'Verarbeitung abgeschlossen'}
                  </span>
                </div>
                <span className="text-muted-foreground">{getProcessingProgress()}%</span>
              </div>
              <Progress value={getProcessingProgress()} className="h-2" />
            </div>
          )}

          {/* Call Summary */}
          {callSummary && (
            <div className="space-y-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Zusammenfassung
                </h4>
                <span className="text-lg">{getSentimentEmoji(callSummary.sentiment)}</span>
              </div>
              
              <p className="text-sm text-muted-foreground">{callSummary.summary}</p>
              
              {callSummary.key_points.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Hauptpunkte:</p>
                  <ul className="text-sm space-y-1">
                    {callSummary.key_points.map((point, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {callSummary.action_items.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Nächste Schritte:</p>
                  <ul className="text-sm space-y-1">
                    {callSummary.action_items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-500">→</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Call Notes - shown after call ends */}
          {(callStatus === 'ended' || callStatus === 'error') && contactId && (
            <div className="space-y-2 p-3 rounded-lg bg-muted/50 border">
              <label className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Gesprächsnotiz
              </label>
              <textarea
                placeholder="Was wurde besprochen? Nächste Schritte..."
                value={callNote}
                onChange={(e) => setCallNote(e.target.value)}
                rows={3}
                className="w-full p-2 rounded-md border bg-background text-sm resize-none"
              />
              {callNote.trim() && (
                <Button
                  size="sm"
                  disabled={savingNote}
                  onClick={async () => {
                    setSavingNote(true);
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) return;
                      const { data: profile } = await supabase.from("profiles").select("account_id").eq("id", user.id).single();
                      await supabase.from("activities").insert({
                        contact_id: contactId,
                        user_id: user.id,
                        type: "note" as any,
                        note: callNote.trim(),
                        timestamp: new Date().toISOString(),
                        account_id: profile?.account_id,
                      });
                      toast.success("Notiz gespeichert");
                      setCallNote("");
                    } catch {
                      toast.error("Fehler beim Speichern");
                    } finally {
                      setSavingNote(false);
                    }
                  }}
                >
                  {savingNote ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <FileText className="w-3 h-3 mr-1" />}
                  Notiz speichern
                </Button>
              )}
            </div>
          )}

          {/* Main Action Button */}
          <div className="flex justify-center">
            {callStatus === 'connected' || callStatus === 'ringing' || callStatus === 'dialing' ? (
              <Button
                variant="destructive"
                size="lg"
                className="w-16 h-16 rounded-full"
                onClick={handleHangup}
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            ) : callStatus === 'error' || callStatus === 'ended' ? (
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Schließen
                </Button>
                {processingStatus === 'idle' && (
                  <Button onClick={() => {
                    setCallStatus('idle');
                    setErrorMessage(null);
                    setCallDuration(0);
                    setCallSessionId(null);
                    audioChunksRef.current = [];
                    startCall();
                  }}>
                    <Phone className="w-4 h-4 mr-2" />
                    Erneut anrufen
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}