"use client";

import { createContext, useContext } from "react";
import { TIER_FEATURES, type Feature } from "./features";
import type { ExpectedTier } from "./expectedTier";

export interface LicenseContextValue {
  tier: string;
  status: string;
  trialDaysRemaining: number | null;
  isActive: boolean;
  hasFeature: (feature: string) => boolean;
  sessionsUsed: number;
  sessionsLimit: number | null;
  expectedTier: ExpectedTier;
}

export const LicenseContext = createContext<LicenseContextValue | null>(null);

export function useLicense(): LicenseContextValue {
  const ctx = useContext(LicenseContext);
  if (!ctx) throw new Error("useLicense must be used within LicenseProvider");
  return ctx;
}

export function useFeature(feature: string): boolean {
  const { hasFeature } = useLicense();
  return hasFeature(feature);
}

export function LicenseProvider({
  license,
  children,
}: {
  license: {
    tier: string;
    status: string;
    trialDaysRemaining: number | null;
    isActive: boolean;
    featureOverrides: string[];
    featureBlocks: string[];
    sessionsUsed: number;
    sessionsLimit: number | null;
    expectedTier: ExpectedTier;
  };
  children: React.ReactNode;
}) {
  const tierFeatures = TIER_FEATURES[license.tier] ?? [];

  function hasFeature(feature: string): boolean {
    if (!license.isActive) return false;
    if (license.featureBlocks.includes(feature)) return false;
    return (
      tierFeatures.includes(feature as Feature) ||
      license.featureOverrides.includes(feature)
    );
  }

  return (
    <LicenseContext.Provider
      value={{
        tier: license.tier,
        status: license.status,
        trialDaysRemaining: license.trialDaysRemaining,
        isActive: license.isActive,
        hasFeature,
        sessionsUsed: license.sessionsUsed,
        sessionsLimit: license.sessionsLimit,
        expectedTier: license.expectedTier,
      }}
    >
      {children}
    </LicenseContext.Provider>
  );
}
