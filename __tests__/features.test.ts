import { describe, it, expect } from "vitest";
import { FEATURES, TIER_FEATURES, TIER_LIMITS, TIER_PRICING } from "@/lib/licensing/features";

describe("Feature Gating", () => {
  it("defines all expected feature keys", () => {
    expect(FEATURES.CANDIDATE_SESSIONS).toBe("candidate_sessions");
    expect(FEATURES.TRI_SCORE).toBe("tri_score");
    expect(FEATURES.WHITE_LABEL).toBe("white_label");
    expect(FEATURES.PLACEMENT_SUPPORT_PLAN).toBe("placement_support_plan");
    expect(FEATURES.OUTCOME_TRACKING).toBe("outcome_tracking");
    expect(FEATURES.SIS_INTEGRATIONS).toBe("sis_integrations");
  });

  it("professional tier includes core features", () => {
    const pro = TIER_FEATURES.professional;
    expect(pro).toContain(FEATURES.CANDIDATE_SESSIONS);
    expect(pro).toContain(FEATURES.TRI_SCORE);
    expect(pro).toContain(FEATURES.LEARNING_SUPPORT_SIGNALS);
    expect(pro).toContain(FEATURES.VOICE_RESPONSE);
    expect(pro).toContain(FEATURES.PLACEMENT_SUPPORT_PLAN);
    expect(pro).toContain(FEATURES.OUTCOME_TRACKING);
  });

  it("professional tier does NOT include enterprise features", () => {
    const pro = TIER_FEATURES.professional;
    expect(pro).not.toContain(FEATURES.WHITE_LABEL);
    expect(pro).not.toContain(FEATURES.SIS_INTEGRATIONS);
    expect(pro).not.toContain(FEATURES.BENCHMARKING_NETWORK);
    expect(pro).not.toContain(FEATURES.WAITLIST_INTELLIGENCE);
    expect(pro).not.toContain(FEATURES.CUSTOM_BRANDING);
  });

  it("enterprise tier includes everything professional has", () => {
    const pro = TIER_FEATURES.professional;
    const ent = TIER_FEATURES.enterprise;
    for (const feature of pro) {
      expect(ent).toContain(feature);
    }
  });

  it("enterprise tier includes enterprise-only features", () => {
    const ent = TIER_FEATURES.enterprise;
    expect(ent).toContain(FEATURES.WHITE_LABEL);
    expect(ent).toContain(FEATURES.SIS_INTEGRATIONS);
    expect(ent).toContain(FEATURES.BENCHMARKING_NETWORK);
    expect(ent).toContain(FEATURES.WAITLIST_INTELLIGENCE);
  });

  it("trial includes enterprise features minus white label/branding", () => {
    const trial = TIER_FEATURES.trial;
    expect(trial).toContain(FEATURES.TRI_SCORE);
    expect(trial).toContain(FEATURES.SIS_INTEGRATIONS);
    expect(trial).not.toContain(FEATURES.WHITE_LABEL);
    expect(trial).not.toContain(FEATURES.CUSTOM_BRANDING);
  });

  it("no essentials tier exists", () => {
    expect(TIER_FEATURES.essentials).toBeUndefined();
    expect((TIER_LIMITS as Record<string, unknown>).essentials).toBeUndefined();
    expect((TIER_PRICING as Record<string, unknown>).essentials).toBeUndefined();
  });

  it("professional pricing is $12,000", () => {
    expect(TIER_PRICING.professional.annual).toBe(12000);
  });

  it("enterprise pricing is $18,000", () => {
    expect(TIER_PRICING.enterprise.annual).toBe(18000);
  });

  it("professional limits are correct", () => {
    expect(TIER_LIMITS.professional.sessions_per_year).toBe(500);
    expect(TIER_LIMITS.professional.evaluator_seats).toBe(5);
  });

  it("enterprise has unlimited sessions", () => {
    expect(TIER_LIMITS.enterprise.sessions_per_year).toBeNull();
    expect(TIER_LIMITS.enterprise.evaluator_seats).toBeNull();
  });

  it("trial is capped at 25 sessions", () => {
    expect(TIER_LIMITS.trial.sessions_per_year).toBe(25);
  });
});
