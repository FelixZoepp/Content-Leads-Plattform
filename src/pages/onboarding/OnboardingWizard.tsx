import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  Upload,
  Video,
  CalendarDays,
  Mic,
  FileCheck2,
  CheckSquare,
  ChevronRight,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface OnboardingStep {
  id: string;
  track_id: string;
  type: "form" | "video" | "booking" | "recording" | "upload" | "approval" | "confirm";
  title: string;
  description: string | null;
  config_json: any;
  required: boolean;
  order: number;
  unlocks_features: string[] | null;
}

interface OnboardingProgress {
  id?: string;
  user_id: string;
  step_id: string;
  status: "pending" | "completed" | "skipped";
  data_json: any;
  completed_at: string | null;
}

interface Toast {
  id: number;
  message: string;
}

// ── Step type icon map ────────────────────────────────────────────────────
const STEP_ICONS: Record<string, React.ElementType> = {
  form: FileCheck2,
  video: Video,
  booking: CalendarDays,
  recording: Mic,
  upload: Upload,
  approval: Clock,
  confirm: CheckSquare,
};

// ── Toast ─────────────────────────────────────────────────────────────────
function ToastBanner({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-6 right-6 z-[200] space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg pointer-events-auto"
          style={{
            background: "linear-gradient(135deg, rgba(197,160,89,0.25), rgba(119,90,25,0.2))",
            border: "1px solid rgba(197,160,89,0.35)",
            backdropFilter: "blur(12px)",
          }}
        >
          <Sparkles className="w-4 h-4 text-[#E9CB8B] flex-shrink-0" />
          <span className="text-[13px] text-white font-medium">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────
function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)]">
          Fortschritt
        </span>
        <span className="text-[11px] font-semibold text-[#E9CB8B]">
          {current} / {total} Schritte
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(249,249,249,0.08)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #C5A059, #E9CB8B)",
          }}
        />
      </div>
    </div>
  );
}

// ── Step renderer ─────────────────────────────────────────────────────────
function StepRenderer({
  step,
  progress,
  onComplete,
  saving,
}: {
  step: OnboardingStep;
  progress: OnboardingProgress | null;
  onComplete: (dataJson: any) => void;
  saving: boolean;
}) {
  const isCompleted = progress?.status === "completed";

  // Form step
  if (step.type === "form") {
    const fields: { key: string; label: string; type?: string }[] =
      step.config_json?.fields ?? Object.keys(step.config_json ?? {}).map((k) => ({ key: k, label: k }));

    const [formData, setFormData] = useState<Record<string, string>>(
      progress?.data_json ?? {}
    );

    return (
      <div className="space-y-4">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-1.5">
              {f.label}
            </label>
            <input
              type={f.type ?? "text"}
              value={formData[f.key] ?? ""}
              onChange={(e) => setFormData((d) => ({ ...d, [f.key]: e.target.value }))}
              disabled={isCompleted}
              className="w-full bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-[rgba(249,249,249,0.2)] outline-none focus:border-[rgba(197,160,89,0.3)] transition disabled:opacity-60"
              placeholder={f.label}
            />
          </div>
        ))}
        {!isCompleted && (
          <button
            onClick={() => onComplete(formData)}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold text-white transition disabled:opacity-50 mt-2"
            style={{ background: "linear-gradient(135deg, #C5A059, #775A19)", boxShadow: "0 0 18px rgba(197,160,89,0.3)" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            Weiter
          </button>
        )}
      </div>
    );
  }

  // Video step
  if (step.type === "video") {
    const url: string = step.config_json?.url ?? "";
    return (
      <div className="space-y-5">
        {url && (
          <div className="aspect-video rounded-xl overflow-hidden border border-[rgba(249,249,249,0.08)]">
            <iframe
              src={url}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        {!isCompleted && (
          <button
            onClick={() => onComplete({ watched: true })}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold text-white transition disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #C5A059, #775A19)", boxShadow: "0 0 18px rgba(197,160,89,0.3)" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Video gesehen – Weiter
          </button>
        )}
      </div>
    );
  }

  // Booking step
  if (step.type === "booking") {
    const calUrl: string = step.config_json?.url ?? step.config_json?.calendar_url ?? "";
    const label: string = step.config_json?.button_label ?? "Termin buchen";
    return (
      <div className="space-y-5">
        <p className="text-[13px] text-[rgba(249,249,249,0.6)]">
          {step.config_json?.instruction ?? "Buche jetzt deinen Onboarding-Termin mit deinem Berater."}
        </p>
        {calUrl && (
          <a
            href={calUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold text-white transition"
            style={{ background: "rgba(197,160,89,0.15)", border: "1px solid rgba(197,160,89,0.3)" }}
          >
            <CalendarDays className="w-4 h-4 text-[#E9CB8B]" />
            {label}
          </a>
        )}
        {!isCompleted && (
          <button
            onClick={() => onComplete({ booked: true })}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold text-white transition disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #C5A059, #775A19)", boxShadow: "0 0 18px rgba(197,160,89,0.3)" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Termin gebucht – Weiter
          </button>
        )}
      </div>
    );
  }

  // Recording step
  if (step.type === "recording") {
    const [consented, setConsented] = useState(progress?.data_json?.consented ?? false);
    return (
      <div className="space-y-5">
        {!consented ? (
          <div
            className="rounded-xl p-5 space-y-4"
            style={{ background: "rgba(197,160,89,0.06)", border: "1px solid rgba(197,160,89,0.2)" }}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#E9CB8B] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-semibold text-white mb-1">Einwilligung erforderlich</p>
                <p className="text-[12px] text-[rgba(249,249,249,0.6)]">
                  {step.config_json?.consent_text ??
                    "Ich stimme zu, dass diese Aufnahme gespeichert und durch Content-Leads zur Analyse verwendet werden darf."}
                </p>
              </div>
            </div>
            <button
              onClick={() => setConsented(true)}
              className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-[#E9CB8B] border border-[rgba(197,160,89,0.3)] hover:bg-[rgba(197,160,89,0.08)] transition"
            >
              Ich stimme zu
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="rounded-xl p-6 flex flex-col items-center gap-3 text-center"
              style={{ background: "rgba(249,249,249,0.03)", border: "1px dashed rgba(249,249,249,0.1)" }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "rgba(197,160,89,0.15)" }}
              >
                <Mic className="w-7 h-7 text-[#E9CB8B]" />
              </div>
              <p className="text-[13px] font-semibold text-white">Aufnahme starten</p>
              <p className="text-[11px] text-[rgba(249,249,249,0.4)]">
                Aufnahme-Integration folgt — bitte nutze die Funktion sobald sie freigeschaltet ist.
              </p>
            </div>
            {!isCompleted && (
              <button
                onClick={() => onComplete({ consented: true, recorded: true })}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold text-white transition disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #C5A059, #775A19)", boxShadow: "0 0 18px rgba(197,160,89,0.3)" }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Weiter
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Upload step
  if (step.type === "upload") {
    const [fileUrl, setFileUrl] = useState<string>(progress?.data_json?.url ?? "");
    const [uploading, setUploading] = useState(false);

    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      const path = `onboarding/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage.from("uploads").upload(path, file);
      if (!error && data) {
        const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(data.path);
        setFileUrl(urlData.publicUrl);
      }
      setUploading(false);
    }

    return (
      <div className="space-y-5">
        <label
          className="flex flex-col items-center gap-3 p-6 rounded-xl cursor-pointer transition"
          style={{ background: "rgba(249,249,249,0.03)", border: "1px dashed rgba(249,249,249,0.1)" }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: "rgba(197,160,89,0.15)" }}
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 text-[#E9CB8B] animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-[#E9CB8B]" />
            )}
          </div>
          <p className="text-[13px] text-white font-medium">
            {uploading ? "Wird hochgeladen…" : "Datei auswählen"}
          </p>
          <p className="text-[11px] text-[rgba(249,249,249,0.3)]">
            {step.config_json?.accepted_types ?? "PDF, JPG, PNG bis 10 MB"}
          </p>
          <input
            type="file"
            className="hidden"
            onChange={handleFile}
            disabled={isCompleted || uploading}
            accept={step.config_json?.accepted_types}
          />
        </label>
        {fileUrl && (
          <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "rgba(127,194,155,0.1)", border: "1px solid rgba(127,194,155,0.2)" }}>
            <CheckCircle2 className="w-4 h-4 text-[#7FC29B] flex-shrink-0" />
            <a href={fileUrl} target="_blank" rel="noreferrer" className="text-[12px] text-[#7FC29B] truncate hover:underline">
              Datei hochgeladen
            </a>
          </div>
        )}
        {!isCompleted && (
          <button
            onClick={() => onComplete({ url: fileUrl })}
            disabled={saving || (!fileUrl && step.required)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold text-white transition disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #C5A059, #775A19)", boxShadow: "0 0 18px rgba(197,160,89,0.3)" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            Weiter
          </button>
        )}
      </div>
    );
  }

  // Approval step
  if (step.type === "approval") {
    return (
      <div className="space-y-4">
        <div
          className="rounded-xl p-5 flex items-start gap-4"
          style={{ background: "rgba(233,203,139,0.06)", border: "1px solid rgba(233,203,139,0.2)" }}
        >
          <Clock className="w-5 h-5 text-[#E9CB8B] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-white mb-1">Warte auf Freigabe</p>
            <p className="text-[12px] text-[rgba(249,249,249,0.55)]">
              {step.config_json?.message ??
                "Dein Berater prüft gerade deine Angaben und gibt diesen Schritt frei. Du wirst benachrichtigt sobald es weitergeht."}
            </p>
          </div>
        </div>
        {isCompleted && (
          <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "rgba(127,194,155,0.1)", border: "1px solid rgba(127,194,155,0.2)" }}>
            <CheckCircle2 className="w-4 h-4 text-[#7FC29B]" />
            <span className="text-[12px] text-[#7FC29B]">Freigegeben</span>
          </div>
        )}
      </div>
    );
  }

  // Confirm step
  if (step.type === "confirm") {
    const [checked, setChecked] = useState(progress?.data_json?.confirmed ?? false);
    const label: string = step.config_json?.label ?? "Ich bestätige, dass ich alle Informationen gelesen habe.";
    return (
      <div className="space-y-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <div
            onClick={() => !isCompleted && setChecked((c) => !c)}
            className={`w-5 h-5 rounded flex items-center justify-center border transition flex-shrink-0 mt-0.5 ${
              checked
                ? "bg-[#C5A059] border-[#C5A059]"
                : "border-[rgba(249,249,249,0.2)] bg-transparent"
            }`}
          >
            {checked && (
              <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 12 12">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className="text-[13px] text-[rgba(249,249,249,0.8)]">{label}</span>
        </label>
        {!isCompleted && (
          <button
            onClick={() => onComplete({ confirmed: true })}
            disabled={saving || !checked}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold text-white transition disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #C5A059, #775A19)", boxShadow: "0 0 18px rgba(197,160,89,0.3)" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Bestätigen & Weiter
          </button>
        )}
      </div>
    );
  }

  return null;
}

// ── Main Wizard ───────────────────────────────────────────────────────────
export default function OnboardingWizard() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, OnboardingProgress>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [allDone, setAllDone] = useState(false);

  const showToast = useCallback((message: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  useEffect(() => {
    if (user) loadWizard();
  }, [user]);

  async function loadWizard() {
    setLoading(true);
    setError(null);
    try {
      if (!user) return;

      // 1. Find user's active customer_product + product
      const { data: cpData } = await (supabase as any)
        .from("customer_products")
        .select("id, product_id, product:products(id, name, slug)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .single();

      if (!cpData) {
        setError("Kein aktives Produkt gefunden. Bitte wende dich an deinen Berater.");
        setLoading(false);
        return;
      }

      // 2. Find the onboarding track for that product
      const { data: trackData } = await (supabase as any)
        .from("onboarding_tracks")
        .select("id, name, steps:onboarding_steps(*)")
        .eq("product_id", cpData.product_id)
        .limit(1)
        .single();

      if (!trackData) {
        setError("Kein Onboarding-Track für dein Produkt konfiguriert.");
        setLoading(false);
        return;
      }

      const sortedSteps: OnboardingStep[] = (trackData.steps ?? []).sort(
        (a: any, b: any) => a.order - b.order
      );
      setSteps(sortedSteps);

      // 3. Load existing progress
      const { data: progressData } = await (supabase as any)
        .from("onboarding_progress")
        .select("*")
        .eq("user_id", user.id)
        .in(
          "step_id",
          sortedSteps.map((s) => s.id)
        );

      const map: Record<string, OnboardingProgress> = {};
      for (const p of progressData ?? []) {
        map[p.step_id] = p;
      }
      setProgressMap(map);

      // 4. Find first incomplete step
      const firstIncomplete = sortedSteps.findIndex(
        (s) => map[s.id]?.status !== "completed"
      );
      setCurrentIndex(firstIncomplete === -1 ? sortedSteps.length - 1 : firstIncomplete);

      if (
        sortedSteps.length > 0 &&
        sortedSteps.every((s) => map[s.id]?.status === "completed")
      ) {
        setAllDone(true);
      }
    } catch (e: any) {
      setError("Fehler beim Laden des Onboardings.");
      console.error(e);
    }
    setLoading(false);
  }

  async function handleStepComplete(step: OnboardingStep, dataJson: any) {
    if (!user) return;
    setSaving(true);
    try {
      const existing = progressMap[step.id];
      const payload = {
        user_id: user.id,
        step_id: step.id,
        status: "completed" as const,
        data_json: dataJson,
        completed_at: new Date().toISOString(),
      };

      if (existing?.id) {
        await (supabase as any)
          .from("onboarding_progress")
          .update(payload)
          .eq("id", existing.id);
      } else {
        await (supabase as any).from("onboarding_progress").insert(payload);
      }

      // Update local map
      setProgressMap((prev) => ({
        ...prev,
        [step.id]: { ...payload, id: existing?.id },
      }));

      // Show feature unlock toasts
      if (step.unlocks_features && step.unlocks_features.length > 0) {
        showToast("Neues Feature freigeschaltet!");
      }

      // Advance to next step or finish
      if (currentIndex < steps.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        setAllDone(true);
      }
    } catch (e: any) {
      console.error("Progress save error:", e);
    }
    setSaving(false);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-[#E87467] mx-auto" />
        <p className="text-[14px] text-[rgba(249,249,249,0.6)]">{error}</p>
        <button
          onClick={() => nav("/dashboard")}
          className="text-[12px] text-[#E9CB8B] hover:underline"
        >
          Zurück zum Dashboard
        </button>
      </div>
    );
  }

  if (allDone) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-6">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
          style={{ background: "linear-gradient(135deg, rgba(197,160,89,0.25), rgba(119,90,25,0.15))", border: "1px solid rgba(197,160,89,0.35)" }}
        >
          <CheckCircle2 className="w-10 h-10 text-[#E9CB8B]" />
        </div>
        <div>
          <h2 className="text-2xl text-white mb-2" style={{ fontFamily: "var(--font-serif)" }}>
            Onboarding abgeschlossen
          </h2>
          <p className="text-[13px] text-[rgba(249,249,249,0.5)]">
            Du hast alle Schritte erfolgreich abgeschlossen. Willkommen an Bord!
          </p>
        </div>
        <button
          onClick={() => nav("/dashboard")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-semibold text-white transition"
          style={{ background: "linear-gradient(135deg, #C5A059, #775A19)", boxShadow: "0 0 20px rgba(197,160,89,0.35)" }}
        >
          Zum Dashboard <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const completedCount = steps.filter(
    (s) => progressMap[s.id]?.status === "completed"
  ).length;
  const currentStep = steps[currentIndex];

  return (
    <>
      <ToastBanner toasts={toasts} />
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-panel fade-up">
          <div className="relative z-[2]">
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">
              Onboarding
            </span>
            <h1 className="text-xl text-white mb-4" style={{ fontFamily: "var(--font-serif)" }}>
              Willkommen — lass uns loslegen
            </h1>
            <ProgressBar current={completedCount} total={steps.length} />
          </div>
        </div>

        {/* Step nav dots */}
        {steps.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {steps.map((s, i) => {
              const done = progressMap[s.id]?.status === "completed";
              const active = i === currentIndex;
              return (
                <button
                  key={s.id}
                  onClick={() => done || i <= currentIndex ? setCurrentIndex(i) : undefined}
                  title={s.title}
                  className={`transition rounded-full flex-shrink-0 ${
                    active
                      ? "w-3 h-3"
                      : "w-2 h-2 opacity-60 hover:opacity-80"
                  }`}
                  style={{
                    background: done
                      ? "linear-gradient(135deg, #C5A059, #E9CB8B)"
                      : active
                      ? "#C5A059"
                      : "rgba(249,249,249,0.2)",
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Current step */}
        {currentStep && (
          <div className="glass-panel fade-up">
            <div className="relative z-[2]">
              {/* Step header */}
              <div className="flex items-start gap-4 mb-6">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: progressMap[currentStep.id]?.status === "completed"
                      ? "rgba(127,194,155,0.15)"
                      : "rgba(197,160,89,0.15)",
                    border: `1px solid ${
                      progressMap[currentStep.id]?.status === "completed"
                        ? "rgba(127,194,155,0.3)"
                        : "rgba(197,160,89,0.25)"
                    }`,
                  }}
                >
                  {progressMap[currentStep.id]?.status === "completed" ? (
                    <CheckCircle2 className="w-5 h-5 text-[#7FC29B]" />
                  ) : (
                    (() => {
                      const Icon = STEP_ICONS[currentStep.type] ?? FileCheck2;
                      return <Icon className="w-5 h-5 text-[#E9CB8B]" />;
                    })()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.3)]">
                      Schritt {currentIndex + 1} von {steps.length}
                    </span>
                    {currentStep.required && (
                      <span className="text-[9px] font-bold tracking-[0.15em] uppercase px-2 py-0.5 rounded-full bg-[rgba(232,116,103,0.12)] text-[#E87467]">
                        Pflicht
                      </span>
                    )}
                  </div>
                  <h2 className="text-[16px] font-semibold text-white" style={{ fontFamily: "var(--font-serif)" }}>
                    {currentStep.title}
                  </h2>
                  {currentStep.description && (
                    <p className="text-[12px] text-[rgba(249,249,249,0.5)] mt-1">
                      {currentStep.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Completed badge */}
              {progressMap[currentStep.id]?.status === "completed" && (
                <div
                  className="flex items-center gap-2 p-3 rounded-lg mb-5"
                  style={{ background: "rgba(127,194,155,0.1)", border: "1px solid rgba(127,194,155,0.2)" }}
                >
                  <CheckCircle2 className="w-4 h-4 text-[#7FC29B]" />
                  <span className="text-[12px] text-[#7FC29B]">Dieser Schritt ist abgeschlossen</span>
                </div>
              )}

              <StepRenderer
                step={currentStep}
                progress={progressMap[currentStep.id] ?? null}
                onComplete={(data) => handleStepComplete(currentStep, data)}
                saving={saving}
              />
            </div>
          </div>
        )}

        {/* Sidebar step list */}
        <div className="glass-panel fade-up">
          <div className="relative z-[2]">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.3)] mb-3">
              Alle Schritte
            </p>
            <div className="space-y-2">
              {steps.map((s, i) => {
                const done = progressMap[s.id]?.status === "completed";
                const active = i === currentIndex;
                const Icon = STEP_ICONS[s.type] ?? FileCheck2;
                return (
                  <button
                    key={s.id}
                    onClick={() => (done || i <= currentIndex) && setCurrentIndex(i)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition ${
                      active
                        ? "border"
                        : "border border-transparent hover:bg-[rgba(249,249,249,0.02)]"
                    }`}
                    style={
                      active
                        ? { background: "rgba(197,160,89,0.08)", borderColor: "rgba(197,160,89,0.25)" }
                        : {}
                    }
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: done
                          ? "rgba(127,194,155,0.15)"
                          : active
                          ? "rgba(197,160,89,0.2)"
                          : "rgba(249,249,249,0.05)",
                      }}
                    >
                      {done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#7FC29B]" />
                      ) : (
                        <Icon className={`w-3.5 h-3.5 ${active ? "text-[#E9CB8B]" : "text-[rgba(249,249,249,0.3)]"}`} />
                      )}
                    </div>
                    <span
                      className={`text-[12px] font-medium ${
                        done
                          ? "text-[rgba(249,249,249,0.5)] line-through"
                          : active
                          ? "text-white"
                          : "text-[rgba(249,249,249,0.5)]"
                      }`}
                    >
                      {s.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
