export interface ObjectionHandling {
  objection: string;
  response: string;
  timestamp: string;
}

export interface RealtimeMessage {
  type: string;
  [key: string]: any;
}

export class RealtimeObjectionHandler {
  private ws: WebSocket | null = null;
  private onObjectionCallback: ((handling: ObjectionHandling) => void) | null = null;
  private onStatusCallback: ((status: string) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private currentObjection = "";

  constructor(
    projectId: string,
    private onObjection: (handling: ObjectionHandling) => void,
    private onStatus: (status: string) => void,
    private onError: (error: string) => void
  ) {
    this.onObjectionCallback = onObjection;
    this.onStatusCallback = onStatus;
    this.onErrorCallback = onError;
  }

  async startSession(systemContext: string, leadContext: string) {
    const projectRef = 'dxdknkeexankgtkpeuvt';
    const wsUrl = `wss://${projectRef}.supabase.co/functions/v1/realtime-objection-handler`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Connected to objection handler');
      this.onStatusCallback?.('connected');
      
      // Start the session with context
      this.ws?.send(JSON.stringify({
        type: 'start_session',
        systemContext,
        leadContext
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        const data: RealtimeMessage = JSON.parse(event.data);
        console.log('Received:', data.type);

        if (data.type === 'session_started') {
          this.onStatusCallback?.('active');
        } 
        else if (data.type === 'session_ended') {
          this.onStatusCallback?.('ended');
        }
        else if (data.type === 'error') {
          this.onErrorCallback?.(data.error || 'Unknown error');
        }
        else if (data.type === 'conversation.item.created' && 
                 data.item?.role === 'user' &&
                 data.item?.content?.[0]?.transcript) {
          // Store the objection text
          this.currentObjection = data.item.content[0].transcript;
        }
        else if (data.type === 'response.text.delta') {
          // Accumulate AI response
          if (!this.currentObjection) return;
          
          // This is the AI's response to the objection
          // We'll collect it and display when done
        }
        else if (data.type === 'response.text.done') {
          // Full response is ready
          if (this.currentObjection && data.text) {
            this.onObjectionCallback?.({
              objection: this.currentObjection,
              response: data.text,
              timestamp: new Date().toISOString()
            });
            this.currentObjection = "";
          }
        }
        else if (data.type === 'response.audio_transcript.delta') {
          // Alternative way to get the response
          if (this.currentObjection && data.delta) {
            // Accumulate transcript deltas
          }
        }
        else if (data.type === 'input_audio_buffer.speech_started') {
          this.onStatusCallback?.('speaking');
        }
        else if (data.type === 'input_audio_buffer.speech_stopped') {
          this.onStatusCallback?.('listening');
        }
      } catch (error) {
        console.error('Error processing message:', error);
        this.onErrorCallback?.('Failed to process message');
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.onErrorCallback?.('Connection error');
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.onStatusCallback?.('disconnected');
    };
  }

  sendAudio(audioData: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'audio_data',
      audio: audioData
    }));
  }

  endSession() {
    if (this.ws) {
      this.ws.send(JSON.stringify({ type: 'end_session' }));
      this.ws.close();
      this.ws = null;
    }
  }
}

// Audio encoding helper
export function encodeAudioForAPI(float32Array: Float32Array): string {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
}