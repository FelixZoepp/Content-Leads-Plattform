import { supabase } from "@/integrations/supabase/client";

export interface ObjectionHandling {
  objection: string;
  response: string;
  timestamp: string;
}

export class WhisperGeminiHandler {
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private mediaRecorder: MediaRecorder | null = null;
  private transcriptionInterval: number | null = null;
  private systemContext = "";
  private leadContext = "";
  private mimeType = "";
  
  constructor(
    private onObjection: (handling: ObjectionHandling) => void,
    private onStatus: (status: string) => void,
    private onError: (error: string) => void
  ) {}

  async startSession(systemContext: string, leadContext: string) {
    try {
      this.systemContext = systemContext;
      this.leadContext = leadContext;
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Setup MediaRecorder with supported mimeType
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        ''  // fallback to browser default
      ];
      
      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (mimeType === '' || MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }
      
      console.log('Selected mimeType:', selectedMimeType || 'browser default');
      this.mimeType = selectedMimeType || 'audio/webm';
      
      const options = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
      this.mediaRecorder = new MediaRecorder(stream, options);
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      // Start recording with timeslice for regular chunks
      this.mediaRecorder.start(1000); // Get chunks every second
      this.isRecording = true;
      this.onStatus('active');
      
      // Process audio chunks every 5 seconds
      this.transcriptionInterval = window.setInterval(async () => {
        await this.processAudioChunks();
      }, 5000);
      
      console.log('Whisper + Gemini session started with mimeType:', this.mimeType);
      
    } catch (error) {
      console.error('Error starting session:', error);
      this.onError('Fehler beim Starten der Session');
      throw error;
    }
  }

  private async processAudioChunks() {
    if (this.audioChunks.length === 0) return;
    
    try {
      // Combine all chunks into a single blob with correct mimeType
      const audioBlob = new Blob(this.audioChunks, { type: this.mimeType });
      this.audioChunks = []; // Clear chunks
      
      // Convert to base64
      const base64Audio = await this.blobToBase64(audioBlob);
      
      // Transcribe with Whisper
      this.onStatus('transcribing');
      const { data: transcribeData, error: transcribeError } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: base64Audio, mimeType: this.mimeType }
      });
      
      if (transcribeError) {
        console.error('Transcription error:', transcribeError);
        return;
      }
      
      const transcript = transcribeData?.text;
      if (!transcript || transcript.trim().length < 10) {
        // Too short, ignore
        this.onStatus('listening');
        return;
      }
      
      console.log('Transcript:', transcript);
      
      // Analyze for objections with Gemini
      this.onStatus('analyzing');
      const { data: analyzeData, error: analyzeError } = await supabase.functions.invoke('analyze-objections', {
        body: {
          transcript,
          systemContext: this.systemContext,
          leadContext: this.leadContext
        }
      });
      
      if (analyzeError) {
        console.error('Analysis error:', analyzeError);
        this.onStatus('listening');
        return;
      }
      
      if (analyzeData?.hasObjection) {
        // Objection detected!
        this.onObjection({
          objection: analyzeData.objection,
          response: analyzeData.response,
          timestamp: new Date().toISOString()
        });
      }
      
      this.onStatus('listening');
      
    } catch (error) {
      console.error('Error processing audio:', error);
      this.onStatus('listening');
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data URL prefix
        const base64 = base64String.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  endSession() {
    this.isRecording = false;
    
    if (this.transcriptionInterval) {
      clearInterval(this.transcriptionInterval);
      this.transcriptionInterval = null;
    }
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      
      // Stop all tracks
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    
    this.audioChunks = [];
    this.onStatus('disconnected');
    
    console.log('Session ended');
  }
}