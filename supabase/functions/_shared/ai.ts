import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface PromptTemplate {
  id: string;
  name: string;
  system_prompt: string;
  user_prompt_template: string;
  model: string;
  temperature: number;
  max_tokens: number;
}

interface AICallOptions {
  promptName: string;
  variables: Record<string, string>;
  orgId?: string;
  userId?: string;
}

interface AIResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-5-20241022": { input: 0.3, output: 1.5 },
  "claude-sonnet-4-6-20250514": { input: 0.3, output: 1.5 },
  "claude-opus-4-6-20250610": { input: 1.5, output: 7.5 },
  "claude-haiku-4-5-20251001": { input: 0.08, output: 0.4 },
  "gpt-4o": { input: 0.25, output: 1.0 },
  "gpt-4o-mini": { input: 0.015, output: 0.06 },
};

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

export async function loadPrompt(name: string): Promise<PromptTemplate> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("prompt_templates")
    .select("*")
    .eq("name", name)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    throw new Error(`Prompt template '${name}' not found: ${error?.message}`);
  }
  return data as PromptTemplate;
}

function renderTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    // Wrap user-provided data in <user_data> tags for prompt injection protection
    const safeValue = value ?? "";
    result = result.replaceAll(`{{${key}}}`, `<user_data field="${key}">${safeValue}</user_data>`);
  }
  return result;
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model] || { input: 0.3, output: 1.5 };
  return (inputTokens * costs.input + outputTokens * costs.output) / 100_000;
}

async function logUsage(
  promptTemplate: PromptTemplate,
  response: AIResponse,
  orgId?: string,
  userId?: string,
  durationMs?: number,
  error?: string
): Promise<void> {
  const supabase = getSupabase();
  const costCents = calculateCost(response.model, response.inputTokens, response.outputTokens);

  await supabase.from("ai_usage_log").insert({
    org_id: orgId,
    user_id: userId,
    prompt_template_id: promptTemplate.id,
    prompt_name: promptTemplate.name,
    model: response.model,
    input_tokens: response.inputTokens,
    output_tokens: response.outputTokens,
    cost_cents: costCents,
    duration_ms: durationMs,
    error,
  });
}

export async function callAI(options: AICallOptions): Promise<string> {
  const template = await loadPrompt(options.promptName);
  const systemPrompt = renderTemplate(template.system_prompt, options.variables);
  const userMessage = renderTemplate(template.user_prompt_template, options.variables);

  const startTime = Date.now();
  let response: AIResponse;

  try {
    if (template.model.startsWith("claude")) {
      response = await callAnthropic(template, systemPrompt, userMessage);
    } else if (template.model.startsWith("gpt")) {
      response = await callOpenAI(template, systemPrompt, userMessage);
    } else {
      // Default to Anthropic
      response = await callAnthropic(template, systemPrompt, userMessage);
    }

    const durationMs = Date.now() - startTime;
    await logUsage(template, response, options.orgId, options.userId, durationMs);
    return response.text;
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);

    // Try fallback for Anthropic → OpenAI
    if (template.model.startsWith("claude")) {
      try {
        console.warn(`[ai] Anthropic failed, trying OpenAI fallback: ${errorMsg}`);
        const fallbackTemplate = { ...template, model: "gpt-4o" };
        response = await callOpenAI(fallbackTemplate, systemPrompt, userMessage);
        await logUsage(fallbackTemplate, response, options.orgId, options.userId, Date.now() - startTime);
        return response.text;
      } catch (fallbackErr) {
        const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        await logUsage(template, { text: "", inputTokens: 0, outputTokens: 0, model: template.model }, options.orgId, options.userId, durationMs, `Primary: ${errorMsg}, Fallback: ${fallbackMsg}`);
        throw new Error(`AI call failed: ${errorMsg}. Fallback also failed: ${fallbackMsg}`);
      }
    }

    await logUsage(template, { text: "", inputTokens: 0, outputTokens: 0, model: template.model }, options.orgId, options.userId, durationMs, errorMsg);
    throw err;
  }
}

async function callAnthropic(
  template: PromptTemplate,
  systemPrompt: string,
  userMessage: string
): Promise<AIResponse> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: template.model,
      max_tokens: template.max_tokens,
      temperature: template.temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    text: data.content?.[0]?.text || "",
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0,
    model: data.model || template.model,
  };
}

async function callOpenAI(
  template: PromptTemplate,
  systemPrompt: string,
  userMessage: string
): Promise<AIResponse> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const model = template.model.startsWith("gpt") ? template.model : "gpt-4o";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: template.max_tokens,
      temperature: template.temperature,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content || "",
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
    model: data.model || model,
  };
}
