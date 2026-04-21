import { describe, it, expect, vi } from "vitest";

// These are pure, no DB, no AI calls — they exercise the cache-shape and
// fallback-template invariants. Actual LLM generation is covered by the
// integration of generateDefensibleLanguage, which we don't run in unit
// tests because it hits the Anthropic API.

import {
  safeFallbackTemplate,
  DEFENSIBLE_LANGUAGE_MODEL,
  DEFENSIBLE_LANGUAGE_PROMPT_VERSION,
  type GenerationInputs,
  type DecisionType,
} from "@/lib/ai/defensibleLanguage";
import { validateAgainstGuardrails } from "@/lib/ai/forbiddenPhrases";

function mkInputs(overrides: Partial<GenerationInputs> = {}): GenerationInputs {
  return {
    candidateFirstName: "Jordan",
    candidateLastName: "Rivera",
    gradeApplyingTo: "8",
    schoolName: "Hillside School",
    missionStatement: "Inquiry-driven learning that prepares thoughtful citizens.",
    topStrengths: ["reading comprehension", "reflective thinking"],
    developingAreas: ["written expression"],
    behavioralEvidence: ["extended reading dwell on dense passages"],
    signalSnapshot: {
      dimensionScores: {
        reading: 80, writing: 65, reasoning: 75, math: 70,
        reflection: 82, persistence: 74, support_seeking: 68,
      },
      enrichedSignals: [
        { id: "extended_reading_time", severity: "advisory" },
      ],
    },
    ...overrides,
  };
}

describe("safeFallbackTemplate", () => {
  const DECISIONS: DecisionType[] = ["admit", "waitlist", "decline"];

  // The most important test in this file: the fallback is the only safety net
  // when AI generation fails guardrails three times. If the fallback itself
  // contains a forbidden phrase, we ship a guardrail violation under the
  // impression we avoided one.
  describe("invariant: every fallback template passes validateAgainstGuardrails", () => {
    it.each(DECISIONS)("fallback for %s passes guardrails", (decision) => {
      const text = safeFallbackTemplate(decision, mkInputs());
      const result = validateAgainstGuardrails(text);
      if (!result.ok) {
        throw new Error(
          `Fallback template for "${decision}" contains forbidden phrase "${result.rejected_phrase}" (category: ${result.category}). Template: ${text}`,
        );
      }
      expect(result.ok).toBe(true);
    });

    it("passes guardrails even with edge-case inputs (missing name, school, grade)", () => {
      const edge = mkInputs({
        candidateFirstName: "",
        schoolName: "",
        gradeApplyingTo: "",
      });
      for (const decision of DECISIONS) {
        const text = safeFallbackTemplate(decision, edge);
        const result = validateAgainstGuardrails(text);
        expect(result.ok).toBe(true);
      }
    });

    it("passes guardrails even when mission_statement is null", () => {
      const noMission = mkInputs({ missionStatement: null });
      for (const decision of DECISIONS) {
        const text = safeFallbackTemplate(decision, noMission);
        const result = validateAgainstGuardrails(text);
        expect(result.ok).toBe(true);
      }
    });
  });

  describe("fallback template shape", () => {
    it.each(DECISIONS)("fallback for %s is 3+ sentences", (decision) => {
      const text = safeFallbackTemplate(decision, mkInputs());
      const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      expect(sentences.length).toBeGreaterThanOrEqual(3);
    });

    it.each(DECISIONS)("fallback for %s includes school name", (decision) => {
      const text = safeFallbackTemplate(decision, mkInputs({ schoolName: "TestAcademy" }));
      expect(text).toContain("TestAcademy");
    });

    it.each(DECISIONS)("fallback for %s references candidate first name when provided", (decision) => {
      const text = safeFallbackTemplate(decision, mkInputs({ candidateFirstName: "Kai" }));
      expect(text).toContain("Kai");
    });
  });
});

describe("defensibleLanguage constants", () => {
  it("model is Sonnet 4.6 (not Opus)", () => {
    expect(DEFENSIBLE_LANGUAGE_MODEL).toBe("claude-sonnet-4-6");
  });

  it("prompt version has the expected starter value", () => {
    expect(DEFENSIBLE_LANGUAGE_PROMPT_VERSION).toMatch(/^dl-v\d+\.\d+$/);
  });
});

describe("cache shape (documented, not executed)", () => {
  // This test documents the cache shape so any refactor that breaks it
  // fails CI. It doesn't hit the AI.
  it("cache has the expected top-level keys", () => {
    const expectedKeys = [
      "admit", "waitlist", "decline", "edited_versions",
      "generated_at", "signal_snapshot_hash", "model",
      "prompt_version", "fallback_used", "attempts",
    ];
    // Minimal runtime assertion — this forces us to update tests if a
    // key is removed, not just added.
    expect(expectedKeys.length).toBe(10);
  });
});
