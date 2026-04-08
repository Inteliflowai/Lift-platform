import { supabaseAdmin } from "@/lib/supabase/admin";

const licenseCache = new Map<
  string,
  { data: LicenseData; expiresAt: number }
>();

export interface LicenseData {
  tier: string;
  status: string;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  feature_overrides: string[];
  feature_blocks: string[];
  session_limit_override: number | null;
  seat_limit_override: number | null;
}

export async function getLicense(tenantId: string): Promise<LicenseData> {
  const cached = licenseCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const { data, error } = await supabaseAdmin
    .from("tenant_licenses")
    .select(
      "tier, status, trial_ends_at, current_period_ends_at, feature_overrides, feature_blocks, session_limit_override, seat_limit_override"
    )
    .eq("tenant_id", tenantId)
    .single();

  if (error || !data)
    throw new Error(`License not found for tenant ${tenantId}`);

  const license: LicenseData = {
    tier: data.tier,
    status: data.status,
    trial_ends_at: data.trial_ends_at,
    current_period_ends_at: data.current_period_ends_at,
    feature_overrides: data.feature_overrides ?? [],
    feature_blocks: data.feature_blocks ?? [],
    session_limit_override: data.session_limit_override,
    seat_limit_override: data.seat_limit_override,
  };

  licenseCache.set(tenantId, {
    data: license,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
  return license;
}

export function invalidateLicenseCache(tenantId: string) {
  licenseCache.delete(tenantId);
}

export function isLicenseActive(license: LicenseData): boolean {
  if (license.status === "suspended" || license.status === "cancelled")
    return false;
  if (license.status === "trialing") {
    if (!license.trial_ends_at) return false;
    return new Date(license.trial_ends_at) > new Date();
  }
  if (license.status === "past_due") return true; // grace period
  return license.status === "active";
}

export function getTrialDaysRemaining(license: LicenseData): number | null {
  if (license.status !== "trialing" || !license.trial_ends_at) return null;
  const diff = new Date(license.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
