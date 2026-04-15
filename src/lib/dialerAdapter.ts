/**
 * Dialer Adapter
 * 
 * AKTUELLER STAND (2026-01-21):
 * - Vereinfacht auf Twilio BYOC als primäre Option
 * - Kunde bringt seinen eigenen Twilio-Account mit
 * - Browser-Telefonie über SIP.js + Twilio
 * 
 * PROBLEME MIT ANDEREN PROVIDERN:
 * - Webex: WebSocket-Verbindungsprobleme, proprietäres Protokoll
 * - Placetel SIP: wss://webrtc.2.placetel.de erfordert spezielle Auth
 * - Aircall: Nur über deren Desktop-App, kein WebRTC
 * 
 * LÖSUNG:
 * - Twilio BYOC: Kunde erstellt Twilio-Account, kauft Nummer
 * - Wir verbinden über SIP.js mit Twilio's WebRTC Gateway
 * - Kosten: ~0,014€/Min für DE Anrufe (Pay-as-you-go)
 * 
 * Für Call-Tracking (ohne Browser-Telefonie) unterstützen wir:
 * - Placetel Webhooks
 * - Sipgate Webhooks
 */

export type DialerKind = "system" | "twilio" | "custom";

type DialerConfig =
  | { kind: "system" }
  | { kind: "twilio" }
  | { kind: "custom"; baseUrl: string };

// Configure your dialer here or via environment variable
export const dialerConfig: DialerConfig = (() => {
  const kind = import.meta.env.VITE_DIALER_KIND ?? "system";
  
  if (kind === "twilio") {
    return { kind: "twilio" } as const;
  }
  
  if (kind === "custom") {
    const baseUrl = import.meta.env.VITE_DIALER_BASE_URL;
    if (!baseUrl) {
      console.warn("VITE_DIALER_BASE_URL not set, falling back to system dialer");
      return { kind: "system" } as const;
    }
    return { kind: "custom", baseUrl } as const;
  }
  
  return { kind: "system" } as const;
})();

export function buildDialHref(phone: string): string {
  if (!phone) return "#";
  
  // Normalize phone number (remove spaces, keep + and digits)
  const normalized = phone.replace(/\s+/g, "");
  
  switch (dialerConfig.kind) {
    case "twilio":
      // Twilio uses our internal softphone, return tel: as fallback
      // The actual call is initiated via SIP.js in SoftphoneDialog
      return `tel:${normalized}`;
    
    case "custom":
      return `${(dialerConfig as any).baseUrl}?to=${encodeURIComponent(normalized)}`;
    
    case "system":
    default:
      return `tel:${normalized}`;
  }
}

export function getDialerName(): string {
  switch (dialerConfig.kind) {
    case "twilio":
      return "Twilio";
    case "custom":
      return "Custom Dialer";
    case "system":
    default:
      return "System";
  }
}
