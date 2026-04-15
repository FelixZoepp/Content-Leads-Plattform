import { FeatureGate } from "@/components/feature-gate/FeatureGate";
export default function EmailOutreach() {
  return (
    <FeatureGate feature="outreach_email" title="E-Mail Outreach" description="Erstelle personalisierte E-Mail-Sequenzen, A/B-Tests und automatisiere dein Follow-Up per Mail.">
      <div>Email</div>
    </FeatureGate>
  );
}
