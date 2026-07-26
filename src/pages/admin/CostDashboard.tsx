import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, Loader2, TrendingUp, Users, Bot, Image } from "lucide-react";

interface CostRow {
  user_id: string;
  user_name: string;
  model: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_cents: number;
  call_count: number;
}

interface MonthlySummary {
  month: string;
  total_cost: number;
  total_calls: number;
}

export default function CostDashboard() {
  const nav = useNavigate();
  const [costByUser, setCostByUser] = useState<CostRow[]>([]);
  const [costByModel, setCostByModel] = useState<{ model: string; cost: number; calls: number }[]>([]);
  const [monthly, setMonthly] = useState<MonthlySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => { loadCosts(); }, [period]);

  async function loadCosts() {
    setLoading(true);
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Load AI usage
    const { data: usage } = await (supabase as any)
      .from("ai_usage_log")
      .select("user_id, model, input_tokens, output_tokens, cost_cents, created_at")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });

    if (!usage?.length) {
      setCostByUser([]);
      setCostByModel([]);
      setMonthly([]);
      setLoading(false);
      return;
    }

    // Get user names
    const userIds = [...new Set(usage.map((u: any) => u.user_id).filter(Boolean))];
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id, name, email").in("id", userIds)
      : { data: [] };
    const nameMap: Record<string, string> = {};
    for (const p of profiles || []) {
      nameMap[p.id] = (p as any).name || (p as any).email || p.id.slice(0, 8);
    }

    // Aggregate by user
    const byUser: Record<string, CostRow> = {};
    for (const u of usage) {
      const uid = u.user_id || "unknown";
      if (!byUser[uid]) {
        byUser[uid] = { user_id: uid, user_name: nameMap[uid] || uid.slice(0, 8), model: "", total_input_tokens: 0, total_output_tokens: 0, total_cost_cents: 0, call_count: 0 };
      }
      byUser[uid].total_input_tokens += u.input_tokens || 0;
      byUser[uid].total_output_tokens += u.output_tokens || 0;
      byUser[uid].total_cost_cents += Number(u.cost_cents) || 0;
      byUser[uid].call_count++;
    }
    setCostByUser(Object.values(byUser).sort((a, b) => b.total_cost_cents - a.total_cost_cents));

    // Aggregate by model
    const byModel: Record<string, { cost: number; calls: number }> = {};
    for (const u of usage) {
      const m = u.model || "unknown";
      if (!byModel[m]) byModel[m] = { cost: 0, calls: 0 };
      byModel[m].cost += Number(u.cost_cents) || 0;
      byModel[m].calls++;
    }
    setCostByModel(Object.entries(byModel).map(([model, v]) => ({ model, ...v })).sort((a, b) => b.cost - a.cost));

    // Monthly aggregation
    const byMonth: Record<string, MonthlySummary> = {};
    for (const u of usage) {
      const m = u.created_at?.slice(0, 7) || "unknown";
      if (!byMonth[m]) byMonth[m] = { month: m, total_cost: 0, total_calls: 0 };
      byMonth[m].total_cost += Number(u.cost_cents) || 0;
      byMonth[m].total_calls++;
    }
    setMonthly(Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month)));

    setLoading(false);
  }

  const totalCost = costByUser.reduce((s, r) => s + r.total_cost_cents, 0);
  const totalCalls = costByUser.reduce((s, r) => s + r.call_count, 0);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => nav("/dashboard/admin")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition mb-2">
            <ArrowLeft className="w-4 h-4" /> Admin Dashboard
          </button>
          <h1 className="text-2xl font-bold text-white">KI-Kosten</h1>
        </div>
        <div className="flex gap-2">
          {(["7d", "30d", "90d"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition ${period === p ? "text-[#E9CB8B] border border-[rgba(197,160,89,0.3)] bg-[rgba(197,160,89,0.08)]" : "text-[rgba(249,249,249,0.5)] border border-[rgba(249,249,249,0.08)]"}`}>
              {p === "7d" ? "7 Tage" : p === "30d" ? "30 Tage" : "90 Tage"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-panel"><div className="relative z-[2]">
          <DollarSign className="w-5 h-5 text-[#E9CB8B] mb-2" />
          <p className="text-2xl font-bold text-white">€{(totalCost / 100).toFixed(2)}</p>
          <p className="text-[11px] text-[rgba(249,249,249,0.4)]">Gesamtkosten</p>
        </div></div>
        <div className="glass-panel"><div className="relative z-[2]">
          <Bot className="w-5 h-5 text-[#8BB6E8] mb-2" />
          <p className="text-2xl font-bold text-white">{totalCalls.toLocaleString("de-DE")}</p>
          <p className="text-[11px] text-[rgba(249,249,249,0.4)]">API-Aufrufe</p>
        </div></div>
        <div className="glass-panel"><div className="relative z-[2]">
          <Users className="w-5 h-5 text-[#7FC29B] mb-2" />
          <p className="text-2xl font-bold text-white">{costByUser.length}</p>
          <p className="text-[11px] text-[rgba(249,249,249,0.4)]">Aktive Nutzer</p>
        </div></div>
      </div>

      {/* By User */}
      {costByUser.length > 0 && (
        <div className="glass-panel" style={{ padding: 0 }}>
          <div className="relative z-[2]">
            <div className="px-5 py-4 border-b border-[rgba(249,249,249,0.06)]">
              <h2 className="text-[13px] font-semibold text-white">Kosten pro Nutzer</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(249,249,249,0.06)]">
                  <th className="px-5 py-2.5 text-left text-[10px] uppercase tracking-wider text-[rgba(249,249,249,0.3)]">Nutzer</th>
                  <th className="px-5 py-2.5 text-right text-[10px] uppercase tracking-wider text-[rgba(249,249,249,0.3)]">Aufrufe</th>
                  <th className="px-5 py-2.5 text-right text-[10px] uppercase tracking-wider text-[rgba(249,249,249,0.3)]">Input Tokens</th>
                  <th className="px-5 py-2.5 text-right text-[10px] uppercase tracking-wider text-[rgba(249,249,249,0.3)]">Output Tokens</th>
                  <th className="px-5 py-2.5 text-right text-[10px] uppercase tracking-wider text-[rgba(249,249,249,0.3)]">Kosten</th>
                </tr>
              </thead>
              <tbody>
                {costByUser.map(r => (
                  <tr key={r.user_id} className="border-b border-[rgba(249,249,249,0.03)] hover:bg-[rgba(249,249,249,0.02)]">
                    <td className="px-5 py-2.5 text-[12px] text-white">{r.user_name}</td>
                    <td className="px-5 py-2.5 text-[12px] text-[rgba(249,249,249,0.5)] text-right tabular-nums">{r.call_count}</td>
                    <td className="px-5 py-2.5 text-[12px] text-[rgba(249,249,249,0.5)] text-right tabular-nums">{r.total_input_tokens.toLocaleString("de-DE")}</td>
                    <td className="px-5 py-2.5 text-[12px] text-[rgba(249,249,249,0.5)] text-right tabular-nums">{r.total_output_tokens.toLocaleString("de-DE")}</td>
                    <td className="px-5 py-2.5 text-[13px] text-[#E9CB8B] text-right font-medium tabular-nums">€{(r.total_cost_cents / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* By Model */}
      {costByModel.length > 0 && (
        <div className="glass-panel">
          <div className="relative z-[2]">
            <h2 className="text-[13px] font-semibold text-white mb-3">Kosten pro Modell</h2>
            <div className="space-y-2">
              {costByModel.map(m => (
                <div key={m.model} className="flex items-center justify-between p-3 rounded-xl border border-[rgba(249,249,249,0.06)]" style={{ background: "rgba(249,249,249,0.02)" }}>
                  <div>
                    <span className="text-[12px] text-white font-medium">{m.model}</span>
                    <span className="text-[10px] text-[rgba(249,249,249,0.3)] ml-2">{m.calls} Aufrufe</span>
                  </div>
                  <span className="text-[13px] text-[#E9CB8B] font-medium tabular-nums">€{(m.cost / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {totalCalls === 0 && (
        <div className="text-center py-12 text-[rgba(249,249,249,0.4)]">
          <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-[13px]">Noch keine KI-Aufrufe im gewählten Zeitraum.</p>
        </div>
      )}
    </div>
  );
}
