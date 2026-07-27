import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Palette,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Clock,
  Type,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  updated_at: string;
  created_at: string;
}

const IMAGE_STYLES = [
  { value: "fotografisch", label: "Fotografisch" },
  { value: "illustriert", label: "Illustriert" },
  { value: "minimalistisch", label: "Minimalistisch" },
  { value: "abstrakt", label: "Abstrakt" },
];

const DEFAULT_COLORS = { primary: "#C5A059", secondary: "#1A1B1B", accent: "#E9CB8B" };

// ── Color swatch input ────────────────────────────────────────────────────────

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const isValid = /^#[0-9A-Fa-f]{6}$/.test(value);

  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[rgba(249,249,249,0.4)] mb-2">
        {label}
      </label>
      <div className="flex items-center gap-3">
        {/* Native color picker hidden behind swatch */}
        <label
          className="w-9 h-9 rounded-lg cursor-pointer flex-shrink-0 overflow-hidden"
          style={{
            background: isValid ? value : "rgba(249,249,249,0.1)",
            border: "2px solid rgba(249,249,249,0.15)",
          }}
          title="Farbe wählen"
        >
          <input
            type="color"
            value={isValid ? value : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="opacity-0 w-full h-full cursor-pointer"
          />
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          maxLength={7}
          className="flex-1 bg-transparent text-[13px] text-white outline-none px-3 py-2 rounded-lg"
          style={{
            border: `1px solid ${isValid ? "rgba(249,249,249,0.12)" : "rgba(232,116,103,0.4)"}`,
            background: "rgba(249,249,249,0.03)",
          }}
        />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BrandTokensPage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();

  const [tokens, setTokens] = useState<BrandTokens | null>(null);
  const [customerName, setCustomerName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // form state
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_COLORS.primary);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_COLORS.secondary);
  const [accentColor, setAccentColor] = useState(DEFAULT_COLORS.accent);
  const [fontFamily, setFontFamily] = useState("");
  const [fontWeight, setFontWeight] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [imageStyle, setImageStyle] = useState("fotografisch");
  const [claim, setClaim] = useState("");

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      // customer name
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .maybeSingle();
      setCustomerName(profile?.full_name || profile?.email || userId.slice(0, 8));

      const { data, error: err } = await (supabase as any)
        .from("brand_tokens")
        .select("*")
        .eq("user_id", userId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (err) throw err;

      if (data) {
        const t = data as BrandTokens;
        setTokens(t);
        setPrimaryColor(t.primary_color ?? DEFAULT_COLORS.primary);
        setSecondaryColor(t.secondary_color ?? DEFAULT_COLORS.secondary);
        setAccentColor(t.accent_color ?? DEFAULT_COLORS.accent);
        setFontFamily(t.font_family ?? "");
        setFontWeight(t.font_weight ?? "");
        setLogoUrl(t.logo_url ?? "");
        setImageStyle(t.image_style ?? "fotografisch");
        setClaim(t.claim ?? "");
      } else {
        // Will be created on first save
        setTokens(null);
      }
    } catch (err: any) {
      setError(err?.message || "Fehler beim Laden.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Save ────────────────────────────────────────────────────────────────────

  async function save() {
    if (!userId || !user) return;
    setSaving(true);
    setError(null);

    try {
      const newVersion = (tokens?.version ?? 0) + 1;
      const payload = {
        user_id: userId,
        primary_color: primaryColor || null,
        secondary_color: secondaryColor || null,
        accent_color: accentColor || null,
        font_family: fontFamily || null,
        font_weight: fontWeight || null,
        logo_url: logoUrl || null,
        image_style: imageStyle || null,
        claim: claim || null,
        version: newVersion,
        updated_at: new Date().toISOString(),
      };

      if (tokens?.id) {
        // update existing
        const { data, error: err } = await (supabase as any)
          .from("brand_tokens")
          .update(payload)
          .eq("id", tokens.id)
          .select()
          .single();
        if (err) throw err;
        setTokens(data as BrandTokens);
      } else {
        // insert new
        const { data, error: err } = await (supabase as any)
          .from("brand_tokens")
          .insert(payload)
          .select()
          .single();
        if (err) throw err;
        setTokens(data as BrandTokens);
      }

      flash("Brand-Tokens gespeichert.");
    } catch (err: any) {
      setError(err?.message || "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="glass-panel fade-up"
        style={{
          background: "linear-gradient(135deg, rgba(197,160,89,0.14), rgba(10,11,11,0.6))",
          borderColor: "rgba(197,160,89,0.2)",
        }}
      >
        <div className="relative z-[2] flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">
              Berater · Brand Tokens
            </span>
            <h1 className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>
              {customerName}<span className="text-[#C5A059]">.</span>
            </h1>
            <p className="text-[13px] text-[rgba(249,249,249,0.5)] mt-1">
              Brand-Identität & visuelle Tokens
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] text-[rgba(249,249,249,0.5)] hover:text-white border border-[rgba(249,249,249,0.08)] hover:border-[rgba(197,160,89,0.25)] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Neu laden
            </button>
          </div>
        </div>

        {/* Version info */}
        {tokens && (
          <div className="relative z-[2] mt-4 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[rgba(249,249,249,0.25)]" />
            <span className="text-[11px] text-[rgba(249,249,249,0.35)]">
              Version {tokens.version} · zuletzt gespeichert{" "}
              {new Date(tokens.updated_at).toLocaleString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
      </div>

      {/* ── Messages ───────────────────────────────────────────────────────── */}
      {error && (
        <div
          className="glass-panel"
          style={{ borderColor: "rgba(232,116,103,0.3)", background: "rgba(232,116,103,0.06)" }}
        >
          <div className="relative z-[2] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#E87467] flex-shrink-0" />
            <p className="text-[13px] text-[#E87467]">{error}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div
          className="glass-panel"
          style={{ borderColor: "rgba(127,194,155,0.3)", background: "rgba(127,194,155,0.06)" }}
        >
          <div className="relative z-[2] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#7FC29B] flex-shrink-0" />
            <p className="text-[13px] text-[#7FC29B]">{successMsg}</p>
          </div>
        </div>
      )}

      {/* ── Colors ─────────────────────────────────────────────────────────── */}
      <div className="glass-panel fade-up" style={{ animationDelay: "60ms" }}>
        <div className="relative z-[2]">
          <div className="flex items-center gap-2 mb-5">
            <Palette className="w-4 h-4 text-[#C5A059]" />
            <span className="text-[15px] font-semibold text-white" style={{ fontFamily: "var(--font-serif)" }}>
              Farben
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <ColorField label="Primärfarbe" value={primaryColor} onChange={setPrimaryColor} />
            <ColorField label="Sekundärfarbe" value={secondaryColor} onChange={setSecondaryColor} />
            <ColorField label="Akzentfarbe" value={accentColor} onChange={setAccentColor} />
          </div>

          {/* Color preview strip */}
          <div className="mt-5 flex h-8 rounded-xl overflow-hidden">
            {[primaryColor, secondaryColor, accentColor].map((c, i) => (
              <div
                key={i}
                className="flex-1"
                style={{ background: /^#[0-9A-Fa-f]{6}$/.test(c) ? c : "rgba(249,249,249,0.05)" }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Fonts ──────────────────────────────────────────────────────────── */}
      <div className="glass-panel fade-up" style={{ animationDelay: "100ms" }}>
        <div className="relative z-[2]">
          <div className="flex items-center gap-2 mb-5">
            <Type className="w-4 h-4 text-[#C5A059]" />
            <span className="text-[15px] font-semibold text-white" style={{ fontFamily: "var(--font-serif)" }}>
              Typografie
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[rgba(249,249,249,0.4)] mb-2">
                Schriftart (Font Family)
              </label>
              <input
                type="text"
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                placeholder="z.B. Inter, Playfair Display"
                className="w-full bg-transparent text-[13px] text-white outline-none px-3 py-2 rounded-lg"
                style={{
                  border: "1px solid rgba(249,249,249,0.12)",
                  background: "rgba(249,249,249,0.03)",
                }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[rgba(249,249,249,0.4)] mb-2">
                Schriftgewicht (Font Weight)
              </label>
              <input
                type="text"
                value={fontWeight}
                onChange={(e) => setFontWeight(e.target.value)}
                placeholder="z.B. 400, 600, bold"
                className="w-full bg-transparent text-[13px] text-white outline-none px-3 py-2 rounded-lg"
                style={{
                  border: "1px solid rgba(249,249,249,0.12)",
                  background: "rgba(249,249,249,0.03)",
                }}
              />
            </div>
          </div>

          {/* Font preview */}
          {fontFamily && (
            <div
              className="mt-4 px-4 py-3 rounded-xl"
              style={{ background: "rgba(249,249,249,0.03)", border: "1px solid rgba(249,249,249,0.07)" }}
            >
              <p
                className="text-[#E9CB8B]"
                style={{
                  fontFamily: fontFamily || undefined,
                  fontWeight: fontWeight || undefined,
                  fontSize: 18,
                }}
              >
                Das ist deine Markensprache.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Logo ───────────────────────────────────────────────────────────── */}
      <div className="glass-panel fade-up" style={{ animationDelay: "140ms" }}>
        <div className="relative z-[2]">
          <div className="flex items-center gap-2 mb-5">
            <ImageIcon className="w-4 h-4 text-[#C5A059]" />
            <span className="text-[15px] font-semibold text-white" style={{ fontFamily: "var(--font-serif)" }}>
              Logo & Bildstil
            </span>
          </div>

          <div className="space-y-5">
            {/* Logo URL */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[rgba(249,249,249,0.4)] mb-2">
                Logo URL
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full bg-transparent text-[13px] text-white outline-none px-3 py-2 rounded-lg"
                style={{
                  border: "1px solid rgba(249,249,249,0.12)",
                  background: "rgba(249,249,249,0.03)",
                }}
              />
            </div>

            {/* Logo preview */}
            {logoUrl && (
              <div
                className="flex items-center justify-center p-6 rounded-xl"
                style={{ background: "rgba(249,249,249,0.03)", border: "1px solid rgba(249,249,249,0.07)" }}
              >
                <img
                  src={logoUrl}
                  alt="Logo Vorschau"
                  className="max-h-24 max-w-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}

            {/* Image style dropdown */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[rgba(249,249,249,0.4)] mb-2">
                Bildstil
              </label>
              <select
                value={imageStyle}
                onChange={(e) => setImageStyle(e.target.value)}
                className="w-full bg-transparent text-[13px] text-white outline-none px-3 py-2 rounded-lg appearance-none"
                style={{
                  border: "1px solid rgba(249,249,249,0.12)",
                  background: "rgba(15,16,16,0.85)",
                  cursor: "pointer",
                }}
              >
                {IMAGE_STYLES.map((s) => (
                  <option key={s.value} value={s.value} style={{ background: "#0F1010" }}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Claim ──────────────────────────────────────────────────────────── */}
      <div className="glass-panel fade-up" style={{ animationDelay: "180ms" }}>
        <div className="relative z-[2]">
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[rgba(249,249,249,0.4)] mb-2">
            Claim / Slogan
          </label>
          <input
            type="text"
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            placeholder="z.B. Mehr Kunden durch LinkedIn"
            className="w-full bg-transparent text-[13px] text-white outline-none px-3 py-2 rounded-lg"
            style={{
              border: "1px solid rgba(249,249,249,0.12)",
              background: "rgba(249,249,249,0.03)",
            }}
          />
          {claim && (
            <p
              className="mt-3 text-[18px] font-semibold text-center"
              style={{ color: primaryColor || "#C5A059", fontFamily: fontFamily || undefined }}
            >
              "{claim}"
            </p>
          )}
        </div>
      </div>

      {/* ── Save button ─────────────────────────────────────────────────────── */}
      <div className="flex justify-end pb-6">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold transition-all"
          style={{
            background: "linear-gradient(135deg, #C5A059, #E9CB8B)",
            color: "#0A0B0B",
            opacity: saving ? 0.6 : 1,
            boxShadow: saving ? "none" : "0 4px 20px rgba(197,160,89,0.3)",
          }}
        >
          <Save className="w-4 h-4" />
          {saving ? "Speichern…" : "Brand-Tokens speichern"}
        </button>
      </div>
    </div>
  );
}
