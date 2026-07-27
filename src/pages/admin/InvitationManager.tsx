import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  RotateCcw,
  XCircle,
  Upload,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type InvitationStatus =
  | "pending"
  | "opened"
  | "registered"
  | "onboarding"
  | "completed"
  | "expired"
  | "revoked";

interface Invitation {
  id: string;
  token: string;
  email_hint: string | null;
  role: string;
  status: InvitationStatus;
  created_at: string;
  expires_at: string | null;
  opened_at: string | null;
  used_at: string | null;
  reminder_count: number;
  product_id: string | null;
  advisor_id: string | null;
  products?: { name: string; slug: string } | null;
}

interface CsvRow {
  email: string;
  name: string;
  product_slug: string;
  advisor_email: string;
  // validation
  _valid: boolean;
  _errors: string[];
}

interface KnownProduct {
  id: string;
  slug: string;
  name: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const TAB_ALL = "all";
const TAB_PENDING = "pending";
const TAB_EXPIRED = "expired";
const TAB_REVOKED = "revoked";

const STATUS_META: Record<
  InvitationStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Ausstehend",
    color: "bg-amber-400/10 text-amber-400 border border-amber-400/20",
    icon: <Clock className="w-3 h-3" />,
  },
  opened: {
    label: "Geöffnet",
    color: "bg-blue-400/10 text-blue-400 border border-blue-400/20",
    icon: <Mail className="w-3 h-3" />,
  },
  registered: {
    label: "Registriert",
    color: "bg-indigo-400/10 text-indigo-400 border border-indigo-400/20",
    icon: <UserCheck className="w-3 h-3" />,
  },
  onboarding: {
    label: "Onboarding",
    color: "bg-purple-400/10 text-purple-400 border border-purple-400/20",
    icon: <UserCheck className="w-3 h-3" />,
  },
  completed: {
    label: "Abgeschlossen",
    color: "bg-green-400/10 text-green-400 border border-green-400/20",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  expired: {
    label: "Abgelaufen",
    color: "bg-gray-500/10 text-gray-500 border border-gray-500/20",
    icon: <AlertCircle className="w-3 h-3" />,
  },
  revoked: {
    label: "Widerrufen",
    color: "bg-red-500/10 text-red-400 border border-red-500/20",
    icon: <XCircle className="w-3 h-3" />,
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

async function parseCsv(text: string): Promise<Omit<CsvRow, "_valid" | "_errors">[]> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  // Detect header row
  const firstLower = lines[0].toLowerCase();
  const hasHeader =
    firstLower.includes("email") || firstLower.includes("name");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.slice(0, 100).map((line) => {
    const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
    return {
      email: parts[0] ?? "",
      name: parts[1] ?? "",
      product_slug: parts[2] ?? "",
      advisor_email: parts[3] ?? "",
    };
  });
}

// ── Status Badge component ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: InvitationStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${meta.color}`}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
}

// ── CSV Modal ────────────────────────────────────────────────────────────────

function CsvModal({
  products,
  knownAdvisorEmails,
  onClose,
  onDone,
}: {
  products: KnownProduct[];
  knownAdvisorEmails: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0); // 0-100
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const knownSlugs = new Set(products.map((p) => p.slug));

  function validateRows(raw: Omit<CsvRow, "_valid" | "_errors">[]): CsvRow[] {
    return raw.map((r) => {
      const errs: string[] = [];
      if (!isValidEmail(r.email)) errs.push("Ungültige E-Mail");
      if (r.product_slug && !knownSlugs.has(r.product_slug))
        errs.push(`Unbekannter Produkt-Slug: ${r.product_slug}`);
      if (
        r.advisor_email &&
        !knownAdvisorEmails.includes(r.advisor_email.toLowerCase())
      )
        errs.push(`Unbekannter Advisor: ${r.advisor_email}`);
      return { ...r, _valid: errs.length === 0, _errors: errs };
    });
  }

  async function handleFile(file: File) {
    const text = await file.text();
    const raw = await parseCsv(text);
    setRows(validateRows(raw));
    setDone(false);
    setErrors([]);
    setProgress(0);
  }

  async function sendValid() {
    const valid = rows.filter((r) => r._valid);
    if (!valid.length) return;

    setSending(true);
    setProgress(0);
    setErrors([]);

    const {
      data: { session },
    } = await (supabase as any).auth.getSession();
    const authHeader = session?.access_token
      ? `Bearer ${session.access_token}`
      : "";

    const newErrors: string[] = [];
    let sent = 0;

    for (const row of valid) {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-customer`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              email: row.email,
              company_name: row.name || row.email,
              product_slug: row.product_slug || undefined,
              advisor_email: row.advisor_email || undefined,
            }),
          }
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          newErrors.push(`${row.email}: ${j.error ?? res.statusText}`);
        }
      } catch (e: any) {
        newErrors.push(`${row.email}: Netzwerkfehler`);
      }
      sent++;
      setProgress(Math.round((sent / valid.length) * 100));
    }

    setSending(false);
    setErrors(newErrors);
    setDone(true);
    onDone();
  }

  const validCount = rows.filter((r) => r._valid).length;
  const invalidCount = rows.filter((r) => !r._valid).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
    >
      <div
        className="glass-panel w-full max-w-3xl max-h-[85vh] flex flex-col"
        style={{ padding: 0, overflow: "hidden" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(249,249,249,0.06)]">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#E9CB8B]" />
            <h2 className="text-[15px] font-semibold text-white">CSV Import</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 relative z-[2]">
          {/* Upload area */}
          <div
            className="border-2 border-dashed border-[rgba(249,249,249,0.1)] rounded-xl p-6 text-center cursor-pointer hover:border-[rgba(197,160,89,0.3)] transition"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
          >
            <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-300">
              CSV-Datei ablegen oder{" "}
              <span className="text-[#E9CB8B] underline">auswählen</span>
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              Spalten: email, name, product_slug, advisor_email — max. 100 Zeilen
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          {/* Stats row */}
          {rows.length > 0 && (
            <div className="flex items-center gap-4 text-[12px]">
              <span className="text-gray-400">{rows.length} Zeilen geladen</span>
              <span className="text-green-400">{validCount} gültig</span>
              {invalidCount > 0 && (
                <span className="text-red-400">{invalidCount} ungültig</span>
              )}
            </div>
          )}

          {/* Preview table */}
          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-[rgba(249,249,249,0.06)]">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[rgba(249,249,249,0.06)]">
                    {["Email", "Name", "Produkt-Slug", "Advisor-Email", "Status"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-3 py-2 text-[rgba(249,249,249,0.4)] font-medium"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-[rgba(249,249,249,0.04)] ${
                        row._valid ? "" : "bg-red-500/5"
                      }`}
                    >
                      <td className="px-3 py-2 text-white">{row.email || "—"}</td>
                      <td className="px-3 py-2 text-gray-300">{row.name || "—"}</td>
                      <td className="px-3 py-2 text-gray-300">
                        {row.product_slug || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-300">
                        {row.advisor_email || "—"}
                      </td>
                      <td className="px-3 py-2">
                        {row._valid ? (
                          <span className="inline-flex items-center gap-1 text-green-400">
                            <CheckCircle2 className="w-3 h-3" /> OK
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-red-400"
                            title={row._errors.join(", ")}
                          >
                            <AlertCircle className="w-3 h-3" />
                            {row._errors[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 20 && (
                <p className="text-[11px] text-gray-500 px-3 py-2">
                  +{rows.length - 20} weitere Zeilen (nicht angezeigt)
                </p>
              )}
            </div>
          )}

          {/* Progress bar */}
          {sending && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-gray-400">
                <span>Sende Einladungen…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-[rgba(249,249,249,0.06)] overflow-hidden">
                <div
                  className="h-full bg-[#C5A059] transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Done state */}
          {done && !sending && (
            <div className="rounded-xl p-4 bg-green-400/5 border border-green-400/20">
              <p className="text-sm text-green-400 font-medium">
                {validCount - errors.length} von {validCount} Einladungen erfolgreich gesendet.
              </p>
              {errors.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {errors.map((e, i) => (
                    <li key={i} className="text-[11px] text-red-400">
                      {e}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[rgba(249,249,249,0.06)] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition border border-[rgba(249,249,249,0.08)] hover:border-[rgba(249,249,249,0.15)]"
          >
            Schließen
          </button>
          {rows.length > 0 && !done && (
            <button
              onClick={sendValid}
              disabled={sending || validCount === 0}
              className="px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-40 flex items-center gap-2"
              style={{ background: "#C5A059", color: "#0A0B0B" }}
            >
              {sending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sende…
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5" /> {validCount} Gültige senden
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function InvitationManager() {
  const nav = useNavigate();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [products, setProducts] = useState<KnownProduct[]>([]);
  const [advisorEmails, setAdvisorEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(TAB_ALL);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCsv, setShowCsv] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const db = supabase as any;

    const [{ data: inv }, { data: prods }, { data: advisors }] =
      await Promise.all([
        db
          .from("invitations")
          .select(
            "id, token, email_hint, role, status, created_at, expires_at, opened_at, used_at, reminder_count, product_id, advisor_id, products(name, slug)"
          )
          .order("created_at", { ascending: false }),
        db.from("products").select("id, slug, name").order("name"),
        db
          .from("user_roles")
          .select("user_id, profiles(email)")
          .eq("role", "advisor"),
      ]);

    setInvitations(inv ?? []);
    setProducts(prods ?? []);

    // Extract advisor emails from profiles join
    const emails: string[] = [];
    (advisors ?? []).forEach((a: any) => {
      const email = a.profiles?.email;
      if (email) emails.push(email.toLowerCase());
    });
    setAdvisorEmails(emails);

    setLoading(false);
  }

  async function handleRevoke(id: string) {
    setActionLoading(id + "-revoke");
    await (supabase as any)
      .from("invitations")
      .update({ status: "revoked" })
      .eq("id", id);
    await loadAll();
    setActionLoading(null);
  }

  async function handleReminder(inv: Invitation) {
    setActionLoading(inv.id + "-reminder");

    const db = supabase as any;
    const {
      data: { session },
    } = await db.auth.getSession();
    const authHeader = session?.access_token
      ? `Bearer ${session.access_token}`
      : "";

    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            to: inv.email_hint,
            subject: "Erinnerung: Ihre Einladung wartet",
            type: "invitation_reminder",
            token: inv.token,
          }),
        }
      );

      await db
        .from("invitations")
        .update({ reminder_count: (inv.reminder_count ?? 0) + 1 })
        .eq("id", inv.id);

      await loadAll();
    } catch (e) {
      console.error("Reminder failed:", e);
    }

    setActionLoading(null);
  }

  async function handleResend(inv: Invitation) {
    setActionLoading(inv.id + "-resend");

    const db = supabase as any;
    const {
      data: { session },
    } = await db.auth.getSession();
    const authHeader = session?.access_token
      ? `Bearer ${session.access_token}`
      : "";

    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-customer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            email: inv.email_hint ?? "",
            company_name: inv.email_hint ?? "",
            product_slug: inv.products?.slug,
          }),
        }
      );

      // Revoke old one
      await db
        .from("invitations")
        .update({ status: "revoked" })
        .eq("id", inv.id);

      await loadAll();
    } catch (e) {
      console.error("Resend failed:", e);
    }

    setActionLoading(null);
  }

  // ── Filtering ──────────────────────────────────────────────────────────────

  const now = new Date();

  const displayed = invitations.filter((inv) => {
    // Auto-classify expired
    const isExpired =
      inv.expires_at && new Date(inv.expires_at) < now && inv.status === "pending";

    if (activeTab === TAB_PENDING)
      return inv.status === "pending" || inv.status === "opened";
    if (activeTab === TAB_EXPIRED)
      return inv.status === "expired" || isExpired;
    if (activeTab === TAB_REVOKED) return inv.status === "revoked";
    return true;
  });

  const tabCounts = {
    [TAB_ALL]: invitations.length,
    [TAB_PENDING]: invitations.filter(
      (i) => i.status === "pending" || i.status === "opened"
    ).length,
    [TAB_EXPIRED]: invitations.filter(
      (i) =>
        i.status === "expired" ||
        (i.status === "pending" &&
          i.expires_at &&
          new Date(i.expires_at) < now)
    ).length,
    [TAB_REVOKED]: invitations.filter((i) => i.status === "revoked").length,
  };

  const tabs = [
    { key: TAB_ALL, label: "Alle" },
    { key: TAB_PENDING, label: "Ausstehend" },
    { key: TAB_EXPIRED, label: "Abgelaufen" },
    { key: TAB_REVOKED, label: "Widerrufen" },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Page header */}
      <div>
        <button
          onClick={() => nav("/dashboard/admin")}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Admin Dashboard
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Einladungen</h1>
            <p className="text-sm text-gray-400 mt-1">
              {invitations.length} Einladungen gesamt
            </p>
          </div>
          <button
            onClick={() => setShowCsv(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition"
            style={{ background: "#C5A059", color: "#0A0B0B" }}
          >
            <Upload className="w-4 h-4" /> CSV Import
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[rgba(249,249,249,0.06)] pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-[13px] font-medium rounded-t-lg transition relative -mb-px ${
              activeTab === tab.key
                ? "text-[#E9CB8B] border-b-2 border-[#C5A059]"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab.label}
            <span
              className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key
                  ? "bg-[rgba(197,160,89,0.15)] text-[#E9CB8B]"
                  : "bg-[rgba(249,249,249,0.06)] text-gray-500"
              }`}
            >
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: "hidden" }}>
        <div className="relative z-[2]">
          {displayed.length === 0 ? (
            <div className="py-16 text-center text-gray-500 text-sm">
              Keine Einladungen in dieser Kategorie.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[rgba(249,249,249,0.06)]">
                    {[
                      "Email",
                      "Produkt",
                      "Status",
                      "Erstellt",
                      "Läuft ab",
                      "Erinnerungen",
                      "Aktionen",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-[rgba(249,249,249,0.4)] font-medium whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((inv) => {
                    const isExpiredByDate =
                      inv.expires_at &&
                      new Date(inv.expires_at) < now &&
                      inv.status === "pending";
                    const effectiveStatus: InvitationStatus = isExpiredByDate
                      ? "expired"
                      : inv.status;

                    return (
                      <tr
                        key={inv.id}
                        className="border-b border-[rgba(249,249,249,0.04)] hover:bg-[rgba(249,249,249,0.02)] transition"
                      >
                        {/* Email */}
                        <td className="px-4 py-3 text-white font-medium">
                          {inv.email_hint ?? "—"}
                        </td>

                        {/* Product */}
                        <td className="px-4 py-3 text-gray-400">
                          {inv.products?.name ?? "—"}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <StatusBadge status={effectiveStatus} />
                        </td>

                        {/* Created */}
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                          {fmtDate(inv.created_at)}
                        </td>

                        {/* Expires */}
                        <td
                          className={`px-4 py-3 whitespace-nowrap ${
                            isExpiredByDate ? "text-red-400" : "text-gray-400"
                          }`}
                        >
                          {fmtDate(inv.expires_at)}
                        </td>

                        {/* Reminder count */}
                        <td className="px-4 py-3 text-gray-400 text-center">
                          {inv.reminder_count ?? 0}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {/* Reminder — only for pending/opened */}
                            {(effectiveStatus === "pending" ||
                              effectiveStatus === "opened") && (
                              <button
                                onClick={() => handleReminder(inv)}
                                disabled={
                                  actionLoading === inv.id + "-reminder"
                                }
                                title="Erinnerung senden"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-blue-400 border border-blue-400/20 hover:bg-blue-400/10 transition disabled:opacity-40"
                              >
                                {actionLoading === inv.id + "-reminder" ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Mail className="w-3 h-3" />
                                )}
                                Erinnerung
                              </button>
                            )}

                            {/* Resend — for expired */}
                            {(effectiveStatus === "expired" ||
                              inv.status === "expired") && (
                              <button
                                onClick={() => handleResend(inv)}
                                disabled={
                                  actionLoading === inv.id + "-resend"
                                }
                                title="Erneut senden"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-amber-400 border border-amber-400/20 hover:bg-amber-400/10 transition disabled:opacity-40"
                              >
                                {actionLoading === inv.id + "-resend" ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-3 h-3" />
                                )}
                                Erneut senden
                              </button>
                            )}

                            {/* Revoke — for active states */}
                            {(effectiveStatus === "pending" ||
                              effectiveStatus === "opened" ||
                              effectiveStatus === "registered") && (
                              <button
                                onClick={() => handleRevoke(inv.id)}
                                disabled={
                                  actionLoading === inv.id + "-revoke"
                                }
                                title="Widerrufen"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-red-400 border border-red-400/20 hover:bg-red-400/10 transition disabled:opacity-40"
                              >
                                {actionLoading === inv.id + "-revoke" ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <XCircle className="w-3 h-3" />
                                )}
                                Widerrufen
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CSV modal */}
      {showCsv && (
        <CsvModal
          products={products}
          knownAdvisorEmails={advisorEmails}
          onClose={() => setShowCsv(false)}
          onDone={() => {
            loadAll();
          }}
        />
      )}
    </div>
  );
}
