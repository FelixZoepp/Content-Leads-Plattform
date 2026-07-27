// CL-118: Recording Upload Page with Consent Pipeline
// Route: /dashboard/advisor/recording/:userId

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ConsentGate } from "@/components/shared/ConsentGate";
import {
  Mic,
  Square,
  Pause,
  Play,
  Trash2,
  Upload,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Clock,
  FileAudio,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Recording {
  id: string;
  customer_user_id: string;
  advisor_user_id: string;
  storage_url: string;
  duration_sec: number | null;
  mime_type: string | null;
  status: string;
  consent_given_at: string;
  consent_text: string;
  deleted_at: string | null;
  created_at: string;
}

type RecorderState = "idle" | "recording" | "paused" | "stopped";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(sec: number | null): string {
  if (sec === null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    active:      { label: "Aktiv",        color: "#8BB6E8" },
    processing:  { label: "Verarbeitung", color: "#E9CB8B" },
    transcribed: { label: "Transkribiert",color: "#7FC29B" },
    deleted:     { label: "Gelöscht",     color: "#E87467" },
  };
  const cfg = map[status] ?? { label: status, color: "rgba(249,249,249,0.35)" };
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-[0.08em] uppercase"
      style={{
        color: cfg.color,
        background: `${cfg.color}18`,
        border: `1px solid ${cfg.color}40`,
      }}
    >
      {cfg.label}
    </span>
  );
}

// ── Live timer ────────────────────────────────────────────────────────────────

function useTimer(running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (ref.current) clearInterval(ref.current);
    }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);

  const reset = () => setElapsed(0);
  return { elapsed, reset };
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RecordingPage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();

  // consent state
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentTimestamp, setConsentTimestamp] = useState<string | null>(null);

  // recordings list
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [customerName, setCustomerName] = useState<string>("");

  // recorder
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioMime, setAudioMime] = useState<string>("audio/webm");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // upload
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // messages
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { elapsed, reset: resetTimer } = useTimer(recorderState === "recording");

  // ── Load data ──────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!userId) return;
    setLoadingList(true);
    setError(null);
    try {
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .maybeSingle();
      setCustomerName(profile?.full_name || profile?.email || userId.slice(0, 8));

      const { data, error: err } = await (supabase as any)
        .from("recordings")
        .select("*")
        .eq("customer_user_id", userId)
        .neq("status", "deleted")
        .order("created_at", { ascending: false });

      if (err) throw err;
      setRecordings((data as Recording[]) ?? []);
    } catch (err: any) {
      setError(err?.message || "Fehler beim Laden.");
    } finally {
      setLoadingList(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Recorder controls ──────────────────────────────────────────────────────

  async function startRecording() {
    setError(null);
    setAudioBlob(null);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";

      setAudioMime(mimeType);
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start(1000);
      resetTimer();
      setRecorderState("recording");
    } catch (err: any) {
      setError("Mikrofonzugriff verweigert: " + (err?.message || err));
    }
  }

  function pauseRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setRecorderState("paused");
    }
  }

  function resumeRecording() {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setRecorderState("recording");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecorderState("stopped");
  }

  function discardRecording() {
    setAudioBlob(null);
    setRecorderState("idle");
    resetTimer();
  }

  // ── Upload ─────────────────────────────────────────────────────────────────

  async function uploadRecording() {
    if (!audioBlob || !userId || !user || !consentTimestamp) return;
    setUploading(true);
    setError(null);

    try {
      const ext = audioMime.includes("webm") ? "webm" : audioMime.includes("ogg") ? "ogg" : "mp4";
      const fileName = `recordings/${userId}/${Date.now()}.${ext}`;

      // Upload to Supabase Storage
      const { error: storageErr } = await supabase.storage
        .from("advisor-recordings")
        .upload(fileName, audioBlob, { contentType: audioMime, upsert: false });

      if (storageErr) throw storageErr;

      const { data: urlData } = supabase.storage
        .from("advisor-recordings")
        .getPublicUrl(fileName);

      const storageUrl = urlData.publicUrl;

      const consentText = `Dieses Gespräch wird aufgezeichnet und transkribiert, um die Beratungsqualität zu verbessern und Inhalte für ${customerName} zu erstellen. Die Aufnahme kann jederzeit gelöscht werden. Durch Klick auf "Einverstanden" stimmen alle Teilnehmer der Aufzeichnung zu.`;

      // Save to recordings table
      const { error: dbErr } = await (supabase as any)
        .from("recordings")
        .insert({
          customer_user_id: userId,
          advisor_user_id: user.id,
          storage_url: storageUrl,
          duration_sec: elapsed > 0 ? elapsed : null,
          mime_type: audioMime,
          status: "active",
          consent_given_at: consentTimestamp,
          consent_text: consentText,
        });

      if (dbErr) throw dbErr;

      flash("Aufnahme gespeichert.");
      setAudioBlob(null);
      setRecorderState("idle");
      resetTimer();
      await load();
    } catch (err: any) {
      setError(err?.message || "Fehler beim Hochladen.");
    } finally {
      setUploading(false);
    }
  }

  // ── Soft delete ────────────────────────────────────────────────────────────

  async function deleteRecording(id: string) {
    setDeleting(id);
    setError(null);
    try {
      const { error: err } = await (supabase as any)
        .from("recordings")
        .update({ status: "deleted", deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (err) throw err;
      setRecordings((prev) => prev.filter((r) => r.id !== id));
      flash("Aufnahme gelöscht.");
    } catch (err: any) {
      setError(err?.message || "Fehler beim Löschen.");
    } finally {
      setDeleting(null);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  function handleConsent() {
    setConsentTimestamp(new Date().toISOString());
    setConsentGiven(true);
  }

  function handleDecline() {
    setConsentGiven(false);
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loadingList) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Consent gate ───────────────────────────────────────────────────────────

  if (!consentGiven) {
    return (
      <div className="space-y-6 max-w-3xl">
        {/* Page header */}
        <div
          className="glass-panel fade-up"
          style={{
            background: "linear-gradient(135deg, rgba(197,160,89,0.14), rgba(10,11,11,0.6))",
            borderColor: "rgba(197,160,89,0.2)",
          }}
        >
          <div className="relative z-[2]">
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">
              Berater · Aufnahmen
            </span>
            <h1 className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>
              Aufnahmen<span className="text-[#C5A059]">.</span>
            </h1>
            <p className="text-[13px] text-[rgba(249,249,249,0.5)] mt-1">{customerName}</p>
          </div>
        </div>

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

        <ConsentGate
          onConsent={handleConsent}
          onDecline={handleDecline}
          participantName={customerName}
        />

        {/* Existing recordings visible even before consenting to a new one */}
        {recordings.length > 0 && (
          <RecordingsList
            recordings={recordings}
            deleting={deleting}
            onDelete={deleteRecording}
            onReload={load}
          />
        )}
      </div>
    );
  }

  // ── Main recording UI ──────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
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
              Berater · Aufnahmen
            </span>
            <h1 className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>
              {customerName}<span className="text-[#C5A059]">.</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-[0.1em]"
                style={{
                  color: "#7FC29B",
                  background: "rgba(127,194,155,0.12)",
                  border: "1px solid rgba(127,194,155,0.3)",
                }}
              >
                Einwilligung erteilt
              </span>
              {consentTimestamp && (
                <span className="text-[11px] text-[rgba(249,249,249,0.3)]">
                  {formatDate(consentTimestamp)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => load()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] text-[rgba(249,249,249,0.5)] hover:text-white border border-[rgba(249,249,249,0.08)] hover:border-[rgba(197,160,89,0.25)] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Neu laden
          </button>
        </div>
      </div>

      {/* Messages */}
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

      {/* Recorder panel */}
      <div className="glass-panel fade-up">
        <div className="relative z-[2] space-y-5">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-[#C5A059]" />
            <span className="text-[14px] font-semibold text-white">Neue Aufnahme</span>
          </div>

          {/* Timer display */}
          <div className="flex items-center justify-center gap-3 py-6">
            <div
              className="flex flex-col items-center gap-2"
              style={{
                background: "rgba(249,249,249,0.03)",
                border: "1px solid rgba(249,249,249,0.07)",
                borderRadius: 16,
                padding: "20px 40px",
              }}
            >
              {/* Pulse indicator */}
              <div className="flex items-center gap-2">
                {recorderState === "recording" && (
                  <div
                    className="w-2.5 h-2.5 rounded-full animate-pulse"
                    style={{ background: "#E87467" }}
                  />
                )}
                {recorderState === "paused" && (
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: "#E9CB8B" }}
                  />
                )}
                {recorderState === "stopped" && (
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: "#7FC29B" }}
                  />
                )}
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.2em]"
                  style={{
                    color:
                      recorderState === "recording"
                        ? "#E87467"
                        : recorderState === "paused"
                        ? "#E9CB8B"
                        : recorderState === "stopped"
                        ? "#7FC29B"
                        : "rgba(249,249,249,0.3)",
                  }}
                >
                  {recorderState === "recording"
                    ? "Aufnahme läuft"
                    : recorderState === "paused"
                    ? "Pausiert"
                    : recorderState === "stopped"
                    ? "Aufnahme bereit"
                    : "Bereit"}
                </span>
              </div>

              <span
                className="text-5xl font-bold tabular-nums tracking-tight"
                style={{
                  fontFamily: "var(--font-serif)",
                  color:
                    recorderState === "recording"
                      ? "#fff"
                      : "rgba(249,249,249,0.35)",
                }}
              >
                {formatDuration(elapsed)}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {recorderState === "idle" && (
              <button
                onClick={startRecording}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-semibold transition-all"
                style={{ background: "linear-gradient(135deg, #C5A059, #E9CB8B)", color: "#0A0B0B" }}
              >
                <Mic className="w-4 h-4" />
                Aufnahme starten
              </button>
            )}

            {recorderState === "recording" && (
              <>
                <button
                  onClick={pauseRecording}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium border transition-colors"
                  style={{
                    color: "#E9CB8B",
                    border: "1px solid rgba(233,203,139,0.25)",
                    background: "rgba(233,203,139,0.06)",
                  }}
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                  style={{ background: "rgba(232,116,103,0.15)", color: "#E87467", border: "1px solid rgba(232,116,103,0.3)" }}
                >
                  <Square className="w-4 h-4" />
                  Stopp
                </button>
              </>
            )}

            {recorderState === "paused" && (
              <>
                <button
                  onClick={resumeRecording}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium border transition-colors"
                  style={{
                    color: "#7FC29B",
                    border: "1px solid rgba(127,194,155,0.3)",
                    background: "rgba(127,194,155,0.06)",
                  }}
                >
                  <Play className="w-4 h-4" />
                  Weiter
                </button>
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                  style={{ background: "rgba(232,116,103,0.15)", color: "#E87467", border: "1px solid rgba(232,116,103,0.3)" }}
                >
                  <Square className="w-4 h-4" />
                  Stopp
                </button>
              </>
            )}

            {recorderState === "stopped" && audioBlob && (
              <>
                <button
                  onClick={discardRecording}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium border transition-colors"
                  style={{
                    color: "rgba(249,249,249,0.4)",
                    border: "1px solid rgba(249,249,249,0.08)",
                    background: "rgba(249,249,249,0.02)",
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Verwerfen
                </button>
                <button
                  onClick={uploadRecording}
                  disabled={uploading}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-semibold transition-all"
                  style={{
                    background: uploading
                      ? "rgba(197,160,89,0.3)"
                      : "linear-gradient(135deg, #C5A059, #E9CB8B)",
                    color: "#0A0B0B",
                    opacity: uploading ? 0.7 : 1,
                  }}
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#0A0B0B] border-t-transparent rounded-full animate-spin" />
                      Hochladen…
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Aufnahme speichern
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Audio preview when stopped */}
          {recorderState === "stopped" && audioBlob && (
            <div className="mt-2">
              <audio
                controls
                src={URL.createObjectURL(audioBlob)}
                className="w-full h-10"
                style={{ filter: "invert(1) hue-rotate(180deg) saturate(0.3)" }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Existing recordings list */}
      <RecordingsList
        recordings={recordings}
        deleting={deleting}
        onDelete={deleteRecording}
        onReload={load}
      />
    </div>
  );
}

// ── Recordings list sub-component ─────────────────────────────────────────────

interface RecordingsListProps {
  recordings: Recording[];
  deleting: string | null;
  onDelete: (id: string) => void;
  onReload: () => void;
}

function RecordingsList({ recordings, deleting, onDelete }: RecordingsListProps) {
  if (recordings.length === 0) {
    return (
      <div className="glass-panel fade-up text-center py-12">
        <div className="relative z-[2]">
          <FileAudio className="w-10 h-10 text-[rgba(249,249,249,0.07)] mx-auto mb-3" />
          <p className="text-[13px] text-[rgba(249,249,249,0.4)]">Noch keine Aufnahmen</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel fade-up">
      <div className="relative z-[2] space-y-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[rgba(249,249,249,0.35)]">
          Aufnahmen ({recordings.length})
        </span>

        {recordings.map((rec) => (
          <div
            key={rec.id}
            className="rounded-xl p-3 flex items-center justify-between gap-3"
            style={{
              background: "rgba(249,249,249,0.025)",
              border: "1px solid rgba(249,249,249,0.06)",
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(197,160,89,0.1)" }}
              >
                <Mic className="w-4 h-4 text-[#C5A059]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={rec.status} />
                  <span className="text-[11px] text-[rgba(249,249,249,0.35)]">
                    {formatDate(rec.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-[11px] text-[rgba(249,249,249,0.4)]">
                    <Clock className="w-3 h-3" />
                    {formatDuration(rec.duration_sec)}
                  </span>
                  {rec.mime_type && (
                    <span className="text-[10px] text-[rgba(249,249,249,0.25)] font-mono">
                      {rec.mime_type.split(";")[0]}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => onDelete(rec.id)}
              disabled={deleting === rec.id}
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
              style={{
                background: "rgba(232,116,103,0.08)",
                border: "1px solid rgba(232,116,103,0.2)",
                color: "#E87467",
                opacity: deleting === rec.id ? 0.5 : 1,
              }}
              title="Aufnahme löschen"
            >
              {deleting === rec.id ? (
                <div className="w-3.5 h-3.5 border-2 border-[#E87467] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
