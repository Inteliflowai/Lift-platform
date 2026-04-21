// Opt-in integration test. Skipped unless RUN_AI_TESTS=1 is set in the
// environment. Hits the real Anthropic Sonnet API to verify our prompt still
// produces guardrail-clean output end-to-end. Not added to Vercel's
// buildCommand — run manually via:
//
//   RUN_AI_TESTS=1 ANTHROPIC_API_KEY=... npm test -- defensible-language-integration
//
// This test answers one question: does Sonnet still produce guardrail-clean
// output against our current prompt? It does not cover DB persistence, audit
// rows, or the API surface. Those belong in an E2E suite if we ever add one.

import { describe, it, expect } from "vitest";
import {
  generateDefensibleLanguage,
  DEFENSIBLE_LANGUAGE_MODEL,
  type GenerationInputs,
} from "@/lib/ai/defensibleLanguage";
import { validateAgainstGuardrails } from "@/lib/ai/forbiddenPhrases";

const runIntegration = process.env.RUN_AI_TESTS === "1";

function realisticInputs(): GenerationInputs {
  return {
    candidateFirstName: "Jordan",
    candidateLastName: "Rivera",
    gradeApplyingTo: "8",
    schoolName: "Hillside School",
    missionStatement: "Inquiry-driven learning that prepares thoughtful citizens.",
    topStrengths: ["reading comprehension", "reflective thinking"],
    developingAreas: ["written expression"],
    behavioralEvidence: [
      "took additional time on dense reading passages",
      "revised written responses extensively",
    ],
    signalSnapshot: {
      dimensionScores: {
        reading: 82, writing: 64, reasoning: 78, math: 72,
        reflection: 84, persistence: 74, support_seeking: 68,
      },
      enrichedSignals: [
        { id: "extended_reading_time", severity: "advisory" },
        { id: "high_written_expression_revision", severity: "advisory" },
      ],
    },
  };
}

describe.skipIf(!runIntegration)("Sonnet guardrail-clean output (integration)", () => {
  it(
    "produces three guardrail-clean rationales against the current prompt",
    async () => {
      const { cache, perDecision } = await generateDefensibleLanguage(realisticInputs());

      // Shape assertions
      expect(cache.admit).toBeTruthy();
      expect(cache.waitlist).toBeTruthy();
      expect(cache.decline).toBeTruthy();
      expect(cache.model).toBe(DEFENSIBLE_LANGUAGE_MODEL);

      // Guardrail assertions — every decision passes
      for (const decision of ["admit", "waitlist", "decline"] as const) {
        const text = cache[decision];
        const result = validateAgainstGuardrails(text);
        if (!result.ok) {
          throw new Error(
            `Guardrail rejected "${decision}" output — phrase "${result.rejected_phrase}" (${result.category}). Full text: ${text}`,
          );
        }
      }

      // No fallback used on a well-formed input — if this fires, the prompt
      // is regressing against guardrails and needs inspection.
      if (cache.fallback_used) {
        const fallbacks = perDecision.filter((d) => d.fallback_used).map((d) => d.decision);
        throw new Error(
          `Fallback triggered for: ${fallbacks.join(", ")}. Prompt or guardrail calibration likely needs revisiting.`,
        );
      }
    },
    60_000, // Up to 60s — three parallel Claude calls
  );
});
