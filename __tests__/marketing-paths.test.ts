import { describe, it, expect } from "vitest";
import { isPublicMarketingPath } from "@/lib/analytics/marketingPaths";

describe("isPublicMarketingPath", () => {
  describe("allow-listed paths", () => {
    it.each([
      "/lift",
      "/pricing",
      "/register",
      "/buy",
      "/buy/success",
      "/demo/new",
      "/demo/expired",
      "/legal/privacy",
      "/legal/terms",
      "/legal/anything-new-under-legal",
    ])("returns true for %s", (path) => {
      expect(isPublicMarketingPath(path)).toBe(true);
    });
  });

  describe("authenticated / non-marketing paths", () => {
    it.each([
      "/admin",
      "/admin/tenants",
      "/admin/api-test",
      "/school",
      "/school/candidates/abc-123",
      "/school/cohort",
      "/evaluator",
      "/evaluator/candidates/abc-123",
      "/interviewer",
      "/settings/account",
      "/support",
      "/help/admin",
      "/session/some-token",
      "/invite/some-token",
      "/consent/some-token",
    ])("returns false for authenticated/assessment path %s", (path) => {
      expect(isPublicMarketingPath(path)).toBe(false);
    });
  });

  describe("auth / credential flows", () => {
    it.each([
      "/login",
      "/forgot-password",
      "/reset-password",
      "/confirm",
      "/unauthorized",
      "/suspended",
    ])("returns false for %s (credential-adjacent)", (path) => {
      expect(isPublicMarketingPath(path)).toBe(false);
    });
  });

  describe("demo product routes", () => {
    it("returns false for /demo/[token] — actual product usage, not marketing", () => {
      expect(isPublicMarketingPath("/demo/abc-123-token")).toBe(false);
      expect(isPublicMarketingPath("/demo/xyz")).toBe(false);
    });

    it("returns true for /demo/new and /demo/expired (marketing entry/exit)", () => {
      expect(isPublicMarketingPath("/demo/new")).toBe(true);
      expect(isPublicMarketingPath("/demo/expired")).toBe(true);
    });
  });

  describe("root and edge cases", () => {
    it("returns false for root / (redirects to /login)", () => {
      expect(isPublicMarketingPath("/")).toBe(false);
    });

    it("returns false for null/undefined/empty pathname", () => {
      expect(isPublicMarketingPath(null)).toBe(false);
      expect(isPublicMarketingPath(undefined)).toBe(false);
      expect(isPublicMarketingPath("")).toBe(false);
    });

    it("does not match /legal exact (only /legal/*)", () => {
      expect(isPublicMarketingPath("/legal")).toBe(false);
    });

    it("does not match partial prefixes (e.g. /lifted-up)", () => {
      expect(isPublicMarketingPath("/lifted-up")).toBe(false);
      expect(isPublicMarketingPath("/registers")).toBe(false);
      expect(isPublicMarketingPath("/buying")).toBe(false);
    });
  });
});
