// CL-119: Transcription + Dossier Extraction
// 1. Download audio from Supabase Storage
// 2. Transcribe with OpenAI Whisper (language: de)
// 3. Extract structured dossier fields via AI
// 4. Save transcript + dossier_fields, update completeness_score

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ── Dossier field keys to extract ─────────────────────────────────────────────

const DOSSIER_KEYS = [
  "angebot",
  "preismodell",
  "ergebnisse",
  "icp_branche",
  "icp_rolle",
  "schmerz",
  "tonalitaet",
  "themen",
  "no_gos",
  "content_saeulen",
  "cta_ziel",
  // Additional keys that appear in the DossierPage categories
  "branche",
  "rolle",
  "groesse",
  "trigger",
  "kommunikationsstil",
  "farben",
  "fonts",
  "logo",
  "bildstil",
  "claim",
  "beispiel_posts",
];

// ── Extraction system prompt ──────────────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `Du bist ein Analyse-Assistent für eine B2B LinkedIn-Agentur.
Du erhältst ein Transkript eines Beratungsgesprächs und extrahierst strukturierte Dossier-Felder.

Extrahiere NUR Informationen, die im Transkript explizit genannt werden.
Erfinde keine Inhalte. Wenn ein Feld nicht erkennbar ist, lasse es weg.

Gib deine Antwort als gültiges JSON-Objekt zurück (kein Markdown, kein Text davor/danach).
Die Keys des Objekts sind die Feldnamen, die Values sind kurze, präzise Texte auf Deutsch.

Verfügbare Felder:
- angebot: Das Hauptangebot / die Dienstleistung des Kunden
- preismodell: Preisstruktur, Pakete, Konditionen
- ergebnisse: Konkrete Ergebnisse und Fallstudien
- icp_branche: Zielbranchen des Kunden
- icp_rolle: Zielrollen / Ansprechpartner (z.B. Geschäftsführer, Marketing-Leiter)
- branche: Branche des Kunden selbst
- rolle: Rolle des Kunden (z.B. Gründer, Berater)
- groesse: Zielgröße der Kundenunternehmen
- trigger: Auslöser / Events, die Kunden aktiv machen
- schmerz: Hauptprobleme und Schmerzpunkte der Zielgruppe
- tonalitaet: Kommunikationston (z.B. direkt, empathisch, humorvoll)
- themen: Relevante Themen und Inhalte für Content
- no_gos: Was der Kunde kommunikativ vermeiden will
- kommunikationsstil: Stilistischer Ansatz in der Kommunikation
- content_saeulen: Thematische Content-Säulen
- cta_ziel: Ziel der Calls-to-Action (z.B. Erstgespräch, Lead-Magnet)
- farben: Markenfarben
- fonts: Schriftarten
- logo: Beschreibung oder Hinweise zum Logo
- bildstil: Visueller Stil (z.B. minimalistisch, premium, human)
- claim: Unternehmens-Claim oder Tagline
- beispiel_posts: Beispiel-Inhalte oder Post-Ideen aus dem Gespräch`;

// ── Service client ────────────────────────────────────────────────────────────

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ── Whisper transcription ─────────────────────────────────────────────────────

async function transcribeAudio(
  audioData: Uint8Array,
  mimeType: string
): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

  const mimeToExt: Record<string, string> = {
    "audio/webm": "webm",
    "audio/webm;codecs=opus": "webm",
    "audio/mp4": "m4a",
    "audio/ogg": "ogg",
    "audio/ogg;codecs=opus": "ogg",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
  };

  const baseMime = mimeType.split(";")[0].trim();
  const ext = mimeToExt[mimeType] ?? mimeToExt[baseMime] ?? "webm";

  const formData = new FormData();
  const blob = new Blob([audioData], { type: mimeType || "audio/webm" });
  formData.append("file", blob, `audio.${ext}`);
  formData.append("model", "whisper-1");
  formData.append("language", "de");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Whisper API error ${response.status}: ${err}`);
  }

  const result = await response.json();
  return result.text as string;
}

// ── Dossier extraction via OpenAI ─────────────────────────────────────────────

async function extractDossierFields(
  transcript: string
): Promise<Record<string, string>> {
  // Try OpenAI first; fall back to Anthropic
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

  let rawJson = "";

  if (openaiKey) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 2000,
        temperature: 0.2,
        messages: [
          { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Transkript:\n\n${transcript}\n\nExtrahiere die Dossier-Felder als JSON.`,
          },
        ],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      rawJson = data.choices?.[0]?.message?.content ?? "";
    }
  }

  if (!rawJson && anthropicKey) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        temperature: 0.2,
        system: EXTRACTION_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Transkript:\n\n${transcript}\n\nExtrahiere die Dossier-Felder als JSON.`,
          },
        ],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      rawJson = data.content?.[0]?.text ?? "";
    }
  }

  if (!rawJson) throw new Error("Keine AI-Antwort für Feldextraktion erhalten.");

  // Strip markdown code fences if present
  const cleaned = rawJson
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned) as Record<string, string>;
  } catch {
    throw new Error(`Ungültiges JSON von AI: ${cleaned.slice(0, 200)}`);
  }
}

// ── Completeness score calculation ────────────────────────────────────────────

async function recalculateCompleteness(
  supabase: ReturnType<typeof createClient>,
  dossierId: string
): Promise<number> {
  const { data: fields } = await supabase
    .from("dossier_fields")
    .select("field_key, value_text")
    .eq("dossier_id", dossierId);

  if (!fields) return 0;

  const filled = (fields as Array<{ field_key: string; value_text: string | null }>).filter(
    (f) => f.value_text?.trim()
  ).length;

  // Use the same key set as the DossierPage (20 keys across 5 categories)
  const ALL_KEYS_COUNT = 20;
  const score = Math.round((filled / ALL_KEYS_COUNT) * 100);

  await supabase
    .from("dossiers")
    .update({ completeness_score: score })
    .eq("id", dossierId);

  return score;
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { recording_id } = await req.json();

    if (!recording_id) {
      return new Response(
        JSON.stringify({ error: "recording_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = getServiceClient();

    // ── 1. Fetch recording ────────────────────────────────────────────────────

    const { data: recording, error: recErr } = await supabase
      .from("recordings")
      .select("*")
      .eq("id", recording_id)
      .single();

    if (recErr || !recording) {
      throw new Error(`Recording not found: ${recErr?.message}`);
    }

    if (recording.status === "deleted") {
      throw new Error("Recording has been deleted.");
    }

    // Mark as processing
    await supabase
      .from("recordings")
      .update({ status: "processing" })
      .eq("id", recording_id);

    // ── 2. Download audio from Supabase Storage ───────────────────────────────

    console.log("[transcribe-and-extract] Downloading audio:", recording.storage_url);

    // Extract bucket path from public URL
    // URL format: .../storage/v1/object/public/advisor-recordings/recordings/...
    const storageUrl: string = recording.storage_url;
    const bucketMarker = "/object/public/advisor-recordings/";
    const bucketPathStart = storageUrl.indexOf(bucketMarker);

    let audioBytes: Uint8Array;

    if (bucketPathStart !== -1) {
      const filePath = storageUrl.slice(bucketPathStart + bucketMarker.length);
      const { data: fileData, error: dlErr } = await supabase.storage
        .from("advisor-recordings")
        .download(filePath);

      if (dlErr || !fileData) throw new Error(`Storage download failed: ${dlErr?.message}`);
      audioBytes = new Uint8Array(await fileData.arrayBuffer());
    } else {
      // Fallback: fetch via HTTP
      const dlRes = await fetch(storageUrl);
      if (!dlRes.ok) throw new Error(`HTTP download failed: ${dlRes.status}`);
      audioBytes = new Uint8Array(await dlRes.arrayBuffer());
    }

    // ── 3. Transcribe with Whisper ────────────────────────────────────────────

    console.log("[transcribe-and-extract] Transcribing", audioBytes.length, "bytes");

    const fullText = await transcribeAudio(
      audioBytes,
      recording.mime_type ?? "audio/webm"
    );

    console.log("[transcribe-and-extract] Transcript length:", fullText.length);

    // ── 4. Save transcript ────────────────────────────────────────────────────

    const { data: transcript, error: transErr } = await supabase
      .from("transcripts")
      .insert({
        recording_id,
        customer_user_id: recording.customer_user_id,
        full_text: fullText,
        model: "whisper-1",
        language: "de",
      })
      .select()
      .single();

    if (transErr) throw new Error(`Failed to save transcript: ${transErr.message}`);

    // Update recording status
    await supabase
      .from("recordings")
      .update({ status: "transcribed" })
      .eq("id", recording_id);

    // ── 5. Extract dossier fields ─────────────────────────────────────────────

    console.log("[transcribe-and-extract] Extracting dossier fields…");

    let extractedFields: Record<string, string> = {};
    let extractionError: string | null = null;

    try {
      extractedFields = await extractDossierFields(fullText);
    } catch (err) {
      extractionError = err instanceof Error ? err.message : String(err);
      console.error("[transcribe-and-extract] Extraction failed:", extractionError);
    }

    // ── 6. Find or create dossier for customer ────────────────────────────────

    const { data: existingDossier } = await supabase
      .from("dossiers")
      .select("id")
      .eq("user_id", recording.customer_user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let dossierId: string;

    if (existingDossier) {
      dossierId = existingDossier.id;
    } else {
      const { data: newDossier, error: createErr } = await supabase
        .from("dossiers")
        .insert({ user_id: recording.customer_user_id, status: "draft" })
        .select()
        .single();

      if (createErr || !newDossier) {
        throw new Error(`Failed to create dossier: ${createErr?.message}`);
      }
      dossierId = newDossier.id;
    }

    // ── 7. Upsert extracted fields into dossier_fields ────────────────────────

    let fieldsExtracted = 0;

    for (const [key, value] of Object.entries(extractedFields)) {
      if (!value || typeof value !== "string" || !value.trim()) continue;
      // Only save known field keys (guard against hallucinated keys)
      if (!DOSSIER_KEYS.includes(key)) continue;

      const { data: existing } = await supabase
        .from("dossier_fields")
        .select("id")
        .eq("dossier_id", dossierId)
        .eq("field_key", key)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("dossier_fields")
          .update({
            value_text: value.trim(),
            source: "transcript",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("dossier_fields").insert({
          dossier_id: dossierId,
          field_key: key,
          value_text: value.trim(),
          source: "transcript",
        });
      }

      fieldsExtracted++;
    }

    console.log(`[transcribe-and-extract] Saved ${fieldsExtracted} fields`);

    // ── 8. Update completeness score ──────────────────────────────────────────

    let completeness = 0;
    try {
      completeness = await recalculateCompleteness(supabase, dossierId);
    } catch (err) {
      console.warn("[transcribe-and-extract] Completeness update failed:", err);
    }

    // ── 9. Return result ──────────────────────────────────────────────────────

    return new Response(
      JSON.stringify({
        transcript_id: transcript.id,
        fields_extracted: fieldsExtracted,
        completeness,
        extraction_error: extractionError,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[transcribe-and-extract] Fatal error:", msg);

    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
