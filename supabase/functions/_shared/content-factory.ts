// CL-140: Weekly Content Factory — shared module called by a future Cron trigger.
// NOT an Edge Function itself. Import from a cron edge function to execute.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ContentFactoryConfig {
  postsPerWeek: number;
  pillars: string[];
  includeVisuals: boolean;
}

export interface ContentFactoryResult {
  created: number;
  skipped: number;
  errors: string[];
}

interface DossierContext {
  angebot?: string;
  branche?: string;
  rolle?: string;
  schmerz?: string;
  tonalitaet?: string;
  themen?: string;
  no_gos?: string;
  kommunikationsstil?: string;
  cta_ziel?: string;
  content_saeulen?: string;
}

interface TovContext {
  tonality?: string | null;
  topics?: string[] | null;
  no_gos?: string[] | null;
  style?: string | null;
  target_audience?: string | null;
}

interface BrandTokens {
  primary_color?: string | null;
  claim?: string | null;
  fonts?: string | null;
  logo_url?: string | null;
}

// ── ISO week helpers ──────────────────────────────────────────────────────────

function getISOWeekYear(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

/** Spread postsPerWeek dates evenly across Mon–Fri of the given ISO week/year. */
function spreadDatesAcrossWeek(
  isoYear: number,
  isoWeek: number,
  count: number
): string[] {
  // Find Monday of that ISO week
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4.getTime() - (jan4Day - 1) * 86400000 + (isoWeek - 1) * 7 * 86400000);

  const weekdays: Date[] = [];
  for (let i = 0; i < 5; i++) {
    weekdays.push(new Date(monday.getTime() + i * 86400000));
  }

  // Pick evenly-spaced slots; if count > 5, allow repeats
  const selected: string[] = [];
  const step = weekdays.length / Math.min(count, weekdays.length);
  const usedSet = new Set<number>();

  for (let i = 0; i < count; i++) {
    const idx = Math.floor(i * step) % weekdays.length;
    // Avoid same date if we have enough slots
    let finalIdx = idx;
    if (count <= weekdays.length && usedSet.has(idx)) {
      for (let j = 0; j < weekdays.length; j++) {
        if (!usedSet.has(j)) {
          finalIdx = j;
          break;
        }
      }
    }
    usedSet.add(finalIdx);
    selected.push(weekdays[finalIdx].toISOString().slice(0, 10));
  }

  return selected;
}

// ── AI call (direct fetch — matches ai.ts pattern) ────────────────────────────

async function callAIRaw(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 600
): Promise<string> {
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  // Try Anthropic first
  if (anthropicKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: maxTokens,
          temperature: 0.8,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.content?.[0]?.text;
        if (text) return text;
      }
    } catch {
      // fall through to OpenAI
    }
  }

  // Fallback: OpenAI
  if (openaiKey) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: maxTokens,
        temperature: 0.8,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) return text;
    }
  }

  throw new Error("No AI provider available (ANTHROPIC_API_KEY or OPENAI_API_KEY required)");
}

// ── Context builders ──────────────────────────────────────────────────────────

function buildDossierContext(fields: DossierContext): string {
  const lines: string[] = [];
  if (fields.angebot) lines.push(`Angebot: ${fields.angebot}`);
  if (fields.branche) lines.push(`Branche: ${fields.branche}`);
  if (fields.rolle) lines.push(`Zielrolle: ${fields.rolle}`);
  if (fields.schmerz) lines.push(`Hauptschmerz: ${fields.schmerz}`);
  if (fields.tonalitaet) lines.push(`Tonalität: ${fields.tonalitaet}`);
  if (fields.themen) lines.push(`Themen: ${fields.themen}`);
  if (fields.no_gos) lines.push(`No-Gos (nie verwenden): ${fields.no_gos}`);
  if (fields.kommunikationsstil) lines.push(`Kommunikationsstil: ${fields.kommunikationsstil}`);
  if (fields.cta_ziel) lines.push(`CTA-Ziel: ${fields.cta_ziel}`);
  if (fields.content_saeulen) lines.push(`Content-Säulen: ${fields.content_saeulen}`);
  return lines.join("\n");
}

function buildTovContext(tov: TovContext): string {
  const lines: string[] = [];
  if (tov.tonality) lines.push(`Tonalität: ${tov.tonality}`);
  if (tov.target_audience) lines.push(`Zielgruppe: ${tov.target_audience}`);
  if (tov.topics?.length) lines.push(`Themen: ${tov.topics.join(", ")}`);
  if (tov.no_gos?.length) lines.push(`No-Gos: ${tov.no_gos.join(", ")}`);
  if (tov.style) lines.push(`Schreibstil: ${tov.style}`);
  return lines.join("\n");
}

function buildAntiRepetitionContext(recentItems: Array<{ title: string | null; body: string | null }>): string {
  if (recentItems.length === 0) return "";
  const snippets = recentItems
    .slice(0, 20)
    .map((i) => `- ${i.title ?? "(kein Titel)"}: ${(i.body ?? "").slice(0, 80)}…`)
    .join("\n");
  return `\n\nBEREITS VERÖFFENTLICHTE POSTS (bitte NICHT wiederholen — andere Winkel, andere Hooks):\n${snippets}`;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateWeeklyBatch(
  userId: string,
  config: ContentFactoryConfig,
  targetWeekOffset = 0 // 0 = current week, 1 = next week, etc.
): Promise<ContentFactoryResult> {
  const result: ContentFactoryResult = { created: 0, skipped: 0, errors: [] };

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ── Idempotency check ───────────────────────────────────────────────────────
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + targetWeekOffset * 7);
  const { year: isoYear, week: isoWeek } = getISOWeekYear(targetDate);
  const batchKey = `${userId}_${isoYear}_${String(isoWeek).padStart(2, "0")}`;

  const { data: existing, error: existErr } = await supabase
    .from("content_items" as any)
    .select("id")
    .eq("user_id", userId)
    .contains("metadata", { batch_key: batchKey })
    .limit(1);

  if (existErr) {
    result.errors.push(`Idempotency check failed: ${existErr.message}`);
    return result;
  }

  if (existing && existing.length > 0) {
    result.skipped = config.postsPerWeek;
    return result;
  }

  // ── Load customer context ────────────────────────────────────────────────────

  // Dossier fields
  const dossierContext: DossierContext = {};
  const { data: dosRow } = await supabase
    .from("dossiers" as any)
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (dosRow) {
    const { data: flds } = await supabase
      .from("dossier_fields" as any)
      .select("field_key, value_text")
      .eq("dossier_id", dosRow.id);

    for (const f of (flds ?? []) as Array<{ field_key: string; value_text: string | null }>) {
      if (f.value_text) {
        (dossierContext as Record<string, string>)[f.field_key] = f.value_text;
      }
    }
  }

  // ToV profile
  const tovContext: TovContext = {};
  const { data: tovRow } = await supabase
    .from("tone_of_voice_profiles" as any)
    .select("tonality, topics, no_gos, style, target_audience")
    .eq("user_id", userId)
    .maybeSingle();
  if (tovRow) Object.assign(tovContext, tovRow);

  // Brand tokens
  const brandTokens: BrandTokens = {};
  const { data: brandRow } = await supabase
    .from("brand_tokens" as any)
    .select("primary_color, claim, fonts, logo_url")
    .eq("user_id", userId)
    .maybeSingle();
  if (brandRow) Object.assign(brandTokens, brandRow);

  // Last 20 published items (anti-repetition)
  const { data: recentRows } = await supabase
    .from("content_items" as any)
    .select("title, body")
    .eq("user_id", userId)
    .eq("status", "approved")
    .order("scheduled_date", { ascending: false })
    .limit(20);

  const recentItems = (recentRows ?? []) as Array<{ title: string | null; body: string | null }>;

  // ── Build system prompt ───────────────────────────────────────────────────────

  const dossierText = buildDossierContext(dossierContext);
  const tovText = buildTovContext(tovContext);
  const antiRepetition = buildAntiRepetitionContext(recentItems);

  const systemPrompt = `Du bist ein erfahrener LinkedIn-Content-Stratege.
Du schreibst hochwertige LinkedIn-Posts für B2B-Dienstleister und Agenturen.

KUNDENPROFIL:
${dossierText || "(Kein Dossier vorhanden — nutze allgemeine B2B-Positionierung)"}

TOV-PROFIL:
${tovText || "(Kein ToV-Profil — schreibe authentisch, direkt, ohne Floskeln)"}
${antiRepetition}

REGELN:
- Keine generischen Aussagen, kein Sales-Jargon
- Konkrete Beispiele, Zahlen, Resultate
- Hook in den ersten 2 Zeilen (Neugier oder Provokation)
- Max. 1300 Zeichen
- Kein Hashtag-Spam (max. 3 relevante)
- Antworte NUR mit dem Post-Text, ohne Erklärung oder Titel`;

  // ── Generate posts ────────────────────────────────────────────────────────────

  const scheduledDates = spreadDatesAcrossWeek(isoYear, isoWeek, config.postsPerWeek);
  const pillars = config.pillars.length > 0 ? config.pillars : ["Expertise", "Ergebnis", "Story"];

  for (let i = 0; i < config.postsPerWeek; i++) {
    const pillar = pillars[i % pillars.length];
    const scheduledDate = scheduledDates[i] ?? scheduledDates[scheduledDates.length - 1];

    try {
      const userMessage = `Schreibe einen LinkedIn-Post für die Content-Säule "${pillar}".
Geplant für: ${scheduledDate} (KW ${isoWeek}/${isoYear})
Post ${i + 1} von ${config.postsPerWeek} dieser Woche.`;

      const body = await callAIRaw(systemPrompt, userMessage, 600);

      // Extract a short title from first line
      const firstLine = body.split("\n")[0].trim();
      const title = firstLine.length > 80 ? firstLine.slice(0, 77) + "…" : firstLine;

      const metadata: Record<string, unknown> = {
        batch_key: batchKey,
        iso_year: isoYear,
        iso_week: isoWeek,
        pillar_index: i,
      };

      if (config.includeVisuals) {
        // TODO(STUB): Higgsfield visual generation per post
        // visual_pending flag signals the cron worker to kick off Higgsfield after insert
        metadata.visual_pending = true;
        metadata.visual_prompt = `LinkedIn visual for: ${title.slice(0, 120)}`;
      }

      const { error: insertErr } = await supabase
        .from("content_items" as any)
        .insert({
          user_id: userId,
          title,
          body,
          content_type: "linkedin_post",
          content_pillar: pillar,
          status: "draft",
          scheduled_date: scheduledDate,
          metadata,
        });

      if (insertErr) {
        result.errors.push(`Post ${i + 1} insert failed: ${insertErr.message}`);
      } else {
        result.created++;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Post ${i + 1} generation failed: ${msg}`);
    }
  }

  return result;
}
