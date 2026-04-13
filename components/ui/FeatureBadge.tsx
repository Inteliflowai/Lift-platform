"use client";

import { useState, useEffect } from "react";

/**
 * Shows a "New" badge next to a feature. Dismisses on first click.
 * Uses localStorage to track seen features.
 */
export function FeatureBadge({
  featureId,
  children,
  className = "",
}: {
  featureId: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(`feature_seen_${featureId}`);
    if (!seen) setIsNew(true);
  }, [featureId]);

  function dismiss() {
    localStorage.setItem(`feature_seen_${featureId}`, "true");
    setIsNew(false);
  }

  return (
    <span className={`relative inline-flex items-center ${className}`} onClick={dismiss}>
      {children}
      {isNew && (
        <span className="ml-1.5 inline-flex h-4 items-center rounded-full bg-primary px-1.5 text-[9px] font-bold uppercase tracking-wider text-white animate-pulse">
          New
        </span>
      )}
    </span>
  );
}

/**
 * Shows a pulsing dot indicator for new features. Less intrusive than the badge.
 */
export function NewDot({ featureId }: { featureId: string }) {
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(`feature_seen_${featureId}`);
    if (!seen) setIsNew(true);
  }, [featureId]);

  if (!isNew) return null;

  return (
    <span className="ml-auto h-2 w-2 rounded-full bg-primary animate-pulse" />
  );
}
