import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccountFilter } from "@/hooks/useAccountFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus, GitBranch, Pause, Play, ArrowRight, Loader2, Trash2,
  Mail, Phone, Clock, MessageSquare, Users, Pencil, CircleDot,
  Flag, ChevronDown, Eye, MousePointer, Save
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeType = "start" | "end" | "send_email" | "call_task" | "linkedin_message" | "wait" | "condition";

interface SequenceNode {
  id: string;
  type: NodeType;
  config: Record<string, any>;
}

interface SequenceEdge {
  id: string;
  source: string;
  target: string;
  label?: "ja" | "nein";
}

interface SequenceDefinition {
  nodes: SequenceNode[];
  edges: SequenceEdge[];
}

interface Sequence {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  status: string;
  definition: SequenceDefinition;
  total_leads: number;
  total_completed: number;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => crypto.randomUUID().slice(0, 8);

const NODE_META: Record<NodeType, { label: string; icon: typeof Mail; color: string; bgColor: string }> = {
  start:             { label: "Start",              icon: CircleDot,    color: "text-emerald-500", bgColor: "bg-emerald-500/10 border-emerald-500/20" },
  end:               { label: "Ende",               icon: Flag,         color: "text-slate-400",   bgColor: "bg-slate-500/10 border-slate-500/20" },
  send_email:        { label: "E-Mail senden",      icon: Mail,         color: "text-blue-500",    bgColor: "bg-blue-500/10 border-blue-500/20" },
  call_task:         { label: "Anruf (Aufgabe)",    icon: Phone,        color: "text-rose-500",    bgColor: "bg-rose-500/10 border-rose-500/20" },
  linkedin_message:  { label: "LinkedIn-Nachricht", icon: MessageSquare,color: "text-sky-500",     bgColor: "bg-sky-500/10 border-sky-500/20" },
  wait:              { label: "Warten",             icon: Clock,        color: "text-amber-500",   bgColor: "bg-amber-500/10 border-amber-500/20" },
  condition:         { label: "Bedingung",          icon: GitBranch,    color: "text-purple-500",  bgColor: "bg-purple-500/10 border-purple-500/20" },
};

const CONDITION_LABELS: Record<string, string> = {
  replied: "Hat geantwortet",
  opened: "Hat E-Mail geöffnet",
  clicked: "Hat Link geklickt",
};

function createDefaultDefinition(): SequenceDefinition {
  const startId = "start_" + uid();
  const endId = "end_" + uid();
  return {
    nodes: [
      { id: startId, type: "start", config: {} },
      { id: endId, type: "end", config: {} },
    ],
    edges: [
      { id: "e_" + uid(), source: startId, target: endId },
    ],
  };
}

function getNodePreview(node: SequenceNode): string {
  switch (node.type) {
    case "send_email": return node.config.subject ? `"${node.config.subject}"` : "Kein Betreff";
    case "call_task": return node.config.note || "Anruf tätigen";
    case "linkedin_message": return node.config.message ? `"${node.config.message.slice(0, 40)}..."` : "Nachricht senden";
    case "wait": {
      const d = node.config.delay_days || 0;
      const h = node.config.delay_hours || 0;
      return d > 0 && h > 0 ? `${d} Tage, ${h} Stunden` : d > 0 ? `${d} Tage` : h > 0 ? `${h} Stunden` : "Sofort";
    }
    case "condition": return CONDITION_LABELS[node.config.type] || "Bedingung";
    default: return "";
  }
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Entwurf", variant: "secondary" },
  active: { label: "Aktiv", variant: "default" },
  paused: { label: "Pausiert", variant: "outline" },
  completed: { label: "Abgeschlossen", variant: "secondary" },
};

// ─── Sequences Page (List) ────────────────────────────────────────────────────

const Sequences = () => {
  const { accountId, loading: accountLoading } = useAccountFilter();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ["sequences", accountId],
    queryFn: async () => {
      if (!accountId) return [];
      const { data, error } = await supabase
        .from("sequences" as any)
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Sequence[];
    },
    enabled: !!accountId,
  });

  const createSeq = useMutation({
    mutationFn: async () => {
      if (!accountId || !newName.trim()) throw new Error("Name erforderlich");
      const { error } = await supabase.from("sequences" as any).insert({
        account_id: accountId,
        name: newName.trim(),
        description: newDesc.trim() || null,
        definition: createDefaultDefinition(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequences"] });
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      toast.success("Sequenz erstellt");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteSeq = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sequences" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequences"] });
      setSelectedId(null);
      toast.success("Sequenz gelöscht");
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const next = status === "active" ? "paused" : "active";
      const { error } = await supabase.from("sequences" as any).update({ status: next } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequences"] });
      toast.success("Status aktualisiert");
    },
  });

  const selected = sequences.find((s) => s.id === selectedId);

  if (accountLoading || isLoading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {selected ? (
          <SequenceDetail
            sequence={selected}
            onBack={() => setSelectedId(null)}
            accountId={accountId}
            onDelete={() => deleteSeq.mutate(selected.id)}
            onToggle={() => toggleStatus.mutate({ id: selected.id, status: selected.status })}
          />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Sequenzen</h1>
                <p className="text-muted-foreground text-sm">Erstelle automatisierte Outreach-Flows mit Bedingungen</p>
              </div>
              <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />Neue Sequenz</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Neue Sequenz</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Name</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="z.B. SaaS Outreach Flow" /></div>
                    <div><Label>Beschreibung (optional)</Label><Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Ziel und Zielgruppe..." /></div>
                    <Button onClick={() => createSeq.mutate()} disabled={createSeq.isPending || !newName.trim()}>
                      {createSeq.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Erstellen
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {sequences.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <GitBranch className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold text-foreground mb-1">Noch keine Sequenzen</h3>
                  <p className="text-sm text-muted-foreground mb-4">Erstelle deinen ersten automatisierten Outreach-Flow</p>
                  <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Neue Sequenz</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {sequences.map((seq) => {
                  const st = statusConfig[seq.status] || statusConfig.draft;
                  const nodeCount = (seq.definition?.nodes || []).filter((n: any) => n.type !== "start" && n.type !== "end").length;
                  return (
                    <Card key={seq.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedId(seq.id)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">{seq.name}</h3>
                              <Badge variant={st.variant}>{st.label}</Badge>
                            </div>
                            {seq.description && <p className="text-xs text-muted-foreground mb-3">{seq.description}</p>}
                            <div className="flex gap-6 text-xs">
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <GitBranch className="h-3.5 w-3.5" />{nodeCount} Schritte
                              </span>
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Users className="h-3.5 w-3.5" />{seq.total_leads} Leads
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {(seq.status === "active" || seq.status === "paused") && (
                              <Button variant="ghost" size="icon" onClick={() => toggleStatus.mutate({ id: seq.id, status: seq.status })}>
                                {seq.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              </Button>
                            )}
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

// ─── Sequence Detail ──────────────────────────────────────────────────────────

interface SequenceDetailProps {
  sequence: Sequence;
  onBack: () => void;
  accountId: string | null;
  onDelete: () => void;
  onToggle: () => void;
}

const SequenceDetail = ({ sequence, onBack, accountId, onDelete, onToggle }: SequenceDetailProps) => {
  const queryClient = useQueryClient();
  const [definition, setDefinition] = useState<SequenceDefinition>(
    () => (sequence.definition && sequence.definition.nodes?.length > 0) ? sequence.definition : createDefaultDefinition()
  );
  const [isDirty, setIsDirty] = useState(false);

  const saveDefinition = useMutation({
    mutationFn: async (def: SequenceDefinition) => {
      const { error } = await supabase
        .from("sequences" as any)
        .update({ definition: def as any } as any)
        .eq("id", sequence.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequences"] });
      setIsDirty(false);
      toast.success("Gespeichert");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateDef = useCallback((newDef: SequenceDefinition) => {
    setDefinition(newDef);
    setIsDirty(true);
  }, []);

  const st = statusConfig[sequence.status] || statusConfig.draft;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>← Zurück</Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">{sequence.name}</h2>
          {sequence.description && <p className="text-sm text-muted-foreground">{sequence.description}</p>}
        </div>
        <Badge variant={st.variant}>{st.label}</Badge>
        <Button variant="outline" size="sm" onClick={onToggle}>
          {sequence.status === "active" ? <><Pause className="h-4 w-4 mr-1" />Pausieren</> : <><Play className="h-4 w-4 mr-1" />Aktivieren</>}
        </Button>
        {isDirty && (
          <Button size="sm" onClick={() => saveDefinition.mutate(definition)} disabled={saveDefinition.isPending}>
            {saveDefinition.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Speichern
          </Button>
        )}
      </div>

      <Tabs defaultValue="builder">
        <TabsList>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="leads">Leads ({sequence.total_leads})</TabsTrigger>
          <TabsTrigger value="settings">Einstellungen</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="mt-4">
          <SequenceBuilder definition={definition} onChange={updateDef} />
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          <SequenceLeads sequenceId={sequence.id} definition={definition} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Sequenz löschen</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Diese Aktion kann nicht rückgängig gemacht werden.</p>
              <Button variant="destructive" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />Sequenz löschen
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ─── Sequence Builder ─────────────────────────────────────────────────────────

interface BuilderProps {
  definition: SequenceDefinition;
  onChange: (def: SequenceDefinition) => void;
}

const SequenceBuilder = ({ definition, onChange }: BuilderProps) => {
  const [addAfter, setAddAfter] = useState<{ nodeId: string; edgeId: string } | null>(null);
  const [editingNode, setEditingNode] = useState<SequenceNode | null>(null);

  const { nodes, edges } = definition;
  const findNode = (id: string) => nodes.find((n) => n.id === id);
  const outEdges = (id: string) => edges.filter((e) => e.source === id);
  const inEdges = (id: string) => edges.filter((e) => e.target === id);

  // Insert node between source edge
  const insertNode = (type: NodeType, config: Record<string, any>, afterNodeId: string, edgeId: string) => {
    const edge = edges.find((e) => e.id === edgeId);
    if (!edge) return;

    const newNodeId = type.slice(0, 3) + "_" + uid();
    const newNode: SequenceNode = { id: newNodeId, type, config };

    if (type === "condition") {
      // Create two branches with end nodes
      const endYes = "end_" + uid();
      const endNo = "end_" + uid();
      const newNodes = [
        ...nodes,
        newNode,
        { id: endYes, type: "end" as NodeType, config: {} },
        { id: endNo, type: "end" as NodeType, config: {} },
      ];
      const newEdges = edges.filter((e) => e.id !== edgeId).concat([
        { id: "e_" + uid(), source: afterNodeId, target: newNodeId },
        { id: "e_" + uid(), source: newNodeId, target: endYes, label: "ja" as const },
        { id: "e_" + uid(), source: newNodeId, target: endNo, label: "nein" as const },
      ]);
      // If original edge target was not an end-node, re-link it to the "nein" branch (replace endNo)
      const origTarget = edge.target;
      const origTargetNode = findNode(origTarget);
      if (origTargetNode && origTargetNode.type !== "end") {
        // Put original continuation on the "nein" path, remove the generated endNo
        const finalNodes = newNodes.filter((n) => n.id !== endNo);
        const finalEdges = newEdges.map((e) => (e.target === endNo ? { ...e, target: origTarget } : e));
        onChange({ nodes: finalNodes, edges: finalEdges });
      } else {
        onChange({ nodes: newNodes, edges: newEdges });
      }
    } else {
      // Simple linear insert
      const newNodes = [...nodes, newNode];
      const newEdges = edges.filter((e) => e.id !== edgeId).concat([
        { id: "e_" + uid(), source: afterNodeId, target: newNodeId },
        { id: "e_" + uid(), source: newNodeId, target: edge.target },
      ]);
      onChange({ nodes: newNodes, edges: newEdges });
    }
  };

  // Delete a non-condition node
  const deleteNode = (nodeId: string) => {
    const node = findNode(nodeId);
    if (!node || node.type === "start" || node.type === "end") return;

    if (node.type === "condition") {
      // Only allow if both branches lead directly to end nodes
      const outs = outEdges(nodeId);
      const branchTargets = outs.map((e) => findNode(e.target));
      if (!branchTargets.every((n) => n && n.type === "end")) {
        toast.error("Lösche zuerst alle Schritte in beiden Branches");
        return;
      }
      // Remove condition + its branch end nodes
      const endNodeIds = outs.map((e) => e.target);
      const inEdge = inEdges(nodeId)[0];
      if (!inEdge) return;

      // Find what comes after — nothing, so link to a new end
      const newEndId = "end_" + uid();
      const newNodes = nodes.filter((n) => n.id !== nodeId && !endNodeIds.includes(n.id)).concat([
        { id: newEndId, type: "end" as NodeType, config: {} },
      ]);
      const newEdges = edges
        .filter((e) => e.source !== nodeId && e.target !== nodeId && !endNodeIds.includes(e.target))
        .concat([{ id: "e_" + uid(), source: inEdge.source, target: newEndId }]);
      onChange({ nodes: newNodes, edges: newEdges });
    } else {
      // Bridge: incoming source -> outgoing target
      const inEdge = inEdges(nodeId)[0];
      const outEdge = outEdges(nodeId)[0];
      if (!inEdge || !outEdge) return;

      const newNodes = nodes.filter((n) => n.id !== nodeId);
      const newEdges = edges
        .filter((e) => e.id !== inEdge.id && e.id !== outEdge.id)
        .concat([{ id: "e_" + uid(), source: inEdge.source, target: outEdge.target }]);
      onChange({ nodes: newNodes, edges: newEdges });
    }
  };

  const updateNodeConfig = (nodeId: string, config: Record<string, any>) => {
    onChange({
      ...definition,
      nodes: nodes.map((n) => (n.id === nodeId ? { ...n, config } : n)),
    });
  };

  // Recursive flow renderer
  const renderFlow = (nodeId: string, depth = 0): React.ReactNode => {
    const node = findNode(nodeId);
    if (!node) return null;

    const outs = outEdges(nodeId);

    return (
      <div className="flex flex-col items-center" key={nodeId}>
        {/* Node Card */}
        <NodeCard
          node={node}
          onEdit={() => setEditingNode(node)}
          onDelete={() => deleteNode(nodeId)}
        />

        {/* Render branches or continuation */}
        {node.type === "condition" && outs.length === 2 ? (
          <>
            {/* Connector down from condition */}
            <div className="w-0.5 h-6 bg-border" />
            {/* Branch split */}
            <div className="flex gap-0">
              {/* Left/right horizontal lines */}
              <div className="flex">
                <div className="w-24 md:w-32 h-0.5 bg-border self-start mt-0" />
              </div>
              <div className="flex">
                <div className="w-24 md:w-32 h-0.5 bg-border self-start mt-0" />
              </div>
            </div>
            <div className="flex gap-4 md:gap-8">
              {/* JA branch */}
              <div className="flex flex-col items-center min-w-[160px] md:min-w-[200px]">
                <Badge className="mb-2 bg-emerald-500/20 text-emerald-500 border-emerald-500/30">JA</Badge>
                <div className="w-0.5 h-4 bg-emerald-500/30" />
                {(() => {
                  const jaEdge = outs.find((e) => e.label === "ja");
                  if (!jaEdge) return null;
                  return renderBranch(jaEdge.target, jaEdge.source, "ja");
                })()}
              </div>
              {/* NEIN branch */}
              <div className="flex flex-col items-center min-w-[160px] md:min-w-[200px]">
                <Badge className="mb-2 bg-red-500/20 text-red-500 border-red-500/30">NEIN</Badge>
                <div className="w-0.5 h-4 bg-red-500/30" />
                {(() => {
                  const neinEdge = outs.find((e) => e.label === "nein");
                  if (!neinEdge) return null;
                  return renderBranch(neinEdge.target, neinEdge.source, "nein");
                })()}
              </div>
            </div>
          </>
        ) : node.type !== "end" && outs.length > 0 ? (
          <>
            <div className="w-0.5 h-4 bg-border" />
            {/* Add button between nodes */}
            <button
              className="w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary hover:text-primary text-muted-foreground/50 transition-colors"
              onClick={() => setAddAfter({ nodeId, edgeId: outs[0].id })}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <div className="w-0.5 h-4 bg-border" />
            {renderFlow(outs[0].target, depth + 1)}
          </>
        ) : null}
      </div>
    );
  };

  // Render a branch (inside a condition)
  const renderBranch = (nodeId: string, parentConditionId: string, branchLabel: "ja" | "nein"): React.ReactNode => {
    const node = findNode(nodeId);
    if (!node) return null;

    const outs = outEdges(nodeId);
    // Find the edge coming into this node from parent
    const inEdge = edges.find((e) => e.target === nodeId && (e.source === parentConditionId || inEdges(nodeId).some((ie) => ie.source !== parentConditionId)));
    const parentEdge = edges.find((e) => e.target === nodeId);

    return (
      <div className="flex flex-col items-center">
        {/* Add button before this node (if it's an end node, to add first step in branch) */}
        {node.type === "end" && parentEdge && (
          <>
            <button
              className="w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary hover:text-primary text-muted-foreground/50 transition-colors mb-2"
              onClick={() => setAddAfter({ nodeId: parentEdge.source, edgeId: parentEdge.id })}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </>
        )}

        <NodeCard
          node={node}
          onEdit={() => setEditingNode(node)}
          onDelete={() => deleteNode(nodeId)}
        />

        {node.type !== "end" && outs.length > 0 && (
          <>
            <div className="w-0.5 h-4 bg-border" />
            {node.type === "condition" && outs.length === 2 ? (
              // Nested condition — recursive
              <>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center min-w-[140px]">
                    <Badge className="mb-2 bg-emerald-500/20 text-emerald-500 border-emerald-500/30 text-[10px]">JA</Badge>
                    <div className="w-0.5 h-3 bg-emerald-500/30" />
                    {(() => { const e = outs.find(e => e.label === "ja"); return e ? renderBranch(e.target, nodeId, "ja") : null; })()}
                  </div>
                  <div className="flex flex-col items-center min-w-[140px]">
                    <Badge className="mb-2 bg-red-500/20 text-red-500 border-red-500/30 text-[10px]">NEIN</Badge>
                    <div className="w-0.5 h-3 bg-red-500/30" />
                    {(() => { const e = outs.find(e => e.label === "nein"); return e ? renderBranch(e.target, nodeId, "nein") : null; })()}
                  </div>
                </div>
              </>
            ) : (
              <>
                <button
                  className="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary hover:text-primary text-muted-foreground/50 transition-colors"
                  onClick={() => setAddAfter({ nodeId, edgeId: outs[0].id })}
                >
                  <Plus className="h-3 w-3" />
                </button>
                <div className="w-0.5 h-4 bg-border" />
                {renderBranch(outs[0].target, nodeId, branchLabel)}
              </>
            )}
          </>
        )}
      </div>
    );
  };

  // Find start node
  const startNode = nodes.find((n) => n.type === "start");

  return (
    <div className="relative">
      {/* Flow Canvas */}
      <div className="flex justify-center py-8 px-4 overflow-x-auto">
        <div className="flex flex-col items-center">
          {startNode ? renderFlow(startNode.id) : <p className="text-muted-foreground">Kein Start-Node gefunden</p>}
        </div>
      </div>

      {/* Add Node Dialog */}
      <AddNodeDialog
        open={!!addAfter}
        onClose={() => setAddAfter(null)}
        onAdd={(type, config) => {
          if (!addAfter) return;
          insertNode(type, config, addAfter.nodeId, addAfter.edgeId);
        }}
      />

      {/* Edit Node Dialog */}
      {editingNode && editingNode.type !== "start" && editingNode.type !== "end" && (
        <EditNodeDialog
          open={!!editingNode}
          node={editingNode}
          onClose={() => setEditingNode(null)}
          onSave={(config) => {
            updateNodeConfig(editingNode.id, config);
            setEditingNode(null);
          }}
        />
      )}
    </div>
  );
};

// ─── Node Card ────────────────────────────────────────────────────────────────

const NodeCard = ({ node, onEdit, onDelete }: { node: SequenceNode; onEdit: () => void; onDelete: () => void }) => {
  const meta = NODE_META[node.type];
  const Icon = meta.icon;
  const preview = getNodePreview(node);
  const isTerminal = node.type === "start" || node.type === "end";

  if (isTerminal) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${meta.bgColor}`}>
        <Icon className={`h-4 w-4 ${meta.color}`} />
        <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
      </div>
    );
  }

  return (
    <Card className={`w-[260px] md:w-[300px] border ${meta.bgColor} hover:shadow-md transition-shadow`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 p-1.5 rounded-lg ${meta.bgColor}`}>
            <Icon className={`h-4 w-4 ${meta.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{meta.label}</p>
            {preview && <p className="text-xs text-muted-foreground truncate mt-0.5">{preview}</p>}
            {node.type === "condition" && node.config.check_within_days && (
              <p className="text-[10px] text-muted-foreground mt-0.5">Prüfe innerhalb von {node.config.check_within_days} Tagen</p>
            )}
          </div>
          <div className="flex gap-1">
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1 rounded hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Add Node Dialog ──────────────────────────────────────────────────────────

const ADD_NODE_TYPES: { type: NodeType; label: string; desc: string; icon: typeof Mail; color: string }[] = [
  { type: "send_email", label: "E-Mail senden", desc: "Eine E-Mail an den Lead senden", icon: Mail, color: "text-blue-500" },
  { type: "wait", label: "Warten", desc: "X Tage/Stunden warten", icon: Clock, color: "text-amber-500" },
  { type: "condition", label: "Bedingung (IF/ELSE)", desc: "Flow basierend auf Verhalten splitten", icon: GitBranch, color: "text-purple-500" },
  { type: "call_task", label: "Anruf (Aufgabe)", desc: "Erinnerung für einen Anruf erstellen", icon: Phone, color: "text-rose-500" },
  { type: "linkedin_message", label: "LinkedIn-Nachricht", desc: "Eine LinkedIn-Nachricht senden", icon: MessageSquare, color: "text-sky-500" },
];

const AddNodeDialog = ({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (type: NodeType, config: Record<string, any>) => void }) => {
  const [step, setStep] = useState<"pick" | "config">("pick");
  const [selectedType, setSelectedType] = useState<NodeType | null>(null);

  // Config state
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [delayDays, setDelayDays] = useState(3);
  const [delayHours, setDelayHours] = useState(0);
  const [condType, setCondType] = useState("replied");
  const [checkDays, setCheckDays] = useState(3);

  const reset = () => {
    setStep("pick");
    setSelectedType(null);
    setSubject("");
    setBodyText("");
    setNote("");
    setMessage("");
    setDelayDays(3);
    setDelayHours(0);
    setCondType("replied");
    setCheckDays(3);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleConfirm = () => {
    if (!selectedType) return;
    const type = selectedType;
    let config: Record<string, any> = {};
    switch (type) {
      case "send_email": config = { subject, body_text: bodyText }; break;
      case "call_task": config = { note: note || "Anruf tätigen" }; break;
      case "linkedin_message": config = { message: message || "LinkedIn-Nachricht senden" }; break;
      case "wait": config = { delay_days: delayDays, delay_hours: delayHours }; break;
      case "condition": config = { type: condType, check_within_days: checkDays }; break;
    }
    onAdd(type, config);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{step === "pick" ? "Schritt hinzufügen" : `${ADD_NODE_TYPES.find((t) => t.type === selectedType)?.label} konfigurieren`}</DialogTitle></DialogHeader>

        {step === "pick" ? (
          <div className="grid grid-cols-1 gap-2">
            {ADD_NODE_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.type}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
                  onClick={() => { setSelectedType(t.type); setStep("config"); }}
                >
                  <div className="p-2 rounded-lg bg-muted"><Icon className={`h-5 w-5 ${t.color}`} /></div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {selectedType === "send_email" && (
              <>
                <div>
                  <Label>Betreff</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="z.B. Kurze Frage, {{first_name}}" />
                  <p className="text-xs text-muted-foreground mt-1">Variablen: {"{{first_name}}, {{company}}, {{position}}"}</p>
                </div>
                <div>
                  <Label>Inhalt</Label>
                  <Textarea rows={6} value={bodyText} onChange={(e) => setBodyText(e.target.value)} placeholder={"Hallo {{first_name}},\n\nich wollte kurz..."} />
                </div>
              </>
            )}
            {selectedType === "call_task" && (
              <div>
                <Label>Notiz / Anleitung</Label>
                <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="z.B. Lead anrufen, auf die vorherige E-Mail Bezug nehmen" />
              </div>
            )}
            {selectedType === "linkedin_message" && (
              <div>
                <Label>Nachricht</Label>
                <Textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={"Hi {{first_name}}, ich habe gesehen..."} />
              </div>
            )}
            {selectedType === "wait" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tage</Label>
                  <Input type="number" min={0} value={delayDays} onChange={(e) => setDelayDays(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Stunden</Label>
                  <Input type="number" min={0} max={23} value={delayHours} onChange={(e) => setDelayHours(Number(e.target.value))} />
                </div>
              </div>
            )}
            {selectedType === "condition" && (
              <>
                <div>
                  <Label>Bedingung</Label>
                  <Select value={condType} onValueChange={setCondType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="replied">Hat geantwortet</SelectItem>
                      <SelectItem value="opened">Hat E-Mail geöffnet</SelectItem>
                      <SelectItem value="clicked">Hat Link geklickt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prüfe innerhalb von (Tagen)</Label>
                  <Input type="number" min={1} value={checkDays} onChange={(e) => setCheckDays(Number(e.target.value))} />
                </div>
              </>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("pick")}>Zurück</Button>
              <Button onClick={handleConfirm}>Hinzufügen</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ─── Edit Node Dialog ─────────────────────────────────────────────────────────

const EditNodeDialog = ({ open, node, onClose, onSave }: { open: boolean; node: SequenceNode; onClose: () => void; onSave: (config: Record<string, any>) => void }) => {
  const [config, setConfig] = useState<Record<string, any>>({ ...node.config });

  const meta = NODE_META[node.type];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{meta.label} bearbeiten</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {node.type === "send_email" && (
            <>
              <div>
                <Label>Betreff</Label>
                <Input value={config.subject || ""} onChange={(e) => setConfig({ ...config, subject: e.target.value })} />
              </div>
              <div>
                <Label>Inhalt</Label>
                <Textarea rows={6} value={config.body_text || ""} onChange={(e) => setConfig({ ...config, body_text: e.target.value })} />
              </div>
            </>
          )}
          {node.type === "call_task" && (
            <div>
              <Label>Notiz / Anleitung</Label>
              <Textarea rows={4} value={config.note || ""} onChange={(e) => setConfig({ ...config, note: e.target.value })} />
            </div>
          )}
          {node.type === "linkedin_message" && (
            <div>
              <Label>Nachricht</Label>
              <Textarea rows={6} value={config.message || ""} onChange={(e) => setConfig({ ...config, message: e.target.value })} />
            </div>
          )}
          {node.type === "wait" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tage</Label>
                <Input type="number" min={0} value={config.delay_days || 0} onChange={(e) => setConfig({ ...config, delay_days: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Stunden</Label>
                <Input type="number" min={0} max={23} value={config.delay_hours || 0} onChange={(e) => setConfig({ ...config, delay_hours: Number(e.target.value) })} />
              </div>
            </div>
          )}
          {node.type === "condition" && (
            <>
              <div>
                <Label>Bedingung</Label>
                <Select value={config.type || "replied"} onValueChange={(v) => setConfig({ ...config, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="replied">Hat geantwortet</SelectItem>
                    <SelectItem value="opened">Hat E-Mail geöffnet</SelectItem>
                    <SelectItem value="clicked">Hat Link geklickt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prüfe innerhalb von (Tagen)</Label>
                <Input type="number" min={1} value={config.check_within_days || 3} onChange={(e) => setConfig({ ...config, check_within_days: Number(e.target.value) })} />
              </div>
            </>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button onClick={() => onSave(config)}>Speichern</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Sequence Leads ───────────────────────────────────────────────────────────

const SequenceLeads = ({ sequenceId, definition }: { sequenceId: string; definition: SequenceDefinition }) => {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["sequence-leads", sequenceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sequence_leads" as any)
        .select("*, contacts(first_name, last_name, email, company)")
        .eq("sequence_id", sequenceId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const findNodeLabel = (nodeId: string) => {
    const node = definition.nodes.find((n) => n.id === nodeId);
    if (!node) return nodeId;
    return NODE_META[node.type]?.label || nodeId;
  };

  if (isLoading) return <div className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>;

  if (leads.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Noch keine Leads in dieser Sequenz</p>
        </CardContent>
      </Card>
    );
  }

  const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active: { label: "Aktiv", variant: "default" },
    paused: { label: "Pausiert", variant: "outline" },
    completed: { label: "Fertig", variant: "secondary" },
    exited: { label: "Beendet", variant: "destructive" },
  };

  return (
    <div className="space-y-2">
      {leads.map((lead: any) => {
        const contact = lead.contacts;
        const badge = statusBadge[lead.status] || statusBadge.active;
        return (
          <Card key={lead.id}>
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {contact?.first_name} {contact?.last_name}
                  {contact?.company && <span className="text-muted-foreground"> – {contact.company}</span>}
                </p>
                <p className="text-xs text-muted-foreground">{contact?.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  Aktuell: {findNodeLabel(lead.current_node_id)}
                </span>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default Sequences;
