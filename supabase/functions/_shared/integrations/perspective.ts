import type { IntegrationProvider } from "./interface.ts";

/**
 * Perspective Integration — MANUAL adapter.
 *
 * Perspective has NO public API (verified 2026-07-27).
 * This adapter generates Funnel Briefings that humans copy into Perspective manually.
 *
 * BRUCHSTELLE: When/if Perspective releases an API, replace this adapter only.
 * No changes needed to Datenmodell, UI, or Cron. See AUTOMATION.md.
 *
 * DO NOT build browser automation (Selenium/Playwright/Puppeteer) against Perspective.
 */
export class PerspectiveManualProvider implements IntegrationProvider {
  readonly name = "perspective";
  readonly type = "platform" as const;

  async test(): Promise<{ ok: boolean; error?: string }> {
    // Manual adapter always "works" — there's nothing to test
    return { ok: true, error: undefined };
  }

  async execute(params: {
    action: string;
    input: Record<string, unknown>;
  }): Promise<{ jobId?: string; result?: unknown; async: boolean }> {
    const { action, input } = params;

    if (action === "generate_briefing") {
      // Generate a structured funnel briefing from customer data
      const briefing = {
        kundenname: input.kundenname || "",
        zielgruppe: input.zielgruppe || "",
        versprechen: input.versprechen || "",
        sektionen: [
          { typ: "hero", headline: input.headline || "", subheadline: input.subheadline || "" },
          { typ: "problem", schmerzpunkte: input.schmerzpunkte || [] },
          { typ: "loesung", bullets: input.loesung_bullets || [] },
          { typ: "social_proof", cases: input.cases || [], testimonials: input.testimonials || [] },
          { typ: "angebot", preis: input.preis || "", pakete: input.pakete || [] },
          { typ: "formular", felder: input.formular_felder || ["Name", "E-Mail", "Telefon"] },
          { typ: "cta", text: input.cta_text || "Jetzt Termin buchen", url: input.cta_url || "" },
        ],
        farben: input.farben || {},
        fonts: input.fonts || {},
        notizen: input.notizen || "",
      };

      // Return as both JSON and a human-readable block
      const readableBlock = `
FUNNEL-BRIEFING: ${briefing.kundenname}
==========================================

Zielgruppe: ${briefing.zielgruppe}
Versprechen: ${briefing.versprechen}

SEKTIONEN:
${briefing.sektionen.map((s, i) => `${i + 1}. [${s.typ.toUpperCase()}] ${JSON.stringify(s)}`).join("\n")}

DESIGN:
- Farben: ${JSON.stringify(briefing.farben)}
- Fonts: ${JSON.stringify(briefing.fonts)}

NOTIZEN: ${briefing.notizen}

STATUS: Briefing erstellt → Jetzt extern in Perspective bauen → URL hier eintragen
      `.trim();

      return {
        result: {
          json: briefing,
          readable: readableBlock,
          status: "briefing_erstellt",
          next_step: "Funnel extern in Perspective bauen und URL eintragen",
        },
        async: false, // Manual = synchronous (we just generate text)
      };
    }

    throw new Error(`Unknown action: ${action}. Perspective manual adapter only supports 'generate_briefing'.`);
  }

  // No async polling needed for manual adapter
  async pollJob(): Promise<{ status: "done"; result?: unknown }> {
    return { status: "done" };
  }

  async getUsage(): Promise<{ callsThisMonth: number; costCentsThisMonth: number }> {
    return { callsThisMonth: 0, costCentsThisMonth: 0 }; // Manual = no API costs
  }
}
