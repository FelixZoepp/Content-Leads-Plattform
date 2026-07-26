import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Sparkles, Loader2, Copy, Check, Save,
  Mail, Phone, Linkedin, ChevronDown, MessageSquare,
} from "lucide-react";

type Channel = "email" | "phone" | "linkedin";

interface Tenant {
  id: string;
  company_name: string;
  contact_name: string | null;
  user_id: string;
}

interface AiInsight {
  id: string;
  tenant_id?: string;
  content: string;
  type: string;
  created_at: string;
}

interface UpsellSignal {
  id: string;
  tenant_id: string;
  signal_type: string;
  description: string | null;
  created_at: string;
}

interface PitchVariant {
  title: string;
  body: string;
  channel: Channel;
}

interface SavedTemplate {
  id: string;
  title: string;
  body: string;
  channel: Channel;
  tenant_id: string | null;
  created_at: string;
}

const CHANNEL_CONFIG: Record<Channel, { label: string; icon: React.ElementType; hint: string; color: string }> = {
  email: {
    label: "E-Mail",
    icon: Mail,
    hint: "Formell, strukturiert, mit Betreff & Grußformel",
    color: "#7FC29B",
  },
  phone: {
    label: "Telefon",
    icon: Phone,
    hint: "Kurz, direkt, gesprächig – ideal als Gesprächseinstieg",
    color: "#E9CB8B",
  },
  linkedin: {
    label: "LinkedIn",
    icon: Linkedin,
    hint: "Persönlich, locker, max. 3 kurze Absätze",
    color: "#5B9BD5",
  },
};

export default function PitchGenerator() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [channel, setChannel] = useState<Channel>("email");
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [signals, setSignals] = useState<UpsellSignal[]>([]);
  const [variants, setVariants] = useState<PitchVariant[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [savedIdx, setSavedIdx] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      loadCustomerContext(selectedTenantId);
    } else {
      setInsights([]);
      setSignals([]);
    }
  }, [selectedTenantId]);

  async function loadTenants() {
    setLoading(true);
    const { data } = await supabase
      .from("tenants")
      .select("id, company_name, contact_name, user_id")
      .eq("is_active", true)
      .order("company_name");
    setTenants(data || []);
    setLoading(false);
  }

  async function loadCustomerContext(tenantId: string) {
    const [insightsRes, signalsRes] = await Promise.all([
      (supabase as any)
        .from("ai_insights")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(5),
      (supabase as any)
        .from("upsell_signals")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    setInsights(insightsRes.data || []);
    setSignals(signalsRes.data || []);
  }

  async function generatePitch() {
    if (!selectedTenantId) return;
    const tenant = tenants.find(t => t.id === selectedTenantId);
    if (!tenant) return;

    setGenerating(true);
    setVariants([]);

    try {
      const channelConf = CHANNEL_CONFIG[channel];
      const insightContext = insights.length > 0
        ? `\n\nVorhandene KI-Insights:\n${insights.map(i => `- [${i.type}] ${i.content.slice(0, 300)}`).join("\n")}`
        : "";
      const signalContext = signals.length > 0
        ? `\n\nUpsell-Signale:\n${signals.map(s => `- ${s.signal_type}: ${s.description || ""}`).join("\n")}`
        : "";

      const systemPrompt = `Du bist ein erfahrener B2B-Sales-Experte für LinkedIn-Agenturen.
Erstelle 3 verschiedene Pitch-Nachrichten-Varianten für den Kanal "${channelConf.label}".
Stil-Hinweis für diesen Kanal: ${channelConf.hint}

Regeln:
- Kein Sales-Jargon, keine leeren Phrasen
- Konkret auf den Kunden eingehen wenn Daten vorhanden
- Jede Variante hat einen anderen Ansatz (z.B. Variante 1: Ergebnis-fokussiert, Variante 2: Problem-fokussiert, Variante 3: Neugier-basiert)
- Antworte ausschließlich als valides JSON-Array mit dieser Struktur:
[
  {"title": "Variante 1 – Ergebnis-fokussiert", "body": "...Nachrichtentext..."},
  {"title": "Variante 2 – Problem-fokussiert", "body": "..."},
  {"title": "Variante 3 – Neugier-basiert", "body": "..."}
]`;

      const userMessage = `Kunde: ${tenant.company_name}${tenant.contact_name ? ` (Ansprechpartner: ${tenant.contact_name})` : ""}
Kanal: ${channelConf.label}${insightContext}${signalContext}

Erstelle jetzt die 3 Pitch-Varianten.`;

      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        },
      });

      if (error) throw error;

      const raw = data?.response || data?.message || "";
      // Parse JSON out of the response (handle markdown code blocks)
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed: Array<{ title: string; body: string }> = JSON.parse(jsonMatch[0]);
        setVariants(parsed.map(v => ({ ...v, channel })));
      } else {
        // Fallback: treat full response as a single variant
        setVariants([{ title: "Pitch-Variante", body: raw, channel }]);
      }
      setSavedIdx(new Set());
    } catch (e: any) {
      setVariants([{
        title: "Fehler",
        body: `Generierung fehlgeschlagen: ${e.message}`,
        channel,
      }]);
    } finally {
      setGenerating(false);
    }
  }

  async function copyVariant(body: string, idx: number) {
    try {
      await navigator.clipboard.writeText(body);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      // silently fail
    }
  }

  async function saveAsTemplate(variant: PitchVariant, idx: number) {
    setSavingIdx(idx);
    const tenant = tenants.find(t => t.id === selectedTenantId);
    try {
      await (supabase as any).from("pitch_templates").insert({
        title: variant.title,
        body: variant.body,
        channel: variant.channel,
        tenant_id: selectedTenantId || null,
        company_name: tenant?.company_name || null,
        created_at: new Date().toISOString(),
      });
      setSavedIdx(prev => new Set([...prev, idx]));
    } catch (e: any) {
      console.error("Speichern fehlgeschlagen:", e.message);
    } finally {
      setSavingIdx(null);
    }
  }

  const selectedTenant = tenants.find(t => t.id === selectedTenantId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate("/dashboard/admin")}
          className="flex items-center gap-2 text-sm text-[rgba(249,249,249,0.4)] hover:text-white transition mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Admin Dashboard
        </button>
        <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">CL-031</span>
        <h1 className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>Pitch-Nachrichten-Generator</h1>
        <p className="text-[12px] text-[rgba(249,249,249,0.4)] mt-0.5">
          KI-generierte Pitch-Varianten basierend auf Kundendaten & Upsell-Signalen
        </p>
      </div>

      {/* Config panel */}
      <div className="glass-panel space-y-5">
        <div className="relative z-[2] space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {/* Customer selector */}
            <div>
              <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-1.5">
                Kunde auswählen *
              </label>
              <div className="relative">
                <select
                  value={selectedTenantId}
                  onChange={e => setSelectedTenantId(e.target.value)}
                  className="w-full appearance-none bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3 py-2.5 text-[13px] text-white outline-none focus:border-[rgba(197,160,89,0.3)] transition pr-8"
                >
                  <option value="" className="bg-[#141616]">— Kunde wählen —</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id} className="bg-[#141616]">{t.company_name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(249,249,249,0.3)] pointer-events-none" />
              </div>
            </div>

            {/* Channel selector */}
            <div>
              <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-1.5">
                Kanal
              </label>
              <div className="flex gap-2">
                {(Object.keys(CHANNEL_CONFIG) as Channel[]).map(ch => {
                  const conf = CHANNEL_CONFIG[ch];
                  const Icon = conf.icon;
                  const active = channel === ch;
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setChannel(ch)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[11px] font-medium transition border"
                      style={{
                        background: active ? `${conf.color}15` : "rgba(10,11,11,0.4)",
                        borderColor: active ? `${conf.color}50` : "rgba(249,249,249,0.08)",
                        color: active ? conf.color : "rgba(249,249,249,0.4)",
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {conf.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-[rgba(249,249,249,0.3)] mt-1.5">
                {CHANNEL_CONFIG[channel].hint}
              </p>
            </div>
          </div>

          <button
            onClick={generatePitch}
            disabled={generating || !selectedTenantId}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-semibold text-white transition disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #C5A059, #775A19)", boxShadow: "0 0 18px rgba(197,160,89,0.35)" }}
          >
            {generating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generiere Pitches…</>
              : <><Sparkles className="w-4 h-4" /> Pitch generieren</>
            }
          </button>
        </div>
      </div>

      {/* Customer context */}
      {selectedTenant && (insights.length > 0 || signals.length > 0) && (
        <div className="glass-panel" style={{ borderColor: "rgba(197,160,89,0.15)" }}>
          <div className="relative z-[2]">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#E9CB8B] mb-3">
              Kontext für {selectedTenant.company_name}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {insights.length > 0 && (
                <div>
                  <p className="text-[10px] text-[rgba(249,249,249,0.4)] mb-2">KI-Insights ({insights.length})</p>
                  <div className="space-y-1.5">
                    {insights.slice(0, 3).map(ins => (
                      <div key={ins.id} className="text-[11px] text-[rgba(249,249,249,0.6)] bg-[rgba(249,249,249,0.03)] rounded-lg px-3 py-2 border border-[rgba(249,249,249,0.05)]">
                        <span className="text-[9px] uppercase tracking-wide text-[rgba(249,249,249,0.3)] block mb-0.5">{ins.type}</span>
                        {ins.content.slice(0, 150)}{ins.content.length > 150 ? "…" : ""}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {signals.length > 0 && (
                <div>
                  <p className="text-[10px] text-[rgba(249,249,249,0.4)] mb-2">Upsell-Signale ({signals.length})</p>
                  <div className="space-y-1.5">
                    {signals.slice(0, 5).map(sig => (
                      <div key={sig.id} className="text-[11px] text-[rgba(249,249,249,0.6)] bg-[rgba(249,249,249,0.03)] rounded-lg px-3 py-2 border border-[rgba(249,249,249,0.05)]">
                        <span className="text-[9px] uppercase tracking-wide text-[#E9CB8B] block mb-0.5">{sig.signal_type}</span>
                        {sig.description?.slice(0, 120) || "—"}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No context hint */}
      {selectedTenant && insights.length === 0 && signals.length === 0 && (
        <div className="text-center py-3 text-[11px] text-[rgba(249,249,249,0.3)]">
          Keine KI-Insights oder Upsell-Signale für {selectedTenant.company_name} gefunden — Pitch wird mit allgemeinem Kontext generiert.
        </div>
      )}

      {/* Generated variants */}
      {variants.length > 0 && (
        <div className="space-y-4">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)]">
            Generierte Varianten · {CHANNEL_CONFIG[channel].label}
          </p>
          {variants.map((variant, idx) => {
            const isFirst = idx === 0;
            const isCopied = copiedIdx === idx;
            const isSaved = savedIdx.has(idx);
            const isSaving = savingIdx === idx;
            const Icon = CHANNEL_CONFIG[variant.channel].icon;
            const color = CHANNEL_CONFIG[variant.channel].color;

            return (
              <div
                key={idx}
                className="glass-panel"
                style={{ borderColor: isFirst ? `${color}25` : "rgba(249,249,249,0.06)" }}
              >
                <div className="relative z-[2] space-y-3">
                  {/* Variant header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: `${color}15`, border: `1px solid ${color}30` }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                      </div>
                      <span className="text-[12px] font-semibold text-white">{variant.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyVariant(variant.body, idx)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border border-[rgba(249,249,249,0.08)] text-[rgba(249,249,249,0.5)] hover:text-white hover:bg-[rgba(249,249,249,0.04)] transition"
                      >
                        {isCopied
                          ? <><Check className="w-3.5 h-3.5 text-[#7FC29B]" /> Kopiert</>
                          : <><Copy className="w-3.5 h-3.5" /> Kopieren</>
                        }
                      </button>
                      <button
                        onClick={() => saveAsTemplate(variant, idx)}
                        disabled={isSaving || isSaved}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition disabled:opacity-60"
                        style={{
                          background: isSaved ? "rgba(127,194,155,0.1)" : "rgba(197,160,89,0.1)",
                          border: `1px solid ${isSaved ? "rgba(127,194,155,0.3)" : "rgba(197,160,89,0.3)"}`,
                          color: isSaved ? "#7FC29B" : "#E9CB8B",
                        }}
                      >
                        {isSaving
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Speichern…</>
                          : isSaved
                          ? <><Check className="w-3.5 h-3.5" /> Gespeichert</>
                          : <><Save className="w-3.5 h-3.5" /> Als Vorlage</>
                        }
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="bg-[rgba(10,11,11,0.5)] rounded-xl p-4 border border-[rgba(249,249,249,0.05)]">
                    <p className="text-[13px] text-[rgba(249,249,249,0.82)] whitespace-pre-wrap leading-relaxed">
                      {variant.body}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
