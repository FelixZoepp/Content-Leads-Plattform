import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Save, Loader2, X, Check, Package, Zap } from "lucide-react";

interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
}

interface Feature {
  id: string;
  slug: string;
  name: string;
  category: string;
}

interface ProductFeature {
  product_id: string;
  feature_id: string;
}

export default function ProductRegistry() {
  const nav = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [mappings, setMappings] = useState<ProductFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editProduct, setEditProduct] = useState<Partial<Product> | null>(null);
  const [editFeature, setEditFeature] = useState<Partial<Feature> | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: p }, { data: f }, { data: m }] = await Promise.all([
      (supabase as any).from("products").select("*").order("name"),
      (supabase as any).from("features").select("*").order("category, name"),
      (supabase as any).from("product_features").select("product_id, feature_id"),
    ]);
    setProducts(p || []);
    setFeatures(f || []);
    setMappings(m || []);
    setLoading(false);
  }

  function hasMapping(productId: string, featureId: string) {
    return mappings.some(m => m.product_id === productId && m.feature_id === featureId);
  }

  async function toggleMapping(productId: string, featureId: string) {
    if (hasMapping(productId, featureId)) {
      await (supabase as any).from("product_features").delete().match({ product_id: productId, feature_id: featureId });
    } else {
      await (supabase as any).from("product_features").insert({ product_id: productId, feature_id: featureId });
    }
    await load();
  }

  async function saveProduct() {
    if (!editProduct?.name || !editProduct?.slug) return;
    setSaving(true);
    if (editProduct.id) {
      await (supabase as any).from("products").update({ name: editProduct.name, description: editProduct.description, status: editProduct.status }).eq("id", editProduct.id);
    } else {
      await (supabase as any).from("products").insert({ slug: editProduct.slug, name: editProduct.name, description: editProduct.description, status: editProduct.status || "draft" });
    }
    setEditProduct(null);
    setSaving(false);
    await load();
  }

  async function saveFeature() {
    if (!editFeature?.name || !editFeature?.slug) return;
    setSaving(true);
    if (editFeature.id) {
      await (supabase as any).from("features").update({ name: editFeature.name, category: editFeature.category }).eq("id", editFeature.id);
    } else {
      await (supabase as any).from("features").insert({ slug: editFeature.slug, name: editFeature.name, category: editFeature.category || "general" });
    }
    setEditFeature(null);
    setSaving(false);
    await load();
  }

  const categories = [...new Set(features.map(f => f.category))].sort();

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <button onClick={() => nav("/dashboard/admin")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition mb-2">
          <ArrowLeft className="w-4 h-4" /> Admin Dashboard
        </button>
        <h1 className="text-2xl font-bold text-white">Produkte & Features</h1>
        <p className="text-sm text-gray-400 mt-1">{products.length} Produkte, {features.length} Features</p>
      </div>

      {/* Products */}
      <div className="glass-panel">
        <div className="relative z-[2]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[#E9CB8B]" />
              <h2 className="text-[15px] font-semibold text-white">Produkte</h2>
            </div>
            <button onClick={() => setEditProduct({ slug: "", name: "", status: "draft" })} className="flex items-center gap-1 text-[12px] text-[#E9CB8B] hover:text-white transition">
              <Plus className="w-3.5 h-3.5" /> Neues Produkt
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {products.map(p => (
              <button key={p.id} onClick={() => setEditProduct(p)} className="text-left p-3 rounded-xl border border-[rgba(249,249,249,0.06)] hover:border-[rgba(197,160,89,0.2)] transition" style={{ background: "rgba(249,249,249,0.02)" }}>
                <div className="text-[13px] font-medium text-white">{p.name}</div>
                <div className="text-[11px] text-[rgba(249,249,249,0.4)] mt-0.5">{p.slug}</div>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium ${p.status === "active" ? "bg-green-400/10 text-green-400" : "bg-gray-500/10 text-gray-500"}`}>
                  {p.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Matrix */}
      <div className="glass-panel" style={{ padding: 0 }}>
        <div className="relative z-[2]">
          <div className="px-5 py-4 border-b border-[rgba(249,249,249,0.06)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#E9CB8B]" />
              <h2 className="text-[15px] font-semibold text-white">Feature-Matrix</h2>
            </div>
            <button onClick={() => setEditFeature({ slug: "", name: "", category: "general" })} className="flex items-center gap-1 text-[12px] text-[#E9CB8B] hover:text-white transition">
              <Plus className="w-3.5 h-3.5" /> Neues Feature
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(249,249,249,0.06)]">
                  <th className="px-4 py-3 text-left text-[10px] font-bold tracking-wider uppercase text-[rgba(249,249,249,0.3)]">Feature</th>
                  {products.map(p => (
                    <th key={p.id} className="px-3 py-3 text-center text-[10px] font-bold tracking-wider uppercase text-[rgba(249,249,249,0.3)]">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => (
                  <>
                    <tr key={`cat-${cat}`}>
                      <td colSpan={products.length + 1} className="px-4 pt-3 pb-1 text-[9px] font-bold tracking-[0.2em] uppercase text-[#E9CB8B]">{cat}</td>
                    </tr>
                    {features.filter(f => f.category === cat).map(f => (
                      <tr key={f.id} className="border-b border-[rgba(249,249,249,0.03)] hover:bg-[rgba(249,249,249,0.02)]">
                        <td className="px-4 py-2">
                          <button onClick={() => setEditFeature(f)} className="text-[12px] text-white hover:text-[#E9CB8B] transition">{f.name}</button>
                          <div className="text-[10px] text-[rgba(249,249,249,0.3)]">{f.slug}</div>
                        </td>
                        {products.map(p => (
                          <td key={p.id} className="px-3 py-2 text-center">
                            <button
                              onClick={() => toggleMapping(p.id, f.id)}
                              className={`w-6 h-6 rounded-md border transition ${hasMapping(p.id, f.id) ? "bg-[rgba(197,160,89,0.2)] border-[rgba(197,160,89,0.4)]" : "border-[rgba(249,249,249,0.1)] hover:border-[rgba(249,249,249,0.2)]"}`}
                            >
                              {hasMapping(p.id, f.id) && <Check className="w-3.5 h-3.5 text-[#E9CB8B] mx-auto" />}
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setEditProduct(null)}>
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{editProduct.id ? "Produkt bearbeiten" : "Neues Produkt"}</h2>
              <button onClick={() => setEditProduct(null)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <input value={editProduct.slug || ""} onChange={e => setEditProduct(p => p ? { ...p, slug: e.target.value } : p)} disabled={!!editProduct.id} placeholder="slug (z.B. coaching)" className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50" />
            <input value={editProduct.name || ""} onChange={e => setEditProduct(p => p ? { ...p, name: e.target.value } : p)} placeholder="Name" className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm" />
            <textarea value={editProduct.description || ""} onChange={e => setEditProduct(p => p ? { ...p, description: e.target.value } : p)} placeholder="Beschreibung" rows={2} className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm resize-y" />
            <select value={editProduct.status || "draft"} onChange={e => setEditProduct(p => p ? { ...p, status: e.target.value } : p)} className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm">
              <option value="draft">Entwurf</option>
              <option value="active">Aktiv</option>
              <option value="archived">Archiviert</option>
            </select>
            <button onClick={saveProduct} disabled={saving || !editProduct.name || !editProduct.slug} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D4A22A] text-black font-medium rounded-lg hover:bg-[#B88B1F] transition disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Speichern
            </button>
          </div>
        </div>
      )}

      {/* Edit Feature Modal */}
      {editFeature && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setEditFeature(null)}>
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{editFeature.id ? "Feature bearbeiten" : "Neues Feature"}</h2>
              <button onClick={() => setEditFeature(null)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <input value={editFeature.slug || ""} onChange={e => setEditFeature(f => f ? { ...f, slug: e.target.value } : f)} disabled={!!editFeature.id} placeholder="slug (z.B. bot.leadpost)" className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50" />
            <input value={editFeature.name || ""} onChange={e => setEditFeature(f => f ? { ...f, name: e.target.value } : f)} placeholder="Name" className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm" />
            <input value={editFeature.category || ""} onChange={e => setEditFeature(f => f ? { ...f, category: e.target.value } : f)} placeholder="Kategorie (z.B. bot, profil, content)" className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm" />
            <button onClick={saveFeature} disabled={saving || !editFeature.name || !editFeature.slug} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D4A22A] text-black font-medium rounded-lg hover:bg-[#B88B1F] transition disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Speichern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
