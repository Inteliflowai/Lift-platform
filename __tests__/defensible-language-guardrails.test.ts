import { describe, it, expect } from "vitest";
import {
  validateAgainstGuardrails,
  FORBIDDEN_PATTERNS,
} from "@/lib/ai/forbiddenPhrases";

describe("validateAgainstGuardrails", () => {
  describe("accepts safe phrasing", () => {
    it.each([
      "",
      "   ",
      "The candidate demonstrates persistent effort across written tasks, returning to prompts to refine ideas.",
      "Reading engagement is strong, with thoughtful responses to comprehension questions.",
      "Mission-aligned work ethic was observed throughout the assessment session.",
      "Reflection on process suggests readiness for the school's emphasis on inquiry-driven learning.",
      "Written output showed consistent development of ideas across multiple drafts.",
    ])("accepts: %s", (text) => {
      const result = validateAgainstGuardrails(text);
      expect(result.ok).toBe(true);
      expect(result.rejected_phrase).toBeUndefined();
    });
  });

  describe("rejects comparative framing", () => {
    it.each([
      ["Compared to other applicants, this candidate stands out.", "comparative"],
      ["Relative to other candidates in the pool, performance was strong.", "comparative"],
      ["Scored better than most peers on writing tasks.", "comparative"],
      ["Weaker than peers on math-reasoning items.", "comparative"],
      ["Falls in the top quartile of this cycle's applicants.", "comparative"],
      ["Outperforms the average applicant in reasoning.", "comparative"],
    ])("rejects: %s", (text, category) => {
      const result = validateAgainstGuardrails(text);
      expect(result.ok).toBe(false);
      expect(result.category).toBe(category);
      expect(result.rejected_phrase).toBeTruthy();
    });
  });

  describe("rejects protected-class references", () => {
    it.each([
      "Race and ethnicity were not factors in this assessment.",
      "The candidate's religion was not considered.",
      "National origin has no bearing on admissions.",
      "The candidate is gay.",
      "Sexual orientation was discussed.",
      "Gender identity came up in the interview.",
    ])("rejects: %s", (text) => {
      const result = validateAgainstGuardrails(text);
      expect(result.ok).toBe(false);
      expect(result.category).toBe("protected_class");
    });
  });

  describe("rejects medical / disability speculation", () => {
    it.each([
      "Signals suggest a possible diagnosis of attention difficulties.",
      "The candidate has a learning disability.",
      "A disorder was not identified but patterns were observed.",
      "Accommodations for special needs may be needed.",
      "Signals consistent with ADHD.",
      "Observed patterns consistent with autism.",
      "Possible dyslexia.",
      "The candidate has an IEP.",
      "A 504 plan is recommended.",
      "The candidate is neurodivergent.",
      "Mental health was a consideration.",
    ])("rejects: %s", (text) => {
      const result = validateAgainstGuardrails(text);
      expect(result.ok).toBe(false);
      expect(result.category).toBe("medical_disability");
    });
  });

  describe("rejects financial references", () => {
    it.each([
      "Financial aid status was considered.",
      "Tuition cost is an issue.",
      "The family is low income.",
      "From an affluent background.",
      "Cannot afford tuition.",
      "Their scholarship need is significant.",
      "Socio-economic status came up.",
    ])("rejects: %s", (text) => {
      const result = validateAgainstGuardrails(text);
      expect(result.ok).toBe(false);
      expect(result.category).toBe("financial");
    });
  });

  describe("rejects family-structure references", () => {
    it.each([
      "Raised in a single parent household.",
      "Divorced parents were mentioned.",
      "A two-parent home may stabilize learning.",
      "Part of a stepfamily.",
      "The candidate is adopted.",
      "In foster care currently.",
    ])("rejects: %s", (text) => {
      const result = validateAgainstGuardrails(text);
      expect(result.ok).toBe(false);
      expect(result.category).toBe("family_structure");
    });
  });

  describe("rejects IQ / deficit framing", () => {
    it.each([
      "IQ testing would clarify the picture.",
      "Performance was below average.",
      "The candidate is behind peers in math.",
      "A slow learner in reading tasks.",
      "Gifted in reasoning.",
      "A significant deficit in writing.",
      "Intellectually gifted.",
    ])("rejects: %s", (text) => {
      const result = validateAgainstGuardrails(text);
      expect(result.ok).toBe(false);
      expect(result.category).toBe("iq_deficit");
    });
  });

  describe("false-positive avoidance — adjacent safe phrasing", () => {
    it("does NOT reject 'persistent effort' as persistence-related", () => {
      const result = validateAgainstGuardrails(
        "The candidate showed persistent effort across tasks.",
      );
      expect(result.ok).toBe(true);
    });

    it("does NOT reject 'deficiency' as deficit", () => {
      // We don't ban "deficiency" — only "deficit" is in the list
      const result = validateAgainstGuardrails(
        "Iron deficiency was not discussed.",
      );
      expect(result.ok).toBe(true);
    });

    it("does NOT reject 'behind the scenes' as 'behind peers'", () => {
      const result = validateAgainstGuardrails(
        "Behind the scenes work ethic was notable.",
      );
      expect(result.ok).toBe(true);
    });

    it("does NOT reject 'strong reasoning' in isolation", () => {
      const result = validateAgainstGuardrails(
        "The candidate demonstrated strong reasoning throughout.",
      );
      expect(result.ok).toBe(true);
    });
  });

  describe("guardrail coverage invariant", () => {
    it("has at least 30 patterns in the starter list", () => {
      expect(FORBIDDEN_PATTERNS.length).toBeGreaterThanOrEqual(30);
    });

    it("covers all six categories", () => {
      const categories = new Set(FORBIDDEN_PATTERNS.map((p) => p.category));
      expect(categories.has("comparative")).toBe(true);
      expect(categories.has("protected_class")).toBe(true);
      expect(categories.has("medical_disability")).toBe(true);
      expect(categories.has("financial")).toBe(true);
      expect(categories.has("family_structure")).toBe(true);
      expect(categories.has("iq_deficit")).toBe(true);
    });

    it("all patterns are valid RegExp instances", () => {
      for (const { pattern } of FORBIDDEN_PATTERNS) {
        expect(pattern).toBeInstanceOf(RegExp);
      }
    });
  });
});
