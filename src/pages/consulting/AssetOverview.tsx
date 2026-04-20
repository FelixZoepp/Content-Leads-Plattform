import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ASSET_TYPES } from "@/hooks/useCashflowData";
import {
  Map, Target, Linkedin, MessageSquare, Mail, GitBranch,
  FileText, Lightbulb, Phone, PhoneCall, PhoneOff, PenTool,
  Check, Clock, ArrowRight
} from "lucide-react";

const ASSET_ICONS: Record<string, any> = {
  fahrplan: Map,
  positionierung: Target,
  linkedin_profil: Linkedin,
  outreach_dms: MessageSquare,
  cold_mails: Mail,
  mail_sequenz: GitBranch,
  funnel: FileText,
  leadmagnet_1: Lightbulb,
  leadmagnet_2: Lightbulb,
  leadmagnet_3: Lightbulb,
  opening_skript: Phone,
  setting_skript: PhoneCall,
  closing_skript: PhoneOff,
  linkedin_captions: PenTool,
};

const ASSET_CATEGORIES = [
  {
    title: "Strategie",
    keys: ["fahrplan", "positionierung"],
  },
  {
    title: "LinkedIn & Outreach",
    keys: ["linkedin_profil", "outreach_dms", "linkedin_captions"],
  },
  {
    title: "E-Mail & Funnel",
    keys: ["cold_mails", "mail_sequenz", "funnel"],
  },
  {
    title: "Leadmagneten",
    keys: ["leadmagnet_1", "leadmagnet_2", "leadmagnet_3"],
  },
  {
    title: "Sales-Skripte",
    keys: ["opening_skript", "setting_skript", "closing_skript"],
  },
];

export default function AssetOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [generated, setGenerated] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("generated_assets")
        .select("asset_type")
        .eq("user_id", user.id);
      if (data) {
        setGenerated(new Set(data.map((r: any) => r.asset_type)));
      }
      setLoading(false);
    })();
  }, [user]);

  const totalAssets = ASSET_TYPES.length;
  const doneCount = ASSET_TYPES.filter((a) => generated.has(a.key)).length;
  const percent = totalAssets > 0 ? Math.round((doneCount / totalAssets) * 100) : 0;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="glass-panel fade-up">
        <div className="relative z-[2]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">Playbook</span>
              <h1 className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>
                Deine Assets
              </h1>
              <p className="text-[13px] text-[rgba(249,249,249,0.5)] mt-1">
                Alle generierten Materialien auf einen Blick<span className="text-[#C5A059]">.</span>
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl text-white" style={{ fontFamily: "var(--font-serif)" }}>
                {doneCount}<span className="text-lg text-[#E9CB8B]">/{totalAssets}</span>
              </div>
              <div className="text-[10px] text-[rgba(249,249,249,0.4)] tracking-[0.2em] uppercase mt-1">
                Assets generiert
              </div>
              <div className="w-32 h-1.5 bg-[rgba(249,249,249,0.06)] rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${percent}%`,
                    background: "linear-gradient(90deg, #775A19, #C5A059)",
                    boxShadow: "0 0 12px rgba(197,160,89,0.4)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      {ASSET_CATEGORIES.map((cat, ci) => (
        <div key={cat.title} className="fade-up" style={{ animationDelay: `${(ci + 1) * 80}ms` }}>
          <div className="px-1 mb-3">
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B]">{cat.title}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {cat.keys.map((key) => {
              const asset = ASSET_TYPES.find((a) => a.key === key);
              if (!asset) return null;
              const Icon = ASSET_ICONS[key] || FileText;
              const isDone = generated.has(key);

              return (
                <button
                  key={key}
                  onClick={() => navigate(asset.path)}
                  className="glass-panel text-left group cursor-pointer"
                  style={{ padding: "18px" }}
                >
                  <div className="relative z-[2]">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                          background: isDone
                            ? "rgba(127,194,155,0.12)"
                            : "linear-gradient(135deg, rgba(197,160,89,0.15), rgba(119,90,25,0.08))",
                          border: `1px solid ${isDone ? "rgba(127,194,155,0.25)" : "rgba(197,160,89,0.2)"}`,
                        }}
                      >
                        <Icon className="w-5 h-5" style={{ color: isDone ? "#7FC29B" : "#E9CB8B" }} />
                      </div>
                      {isDone ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-[#7FC29B] tracking-[0.15em] uppercase bg-[rgba(127,194,155,0.1)] px-2 py-1 rounded-full">
                          <Check className="w-3 h-3" /> Fertig
                        </span>
                      ) : loading ? (
                        <span className="flex items-center gap-1 text-[10px] text-[rgba(249,249,249,0.3)] tracking-[0.15em] uppercase">
                          <Clock className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-[rgba(249,249,249,0.3)] tracking-[0.15em] uppercase">
                          <Clock className="w-3 h-3" /> Offen
                        </span>
                      )}
                    </div>
                    <h3 className="text-[13px] font-semibold text-white mb-1">{asset.label}</h3>
                    <div className="flex items-center gap-1 text-[11px] text-[#E9CB8B] opacity-0 group-hover:opacity-100 transition-opacity">
                      Öffnen <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
