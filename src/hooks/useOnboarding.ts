import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OnboardingStatus {
  isComplete: boolean;
  currentStep: number;
  steps: {
    heygen: boolean;
    telephony: boolean;
    domain: boolean;
    pitchVideo: boolean;
    leads: boolean;
    script: boolean;
    landingPage: boolean;
    leadPageTemplate: boolean;
  };
}

export const useOnboarding = () => {
  const [status, setStatus] = useState<OnboardingStatus>({
    isComplete: false,
    currentStep: 0,
    steps: {
      heygen: false,
      telephony: false,
      domain: false,
      pitchVideo: false,
      leads: false,
      script: false,
      landingPage: false,
      leadPageTemplate: false,
    },
  });
  const [loading, setLoading] = useState(true);

  const checkOnboardingStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile with onboarding status
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id, onboarding_completed, onboarding_step')
        .eq('id', user.id)
        .single();

      if (!profile?.account_id) return;

      // Check HeyGen integration and telephony settings
      const { data: integration } = await supabase
        .from('account_integrations')
        .select('heygen_api_key_id, heygen_avatar_id, telephony_onboarding_completed, telephony_provider, twilio_account_sid, sip_enabled, sip_server, sip_username')
        .eq('account_id', profile.account_id)
        .maybeSingle();

      const heygenComplete = !!(integration?.heygen_api_key_id && integration?.heygen_avatar_id);

      // Check telephony - support both Twilio (new) and SIP (legacy)
      const twilioComplete = !!(integration?.telephony_provider === 'twilio' && integration?.twilio_account_sid);
      const sipComplete = !!(integration?.sip_enabled && integration?.sip_server && integration?.sip_username);
      const telephonyComplete = !!(integration?.telephony_onboarding_completed) || twilioComplete || sipComplete;

      // Check custom domain
      const { data: account } = await supabase
        .from('accounts')
        .select('custom_domain')
        .eq('id', profile.account_id)
        .single();

      const domainComplete = !!(account?.custom_domain);

      // Check if there's a campaign with pitch video
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, pitch_video_url')
        .eq('account_id', profile.account_id)
        .not('pitch_video_url', 'is', null)
        .limit(1);

      const pitchVideoComplete = campaigns && campaigns.length > 0;

      // Check if there are any contacts
      const { count: contactCount } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', profile.account_id);

      const leadsComplete = (contactCount || 0) > 0;

      // Check if there's a call script
      const { data: scripts } = await supabase
        .from('call_scripts')
        .select('id')
        .eq('account_id', profile.account_id)
        .eq('is_active', true)
        .limit(1);

      const scriptComplete = scripts && scripts.length > 0;

      // Check if there's a published landing page
      const { data: landingPages } = await supabase
        .from('landing_pages')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'published')
        .limit(1);

      const landingPageComplete = landingPages && landingPages.length > 0;

      // Check if there's an active lead page template
      const { data: leadPageTemplates } = await supabase
        .from('lead_page_templates')
        .select('id')
        .eq('account_id', profile.account_id)
        .eq('is_active', true)
        .limit(1);

      const leadPageTemplateComplete = leadPageTemplates && leadPageTemplates.length > 0;

      // Calculate current step (now 8 steps total)
      let currentStep = 0;
      if (heygenComplete) currentStep = 1;
      if (telephonyComplete) currentStep = 2;
      if (domainComplete) currentStep = 3;
      if (pitchVideoComplete) currentStep = 4;
      if (leadsComplete) currentStep = 5;
      if (scriptComplete) currentStep = 6;
      if (landingPageComplete) currentStep = 7;
      if (leadPageTemplateComplete) currentStep = 8;

      const isComplete = heygenComplete && telephonyComplete && domainComplete && pitchVideoComplete && leadsComplete && scriptComplete && landingPageComplete && leadPageTemplateComplete;

      setStatus({
        isComplete,
        currentStep,
        steps: {
          heygen: heygenComplete,
          telephony: telephonyComplete,
          domain: domainComplete,
          pitchVideo: pitchVideoComplete,
          leads: leadsComplete,
          script: scriptComplete,
          landingPage: landingPageComplete,
          leadPageTemplate: leadPageTemplateComplete,
        },
      });

      // Update profile if onboarding is complete
      if (isComplete && !profile.onboarding_completed) {
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true, onboarding_step: 8 })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  return { status, loading, refresh: checkOnboardingStatus };
};
