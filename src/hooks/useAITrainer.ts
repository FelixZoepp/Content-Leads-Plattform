import { useState, useRef, useCallback, useEffect } from 'react';
import { WhisperGeminiHandler, ObjectionHandling } from '@/utils/whisperGeminiHandler';
import { toast } from 'sonner';

export type AITrainerStatus = 'disconnected' | 'connecting' | 'listening' | 'transcribing' | 'analyzing' | 'active';

interface UseAITrainerOptions {
  systemContext?: string;
  leadContext?: string;
  onObjectionDetected?: (objection: ObjectionHandling) => void;
}

export const useAITrainer = (options: UseAITrainerOptions = {}) => {
  const [status, setStatus] = useState<AITrainerStatus>('disconnected');
  const [objections, setObjections] = useState<ObjectionHandling[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [isActive, setIsActive] = useState(false);
  
  const handlerRef = useRef<WhisperGeminiHandler | null>(null);

  const handleObjection = useCallback((handling: ObjectionHandling) => {
    console.log('Objection detected:', handling);
    setObjections(prev => [handling, ...prev]);
    options.onObjectionDetected?.(handling);
    
    // Play notification sound or vibrate
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }
    
    toast.info('Einwand erkannt!', {
      description: 'Schau in den KI-Trainer für eine Antwort',
      duration: 3000,
    });
  }, [options]);

  const handleStatus = useCallback((newStatus: string) => {
    console.log('AI Trainer status:', newStatus);
    setStatus(newStatus as AITrainerStatus);
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    console.error('AI Trainer error:', errorMessage);
    setError(errorMessage);
    toast.error('KI-Trainer Fehler', { description: errorMessage });
  }, []);

  const startTrainer = useCallback(async (systemContext: string, leadContext: string) => {
    try {
      setError(undefined);
      setStatus('connecting');
      
      handlerRef.current = new WhisperGeminiHandler(
        handleObjection,
        handleStatus,
        handleError
      );
      
      await handlerRef.current.startSession(systemContext, leadContext);
      setIsActive(true);
      
      toast.success('KI-Trainer aktiviert', {
        description: 'Der Trainer hört jetzt mit und erkennt Einwände'
      });
    } catch (err) {
      console.error('Failed to start AI trainer:', err);
      setStatus('disconnected');
      setError(err instanceof Error ? err.message : 'Fehler beim Starten');
    }
  }, [handleObjection, handleStatus, handleError]);

  const stopTrainer = useCallback(() => {
    if (handlerRef.current) {
      handlerRef.current.endSession();
      handlerRef.current = null;
    }
    setIsActive(false);
    setStatus('disconnected');
    toast.info('KI-Trainer deaktiviert');
  }, []);

  const clearObjections = useCallback(() => {
    setObjections([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (handlerRef.current) {
        handlerRef.current.endSession();
      }
    };
  }, []);

  return {
    status,
    objections,
    error,
    isActive,
    startTrainer,
    stopTrainer,
    clearObjections,
  };
};
