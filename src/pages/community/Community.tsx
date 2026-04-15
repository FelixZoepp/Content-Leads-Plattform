import { MessageCircle, ExternalLink } from "lucide-react";
export default function Community() {
  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold">Community</h1>
      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[#2E86AB]/10 flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="w-8 h-8 text-[#2E86AB]" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Vernetze dich mit anderen Sprintern</h2>
        <p className="text-sm text-[#94A3B8] mb-6 max-w-md mx-auto">Tausche dich mit anderen Content Leads Kunden aus, teile Erfolge und lerne von den Besten.</p>
        <a href="https://community.content-leads.de" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#2E86AB] hover:bg-[#246E8F] text-white font-medium px-6 py-3 rounded-lg transition">
          Community beitreten <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
