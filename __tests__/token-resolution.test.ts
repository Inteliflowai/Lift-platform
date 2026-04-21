import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

import { resolveInviteToken, resolveResumeToken } from "@/lib/token";

describe("Token Resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
  });

  describe("resolveInviteToken()", () => {
    it("returns valid=false with not_found for non-existent token", async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });

      const result = await resolveInviteToken("no-such-token");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe("not_found");
      }
    });

    it("returns valid=false with expired for expired token", async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      mockSingle.mockResolvedValue({
        data: {
          token: "expired-token",
          expires_at: pastDate,
          candidates: { id: "c1", tenant_id: "t1", guardians: [] },
          tenants: { name: "Test School", slug: "test" },
        },
        error: null,
      });

      const result = await resolveInviteToken("expired-token");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe("expired");
      }
    });

    it("returns valid=true with data for active token", async () => {
      const futureDate = new Date(Date.now() + 86400000 * 7).toISOString();
      mockSingle.mockResolvedValue({
        data: {
          token: "active-token",
          expires_at: futureDate,
          candidates: {
            id: "c1",
            first_name: "Jane",
            last_name: "Doe",
            grade_band: "6-7",
            grade_applying_to: "6",
            date_of_birth: null,
            status: "invited",
            tenant_id: "t1",
            cycle_id: "cycle1",
            guardians: [],
          },
          tenants: { name: "Test School", slug: "test-school" },
        },
        error: null,
      });

      const result = await resolveInviteToken("active-token");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.candidate.first_name).toBe("Jane");
        expect(result.tenant.name).toBe("Test School");
      }
    });

    it("returns valid=true when expires_at is null (no expiry)", async () => {
      mockSingle.mockResolvedValue({
        data: {
          token: "no-expiry",
          expires_at: null,
          candidates: {
            id: "c2",
            first_name: "Alex",
            last_name: "Smith",
            grade_band: "8",
            grade_applying_to: "8",
            date_of_birth: null,
            status: "invited",
            tenant_id: "t1",
            cycle_id: null,
            guardians: [],
          },
          tenants: { name: "School", slug: "school" },
        },
        error: null,
      });

      const result = await resolveInviteToken("no-expiry");
      expect(result.valid).toBe(true);
    });
  });

  describe("resolveResumeToken()", () => {
    it("returns null for non-existent resume token", async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });
      const result = await resolveResumeToken("no-session");
      expect(result).toBeNull();
    });

    it("returns session data for valid resume token", async () => {
      const session = {
        id: "s1",
        resume_token: "valid-resume",
        status: "in_progress",
        candidates: { id: "c1", first_name: "Jane", tenants: { name: "School" } },
      };
      mockSingle.mockResolvedValue({ data: session, error: null });
      const result = await resolveResumeToken("valid-resume");
      expect(result).not.toBeNull();
      expect(result.id).toBe("s1");
      expect(result.status).toBe("in_progress");
    });
  });
});
