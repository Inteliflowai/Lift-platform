import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockConstructEvent, mockHandleStripeWebhook } = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockHandleStripeWebhook: vi.fn(),
}));

vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    webhooks: { constructEvent: mockConstructEvent },
  },
}));

vi.mock("@/lib/licensing/stripe", () => ({
  handleStripeWebhook: mockHandleStripeWebhook,
}));

import { POST } from "@/app/api/webhooks/stripe/route";

describe("Stripe Webhook Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
  });

  describe("Signature verification", () => {
    it("returns 503 when STRIPE_WEBHOOK_SECRET is not set", async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      const req = new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify({ type: "checkout.session.completed" }),
        headers: { "stripe-signature": "sig_test" },
      });
      const res = await POST(req as any);
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toMatch(/not configured/i);
    });

    it("rejects requests with missing stripe-signature header", async () => {
      const req = new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify({ type: "checkout.session.completed" }),
      });
      const res = await POST(req as any);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/missing signature/i);
    });

    it("rejects requests with invalid stripe signature", async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error("Invalid signature");
      });
      const req = new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify({ type: "checkout.session.completed" }),
        headers: { "stripe-signature": "bad_sig" },
      });
      const res = await POST(req as any);
      expect(res.status).toBe(400);
    });

    it("accepts requests with valid stripe signature", async () => {
      const event = { id: "evt_1", type: "checkout.session.completed", data: {} };
      mockConstructEvent.mockReturnValue(event);
      mockHandleStripeWebhook.mockResolvedValue(undefined);

      const req = new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify(event),
        headers: { "stripe-signature": "valid_sig" },
      });
      const res = await POST(req as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.received).toBe(true);
    });
  });

  describe("Event routing", () => {
    it("passes constructed event to handleStripeWebhook", async () => {
      const event = { id: "evt_2", type: "invoice.paid", data: { object: {} } };
      mockConstructEvent.mockReturnValue(event);
      mockHandleStripeWebhook.mockResolvedValue(undefined);

      const req = new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify(event),
        headers: { "stripe-signature": "valid_sig" },
      });
      await POST(req as any);
      expect(mockHandleStripeWebhook).toHaveBeenCalledWith(event);
    });

    it("returns 400 when handleStripeWebhook throws", async () => {
      const event = { id: "evt_3", type: "invoice.paid", data: {} };
      mockConstructEvent.mockReturnValue(event);
      mockHandleStripeWebhook.mockRejectedValue(new Error("DB error"));

      const req = new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify(event),
        headers: { "stripe-signature": "valid_sig" },
      });
      const res = await POST(req as any);
      expect(res.status).toBe(400);
    });
  });
});
