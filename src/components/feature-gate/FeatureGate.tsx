import { ReactNode } from "react";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { LockedScreen } from "./LockedScreen";

interface FeatureGateProps {
  feature: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function FeatureGate({ feature, title, description, children }: FeatureGateProps) {
  const { hasAccess, loading } = useFeatureAccess(feature);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#2E86AB] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return <LockedScreen title={title} description={description} />;
  }

  return <>{children}</>;
}
