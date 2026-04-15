import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccountFilter } from "@/hooks/useAccountFilter";
import { Loader2 } from "lucide-react";
import SmtpSettings from "@/components/outreach/SmtpSettings";
import DomainSettings from "@/components/outreach/DomainSettings";
import SipProviderSettings from "@/components/outreach/SipProviderSettings";
import AvvAgreement from "@/components/outreach/AvvAgreement";

const Integrations = () => {
  const { accountId, loading: accountLoading } = useAccountFilter();

  if (accountLoading) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Integrationen</h1>
          <p className="text-muted-foreground">
            Verbinde deine externen Dienste
          </p>
        </div>

        {/* AVV Agreement */}
        <AvvAgreement showAcceptCheckbox={false} />

        {/* Custom Domain */}
        <DomainSettings />

        {/* SMTP Email Integration */}
        <SmtpSettings />

        {/* SIP Provider (BYOC) */}
        <SipProviderSettings />
      </div>
    </>
  );
};

export default Integrations;
