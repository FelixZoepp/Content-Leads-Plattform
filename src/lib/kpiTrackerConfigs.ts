import { KPIMetricConfig } from "@/components/client/KPIMetricTracker";

// ─── 1. OUTBOUND KPIs (aus Wissensdatenbank) ───

export const outboundKPIConfigs: KPIMetricConfig[] = [
  {
    key: "calls_per_day",
    label: "Anwahlen / Tag",
    icon: "📞",
    unit: "number",
    target: 150,
    higherIsBetter: true,
    criticalThreshold: 0.33, // <50 = critical
    getValue: (metrics) => {
      const latest = metrics[0];
      return latest?.calls_made != null ? Number(latest.calls_made) : null;
    },
    getImpact: (current, target) => {
      if (current >= target) return "Starkes Anrufvolumen – du nutzt den direktesten Kanal voll aus.";
      return `+${(target - current).toFixed(0)} Anwahlen/Tag = deutlich mehr Gesprächschancen.`;
    },
    actions: [
      "Power-Hour Blöcke einführen: 60 Min. am Stück nur telefonieren",
      "Signal-Leads (LinkedIn-Interaktion, Mail-Öffner) priorisiert abtelefonieren",
      "CRM/Dialer nutzen für effizientes Durchwahlverhalten",
      "Tagesplanung: Erste Stunde Signale, Rest kalte Anwahlen",
    ],
  },
  {
    key: "connect_rate",
    label: "Erreichbarkeitsquote Entscheider",
    icon: "🎯",
    unit: "%",
    target: 25,
    higherIsBetter: true,
    criticalThreshold: 0.6, // <15% = critical
    getValue: (metrics) => {
      const total = metrics.reduce((a, m) => ({
        made: a.made + (Number(m.calls_made) || 0),
        reached: a.reached + (Number(m.calls_reached) || 0),
      }), { made: 0, reached: 0 });
      if (!total.made) return null;
      return (total.reached / total.made) * 100;
    },
    getImpact: (current, target) => {
      if (current >= target) return "Gute Erreichbarkeit – du rufst zur richtigen Zeit die richtigen Nummern an.";
      return `+${(target - current).toFixed(0)}% mehr Entscheider erreicht = mehr qualifizierte Gespräche.`;
    },
    actions: [
      "Anrufzeiten optimieren: Entscheider sind oft früh (7:30–9:00) oder spät (17:00–18:30) erreichbar",
      "Direktdurchwahlen und Mobilnummern statt Zentrale nutzen",
      "Leads priorisieren, die bereits auf LinkedIn/Mail reagiert haben",
      "Nach 3 erfolglosen Versuchen den Kanal wechseln (Mail/LinkedIn)",
    ],
  },
  {
    key: "calls_interest_rate",
    label: "Call-Interessenten-Rate",
    icon: "💡",
    unit: "%",
    target: 15,
    higherIsBetter: true,
    criticalThreshold: 0.5,
    getValue: (metrics) => {
      const total = metrics.reduce((a, m) => ({
        reached: a.reached + (Number(m.calls_reached) || 0),
        interested: a.interested + (Number(m.calls_interested) || 0),
      }), { reached: 0, interested: 0 });
      if (!total.reached) return null;
      return (total.interested / total.reached) * 100;
    },
    getImpact: (current, target) => {
      if (current >= target) return "Dein Cold-Call-Skript funktioniert – gute Interessenten-Rate.";
      return `+${(target - current).toFixed(0)}% mehr Interessenten = mehr Settings ohne mehr Anrufe.`;
    },
    actions: [
      "Überarbeite deinen Cold-Call-Opener: Die ersten 10 Sekunden entscheiden alles",
      "Skript mit starkem Opener vorbereiten (kein Pitch, sondern Frage)",
      "Personalisiere deinen Opener mit einem konkreten Bezug zum Unternehmen",
      "Arbeite mit einem Einwand-Dokument: Notiere häufige Einwände und trainiere Antworten",
    ],
  },
  {
    key: "settings_per_week",
    label: "Setting-Termine / Woche (Outbound)",
    icon: "📅",
    unit: "number",
    target: 20,
    higherIsBetter: true,
    criticalThreshold: 0.5, // <10 = critical
    getValue: (metrics) => {
      const total = metrics.reduce((a, m) => a + (Number(m.settings_planned) || 0), 0);
      return total || null;
    },
    getImpact: (current, target) => {
      if (current >= target) return "Starkes Terminvolumen – die Pipeline ist gut gefüllt.";
      return `${(target - current).toFixed(0)} weitere Termine bis zum Ziel – mehr Termine = mehr Umsatz.`;
    },
    actions: [
      "Multi-Channel Sequenzen: LinkedIn → Mail → Anruf in Kombination",
      "Terminbuchungs-Link (Calendly/Cal.com) in jede Nachricht einbauen",
      "Follow-Up Kadenz erhöhen: Mindestens 5 Touchpoints pro Lead",
      "ICP-Qualität überprüfen — wenn viel Aktivität aber wenig Termine, stimmt der ICP nicht",
    ],
  },
];

// ─── 2. INBOUND / MARKETING KPIs (LinkedIn Leadposts) ───

export const marketingKPIConfigs: KPIMetricConfig[] = [
  {
    key: "impressions_per_post",
    label: "Impressions / Post",
    icon: "👁️",
    unit: "number",
    target: 20000,
    higherIsBetter: true,
    criticalThreshold: 0.25, // <5000 = critical
    getValue: (metrics) => {
      const latest = metrics[0];
      return latest?.impressions != null ? Number(latest.impressions) : null;
    },
    formatValue: (v) => v.toLocaleString("de-DE"),
    getImpact: (current, target) => {
      if (current >= target) return "Starke Reichweite – der Algorithmus spielt deinen Content aus.";
      return `${((target - current) / 1000).toFixed(0)}k mehr Impressions = proportional mehr Leads.`;
    },
    actions: [
      "Hook in den ersten 2 Zeilen optimieren — das entscheidet über Klick auf 'Mehr anzeigen'",
      "Posting-Zeit testen: DACH-Markt reagiert gut auf 7:30–8:30 und 17:00–18:00",
      "Engagement in den ersten 30 Min. pushen: Eigenes Netzwerk aktivieren",
      "Kommentare beantworten — jeder Kommentar pusht die Reichweite",
    ],
  },
  {
    key: "comments_per_post",
    label: "Kommentare / Post",
    icon: "💬",
    unit: "number",
    target: 200,
    higherIsBetter: true,
    criticalThreshold: 0.25, // <50 = critical
    getValue: (metrics) => {
      const latest = metrics[0];
      return latest?.comments != null ? Number(latest.comments) : null;
    },
    getImpact: (current, target) => {
      if (current >= target) return "Starkes Engagement – jeder Kommentar ist ein potenzieller Lead.";
      return `+${(target - current).toFixed(0)} mehr Kommentare = ${((target - current) / 2).toFixed(0)} mehr potenzielle Leads.`;
    },
    actions: [
      "CTA am Ende des Posts einbauen: 'Kommentiere XY und ich schicke dir...'",
      "Kontroverse Meinungen und Polarisierung nutzen (im professionellen Rahmen)",
      "Persönliche Geschichten statt generischer Business-Tipps",
      "Auf jeden Kommentar antworten — das verdoppelt die Kommentarzahl und stärkt die Bindung",
    ],
  },
  {
    key: "lead_quality",
    label: "Lead-Qualitätsrate",
    icon: "⭐",
    unit: "%",
    target: 60,
    higherIsBetter: true,
    criticalThreshold: 0.5,
    getValue: (metrics) => {
      const total = metrics.reduce((a, m) => ({
        leads: a.leads + (Number(m.leads_total) || 0),
        qualified: a.qualified + (Number(m.leads_qualified) || 0),
      }), { leads: 0, qualified: 0 });
      if (!total.leads) return null;
      return (total.qualified / total.leads) * 100;
    },
    getImpact: (current, target) => {
      if (current >= target) return "Starke Lead-Qualität – dein Targeting trifft die richtige Zielgruppe.";
      return `Höhere Lead-Qualität = weniger Zeitverlust im Sales-Prozess.`;
    },
    actions: [
      "Verfasse Content, der bewusst deine Zielgruppe anspricht und andere ausschließt",
      "Ergänze CTAs mit Qualifizierungsfragen (z.B. 'Für Unternehmen ab 6-stelligem Umsatz')",
      "Tracke, welche Post-Formate die qualifiziertesten Leads generieren",
      "Optimiere deinen DM-Qualifizierungsfilter nach Budget, Problem, Timing",
    ],
  },
  {
    key: "new_followers",
    label: "Neue Follower (gesamt)",
    icon: "👥",
    unit: "number",
    target: 100,
    higherIsBetter: true,
    getValue: (metrics) => {
      return metrics.reduce((a, m) => a + (Number(m.new_followers) || 0), 0) || null;
    },
    getImpact: (current, target) => {
      if (current >= target) return "Gutes Followerwachstum – deine Sichtbarkeit steigt.";
      return `${(target - current).toFixed(0)} weitere Follower bis zum Ziel – mehr Follower = mehr organische Reichweite.`;
    },
    actions: [
      "Sende täglich 5-10 personalisierte Vernetzungsanfragen an Entscheidungsträger",
      "Kommentiere Beiträge von Influencern in deiner Nische (sichtbares Engagement)",
      "Teile Mehrwert-Content, den andere gerne speichern und teilen wollen",
      "Cross-promote auf anderen Kanälen (Newsletter, Podcast, E-Mail-Signatur)",
    ],
  },
];

// ─── 3. SALES PIPELINE KPIs ───

export const salesKPIConfigs: KPIMetricConfig[] = [
  {
    key: "setting_show_rate",
    label: "Show-Up Rate (Setting)",
    icon: "📅",
    unit: "%",
    target: 80,
    higherIsBetter: true,
    criticalThreshold: 0.75, // <60% = critical
    getValue: (metrics) => {
      const total = metrics.reduce((a, m) => ({
        planned: a.planned + (Number(m.settings_planned) || 0),
        held: a.held + (Number(m.settings_held) || 0),
      }), { planned: 0, held: 0 });
      if (!total.planned) return null;
      return (total.held / total.planned) * 100;
    },
    getImpact: (current, target) => {
      if (current >= target) return "Exzellente Show-Rate – deine Termine erscheinen zuverlässig.";
      return `${(target - current).toFixed(0)}% weniger No-Shows = signifikant mehr Closings pro Monat.`;
    },
    actions: [
      "Bestätigungs-Sequenz: E-Mail direkt nach Buchung + Reminder 24h + 1h vorher",
      "WhatsApp/SMS Reminder zusätzlich zur E-Mail senden",
      "Im Buchungsprozess Commitment abholen: 'Ist das ein verbindlicher Termin für Sie?'",
      "Termin innerhalb von 48h legen, nicht in 2 Wochen",
    ],
  },
  {
    key: "quali_quote",
    label: "Quali-Quote",
    icon: "🔍",
    unit: "%",
    target: 27.5, // Midpoint of 25-30% green range
    higherIsBetter: true,
    criticalThreshold: 0.55, // <15% = critical
    getValue: (metrics) => {
      const total = metrics.reduce((a, m) => ({
        held: a.held + (Number(m.settings_held) || 0),
        closings_planned: a.closings_planned + (Number(m.closings_planned) || 0),
      }), { held: 0, closings_planned: 0 });
      if (!total.held) return null;
      return (total.closings_planned / total.held) * 100;
    },
    getImpact: (current, target) => {
      if (current >= 25 && current <= 30) return "Perfekte Quali-Quote – gute Balance zwischen Qualität und Volumen.";
      if (current > 30) return "⚠️ Zu hohe Quali-Quote – es kommen möglicherweise zu wenige Leads durch.";
      return `+${(target - current).toFixed(0)}% bessere Qualifizierung = effizientere Closer-Kapazität.`;
    },
    actions: [
      "Qualifizierungskriterien klar definieren: Budget, Entscheider, Zeitrahmen, Pain",
      "Setting-Skript um Qualifizierungsfragen erweitern",
      "Regelmäßige Feedback-Loops zwischen Setter und Closer einrichten",
      "Bei >30%: Prüfen ob zu viele potenzielle Kunden voreilig rausgefiltert werden",
    ],
  },
  {
    key: "closing_show_rate",
    label: "Show-Up Rate (Closing)",
    icon: "🎯",
    unit: "%",
    target: 85,
    higherIsBetter: true,
    criticalThreshold: 0.82, // <70% = critical
    getValue: (metrics) => {
      const total = metrics.reduce((a, m) => ({
        planned: a.planned + (Number(m.closings_planned) || 0),
        held: a.held + (Number(m.closings_held) || 0),
      }), { planned: 0, held: 0 });
      if (!total.planned) return null;
      return (total.held / total.planned) * 100;
    },
    getImpact: (current, target) => {
      if (current >= target) return "Top Closing-Show-Rate – qualifizierte Leads erscheinen zuverlässig.";
      return `${(target - current).toFixed(0)}% weniger No-Shows bei Closings = mehr Abschlüsse.`;
    },
    actions: [
      "Persönliche Videonachricht vom Closer als Reminder senden",
      "Agenda und Erwartungen vor dem Call per E-Mail kommunizieren",
      "Zwischen Setting und Closing maximal 24–48h Abstand",
      "Bei No-Show sofort (innerhalb 5 Min.) anrufen und neuen Termin setzen",
    ],
  },
  {
    key: "closing_rate",
    label: "Closing Rate",
    icon: "🏆",
    unit: "%",
    target: 75, // Midpoint of 70-80% green range
    higherIsBetter: true,
    criticalThreshold: 0.67, // <50% = critical
    getValue: (metrics) => {
      const total = metrics.reduce((a, m) => ({
        closings_held: a.closings_held + (Number(m.closings_held) || 0),
        deals: a.deals + (Number(m.deals) || 0),
      }), { closings_held: 0, deals: 0 });
      if (!total.closings_held) return null;
      return (total.deals / total.closings_held) * 100;
    },
    getImpact: (current, target) => {
      if (current >= 70 && current <= 80) return "Optimale Closing Rate – gute Balance zwischen Abschluss und Funnel-Breite.";
      if (current > 80) return "⚠️ Closing Rate über 80% – Funnel könnte zu eng gefiltert sein. Mehr Leads durchlassen.";
      return `+${(target - current).toFixed(0)}% mehr Closes = deutlich mehr Deals ohne zusätzliche Leads.`;
    },
    actions: [
      "Bei <50%: Discovery-Phase vertiefen, mehr Fragen, weniger Pitch",
      "Bei <50%: Einwandbehandlung systematisch trainieren (Rollenspiele, Call-Reviews)",
      "Bei >80%: Quali-Kriterien lockern — es kommen zu wenige Leute in den Call",
      "Angebot klar strukturieren: Problem → Lösung → Ergebnis → Preis → CTA",
    ],
  },
  {
    key: "avg_deal_value",
    label: "Durchschn. Dealwert",
    icon: "💰",
    unit: "€",
    target: 6000,
    higherIsBetter: true,
    criticalThreshold: 0.5, // <3000 = critical
    getValue: (metrics) => {
      const total = metrics.reduce((a, m) => ({
        revenue: a.revenue + (Number(m.deal_volume) || Number(m.revenue) || 0),
        deals: a.deals + (Number(m.deals) || 0),
      }), { revenue: 0, deals: 0 });
      if (!total.deals) return null;
      return total.revenue / total.deals;
    },
    formatValue: (v) => `${v.toLocaleString("de-DE")}€`,
    getImpact: (current, target) => {
      if (current >= target) return "Starker Dealwert – höhere Deals kompensieren niedrigeres Volumen.";
      return `+${((target - current)).toLocaleString("de-DE")}€ pro Deal = massiver Umsatzhebl bei gleicher Anzahl Closings.`;
    },
    actions: [
      "Pricing überprüfen: Wird der Wert richtig kommuniziert?",
      "Upsell-Optionen in das Angebot einbauen (z.B. Done-for-you Pakete)",
      "Höherwertige ICPs ansprechen — größere Agenturen = größere Deals",
      "ROI-Rechnung im Gespräch einsetzen: 'Wenn du X Kunden mehr gewinnst...'",
    ],
  },
  {
    key: "revenue_per_lead",
    label: "Umsatz / Lead",
    icon: "📈",
    unit: "€",
    target: 100,
    higherIsBetter: true,
    criticalThreshold: 0.5,
    getValue: (metrics) => {
      const total = metrics.reduce((a, m) => ({
        revenue: a.revenue + (Number(m.revenue) || 0),
        leads: a.leads + (Number(m.leads_total) || 0),
      }), { revenue: 0, leads: 0 });
      if (!total.leads) return null;
      return total.revenue / total.leads;
    },
    formatValue: (v) => `${v.toFixed(0)}€`,
    getImpact: (current, target) => {
      if (current >= target) return "Jeder Lead generiert guten Umsatz – der Funnel arbeitet effizient.";
      return `+${(target - current).toFixed(0)}€ mehr pro Lead = höherer ROI auf jede Marketing-Aktivität.`;
    },
    actions: [
      "Conversion Rates im Funnel verbessern — jede +5% Closing Rate erhöht den Umsatz pro Lead",
      "Durchschnittlichen Dealwert durch Upsells erhöhen",
      "Lead-Qualität steigern, um nur kaufbereite Leads in die Pipeline zu bringen",
      "Follow-Up-Prozess für warme Leads straffen — kein Lead darf verloren gehen",
    ],
  },
];

// ─── 4. BUCHHALTUNG & CASHFLOW KPIs ───

export const financeKPIConfigs: KPIMetricConfig[] = [
  {
    key: "churn_rate",
    label: "Churn Rate (monatl.)",
    icon: "📉",
    unit: "%",
    target: 5,
    higherIsBetter: false,
    criticalThreshold: 0.5, // >10% = critical
    getValue: () => null, // Needs fulfillment_tracking data, placeholder
    getImpact: (current, target) => {
      if (current <= target) return "Niedrige Churn Rate – Kunden bleiben langfristig.";
      return `${(current - target).toFixed(1)}% weniger Churn = stabiler wachsendes MRR.`;
    },
    actions: [
      "Exit-Interviews führen: Warum kündigen Kunden?",
      "Onboarding-Prozess verbessern — die ersten 30 Tage entscheiden",
      "Regelmäßige Check-Ins (14-tägig) einführen",
      "Quick Wins in den ersten 2 Wochen liefern",
    ],
  },
  {
    key: "deals_per_month",
    label: "Neukunden / Monat",
    icon: "🚀",
    unit: "number",
    target: 4,
    higherIsBetter: true,
    criticalThreshold: 0.5, // <2 = critical
    getValue: (metrics) => {
      const total = metrics.reduce((a, m) => a + (Number(m.deals) || 0), 0);
      return total || null;
    },
    getImpact: (current, target) => {
      if (current >= target) return "Starkes Neukundenvolumen – die Offensive läuft.";
      return `${(target - current).toFixed(0)} weitere Neukunden bis zum Ziel – sofort Outbound hochfahren.`;
    },
    actions: [
      "Funnel-Engpass identifizieren: Liegt es an Leads, Terminen oder Closing?",
      "Alle 3 Outbound-Kanäle gleichzeitig aktiv nutzen",
      "Inbound durch konsistentes Posting unterstützen",
      "Bei <2 Neukunden: Sofortmaßnahmen mit dem Berater absprechen",
    ],
  },
];
