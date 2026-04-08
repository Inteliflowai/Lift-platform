import { supabaseAdmin } from "@/lib/supabase/admin";
import { getLicense, isLicenseActive } from "./resolver";
import { TIER_FEATURES, TIER_LIMITS, type Feature } from "./features";

export class LicenseError extends Error {
  constructor(
    public feature: string,
    public requiredTier: string
  ) {
    super(`Feature '${feature}' requires ${requiredTier} tier or higher`);
    this.name = "LicenseError";
  }
}

export class LicenseExpiredError extends Error {
  constructor() {
    super("License has expired or is suspended");
    this.name = "LicenseExpiredError";
  }
}

export async function checkFeature(
  tenantId: string,
  feature: string
): Promise<boolean> {
  const license = await getLicense(tenantId);
  if (!isLicenseActive(license)) return false;
  if (license.feature_blocks.includes(feature)) return false;

  const tierFeatures = TIER_FEATURES[license.tier] ?? [];
  return (
    tierFeatures.includes(feature as Feature) ||
    license.feature_overrides.includes(feature)
  );
}

export async function requireFeature(
  tenantId: string,
  feature: string
): Promise<void> {
  const license = await getLicense(tenantId);
  if (!isLicenseActive(license)) throw new LicenseExpiredError();

  const allowed = await checkFeature(tenantId, feature);
  if (!allowed) {
    const requiredTier =
      Object.entries(TIER_FEATURES).find(([, features]) =>
        features.includes(feature as Feature)
      )?.[0] ?? "enterprise";
    throw new LicenseError(feature, requiredTier);
  }
}

export async function checkSessionLimit(
  tenantId: string
): Promise<{ allowed: boolean; used: number; limit: number | null }> {
  const license = await getLicense(tenantId);
  const tierLimits = TIER_LIMITS[license.tier as keyof typeof TIER_LIMITS];
  const tierLimit = tierLimits?.sessions_per_year ?? null;
  const limit = license.session_limit_override ?? tierLimit;

  if (limit === null) return { allowed: true, used: 0, limit: null };

  const year = new Date().getFullYear();
  const { data } = await supabaseAdmin
    .from("license_usage")
    .select("sessions_completed")
    .eq("tenant_id", tenantId)
    .eq("period_year", year);

  const used = (data ?? []).reduce(
    (sum, row) => sum + (row.sessions_completed ?? 0),
    0
  );
  return { allowed: used < limit, used, limit };
}

export async function incrementSessionUsage(
  tenantId: string
): Promise<void> {
  const now = new Date();
  await supabaseAdmin.rpc("increment_session_usage", {
    p_tenant_id: tenantId,
    p_year: now.getFullYear(),
    p_month: now.getMonth() + 1,
  });
}
