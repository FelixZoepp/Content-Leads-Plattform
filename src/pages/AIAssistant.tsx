import { ContentLeadsChat } from "@/components/client/ContentLeadsChat";
import { Bot } from "lucide-react";

export default function AIAssistant() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0A66C2]/10 flex items-center justify-center">
          <Bot className="w-5 h-5 text-[#0A66C2]" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-white">Content-Leads AI</h1>
          <p className="text-xs text-[#94A3B8]">Dein KI-Assistent für LinkedIn, Outreach & Sales</p>
        </div>
      </div>
      <ContentLeadsChat />
    </div>
  );
}
