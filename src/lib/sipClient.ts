/**
 * SIP Client für Browser-Telefonie
 * 
 * Primär für Twilio BYOC optimiert, funktioniert aber auch mit anderen SIP-Providern.
 * Nutzt SIP.js für WebRTC-basierte Anrufe.
 */
import { UserAgent, Inviter, SessionState, Registerer, RegistererState, Session } from 'sip.js';

export interface SipClientConfig {
  sipServer: string;
  login: string;
  password: string;
  domain: string;
  displayName?: string;
}

export interface SipClientCallbacks {
  onRegistered: () => void;
  onUnregistered: () => void;
  onRegistrationFailed: (error: string) => void;
  onCallConnecting: () => void;
  onCallConnected: () => void;
  onCallEnded: (reason: string) => void;
  onCallFailed: (error: string) => void;
  onRemoteAudio: (stream: MediaStream) => void;
  onLocalAudio: (stream: MediaStream) => void;
}

// Legacy exports for backward compatibility
export type PlacetelConfig = SipClientConfig;
export type PlacetelCallbacks = SipClientCallbacks;

export class SipClient {
  private userAgent: UserAgent | null = null;
  private registerer: Registerer | null = null;
  private currentSession: Session | null = null;
  private callbacks: SipClientCallbacks;
  private config: SipClientConfig;
  private localStream: MediaStream | null = null;

  constructor(config: SipClientConfig, callbacks: SipClientCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
  }

  async connect(): Promise<void> {
    // Extract username part if login contains @ (e.g., "user@domain.com" -> "user")
    let sipUser = this.config.login;
    if (this.config.login.includes('@')) {
      const [userPart, domainPart] = this.config.login.split('@');
      // Use just the username part if domain matches
      if (domainPart === this.config.domain || 
          this.config.domain.includes('twilio') || 
          this.config.domain.includes('pstn')) {
        sipUser = userPart;
      }
    }
    
    const uri = UserAgent.makeURI(`sip:${sipUser}@${this.config.domain}`);
    if (!uri) {
      console.error('Failed to create SIP URI with:', { login: sipUser, domain: this.config.domain });
      throw new Error(`Failed to create SIP URI: invalid login "${sipUser}" or domain "${this.config.domain}"`);
    }

    // Determine WebSocket URL
    let wsServer = this.config.sipServer.includes('://')
      ? this.config.sipServer
      : `wss://${this.config.sipServer}`;
    
    console.log('Connecting to SIP WebSocket:', wsServer);

    this.userAgent = new UserAgent({
      uri,
      displayName: this.config.displayName || this.config.login,
      authorizationPassword: this.config.password,
      authorizationUsername: this.config.login,
      transportOptions: {
        server: wsServer,
      },
      sessionDescriptionHandlerFactoryOptions: {
        constraints: {
          audio: true,
          video: false,
        },
      },
    });

    // Start the user agent
    await this.userAgent.start();
    console.log('SIP UserAgent started');

    // Register with the SIP server
    this.registerer = new Registerer(this.userAgent);

    this.registerer.stateChange.addListener((state: RegistererState) => {
      console.log('Registerer state changed:', state);
      switch (state) {
        case RegistererState.Registered:
          this.callbacks.onRegistered();
          break;
        case RegistererState.Unregistered:
          this.callbacks.onUnregistered();
          break;
        case RegistererState.Terminated:
          this.callbacks.onUnregistered();
          break;
      }
    });

    try {
      await this.registerer.register();
    } catch (error) {
      console.error('Registration failed:', error);
      this.callbacks.onRegistrationFailed(error instanceof Error ? error.message : 'Registration failed');
      throw error;
    }
  }

  async call(phoneNumber: string): Promise<void> {
    if (!this.userAgent) {
      throw new Error('UserAgent not initialized');
    }

    // Clean up phone number - remove spaces, keep + at start
    const cleanNumber = phoneNumber.replace(/\s/g, '').replace(/^00/, '+');
    
    // Create target URI
    const targetUri = UserAgent.makeURI(`sip:${cleanNumber}@${this.config.domain}`);
    if (!targetUri) {
      throw new Error('Invalid phone number');
    }

    // Get local media stream for AI trainer
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.callbacks.onLocalAudio(this.localStream);
    } catch (error) {
      console.error('Failed to get local audio:', error);
    }

    // Create inviter (outgoing call)
    const inviter = new Inviter(this.userAgent, targetUri, {
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false },
      },
    });

    this.currentSession = inviter;

    // Handle session state changes
    inviter.stateChange.addListener((state: SessionState) => {
      console.log('Call state changed:', state);
      switch (state) {
        case SessionState.Establishing:
          this.callbacks.onCallConnecting();
          break;
        case SessionState.Established:
          this.callbacks.onCallConnected();
          this.setupRemoteAudio(inviter);
          break;
        case SessionState.Terminated:
          this.callbacks.onCallEnded('Call ended');
          this.cleanup();
          break;
      }
    });

    // Send INVITE
    try {
      await inviter.invite();
    } catch (error) {
      console.error('Call failed:', error);
      this.callbacks.onCallFailed(error instanceof Error ? error.message : 'Call failed');
      throw error;
    }
  }

  private setupRemoteAudio(session: Session): void {
    const sessionDescriptionHandler = session.sessionDescriptionHandler;
    if (!sessionDescriptionHandler) return;

    // Get remote audio stream
    const peerConnection = (sessionDescriptionHandler as any).peerConnection as RTCPeerConnection;
    if (!peerConnection) return;

    peerConnection.getReceivers().forEach((receiver) => {
      if (receiver.track.kind === 'audio') {
        const remoteStream = new MediaStream([receiver.track]);
        this.callbacks.onRemoteAudio(remoteStream);
      }
    });
  }

  async hangup(): Promise<void> {
    if (this.currentSession) {
      try {
        if (this.currentSession.state === SessionState.Established) {
          await (this.currentSession as any).bye();
        } else if (this.currentSession.state === SessionState.Establishing) {
          await (this.currentSession as any).cancel();
        }
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
    this.currentSession = null;
  }

  async disconnect(): Promise<void> {
    await this.hangup();
    if (this.registerer) {
      try {
        await this.registerer.unregister();
      } catch (error) {
        console.error('Unregister error:', error);
      }
    }
    if (this.userAgent) {
      await this.userAgent.stop();
    }
    this.userAgent = null;
    this.registerer = null;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  isRegistered(): boolean {
    return this.registerer?.state === RegistererState.Registered;
  }

  isInCall(): boolean {
    return this.currentSession?.state === SessionState.Established;
  }
}

// Legacy alias for backward compatibility
export const PlacetelClient = SipClient;
