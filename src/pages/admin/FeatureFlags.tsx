import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, ToggleLeft, ToggleRight, Search, Plus, X, Save } from "lucide-react";

interface FeatureFlag {
  id: string;
  account_id: string;
  feature: string;
  is_active: boolean;
  activated_at: string | null;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  account_id: string;
}

export default function FeatureFlags() {
  const nav = useNavigate();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newFlag, setNewFlag] = useState({ account_id: "", feature: "" });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: f }, { data: p }] = await Promise.all([
      (supabase as any).from("feature_access").select("*").order("feature"),
      supabase.from("profiles").select("id, name, email, account_id"),
    ]);
    setFlags(f || []);
    setProfiles((p || []) as any);
    setLoading(false);
  }

  async function toggle(flag: FeatureFlag) {
    await (supabase as any).from("feature_access").update({
      is_active: !flag.is_active,
      activated_at: !flag.is_active ? new Date().toISOString() : null,
    }).eq("id", flag.id);
    await load();
  }

  async function addFlag() {
    if (!newFlag.account_id || !newFlag.feature) return;
    await (supabase as any).from("feature_access").insert({
      account_id: newFlag.account_id,
      feature: newFlag.feature,
      is_active: true,
      activated_at: new Date().toISOString(),
    });
    setShowAdd(false);
    setNewFlag({ account_id: "", feature: "" });
    await load();
  }

  async function removeFlag(id: string) {
    if (!confirm("Feature-Flag wirklich entfernen?")) return;
    await (supabase as any).from("feature_access").delete().eq("id", id);
    await load();
  }

  function getProfileName(accountId: string) {
    const p = profiles.find(pr => pr.account_id === accountId);
    return p ? ((p as any).name || p.email) : accountId?.slice(0, 8);
  }

  const features = [...new Set(flags.map(f => f.feature))].sort();
  const filtered = search
    ? flags.filter(f => f.feature.toLowerCase().includes(search.toLowerCase()) || getProfileName(f.account_id).toLowerCase().includes(search.toLowerCase()))
    : flags;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => nav("/dashboard/admin")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition mb-2">
            <ArrowLeft className="w-4 h-4" /> Admin Dashboard
          </button>
          <h1 className="text-2xl font-bold text-white">Feature Flags</h1>
          <p className="text-sm text-gray-400 mt-1">{flags.length} Flags, {features.length} Features</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-[#D4A22A] text-black font-medium rounded-lg hover:bg-[#B88B1F] transition">
          <Plus className="w-4 h-4" /> Neuer Flag
        </button>
      </div>

      <div className="flex items-center gap-2 bg-[#111827] border border-[#1E293B] rounded-lg px-3 py-2">
        <Search className="w-4 h-4 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Feature oder Nutzer suchen..." className="bg-transparent text-white text-sm outline-none flex-1" />
      </div>

      <div className="glass-panel" style={{ padding: 0 }}>
        <div className="relative z-[2]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(249,249,249,0.06)]">
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[rgba(249,249,249,0.3)]">Feature</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[rgba(249,249,249,0.3)]">Account</th>
                <th className="px-5 py-3 text-center text-[10px] uppercase tracking-wider text-[rgba(249,249,249,0.3)]">Status</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-[rgba(249,249,249,0.3)]">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} className="border-b border-[rgba(249,249,249,0.03)] hover:bg-[rgba(249,249,249,0.02)]">
                  <td className="px-5 py-3 text-[12px] text-white font-medium">{f.feature}</td>
                  <td className="px-5 py-3 text-[12px] text-[rgba(249,249,249,0.5)]">{getProfileName(f.account_id)}</td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => toggle(f)} className="transition">
                      {f.is_active ? <ToggleRight className="w-6 h-6 text-[#7FC29B]" /> : <ToggleLeft className="w-6 h-6 text-[rgba(249,249,249,0.2)]" />}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => removeFlag(f.id)} className="text-[10px] text-red-400/50 hover:text-red-400 transition">Entfernen</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-[rgba(249,249,249,0.3)] text-[13px]">Keine Feature Flags gefunden.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAdd(false)}>
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Neuer Feature Flag</h2>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <select value={newFlag.account_id} onChange={e => setNewFlag(n => ({ ...n, account_id: e.target.value }))} className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm">
              <option value="">Account wählen...</option>
              {[...new Set(profiles.map(p => p.account_id).filter(Boolean))].map(aid => (
                <option key={aid} value={aid}>{getProfileName(aid)}</option>
              ))}
            </select>
            <input value={newFlag.feature} onChange={e => setNewFlag(n => ({ ...n, feature: e.target.value }))} placeholder="Feature-Slug (z.B. bot.leadpost)" className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm" />
            <button onClick={addFlag} disabled={!newFlag.account_id || !newFlag.feature} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D4A22A] text-black font-medium rounded-lg hover:bg-[#B88B1F] transition disabled:opacity-50">
              <Save className="w-4 h-4" /> Flag erstellen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
