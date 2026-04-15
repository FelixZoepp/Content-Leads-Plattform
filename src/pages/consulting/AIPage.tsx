import { useDashboardData } from "@/hooks/useDashboardData";
import { AIBriefing } from "@/components/client/AIBriefing";
import { BenchmarkSettings } from "@/components/client/BenchmarkSettings";
import { ContentLeadsChat } from "@/components/client/ContentLeadsChat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Settings2, Bot } from "lucide-react";

export default function AIPage() {
  const { tenantId } = useDashboardData();

  return (
    <div className="space-y-6 max-w-6xl">
      <h2 className="text-xl font-black tracking-tight text-white">KI-Briefing & Assistent</h2>

      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="rounded-xl">
          <TabsTrigger value="chat" className="rounded-xl gap-2">
            <Bot className="h-4 w-4" />
            Content-Leads AI
          </TabsTrigger>
          <TabsTrigger value="analysis" className="rounded-xl gap-2">
            <Sparkles className="h-4 w-4" />
            KI-Analyse
          </TabsTrigger>
          <TabsTrigger value="benchmarks" className="rounded-xl gap-2">
            <Settings2 className="h-4 w-4" />
            Benchmarks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <ContentLeadsChat />
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          <AIBriefing tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="benchmarks" className="mt-4">
          <BenchmarkSettings tenantId={tenantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
