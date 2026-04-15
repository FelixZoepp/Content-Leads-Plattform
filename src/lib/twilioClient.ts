/**
 * Twilio Voice Client für Browser-basierte Telefonie
 * 
 * Nutzt das offizielle Twilio Voice SDK (@twilio/voice-sdk)
 * anstatt SIP.js, da Twilio ein eigenes Protokoll verwendet.
 */
import { Device, Call } from '@twilio/voice-sdk';
import { supabase } from '@/integrations/supabase/client';

export interface TwilioClientCallbacks {
  onReady: () => void;
  onError: (error: string) => void;
  onIncoming: (from: string) => void;
  onCallConnecting: () => void;
  onCallConnected: () => void;
  onCallEnded: (reason: string) => void;
  onCallFailed: (error: string) => void;
  onRemoteAudio: (stream: MediaStream) => void;
  onLocalAudio: (stream: MediaStream) => void;
}

export class TwilioClient {
  private device: Device | null = null;
  private currentCall: Call | null = null;
  private callbacks: TwilioClientCallbacks;
  private localStream: MediaStream | null = null;

  constructor(callbacks: TwilioClientCallbacks) {
    this.callbacks = callbacks;
  }

  async connect(): Promise<void> {
    try {
      console.log('Fetching Twilio access token...');
      
      // Get access token from our edge function
      const { data, error } = await supabase.functions.invoke('twilio-token');
      
      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Failed to get Twilio token');
      }

      const { token } = data;
      console.log('Got Twilio token, initializing device...');

      // Initialize Twilio Device
      this.device = new Device(token, {
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        edge: 'frankfurt', // Use Frankfurt edge for Germany
        logLevel: 1,
      });

      // Set up device event handlers
      this.device.on('registered', () => {
        console.log('Twilio device registered');
        this.callbacks.onReady();
      });

      this.device.on('error', (error) => {
        console.error('Twilio device error:', error);
        const errorMessage = error?.message || (typeof error === 'string' ? error : 'Device error');
        this.callbacks.onError(errorMessage);
      });

      this.device.on('incoming', (call) => {
        console.log('Incoming call from:', call.parameters.From);
        this.currentCall = call;
        this.callbacks.onIncoming(call.parameters.From || 'Unknown');
      });

      // Register the device
      await this.device.register();
      console.log('Twilio device ready');

    } catch (error: any) {
      console.error('Twilio connect error:', error);
      const errorMessage = error?.message || (typeof error === 'string' ? error : 'Connection failed');
      this.callbacks.onError(errorMessage);
      throw error;
    }
  }

  async call(phoneNumber: string): Promise<void> {
    if (!this.device) {
      throw new Error('Device not initialized');
    }

    try {
      console.log('Initiating call to:', phoneNumber);
      this.callbacks.onCallConnecting();

      // Get local audio stream for recording
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.callbacks.onLocalAudio(this.localStream);
      } catch (err) {
        console.warn('Could not get local audio for recording:', err);
      }

      // Clean phone number
      const cleanNumber = phoneNumber.replace(/\s/g, '').replace(/^00/, '+');

      // Make the call
      this.currentCall = await this.device.connect({
        params: {
          To: cleanNumber,
        },
      });

      // Set up call event handlers
      this.currentCall.on('accept', () => {
        console.log('Call accepted');
        this.callbacks.onCallConnected();
        
        // Get remote audio stream
        const remoteStream = this.currentCall?.getRemoteStream();
        if (remoteStream) {
          this.callbacks.onRemoteAudio(remoteStream);
        }
      });

      this.currentCall.on('disconnect', () => {
        console.log('Call disconnected');
        this.callbacks.onCallEnded('Call ended');
        this.cleanup();
      });

      this.currentCall.on('cancel', () => {
        console.log('Call cancelled');
        this.callbacks.onCallEnded('Call cancelled');
        this.cleanup();
      });

      this.currentCall.on('reject', () => {
        console.log('Call rejected');
        this.callbacks.onCallFailed('Call rejected');
        this.cleanup();
      });

      this.currentCall.on('error', (error) => {
        console.error('Call error:', error);
        const errorMessage = error?.message || (typeof error === 'string' ? error : 'Call failed');
        this.callbacks.onCallFailed(errorMessage);
        this.cleanup();
      });

      this.currentCall.on('ringing', () => {
        console.log('Call ringing');
        // Already in connecting state
      });

    } catch (error: any) {
      console.error('Call initiation error:', error);
      const errorMessage = error?.message || (typeof error === 'string' ? error : 'Failed to start call');
      this.callbacks.onCallFailed(errorMessage);
      throw error;
    }
  }

  async hangup(): Promise<void> {
    if (this.currentCall) {
      try {
        this.currentCall.disconnect();
      } catch (error) {
        console.error('Hangup error:', error);
      }
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    this.currentCall = null;
  }

  async disconnect(): Promise<void> {
    await this.hangup();
    if (this.device) {
      // Only unregister if device is registered
      if (this.device.state === Device.State.Registered) {
        try {
          await this.device.unregister();
        } catch (err) {
          console.warn('Unregister error (ignored):', err);
        }
      }
      this.device.destroy();
      this.device = null;
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  isReady(): boolean {
    return this.device?.state === Device.State.Registered;
  }

  isInCall(): boolean {
    return this.currentCall?.status() === Call.State.Open;
  }
}