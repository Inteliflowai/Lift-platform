import { describe, it, expect } from "vitest";
import {
  computeSignalSnapshotVector,
  normalizedDistanceFromVectors,
  normalizedDistance,
  canonicalVector,
  type SignalSnapshot,
} from "@/lib/ai/signalHash";

function snap(
  dims: Partial<SignalSnapshot["dimensionScores"]> = {},
  sigs: SignalSnapshot["enrichedSignals"] = [],
): SignalSnapshot {
  return {
    dimensionScores: {
      reading: 75, writing: 70, reasoning: 80, math: 65,
      reflection: 72, persistence: 68, support_seeking: 74,
      ...dims,
    },
    enrichedSignals: sigs,
  };
}

describe("computeSignalSnapshotVector", () => {
  it("returns exactly 16 elements (7 dimensions + 9 enriched signals)", () => {
    const v = computeSignalSnapshotVector(snap());
    expect(v).toHaveLength(16);
  });

  it("is identical to canonicalVector — same implementation, intent-named alias", () => {
    const input = snap();
    expect(computeSignalSnapshotVector(input)).toEqual(canonicalVector(input));
  });

  it("produces stable output for identical inputs across calls", () => {
    const a = computeSignalSnapshotVector(snap());
    const b = computeSignalSnapshotVector(snap());
    expect(a).toEqual(b);
  });
});

describe("normalizedDistanceFromVectors", () => {
  it("returns 0 for identical vectors", () => {
    const v = computeSignalSnapshotVector(snap());
    expect(normalizedDistanceFromVectors(v, v)).toBe(0);
  });

  it("is symmetric", () => {
    const a = computeSignalSnapshotVector(snap({ reading: 50 }));
    const b = computeSignalSnapshotVector(snap({ reading: 80 }));
    expect(normalizedDistanceFromVectors(a, b)).toBeCloseTo(
      normalizedDistanceFromVectors(b, a),
      10,
    );
  });

  it("matches normalizedDistance result when called on the same snapshots", () => {
    const sa = snap({ reading: 50, writing: 60 });
    const sb = snap({ reading: 80, writing: 75 });
    const fromSnapshot = normalizedDistance(sa, sb);
    const fromVectors = normalizedDistanceFromVectors(
      computeSignalSnapshotVector(sa),
      computeSignalSnapshotVector(sb),
    );
    expect(fromVectors).toBeCloseTo(fromSnapshot, 10);
  });

  it("treats length-mismatch as maximally different (defensive against catalog drift)", () => {
    const short = [75, 70, 80, 65];
    const long = computeSignalSnapshotVector(snap());
    expect(normalizedDistanceFromVectors(short, long)).toBe(1.0);
  });

  it("respects the 10% boundary for near-identical vectors", () => {
    // 2-point shift on one dimension = tiny L2 distance, under 10%
    const a = computeSignalSnapshotVector(snap({ reading: 75 }));
    const b = computeSignalSnapshotVector(snap({ reading: 77 }));
    expect(normalizedDistanceFromVectors(a, b)).toBeLessThan(0.1);
  });

  it("crosses the 10% boundary for large shifts", () => {
    // All 7 dimensions shift by 40 points
    const a = computeSignalSnapshotVector(snap({
      reading: 50, writing: 50, reasoning: 50, math: 50,
      reflection: 50, persistence: 50, support_seeking: 50,
    }));
    const b = computeSignalSnapshotVector(snap({
      reading: 90, writing: 90, reasoning: 90, math: 90,
      reflection: 90, persistence: 90, support_seeking: 90,
    }));
    expect(normalizedDistanceFromVectors(a, b)).toBeGreaterThan(0.1);
  });

  it("handles empty vectors gracefully (both empty → 0 distance)", () => {
    expect(normalizedDistanceFromVectors([], [])).toBe(0);
  });

  it("returns 1.0 when one vector has extra elements (catalog added new signal)", () => {
    const v16 = computeSignalSnapshotVector(snap());
    const v17 = [...v16, 1];
    expect(normalizedDistanceFromVectors(v16, v17)).toBe(1.0);
  });
});

describe("L2-persistence round-trip", () => {
  it("store vector → reload → L2 distance against identical snapshot = 0", () => {
    const original = snap({ reading: 82, writing: 74 });
    const stored = computeSignalSnapshotVector(original); // simulates DB write
    // Later: recompute from the same-state snapshot
    const reloaded = computeSignalSnapshotVector(original); // simulates re-derive
    expect(normalizedDistanceFromVectors(stored, reloaded)).toBe(0);
  });

  it("stored vector + new snapshot with small drift → below threshold", () => {
    const stored = computeSignalSnapshotVector(snap({ reading: 75 }));
    const nextSnapshot = computeSignalSnapshotVector(snap({ reading: 76 }));
    expect(normalizedDistanceFromVectors(stored, nextSnapshot)).toBeLessThan(0.1);
  });
});
