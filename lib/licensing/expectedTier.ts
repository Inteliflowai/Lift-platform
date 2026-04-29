export type ExpectedTier = "professional" | "enterprise";

const ENTERPRISE_SCHOOL_TYPES = new Set(["Boarding", "Therapeutic"]);
const ENTERPRISE_APPLICANT_RANGE = "400+";

/**
 * Infer the expected conversion tier from signup signals. Used at registration
 * time to populate `tenants.expected_tier` and drives tier-aware trial UX.
 *
 * Boarding + Therapeutic schools and 400+-applicant schools are routed to
 * Enterprise (sales-only, no Stripe self-serve). Everyone else gets the
 * Professional self-serve path.
 */
export function inferExpectedTier(input: {
  schoolType?: string | null;
  estimatedApplicants?: string | null;
}): ExpectedTier {
  if (input.schoolType && ENTERPRISE_SCHOOL_TYPES.has(input.schoolType)) {
    return "enterprise";
  }
  if (input.estimatedApplicants === ENTERPRISE_APPLICANT_RANGE) {
    return "enterprise";
  }
  return "professional";
}
