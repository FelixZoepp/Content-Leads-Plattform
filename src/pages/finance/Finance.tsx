import { FeatureGate } from "@/components/feature-gate/FeatureGate";
export default function Finance() {
  return (
    <FeatureGate feature="finance" title="Finance" description="Tracke Umsätze, Ausgaben und Cashflow. Behalte deine Finanzen im Blick.">
      <div>Finance</div>
    </FeatureGate>
  );
}
