import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save, Play, History, Plus, Pencil, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PromptTemplate {
  id: string;
  name: string;
  description: string | null;
  version: number;
  system_prompt: string;
  user_prompt_template: string;
  model: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  updated_at: string;
}

export default function PromptManager() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selected, setSelected] = useState<PromptTemplate | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<PromptTemplate>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTemplates(); }, []);

  async function loadTemplates() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("prompt_templates")
      .select("*")
      .order("name");
    setTemplates(data || []);
    setLoading(false);
  }

  function startEdit(t: PromptTemplate) {
    setSelected(t);
    setDraft({ ...t });
    setEditing(true);
    setTestResult("");
  }

  function startNew() {
    setSelected(null);
    setDraft({
      name: "",
      description: "",
      system_prompt: "",
      user_prompt_template: "{{message}}",
      model: "claude-sonnet-4-5-20241022",
      temperature: 0.7,
      max_tokens: 2048,
      is_active: true,
    });
    setEditing(true);
    setTestResult("");
  }

  async function save() {
    if (!draft.name || !draft.system_prompt) return;
    setSaving(true);
    try {
      if (selected) {
        await (supabase as any)
          .from("prompt_templates")
          .update({
            description: draft.description,
            system_prompt: draft.system_prompt,
            user_prompt_template: draft.user_prompt_template,
            model: draft.model,
            temperature: draft.temperature,
            max_tokens: draft.max_tokens,
            is_active: draft.is_active,
          })
          .eq("id", selected.id);
      } else {
        await (supabase as any)
          .from("prompt_templates")
          .insert({
            name: draft.name,
            description: draft.description,
            system_prompt: draft.system_prompt,
            user_prompt_template: draft.user_prompt_template,
            model: draft.model,
            temperature: draft.temperature,
            max_tokens: draft.max_tokens,
            is_active: draft.is_active ?? true,
          });
      }
      await loadTemplates();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function testPrompt() {
    if (!draft.system_prompt) return;
    setTesting(true);
    setTestResult("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: [{ role: "user", content: "Antworte mit einem kurzen Testsatz, um zu bestätigen dass du funktionierst." }],
          systemPrompt: draft.system_prompt?.slice(0, 500),
        },
      });
      setTestResult(error ? `Fehler: ${error.message}` : (data?.response || data?.message || "Keine Antwort"));
    } catch (e: any) {
      setTestResult(`Fehler: ${e.message}`);
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (editing) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <button onClick={() => setEditing(false)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Zurück zur Übersicht
        </button>

        <h1 className="text-2xl font-bold text-white">
          {selected ? `Prompt bearbeiten: ${selected.name}` : "Neuer Prompt"}
        </h1>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name (eindeutig)</label>
              <input
                value={draft.name || ""}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                disabled={!!selected}
                className="w-full bg-[#111827] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50"
                placeholder="z.B. lead_post_generator"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Beschreibung</label>
              <input
                value={draft.description || ""}
                onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                className="w-full bg-[#111827] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm"
                placeholder="Kurze Beschreibung"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Modell</label>
              <select
                value={draft.model || "claude-sonnet-4-5-20241022"}
                onChange={e => setDraft(d => ({ ...d, model: e.target.value }))}
                className="w-full bg-[#111827] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="claude-sonnet-4-5-20241022">Claude Sonnet 4.5</option>
                <option value="claude-sonnet-4-6-20250514">Claude Sonnet 4.6</option>
                <option value="claude-opus-4-6-20250610">Claude Opus 4.6</option>
                <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Temperature ({draft.temperature})</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={draft.temperature || 0.7}
                onChange={e => setDraft(d => ({ ...d, temperature: parseFloat(e.target.value) }))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Max Tokens</label>
              <input
                type="number"
                value={draft.max_tokens || 2048}
                onChange={e => setDraft(d => ({ ...d, max_tokens: parseInt(e.target.value) }))}
                className="w-full bg-[#111827] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">System-Prompt</label>
            <textarea
              value={draft.system_prompt || ""}
              onChange={e => setDraft(d => ({ ...d, system_prompt: e.target.value }))}
              rows={8}
              className="w-full bg-[#111827] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm font-mono resize-y"
              placeholder="Du bist ein KI-Assistent für..."
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">User-Prompt-Template <span className="text-gray-500">(Variablen: {"{{variable}}"})</span></label>
            <textarea
              value={draft.user_prompt_template || ""}
              onChange={e => setDraft(d => ({ ...d, user_prompt_template: e.target.value }))}
              rows={4}
              className="w-full bg-[#111827] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm font-mono resize-y"
              placeholder="{{message}}"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.is_active ?? true}
                onChange={e => setDraft(d => ({ ...d, is_active: e.target.checked }))}
                className="rounded"
              />
              Aktiv
            </label>
            {selected && (
              <span className="text-xs text-gray-500">Version {selected.version}</span>
            )}
          </div>

          {testResult && (
            <div className="bg-[#0B0E14] border border-[#1E293B] rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-2">Test-Ergebnis:</p>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{testResult}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={saving || !draft.name || !draft.system_prompt}
              className="flex items-center gap-2 px-4 py-2 bg-[#D4A22A] text-black font-medium rounded-lg hover:bg-[#B88B1F] transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Speichern
            </button>
            <button
              onClick={testPrompt}
              disabled={testing || !draft.system_prompt}
              className="flex items-center gap-2 px-4 py-2 bg-[#111827] border border-[#1E293B] text-white rounded-lg hover:bg-[#1A2235] transition-colors disabled:opacity-50"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Testen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate("/dashboard/admin")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-2">
            <ArrowLeft className="w-4 h-4" /> Admin Dashboard
          </button>
          <h1 className="text-2xl font-bold text-white">Prompt-Verwaltung</h1>
          <p className="text-sm text-gray-400 mt-1">{templates.length} Prompts konfiguriert</p>
        </div>
        <button
          onClick={startNew}
          className="flex items-center gap-2 px-4 py-2 bg-[#D4A22A] text-black font-medium rounded-lg hover:bg-[#B88B1F] transition-colors"
        >
          <Plus className="w-4 h-4" /> Neuer Prompt
        </button>
      </div>

      <div className="grid gap-3">
        {templates.map(t => (
          <div
            key={t.id}
            onClick={() => startEdit(t)}
            className="bg-[#111827] border border-[#1E293B] rounded-xl p-4 cursor-pointer hover:border-[#D4A22A]/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${t.is_active ? "bg-green-400" : "bg-gray-500"}`} />
                <div>
                  <p className="text-white font-medium">{t.name}</p>
                  {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="bg-[#1A2235] px-2 py-0.5 rounded">{t.model.replace("claude-sonnet-4-5-20241022", "Sonnet 4.5").replace("gpt-4o", "GPT-4o")}</span>
                <span>v{t.version}</span>
                <span>T={t.temperature}</span>
                <Pencil className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
