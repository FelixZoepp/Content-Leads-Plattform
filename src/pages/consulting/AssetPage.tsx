import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  Loader2, RefreshCw, Copy, Check, ArrowLeft, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ASSET_TYPES, type AssetTypeKey } from "@/hooks/useCashflowData";

// Map URL slugs to asset type keys
const slugToKey: Record<string, AssetTypeKey> = {
  fahrplan: "fahrplan",
  positionierung: "positionierung",
  "linkedin-profil": "linkedin_profil",
  "outreach-dms": "outreach_dms",
  "cold-mails": "cold_mails",
  "mail-sequenz": "mail_sequenz",
  funnel: "funnel",
  "leadmagnet-1": "leadmagnet_1",
  "leadmagnet-2": "leadmagnet_2",
  "leadmagnet-3": "leadmagnet_3",
  "opening-skript": "opening_skript",
  "setting-skript": "setting_skript",
  "closing-skript": "closing_skript",
  "linkedin-captions": "linkedin_captions",
};

export default function AssetPage() {
  const { assetType: slug } = useParams<{ assetType: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, tenantId } = useAuth();

  const assetKey = slug ? slugToKey[slug] : undefined;
  const assetMeta = ASSET_TYPES.find((a) => a.key === assetKey);

  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedBlock, setCopiedBlock] = useState<number | null>(null);

  const loadAsset = useCallback(async () => {
    if (!user || !assetKey) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("generated_assets")
      .select("content")
      .eq("user_id", user.id)
      .eq("asset_type", assetKey)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setContent(data?.content || null);
    setLoading(false);
  }, [user, assetKey]);

  useEffect(() => {
    loadAsset();
  }, [loadAsset]);

  const generate = async () => {
    if (!user || !assetKey) return;
    setGenerating(true);
    try {
      // Fetch user profile for context
      let userProfile: any = {};
      if (tenantId) {
        const { data } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", tenantId)
          .single();
        userProfile = data || {};
      }

      const { data, error } = await supabase.functions.invoke("generate-asset", {
        body: { assetType: assetKey, userProfile },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const generatedContent = data.content;

      // Upsert into generated_assets
      const { data: existing } = await (supabase as any)
        .from("generated_assets")
        .select("id")
        .eq("user_id", user.id)
        .eq("asset_type", assetKey)
        .maybeSingle();

      if (existing) {
        await (supabase as any)
          .from("generated_assets")
          .update({ content: generatedContent, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await (supabase as any).from("generated_assets").insert({
          user_id: user.id,
          asset_type: assetKey,
          content: generatedContent,
        });
      }

      setContent(generatedContent);
      toast({ title: "Asset generiert", description: `${assetMeta?.label} wurde erfolgreich erstellt.` });
    } catch (err: any) {
      toast({
        title: "Fehler bei der Generierung",
        description: err.message || "Bitte versuche es erneut.",
        variant: "destructive",
      });
    }
    setGenerating(false);
  };

  const copyBlock = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedBlock(idx);
    setTimeout(() => setCopiedBlock(null), 2000);
  };

  if (!assetKey || !assetMeta) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Asset-Typ nicht gefunden.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard")}>
          Zurück zum Dashboard
        </Button>
      </div>
    );
  }

  // Split content into sections by headings for copy-per-block
  const contentBlocks = content
    ? content.split(/(?=^#{1,3}\s)/m).filter((b) => b.trim())
    : [];

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{assetMeta.label}</h1>
            <p className="text-xs text-muted-foreground">
              {content ? "Zuletzt generiert" : "Noch nicht generiert"}
            </p>
          </div>
        </div>
        {content && (
          <Button
            variant="outline"
            size="sm"
            onClick={generate}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            Neu generieren
          </Button>
        )}
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Lade Asset...</p>
        </div>
      ) : !content ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 gap-4"
        >
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">
              {assetMeta.label} generieren
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Klicke auf den Button um dein personalisiertes Asset mit KI zu erstellen.
              Dies kann 15-30 Sekunden dauern.
            </p>
          </div>
          <Button onClick={generate} disabled={generating} size="lg">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Wird generiert...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Jetzt generieren
              </>
            )}
          </Button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {contentBlocks.map((block, idx) => (
            <div
              key={idx}
              className="relative rounded-xl border border-border/50 bg-card p-5 group"
            >
              <button
                onClick={() => copyBlock(block.trim(), idx)}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-secondary/50 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-secondary"
                title="Kopieren"
              >
                {copiedBlock === idx ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{block}</ReactMarkdown>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Generating overlay */}
      {generating && content && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-foreground font-medium">Asset wird neu generiert...</p>
            <p className="text-xs text-muted-foreground">Dies kann 15-30 Sekunden dauern.</p>
          </div>
        </div>
      )}
    </div>
  );
}
