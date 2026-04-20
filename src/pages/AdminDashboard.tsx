import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, TrendingUp, AlertTriangle, Plus, RefreshCw,
  ChevronRight, Activity, UserPlus, Mail, Shield, UserCheck, X
} from "lucide-react";

interface Advisor {
  user_id: string;
  name: string;
  email: string;
}

interface Tenant {
  id: string;
  company_name: string;
  contact_name: string;
  is_active: boolean;
  created_at: string;
  advisor_id: string | null;
  latestHealth?: { score: number; color: string };
}

function HealthBadge({ color, score }: { color: string; score: number }) {
  const colors: Record<string, string> = {
    green: "text-[#7FC29B] bg-[rgba(127,194,155,0.1)]",
    amber: "text-[#E9CB8B] bg-[rgba(233,203,139,0.1)]",
    red: "text-[#E87467] bg-[rgba(232,116,103,0.1)]",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-[0.1em] uppercase ${colors[color] || colors.green}`}>
      {score}%
    </span>
  );
}

export default function AdminDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  // Invite states
  const [showInviteCustomer, setShowInviteCustomer] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCompany, setInviteCompany] = useState("");
  const [inviting, setInviting] = useState(false);

  const [showInviteAdvisor, setShowInviteAdvisor] = useState(false);
  const [advisorEmail, setAdvisorEmail] = useState("");
  const [advisorName, setAdvisorName] = useState("");
  const [invitingAdvisor, setInvitingAdvisor] = useState(false);

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

      // Load advisors from user_roles
      const { data: advisorRoles } = await (supabase as any)
        .from("user_roles")
        .select("user_id")
        .eq("role", "advisor");

      if (advisorRoles && advisorRoles.length > 0) {
        const advisorIds = advisorRoles.map((r: any) => r.user_id);
        const { data: advisorProfiles } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", advisorIds);

        setAdvisors((advisorProfiles || []).map((p: any) => ({
          user_id: p.id,
          name: p.name || p.email || "Berater",
          email: p.email || "",
        })));
      }

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
      setInviteEmail(""); setInviteCompany(""); setShowInviteCustomer(false);
      await loadData();
    } catch (err) { console.error("Invite error:", err); }
    setInviting(false);
  }

  async function inviteAdvisor() {
    if (!advisorEmail) return;
    setInvitingAdvisor(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-advisor", {
        body: { email: advisorEmail, full_name: advisorName },
      });
      if (error) {
        alert(`Fehler: ${error.message || JSON.stringify(error)}`);
        console.error("Advisor invite error:", error);
      } else {
        alert(data?.message || "Berater erfolgreich eingeladen!");
        setAdvisorEmail(""); setAdvisorName(""); setShowInviteAdvisor(false);
        await loadData();
      }
    } catch (err: any) {
      alert(`Fehler: ${err.message || "Unbekannter Fehler"}`);
      console.error("Advisor invite error:", err);
    }
    setInvitingAdvisor(false);
  }

  async function assignAdvisor(tenantId: string, advisorId: string | null) {
    await supabase.from("tenants").update({ advisor_id: advisorId }).eq("id", tenantId);
    setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, advisor_id: advisorId } : t));
  }

  const healthGreen = tenants.filter(t => t.latestHealth?.color === "green").length;
  const healthAmber = tenants.filter(t => t.latestHealth?.color === "amber").length;
  const healthRed = tenants.filter(t => t.latestHealth?.color === "red").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="glass-panel fade-up">
        <div className="relative z-[2] flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">Administration</span>
            <h1 className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>Admin Dashboard</h1>
            <p className="text-[13px] text-[rgba(249,249,249,0.5)] mt-0.5">
              Portfolio-Gesamtübersicht · {tenants.length} aktive Kunden · {advisors.length} Berater
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={recalculateHealth} disabled={calculating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium text-[rgba(249,249,249,0.72)] border border-[rgba(249,249,249,0.08)] hover:bg-[rgba(249,249,249,0.04)] transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${calculating ? "animate-spin" : ""}`} />
              Health Scores
            </button>
            <button onClick={() => setShowInviteAdvisor(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium text-[#E9CB8B] border border-[rgba(197,160,89,0.3)] hover:bg-[rgba(197,160,89,0.08)] transition"
            >
              <Shield className="w-3.5 h-3.5" /> Berater einladen
            </button>
            <button onClick={() => setShowInviteCustomer(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold text-white transition"
              style={{ background: "linear-gradient(135deg, #C5A059, #775A19)", boxShadow: "0 0 18px rgba(197,160,89,0.35)" }}
            >
              <UserPlus className="w-3.5 h-3.5" /> Kunde einladen
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: Users, label: "Aktive Kunden", value: tenants.length, color: "#C5A059" },
          { icon: TrendingUp, label: "Gesund", value: healthGreen, sub: `${tenants.length > 0 ? Math.round((healthGreen / tenants.length) * 100) : 0}%`, color: "#7FC29B" },
          { icon: Activity, label: "Achtung", value: healthAmber, color: "#E9CB8B" },
          { icon: AlertTriangle, label: "Kritisch", value: healthRed, sub: alerts.length > 0 ? `${alerts.length} Alerts` : undefined, color: "#E87467" },
        ].map((stat, i) => (
          <div key={i} className="glass-panel fade-up" style={{ animationDelay: `${(i + 1) * 60}ms` }}>
            <div className="relative z-[2]">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}30` }}>
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <p className="text-3xl text-white" style={{ fontFamily: "var(--font-serif)" }}>{stat.value}</p>
              <p className="text-[10px] text-[rgba(249,249,249,0.4)] tracking-[0.2em] uppercase mt-1">{stat.label}</p>
              {stat.sub && <p className="text-[11px] mt-1" style={{ color: stat.color }}>{stat.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Advisors */}
      {advisors.length > 0 && (
        <div className="glass-panel fade-up" style={{ animationDelay: "300ms" }}>
          <div className="relative z-[2]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">Team</span>
                <h2 className="text-[15px] text-white" style={{ fontFamily: "var(--font-serif)" }}>Berater ({advisors.length})</h2>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {advisors.map(adv => {
                const assignedCount = tenants.filter(t => t.advisor_id === adv.user_id).length;
                return (
                  <div key={adv.user_id} className="flex items-center gap-3 p-3 rounded-xl border border-[rgba(249,249,249,0.08)]" style={{ background: "rgba(249,249,249,0.03)" }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] text-white"
                      style={{ background: "linear-gradient(135deg, #E9CB8B, #C5A059, #775A19)", fontFamily: "var(--font-serif)" }}>
                      {adv.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-semibold text-white truncate">{adv.name}</div>
                      <div className="text-[10px] text-[rgba(249,249,249,0.4)]">{assignedCount} Kunden</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="glass-panel fade-up" style={{ animationDelay: "360ms", padding: 0 }}>
          <div className="relative z-[2]">
            <div className="px-5 py-4 border-b border-[rgba(249,249,249,0.08)] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#E87467]" />
              <h2 className="text-[13px] font-medium text-white">Offene Alerts ({alerts.length})</h2>
            </div>
            <div>
              {alerts.slice(0, 5).map((alert: any, i: number) => (
                <div key={alert.id} className="px-5 py-3 flex items-center justify-between hover:bg-[rgba(249,249,249,0.02)] transition"
                  style={{ borderBottom: i < Math.min(alerts.length, 5) - 1 ? "1px solid rgba(249,249,249,0.05)" : "none" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#E87467]" />
                    <div>
                      <p className="text-[13px] text-white">{alert.tenants?.company_name || "Unbekannt"}</p>
                      <p className="text-[11px] text-[rgba(249,249,249,0.4)]">{alert.message || "Health Score kritisch"}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-[rgba(249,249,249,0.3)]">
                    {new Date(alert.created_at).toLocaleDateString("de-DE")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Customer List */}
      <div className="glass-panel fade-up" style={{ animationDelay: "420ms", padding: 0 }}>
        <div className="relative z-[2]">
          <div className="px-5 py-4 border-b border-[rgba(249,249,249,0.08)] flex items-center justify-between">
            <h2 className="text-[13px] font-medium text-white">Kunden-Portfolio</h2>
            <span className="text-[10px] text-[rgba(249,249,249,0.3)] tracking-[0.15em] uppercase">{tenants.length} Kunden</span>
          </div>
          {tenants.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-[rgba(249,249,249,0.1)] mx-auto mb-3" />
              <p className="text-[13px] text-[rgba(249,249,249,0.5)] mb-1">Noch keine Kunden</p>
              <p className="text-[11px] text-[rgba(249,249,249,0.3)]">Lade deinen ersten Kunden ein um loszulegen</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(249,249,249,0.08)]">
                  <th className="px-5 py-3 text-left text-[9px] font-bold tracking-[0.25em] uppercase text-[rgba(249,249,249,0.3)]">Unternehmen</th>
                  <th className="px-5 py-3 text-left text-[9px] font-bold tracking-[0.25em] uppercase text-[rgba(249,249,249,0.3)]">Kontakt</th>
                  <th className="px-5 py-3 text-left text-[9px] font-bold tracking-[0.25em] uppercase text-[rgba(249,249,249,0.3)]">Health</th>
                  <th className="px-5 py-3 text-left text-[9px] font-bold tracking-[0.25em] uppercase text-[rgba(249,249,249,0.3)]">Berater</th>
                  <th className="px-5 py-3 text-left text-[9px] font-bold tracking-[0.25em] uppercase text-[rgba(249,249,249,0.3)]">Seit</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant, i) => (
                  <tr key={tenant.id} className="hover:bg-[rgba(249,249,249,0.02)] transition"
                    style={{ borderBottom: i < tenants.length - 1 ? "1px solid rgba(249,249,249,0.05)" : "none" }}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-semibold text-[#E9CB8B]"
                          style={{ background: "linear-gradient(135deg, rgba(197,160,89,0.2), rgba(119,90,25,0.1))", border: "1px solid rgba(197,160,89,0.25)" }}>
                          {tenant.company_name?.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[13px] text-white font-medium">{tenant.company_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[12px] text-[rgba(249,249,249,0.5)]">{tenant.contact_name || "—"}</td>
                    <td className="px-5 py-3">
                      {tenant.latestHealth ? (
                        <HealthBadge color={tenant.latestHealth.color} score={tenant.latestHealth.score} />
                      ) : (
                        <span className="text-[10px] text-[rgba(249,249,249,0.2)]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={tenant.advisor_id || ""}
                        onChange={(e) => assignAdvisor(tenant.id, e.target.value || null)}
                        className="text-[11px] bg-transparent border border-[rgba(249,249,249,0.08)] rounded-lg px-2 py-1.5 text-white outline-none focus:border-[rgba(197,160,89,0.3)] transition appearance-none cursor-pointer"
                        style={{ minWidth: 120 }}
                      >
                        <option value="" className="bg-[#141616]">Kein Berater</option>
                        {advisors.map(adv => (
                          <option key={adv.user_id} value={adv.user_id} className="bg-[#141616]">{adv.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-[12px] text-[rgba(249,249,249,0.4)]">
                      {new Date(tenant.created_at).toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <ChevronRight className="w-4 h-4 text-[rgba(249,249,249,0.2)] inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Invite Customer Dialog ── */}
      {showInviteCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowInviteCustomer(false)}>
          <div className="glass-panel w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="relative z-[2]">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg text-white" style={{ fontFamily: "var(--font-serif)" }}>Neuen Kunden einladen</h2>
                <button onClick={() => setShowInviteCustomer(false)} className="text-[rgba(249,249,249,0.3)] hover:text-white transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[12px] text-[rgba(249,249,249,0.5)] mb-6">Der Kunde erhält eine E-Mail mit Login-Daten<span className="text-[#C5A059]">.</span></p>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-1.5">Firmenname</label>
                  <input value={inviteCompany} onChange={e => setInviteCompany(e.target.value)}
                    className="w-full bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-[rgba(249,249,249,0.2)] outline-none focus:border-[rgba(197,160,89,0.3)] transition"
                    placeholder="Firma GmbH" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-1.5">E-Mail</label>
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    className="w-full bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-[rgba(249,249,249,0.2)] outline-none focus:border-[rgba(197,160,89,0.3)] transition"
                    placeholder="kunde@firma.de" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowInviteCustomer(false)}
                    className="flex-1 px-4 py-2.5 border border-[rgba(249,249,249,0.08)] rounded-lg text-[12px] text-[rgba(249,249,249,0.5)] hover:bg-[rgba(249,249,249,0.04)] transition">
                    Abbrechen
                  </button>
                  <button onClick={inviteCustomer} disabled={inviting || !inviteEmail || !inviteCompany}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-semibold text-white transition disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #C5A059, #775A19)" }}>
                    <Mail className="w-3.5 h-3.5" />
                    {inviting ? "Wird gesendet..." : "Einladung senden"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Invite Advisor Dialog ── */}
      {showInviteAdvisor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowInviteAdvisor(false)}>
          <div className="glass-panel w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="relative z-[2]">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg text-white" style={{ fontFamily: "var(--font-serif)" }}>Berater einladen</h2>
                <button onClick={() => setShowInviteAdvisor(false)} className="text-[rgba(249,249,249,0.3)] hover:text-white transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[12px] text-[rgba(249,249,249,0.5)] mb-6">Der Berater erhält eine E-Mail und kann zugewiesene Kunden betreuen<span className="text-[#C5A059]">.</span></p>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-1.5">Name</label>
                  <input value={advisorName} onChange={e => setAdvisorName(e.target.value)}
                    className="w-full bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-[rgba(249,249,249,0.2)] outline-none focus:border-[rgba(197,160,89,0.3)] transition"
                    placeholder="Max Mustermann" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)] mb-1.5">E-Mail</label>
                  <input type="email" value={advisorEmail} onChange={e => setAdvisorEmail(e.target.value)}
                    className="w-full bg-[rgba(10,11,11,0.4)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-[rgba(249,249,249,0.2)] outline-none focus:border-[rgba(197,160,89,0.3)] transition"
                    placeholder="berater@firma.de" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowInviteAdvisor(false)}
                    className="flex-1 px-4 py-2.5 border border-[rgba(249,249,249,0.08)] rounded-lg text-[12px] text-[rgba(249,249,249,0.5)] hover:bg-[rgba(249,249,249,0.04)] transition">
                    Abbrechen
                  </button>
                  <button onClick={inviteAdvisor} disabled={invitingAdvisor || !advisorEmail}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-semibold text-[#E9CB8B] border border-[rgba(197,160,89,0.3)] hover:bg-[rgba(197,160,89,0.08)] transition disabled:opacity-50">
                    <Shield className="w-3.5 h-3.5" />
                    {invitingAdvisor ? "Wird gesendet..." : "Berater einladen"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
