// Survey configuration based on the uploaded survey engine
export interface SurveyOption {
  v: string;
  l: string;
  icon?: string;
  tag?: string;
  testimonial?: boolean;
}

export interface SurveyQuestion {
  id: string;
  type: "scale" | "choice" | "text";
  q: string;
  lo?: string;
  hi?: string;
  opts?: SurveyOption[];
  ph?: string;
  req?: boolean;
  testimonial?: boolean;
  showIf?: string;
}

export interface SurveyConfig {
  id: string;
  title: string;
  sub: string;
  day: number;
  recurring?: boolean;
  questions: SurveyQuestion[];
}

export const SURVEYS: Record<string, SurveyConfig> = {
  day7: {
    id: "day7",
    title: "7-Tage Check-In",
    sub: "2 Min – wie läuft dein Start?",
    day: 7,
    questions: [
      { id: "onboarding", type: "scale", q: "Wie klar war das Onboarding für dich?", lo: "Völlig unklar", hi: "Glasklar" },
      { id: "plan_clarity", type: "scale", q: "Wie klar ist dir der Fahrplan für die nächsten 90 Tage?", lo: "Kein Plan", hi: "100% klar" },
      { id: "support_quality", type: "scale", q: "Wie bewertest du die bisherige Betreuungsqualität?", lo: "Schlecht", hi: "Exzellent" },
      { id: "motivation", type: "scale", q: "Wie motiviert bist du gerade, Gas zu geben?", lo: "Gar nicht", hi: "Maximal" },
      {
        id: "first_bottleneck", type: "choice", q: "Wo hängt es aktuell am meisten?",
        opts: [
          { v: "positioning", l: "Positionierung / Angebot unklar", icon: "🎯" },
          { v: "profile", l: "LinkedIn-Profil steht noch nicht", icon: "👤" },
          { v: "outreach_start", l: "Weiß nicht wo ich beim Outreach anfangen soll", icon: "📤" },
          { v: "content", l: "Content-Erstellung überfordert mich", icon: "✍️" },
          { v: "time", l: "Zeitmanagement – komme nicht hinterher", icon: "⏰" },
          { v: "mindset", l: "Mindset / Unsicherheit", icon: "🧠" },
          { v: "nothing", l: "Nirgends – läuft alles!", icon: "🚀" },
        ],
      },
      { id: "open_feedback", type: "text", q: "Was können wir besser machen? Was gefällt dir besonders?", ph: "Dein ehrliches Feedback...", req: false },
    ],
  },
  day21: {
    id: "day21",
    title: "21-Tage Fortschritts-Check",
    sub: "3 Min – wie weit bist du?",
    day: 21,
    questions: [
      { id: "progress_speed", type: "scale", q: "Wie schnell kommst du im Programm voran?", lo: "Stehe still", hi: "Raketentempo" },
      { id: "content_quality", type: "scale", q: "Wie bewertest du die Qualität der Trainings-Inhalte?", lo: "Schwach", hi: "Weltklasse" },
      { id: "support_response", type: "scale", q: "Wie schnell und hilfreich sind unsere Antworten?", lo: "Langsam/nutzlos", hi: "Blitzschnell & top" },
      { id: "calls_value", type: "scale", q: "Wie wertvoll sind die Live-Calls für dich?", lo: "Bringen nichts", hi: "Extrem wertvoll" },
      { id: "roi_feeling", type: "scale", q: "Wie sicher bist du, dass sich dein Investment auszahlen wird?", lo: "Sehr unsicher", hi: "100% sicher" },
      { id: "implementation", type: "scale", q: "Wie gut setzt du das Gelernte tatsächlich um?", lo: "Gar nicht", hi: "Alles umgesetzt" },
      { id: "recommendation", type: "scale", q: "Wie wahrscheinlich empfiehlst du das Programm weiter?", lo: "Gar nicht", hi: "Sofort jedem!" },
      {
        id: "bottleneck", type: "choice", q: "Wo ist aktuell dein größter Engpass?",
        opts: [
          { v: "leads", l: "Zu wenig Leads / Anfragen", icon: "📉" },
          { v: "lead_quality", l: "Leads sind da, aber Qualität stimmt nicht", icon: "🎯" },
          { v: "closing", l: "Closing-Rate zu niedrig", icon: "🤝" },
          { v: "content_consistency", l: "Content regelmäßig posten", icon: "✍️" },
          { v: "outreach_volume", l: "Outreach-Volumen zu gering", icon: "📤" },
          { v: "tech_setup", l: "Technisches Setup (Domains, Tools)", icon: "⚙️" },
          { v: "capacity", l: "Habe schon zu viele Anfragen für mich allein", icon: "🔥", tag: "scale_signal" },
          { v: "fulfillment", l: "Fulfillment / Kundenbetreuung wird eng", icon: "📦", tag: "scale_signal" },
          { v: "none", l: "Kein Engpass – läuft richtig gut!", icon: "🚀" },
        ],
      },
      { id: "biggest_win", type: "text", q: "Was ist dein größter Win seit Programmstart?", ph: "Erzähl – egal ob groß oder klein...", req: true, testimonial: true },
      { id: "improvement", type: "text", q: "Was wünschst du dir, das wir anders/besser machen?", ph: "Deine ehrliche Meinung...", req: false },
    ],
  },
  recurring: {
    id: "recurring",
    title: "Monatlicher Performance-Check",
    sub: "3 Min – tracke deinen Fortschritt",
    day: 30,
    recurring: true,
    questions: [
      { id: "month_overall", type: "scale", q: "Wie war der letzte Monat insgesamt für deine Agentur?", lo: "Katastrophe", hi: "Bester Monat ever" },
      { id: "coaching_value", type: "scale", q: "Wie viel Mehrwert hat dir das Coaching diesen Monat gebracht?", lo: "Keinen", hi: "Enormen Mehrwert" },
      { id: "calls_quality", type: "scale", q: "Qualität der Live-Calls diesen Monat?", lo: "Schwach", hi: "Weltklasse" },
      { id: "slack_support", type: "scale", q: "Qualität der Betreuung diesen Monat?", lo: "Schwach", hi: "Weltklasse" },
      { id: "content_relevance", type: "scale", q: "Wie relevant sind die Inhalte für deine aktuelle Situation?", lo: "Irrelevant", hi: "Perfekt passend" },
      { id: "umsetzung", type: "scale", q: "Wie konsequent setzt du die Trainings um?", lo: "Gar nicht", hi: "Zu 100%" },
      { id: "ergebnis_zufrieden", type: "scale", q: "Wie zufrieden bist du mit deinen bisherigen Ergebnissen?", lo: "Unzufrieden", hi: "Begeistert" },
      { id: "preis_leistung", type: "scale", q: "Wie bewertest du das Preis-Leistungs-Verhältnis?", lo: "Zu teuer", hi: "Absoluter Steal" },
      { id: "weiterempfehlung", type: "scale", q: "Wie wahrscheinlich empfiehlst du das Programm weiter? (NPS)", lo: "0 – Nie", hi: "10 – Sofort!" },
      {
        id: "monthly_revenue", type: "choice", q: "Dein Agentur-Umsatz im letzten Monat?",
        opts: [
          { v: "<10k", l: "Unter 10k", icon: "📊" },
          { v: "10-15k", l: "10–15k", icon: "📊" },
          { v: "15-25k", l: "15–25k", icon: "📈" },
          { v: "25-40k", l: "25–40k", icon: "📈", tag: "scale_zone" },
          { v: "40-60k", l: "40–60k", icon: "🚀", tag: "scale_ready" },
          { v: "60k+", l: "60k+", icon: "💎", tag: "premium_zone" },
        ],
      },
      {
        id: "new_clients_month", type: "choice", q: "Wie viele Neukunden diesen Monat?",
        opts: [
          { v: "0", l: "Keinen", icon: "0️⃣" },
          { v: "1", l: "1 Neukunde", icon: "1️⃣" },
          { v: "2-3", l: "2–3 Neukunden", icon: "🔥" },
          { v: "4+", l: "4+ Neukunden", icon: "🚀" },
        ],
      },
      {
        id: "bottleneck", type: "choice", q: "Dein größter Engpass aktuell?",
        opts: [
          { v: "leads", l: "Zu wenig Leads", icon: "📉" },
          { v: "closing", l: "Closing-Rate", icon: "🤝" },
          { v: "content", l: "Content-Konsistenz", icon: "✍️" },
          { v: "outreach", l: "Outreach-Volumen", icon: "📤" },
          { v: "capacity", l: "Kapazitätsgrenze – brauche Team", icon: "🔥", tag: "scale_signal" },
          { v: "fulfillment", l: "Fulfillment überfordert", icon: "📦", tag: "scale_signal" },
          { v: "vertrieb_team", l: "Brauche Vertriebler", icon: "👥", tag: "scale_signal" },
          { v: "processes", l: "Prozesse / Systeme fehlen", icon: "⚙️", tag: "scale_signal" },
          { v: "none", l: "Kein Engpass – alles top!", icon: "🚀" },
        ],
      },
      {
        id: "scale_interest", type: "choice", q: "Wir haben ein 1:1-Programm für Agenturen auf dem Weg zu 80k+/Monat. Interessant für dich?",
        showIf: "has_scale_signal",
        opts: [
          { v: "yes_now", l: "🔥 Ja, erzähl mir mehr!", tag: "upsell_hot" },
          { v: "yes_later", l: "📌 Interessant, aber nicht jetzt", tag: "upsell_warm" },
          { v: "maybe", l: "🤔 Kommt drauf an", tag: "upsell_lukewarm" },
          { v: "no", l: "❌ Passt gerade nicht" },
        ],
      },
      { id: "monthly_win", type: "text", q: "Dein größter Win diesen Monat?", ph: "Der Moment wo du dachtest: 'Ja, es funktioniert!'", req: true, testimonial: true },
      { id: "feedback", type: "text", q: "Sonstige Wünsche oder Feedback?", ph: "Alles was du loswerden willst...", req: false },
    ],
  },
};
