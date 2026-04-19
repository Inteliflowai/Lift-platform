import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";

const TEST_SECRET = "test-hl-secret-2026";

// Mock HL client
const mockUpsertHLContact = vi.fn();
const mockAddHLTags = vi.fn();
const mockMoveHLPipelineStage = vi.fn();

vi.mock("@/lib/highlevel/client", () => ({
  upsertHLContact: (...args: any[]) => mockUpsertHLContact(...args),
  addHLTags: (...args: any[]) => mockAddHLTags(...args),
  moveHLPipelineStage: (...args: any[]) => mockMoveHLPipelineStage(...args),
}));

// Mock email
vi.mock("@/lib/email", () => ({
  sendUpgradeRequestEmail: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "@/app/api/integrations/hl-inbound/route";

function makeSignature(body: string, secret: string = TEST_SECRET): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

function makeRequest(
  body: string,
  headers: Record<string, string> = {}
): Request {
  return new Request("http://localhost/api/integrations/hl-inbound", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("HL Inbound Webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.HL_INBOUND_SECRET = TEST_SECRET;
    process.env.HL_STAGE_IDS = "{}";
    mockUpsertHLContact.mockResolvedValue("contact-123");
    mockAddHLTags.mockResolvedValue(undefined);
    mockMoveHLPipelineStage.mockResolvedValue(undefined);
  });

  describe("HMAC verification", () => {
    it("accepts request with valid HMAC signature", async () => {
      const body = JSON.stringify({
        email: "test@school.edu",
        first_name: "Test",
      });
      const sig = makeSignature(body);
      const req = makeRequest(body, { "x-hl-signature": sig });
      const res = await POST(req as any);
      expect(res.status).toBe(200);
    });

    it("rejects request with invalid HMAC signature", async () => {
      const body = JSON.stringify({ email: "test@school.edu" });
      const req = makeRequest(body, { "x-hl-signature": "bad-signature" });
      const res = await POST(req as any);
      expect(res.status).toBe(401);
    });

    it("rejects request with no signature headers", async () => {
      const body = JSON.stringify({ email: "test@school.edu" });
      const req = makeRequest(body);
      const res = await POST(req as any);
      expect(res.status).toBe(401);
    });

    it("rejects request with tampered body", async () => {
      const original = JSON.stringify({ email: "test@school.edu" });
      const sig = makeSignature(original);
      const tampered = JSON.stringify({
        email: "test@school.edu",
        injected: true,
      });
      const req = makeRequest(tampered, { "x-hl-signature": sig });
      const res = await POST(req as any);
      expect(res.status).toBe(401);
    });

    it("rejects legacy x-hl-secret header (HMAC required)", async () => {
      const body = JSON.stringify({ email: "test@school.edu" });
      const req = makeRequest(body, { "x-hl-secret": TEST_SECRET });
      const res = await POST(req as any);
      expect(res.status).toBe(401);
    });
  });

  describe("Contact processing", () => {
    function signedRequest(body: string) {
      return makeRequest(body, { "x-hl-signature": makeSignature(body) });
    }

    it("returns 400 when email is missing", async () => {
      const body = JSON.stringify({ first_name: "No Email" });
      const res = await POST(signedRequest(body) as any);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/email/i);
    });

    it("upserts HL contact with correct fields", async () => {
      const body = JSON.stringify({
        email: "admin@school.edu",
        first_name: "Jane",
        last_name: "Smith",
        school_name: "Lincoln Academy",
        school_type: "Independent",
      });
      await POST(signedRequest(body) as any);
      expect(mockUpsertHLContact).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "admin@school.edu",
          firstName: "Jane",
          lastName: "Smith",
          companyName: "Lincoln Academy",
        })
      );
    });

    it("adds lift-lead tag plus form_type tag", async () => {
      const body = JSON.stringify({
        email: "admin@school.edu",
        form_type: "demo",
      });
      await POST(signedRequest(body) as any);
      expect(mockAddHLTags).toHaveBeenCalledWith("contact-123", [
        "lift-lead",
        "lift-form-demo",
      ]);
    });

    it("returns contactId in success response", async () => {
      const body = JSON.stringify({ email: "admin@school.edu" });
      const res = await POST(signedRequest(body) as any);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.contactId).toBe("contact-123");
    });
  });
});
