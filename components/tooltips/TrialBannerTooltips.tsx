"use client";

import { Tooltip } from "@/components/ui/Tooltip";
import { TOOLTIPS } from "@/lib/tooltips/content";
import { useLicense } from "@/lib/licensing/context";
import { useTooltips } from "@/lib/tooltips/useTooltips";

export function TrialBannerTooltips() {
  const { tier, status } = useLicense();
  const { dismissedIds, dismiss } = useTooltips();

  const isTrial = tier === "trial" || status === "trialing";
  if (!isTrial) return null;

  return (
    <div className="space-y-0">
      <Tooltip
        content={TOOLTIPS.trial_invite_first_candidate}
        mode="banner"
        dismissedIds={dismissedIds}
        onDismiss={dismiss}
      />
      <Tooltip
        content={TOOLTIPS.trial_explore_evaluator}
        mode="banner"
        dismissedIds={dismissedIds}
        onDismiss={dismiss}
      />
      <Tooltip
        content={TOOLTIPS.trial_family_report}
        mode="banner"
        dismissedIds={dismissedIds}
        onDismiss={dismiss}
      />
    </div>
  );
}
