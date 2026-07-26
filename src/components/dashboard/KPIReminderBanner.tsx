import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AlertCircle, ArrowRight, X } from "lucide-react";

const SESSION_KEY = "cl_kpi_banner_dismissed";

function getISOWeek(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

/** Returns the ISO Monday of the week containing `d` as "YYYY-MM-DD". */
function getWeekStart(d: Date): string {
  const date = new Date(d.getTime());
  const day = (date.getDay() + 6) % 7; // Mon=0 … Sun=6
  date.setDate(date.getDate() - day);
  return date.toISOString().split("T")[0];
}

export function KPIReminderBanner() {
  const { user, tenantId } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user || !tenantId) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    checkCurrentWeek();
  }, [user, tenantId]);

  async function checkCurrentWeek() {
    const now = new Date();
    const weekStart = getWeekStart(now);

    // Look for any metrics_snapshot for this tenant in the current calendar week
    const { data, error } = await supabase
      .from("metrics_snapshot")
      .select("id")
      .eq("tenant_id", tenantId!)
      .gte("period_date", weekStart)
      .limit(1);

    if (error) return; // silently skip on error
    if (!data || data.length === 0) {
      setShow(true);
    }
  }

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  const weekNumber = getISOWeek(new Date());

  return (
    <div
      className="fade-up flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
      style={{
        background: "linear-gradient(135deg, rgba(197,160,89,0.14), rgba(119,90,25,0.08))",
        border: "1px solid rgba(197,160,89,0.35)",
        boxShadow: "0 0 24px rgba(197,160,89,0.12)",
      }}
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#E9CB8B]" />

      <p className="flex-1 text-[13px] text-[rgba(249,249,249,0.85)]">
        <span className="font-semibold text-[#E9CB8B]">Kennzahlen für KW {weekNumber}</span>{" "}
        noch nicht eingetragen
        <span className="text-[rgba(249,249,249,0.4)]"> — trage jetzt deine Wochenzahlen ein.</span>
      </p>

      <Link
        to="/dashboard/kpis"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors"
        style={{
          background: "linear-gradient(135deg, #C5A059, #775A19)",
          color: "#fff",
          boxShadow: "0 0 12px rgba(197,160,89,0.3)",
        }}
      >
        KPIs eintragen
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>

      <button
        onClick={dismiss}
        aria-label="Schließen"
        className="p-1 rounded-lg text-[rgba(249,249,249,0.3)] hover:text-[rgba(249,249,249,0.7)] hover:bg-[rgba(249,249,249,0.04)] transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
