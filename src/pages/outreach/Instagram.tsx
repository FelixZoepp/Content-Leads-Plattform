import { FeatureGate } from "@/components/feature-gate/FeatureGate";
export default function Instagram() {
  return (
    <FeatureGate feature="outreach_instagram" title="Instagram Outreach" description="Verwalte deine Instagram DMs, automatisiere Follow-Ups und tracke Konversionen direkt in der Plattform.">
      <div>Instagram</div>
    </FeatureGate>
  );
}
