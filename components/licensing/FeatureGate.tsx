"use client";

import { useFeature } from "@/lib/licensing/context";
import { Lock } from "lucide-react";
import { TIER_FEATURES } from "@/lib/licensing/features";

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  silent?: boolean;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  silent = false,
}: FeatureGateProps) {
  const hasFeature = useFeature(feature);
  if (hasFeature) return <>{children}</>;
  if (silent) return null;
  return fallback ? <>{fallback}</> : <UpgradePrompt feature={feature} />;
}

function UpgradePrompt({ feature }: { feature: string }) {
  const requiredTier =
    Object.entries(TIER_FEATURES).find(([, features]) =>
      features.includes(feature as never)
    )?.[0] ?? "enterprise";

  const tierLabel =
    requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1);

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Lock size={16} className="text-primary" />
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold text-lift-text">
            {tierLabel} Feature
          </h3>
          <p className="mt-1 text-xs text-muted">
            This feature is available on the {tierLabel} plan and above.
          </p>
          <a
            href="/school/settings/subscription"
            className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
          >
            Learn about upgrading
          </a>
        </div>
      </div>
    </div>
  );
}
