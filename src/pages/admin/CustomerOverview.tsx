import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, Search, Download, Eye, Filter,
  ChevronRight, Users, Package
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface CustomerRow {
  user_id: string;
  name: string;
  email: string;
  products: string[];
  health_color: string | null;
  health_score: number | null;
  advisor_name: string | null;
  created_at: string;
}

export default function CustomerOverview() {
  const nav = useNavigate();
  const { user: authUser } = useAuth();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [products, setProducts] = useState<{ slug: string; name: string }[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);

    // Load products for filter
    const { data: prods } = await (supabase as any).from("products").select("slug, name").eq("status", "active");
    setProducts(prods || []);

    // Load all customer profiles (role = client or no role)
    const { data: profiles } = await supabase.from("profiles").select("id, name, email, role, created_at");
    const clientProfiles = (profiles || []).filter((p: any) => !p.role || p.role === "client");

    // Load customer_products
    const { data: cps } = await (supabase as any).from("customer_products").select("user_id, products(name, slug)").in("status", ["active", "onboarding"]);

    // Load health scores
    const { data: healths } = await (supabase as any).from("health_scores").select("tenant_id, score, color").order("created_at", { ascending: false });
    const latestHealth: Record<string, { score: number; color: string }> = {};
    for (const h of healths || []) {
      if (!latestHealth[h.tenant_id]) latestHealth[h.tenant_id] = h;
    }

    // Load advisor assignments
    const { data: assignments } = await (supabase as any).from("advisor_assignments").select("customer_user_id, advisor_user_id");
    const advisorIds = [...new Set((assignments || []).map((a: any) => a.advisor_user_id))];
    const { data: advisorProfiles } = advisorIds.length
      ? await supabase.from("profiles").select("id, name, email").in("id", advisorIds)
      : { data: [] };
    const advisorMap: Record<string, string> = {};
    for (const p of advisorProfiles || []) {
      advisorMap[p.id] = (p as any).name || (p as any).email || "";
    }

    // Build rows
    const rows: CustomerRow[] = clientProfiles.map((p: any) => {
      const userCps = (cps || []).filter((cp: any) => cp.user_id === p.id);
      const productNames = userCps.map((cp: any) => cp.products?.name || cp.products?.slug || "").filter(Boolean);
      const assignment = (assignments || []).find((a: any) => a.customer_user_id === p.id);
      return {
        user_id: p.id,
        name: p.name || p.email || "",
        email: p.email || "",
        products: productNames,
        health_color: null, // TODO: link via tenants
        health_score: null,
        advisor_name: assignment ? advisorMap[assignment.advisor_user_id] || null : null,
        created_at: p.created_at,
      };
    });

    setCustomers(rows);
    setLoading(false);
  }

  const filtered = customers.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (productFilter && !c.products.some(p => p.toLowerCase().includes(productFilter.toLowerCase()))) return false;
    return true;
  });

  function exportCSV() {
    const headers = "Name,Email,Produkte,Berater,Seit\n";
    const rows = filtered.map(c =>
      `"${c.name}","${c.email}","${c.products.join(", ")}","${c.advisor_name || ""}","${new Date(c.created_at).toLocaleDateString("de-DE")}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kunden_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => nav("/dashboard/admin")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition mb-2">
            <ArrowLeft className="w-4 h-4" /> Admin Dashboard
          </button>
          <h1 className="text-2xl font-bold text-white">Kunden-Übersicht</h1>
          <p className="text-sm text-gray-400 mt-1">{customers.length} Kunden gesamt, {filtered.length} angezeigt</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-[rgba(249,249,249,0.08)] rounded-lg text-[12px] text-[rgba(249,249,249,0.5)] hover:bg-[rgba(249,249,249,0.04)] transition">
          <Download className="w-4 h-4" /> CSV Export
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-[#111827] border border-[#1E293B] rounded-lg px-3 py-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name oder E-Mail..." className="bg-transparent text-white text-sm outline-none flex-1" />
        </div>
        <select value={productFilter} onChange={e => setProductFilter(e.target.value)} className="bg-[#111827] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white">
          <option value="">Alle Produkte</option>
          {products.map(p => <option key={p.slug} value={p.name}>{p.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: 0 }}>
        <div className="relative z-[2]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(249,249,249,0.06)]">
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[rgba(249,249,249,0.3)]">Kunde</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[rgba(249,249,249,0.3)]">Produkte</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[rgba(249,249,249,0.3)]">Berater</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-[rgba(249,249,249,0.3)]">Seit</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.user_id} className="border-b border-[rgba(249,249,249,0.03)] hover:bg-[rgba(249,249,249,0.02)]">
                  <td className="px-5 py-3">
                    <div className="text-[13px] text-white font-medium">{c.name}</div>
                    <div className="text-[11px] text-[rgba(249,249,249,0.4)]">{c.email}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.products.length > 0 ? c.products.map(p => (
                        <span key={p} className="px-2 py-0.5 rounded text-[10px] font-medium bg-[rgba(197,160,89,0.1)] text-[#E9CB8B]">{p}</span>
                      )) : <span className="text-[11px] text-[rgba(249,249,249,0.2)]">—</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[12px] text-[rgba(249,249,249,0.5)]">{c.advisor_name || "—"}</td>
                  <td className="px-5 py-3 text-[12px] text-[rgba(249,249,249,0.4)]">{new Date(c.created_at).toLocaleDateString("de-DE")}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => nav(`/dashboard/advisor/dossier/${c.user_id}`)} title="Dossier" className="p-1.5 rounded hover:bg-[rgba(249,249,249,0.04)] transition">
                        <Eye className="w-4 h-4 text-[rgba(249,249,249,0.3)]" />
                      </button>
                      <button onClick={() => nav(`/dashboard/advisor/fulfillment/${c.user_id}`)} title="Fulfillment" className="p-1.5 rounded hover:bg-[rgba(249,249,249,0.04)] transition">
                        <Package className="w-4 h-4 text-[rgba(249,249,249,0.3)]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
