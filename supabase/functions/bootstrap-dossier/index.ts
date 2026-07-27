// CL-124: Bootstrap Existing Customers
// Takes a user_id, loads existing data (ToV profile, tenants, generated_content),
// creates a dossier if none exists, populates dossier_fields, returns completeness.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ── Field definitions ─────────────────────────────────────────────────────────

const ALL_KEYS = [
  "angebot", "preismodell", "ergebnisse",
  "branche", "rolle", "groesse", "trigger", "schmerz",
  "tonalitaet", "themen", "no_gos", "beispiel_posts", "kommunikationsstil",
  "farben", "fonts", "logo", "bildstil", "claim",
  "content_saeulen", "cta_ziel",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcCompleteness(filledKeys: Set<string>): number {
  return Math.round((filledKeys.size / ALL_KEYS.length) * 100);
}

interface UpsertField {
  dossier_id: string;
  field_key: string;
  value_text: string;
  source: string;
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── 1. Find or create dossier ─────────────────────────────────────────────

    const { data: existingDos } = await supabase
      .from("dossiers")
      .select("id, version")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let dossierId: string;

    if (existingDos) {
      dossierId = existingDos.id;
    } else {
      const { data: newDos, error: createErr } = await supabase
        .from("dossiers")
        .insert({ user_id, status: "draft", version: 1 })
        .select("id")
        .single();
      if (createErr) throw createErr;
      dossierId = newDos.id;
    }

    // ── 2. Load existing dossier_fields to avoid overwriting manual edits ─────

    const { data: existingFields } = await supabase
      .from("dossier_fields")
      .select("field_key, value_text")
      .eq("dossier_id", dossierId);

    const existingMap = new Map<string, string>(
      ((existingFields ?? []) as { field_key: string; value_text: string | null }[])
        .filter((f) => f.value_text?.trim())
        .map((f) => [f.field_key, f.value_text as string]),
    );

    const fieldsToUpsert: UpsertField[] = [];

    // ── 3. Load ToV profile ───────────────────────────────────────────────────

    const { data: tov } = await supabase
      .from("tone_of_voice_profiles")
      .select("tonality, topics, no_gos, style, example_posts")
      .eq("user_id", user_id)
      .maybeSingle();

    if (tov) {
      const tovMappings: Array<{ key: string; value: string | null | string[] }> = [
        { key: "tonalitaet", value: tov.tonality },
        {
          key: "themen",
          value: Array.isArray(tov.topics) ? tov.topics.join(", ") : tov.topics,
        },
        {
          key: "no_gos",
          value: Array.isArray(tov.no_gos) ? tov.no_gos.join(", ") : tov.no_gos,
        },
        { key: "kommunikationsstil", value: tov.style },
        { key: "beispiel_posts", value: tov.example_posts },
      ];

      for (const { key, value } of tovMappings) {
        const str = typeof value === "string" ? value.trim() : null;
        if (str && !existingMap.has(key)) {
          fieldsToUpsert.push({
            dossier_id: dossierId,
            field_key: key,
            value_text: str,
            source: "tov_interview",
          });
          existingMap.set(key, str);
        }
      }
    }

    // ── 4. Load tenants fields ────────────────────────────────────────────────

    const { data: tenant } = await supabase
      .from("tenants")
      .select("current_offer, offer_price, industry, company_name")
      .eq("user_id", user_id)
      .limit(1)
      .maybeSingle();

    if (tenant) {
      const tenantMappings: Array<{ key: string; value: string | null | number | undefined }> = [
        { key: "angebot", value: tenant.current_offer },
        { key: "preismodell", value: tenant.offer_price != null ? String(tenant.offer_price) : null },
        { key: "branche", value: tenant.industry },
      ];

      for (const { key, value } of tenantMappings) {
        const str = value != null ? String(value).trim() : null;
        if (str && !existingMap.has(key)) {
          fieldsToUpsert.push({
            dossier_id: dossierId,
            field_key: key,
            value_text: str,
            source: "form",
          });
          existingMap.set(key, str);
        }
      }
    }

    // ── 5. Load generated_content for additional signal ───────────────────────

    const { data: genContent } = await supabase
      .from("generated_content")
      .select("content_type, content_text")
      .eq("user_id", user_id)
      .in("content_type", ["claim", "cta_ziel", "content_saeulen"])
      .order("created_at", { ascending: false })
      .limit(10);

    if (genContent) {
      // Take the most recent value per content_type
      const seenTypes = new Set<string>();
      for (const row of (genContent as { content_type: string; content_text: string }[])) {
        if (seenTypes.has(row.content_type)) continue;
        seenTypes.add(row.content_type);

        const key = row.content_type; // matches field_key directly
        const str = row.content_text?.trim();
        if (str && !existingMap.has(key)) {
          fieldsToUpsert.push({
            dossier_id: dossierId,
            field_key: key,
            value_text: str,
            source: "form",
          });
          existingMap.set(key, str);
        }
      }
    }

    // ── 6. Upsert collected fields ────────────────────────────────────────────

    let fields_created = 0;

    for (const field of fieldsToUpsert) {
      // Check if field row already exists (even empty)
      const { data: existingRow } = await supabase
        .from("dossier_fields")
        .select("id")
        .eq("dossier_id", dossierId)
        .eq("field_key", field.field_key)
        .maybeSingle();

      if (existingRow) {
        await supabase
          .from("dossier_fields")
          .update({
            value_text: field.value_text,
            source: field.source,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingRow.id);
      } else {
        const { error: insertErr } = await supabase
          .from("dossier_fields")
          .insert(field);
        if (!insertErr) fields_created++;
      }
    }

    // ── 7. Calculate final completeness ──────────────────────────────────────

    const { data: finalFields } = await supabase
      .from("dossier_fields")
      .select("field_key, value_text")
      .eq("dossier_id", dossierId);

    const filledKeys = new Set<string>(
      ((finalFields ?? []) as { field_key: string; value_text: string | null }[])
        .filter((f) => f.value_text?.trim())
        .map((f) => f.field_key),
    );

    const completeness = calcCompleteness(filledKeys);

    // Update completeness_score on dossier if column exists
    await supabase
      .from("dossiers")
      .update({ completeness_score: completeness })
      .eq("id", dossierId);

    return new Response(
      JSON.stringify({
        dossier_id: dossierId,
        fields_created,
        completeness,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
