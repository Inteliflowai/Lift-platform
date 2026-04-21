import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabaseAdmin
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn<(table: string) => unknown>(() => ({ select: mockSelect }));
const mockRpc = vi.fn<(name: string, args?: unknown) => Promise<unknown>>().mockResolvedValue({
  data: null,
  error: null,
});

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (table: string) => mockFrom(table),
    rpc: (name: string, args?: unknown) => mockRpc(name, args),
  },
}));

// We need to reset module cache to clear license cache between tests
beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  mockFrom.mockReturnValue({ select: mockSelect });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ eq: mockEq, single: mockSingle, limit: vi.fn().mockReturnValue({ single: mockSingle }) });
});

function setupLicenseMock(license: Record<string, unknown>) {
  mockSingle.mockResolvedValue({ data: license, error: null });
}

function setupUsageMock(rows: { sessions_completed: number }[]) {
  // First call returns license, second returns usage
  let callCount = 0;
  mockSingle.mockImplementation(() => {
    callCount++;
    if (callCount === 1) return Promise.resolve({ data: null, error: null });
    return Promise.resolve({ data: rows[0] ?? null, error: null });
  });
}

describe("License Resolver", () => {
  it("isLicenseActive returns true for active license", async () => {
    const { isLicenseActive } = await import("@/lib/licensing/resolver");
    expect(
      isLicenseActive({
        tier: "professional",
        status: "active",
        trial_ends_at: null,
        current_period_ends_at: null,
        feature_overrides: [],
        feature_blocks: [],
        session_limit_override: null,
        seat_limit_override: null,
      })
    ).toBe(true);
  });

  it("isLicenseActive returns false for suspended license", async () => {
    const { isLicenseActive } = await import("@/lib/licensing/resolver");
    expect(
      isLicenseActive({
        tier: "professional",
        status: "suspended",
        trial_ends_at: null,
        current_period_ends_at: null,
        feature_overrides: [],
        feature_blocks: [],
        session_limit_override: null,
        seat_limit_override: null,
      })
    ).toBe(false);
  });

  it("isLicenseActive returns false for cancelled license", async () => {
    const { isLicenseActive } = await import("@/lib/licensing/resolver");
    expect(
      isLicenseActive({
        tier: "professional",
        status: "cancelled",
        trial_ends_at: null,
        current_period_ends_at: null,
        feature_overrides: [],
        feature_blocks: [],
        session_limit_override: null,
        seat_limit_override: null,
      })
    ).toBe(false);
  });

  it("isLicenseActive returns true for trialing with future expiry", async () => {
    const { isLicenseActive } = await import("@/lib/licensing/resolver");
    const future = new Date(Date.now() + 86400000 * 15).toISOString();
    expect(
      isLicenseActive({
        tier: "trial",
        status: "trialing",
        trial_ends_at: future,
        current_period_ends_at: null,
        feature_overrides: [],
        feature_blocks: [],
        session_limit_override: null,
        seat_limit_override: null,
      })
    ).toBe(true);
  });

  it("isLicenseActive returns false for trialing with past expiry", async () => {
    const { isLicenseActive } = await import("@/lib/licensing/resolver");
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(
      isLicenseActive({
        tier: "trial",
        status: "trialing",
        trial_ends_at: past,
        current_period_ends_at: null,
        feature_overrides: [],
        feature_blocks: [],
        session_limit_override: null,
        seat_limit_override: null,
      })
    ).toBe(false);
  });

  it("isLicenseActive returns true for past_due (grace period)", async () => {
    const { isLicenseActive } = await import("@/lib/licensing/resolver");
    expect(
      isLicenseActive({
        tier: "professional",
        status: "past_due",
        trial_ends_at: null,
        current_period_ends_at: null,
        feature_overrides: [],
        feature_blocks: [],
        session_limit_override: null,
        seat_limit_override: null,
      })
    ).toBe(true);
  });

  it("isLicenseActive returns false for trialing with no trial_ends_at", async () => {
    const { isLicenseActive } = await import("@/lib/licensing/resolver");
    expect(
      isLicenseActive({
        tier: "trial",
        status: "trialing",
        trial_ends_at: null,
        current_period_ends_at: null,
        feature_overrides: [],
        feature_blocks: [],
        session_limit_override: null,
        seat_limit_override: null,
      })
    ).toBe(false);
  });

  it("getTrialDaysRemaining returns days for active trial", async () => {
    const { getTrialDaysRemaining } = await import("@/lib/licensing/resolver");
    const tenDaysOut = new Date(Date.now() + 86400000 * 10).toISOString();
    const remaining = getTrialDaysRemaining({
      tier: "trial",
      status: "trialing",
      trial_ends_at: tenDaysOut,
      current_period_ends_at: null,
      feature_overrides: [],
      feature_blocks: [],
      session_limit_override: null,
      seat_limit_override: null,
    });
    expect(remaining).toBeGreaterThanOrEqual(9);
    expect(remaining).toBeLessThanOrEqual(11);
  });

  it("getTrialDaysRemaining returns null for non-trial", async () => {
    const { getTrialDaysRemaining } = await import("@/lib/licensing/resolver");
    const result = getTrialDaysRemaining({
      tier: "professional",
      status: "active",
      trial_ends_at: null,
      current_period_ends_at: null,
      feature_overrides: [],
      feature_blocks: [],
      session_limit_override: null,
      seat_limit_override: null,
    });
    expect(result).toBeNull();
  });

  it("getTrialDaysRemaining returns 0 for expired trial", async () => {
    const { getTrialDaysRemaining } = await import("@/lib/licensing/resolver");
    const past = new Date(Date.now() - 86400000 * 5).toISOString();
    const result = getTrialDaysRemaining({
      tier: "trial",
      status: "trialing",
      trial_ends_at: past,
      current_period_ends_at: null,
      feature_overrides: [],
      feature_blocks: [],
      session_limit_override: null,
      seat_limit_override: null,
    });
    expect(result).toBe(0);
  });
});
