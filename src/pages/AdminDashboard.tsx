import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, TrendingUp, AlertTriangle, Star, Plus, RefreshCw,
  ChevronRight, BarChart3, Activity, Shield, UserPlus, Mail
} from "lucide-react";

interface Tenant {
  id: string;
  company_name: string;
  contact_name: string;
  is_active: boolean;
  created_at: string;
  latestHealth?: { score: number; color: string };
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-[#12121A] border border-[#2A2A35] rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-opacity-10`} style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-xs text-[#8888AA] mt-1">{label}</p>
      {sub && <p className="text-xs mt-1" style={{ color }}>{sub}</p>}
    </div>
  );
}

function HealthBadge({ color, score }: { color: string; score: number }) {
  const colors: Record<string, string> = {
    green: "bg-[#27AE60]/15 text-[#27AE60]",
    amber: "bg-[#F2994A]/15 text-[#F2994A]",
    red: "bg-[#EB5757]/15 text-[#EB5757]",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.green}`}>
      {score}%
    </span>
  );
}

export default function AdminDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCompany, setInviteCompany] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: tenantsData } = await supabase
        .from("tenants")
        .select("*, health_scores(score, color, created_at)")
        .eq("is_active", true)
        .order("company_name");

      const processed = (tenantsData || []).map((t: any) => {
        const sorted = t.health_scores?.sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        return { ...t, latestHealth: sorted?.[0] };
      });
      setTenants(processed);

      const { data: alertsData } = await supabase
        .from("alerts")
        .select("*, tenants(company_name)")
        .is("resolved_at", null)
        .order("created_at", { ascending: false })
        .limit(10);
      setAlerts(alertsData || []);
    } catch (err) {
      console.error("Admin load error:", err);
    }
    setLoading(false);
  }

  async function recalculateHealth() {
    setCalculating(true);
    try {
      await supabase.functions.invoke("calculate-health", { body: {} });
      await loadData();
    } catch (err) {
      console.error("Health calc error:", err);
    }
    setCalculating(false);
  }

  async function inviteCustomer() {
    if (!inviteEmail || !inviteCompany) return;
    setInviting(true);
    try {
      await supabase.functions.invoke("invite-customer", {
        body: { email: inviteEmail, company_name: inviteCompany },
      });
      setInviteEmail("");
      setInviteCompany("");
      setShowInvite(false);
      await loadData();
    } catch (err) {
      console.error("Invite error:", err);
    }
    setInviting(false);
  }

  const healthGreen = tenants.filter(t => t.latestHealth?.color === "green").length;
  const healthAmber = tenants.filter(t => t.latestHealth?.color === "amber").length;
  const healthRed = tenants.filter(t => t.latestHealth?.color === "red").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#4A9FD9] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="text-sm text-[#8888AA] mt-0.5">Portfolio-Gesamtübersicht · {tenants.length} aktive Kunden</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={recalculateHealth}
            disabled={calculating}
            className="flex items-center gap-2 px-4 py-2 bg-[#12121A] border border-[#2A2A35] rounded-lg text-sm text-[#8888AA] hover:border-[#4A9FD9]/30 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${calculating ? "animate-spin" : ""}`} />
            Health Scores berechnen
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#4A9FD9] hover:bg-[#2E7BB5] text-white rounded-lg text-sm font-medium transition"
          >
            <UserPlus className="w-4 h-4" />
            Kunde einladen
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Users} label="Aktive Kunden" value={tenants.length} color="#4A9FD9" />
        <StatCard icon={TrendingUp} label="Gesund" value={healthGreen} sub={`${tenants.length > 0 ? Math.round((healthGreen / tenants.length) * 100) : 0}% des Portfolios`} color="#27AE60" />
        <StatCard icon={Activity} label="Achtung" value={healthAmber} color="#F2994A" />
        <StatCard icon={AlertTriangle} label="Kritisch" value={healthRed} sub={alerts.length > 0 ? `${alerts.length} offene Alerts` : undefined} color="#EB5757" />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-[#12121A] border border-[#2A2A35] rounded-2xl">
          <div className="px-5 py-4 border-b border-[#2A2A35] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#EB5757]" />
              <h2 className="text-sm font-medium">Offene Alerts ({alerts.length})</h2>
            </div>
          </div>
          <div className="divide-y divide-[#2A2A35]/50">
            {alerts.slice(0, 5).map((alert: any) => (
              <div key={alert.id} className="px-5 py-3 flex items-center justify-between hover:bg-[#1A1A25] transition">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#EB5757]" />
                  <div>
                    <p className="text-sm text-white">{alert.tenants?.company_name || "Unbekannt"}</p>
                    <p className="text-xs text-[#8888AA]">{alert.message || "Health Score kritisch"}</p>
                  </div>
                </div>
                <span className="text-xs text-[#555566]">
                  {new Date(alert.created_at).toLocaleDateString("de-DE")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer List */}
      <div className="bg-[#12121A] border border-[#2A2A35] rounded-2xl">
        <div className="px-5 py-4 border-b border-[#2A2A35] flex items-center justify-between">
          <h2 className="text-sm font-medium">Kunden-Portfolio</h2>
          <span className="text-xs text-[#8888AA]">{tenants.length} Kunden</span>
        </div>
        {tenants.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-[#2A2A35] mx-auto mb-3" />
            <p className="text-sm text-[#8888AA] mb-1">Noch keine Kunden</p>
            <p className="text-xs text-[#555566]">Lade deinen ersten Kunden ein um loszulegen</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A35]">
                <th className="px-5 py-3 text-left text-xs font-medium text-[#8888AA]">Unternehmen</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[#8888AA]">Kontakt</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[#8888AA]">Health Score</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[#8888AA]">Seit</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-[#8888AA]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A35]/50">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-[#1A1A25] transition cursor-pointer">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#4A9FD9]/10 flex items-center justify-center text-xs text-[#4A9FD9] font-semibold">
                        {tenant.company_name?.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-white font-medium">{tenant.company_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[#8888AA]">{tenant.contact_name || "—"}</td>
                  <td className="px-5 py-3">
                    {tenant.latestHealth ? (
                      <HealthBadge color={tenant.latestHealth.color} score={tenant.latestHealth.score} />
                    ) : (
                      <span className="text-xs text-[#555566]">Nicht berechnet</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-[#8888AA]">
                    {new Date(tenant.created_at).toLocaleDateString("de-DE")}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <ChevronRight className="w-4 h-4 text-[#555566] inline" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite Dialog */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowInvite(false)}>
          <div className="bg-[#12121A] border border-[#2A2A35] rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-1">Neuen Kunden einladen</h2>
            <p className="text-sm text-[#8888AA] mb-6">Der Kunde erhält eine E-Mail mit Login-Daten.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8888AA] mb-1.5">Firmenname</label>
                <input value={inviteCompany} onChange={e => setInviteCompany(e.target.value)}
                  className="w-full bg-[#0A0A0F] border border-[#2A2A35] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#555566] focus:outline-none focus:border-[#4A9FD9]/50"
                  placeholder="Firma GmbH" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8888AA] mb-1.5">E-Mail</label>
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  className="w-full bg-[#0A0A0F] border border-[#2A2A35] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#555566] focus:outline-none focus:border-[#4A9FD9]/50"
                  placeholder="kunde@firma.de" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowInvite(false)}
                  className="flex-1 px-4 py-2.5 border border-[#2A2A35] rounded-lg text-sm text-[#8888AA] hover:bg-[#1A1A25] transition">
                  Abbrechen
                </button>
                <button onClick={inviteCustomer} disabled={inviting || !inviteEmail || !inviteCompany}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#4A9FD9] hover:bg-[#2E7BB5] text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
                  <Mail className="w-4 h-4" />
                  {inviting ? "Wird gesendet..." : "Einladung senden"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
