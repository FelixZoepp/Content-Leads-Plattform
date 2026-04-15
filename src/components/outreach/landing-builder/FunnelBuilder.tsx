import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============================================================
// FUNNEL / LEAD PAGE BUILDER
// Perspective-style drag-and-drop builder with slides + variables
// ============================================================

// --- ICON COMPONENTS ---
const Icons: Record<string, React.FC> = {
  Heading: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12h16M4 6h16M4 18h10"/></svg>,
  Text: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Image: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Video: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  Button: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="4"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  Form: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="13" y2="16"/></svg>,
  Spacer: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="18" x2="20" y2="18"/><line x1="12" y1="10" x2="12" y2="14"/><polyline points="9 11 12 10 15 11"/><polyline points="9 13 12 14 15 13"/></svg>,
  Divider: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="12" x2="22" y2="12"/></svg>,
  Testimonial: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Quiz: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Calendar: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Logo: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  Timer: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Social: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Copy: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  Up: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>,
  Down: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
  Settings: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Eye: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Phone: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
  Desktop: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  Variable: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7c0-1.1.9-2 2-2h3l2 3h5l2-3h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z"/><path d="M8 14l2-2 2 2 2-2 2 2"/></svg>,
  Code: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  Sparkle: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>,
  Plus: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Link: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Layers: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Paint: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/></svg>,
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  X: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  GripVertical: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" opacity="0.4"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>,
  Undo: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>,
  Redo: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  Save: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  Bold: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>,
  Italic: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>,
  ColorText: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20h16"/><path d="M9.5 4h5L18 16H6z"/></svg>,
  AlignLeft: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>,
  AlignCenter: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>,
  AlignRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>,
  ArrowLeft: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Slide: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  Globe: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
};

// --- TYPES ---
interface Variable { key: string; label: string; example: string; }
interface BlockTemplate { type: string; label: string; icon: string; defaults: Record<string, any>; }
interface Block { id: string; type: string; settings: Record<string, any>; }
interface Theme { name: string; bg: string; accent: string; text: string; }
interface Slide { id: string; name: string; blocks: Block[]; }
interface PageSettings {
  name: string; slug: string; customDomain: string; favicon: string;
  metaTitle: string; metaDescription: string; theme: number; accentOverride: string;
  maxWidth: number; blockGap: number; padding: number;
  impressumUrl?: string; datenschutzUrl?: string;
}

interface FunnelBuilderProps {
  pageId: string;
  onClose: () => void;
}

// --- VARIABLE SYSTEM ---
const VARIABLES: Variable[] = [
  { key: "{{lead.firstName}}", label: "Vorname", example: "Max" },
  { key: "{{lead.lastName}}", label: "Nachname", example: "Mustermann" },
  { key: "{{lead.company}}", label: "Unternehmen", example: "Acme GmbH" },
  { key: "{{lead.position}}", label: "Position", example: "CEO" },
  { key: "{{lead.email}}", label: "E-Mail", example: "max@acme.de" },
  { key: "{{lead.industry}}", label: "Branche", example: "SaaS" },
  { key: "{{lead.city}}", label: "Stadt", example: "Berlin" },
  { key: "{{lead.phone}}", label: "Telefon", example: "+49 171 1234567" },
  { key: "{{lead.linkedinUrl}}", label: "LinkedIn URL", example: "linkedin.com/in/max" },
  { key: "{{lead.customField1}}", label: "Custom Field 1", example: "Wert 1" },
  { key: "{{sender.name}}", label: "Absender Name", example: "Anna Schmidt" },
  { key: "{{sender.company}}", label: "Absender Firma", example: "Meine Agency" },
  { key: "{{sender.calendarLink}}", label: "Kalender Link", example: "https://cal.com/anna" },
  { key: "{{tracking.id}}", label: "Tracking ID", example: "trk_abc123" },
  { key: "{{tracking.utm_source}}", label: "UTM Source", example: "linkedin" },
  { key: "{{tracking.utm_campaign}}", label: "UTM Campaign", example: "q1_outreach" },
];

// --- BLOCK TEMPLATES ---
const BLOCK_TEMPLATES: Record<string, BlockTemplate> = {
  heading: { type: "heading", label: "Headline", icon: "Heading", defaults: { text: "Hallo {{lead.firstName}}, wir haben etwas für {{lead.company}}", level: "h1", align: "center", color: "#ffffff", fontSize: 32 }},
  text: { type: "text", label: "Text", icon: "Text", defaults: { text: "Wir haben eine maßgeschneiderte Lösung für {{lead.company}} in der {{lead.industry}}-Branche erstellt.", align: "center", color: "#ffffffcc", fontSize: 16, lineHeight: 1.6 }},
  image: { type: "image", label: "Bild", icon: "Image", defaults: { src: "", alt: "Bild", width: "100%", borderRadius: 12, objectFit: "cover" }},
  video: { type: "video", label: "Video / Erklärfilm", icon: "Video", defaults: { src: "{{lead.videoUrl}}", posterSrc: "", autoplay: false, controls: true, borderRadius: 12 }},
  button: { type: "button", label: "CTA Button", icon: "Button", defaults: { text: "Termin buchen →", url: "{{sender.calendarLink}}?name={{lead.firstName}}&company={{lead.company}}&tid={{tracking.id}}", bgColor: "#6C5CE7", textColor: "#ffffff", borderRadius: 50, fontSize: 18, fullWidth: true, paddingY: 16, animation: "pulse" }},
  form: { type: "form", label: "Formular", icon: "Form", defaults: { fields: [{ label: "Name", type: "text", placeholder: "Ihr Name", required: true },{ label: "E-Mail", type: "email", placeholder: "ihre@email.de", required: true },{ label: "Telefon", type: "tel", placeholder: "+49...", required: false }], submitText: "Absenden", submitColor: "#6C5CE7" }},
  spacer: { type: "spacer", label: "Abstand", icon: "Spacer", defaults: { height: 40 }},
  divider: { type: "divider", label: "Trennlinie", icon: "Divider", defaults: { color: "#ffffff22", thickness: 1, width: "60%", style: "solid" }},
  testimonial: { type: "testimonial", label: "Testimonial", icon: "Testimonial", defaults: { quote: "Die Zusammenarbeit war hervorragend. Absolute Empfehlung!", author: "Lisa Müller", role: "CMO, TechStart GmbH", avatar: "", rating: 5 }},
  quiz: { type: "quiz", label: "Quiz / Frage", icon: "Quiz", defaults: { question: "Was ist Ihre größte Herausforderung?", options: ["Lead-Generierung", "Conversion-Optimierung", "Skalierung", "Sonstiges"], multiSelect: false, style: "cards" }},
  calendar: { type: "calendar", label: "Kalender Embed", icon: "Calendar", defaults: { calendarUrl: "{{sender.calendarLink}}", height: 500 }},
  logo: { type: "logo", label: "Logo-Leiste", icon: "Logo", defaults: { text: "Bekannt aus & vertraut von", logos: ["Logo 1", "Logo 2", "Logo 3", "Logo 4", "Logo 5"] }},
  timer: { type: "timer", label: "Countdown", icon: "Timer", defaults: { hours: 48, label: "Angebot endet in", bgColor: "#ff6b6b22", textColor: "#ff6b6b" }},
  social: { type: "social", label: "Social Proof", icon: "Social", defaults: { number: "2.847+", label: "Unternehmen vertrauen uns", icon: "users" }},
  html: { type: "html", label: "HTML / Code", icon: "Code", defaults: { code: '<div style="padding: 20px; text-align: center; color: #999;">Eigener HTML-Code hier</div>', aiPrompt: "" }},
};

const BLOCK_CATEGORIES = [
  { name: "Content", blocks: ["heading", "text", "image", "video"] },
  { name: "Interaktion", blocks: ["button", "form", "quiz", "calendar"] },
  { name: "Social Proof", blocks: ["testimonial", "logo", "social", "timer"] },
  { name: "Layout", blocks: ["spacer", "divider"] },
  { name: "Erweitert", blocks: ["html"] },
];

// --- THEME PRESETS ---
const THEMES: Theme[] = [
  { name: "Dark Pro", bg: "linear-gradient(145deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)", accent: "#6C5CE7", text: "#ffffff" },
  { name: "Midnight Blue", bg: "linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%)", accent: "#00d2ff", text: "#ffffff" },
  { name: "Clean White", bg: "linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)", accent: "#6C5CE7", text: "#1a1a2e" },
  { name: "Warm Coral", bg: "linear-gradient(145deg, #1a0a0a 0%, #2e1a1a 50%, #3e1616 100%)", accent: "#ff6b6b", text: "#ffffff" },
  { name: "Forest", bg: "linear-gradient(145deg, #0a1a0f 0%, #1a2e1a 50%, #163e16 100%)", accent: "#00b894", text: "#ffffff" },
  { name: "Sunset", bg: "linear-gradient(145deg, #1a0f1a 0%, #2e1a2e 50%, #3e163e 100%)", accent: "#fd79a8", text: "#ffffff" },
];

// Helper: detect light theme and return theme-aware colors
function isLightBg(theme: Theme): boolean {
  const hex = theme.text.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}
function tc(theme: Theme) {
  const light = isLightBg(theme);
  const base = light ? "#000000" : "#ffffff";
  return { text: theme.text, muted: theme.text + "cc", subtle: theme.text + "88", faint: theme.text + "66", vfaint: theme.text + "55", ghost: theme.text + "44", cardBg: base + "08", cardBorder: base + "11", inputBg: base + "0a", inputBorder: base + "22", overlay: base + "06" };
}

let blockIdCounter = 100;
const newId = () => `blk_${++blockIdCounter}_${Date.now()}`;
const newSlideId = () => `slide_${++blockIdCounter}_${Date.now()}`;

// --- FLOATING RICH TEXT TOOLBAR ---
const TOOLBAR_COLORS = ["#ffffff", "#6C5CE7", "#00d2ff", "#ff6b6b", "#00b894", "#fd79a8", "#fdcb6e", "#e17055"];

function FloatingToolbar({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) { setPos(null); setShowColorPicker(false); return; }
      const range = sel.getRangeAt(0);
      if (!containerRef.current?.contains(range.commonAncestorContainer)) { setPos(null); return; }
      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      setPos({ top: rect.top - containerRect.top - 44, left: rect.left - containerRect.left + rect.width / 2 });
    };
    document.addEventListener("selectionchange", checkSelection);
    return () => document.removeEventListener("selectionchange", checkSelection);
  }, [containerRef]);

  const execCmd = (cmd: string, value?: string) => { document.execCommand(cmd, false, value); };
  const isActive = (cmd: string) => document.queryCommandState(cmd);
  if (!pos) return null;

  return (
    <div ref={toolbarRef} style={{ position: "absolute", top: pos.top, left: pos.left, transform: "translateX(-50%)", zIndex: 200, display: "flex", alignItems: "center", gap: 1, background: "#1a1a2e", borderRadius: 10, padding: "4px 4px", boxShadow: "0 8px 32px #000000aa, 0 0 0 1px #ffffff15", backdropFilter: "blur(12px)", animation: "fadeIn 0.12s ease" }} onMouseDown={e => e.preventDefault()}>
      <ToolbarBtn icon={<Icons.Bold />} active={isActive("bold")} onClick={() => execCmd("bold")} tooltip="Fett" />
      <ToolbarBtn icon={<Icons.Italic />} active={isActive("italic")} onClick={() => execCmd("italic")} tooltip="Kursiv" />
      <div style={{ width: 1, height: 20, background: "#ffffff15", margin: "0 3px" }} />
      <div style={{ position: "relative" }}>
        <ToolbarBtn icon={<Icons.ColorText />} active={showColorPicker} onClick={() => setShowColorPicker(!showColorPicker)} tooltip="Farbe" />
        {showColorPicker && (
          <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 6, background: "#1a1a2e", borderRadius: 10, padding: 8, boxShadow: "0 8px 24px #00000088", border: "1px solid #ffffff15", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, minWidth: 120 }} onMouseDown={e => e.preventDefault()}>
            {TOOLBAR_COLORS.map(c => (
              <div key={c} onClick={() => { execCmd("foreColor", c); setShowColorPicker(false); }} style={{ width: 24, height: 24, borderRadius: 6, background: c, cursor: "pointer", border: "2px solid #ffffff22", transition: "transform 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.2)")} onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")} />
            ))}
            <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
              <input type="color" onChange={e => { execCmd("foreColor", e.target.value); setShowColorPicker(false); }} style={{ width: "100%", height: 24, border: "none", borderRadius: 6, cursor: "pointer", background: "none" }} />
            </div>
          </div>
        )}
      </div>
      <div style={{ width: 1, height: 20, background: "#ffffff15", margin: "0 3px" }} />
      <ToolbarBtn icon={<Icons.AlignLeft />} onClick={() => execCmd("justifyLeft")} tooltip="Links" />
      <ToolbarBtn icon={<Icons.AlignCenter />} onClick={() => execCmd("justifyCenter")} tooltip="Mitte" />
      <ToolbarBtn icon={<Icons.AlignRight />} onClick={() => execCmd("justifyRight")} tooltip="Rechts" />
    </div>
  );
}

function ToolbarBtn({ icon, active, onClick, tooltip }: { icon: React.ReactNode; active?: boolean; onClick: () => void; tooltip?: string }) {
  return (
    <div onClick={onClick} title={tooltip} style={{ padding: "5px 7px", borderRadius: 6, cursor: "pointer", background: active ? "#6C5CE733" : "transparent", color: active ? "#6C5CE7" : "#ffffffaa", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.1s" }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#ffffff11"; }} onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
      {icon}
    </div>
  );
}

// --- INLINE EDITABLE ---
function InlineEditable({ html, onChange, style, tag, blockId, isSelected }: { html: string; onChange: (html: string) => void; style: React.CSSProperties; tag?: string; blockId: string; isSelected: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastHtml = useRef(html);
  const initialized = useRef(false);

  // Set initial content once, then only sync when content changes externally
  useEffect(() => {
    if (!ref.current) return;
    if (!initialized.current) {
      ref.current.innerHTML = html;
      lastHtml.current = html;
      initialized.current = true;
      return;
    }
    // Only update DOM if change came from outside (not from user typing)
    if (html !== lastHtml.current && !ref.current.contains(document.activeElement)) {
      ref.current.innerHTML = html;
      lastHtml.current = html;
    }
  }, [html]);

  const handleInput = useCallback(() => {
    if (ref.current) {
      const newHtml = ref.current.innerHTML;
      if (newHtml !== lastHtml.current) { lastHtml.current = newHtml; onChange(newHtml); }
    }
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) {
      if (e.key === "b") { e.preventDefault(); document.execCommand("bold"); }
      if (e.key === "i") { e.preventDefault(); document.execCommand("italic"); }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); document.execCommand("insertLineBreak"); }
  }, []);

  const Tag = (tag || "div") as any;
  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {isSelected && <FloatingToolbar containerRef={containerRef} />}
      <Tag ref={ref} contentEditable suppressContentEditableWarning onInput={handleInput} onKeyDown={handleKeyDown} onBlur={handleInput}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        style={{ ...style, outline: "none", cursor: "text", minHeight: "1em" }} />
    </div>
  );
}

// --- BLOCK RENDERER ---
function BlockPreview({ block, theme, previewMode, onUpdate, isSelected }: { block: Block; theme: Theme & { accent: string }; previewMode: string; onUpdate?: (block: Block) => void; isSelected?: boolean }) {
  const replaceVarsForDisplay = (str: any): string => {
    if (typeof str !== "string") return str;
    let result = str;
    VARIABLES.forEach(v => { result = result.split(v.key).join(`<span style="color:${theme.accent};opacity:0.7">${v.example}</span>`); });
    return result;
  };
  const updateSetting = (key: string, value: any) => { if (onUpdate) onUpdate({ ...block, settings: { ...block.settings, [key]: value } }); };
  const s = block.settings;
  const mobile = previewMode === "mobile";
  const editable = isSelected && onUpdate;
  const c = tc(theme);

  switch (block.type) {
    case "heading": {
      const sizes: Record<string, number> = { h1: mobile ? 26 : s.fontSize || 32, h2: mobile ? 22 : (s.fontSize || 28), h3: mobile ? 18 : (s.fontSize || 22) };
      const level = s.level || "h1";
      const headingStyle: React.CSSProperties = { fontSize: sizes[level] || 32, fontWeight: 800, color: s.color || c.text, textAlign: s.align || "center", lineHeight: 1.2, margin: 0, letterSpacing: "-0.02em" };
      if (editable) return <InlineEditable html={s.text || ""} onChange={v => updateSetting("text", v)} style={headingStyle} tag={level} blockId={block.id} isSelected={!!isSelected} />;
      const Tag = level as keyof JSX.IntrinsicElements;
      return <Tag style={headingStyle} dangerouslySetInnerHTML={{ __html: replaceVarsForDisplay(s.text) }} />;
    }
    case "text": {
      const textStyle: React.CSSProperties = { fontSize: mobile ? 14 : (s.fontSize || 16), color: s.color || c.muted, textAlign: s.align || "center", lineHeight: s.lineHeight || 1.6, margin: 0, maxWidth: 520, marginLeft: "auto", marginRight: "auto" };
      if (editable) return <InlineEditable html={s.text || ""} onChange={v => updateSetting("text", v)} style={textStyle} tag="p" blockId={block.id} isSelected={!!isSelected} />;
      return <p style={textStyle} dangerouslySetInnerHTML={{ __html: replaceVarsForDisplay(s.text) }} />;
    }
    case "image":
      return <div style={{ borderRadius: s.borderRadius || 12, overflow: "hidden", width: s.width || "100%" }}>
        {s.src ? <img src={s.src} alt={s.alt} style={{ width: "100%", display: "block", objectFit: s.objectFit || "cover" }} /> :
        <div style={{ background: c.cardBorder, height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: c.ghost, fontSize: 14 }}>Bild hier einfügen</div>}
      </div>;
    case "video": {
      const previewSrc = s.src || "";
      const isVariable = previewSrc.includes("{{");
      const isRealUrl = !isVariable && (previewSrc.startsWith("http") || previewSrc.startsWith("/"));

      // YouTube embed
      if (isRealUrl && (previewSrc.includes("youtube.com") || previewSrc.includes("youtu.be"))) {
        const videoId = previewSrc.includes("youtu.be") ? previewSrc.split("/").pop() : (() => { try { return new URL(previewSrc).searchParams.get("v"); } catch { return previewSrc.split("v=")[1]?.split("&")[0]; } })();
        return <div style={{ borderRadius: s.borderRadius || 12, overflow: "hidden", position: "relative", paddingTop: "56.25%" }}>
          <iframe src={`https://www.youtube.com/embed/${videoId}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} allow="encrypted-media" allowFullScreen />
        </div>;
      }
      // Vimeo embed
      if (isRealUrl && previewSrc.includes("vimeo.com")) {
        const vimeoId = previewSrc.split("/").pop();
        return <div style={{ borderRadius: s.borderRadius || 12, overflow: "hidden", position: "relative", paddingTop: "56.25%" }}>
          <iframe src={`https://player.vimeo.com/video/${vimeoId}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} allow="fullscreen" allowFullScreen />
        </div>;
      }
      // Loom embed
      if (isRealUrl && previewSrc.includes("loom.com")) {
        const loomId = previewSrc.split("/share/").pop()?.split("?")[0];
        return <div style={{ borderRadius: s.borderRadius || 12, overflow: "hidden", position: "relative", paddingTop: "56.25%" }}>
          <iframe src={`https://www.loom.com/embed/${loomId}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} allow="fullscreen" allowFullScreen />
        </div>;
      }
      // Direct video file
      if (isRealUrl) {
        return <div style={{ borderRadius: s.borderRadius || 12, overflow: "hidden" }}>
          <video src={previewSrc} poster={s.posterSrc || undefined} controls playsInline onError={(e) => { (e.target as HTMLVideoElement).style.display = "none"; }} style={{ width: "100%", display: "block" }} />
        </div>;
      }
      // Variable or empty → placeholder
      return <div style={{ borderRadius: s.borderRadius || 12, overflow: "hidden", background: "#000", position: "relative" }}>
        <div style={{ paddingTop: "56.25%", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #1a1a2e, #2d2d44)" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: theme.accent + "33", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 0, height: 0, borderLeft: "22px solid " + theme.accent, borderTop: "13px solid transparent", borderBottom: "13px solid transparent", marginLeft: 4 }}/>
            </div>
          </div>
          <div style={{ position: "absolute", bottom: 12, left: 12, fontSize: 11, color: "#ffffff99", background: "#00000066", padding: "4px 10px", borderRadius: 20 }}>{isVariable ? replaceVarsForDisplay(previewSrc) : "Video-URL einfügen"}</div>
        </div>
      </div>;
    }
    case "button": {
      const btnStyle: React.CSSProperties = { background: s.bgColor || theme.accent, color: s.textColor || "#fff", border: "none", borderRadius: s.borderRadius || 50, padding: `${s.paddingY || 16}px 40px`, fontSize: mobile ? 16 : (s.fontSize || 18), fontWeight: 700, cursor: "pointer", width: s.fullWidth ? "100%" : "auto", maxWidth: 400, letterSpacing: "0.01em", boxShadow: `0 4px 24px ${(s.bgColor || theme.accent)}44`, transition: "all 0.2s", display: "inline-block", textAlign: "center" as const };
      if (editable) return <div style={{ textAlign: "center" }}><InlineEditable html={s.text || ""} onChange={v => updateSetting("text", v)} style={btnStyle} blockId={block.id} isSelected={!!isSelected} /></div>;
      return <div style={{ textAlign: "center" }}><button style={btnStyle} dangerouslySetInnerHTML={{ __html: replaceVarsForDisplay(s.text) }} /></div>;
    }
    case "form":
      return <div style={{ maxWidth: 400, margin: "0 auto" }}>
        {(s.fields || []).map((f: any, i: number) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, color: c.subtle, marginBottom: 4, fontWeight: 500 }}>{f.label}{f.required && " *"}</label>
            <input type={f.type} placeholder={f.placeholder} style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1px solid ${c.inputBorder}`, background: c.inputBg, color: c.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} readOnly />
          </div>
        ))}
        <button style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none", background: s.submitColor || theme.accent, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>{s.submitText || "Absenden"}</button>
      </div>;
    case "spacer": return <div style={{ height: s.height || 40 }} />;
    case "divider": return <div style={{ display: "flex", justifyContent: "center" }}><div style={{ width: s.width || "60%", height: 0, borderTop: `${s.thickness || 1}px ${s.style || "solid"} ${s.color || c.inputBorder}` }} /></div>;
    case "testimonial":
      return <div style={{ background: c.cardBg, borderRadius: 16, padding: mobile ? 20 : 28, border: `1px solid ${c.cardBorder}` }}>
        <div style={{ color: theme.accent, fontSize: 20, marginBottom: 8 }}>{"★".repeat(s.rating || 5)}</div>
        <p style={{ fontSize: mobile ? 14 : 16, color: c.muted, lineHeight: 1.6, margin: "0 0 16px 0", fontStyle: "italic" }} dangerouslySetInnerHTML={{ __html: `"${replaceVarsForDisplay(s.quote)}"` }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {s.image_url ? (
            <img src={s.image_url} alt={s.author} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: theme.accent + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: theme.accent }}>{(s.author || "A")[0]}</div>
          )}
          <div><div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{s.author}</div><div style={{ fontSize: 12, color: c.faint }}>{s.role}</div></div>
        </div>
      </div>;
    case "quiz":
      return <div>
        <p style={{ fontSize: mobile ? 16 : 18, fontWeight: 700, color: c.text, textAlign: "center", margin: "0 0 16px 0" }} dangerouslySetInnerHTML={{ __html: replaceVarsForDisplay(s.question) }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 400, margin: "0 auto" }}>
          {(s.options || []).map((opt: string, i: number) => (
            <div key={i} style={{ padding: "14px 16px", borderRadius: 12, border: `2px solid ${theme.accent}33`, background: c.overlay, textAlign: "center", fontSize: 14, color: c.text, cursor: "pointer", fontWeight: 500, transition: "all 0.15s" }}>{opt}</div>
          ))}
        </div>
      </div>;
    case "calendar":
      return <div style={{ background: c.cardBg, borderRadius: 12, height: mobile ? 300 : (s.height || 500), display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${c.cardBorder}`, flexDirection: "column", gap: 8 }}>
        <Icons.Calendar /><div style={{ color: c.faint, fontSize: 13 }}>Kalender-Embed: {replaceVarsForDisplay(s.calendarUrl)}</div>
      </div>;
    case "logo":
      return <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 12, color: c.vfaint, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 16px 0", fontWeight: 600 }}>{s.text}</p>
        <div style={{ display: "flex", justifyContent: "center", gap: mobile ? 16 : 24, flexWrap: "wrap", alignItems: "center" }}>
          {(s.logos || []).map((l: any, i: number) => {
            const logoObj = typeof l === "string" ? { text: l, imageUrl: "" } : l;
            return logoObj.imageUrl ? (
              <img key={i} src={logoObj.imageUrl} alt={logoObj.text || `Logo ${i + 1}`} style={{ height: 36, maxWidth: 120, objectFit: "contain", opacity: 0.7 }} />
            ) : (
              <div key={i} style={{ width: 80, height: 36, borderRadius: 6, background: c.inputBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: c.ghost, border: `1px solid ${c.cardBorder}` }}>{logoObj.text}</div>
            );
          })}
        </div>
      </div>;
    case "timer":
      return <div style={{ background: s.bgColor || "#ff6b6b22", borderRadius: 12, padding: "16px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 12, color: s.textColor || "#ff6b6b", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{s.label}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
          {["Std", "Min", "Sek"].map((unit, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: mobile ? 24 : 32, fontWeight: 800, color: s.textColor || "#ff6b6b" }}>{i === 0 ? String(s.hours || 48).padStart(2,"0") : "00"}</div>
              <div style={{ fontSize: 10, color: (s.textColor || "#ff6b6b") + "99", textTransform: "uppercase" }}>{unit}</div>
            </div>
          ))}
        </div>
      </div>;
    case "social":
      return <div style={{ textAlign: "center", padding: 20 }}>
        <div style={{ fontSize: mobile ? 36 : 48, fontWeight: 900, color: theme.accent, letterSpacing: "-0.03em" }}>{s.number}</div>
        <div style={{ fontSize: 14, color: c.subtle, marginTop: 4 }}>{s.label}</div>
      </div>;
    case "html":
      return s.code ? (
        <div dangerouslySetInnerHTML={{ __html: s.code }} />
      ) : (
        <div style={{ padding: 20, color: c.ghost, textAlign: "center", border: `1px dashed ${c.cardBorder}`, borderRadius: 8 }}>
          <Icons.Code /> HTML / Code Block
        </div>
      );
    default:
      return <div style={{ padding: 20, color: c.ghost, textAlign: "center" }}>Block: {block.type}</div>;
  }
}

// --- SETTINGS PANEL COMPONENTS ---
function TextInput({ label, value, onChange, multiline, placeholder }: { label: string; value: any; onChange: (v: string) => void; multiline?: boolean; placeholder?: string }) {
  const base: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #ffffff18", background: "#ffffff08", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
  return <div style={{ marginBottom: 12 }}>
    <label style={{ display: "block", fontSize: 11, color: "#ffffff66", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
    {multiline ? <textarea value={value || ""} onChange={e => onChange(e.target.value)} rows={3} style={{ ...base, resize: "vertical" }} placeholder={placeholder} /> :
    <input type="text" value={value || ""} onChange={e => onChange(e.target.value)} style={base} placeholder={placeholder} />}
  </div>;
}

function NumberInput({ label, value, onChange, min, max, step, unit }: { label: string; value: any; onChange: (v: number) => void; min?: number; max?: number; step?: number; unit?: string }) {
  return <div style={{ marginBottom: 12 }}>
    <label style={{ display: "block", fontSize: 11, color: "#ffffff66", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input type="range" min={min || 0} max={max || 100} step={step || 1} value={value || 0} onChange={e => onChange(Number(e.target.value))} style={{ flex: 1, accentColor: "#6C5CE7" }} />
      <span style={{ fontSize: 12, color: "#ffffff88", minWidth: 40, textAlign: "right" }}>{value}{unit || ""}</span>
    </div>
  </div>;
}

function ColorInput({ label, value, onChange }: { label: string; value: any; onChange: (v: string) => void }) {
  return <div style={{ marginBottom: 12 }}>
    <label style={{ display: "block", fontSize: 11, color: "#ffffff66", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input type="color" value={value || "#ffffff"} onChange={e => onChange(e.target.value)} style={{ width: 32, height: 32, border: "none", borderRadius: 8, cursor: "pointer", background: "none" }} />
      <input type="text" value={value || ""} onChange={e => onChange(e.target.value)} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #ffffff18", background: "#ffffff08", color: "#fff", fontSize: 13, outline: "none", fontFamily: "monospace" }} />
    </div>
  </div>;
}

function SelectInput({ label, value, onChange, options }: { label: string; value: any; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return <div style={{ marginBottom: 12 }}>
    <label style={{ display: "block", fontSize: 11, color: "#ffffff66", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
    <select value={value || ""} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #ffffff18", background: "#0d0d14", color: "#fff", fontSize: 13, outline: "none" }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>;
}

function ToggleInput({ label, value, onChange }: { label: string; value: any; onChange: (v: boolean) => void }) {
  return <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
    <label style={{ fontSize: 12, color: "#ffffffaa", fontWeight: 500 }}>{label}</label>
    <div onClick={() => onChange(!value)} style={{ width: 40, height: 22, borderRadius: 11, background: value ? "#6C5CE7" : "#ffffff22", cursor: "pointer", position: "relative", transition: "all 0.2s" }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: value ? 20 : 2, transition: "all 0.2s" }} />
    </div>
  </div>;
}

// --- VARIABLE PICKER ---
function VariablePicker({ onInsert, onClose }: { onInsert: (key: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = VARIABLES.filter(v => v.label.toLowerCase().includes(search.toLowerCase()) || v.key.toLowerCase().includes(search.toLowerCase()));
  return <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "#0d0d14f0", zIndex: 100, padding: 16, overflowY: "auto", backdropFilter: "blur(8px)" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <h4 style={{ margin: 0, fontSize: 14, color: "#fff", fontWeight: 700 }}>Variable einfügen</h4>
      <div onClick={onClose} style={{ cursor: "pointer", color: "#ffffff66", padding: 4 }}><Icons.X /></div>
    </div>
    <input type="text" placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #ffffff18", background: "#ffffff08", color: "#fff", fontSize: 13, marginBottom: 12, outline: "none", boxSizing: "border-box" }} />
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {filtered.map(v => (
        <div key={v.key} onClick={() => { onInsert(v.key); onClose(); }} style={{ padding: "8px 12px", borderRadius: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#ffffff11")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <div><div style={{ fontSize: 12, fontWeight: 600, color: "#ffffffcc" }}>{v.label}</div><div style={{ fontSize: 11, color: "#6C5CE7", fontFamily: "monospace" }}>{v.key}</div></div>
          <div style={{ fontSize: 11, color: "#ffffff44" }}>{v.example}</div>
        </div>
      ))}
    </div>
  </div>;
}

// --- BLOCK SETTINGS PANEL ---
function BlockSettings({ block, onChange, theme }: { block: Block; onChange: (b: Block) => void; theme: Theme & { accent: string } }) {
  const [showVarPicker, setShowVarPicker] = useState(false);
  const [varTarget, setVarTarget] = useState<string | null>(null);
  const s = block.settings;
  const update = (key: string, val: any) => onChange({ ...block, settings: { ...s, [key]: val } });
  const insertVar = (varKey: string) => { if (varTarget) update(varTarget, (s[varTarget] || "") + varKey); };
  const VarBtn = ({ field }: { field: string }) => (
    <div onClick={() => { setVarTarget(field); setShowVarPicker(true); }} style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 10, color: "#6C5CE7", background: "#6C5CE722", padding: "2px 8px", borderRadius: 20, marginBottom: 4, fontWeight: 600 }}>
      <Icons.Variable /> Variable
    </div>
  );

  const content = (() => {
    switch (block.type) {
      case "heading":
        return <>
          <div style={{ background: "#6C5CE711", border: "1px solid #6C5CE733", borderRadius: 8, padding: "8px 12px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <Icons.Text /><span style={{ fontSize: 11, color: "#6C5CE7", fontWeight: 600 }}>Klicke den Text in der Vorschau zum Bearbeiten</span>
          </div>
          <VarBtn field="text" />
          <TextInput label="Text (Fallback)" value={s.text} onChange={v => update("text", v)} multiline />
          <SelectInput label="Ebene" value={s.level} onChange={v => update("level", v)} options={[{ value: "h1", label: "H1 — Groß" }, { value: "h2", label: "H2 — Mittel" }, { value: "h3", label: "H3 — Klein" }]} />
          <SelectInput label="Ausrichtung" value={s.align} onChange={v => update("align", v)} options={[{ value: "left", label: "Links" }, { value: "center", label: "Mitte" }, { value: "right", label: "Rechts" }]} />
          <NumberInput label="Schriftgröße" value={s.fontSize} onChange={v => update("fontSize", v)} min={16} max={64} unit="px" />
          <ColorInput label="Grundfarbe" value={s.color} onChange={v => update("color", v)} />
        </>;
      case "text":
        return <>
          <div style={{ background: "#6C5CE711", border: "1px solid #6C5CE733", borderRadius: 8, padding: "8px 12px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <Icons.Text /><span style={{ fontSize: 11, color: "#6C5CE7", fontWeight: 600 }}>Klicke den Text in der Vorschau zum Bearbeiten</span>
          </div>
          <VarBtn field="text" />
          <TextInput label="Text (Fallback)" value={s.text} onChange={v => update("text", v)} multiline />
          <SelectInput label="Ausrichtung" value={s.align} onChange={v => update("align", v)} options={[{ value: "left", label: "Links" }, { value: "center", label: "Mitte" }, { value: "right", label: "Rechts" }]} />
          <NumberInput label="Schriftgröße" value={s.fontSize} onChange={v => update("fontSize", v)} min={12} max={28} unit="px" />
          <NumberInput label="Zeilenhöhe" value={s.lineHeight} onChange={v => update("lineHeight", v)} min={1} max={2.5} step={0.1} />
          <ColorInput label="Grundfarbe" value={s.color} onChange={v => update("color", v)} />
        </>;
      case "image": {
        const uploadImage = async (file: File) => {
          if (!file.type.startsWith("image/")) { toast.error("Nur Bilder erlaubt"); return; }
          if (file.size > 5 * 1024 * 1024) { toast.error("Max. 5 MB"); return; }
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { toast.error("Nicht eingeloggt"); return; }
            const ext = file.name.split(".").pop() || "png";
            const fileName = `${user.id}/images/${Date.now()}.${ext}`;
            const { error: uploadErr } = await supabase.storage
              .from("avatars")
              .upload(fileName, file, { upsert: true, contentType: file.type });
            if (uploadErr) throw uploadErr;
            const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
            update("src", publicUrl);
            toast.success("Bild hochgeladen");
          } catch (err: any) {
            console.error("Image upload error:", err);
            toast.error("Upload fehlgeschlagen: " + (err?.message || ""));
          }
        };
        return <>
          {s.src ? (
            <div style={{ marginBottom: 8 }}>
              <img src={s.src} alt="" style={{ width: "100%", maxHeight: 120, objectFit: "contain", borderRadius: 6, marginBottom: 6 }} />
              <div style={{ display: "flex", gap: 6 }}>
                <div
                  onClick={() => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.onchange = () => { if (inp.files?.[0]) uploadImage(inp.files[0]); }; inp.click(); }}
                  style={{ cursor: "pointer", color: "#6C5CE7", fontSize: 11, fontWeight: 600 }}
                >Ersetzen</div>
                <div onClick={() => update("src", "")} style={{ cursor: "pointer", color: "#ff6b6b88", fontSize: 11 }}>Entfernen</div>
              </div>
            </div>
          ) : (
            <div
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#6C5CE7"; }}
              onDragLeave={e => { e.currentTarget.style.borderColor = "#ffffff18"; }}
              onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#ffffff18"; const f = e.dataTransfer.files[0]; if (f) uploadImage(f); }}
              onClick={() => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.onchange = () => { if (inp.files?.[0]) uploadImage(inp.files[0]); }; inp.click(); }}
              style={{ padding: "16px 8px", borderRadius: 6, border: "2px dashed #ffffff18", background: "#ffffff04", textAlign: "center", cursor: "pointer", fontSize: 11, color: "#ffffff44", transition: "border-color 0.2s", marginBottom: 8 }}
            >
              Bild hochladen oder hierher ziehen
            </div>
          )}
          <TextInput label="oder Bild-URL" value={s.src} onChange={v => update("src", v)} placeholder="https://..." />
          <TextInput label="Alt Text" value={s.alt} onChange={v => update("alt", v)} />
          <NumberInput label="Rundung" value={s.borderRadius} onChange={v => update("borderRadius", v)} min={0} max={50} unit="px" />
        </>;
      }
      case "video":
        return <>
          <VarBtn field="src" />
          <TextInput label="Video URL / Variable" value={s.src} onChange={v => update("src", v)} />
          <TextInput label="Poster URL" value={s.posterSrc} onChange={v => update("posterSrc", v)} />
          <ToggleInput label="Autoplay" value={s.autoplay} onChange={v => update("autoplay", v)} />
          <ToggleInput label="Controls anzeigen" value={s.controls} onChange={v => update("controls", v)} />
          <NumberInput label="Rundung" value={s.borderRadius} onChange={v => update("borderRadius", v)} min={0} max={50} unit="px" />
        </>;
      case "button":
        return <>
          <VarBtn field="text" />
          <TextInput label="Button Text" value={s.text} onChange={v => update("text", v)} />
          <VarBtn field="url" />
          <TextInput label="Link URL" value={s.url} onChange={v => update("url", v)} />
          <ColorInput label="Hintergrund" value={s.bgColor} onChange={v => update("bgColor", v)} />
          <ColorInput label="Textfarbe" value={s.textColor} onChange={v => update("textColor", v)} />
          <NumberInput label="Rundung" value={s.borderRadius} onChange={v => update("borderRadius", v)} min={0} max={50} unit="px" />
          <NumberInput label="Schriftgröße" value={s.fontSize} onChange={v => update("fontSize", v)} min={12} max={28} unit="px" />
          <ToggleInput label="Volle Breite" value={s.fullWidth} onChange={v => update("fullWidth", v)} />
          <SelectInput label="Animation" value={s.animation} onChange={v => update("animation", v)} options={[{ value: "none", label: "Keine" }, { value: "pulse", label: "Pulsieren" }, { value: "shake", label: "Schütteln" }, { value: "glow", label: "Leuchten" }]} />
        </>;
      case "form":
        return <>
          <TextInput label="Submit Text" value={s.submitText} onChange={v => update("submitText", v)} />
          <ColorInput label="Submit Farbe" value={s.submitColor} onChange={v => update("submitColor", v)} />
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: "#ffffff66", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Felder</div>
            {(s.fields || []).map((f: any, i: number) => (
              <div key={i} style={{ background: "#ffffff08", borderRadius: 8, padding: 10, marginBottom: 8, border: "1px solid #ffffff0d" }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  <input value={f.label} onChange={e => { const nf = [...s.fields]; nf[i] = { ...nf[i], label: e.target.value }; update("fields", nf); }} style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #ffffff18", background: "#ffffff08", color: "#fff", fontSize: 12, outline: "none" }} />
                  <select value={f.type} onChange={e => { const nf = [...s.fields]; nf[i] = { ...nf[i], type: e.target.value }; update("fields", nf); }} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #ffffff18", background: "#0d0d14", color: "#fff", fontSize: 12 }}>
                    <option value="text">Text</option><option value="email">E-Mail</option><option value="tel">Telefon</option><option value="number">Zahl</option><option value="textarea">Textarea</option>
                  </select>
                  <div onClick={() => { const nf = s.fields.filter((_: any, j: number) => j !== i); update("fields", nf); }} style={{ cursor: "pointer", color: "#ff6b6b88", padding: "6px", display: "flex", alignItems: "center" }}><Icons.Trash /></div>
                </div>
                <ToggleInput label="Pflichtfeld" value={f.required} onChange={v => { const nf = [...s.fields]; nf[i] = { ...nf[i], required: v }; update("fields", nf); }} />
              </div>
            ))}
            <div onClick={() => update("fields", [...(s.fields || []), { label: "Neues Feld", type: "text", placeholder: "", required: false }])} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#6C5CE7", fontSize: 12, fontWeight: 600, padding: "8px 0" }}><Icons.Plus /> Feld hinzufügen</div>
          </div>
        </>;
      case "spacer": return <NumberInput label="Höhe" value={s.height} onChange={v => update("height", v)} min={8} max={200} unit="px" />;
      case "divider":
        return <>
          <ColorInput label="Farbe" value={s.color} onChange={v => update("color", v)} />
          <NumberInput label="Dicke" value={s.thickness} onChange={v => update("thickness", v)} min={1} max={8} unit="px" />
          <SelectInput label="Stil" value={s.style} onChange={v => update("style", v)} options={[{ value: "solid", label: "Durchgezogen" }, { value: "dashed", label: "Gestrichelt" }, { value: "dotted", label: "Gepunktet" }]} />
        </>;
      case "testimonial":
        return <>
          <TextInput label="Zitat" value={s.quote} onChange={v => update("quote", v)} multiline />
          <TextInput label="Name" value={s.author} onChange={v => update("author", v)} />
          <TextInput label="Rolle" value={s.role} onChange={v => update("role", v)} />
          <TextInput label="Bild-URL" value={s.image_url} onChange={v => update("image_url", v)} placeholder="https://..." />
          <NumberInput label="Sterne" value={s.rating} onChange={v => update("rating", v)} min={1} max={5} />
        </>;
      case "quiz":
        return <>
          <VarBtn field="question" />
          <TextInput label="Frage" value={s.question} onChange={v => update("question", v)} multiline />
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: "#ffffff66", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Optionen</div>
            {(s.options || []).map((opt: string, i: number) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input value={opt} onChange={e => { const no = [...s.options]; no[i] = e.target.value; update("options", no); }} style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #ffffff18", background: "#ffffff08", color: "#fff", fontSize: 12, outline: "none" }} />
                <div onClick={() => update("options", s.options.filter((_: any, j: number) => j !== i))} style={{ cursor: "pointer", color: "#ff6b6b88", padding: "6px", display: "flex", alignItems: "center" }}><Icons.Trash /></div>
              </div>
            ))}
            <div onClick={() => update("options", [...(s.options || []), "Neue Option"])} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#6C5CE7", fontSize: 12, fontWeight: 600, padding: "8px 0" }}><Icons.Plus /> Option hinzufügen</div>
          </div>
          <ToggleInput label="Mehrfachauswahl" value={s.multiSelect} onChange={v => update("multiSelect", v)} />
        </>;
      case "calendar":
        return <>
          <VarBtn field="calendarUrl" />
          <TextInput label="Kalender URL" value={s.calendarUrl} onChange={v => update("calendarUrl", v)} />
          <NumberInput label="Höhe" value={s.height} onChange={v => update("height", v)} min={200} max={800} unit="px" />
        </>;
      case "logo": {
        const normalizedLogos = (s.logos || []).map((l: any) => typeof l === "string" ? { text: l, imageUrl: "" } : l);

        const uploadLogoImage = async (file: File, logoIndex: number) => {
          if (!file.type.startsWith("image/")) { toast.error("Nur Bilder erlaubt"); return; }
          if (file.size > 5 * 1024 * 1024) { toast.error("Max. 5 MB"); return; }
          try {
            // Get current user ID for storage path (RLS requires uid as first folder)
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { toast.error("Nicht eingeloggt"); return; }
            const ext = file.name.split(".").pop() || "png";
            const fileName = `${user.id}/logos/${Date.now()}_${logoIndex}.${ext}`;
            const { error: uploadErr } = await supabase.storage
              .from("avatars")
              .upload(fileName, file, { upsert: true, contentType: file.type });
            if (uploadErr) throw uploadErr;
            const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
            const nl = [...normalizedLogos];
            nl[logoIndex] = { ...nl[logoIndex], imageUrl: publicUrl };
            update("logos", nl);
            toast.success("Logo hochgeladen");
          } catch (err: any) {
            console.error("Logo upload error:", err);
            toast.error("Upload fehlgeschlagen: " + (err?.message || "Unbekannter Fehler"));
          }
        };

        return <>
          <TextInput label="Überschrift" value={s.text} onChange={v => update("text", v)} />
          <div style={{ fontSize: 11, color: "#ffffff66", fontWeight: 600, textTransform: "uppercase", marginBottom: 8, marginTop: 8 }}>Logos</div>
          {normalizedLogos.map((logo: any, i: number) => (
            <div key={i} style={{ marginBottom: 10, padding: 8, borderRadius: 8, border: "1px solid #ffffff10", background: "#ffffff05" }}>
              {logo.imageUrl ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <img src={logo.imageUrl} alt="" style={{ height: 32, objectFit: "contain", borderRadius: 4 }} />
                  <div onClick={() => { const nl = [...normalizedLogos]; nl[i] = { ...nl[i], imageUrl: "" }; update("logos", nl); }} style={{ cursor: "pointer", color: "#ff6b6b88", fontSize: 11, flex: 1 }}>Ersetzen</div>
                  <div onClick={() => update("logos", normalizedLogos.filter((_: any, j: number) => j !== i))} style={{ cursor: "pointer", color: "#ff6b6b88", padding: "4px" }}><Icons.Trash /></div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div
                    onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#6C5CE7"; }}
                    onDragLeave={e => { e.currentTarget.style.borderColor = "#ffffff18"; }}
                    onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#ffffff18"; const f = e.dataTransfer.files[0]; if (f) uploadLogoImage(f, i); }}
                    onClick={() => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.onchange = () => { if (inp.files?.[0]) uploadLogoImage(inp.files[0], i); }; inp.click(); }}
                    style={{ flex: 1, padding: "12px 8px", borderRadius: 6, border: "2px dashed #ffffff18", background: "#ffffff04", textAlign: "center", cursor: "pointer", fontSize: 11, color: "#ffffff44", transition: "border-color 0.2s" }}
                  >
                    Logo-Bild hochladen
                  </div>
                  <div onClick={() => update("logos", normalizedLogos.filter((_: any, j: number) => j !== i))} style={{ cursor: "pointer", color: "#ff6b6b88", padding: "4px" }}><Icons.Trash /></div>
                </div>
              )}
            </div>
          ))}
          <div onClick={() => update("logos", [...normalizedLogos, { text: "Logo", imageUrl: "" }])} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#6C5CE7", fontSize: 12, fontWeight: 600, marginTop: 4 }}><Icons.Plus /> Logo hinzufügen</div>
        </>;
      }
      case "timer":
        return <>
          <TextInput label="Label" value={s.label} onChange={v => update("label", v)} />
          <NumberInput label="Stunden" value={s.hours} onChange={v => update("hours", v)} min={1} max={168} />
          <ColorInput label="Textfarbe" value={s.textColor} onChange={v => update("textColor", v)} />
          <ColorInput label="Hintergrund" value={s.bgColor} onChange={v => update("bgColor", v)} />
        </>;
      case "social":
        return <>
          <TextInput label="Zahl" value={s.number} onChange={v => update("number", v)} />
          <TextInput label="Label" value={s.label} onChange={v => update("label", v)} />
        </>;
      case "html": {
        return <>
          <div style={{ fontSize: 11, color: "#ffffff66", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>HTML Code</div>
          <textarea
            value={s.code || ""}
            onChange={e => update("code", e.target.value)}
            spellCheck={false}
            style={{
              width: "100%", minHeight: 200, padding: "10px", borderRadius: 8,
              border: "1px solid #ffffff18", background: "#0d0d14", color: "#e2e8f0",
              fontSize: 12, fontFamily: "monospace", lineHeight: 1.5, outline: "none",
              resize: "vertical", boxSizing: "border-box",
            }}
          />
          <div style={{ fontSize: 10, color: "#ffffff33", marginTop: 4 }}>
            Variablen wie {"{{lead.firstName}}"} werden automatisch ersetzt.
          </div>
        </>;
      }
      default: return <div style={{ color: "#ffffff44", fontSize: 13 }}>Keine Einstellungen verfügbar.</div>;
    }
  })();

  return <div style={{ position: "relative" }}>
    {showVarPicker && <VariablePicker onInsert={insertVar} onClose={() => setShowVarPicker(false)} />}
    {content}
  </div>;
}

// --- TRACKING LINK GENERATOR ---
function TrackingLinkPanel({ pageSettings }: { pageSettings: PageSettings }) {
  const baseUrl = pageSettings.customDomain || window.location.origin;
  const exampleLink = `${baseUrl}/lp/${pageSettings.slug || "mein-funnel"}?tid={{tracking.id}}&utm_source={{tracking.utm_source}}&fn={{lead.firstName}}&co={{lead.company}}`;
  const resolvedLink = `${baseUrl}/lp/${pageSettings.slug || "mein-funnel"}?tid=trk_abc123&utm_source=linkedin&fn=Max&co=Acme+GmbH`;

  return <div style={{ padding: 16 }}>
    <h4 style={{ margin: "0 0 12px 0", fontSize: 14, color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}><Icons.Link /> Tracking Link</h4>
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: "#ffffff66", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Template URL (mit Variablen)</div>
      <div style={{ background: "#ffffff08", borderRadius: 8, padding: 10, fontSize: 11, color: "#6C5CE7", fontFamily: "monospace", wordBreak: "break-all", border: "1px solid #6C5CE722", lineHeight: 1.6 }}>{exampleLink}</div>
    </div>
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: "#ffffff66", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Beispiel (aufgelöst)</div>
      <div style={{ background: "#ffffff08", borderRadius: 8, padding: 10, fontSize: 11, color: "#00b894", fontFamily: "monospace", wordBreak: "break-all", border: "1px solid #00b89422", lineHeight: 1.6 }}>{resolvedLink}</div>
    </div>
    <div style={{ background: "#6C5CE711", borderRadius: 8, padding: 12, border: "1px solid #6C5CE722" }}>
      <div style={{ fontSize: 11, color: "#6C5CE7", fontWeight: 600, marginBottom: 6 }}>Tracking Capabilities</div>
      <div style={{ fontSize: 11, color: "#ffffff88", lineHeight: 1.8 }}>
        Page View Tracking &bull; Time on Page &bull; Video Watch % &bull; CTA Klicks<br/>
        Form Submissions &bull; Quiz Antworten &bull; Scroll Depth &bull; UTM Parameter
      </div>
    </div>
  </div>;
}

// --- PAGE SETTINGS PANEL ---
function PageSettingsPanel({ pageSettings, onChange }: { pageSettings: PageSettings; onChange: (s: PageSettings) => void }) {
  const update = (k: string, v: any) => onChange({ ...pageSettings, [k]: v });
  return <div style={{ padding: 16 }}>
    <h4 style={{ margin: "0 0 16px 0", fontSize: 14, color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}><Icons.Settings /> Seiten-Einstellungen</h4>
    <TextInput label="Seitenname" value={pageSettings.name} onChange={v => update("name", v)} />
    <TextInput label="URL Slug" value={pageSettings.slug} onChange={v => update("slug", v)} placeholder="mein-funnel" />
    <TextInput label="Custom Domain" value={pageSettings.customDomain} onChange={v => update("customDomain", v)} placeholder="https://meine-domain.de" />
    <TextInput label="Favicon URL" value={pageSettings.favicon} onChange={v => update("favicon", v)} />
    <TextInput label="Meta Title" value={pageSettings.metaTitle} onChange={v => update("metaTitle", v)} />
    <TextInput label="Meta Description" value={pageSettings.metaDescription} onChange={v => update("metaDescription", v)} multiline />
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11, color: "#ffffff66", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Design Theme</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {THEMES.map((t, i) => (
          <div key={i} onClick={() => update("theme", i)} style={{ padding: 10, borderRadius: 10, background: t.bg, cursor: "pointer", border: pageSettings.theme === i ? `2px solid ${t.accent}` : "2px solid transparent", textAlign: "center", transition: "all 0.15s" }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: t.accent, margin: "0 auto 6px" }} />
            <div style={{ fontSize: 10, color: t.text, fontWeight: 600 }}>{t.name}</div>
          </div>
        ))}
      </div>
    </div>
    <div style={{ marginTop: 16 }}>
      <ColorInput label="Custom Akzentfarbe" value={pageSettings.accentOverride} onChange={v => update("accentOverride", v)} />
    </div>
    <div style={{ marginTop: 16 }}>
      <NumberInput label="Content Max-Breite" value={pageSettings.maxWidth} onChange={v => update("maxWidth", v)} min={320} max={720} unit="px" />
      <NumberInput label="Block-Abstand" value={pageSettings.blockGap} onChange={v => update("blockGap", v)} min={8} max={48} unit="px" />
      <NumberInput label="Seitenpadding" value={pageSettings.padding} onChange={v => update("padding", v)} min={12} max={60} unit="px" />
    </div>
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11, color: "#ffffff66", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Rechtliches (Footer)</div>
      <TextInput label="Impressum URL" value={(pageSettings as any).impressumUrl} onChange={v => update("impressumUrl", v)} placeholder="https://meine-seite.de/impressum" />
      <TextInput label="Datenschutz URL" value={(pageSettings as any).datenschutzUrl} onChange={v => update("datenschutzUrl", v)} placeholder="https://meine-seite.de/datenschutz" />
    </div>
  </div>;
}

// ================================================================
// MAIN BUILDER COMPONENT
// ================================================================
export default function FunnelBuilder({ pageId, onClose }: FunnelBuilderProps) {
  // --- STATE ---
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState("mobile");
  const [leftPanel, setLeftPanel] = useState("blocks");
  const [rightPanel, setRightPanel] = useState("settings");
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [pageStatus, setPageStatus] = useState<string>("draft");
  const [pageSlug, setPageSlug] = useState("");
  const [pageSettings, setPageSettings] = useState<PageSettings>({
    name: "", slug: "", customDomain: "", favicon: "",
    metaTitle: "", metaDescription: "", theme: 0, accentOverride: "",
    maxWidth: 480, blockGap: 20, padding: 24,
  });

  const theme = { ...THEMES[pageSettings.theme || 0], accent: pageSettings.accentOverride || THEMES[pageSettings.theme || 0].accent };
  const activeSlide = slides[activeSlideIdx] || null;
  const blocks = activeSlide?.blocks || [];
  const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;

  // --- LOAD PAGE FROM SUPABASE ---
  useEffect(() => {
    loadPage();
  }, [pageId]);

  const loadPage = async () => {
    setLoadingPage(true);
    try {
      const { data, error } = await supabase
        .from("landing_pages")
        .select("*")
        .eq("id", pageId)
        .single();

      if (error || !data) { toast.error("Seite nicht gefunden"); onClose(); return; }

      setPageStatus(data.status || "draft");
      setPageSlug(data.slug || "");

      const content = data.content as any;

      if (content?.slides) {
        // New format: slides-based
        setSlides(content.slides);
        if (content.settings) setPageSettings(content.settings);
      } else if (content?.blocks || Array.isArray(content)) {
        // Legacy: flat blocks array
        const legacyBlocks = content?.blocks || content;
        setSlides([{ id: "slide_1", name: "Startseite", blocks: Array.isArray(legacyBlocks) ? legacyBlocks : [] }]);
        setPageSettings(prev => ({ ...prev, name: data.name || prev.name, slug: data.slug || prev.slug }));
      } else {
        // Empty page - create default slide
        setSlides([{
          id: "slide_1", name: "Startseite",
          blocks: [
            { id: newId(), type: "spacer", settings: { height: 32 } },
            { id: newId(), type: "heading", settings: { ...BLOCK_TEMPLATES.heading.defaults } },
            { id: newId(), type: "spacer", settings: { height: 8 } },
            { id: newId(), type: "text", settings: { ...BLOCK_TEMPLATES.text.defaults } },
            { id: newId(), type: "spacer", settings: { height: 24 } },
            { id: newId(), type: "button", settings: { ...BLOCK_TEMPLATES.button.defaults } },
          ],
        }]);
        setPageSettings(prev => ({ ...prev, name: data.name || "Neue Seite", slug: data.slug || "" }));
      }
    } catch (err) {
      console.error("Error loading page:", err);
      toast.error("Fehler beim Laden");
      onClose();
    } finally {
      setLoadingPage(false);
    }
  };

  // --- SAVE TO SUPABASE ---
  const savePage = async () => {
    setSaving(true);
    try {
      const content = { slides, settings: pageSettings };
      const { error } = await supabase
        .from("landing_pages")
        .update({
          name: pageSettings.name,
          slug: pageSettings.slug,
          content: content as any,
          meta_title: pageSettings.metaTitle || pageSettings.name,
          meta_description: pageSettings.metaDescription || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pageId);

      if (error) {
        if (error.code === "23505") { toast.error("Dieser URL Slug wird bereits verwendet"); return; }
        throw error;
      }
      setPageSlug(pageSettings.slug);
      toast.success("Gespeichert!");
    } catch (err) {
      console.error("Error saving:", err);
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  // --- PUBLISH / UNPUBLISH ---
  const togglePublish = async () => {
    setPublishing(true);
    try {
      // Always save first
      const content = { slides, settings: pageSettings };
      const newStatus = pageStatus === "published" ? "draft" : "published";
      const { error } = await supabase
        .from("landing_pages")
        .update({
          name: pageSettings.name,
          slug: pageSettings.slug,
          content: content as any,
          status: newStatus,
          published_at: newStatus === "published" ? new Date().toISOString() : null,
          meta_title: pageSettings.metaTitle || pageSettings.name,
          meta_description: pageSettings.metaDescription || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pageId);

      if (error) throw error;
      setPageStatus(newStatus);
      setPageSlug(pageSettings.slug);
      toast.success(newStatus === "published" ? "Seite veröffentlicht!" : "Seite deaktiviert");
    } catch (err) {
      console.error("Error publishing:", err);
      toast.error("Fehler beim Veröffentlichen");
    } finally {
      setPublishing(false);
    }
  };

  // --- SLIDE MANAGEMENT ---
  const addSlide = () => {
    const ns: Slide = {
      id: newSlideId(),
      name: `Slide ${slides.length + 1}`,
      blocks: [
        { id: newId(), type: "spacer", settings: { height: 32 } },
        { id: newId(), type: "heading", settings: { text: "Neuer Slide", level: "h1", align: "center", color: "#ffffff", fontSize: 32 } },
        { id: newId(), type: "spacer", settings: { height: 24 } },
      ],
    };
    setSlides([...slides, ns]);
    setActiveSlideIdx(slides.length);
    setSelectedBlockId(null);
  };

  const deleteSlide = (idx: number) => {
    if (slides.length <= 1) { toast.error("Mindestens ein Slide erforderlich"); return; }
    const ns = slides.filter((_, i) => i !== idx);
    setSlides(ns);
    if (activeSlideIdx >= ns.length) setActiveSlideIdx(ns.length - 1);
    setSelectedBlockId(null);
  };

  const renameSlide = (idx: number, name: string) => {
    const ns = [...slides];
    ns[idx] = { ...ns[idx], name };
    setSlides(ns);
  };

  const moveSlide = (idx: number, dir: number) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= slides.length) return;
    const ns = [...slides];
    [ns[idx], ns[targetIdx]] = [ns[targetIdx], ns[idx]];
    setSlides(ns);
    setActiveSlideIdx(targetIdx);
  };

  const duplicateSlide = (idx: number) => {
    const original = slides[idx];
    const ns: Slide = {
      id: newSlideId(),
      name: `${original.name} (Kopie)`,
      blocks: original.blocks.map(b => ({ ...b, id: newId(), settings: { ...b.settings } })),
    };
    const updated = [...slides];
    updated.splice(idx + 1, 0, ns);
    setSlides(updated);
    setActiveSlideIdx(idx + 1);
  };

  // --- BLOCK MANAGEMENT (within active slide) ---
  const updateBlocks = (newBlocks: Block[]) => {
    const ns = [...slides];
    ns[activeSlideIdx] = { ...ns[activeSlideIdx], blocks: newBlocks };
    setSlides(ns);
  };

  const addBlock = (type: string) => {
    const tpl = BLOCK_TEMPLATES[type];
    const nb: Block = { id: newId(), type, settings: { ...tpl.defaults } };
    const idx = selectedBlockId ? blocks.findIndex(b => b.id === selectedBlockId) + 1 : blocks.length;
    const newBlocks = [...blocks];
    newBlocks.splice(idx, 0, nb);
    updateBlocks(newBlocks);
    setSelectedBlockId(nb.id);
  };

  const updateBlock = (updated: Block) => { updateBlocks(blocks.map(b => b.id === updated.id ? updated : b)); };
  const deleteBlock = (id: string) => { updateBlocks(blocks.filter(b => b.id !== id)); if (selectedBlockId === id) setSelectedBlockId(null); };
  const duplicateBlock = (id: string) => {
    const idx = blocks.findIndex(b => b.id === id);
    const dup = { ...blocks[idx], id: newId(), settings: { ...blocks[idx].settings } };
    const nb = [...blocks]; nb.splice(idx + 1, 0, dup);
    updateBlocks(nb);
  };
  const moveBlock = (id: string, dir: number) => {
    const idx = blocks.findIndex(b => b.id === id);
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === blocks.length - 1)) return;
    const nb = [...blocks]; [nb[idx], nb[idx + dir]] = [nb[idx + dir], nb[idx]];
    updateBlocks(nb);
  };

  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDrop = (idx: number) => {
    if (draggedIdx === null || draggedIdx === idx) { setDraggedIdx(null); setDragOverIdx(null); return; }
    const nb = [...blocks]; const [moved] = nb.splice(draggedIdx, 1); nb.splice(idx, 0, moved);
    updateBlocks(nb); setDraggedIdx(null); setDragOverIdx(null);
  };

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); savePage(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [slides, pageSettings]);

  // --- LOADING STATE ---
  if (loadingPage) {
    return (
      <div style={{ display: "flex", height: "100vh", background: "#08080d", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid #6C5CE744", borderTopColor: "#6C5CE7", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <div style={{ fontSize: 14, color: "#ffffff88" }}>Seite wird geladen...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#08080d", fontFamily: "'Satoshi', 'DM Sans', 'Inter', system-ui, sans-serif", color: "#fff", overflow: "hidden", position: "fixed", inset: 0, zIndex: 100 }}>
      {/* === TOP BAR === */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 52, background: "#0d0d14", borderBottom: "1px solid #ffffff0d", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div onClick={onClose} style={{ cursor: "pointer", color: "#ffffff88", display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#ffffff11")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <Icons.ArrowLeft /> <span style={{ fontSize: 13, fontWeight: 500 }}>Zurück</span>
          </div>
          <div style={{ width: 1, height: 24, background: "#ffffff11" }} />
          <div style={{ fontSize: 13, color: "#ffffff88", fontWeight: 500 }}>{pageSettings.name || "Unbenannt"}</div>
          {pageStatus === "published" && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#00b894", background: "#00b89422", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>
              <Icons.Globe /> Live
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Preview mode toggle */}
          <div style={{ display: "flex", background: "#ffffff08", borderRadius: 8, padding: 2, gap: 2 }}>
            {([["mobile", Icons.Phone], ["desktop", Icons.Desktop]] as [string, React.FC][]).map(([mode, Icon]) => (
              <div key={mode} onClick={() => setPreviewMode(mode)} style={{ padding: "6px 12px", borderRadius: 6, cursor: "pointer", background: previewMode === mode ? "#6C5CE733" : "transparent", color: previewMode === mode ? "#6C5CE7" : "#ffffff55", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, transition: "all 0.15s" }}>
                <Icon /> {mode === "mobile" ? "Mobile" : "Desktop"}
              </div>
            ))}
          </div>
          <div style={{ width: 1, height: 24, background: "#ffffff11", margin: "0 4px" }} />
          {/* Preview button */}
          {pageStatus === "published" && pageSlug && (
            <button onClick={() => window.open(`/lp/${pageSlug}`, "_blank")} style={{ padding: "7px 12px", borderRadius: 8, border: "none", background: "#ffffff08", color: "#ffffffaa", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <Icons.Eye /> Ansehen
            </button>
          )}
          {/* Save button */}
          <button onClick={savePage} disabled={saving} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "#6C5CE7", color: "#fff", cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 12px #6C5CE744", opacity: saving ? 0.7 : 1 }}>
            <Icons.Save /> {saving ? "..." : "Speichern"}
          </button>
          {/* Publish button */}
          <button onClick={togglePublish} disabled={publishing} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: pageStatus === "published" ? "#ffffff15" : "#00b894", color: "#fff", cursor: publishing ? "wait" : "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, boxShadow: pageStatus === "published" ? "none" : "0 2px 12px #00b89444", opacity: publishing ? 0.7 : 1 }}>
            <Icons.Globe /> {publishing ? "..." : pageStatus === "published" ? "Deaktivieren" : "Veröffentlichen"}
          </button>
        </div>
      </div>

      {/* === LEFT SIDEBAR === */}
      <div style={{ width: 260, background: "#0d0d14", borderRight: "1px solid #ffffff0d", marginTop: 52, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ display: "flex", borderBottom: "1px solid #ffffff0d" }}>
          {([["blocks", "Blöcke", Icons.Plus], ["layers", "Ebenen", Icons.Layers], ["slides", "Slides", Icons.Slide]] as [string, string, React.FC][]).map(([key, label, Icon]) => (
            <div key={key} onClick={() => setLeftPanel(key)} style={{ flex: 1, padding: "10px 0", textAlign: "center", cursor: "pointer", fontSize: 11, fontWeight: 600, color: leftPanel === key ? "#6C5CE7" : "#ffffff55", borderBottom: leftPanel === key ? "2px solid #6C5CE7" : "2px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, transition: "all 0.15s" }}>
              <Icon /> {label}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
          {/* Block palette */}
          {leftPanel === "blocks" && BLOCK_CATEGORIES.map(cat => (
            <div key={cat.name} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "#ffffff44", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8, paddingLeft: 4 }}>{cat.name}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {cat.blocks.map(bKey => {
                  const tpl = BLOCK_TEMPLATES[bKey];
                  const Icon = Icons[tpl.icon];
                  return <div key={bKey} onClick={() => addBlock(bKey)} style={{ padding: "10px 8px", borderRadius: 8, background: "#ffffff06", border: "1px solid #ffffff0a", cursor: "pointer", textAlign: "center", transition: "all 0.15s", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#6C5CE711"; e.currentTarget.style.borderColor = "#6C5CE733"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#ffffff06"; e.currentTarget.style.borderColor = "#ffffff0a"; }}>
                    <div style={{ color: "#ffffff66" }}>{Icon && <Icon />}</div>
                    <div style={{ fontSize: 10, color: "#ffffffaa", fontWeight: 600 }}>{tpl.label}</div>
                  </div>;
                })}
              </div>
            </div>
          ))}

          {/* Layers panel */}
          {leftPanel === "layers" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {blocks.map((block, idx) => {
                const tpl = BLOCK_TEMPLATES[block.type];
                const Icon = tpl ? Icons[tpl.icon] : null;
                return <div key={block.id} onClick={() => { setSelectedBlockId(block.id); setRightPanel("settings"); }}
                  draggable onDragStart={() => handleDragStart(idx)} onDragOver={e => handleDragOver(e, idx)} onDrop={() => handleDrop(idx)}
                  style={{ padding: "8px 10px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, background: selectedBlockId === block.id ? "#6C5CE722" : dragOverIdx === idx ? "#ffffff11" : "transparent", border: selectedBlockId === block.id ? "1px solid #6C5CE744" : "1px solid transparent", transition: "all 0.1s" }}>
                  <div style={{ color: "#ffffff33", cursor: "grab" }}><Icons.GripVertical /></div>
                  <div style={{ color: selectedBlockId === block.id ? "#6C5CE7" : "#ffffff55" }}>{Icon && <Icon />}</div>
                  <div style={{ fontSize: 12, color: selectedBlockId === block.id ? "#fff" : "#ffffff88", fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {tpl?.label || block.type}
                  </div>
                  <div onClick={e => { e.stopPropagation(); deleteBlock(block.id); }} style={{ color: "#ffffff33", cursor: "pointer", padding: 2 }}><Icons.Trash /></div>
                </div>;
              })}
            </div>
          )}

          {/* Slides panel */}
          {leftPanel === "slides" && (
            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {slides.map((slide, idx) => (
                  <div key={slide.id} onClick={() => { setActiveSlideIdx(idx); setSelectedBlockId(null); }}
                    style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", background: activeSlideIdx === idx ? "#6C5CE722" : "#ffffff06", border: activeSlideIdx === idx ? "1px solid #6C5CE744" : "1px solid #ffffff0a", transition: "all 0.15s" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: activeSlideIdx === idx ? "#6C5CE7" : "#ffffff15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: activeSlideIdx === idx ? "#fff" : "#ffffff66" }}>
                          {idx + 1}
                        </div>
                        <input
                          value={slide.name}
                          onChange={e => renameSlide(idx, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          style={{ background: "transparent", border: "none", color: activeSlideIdx === idx ? "#fff" : "#ffffffaa", fontSize: 12, fontWeight: 600, outline: "none", width: 120 }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 2 }}>
                        <div onClick={e => { e.stopPropagation(); moveSlide(idx, -1); }} style={{ cursor: "pointer", color: "#ffffff33", padding: 2 }}><Icons.Up /></div>
                        <div onClick={e => { e.stopPropagation(); moveSlide(idx, 1); }} style={{ cursor: "pointer", color: "#ffffff33", padding: 2 }}><Icons.Down /></div>
                        <div onClick={e => { e.stopPropagation(); duplicateSlide(idx); }} style={{ cursor: "pointer", color: "#ffffff33", padding: 2 }}><Icons.Copy /></div>
                        <div onClick={e => { e.stopPropagation(); deleteSlide(idx); }} style={{ cursor: "pointer", color: "#ff6b6b66", padding: 2 }}><Icons.Trash /></div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: "#ffffff44", marginTop: 4 }}>
                      {slide.blocks.length} Blöcke
                    </div>
                  </div>
                ))}
              </div>
              <div onClick={addSlide} style={{ marginTop: 8, padding: "10px 12px", borderRadius: 8, border: "2px dashed #ffffff15", cursor: "pointer", textAlign: "center", fontSize: 12, color: "#ffffff55", fontWeight: 600, transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#6C5CE755"; e.currentTarget.style.color = "#6C5CE7"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#ffffff15"; e.currentTarget.style.color = "#ffffff55"; }}>
                + Neuer Slide
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === CENTER: Live Preview === */}
      <div style={{ flex: 1, marginTop: 52, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Slide tabs bar */}
        {slides.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 16px", background: "#0a0a10", borderBottom: "1px solid #ffffff0d", overflowX: "auto" }}>
            {slides.map((slide, idx) => (
              <div key={slide.id} onClick={() => { setActiveSlideIdx(idx); setSelectedBlockId(null); }}
                style={{ padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, color: activeSlideIdx === idx ? "#fff" : "#ffffff55", background: activeSlideIdx === idx ? "#6C5CE733" : "transparent", border: activeSlideIdx === idx ? "1px solid #6C5CE744" : "1px solid transparent", transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0 }}>
                {slide.name}
              </div>
            ))}
          </div>
        )}

        {/* Preview area */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "flex-start", overflowY: "auto", padding: "24px 0", background: "#08080d" }}>
          <div style={{
            width: previewMode === "mobile" ? 390 : Math.min(pageSettings.maxWidth + 80, 720),
            minHeight: previewMode === "mobile" ? 760 : 600,
            background: theme.bg,
            borderRadius: previewMode === "mobile" ? 40 : 12,
            boxShadow: "0 0 0 1px #ffffff0d, 0 20px 60px #00000066",
            position: "relative",
            overflow: "hidden",
            transition: "width 0.3s ease",
          }}>
            {previewMode === "mobile" && (
              <div style={{ position: "relative", height: 48, display: "flex", justifyContent: "center", paddingTop: 8 }}>
                <div style={{ width: 120, height: 28, background: "#000", borderRadius: 20 }} />
              </div>
            )}

            <div style={{ padding: pageSettings.padding || 24, display: "flex", flexDirection: "column", gap: pageSettings.blockGap || 20, maxWidth: pageSettings.maxWidth || 480, margin: "0 auto" }}>
              {blocks.map((block, idx) => {
                const isTextBlock = ["heading", "text", "button"].includes(block.type);
                const isEditing = selectedBlockId === block.id && isTextBlock;
                return <div key={block.id}
                  onClick={() => { setSelectedBlockId(block.id); setRightPanel("settings"); }}
                  draggable={!isEditing}
                  onDragStart={() => !isEditing && handleDragStart(idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  style={{
                    position: "relative", borderRadius: 8,
                    outline: selectedBlockId === block.id ? `2px solid ${theme.accent}` : "2px solid transparent",
                    outlineOffset: 4, cursor: "pointer", transition: "outline-color 0.15s",
                    opacity: draggedIdx === idx ? 0.4 : 1,
                    ...(dragOverIdx === idx && draggedIdx !== idx ? { borderTop: `2px solid ${theme.accent}` } : {}),
                  }}>
                  {selectedBlockId === block.id && (
                    <div style={{ position: "absolute", top: -32, right: 0, display: "flex", gap: 2, background: "#1a1a2e", borderRadius: 8, padding: 3, boxShadow: "0 4px 12px #00000044", zIndex: 10, border: "1px solid #ffffff11" }}>
                      <div onClick={e => { e.stopPropagation(); moveBlock(block.id, -1); }} style={{ padding: "4px 6px", borderRadius: 4, cursor: "pointer", color: "#ffffff66" }}><Icons.Up /></div>
                      <div onClick={e => { e.stopPropagation(); moveBlock(block.id, 1); }} style={{ padding: "4px 6px", borderRadius: 4, cursor: "pointer", color: "#ffffff66" }}><Icons.Down /></div>
                      <div onClick={e => { e.stopPropagation(); duplicateBlock(block.id); }} style={{ padding: "4px 6px", borderRadius: 4, cursor: "pointer", color: "#ffffff66" }}><Icons.Copy /></div>
                      <div onClick={e => { e.stopPropagation(); deleteBlock(block.id); }} style={{ padding: "4px 6px", borderRadius: 4, cursor: "pointer", color: "#ff6b6b88" }}><Icons.Trash /></div>
                    </div>
                  )}
                  <BlockPreview block={block} theme={theme} previewMode={previewMode} onUpdate={updateBlock} isSelected={selectedBlockId === block.id} />
                </div>;
              })}

              <div onClick={() => setLeftPanel("blocks")} style={{ border: "2px dashed #ffffff15", borderRadius: 12, padding: 24, textAlign: "center", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = theme.accent + "55"; e.currentTarget.style.background = theme.accent + "08"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#ffffff15"; e.currentTarget.style.background = "transparent"; }}>
                <div style={{ color: "#ffffff44", fontSize: 13 }}>+ Block hinzufügen</div>
              </div>
            </div>

            {/* Slide navigation dots (perspective-style) */}
            {slides.length > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "16px 0 12px" }}>
                {slides.map((_, idx) => (
                  <div key={idx} onClick={() => { setActiveSlideIdx(idx); setSelectedBlockId(null); }}
                    style={{ width: activeSlideIdx === idx ? 24 : 8, height: 8, borderRadius: 4, background: activeSlideIdx === idx ? theme.accent : "#ffffff33", cursor: "pointer", transition: "all 0.2s" }} />
                ))}
              </div>
            )}

            {previewMode === "mobile" && (
              <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
                <div style={{ width: 120, height: 4, background: "#ffffff22", borderRadius: 2 }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* === RIGHT SIDEBAR === */}
      <div style={{ width: 300, background: "#0d0d14", borderLeft: "1px solid #ffffff0d", marginTop: 52, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ display: "flex", borderBottom: "1px solid #ffffff0d" }}>
          {([["settings", "Block", Icons.Settings], ["tracking", "Tracking", Icons.Link], ["page", "Seite", Icons.Paint]] as [string, string, React.FC][]).map(([key, label, Icon]) => (
            <div key={key} onClick={() => setRightPanel(key)} style={{ flex: 1, padding: "10px 0", textAlign: "center", cursor: "pointer", fontSize: 11, fontWeight: 600, color: rightPanel === key ? "#6C5CE7" : "#ffffff55", borderBottom: rightPanel === key ? "2px solid #6C5CE7" : "2px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, transition: "all 0.15s" }}>
              <Icon /> {label}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: rightPanel === "tracking" || rightPanel === "page" ? 0 : 16 }}>
          {rightPanel === "settings" && (
            selectedBlock ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  {Icons[BLOCK_TEMPLATES[selectedBlock.type]?.icon] && (() => { const I = Icons[BLOCK_TEMPLATES[selectedBlock.type].icon]; return <I />; })()}
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{BLOCK_TEMPLATES[selectedBlock.type]?.label}</div>
                </div>
                <BlockSettings block={selectedBlock} onChange={updateBlock} theme={theme} />
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#ffffff33" }}>
                <Icons.Settings />
                <div style={{ fontSize: 13, marginTop: 12 }}>Klicke einen Block um ihn zu bearbeiten</div>
              </div>
            )
          )}
          {rightPanel === "tracking" && <TrackingLinkPanel pageSettings={pageSettings} />}
          {rightPanel === "page" && <PageSettingsPanel pageSettings={pageSettings} onChange={setPageSettings} />}
        </div>
      </div>

      <style>{`
        input::placeholder, textarea::placeholder { color: #ffffff33; }
        select option { background: #0d0d14; }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(4px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
