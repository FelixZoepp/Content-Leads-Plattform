import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Lightbulb, AlertTriangle, Volume2, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { UpgradePrompt } from "@/components/outreach/UpgradePrompt";

interface Objection {
  id: string;
  title: string;
  keywords: string[];
  standard_response: string;
  category: string | null;
}

interface DetectedObjection {
  objection: Objection;
  matchedKeyword: string;
  timestamp: Date;
}

interface LiveObjectionPanelProps {
  isCallActive: boolean;
  remoteStream: MediaStream | null;
}

export default function LiveObjectionPanel({ isCallActive, remoteStream }: LiveObjectionPanelProps) {
  const { canUseLiveObjectionHandling, loading: featureLoading } = useFeatureAccess();
  const [objections, setObjections] = useState<Objection[]>([]);
  const [detectedObjections, setDetectedObjections] = useState<DetectedObjection[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastMatchTimeRef = useRef<Record<string, number>>({});

  // Load objections on mount
  useEffect(() => {
    loadObjections();
  }, []);

  // Start/stop listening based on call status
  useEffect(() => {
    if (isCallActive && remoteStream && objections.length > 0) {
      startListening();
    } else {
      stopListening();
    }
    
    return () => stopListening();
  }, [isCallActive, remoteStream, objections.length]);

  const loadObjections = async () => {
    try {
      const { data, error } = await supabase
        .from('objections')
        .select('id, title, keywords, standard_response, category')
        .eq('is_active', true);
      
      if (error) throw error;
      setObjections(data || []);
      console.log('Loaded objections:', data?.length);
    } catch (err) {
      console.error('Error loading objections:', err);
    }
  };

  const startListening = () => {
    // Check for Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError("Spracherkennung wird von diesem Browser nicht unterstützt");
      return;
    }

    try {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'de-DE';

      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setCurrentTranscript(transcript);
        checkForObjections(transcript.toLowerCase());
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError("Mikrofon-Zugriff für Transkription verweigert");
        }
      };

      recognitionRef.current.onend = () => {
        // Restart if call is still active
        if (isCallActive && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.log('Recognition restart failed:', e);
          }
        }
      };

      recognitionRef.current.start();
      setIsListening(true);
      setError(null);
      console.log('Started listening for objections');
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setError("Fehler beim Starten der Spracherkennung");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setCurrentTranscript("");
  };

  const checkForObjections = useCallback((transcript: string) => {
    const now = Date.now();
    const cooldownMs = 30000; // 30 second cooldown per objection
    
    for (const objection of objections) {
      // Check if we recently matched this objection
      const lastMatch = lastMatchTimeRef.current[objection.id] || 0;
      if (now - lastMatch < cooldownMs) continue;
      
      // Check each keyword
      for (const keyword of objection.keywords) {
        if (transcript.includes(keyword.toLowerCase())) {
          console.log(`Objection detected: "${objection.title}" (keyword: "${keyword}")`);
          
          lastMatchTimeRef.current[objection.id] = now;
          
          setDetectedObjections(prev => {
            // Avoid duplicates
            const exists = prev.some(d => d.objection.id === objection.id && 
              (now - d.timestamp.getTime()) < cooldownMs);
            if (exists) return prev;
            
            const newDetection: DetectedObjection = {
              objection,
              matchedKeyword: keyword,
              timestamp: new Date()
            };
            
            // Keep only last 5 detections
            return [newDetection, ...prev].slice(0, 5);
          });
          
          // Auto-expand the newly detected objection
          setExpandedId(objection.id);
          
          break; // Only match first keyword per objection
        }
      }
    }
  }, [objections]);

  const getCategoryColor = (category: string | null): string => {
    switch (category?.toLowerCase()) {
      case 'preis': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'zeit': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'autorität': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'wettbewerb': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (!isCallActive) {
    return null;
  }

  // Pro-Plan Check
  if (!featureLoading && !canUseLiveObjectionHandling) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            Live-Einwandbehandlung
            <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
              Pro
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UpgradePrompt 
            featureName="Live-Einwandbehandlung" 
            description="KI-gestützte Live-Einwandbehandlung ist nur im Pro-Paket verfügbar."
            className="border-0 bg-transparent p-0"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            Einwandbehandlung
          </div>
          {isListening ? (
            <Badge variant="secondary" className="animate-pulse bg-green-500/20 text-green-400">
              <Volume2 className="w-3 h-3 mr-1" />
              Aktiv
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-muted">
              <MicOff className="w-3 h-3 mr-1" />
              Inaktiv
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
            <AlertTriangle className="w-3 h-3" />
            {error}
          </div>
        )}

        {/* Current transcript preview */}
        {currentTranscript && (
          <div className="p-2 rounded bg-muted/50 text-xs text-muted-foreground italic truncate">
            "{currentTranscript.slice(-100)}"
          </div>
        )}

        {/* Detected objections */}
        {detectedObjections.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Höre auf Einwände...
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {detectedObjections.map((detection, index) => (
                <div 
                  key={`${detection.objection.id}-${detection.timestamp.getTime()}`}
                  className={`rounded-lg border transition-all ${
                    index === 0 ? 'border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/30' : 'border-border bg-card'
                  }`}
                >
                  <button
                    className="w-full p-3 text-left"
                    onClick={() => setExpandedId(
                      expandedId === detection.objection.id ? null : detection.objection.id
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {index === 0 && (
                            <span className="text-amber-400 animate-pulse">●</span>
                          )}
                          <span className="font-medium text-sm truncate">
                            {detection.objection.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {detection.objection.category && (
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] ${getCategoryColor(detection.objection.category)}`}
                            >
                              {detection.objection.category}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            Keyword: "{detection.matchedKeyword}"
                          </span>
                        </div>
                      </div>
                      {expandedId === detection.objection.id ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  </button>
                  
                  {expandedId === detection.objection.id && (
                    <div className="px-3 pb-3 pt-0">
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <p className="text-xs font-medium text-green-400 mb-1">
                          💡 Empfohlene Antwort:
                        </p>
                        <p className="text-sm leading-relaxed">
                          {detection.objection.standard_response}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Quick stats */}
        {objections.length > 0 && (
          <div className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border">
            {objections.length} Einwände in Datenbank • {detectedObjections.length} erkannt
          </div>
        )}
      </CardContent>
    </Card>
  );
}