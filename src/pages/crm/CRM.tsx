import { FeatureGate } from "@/components/feature-gate/FeatureGate";
export default function CRM() {
  return (
    <FeatureGate feature="crm" title="CRM" description="Verwalte alle deine Kontakte, Deals und Pipeline in einem zentralen CRM-System.">
      <div>CRM</div>
    </FeatureGate>
  );
}
