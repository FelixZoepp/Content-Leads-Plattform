import { FeatureGate } from "@/components/feature-gate/FeatureGate";
export default function PostGenerator() {
  return (
    <FeatureGate feature="content_generator" title="Post Generator" description="Generiere LinkedIn-Posts, Carousels und Stories mit KI-Unterstützung.">
      <div>Post Generator</div>
    </FeatureGate>
  );
}
