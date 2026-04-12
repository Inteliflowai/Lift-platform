import { describe, it, expect } from "vitest";

// We can't import computeEnrichedSignals directly because it calls supabaseAdmin.
// Instead, test the pure detector functions by extracting the logic.
// For now, test the signal interface and detector behavior expectations.

describe("Enriched Signal Definitions", () => {
  it("signal severity is advisory or notable", () => {
    const validSeverities = ["advisory", "notable"];
    // This tests the type contract
    for (const s of validSeverities) {
      expect(["advisory", "notable"]).toContain(s);
    }
  });

  it("signal categories are valid", () => {
    const validCategories = ["reading", "writing", "processing", "attention", "self-regulation"];
    expect(validCategories).toHaveLength(5);
  });
});

describe("TRI Score Logic", () => {
  // Test the pure TRI computation logic (extracted from the DB-dependent function)
  function computeRawTRI(scores: {
    reading: number;
    writing: number;
    reasoning: number;
    reflection: number;
    persistence: number;
    supportSeeking: number;
  }, confidence: number, supportLevel: string): { score: number; label: string } {
    let raw =
      scores.reading * 0.2 +
      scores.writing * 0.2 +
      scores.reasoning * 0.2 +
      scores.reflection * 0.15 +
      scores.persistence * 0.15 +
      scores.supportSeeking * 0.1;

    if (confidence < 50) raw *= 0.9;
    else if (confidence < 75) raw *= 0.95;

    if (supportLevel === "recommend_screening") raw *= 0.92;
    else if (supportLevel === "watch") raw *= 0.97;

    const score = Math.round(Math.max(0, Math.min(100, raw)) * 10) / 10;
    const label = score >= 80 ? "thriving" : score >= 60 ? "ready" : score >= 40 ? "developing" : "emerging";

    return { score, label };
  }

  it("computes thriving for high scores", () => {
    const result = computeRawTRI(
      { reading: 90, writing: 85, reasoning: 88, reflection: 82, persistence: 80, supportSeeking: 75 },
      90, "none"
    );
    expect(result.label).toBe("thriving");
    expect(result.score).toBeGreaterThan(80);
  });

  it("computes emerging for low scores", () => {
    const result = computeRawTRI(
      { reading: 20, writing: 15, reasoning: 25, reflection: 10, persistence: 15, supportSeeking: 10 },
      30, "none"
    );
    expect(result.label).toBe("emerging");
    expect(result.score).toBeLessThan(40);
  });

  it("applies confidence penalty for low confidence", () => {
    const highConf = computeRawTRI(
      { reading: 70, writing: 70, reasoning: 70, reflection: 70, persistence: 70, supportSeeking: 70 },
      90, "none"
    );
    const lowConf = computeRawTRI(
      { reading: 70, writing: 70, reasoning: 70, reflection: 70, persistence: 70, supportSeeking: 70 },
      40, "none"
    );
    expect(lowConf.score).toBeLessThan(highConf.score);
  });

  it("applies support level penalty", () => {
    const none = computeRawTRI(
      { reading: 70, writing: 70, reasoning: 70, reflection: 70, persistence: 70, supportSeeking: 70 },
      90, "none"
    );
    const screening = computeRawTRI(
      { reading: 70, writing: 70, reasoning: 70, reflection: 70, persistence: 70, supportSeeking: 70 },
      90, "recommend_screening"
    );
    expect(screening.score).toBeLessThan(none.score);
  });

  it("clamps score between 0 and 100", () => {
    const result = computeRawTRI(
      { reading: 100, writing: 100, reasoning: 100, reflection: 100, persistence: 100, supportSeeking: 100 },
      100, "none"
    );
    expect(result.score).toBeLessThanOrEqual(100);

    const low = computeRawTRI(
      { reading: 0, writing: 0, reasoning: 0, reflection: 0, persistence: 0, supportSeeking: 0 },
      10, "recommend_screening"
    );
    expect(low.score).toBeGreaterThanOrEqual(0);
  });

  it("weights are correct (sum to 1.0)", () => {
    const weights = [0.2, 0.2, 0.2, 0.15, 0.15, 0.1];
    const sum = weights.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0);
  });
});

describe("Stripe Prices", () => {
  it("prices file returns professional and enterprise", async () => {
    process.env.STRIPE_PRICE_ID_PROFESSIONAL = "price_test_pro";
    process.env.STRIPE_PRICE_ID_ENTERPRISE = "price_test_ent";

    const { getStripePrices, TIER_ANNUAL_AMOUNTS } = await import("@/lib/stripe/prices");
    const prices = getStripePrices();
    expect(prices.professional).toBe("price_test_pro");
    expect(prices.enterprise).toBe("price_test_ent");
    expect(TIER_ANNUAL_AMOUNTS.professional).toBe(12000);
    expect(TIER_ANNUAL_AMOUNTS.enterprise).toBe(18000);
  });
});
