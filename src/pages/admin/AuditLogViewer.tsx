import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Search, Filter, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AuditEntry {
  id: string;
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  created_at: string;
  impersonated_by: string | null;
  actor_name?: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  INSERT: { label: "Erstellt", color: "text-green-400 bg-green-400/10" },
  UPDATE: { label: "Geändert", color: "text-blue-400 bg-blue-400/10" },
  DELETE: { label: "Gelöscht", color: "text-red-400 bg-red-400/10" },
  LOGIN: { label: "Login", color: "text-gray-400 bg-gray-400/10" },
  LOGOUT: { label: "Logout", color: "text-gray-400 bg-gray-400/10" },
  INVITE: { label: "Einladung", color: "text-amber-400 bg-amber-400/10" },
  IMPERSONATE: { label: "Impersonation", color: "text-purple-400 bg-purple-400/10" },
};

const PAGE_SIZE = 50;

export default function AuditLogViewer() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filterResource, setFilterResource] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { loadEntries(); }, [page, filterResource, filterAction]);

  async function loadEntries() {
    setLoading(true);
    let query = (supabase as any)
      .from("audit_log")
      .select("id, actor_id, action, resource_type, resource_id, created_at, impersonated_by")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filterResource) query = query.eq("resource_type", filterResource);
    if (filterAction) query = query.eq("action", filterAction);

    const { data } = await query;
    const rows = data || [];

    // Fetch actor names
    const actorIds = [...new Set(rows.map((r: any) => r.actor_id).filter(Boolean))];
    let actorMap: Record<string, string> = {};
    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", actorIds);
      for (const p of profiles || []) {
        actorMap[p.id] = (p as any).name || (p as any).email || p.id.slice(0, 8);
      }
    }

    setEntries(rows.map((r: any) => ({ ...r, actor_name: actorMap[r.actor_id] || r.actor_id?.slice(0, 8) || "System" })));
    setHasMore(rows.length === PAGE_SIZE);
    setLoading(false);
  }

  const filtered = searchTerm
    ? entries.filter(e =>
        e.actor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.resource_id?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : entries;

  const resourceTypes = [...new Set(entries.map(e => e.resource_type))].sort();

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <button onClick={() => navigate("/dashboard/admin")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-2">
          <ArrowLeft className="w-4 h-4" /> Admin Dashboard
        </button>
        <h1 className="text-2xl font-bold text-white">Audit-Log</h1>
        <p className="text-sm text-gray-400 mt-1">Alle schreibenden Aktionen im System</p>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <div className="flex items-center gap-2 bg-[#111827] border border-[#1E293B] rounded-lg px-3 py-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Suche nach User, Ressource..."
            className="bg-transparent text-white text-sm outline-none flex-1"
          />
        </div>
        <select
          value={filterAction}
          onChange={e => { setFilterAction(e.target.value); setPage(0); }}
          className="bg-[#111827] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="">Alle Aktionen</option>
          <option value="INSERT">Erstellt</option>
          <option value="UPDATE">Geändert</option>
          <option value="DELETE">Gelöscht</option>
          <option value="INVITE">Einladung</option>
        </select>
        <select
          value={filterResource}
          onChange={e => { setFilterResource(e.target.value); setPage(0); }}
          className="bg-[#111827] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="">Alle Ressourcen</option>
          {resourceTypes.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>Keine Einträge gefunden.</p>
        </div>
      ) : (
        <div className="bg-[#111827] border border-[#1E293B] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-[#1E293B]">
                <th className="px-4 py-3">Zeitpunkt</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Aktion</th>
                <th className="px-4 py-3">Ressource</th>
                <th className="px-4 py-3">ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const a = ACTION_LABELS[e.action] || { label: e.action, color: "text-gray-400 bg-gray-400/10" };
                return (
                  <tr key={e.id} className="border-b border-[#1E293B]/50 hover:bg-[#1A2235]/50">
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-white">
                      {e.actor_name}
                      {e.impersonated_by && <span className="ml-1 text-purple-400 text-xs">(impersoniert)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${a.color}`}>{a.label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{e.resource_type}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{e.resource_id?.slice(0, 8) || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" /> Zurück
        </button>
        <span className="text-sm text-gray-500">Seite {page + 1}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={!hasMore}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30"
        >
          Weiter <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
