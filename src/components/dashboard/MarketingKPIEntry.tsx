import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, TrendingUp, BarChart3, Users, Plus, Trash2 } from "lucide-react";

interface Props {
  tenantId: string;
  onEntryAdded: () => void;
}

interface PostEntry {
  id: string;
  post_url: string;
  post_type: "lead" | "content";
  impressions: string;
  likes: string;
  comments: string;
}

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

const emptyPost = (): PostEntry => ({
  id: crypto.randomUUID(),
  post_url: "",
  post_type: "content",
  impressions: "",
  likes: "",
  comments: "",
});

export function MarketingKPIEntry({ tenantId, onEntryAdded }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [posts, setPosts] = useState<PostEntry[]>([emptyPost()]);
  const [followersNow, setFollowersNow] = useState("");
  const [lastFollowers, setLastFollowers] = useState<number>(0);
  const [leadsTotal, setLeadsTotal] = useState("");
  const [leadsQualified, setLeadsQualified] = useState("");
  const [existingIds, setExistingIds] = useState<number[]>([]);

  useEffect(() => { loadExisting(weekStart); }, [tenantId, weekStart]);

  const loadExisting = async (ws: string) => {
    const weekEnd = new Date(ws);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weStr = weekEnd.toISOString().split("T")[0];

    // Load all entries for this week
    const { data } = await supabase
      .from("metrics_snapshot")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("period_date", ws)
      .lte("period_date", weStr)
      .order("period_date", { ascending: true });

    // Previous week's followers
    const { data: prev } = await supabase
      .from("metrics_snapshot")
      .select("followers_current, period_date")
      .eq("tenant_id", tenantId)
      .lt("period_date", ws)
      .order("period_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    setLastFollowers(prev?.followers_current || 0);

    if (data && data.length > 0) {
      setExistingIds(data.map(d => d.id));
      const loadedPosts: PostEntry[] = data.map(d => ({
        id: crypto.randomUUID(),
        post_url: d.post_url || "",
        post_type: (d.post_type as "lead" | "content") || "content",
        impressions: d.impressions ? String(d.impressions) : "",
        likes: d.likes ? String(d.likes) : "",
        comments: d.comments ? String(d.comments) : "",
      }));
      setPosts(loadedPosts.length > 0 ? loadedPosts : [emptyPost()]);
      // Use last entry's follower/lead data
      const last = data[data.length - 1];
      setFollowersNow(last.followers_current ? String(last.followers_current) : "");
      setLeadsTotal(last.leads_total ? String(last.leads_total) : "");
      setLeadsQualified(last.leads_qualified ? String(last.leads_qualified) : "");
    } else {
      setExistingIds([]);
      setPosts([emptyPost()]);
      setFollowersNow("");
      setLeadsTotal("");
      setLeadsQualified("");
    }
  };

  const addPost = () => setPosts(p => [...p, emptyPost()]);
  const removePost = (id: string) => setPosts(p => p.length > 1 ? p.filter(x => x.id !== id) : p);
  const updatePost = (id: string, field: keyof PostEntry, value: string) =>
    setPosts(p => p.map(x => x.id === id ? { ...x, [field]: value } : x));

  // Aggregated calculations
  const totalImpressions = posts.reduce((a, p) => a + (parseInt(p.impressions) || 0), 0);
  const totalLikes = posts.reduce((a, p) => a + (parseInt(p.likes) || 0), 0);
  const totalComments = posts.reduce((a, p) => a + (parseInt(p.comments) || 0), 0);
  const newFollowers = (parseInt(followersNow) || 0) - lastFollowers;
  const mqRate = (parseInt(leadsTotal) || 0) > 0
    ? (((parseInt(leadsQualified) || 0) / (parseInt(leadsTotal) || 1)) * 100).toFixed(1) : "–";
  const engagementRate = totalImpressions > 0
    ? (((totalLikes + totalComments) / totalImpressions) * 100).toFixed(2) : "–";

  const weekLabel = (() => {
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return `KW ${getISOWeek(start)} (${start.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} – ${end.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })})`;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Delete existing entries for this week first
    if (existingIds.length > 0) {
      // Update first entry, delete rest — or just upsert per post
      // Simpler: delete all existing, then insert new
      for (const id of existingIds) {
        await supabase.from("metrics_snapshot").update({
          impressions: 0, likes: 0, comments: 0, post_url: null, post_type: null,
          posts: "0", followers_current: 0, new_followers: 0, leads_total: 0, leads_qualified: 0,
        }).eq("id", id);
      }
    }

    // Insert one row per post
    const rows = posts.map((p, i) => ({
      tenant_id: tenantId,
      period_date: (() => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i); // Spread across days of the week
        return d.toISOString().split("T")[0];
      })(),
      period_type: "daily" as const,
      post_url: p.post_url || null,
      post_type: p.post_type,
      posts: p.post_url ? "1" : "0",
      impressions: parseInt(p.impressions) || 0,
      likes: parseInt(p.likes) || 0,
      comments: parseInt(p.comments) || 0,
      link_clicks: 0,
      followers_current: i === posts.length - 1 ? (parseInt(followersNow) || 0) : 0,
      new_followers: i === posts.length - 1 ? Math.max(0, newFollowers) : 0,
      leads_total: i === posts.length - 1 ? (parseInt(leadsTotal) || 0) : 0,
      leads_qualified: i === posts.length - 1 ? (parseInt(leadsQualified) || 0) : 0,
    }));

    const { error } = await supabase.from("metrics_snapshot").upsert(rows, {
      onConflict: "tenant_id,period_date,period_type",
    });

    setLoading(false);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Gespeichert ✓", description: `Marketing-KPIs für ${weekLabel} gespeichert` });
      onEntryAdded();
      loadExisting(weekStart);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Wöchentliche Marketing-KPIs
        </CardTitle>
        <CardDescription>Trage jeden Sonntag alle Posts der Woche mit ihren Kennzahlen ein.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Woche auswählen */}
          <div className="space-y-1.5 max-w-[280px]">
            <Label className="text-xs font-medium">Woche auswählen</Label>
            <Input type="week"
              value={`${weekStart.slice(0, 4)}-W${String(getISOWeek(new Date(weekStart))).padStart(2, "0")}`}
              onChange={e => {
                const match = e.target.value.match(/(\d{4})-W(\d{2})/);
                if (match) {
                  const d = getDateFromISOWeek(parseInt(match[1]), parseInt(match[2]));
                  setWeekStart(d);
                }
              }}
            />
            <p className="text-xs text-muted-foreground">{weekLabel}</p>
          </div>

          {/* Posts */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                🔗 LinkedIn Posts ({posts.length})
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={addPost} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Post hinzufügen
              </Button>
            </div>

            {posts.map((post, idx) => (
              <Card key={post.id} className="bg-muted/30 border-border/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Post {idx + 1}</span>
                    {posts.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removePost(post.id)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Post-URL (optional)</Label>
                      <Input type="url" placeholder="https://linkedin.com/posts/..."
                        value={post.post_url} onChange={e => updatePost(post.id, "post_url", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Posttyp</Label>
                      <Select value={post.post_type} onValueChange={v => updatePost(post.id, "post_type", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lead">🎯 Lead-Post</SelectItem>
                          <SelectItem value="content">📝 Content-Post</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Impressionen</Label>
                      <Input type="number" min="0" inputMode="numeric" placeholder="z.B. 5000"
                        value={post.impressions} onChange={e => updatePost(post.id, "impressions", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Likes</Label>
                      <Input type="number" min="0" inputMode="numeric" placeholder="z.B. 120"
                        value={post.likes} onChange={e => updatePost(post.id, "likes", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Kommentare</Label>
                      <Input type="number" min="0" inputMode="numeric" placeholder="z.B. 45"
                        value={post.comments} onChange={e => updatePost(post.id, "comments", e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          {/* Follower */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              <Users className="h-4 w-4" /> Follower-Entwicklung
            </h3>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Follower (aktuell)
                  {lastFollowers > 0 && <span className="ml-1 text-muted-foreground font-normal">vorher: {lastFollowers}</span>}
                </Label>
                <Input type="number" min="0" placeholder="z.B. 2500"
                  value={followersNow} onChange={e => setFollowersNow(e.target.value)} />
                {(parseInt(followersNow) || 0) > 0 && lastFollowers > 0 && (
                  <p className="text-xs text-muted-foreground">
                    +{Math.max(0, newFollowers)} neue Follower diese Woche
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Lead Generation */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              🎯 Lead-Generierung (Woche)
            </h3>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Leads generiert</Label>
                <Input type="number" min="0" inputMode="numeric" placeholder="z.B. 15"
                  value={leadsTotal} onChange={e => setLeadsTotal(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">MQL (Qualifiziert)</Label>
                <Input type="number" min="0" inputMode="numeric" placeholder="z.B. 8"
                  value={leadsQualified} onChange={e => setLeadsQualified(e.target.value)} />
              </div>
            </div>
            {(parseInt(leadsTotal) || 0) > 0 && (
              <div className="flex flex-wrap gap-4 text-xs bg-muted/40 rounded-lg px-3 py-2 text-muted-foreground">
                <span>MQL-Rate: <strong className="text-foreground">{mqRate}%</strong></span>
              </div>
            )}
          </section>

          {/* Zusammenfassung */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> Wochen-Zusammenfassung (live)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Posts gesamt", value: String(posts.length), suffix: "" },
                { label: "Σ Impressionen", value: totalImpressions.toLocaleString("de-DE"), suffix: "" },
                { label: "Engagement-Rate", value: engagementRate, suffix: engagementRate !== "–" ? "%" : "" },
                { label: "MQL-Rate", value: mqRate, suffix: mqRate !== "–" ? "%" : "" },
              ].map(k => (
                <div key={k.label} className="bg-background rounded-md p-3 text-center">
                  <div className="text-xs text-muted-foreground">{k.label}</div>
                  <div className="text-lg font-bold text-primary">{k.value === "–" ? "–" : `${k.value}${k.suffix}`}</div>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Wird gespeichert..." : existingIds.length > 0 ? "Marketing-KPIs aktualisieren" : "Marketing-KPIs speichern"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Helper: ISO week number
function getISOWeek(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

// Helper: Monday of ISO week
function getDateFromISOWeek(year: number, week: number): string {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  return monday.toISOString().split("T")[0];
}
