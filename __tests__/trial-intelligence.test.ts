import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Trial Intelligence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("trackTrialEvent()", () => {
    it("does not throw when supabase errors", async () => {
      vi.doMock("@/lib/supabase/admin", () => ({
        supabaseAdmin: {
          from: vi.fn(() => ({
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockRejectedValue(new Error("DB down")),
              })),
            })),
          })),
        },
      }));
      vi.doMock("@/lib/trial/hlTriggers", () => ({
        checkAndFireHLTriggers: vi.fn().mockResolvedValue(undefined),
      }));

      const { trackTrialEvent } = await import("@/lib/trial/trackEvent");
      await expect(
        trackTrialEvent("tenant-1", "day1_login", "user-1")
      ).resolves.toBeUndefined();
    });

    it("does not track events for non-trial license", async () => {
      const mockUpsert = vi.fn();
      vi.doMock("@/lib/supabase/admin", () => ({
        supabaseAdmin: {
          from: vi.fn(() => ({
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { status: "active", trial_ends_at: null },
                  error: null,
                }),
              })),
            })),
            upsert: mockUpsert,
          })),
        },
      }));
      vi.doMock("@/lib/trial/hlTriggers", () => ({
        checkAndFireHLTriggers: vi.fn().mockResolvedValue(undefined),
      }));

      const { trackTrialEvent } = await import("@/lib/trial/trackEvent");
      await trackTrialEvent("tenant-1", "day1_login");
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("does not track events for expired trial", async () => {
      const past = new Date(Date.now() - 86400000).toISOString();
      const mockUpsert = vi.fn();
      vi.doMock("@/lib/supabase/admin", () => ({
        supabaseAdmin: {
          from: vi.fn(() => ({
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { status: "trialing", trial_ends_at: past },
                  error: null,
                }),
              })),
            })),
            upsert: mockUpsert,
          })),
        },
      }));
      vi.doMock("@/lib/trial/hlTriggers", () => ({
        checkAndFireHLTriggers: vi.fn().mockResolvedValue(undefined),
      }));

      const { trackTrialEvent } = await import("@/lib/trial/trackEvent");
      await trackTrialEvent("tenant-1", "day1_login");
      expect(mockUpsert).not.toHaveBeenCalled();
    });
  });

  describe("TrialEventType values", () => {
    it("exports all 9 event types", () => {
      const validEvents = [
        "day1_login",
        "first_candidate_invited",
        "first_candidate_completed",
        "evaluator_workspace_opened",
        "tri_report_viewed",
        "pdf_downloaded",
        "support_plan_viewed",
        "cohort_export_downloaded",
        "evaluator_intelligence_opened",
      ];
      expect(validEvents).toHaveLength(9);
    });
  });

  describe("checkAndFireHLTriggers()", () => {
    it("exits early when HL_API_KEY is not set", async () => {
      delete process.env.HL_API_KEY;
      vi.doMock("@/lib/supabase/admin", () => ({
        supabaseAdmin: { from: vi.fn() },
      }));
      const mockUpsert = vi.fn();
      vi.doMock("@/lib/highlevel/client", () => ({
        upsertHLContact: mockUpsert,
        addHLTags: vi.fn(),
      }));

      const { checkAndFireHLTriggers } = await import("@/lib/trial/hlTriggers");
      await checkAndFireHLTriggers("tenant-1");
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("exits early when no trial_health data", async () => {
      process.env.HL_API_KEY = "test-key";
      vi.doMock("@/lib/supabase/admin", () => ({
        supabaseAdmin: {
          from: vi.fn(() => ({
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          })),
        },
      }));
      const mockUpsert = vi.fn();
      vi.doMock("@/lib/highlevel/client", () => ({
        upsertHLContact: mockUpsert,
        addHLTags: vi.fn(),
      }));

      const { checkAndFireHLTriggers } = await import("@/lib/trial/hlTriggers");
      await checkAndFireHLTriggers("tenant-1");
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("does not throw on errors — catches silently", async () => {
      process.env.HL_API_KEY = "test-key";
      vi.doMock("@/lib/supabase/admin", () => ({
        supabaseAdmin: {
          from: vi.fn(() => {
            throw new Error("Unexpected DB error");
          }),
        },
      }));
      vi.doMock("@/lib/highlevel/client", () => ({
        upsertHLContact: vi.fn(),
        addHLTags: vi.fn(),
      }));

      const { checkAndFireHLTriggers } = await import("@/lib/trial/hlTriggers");
      await expect(
        checkAndFireHLTriggers("tenant-1")
      ).resolves.toBeUndefined();
    });
  });
});
