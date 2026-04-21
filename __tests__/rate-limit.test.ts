import { describe, it, expect, vi, beforeEach } from "vitest";

// The rateLimit module has a setInterval for cleanup — mock timers to control it
vi.useFakeTimers();

import { rateLimit, rateLimitResponse } from "@/lib/rateLimit/middleware";

describe("Rate Limiting", () => {
  beforeEach(() => {
    // Advance time enough to expire any existing entries from prior tests
    vi.advanceTimersByTime(10 * 60 * 1000);
  });

  describe("rateLimit()", () => {
    it("allows first request", () => {
      expect(rateLimit("test-allow-first", 5, 60)).toBe(true);
    });

    it("allows requests under the limit", () => {
      const key = "test-under-limit";
      expect(rateLimit(key, 5, 60)).toBe(true); // 1
      expect(rateLimit(key, 5, 60)).toBe(true); // 2
      expect(rateLimit(key, 5, 60)).toBe(true); // 3
      expect(rateLimit(key, 5, 60)).toBe(true); // 4
    });

    it("blocks requests at the limit", () => {
      const key = "test-at-limit";
      for (let i = 0; i < 3; i++) rateLimit(key, 3, 60);
      expect(rateLimit(key, 3, 60)).toBe(false);
    });

    it("resets after window expires", () => {
      const key = "test-reset";
      for (let i = 0; i < 3; i++) rateLimit(key, 3, 10);
      expect(rateLimit(key, 3, 10)).toBe(false);

      // Advance past the 10-second window
      vi.advanceTimersByTime(11000);

      expect(rateLimit(key, 3, 10)).toBe(true);
    });

    it("tracks keys independently", () => {
      const keyA = "test-key-a";
      const keyB = "test-key-b";
      for (let i = 0; i < 3; i++) rateLimit(keyA, 3, 60);
      expect(rateLimit(keyA, 3, 60)).toBe(false);
      // keyB should still be allowed
      expect(rateLimit(keyB, 3, 60)).toBe(true);
    });

    it("allows exactly maxRequests calls", () => {
      const key = "test-exact-max";
      let allowed = 0;
      for (let i = 0; i < 10; i++) {
        if (rateLimit(key, 5, 60)) allowed++;
      }
      expect(allowed).toBe(5);
    });
  });

  describe("rateLimitResponse()", () => {
    it("returns 429 status", () => {
      const res = rateLimitResponse();
      expect(res.status).toBe(429);
    });

    it("includes Retry-After header", () => {
      const res = rateLimitResponse();
      expect(res.headers.get("Retry-After")).toBe("30");
    });

    it("returns JSON error body", async () => {
      const res = rateLimitResponse();
      const body = await res.json();
      expect(body.error).toBe("rate_limit_exceeded");
      expect(body.message).toBeDefined();
    });
  });
});
