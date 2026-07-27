// CL-133: Render Engine Edge Function
// Layer 3 of 3 in the render pipeline:
//   1. TEXT  — LLM via ai-chat
//   2. IMAGE — Higgsfield adapter
//   3. RENDER — this function: deterministic HTML/SVG compositing
//
// Input:  { template_id?, html_svg?, variables, format_slug, user_id }
// Output: { asset_id, rendered_html, width, height, format_slug, metadata }
// TODO(STUB): PNG conversion — currently returns rendered HTML only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { corsHeaders } from "../_shared/cors.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RenderRequest {
  /** Use a stored template by ID */
  template_id?: string;
  /** Or pass raw HTML/SVG string directly */
  html_svg?: string;
  /** Variable map: text, colors, logo_url, image_url, etc. */
  variables?: Record<string, string>;
  /** Format slug from format_registry (e.g. "linkedin-post-1080x1080") */
  format_slug: string;
  /** Customer whose brand tokens are applied */
  user_id: string;
}

interface FormatSpec {
  id: string;
  slug: string;
  name: string;
  width_px: number;
  height_px: number;
  aspect_ratio: string | null;
  safe_zone_json: Record<string, number> | null;
  text_limits_json: Record<string, number> | null;
}

interface BrandTokens {
  id: string;
  user_id: string;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  font_family: string | null;
  font_weight: string | null;
  logo_url: string | null;
  image_style: string | null;
  claim: string | null;
  version: number | null;
}

interface Template {
  id: string;
  format_id: string;
  slug: string;
  name: string;
  html_svg: string;
  variables_schema: Record<string, unknown> | null;
  category: string | null;
}

// ── Variable substitution ─────────────────────────────────────────────────────
// Replaces {{variable_name}} placeholders with resolved values.
// Resolution order: explicit variables → brand tokens → empty string

function substituteVariables(
  template: string,
  variables: Record<string, string>,
  brand: BrandTokens | null,
  format: FormatSpec,
): string {
  const brandDefaults: Record<string, string> = {
    primary_color: brand?.primary_color ?? "#C5A059",
    secondary_color: brand?.secondary_color ?? "#1A1B1B",
    accent_color: brand?.accent_color ?? "#E9CB8B",
    font_family: brand?.font_family ?? "Inter, sans-serif",
    font_weight: brand?.font_weight ?? "400",
    logo_url: brand?.logo_url ?? "",
    image_style: brand?.image_style ?? "",
    claim: brand?.claim ?? "",
    canvas_width: String(format.width_px),
    canvas_height: String(format.height_px),
  };

  const merged = { ...brandDefaults, ...variables };

  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return merged[key] ?? "";
  });
}

// ── Safe-zone wrapper ─────────────────────────────────────────────────────────
// Wraps the composited HTML in a fixed-size canvas div with correct dimensions.

function wrapInCanvas(
  inner: string,
  width: number,
  height: number,
  safeZone: Record<string, number> | null,
): string {
  const pad = safeZone
    ? `${safeZone.top ?? 0}px ${safeZone.right ?? 0}px ${safeZone.bottom ?? 0}px ${safeZone.left ?? 0}px`
    : "0px";

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=${width}" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: ${width}px; height: ${height}px; overflow: hidden; background: #1A1B1B; }
    .cl-canvas {
      position: relative;
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      padding: ${pad};
    }
  </style>
</head>
<body>
  <div class="cl-canvas" data-cl-width="${width}" data-cl-height="${height}">
    ${inner}
  </div>
</body>
</html>`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceRoleKey);

  try {
    // ── Auth: require valid Supabase session ──────────────────────────────────
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const body: RenderRequest = await req.json();
    const { template_id, html_svg, variables = {}, format_slug, user_id } = body;

    if (!format_slug) {
      return new Response(JSON.stringify({ error: "format_slug is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!template_id && !html_svg) {
      return new Response(JSON.stringify({ error: "Provide either template_id or html_svg" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Load format spec ──────────────────────────────────────────────────────
    const { data: format, error: fmtErr } = await db
      .from("format_registry")
      .select("id, slug, name, width_px, height_px, aspect_ratio, safe_zone_json, text_limits_json")
      .eq("slug", format_slug)
      .maybeSingle();

    if (fmtErr) throw new Error(`format_registry: ${fmtErr.message}`);
    if (!format) {
      return new Response(JSON.stringify({ error: `Unknown format_slug: ${format_slug}` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const fmt = format as FormatSpec;

    // ── Load template (if template_id provided) ───────────────────────────────
    let rawHtml: string;
    let resolvedTemplateId: string | null = null;

    if (template_id) {
      const { data: tmpl, error: tmplErr } = await db
        .from("templates")
        .select("id, format_id, slug, name, html_svg, variables_schema, category")
        .eq("id", template_id)
        .maybeSingle();

      if (tmplErr) throw new Error(`templates: ${tmplErr.message}`);
      if (!tmpl) {
        return new Response(JSON.stringify({ error: `Template not found: ${template_id}` }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      rawHtml = (tmpl as Template).html_svg;
      resolvedTemplateId = template_id;
    } else {
      rawHtml = html_svg!;
    }

    // ── Load brand tokens for user ────────────────────────────────────────────
    const { data: brand } = await db
      .from("brand_tokens")
      .select(
        "id, user_id, primary_color, secondary_color, accent_color, font_family, font_weight, logo_url, image_style, claim, version",
      )
      .eq("user_id", user_id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const brandTokens = (brand ?? null) as BrandTokens | null;

    // ── Substitute variables ──────────────────────────────────────────────────
    const composited = substituteVariables(rawHtml, variables, brandTokens, fmt);

    // ── Wrap in canvas ────────────────────────────────────────────────────────
    const renderedHtml = wrapInCanvas(composited, fmt.width_px, fmt.height_px, fmt.safe_zone_json as Record<string, number> | null);

    // ── Save asset record ─────────────────────────────────────────────────────
    const { data: asset, error: assetErr } = await db
      .from("assets")
      .insert({
        user_id,
        template_id: resolvedTemplateId,
        format_id: fmt.id,
        brand_token_version: brandTokens?.version ?? null,
        status: "draft",
        metadata_json: {
          rendered_at: new Date().toISOString(),
          variables_used: Object.keys(variables),
          format_slug,
          width_px: fmt.width_px,
          height_px: fmt.height_px,
          // TODO(STUB): storage_url will be set when PNG conversion is implemented
          png_conversion: "pending",
        },
      })
      .select("id")
      .single();

    if (assetErr) throw new Error(`assets insert: ${assetErr.message}`);

    // ── Return result ─────────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        asset_id: asset.id,
        rendered_html: renderedHtml,
        width: fmt.width_px,
        height: fmt.height_px,
        format_slug: fmt.slug,
        format_name: fmt.name,
        brand_token_version: brandTokens?.version ?? null,
        metadata: {
          safe_zone: fmt.safe_zone_json,
          text_limits: fmt.text_limits_json,
        },
        // TODO(STUB): png_url — add Puppeteer/Playwright screenshot step here
        // to convert rendered_html → PNG and upload to Supabase Storage.
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[render-asset]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
