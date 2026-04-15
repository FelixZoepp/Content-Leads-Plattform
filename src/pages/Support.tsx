import { HelpCircle, Mail, MessageCircle, ExternalLink } from "lucide-react";
export default function Support() {
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Support</h1>
      <div className="grid grid-cols-2 gap-4">
        <a href="mailto:felix@content-leads.de" className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 hover:border-[#0A66C2]/30 transition block">
          <Mail className="w-8 h-8 text-[#0A66C2] mb-3" />
          <h3 className="text-sm font-medium text-white mb-1">E-Mail Support</h3>
          <p className="text-xs text-[#94A3B8]">felix@content-leads.de</p>
        </a>
        <a href="https://calendly.com/content-leads" target="_blank" rel="noopener noreferrer" className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 hover:border-[#0A66C2]/30 transition block">
          <MessageCircle className="w-8 h-8 text-[#0A66C2] mb-3" />
          <h3 className="text-sm font-medium text-white mb-1">Call buchen</h3>
          <p className="text-xs text-[#94A3B8]">15-Min Gespräch vereinbaren</p>
        </a>
      </div>
    </div>
  );
}
