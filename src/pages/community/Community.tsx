import { MessageCircle, ExternalLink } from "lucide-react";
export default function Community() {
  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold">Community</h1>
      <div className="bg-[#12121A] border border-[#2A2A35] rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[#4A9FD9]/10 flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="w-8 h-8 text-[#4A9FD9]" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Vernetze dich mit anderen Sprintern</h2>
        <p className="text-sm text-[#8888AA] mb-6 max-w-md mx-auto">Tausche dich mit anderen Content Leads Kunden aus, teile Erfolge und lerne von den Besten.</p>
        <a href="https://community.content-leads.de" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#4A9FD9] hover:bg-[#2E7BB5] text-white font-medium px-6 py-3 rounded-lg transition">
          Community beitreten <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
