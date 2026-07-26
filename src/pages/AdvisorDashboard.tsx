import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Activity,
  RefreshCw,
  ListChecks,
  Plus,
  ChevronRight,
  ClipboardCheck,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChecklistTemplateEditor } from "@/components/advisor/ChecklistTemplateEditor";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Tenant {
  id: string;
  company_name: string;
  contact_name: string;
  is_active: boolean;
  created_at: string;
  latestHealth?: { score: number; color: string };
  assetsCount?: number;
  tasksDone?: number;
  tasksTotal?: number;
}

interface AssignedCustomer {
  assignment_id: string;
  customer_id: string;
  full_name: string | null;
  email: string | null;
  checklist_total: number;
  checklist_done: number;
  open_items: number;
  instance_id: string | null;
}

interface ChecklistTemplate {
  id: string;
  title: string;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function HealthBadge({ color, score }: { color: string; score: number }) {
  const colors: Record<string, string> = {
    green: "text-[#7FC29B] bg-[rgba(127,194,155,0.1)]",
    amber: "text-[#E9CB8B] bg-[rgba(233,203,139,0.1)]",
    red: "text-[#E87467] bg-[rgba(232,116,103,0.1)]",
  };
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-[0.1em] uppercase ${
        colors[color] || colors.green
      }`}
    >
      {score}%
    </span>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AdvisorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Existing tenant data
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  // New: assigned customers with checklist progress
  const [customers, setCustomers] = useState<AssignedCustomer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);

  // Apply-checklist modal state
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [applyingChecklist, setApplyingChecklist] = useState(false);

  // Create-template modal
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
    loadCustomers();
    loadTemplates();
  }, [user]);

  // ── Existing tenant loader (unchanged) ──────────────────────────────────────

  async function loadData() {
    setLoading(true);
    try {
      const { data: tenantsData } = await supabase
        .from("tenants")
        .select("*, health_scores(score, color, created_at)")
        .eq("advisor_id", user!.id)
        .eq("is_active", true)
        .order("company_name");

      const processed = await Promise.all(
        (tenantsData || []).map(async (t: any) => {
          const sorted = t.health_scores?.sort(
            (a: any, b: any) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

          const { count: assetsCount } = await (supabase as any)
            .from("generated_assets")
            .select("id", { count: "exact", head: true })
            .eq("user_id", t.user_id);

          const { data: tasks } = await (supabase as any)
            .from("daily_tasks")
            .select("id, is_done")
            .eq("user_id", t.user_id);

          return {
            ...t,
            latestHealth: sorted?.[0],
            assetsCount: assetsCount || 0,
            tasksDone: tasks?.filter((tk: any) => tk.is_done).length || 0,
            tasksTotal: tasks?.length || 0,
          };
        })
      );

      setTenants(processed);
    } catch (err) {
      console.error("Advisor load error:", err);
    }
    setLoading(false);
  }

  // ── New: load advisor_assignments → customers ────────────────────────────────

  async function loadCustomers() {
    setCustomersLoading(true);
    try {
      const { data: assignments, error } = await (supabase as any)
        .from("advisor_assignments")
        .select("id, customer_id")
        .eq("advisor_id", user!.id);

      if (error) throw error;
      if (!assignments?.length) {
        setCustomers([]);
        setCustomersLoading(false);
        return;
      }

      const customerIds = assignments.map((a: any) => a.customer_id);

      // Profiles
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, email")
        .in("id", customerIds);

      const profileMap: Record<string, { full_name: string | null; email: string | null }> = {};
      for (const p of profiles || []) profileMap[p.id] = p;

      // Checklist instances for these customers
      const { data: instances } = await (supabase as any)
        .from("checklist_instances")
        .select("id, customer_id, template_id")
        .in("customer_id", customerIds);

      // Build per-customer checklist aggregates
      const enriched: AssignedCustomer[] = await Promise.all(
        assignments.map(async (a: any) => {
          const profile = profileMap[a.customer_id] || { full_name: null, email: null };

          // Find latest instance for this customer
          const custInstances = (instances || []).filter(
            (i: any) => i.customer_id === a.customer_id
          );
          const instance = custInstances[0] ?? null;

          let checklist_total = 0;
          let checklist_done = 0;

          if (instance) {
            // Template items count
            const { count: total } = await (supabase as any)
              .from("checklist_template_items")
              .select("id", { count: "exact", head: true })
              .eq("template_id", instance.template_id);

            // Done statuses
            const { count: done } = await (supabase as any)
              .from("checklist_item_statuses")
              .select("id", { count: "exact", head: true })
              .eq("instance_id", instance.id)
              .eq("is_done", true);

            checklist_total = total || 0;
            checklist_done = done || 0;
          }

          return {
            assignment_id: a.id,
            customer_id: a.customer_id,
            full_name: profile.full_name,
            email: profile.email,
            checklist_total,
            checklist_done,
            open_items: Math.max(0, checklist_total - checklist_done),
            instance_id: instance?.id ?? null,
          };
        })
      );

      setCustomers(enriched);
    } catch (err) {
      console.error("Customer load error:", err);
    }
    setCustomersLoading(false);
  }

  async function loadTemplates() {
    const { data } = await (supabase as any)
      .from("checklist_templates")
      .select("id, title")
      .order("title");
    setTemplates(data || []);
  }

  // ── Apply checklist ──────────────────────────────────────────────────────────

  async function applyChecklist() {
    if (!selectedTemplate || !selectedCustomer) {
      toast({
        title: "Auswahl fehlt",
        description: "Bitte Vorlage und Kunde wählen.",
        variant: "destructive",
      });
      return;
    }
    setApplyingChecklist(true);
    try {
      const template = templates.find((t) => t.id === selectedTemplate);
      const { error } = await (supabase as any)
        .from("checklist_instances")
        .insert({
          template_id: selectedTemplate,
          customer_id: selectedCustomer,
          advisor_id: user!.id,
          title: template?.title ?? "Checkliste",
        });

      if (error) throw error;

      toast({ title: "Checkliste angewendet ✓" });
      setApplyModalOpen(false);
      setSelectedTemplate("");
      setSelectedCustomer("");
      loadCustomers();
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setApplyingChecklist(false);
    }
  }

  // ── Derived values ───────────────────────────────────────────────────────────

  const healthGreen = tenants.filter((t) => t.latestHealth?.color === "green").length;
  const healthAmber = tenants.filter((t) => t.latestHealth?.color === "amber").length;
  const healthRed = tenants.filter((t) => t.latestHealth?.color === "red").length;
  const name = user?.user_metadata?.name?.split(" ")[0] || "Berater";

  if (loading && customersLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        className="glass-panel fade-up"
        style={{
          background: "linear-gradient(135deg, rgba(197,160,89,0.14), rgba(10,11,11,0.6))",
          borderColor: "rgba(197,160,89,0.2)",
        }}
      >
        <div className="relative z-[2] flex items-start justify-between">
          <div>
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">
              Berater-Cockpit
            </span>
            <h1
              className="text-2xl text-white"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Hallo {name}, hier sind deine Kunden
              <span className="text-[#C5A059]">.</span>
            </h1>
            <p className="text-[13px] text-[rgba(249,249,249,0.5)] mt-1">
              {tenants.length} zugewiesene Kunden · {healthGreen} gesund ·{" "}
              {healthAmber + healthRed} brauchen Aufmerksamkeit
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCreateTemplateOpen(true)}
              className="text-[rgba(249,249,249,0.5)] hover:text-[#C5A059] text-[12px] gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Vorlage erstellen
            </Button>
            <Button
              size="sm"
              onClick={() => setApplyModalOpen(true)}
              className="bg-[#C5A059] hover:bg-[#E9CB8B] text-black font-semibold text-[12px] gap-1.5"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              Checkliste anwenden
            </Button>
          </div>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: Users, label: "Meine Kunden", value: tenants.length, color: "#C5A059" },
          { icon: TrendingUp, label: "Gesund", value: healthGreen, color: "#7FC29B" },
          { icon: Activity, label: "Achtung", value: healthAmber, color: "#E9CB8B" },
          { icon: AlertTriangle, label: "Kritisch", value: healthRed, color: "#E87467" },
        ].map((stat, i) => (
          <div
            key={i}
            className="glass-panel fade-up"
            style={{ animationDelay: `${(i + 1) * 60}ms` }}
          >
            <div className="relative z-[2]">
              <stat.icon className="w-4 h-4 mb-2" style={{ color: stat.color }} />
              <div
                className="text-2xl text-white"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {stat.value}
              </div>
              <div className="text-[9px] text-[rgba(249,249,249,0.4)] tracking-[0.2em] uppercase mt-1">
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tenant health cards (existing) ──────────────────────────────────── */}
      {tenants.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {tenants.map((tenant, i) => {
            const taskPct = tenant.tasksTotal
              ? Math.round((tenant.tasksDone! / tenant.tasksTotal) * 100)
              : 0;
            const healthColor = tenant.latestHealth?.color || "green";
            const borderColors: Record<string, string> = {
              green: "rgba(127,194,155,0.2)",
              amber: "rgba(233,203,139,0.2)",
              red: "rgba(232,116,103,0.25)",
            };

            return (
              <div
                key={tenant.id}
                className="glass-panel fade-up cursor-pointer group"
                style={{
                  animationDelay: `${300 + i * 80}ms`,
                  borderColor: borderColors[healthColor],
                }}
              >
                <div className="relative z-[2]">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-semibold text-[#E9CB8B]"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(197,160,89,0.2), rgba(119,90,25,0.1))",
                          border: "1px solid rgba(197,160,89,0.25)",
                        }}
                      >
                        {tenant.company_name?.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-[14px] font-semibold text-white">
                          {tenant.company_name}
                        </h3>
                        <p className="text-[11px] text-[rgba(249,249,249,0.4)]">
                          {tenant.contact_name || "—"}
                        </p>
                      </div>
                    </div>
                    {tenant.latestHealth && (
                      <HealthBadge
                        color={tenant.latestHealth.color}
                        score={tenant.latestHealth.score}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div>
                      <div
                        className="text-[16px] text-white"
                        style={{ fontFamily: "var(--font-serif)" }}
                      >
                        {tenant.assetsCount}
                        <span className="text-[11px] text-[#E9CB8B]">/14</span>
                      </div>
                      <div className="text-[9px] text-[rgba(249,249,249,0.3)] tracking-[0.15em] uppercase">
                        Assets
                      </div>
                    </div>
                    <div>
                      <div
                        className="text-[16px] text-white"
                        style={{ fontFamily: "var(--font-serif)" }}
                      >
                        {taskPct}
                        <span className="text-[11px] text-[#E9CB8B]">%</span>
                      </div>
                      <div className="text-[9px] text-[rgba(249,249,249,0.3)] tracking-[0.15em] uppercase">
                        Fahrplan
                      </div>
                    </div>
                    <div>
                      <div
                        className="text-[16px] text-white"
                        style={{ fontFamily: "var(--font-serif)" }}
                      >
                        {new Date(tenant.created_at).toLocaleDateString("de-DE", {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                      <div className="text-[9px] text-[rgba(249,249,249,0.3)] tracking-[0.15em] uppercase">
                        Start
                      </div>
                    </div>
                  </div>

                  <div className="h-1.5 bg-[rgba(249,249,249,0.06)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${taskPct}%`,
                        background:
                          taskPct >= 80
                            ? "#7FC29B"
                            : taskPct >= 40
                            ? "linear-gradient(90deg, #775A19, #C5A059)"
                            : "rgba(232,116,103,0.6)",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Meine Kunden (advisor_assignments) ──────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-[#C5A059]" />
            <span
              className="text-[15px] font-semibold text-white"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Meine Kunden
              <span className="text-[#C5A059]">.</span>
            </span>
          </div>
          <span className="text-[11px] text-[rgba(249,249,249,0.3)]">
            {customers.length} zugewiesen
          </span>
        </div>

        {customersLoading ? (
          <div className="glass-panel animate-pulse h-20" />
        ) : customers.length === 0 ? (
          <div className="glass-panel text-center py-10">
            <div className="relative z-[2]">
              <Users className="w-10 h-10 text-[rgba(249,249,249,0.08)] mx-auto mb-2" />
              <p className="text-[13px] text-[rgba(249,249,249,0.4)]">
                Noch keine Kunden via Advisor-Assignment zugewiesen
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {customers.map((c, i) => {
              const pct =
                c.checklist_total > 0
                  ? Math.round((c.checklist_done / c.checklist_total) * 100)
                  : 0;
              const hasChecklist = c.checklist_total > 0;

              return (
                <div
                  key={c.assignment_id}
                  className="glass-panel fade-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="relative z-[2] flex items-center gap-4">
                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-semibold text-[#E9CB8B] flex-shrink-0"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(197,160,89,0.2), rgba(119,90,25,0.1))",
                        border: "1px solid rgba(197,160,89,0.2)",
                      }}
                    >
                      {(c.full_name || c.email || "?").substring(0, 2).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[14px] font-semibold text-white truncate">
                          {c.full_name || c.email || c.customer_id.slice(0, 8)}
                        </span>
                        {c.email && c.full_name && (
                          <span className="text-[11px] text-[rgba(249,249,249,0.35)] truncate">
                            {c.email}
                          </span>
                        )}
                      </div>

                      {hasChecklist ? (
                        <div className="flex items-center gap-3">
                          {/* Mini progress bar */}
                          <div className="flex-1 max-w-[160px] h-1.5 bg-[rgba(249,249,249,0.06)] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                background:
                                  pct === 100
                                    ? "#7FC29B"
                                    : "linear-gradient(90deg, #775A19, #C5A059)",
                              }}
                            />
                          </div>
                          <span className="text-[11px] text-[rgba(249,249,249,0.4)]">
                            {pct}%
                          </span>
                          {c.open_items > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold tracking-[0.08em] bg-[rgba(233,203,139,0.1)] text-[#E9CB8B]">
                              {c.open_items} offen
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-[rgba(249,249,249,0.28)] italic">
                          Keine Checkliste angewendet
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          setSelectedCustomer(c.customer_id);
                          setApplyModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                        style={{
                          background: "rgba(197,160,89,0.08)",
                          border: "1px solid rgba(197,160,89,0.2)",
                          color: "#C5A059",
                        }}
                      >
                        Checkliste anwenden
                      </button>

                      {c.instance_id && (
                        <button
                          onClick={() =>
                            navigate(`/advisor/checklist/${c.instance_id}`)
                          }
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{
                            background: "rgba(249,249,249,0.04)",
                            border: "1px solid rgba(249,249,249,0.08)",
                            color: "rgba(249,249,249,0.4)",
                          }}
                          aria-label="Details anzeigen"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Empty state (no tenants at all) ─────────────────────────────────── */}
      {tenants.length === 0 && customers.length === 0 && !loading && !customersLoading && (
        <div className="glass-panel fade-up text-center py-12">
          <div className="relative z-[2]">
            <Users className="w-12 h-12 text-[rgba(249,249,249,0.1)] mx-auto mb-3" />
            <p className="text-[13px] text-[rgba(249,249,249,0.5)]">
              Dir wurden noch keine Kunden zugewiesen
            </p>
            <p className="text-[11px] text-[rgba(249,249,249,0.3)] mt-1">
              Dein Admin wird dir Kunden zuordnen
            </p>
          </div>
        </div>
      )}

      {/* ── Modal: Checkliste anwenden ───────────────────────────────────────── */}
      <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
        <DialogContent className="bg-[#0A0B0B] border-[rgba(249,249,249,0.1)] text-white max-w-md">
          <DialogHeader>
            <DialogTitle
              className="text-[18px]"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Checkliste anwenden
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[11px] text-[rgba(249,249,249,0.4)] tracking-[0.15em] uppercase">
                Vorlage
              </label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="bg-[rgba(249,249,249,0.04)] border-[rgba(249,249,249,0.1)] text-white">
                  <SelectValue placeholder="Vorlage auswählen…" />
                </SelectTrigger>
                <SelectContent className="bg-[#141616] border-[rgba(249,249,249,0.1)]">
                  {templates.length === 0 ? (
                    <div className="px-3 py-2 text-[12px] text-[rgba(249,249,249,0.4)]">
                      Keine Vorlagen vorhanden
                    </div>
                  ) : (
                    templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-[rgba(249,249,249,0.4)] tracking-[0.15em] uppercase">
                Kunde
              </label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger className="bg-[rgba(249,249,249,0.04)] border-[rgba(249,249,249,0.1)] text-white">
                  <SelectValue placeholder="Kunde auswählen…" />
                </SelectTrigger>
                <SelectContent className="bg-[#141616] border-[rgba(249,249,249,0.1)]">
                  {customers.map((c) => (
                    <SelectItem key={c.customer_id} value={c.customer_id}>
                      {c.full_name || c.email || c.customer_id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {templates.length === 0 && (
              <p className="text-[12px] text-[rgba(249,249,249,0.4)]">
                Erstelle zuerst eine Vorlage über "Vorlage erstellen".
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setApplyModalOpen(false);
                  setSelectedTemplate("");
                  setSelectedCustomer("");
                }}
                className="text-[rgba(249,249,249,0.5)] hover:text-white"
              >
                Abbrechen
              </Button>
              <Button
                onClick={applyChecklist}
                disabled={applyingChecklist || !selectedTemplate || !selectedCustomer}
                className="bg-[#C5A059] hover:bg-[#E9CB8B] text-black font-semibold"
              >
                {applyingChecklist ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Anwenden…
                  </span>
                ) : (
                  "Anwenden"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Neue Vorlage erstellen ────────────────────────────────────── */}
      <Dialog open={createTemplateOpen} onOpenChange={setCreateTemplateOpen}>
        <DialogContent className="bg-[#0A0B0B] border-[rgba(249,249,249,0.1)] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <ChecklistTemplateEditor
            onClose={() => setCreateTemplateOpen(false)}
            onSaved={(id) => {
              setCreateTemplateOpen(false);
              loadTemplates();
              toast({ title: "Vorlage bereit", description: "Du kannst sie jetzt anwenden." });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
