import { FeatureGate } from "@/components/feature-gate/FeatureGate";
export default function ContentManagement() {
  return (
    <FeatureGate feature="content_management" title="Content Management" description="Plane, erstelle und verwalte deinen Content über alle Plattformen hinweg.">
      <div>Content Management</div>
    </FeatureGate>
  );
}
