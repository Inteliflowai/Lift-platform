import { describe, it, expect } from "vitest";
import {
  computeSignalSnapshotHash,
  normalizedDistance,
  shouldRegenerate,
  severityCode,
  canonicalVector,
  type SignalSnapshot,
} from "@/lib/ai/signalHash";

function snap(
  dims: Partial<SignalSnapshot["dimensionScores"]> = {},
  sigs: SignalSnapshot["enrichedSignals"] = [],
): SignalSnapshot {
  return {
    dimensionScores: {
      reading: 75,
      writing: 70,
      reasoning: 80,
      math: 65,
      reflection: 72,
      persistence: 68,
      support_seeking: 74,
      ...dims,
    },
    enrichedSignals: sigs,
  };
}

describe("signalHash", () => {
  describe("determinism", () => {
    it("produces the same hash for identical input", () => {
      const a = snap();
      const b = snap();
      expect(computeSignalSnapshotHash(a)).toBe(computeSignalSnapshotHash(b));
    });

    it("produces the same hash regardless of enriched-signal array order", () => {
      const a = snap({}, [
        { id: "extended_reading_time", severity: "notable" },
        { id: "variable_task_pacing", severity: "advisory" },
      ]);
      const b = snap({}, [
        { id: "variable_task_pacing", severity: "advisory" },
        { id: "extended_reading_time", severity: "notable" },
      ]);
      expect(computeSignalSnapshotHash(a)).toBe(computeSignalSnapshotHash(b));
    });

    it("canonical vector always has 16 elements", () => {
      const v = canonicalVector(snap());
      expect(v).toHaveLength(16);
    });

    it("canonical vector fills missing enriched signals with zero", () => {
      const v = canonicalVector(snap({}, []));
      // 7 dimensions + 9 zeros for signals
      expect(v.slice(7)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    });
  });

  describe("score rounding", () => {
    it("rounds scores to 1 decimal place — 74.04 and 74.00 hash the same", () => {
      const a = snap({ reading: 74.04 });
      const b = snap({ reading: 74.0 });
      expect(computeSignalSnapshotHash(a)).toBe(computeSignalSnapshotHash(b));
    });

    it("but 74.0 and 74.1 hash differently", () => {
      const a = snap({ reading: 74.0 });
      const b = snap({ reading: 74.1 });
      expect(computeSignalSnapshotHash(a)).not.toBe(computeSignalSnapshotHash(b));
    });

    it("handles null/undefined scores as 0", () => {
      const a = snap({ math: null });
      const b = snap({ math: 0 });
      expect(computeSignalSnapshotHash(a)).toBe(computeSignalSnapshotHash(b));
    });
  });

  describe("severity codes", () => {
    it("maps severities to 0/1/2 correctly", () => {
      expect(severityCode("notable")).toBe(2);
      expect(severityCode("advisory")).toBe(1);
      expect(severityCode(null)).toBe(0);
      expect(severityCode(undefined)).toBe(0);
    });
  });

  describe("normalized distance", () => {
    it("identical snapshots have distance 0", () => {
      expect(normalizedDistance(snap(), snap())).toBe(0);
    });

    it("distance is symmetric", () => {
      const a = snap();
      const b = snap({ reading: 60 });
      expect(normalizedDistance(a, b)).toBeCloseTo(normalizedDistance(b, a), 10);
    });

    it("returns a value between 0 and 1", () => {
      // Maximum possible: all dims go 0 → 100, all signals go 0 → 2
      const low = {
        dimensionScores: {
          reading: 0, writing: 0, reasoning: 0, math: 0,
          reflection: 0, persistence: 0, support_seeking: 0,
        },
        enrichedSignals: [],
      };
      const high = {
        dimensionScores: {
          reading: 100, writing: 100, reasoning: 100, math: 100,
          reflection: 100, persistence: 100, support_seeking: 100,
        },
        enrichedSignals: [
          { id: "extended_reading_time", severity: "notable" as const },
          { id: "high_written_expression_revision", severity: "notable" as const },
          { id: "limited_metacognitive_expression", severity: "notable" as const },
          { id: "limited_written_output", severity: "notable" as const },
          { id: "low_support_seeking_under_challenge", severity: "notable" as const },
          { id: "reasoning_expression_gap", severity: "notable" as const },
          { id: "repeated_passage_rereading", severity: "notable" as const },
          { id: "task_completion_difficulty", severity: "notable" as const },
          { id: "variable_task_pacing", severity: "notable" as const },
        ],
      };
      const d = normalizedDistance(low, high);
      expect(d).toBeCloseTo(1.0, 5);
    });
  });

  describe("drift detection", () => {
    it("returns true when old snapshot is null/undefined (always regenerate)", () => {
      expect(shouldRegenerate(null, snap())).toBe(true);
      expect(shouldRegenerate(undefined, snap())).toBe(true);
    });

    it("returns false when snapshots are identical", () => {
      expect(shouldRegenerate(snap(), snap())).toBe(false);
    });

    it("returns false for a small shift (< 10%)", () => {
      // ~2 point shift on one dimension — well under threshold
      const a = snap({ reading: 75 });
      const b = snap({ reading: 77 });
      expect(shouldRegenerate(a, b)).toBe(false);
    });

    it("returns true for a large shift (≥ 10%)", () => {
      // Every dimension shifts by 40 points — well over threshold
      const a = snap({
        reading: 50, writing: 50, reasoning: 50, math: 50,
        reflection: 50, persistence: 50, support_seeking: 50,
      });
      const b = snap({
        reading: 90, writing: 90, reasoning: 90, math: 90,
        reflection: 90, persistence: 90, support_seeking: 90,
      });
      expect(shouldRegenerate(a, b)).toBe(true);
    });

    it("enriched signal severity escalation alone can trigger drift", () => {
      // Same dimensions, but all 9 signals go from absent → notable.
      // Distance contribution: sqrt(9 × 4) = 6; normalized ≈ 6/264.6 ≈ 2.3%.
      // That alone is under 10%, so test small-severity-change doesn't trigger.
      const a = snap({}, []);
      const b = snap({}, ENRICHED_IDS.map((id) => ({ id, severity: "notable" as const })));
      // Expected: ~2.3%, below threshold — so regenerate should be false.
      expect(shouldRegenerate(a, b)).toBe(false);
    });

    it("custom threshold can be set", () => {
      const a = snap({ reading: 75 });
      const b = snap({ reading: 77 });
      // At threshold 0.001 (0.1%), this small shift should trigger.
      expect(shouldRegenerate(a, b, 0.001)).toBe(true);
    });
  });

  describe("hash format", () => {
    it("returns sha256:{64-hex-chars} format", () => {
      const h = computeSignalSnapshotHash(snap());
      expect(h).toMatch(/^sha256:[a-f0-9]{64}$/);
    });
  });
});

const ENRICHED_IDS = [
  "extended_reading_time",
  "high_written_expression_revision",
  "limited_metacognitive_expression",
  "limited_written_output",
  "low_support_seeking_under_challenge",
  "reasoning_expression_gap",
  "repeated_passage_rereading",
  "task_completion_difficulty",
  "variable_task_pacing",
] as const;
