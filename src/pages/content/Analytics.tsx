import { FeatureGate } from "@/components/feature-gate/FeatureGate";
export default function ContentAnalytics() {
  return (
    <FeatureGate feature="content_analytics" title="Content Analytics" description="Analysiere die Performance deines Contents und optimiere deine Strategie.">
      <div>Analytics</div>
    </FeatureGate>
  );
}
