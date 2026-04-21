import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted mocks so vi.mock factories can reference them
const { mockAddHLTags, mockUpsertHLContact, mockFrom } = vi.hoisted(() => ({
  mockAddHLTags: vi.fn().mockResolvedValue(undefined),
  mockUpsertHLContact: vi.fn().mockResolvedValue("contact-hl-1"),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: mockFrom },
}));

vi.mock("@/lib/highlevel/client", () => ({
  upsertHLContact: mockUpsertHLContact,
  addHLTags: mockAddHLTags,
}));

import { checkAndFireHLTriggers } from "@/lib/trial/hlTriggers";

function setupMockChain(healthData: Record<string, unknown> | null) {
  let callCount = 0;
  mockFrom.mockImplementation(() => {
    callCount++;
    const currentCall = callCount;
    const chain: any = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    chain.single = vi.fn(() => {
      if (currentCall === 1)
        return Promise.resolve({ data: healthData, error: null });
      if (currentCall === 2)
        return Promise.resolve({ data: { user_id: "admin-1" }, error: null });
      if (currentCall === 3)
        return Promise.resolve({
          data: { email: "admin@test.edu", full_name: "Admin" },
          error: null,
        });
      return Promise.resolve({ data: null, error: null });
    });
    return chain;
  });
}

describe("HL Trial Triggers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.HL_API_KEY = "test-key";
    mockUpsertHLContact.mockResolvedValue("contact-hl-1");
    mockAddHLTags.mockResolvedValue(undefined);
  });

  it("fires no-day1-login tag when day 1 passed with no login", async () => {
    setupMockChain({
      tenant_id: "tenant-1",
      tenant_name: "Test School",
      days_since_signup: 2,
      day1_login: false,
      candidate_completed: false,
      first_session_day: null,
      feature_depth_score: 1,
    });

    await checkAndFireHLTriggers("tenant-1");

    expect(mockUpsertHLContact).toHaveBeenCalledWith(
      expect.objectContaining({ email: "admin@test.edu" })
    );
    expect(mockAddHLTags).toHaveBeenCalledWith("contact-hl-1", [
      "lift-trial-no-day1-login",
    ]);
  });

  it("fires at-risk and dormant tags after 7 days with no session", async () => {
    setupMockChain({
      tenant_id: "tenant-1",
      tenant_name: "Test School",
      days_since_signup: 8,
      day1_login: true,
      candidate_completed: false,
      first_session_day: null,
      feature_depth_score: 1,
    });

    await checkAndFireHLTriggers("tenant-1");

    expect(mockAddHLTags).toHaveBeenCalledWith("contact-hl-1", [
      "lift-trial-at-risk",
      "lift-dormant",
    ]);
  });

  it("does not fire at-risk trigger before day 7", async () => {
    setupMockChain({
      tenant_id: "tenant-1",
      tenant_name: "Test School",
      days_since_signup: 5,
      day1_login: true,
      candidate_completed: false,
      first_session_day: null,
      feature_depth_score: 2,
    });

    await checkAndFireHLTriggers("tenant-1");

    const atRiskCalls = mockAddHLTags.mock.calls.filter(
      (call: any[]) =>
        Array.isArray(call[1]) && call[1].includes("lift-trial-at-risk")
    );
    expect(atRiskCalls).toHaveLength(0);
  });

  it("fires first-session-complete tag on first candidate completion", async () => {
    setupMockChain({
      tenant_id: "tenant-1",
      tenant_name: "Test School",
      days_since_signup: 3,
      day1_login: true,
      candidate_completed: true,
      first_session_day: 3,
      feature_depth_score: 2,
    });

    await checkAndFireHLTriggers("tenant-1");

    expect(mockAddHLTags).toHaveBeenCalledWith("contact-hl-1", [
      "lift-first-session-complete",
    ]);
  });

  it("fires engaged tag when feature depth >= 5", async () => {
    setupMockChain({
      tenant_id: "tenant-1",
      tenant_name: "Test School",
      days_since_signup: 10,
      day1_login: true,
      candidate_completed: true,
      first_session_day: 2,
      feature_depth_score: 6,
    });

    await checkAndFireHLTriggers("tenant-1");

    expect(mockAddHLTags).toHaveBeenCalledWith("contact-hl-1", [
      "lift-trial-engaged",
    ]);
  });

  it("fires low-engagement tag at day 14 with low feature depth", async () => {
    setupMockChain({
      tenant_id: "tenant-1",
      tenant_name: "Test School",
      days_since_signup: 15,
      day1_login: true,
      candidate_completed: false,
      first_session_day: null,
      feature_depth_score: 1,
    });

    await checkAndFireHLTriggers("tenant-1");

    expect(mockAddHLTags).toHaveBeenCalledWith("contact-hl-1", [
      "lift-trial-low-engagement",
    ]);
  });
});
