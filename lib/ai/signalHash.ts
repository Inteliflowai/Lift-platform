// Canonical signal-snapshot hash for defensible-language cache invalidation.
// Pure module — SHA-256 over a stable 16-element vector:
//   7 dimension scores (reading, writing, reasoning, math, reflection,
//     persistence, support_seeking) rounded to 1 decimal
//   9 enriched-signal severity codes (0=absent, 1=advisory, 2=notable)
//
// Drift detection uses normalized L2 distance; ≥ 10% triggers regeneration.
// Max possible distance in the 16-dim space is sqrt(7 × 100² + 9 × 2²) =
// sqrt(70036) ≈ 264.64, which is what we normalize against.

import { createHash } from "crypto";

export interface DimensionScores {
  reading?: number | null;
  writing?: number | null;
  reasoning?: number | null;
  math?: number | null;
  reflection?: number | null;
  persistence?: number | null;
  support_seeking?: number | null;
}

export type SignalSeverity = "advisory" | "notable" | null | undefined;

export interface EnrichedSignalSnapshot {
  id: string;
  severity: SignalSeverity;
}

export interface SignalSnapshot {
  dimensionScores: DimensionScores;
  enrichedSignals: EnrichedSignalSnapshot[];
}

const DIMENSION_KEYS: (keyof DimensionScores)[] = [
  "reading",
  "writing",
  "reasoning",
  "math",
  "reflection",
  "persistence",
  "support_seeking",
];

// Lexically sorted 9 enriched-signal IDs for canonical ordering.
// Mirrors lib/signals/enrichedSignals.ts — if that list changes, update here.
const ENRICHED_SIGNAL_IDS = [
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

const MAX_DIMENSION_DELTA_SQUARED = 100 * 100;     // 0-100 scale per dimension
const MAX_SEVERITY_DELTA_SQUARED = 2 * 2;           // 0-2 scale per severity
const MAX_POSSIBLE_L2 = Math.sqrt(
  DIMENSION_KEYS.length * MAX_DIMENSION_DELTA_SQUARED +
    ENRICHED_SIGNAL_IDS.length * MAX_SEVERITY_DELTA_SQUARED,
);

export function severityCode(sev: SignalSeverity): 0 | 1 | 2 {
  if (sev === "notable") return 2;
  if (sev === "advisory") return 1;
  return 0;
}

function roundScore(v: number | null | undefined): number {
  if (v === null || v === undefined || Number.isNaN(v)) return 0;
  return Math.round(v * 10) / 10;
}

// Canonical vector — always 16 elements, always in the same order.
export function canonicalVector(snapshot: SignalSnapshot): number[] {
  const dims = DIMENSION_KEYS.map((k) => roundScore(snapshot.dimensionScores[k]));
  const byId = new Map(snapshot.enrichedSignals.map((s) => [s.id, severityCode(s.severity)]));
  const sigs = ENRICHED_SIGNAL_IDS.map((id) => byId.get(id) ?? 0);
  return [...dims, ...sigs];
}

// Alias exported for clarity at call sites that persist the vector rather
// than hash it. Same implementation as canonicalVector; different name to
// signal intent ("I'm about to store this in the DB").
export function computeSignalSnapshotVector(snapshot: SignalSnapshot): number[] {
  return canonicalVector(snapshot);
}

// Normalized L2 distance from two already-materialized vectors. Used by the
// persist layer to check drift against the stored signal_snapshot_vector
// without rebuilding a full SignalSnapshot.
export function normalizedDistanceFromVectors(
  vecA: number[],
  vecB: number[],
): number {
  if (vecA.length !== vecB.length) {
    // Defensive: incompatible vector lengths → treat as maximally different.
    // Real-world cause: signal catalog changed between writes. Forces regen.
    return 1.0;
  }
  let sumSq = 0;
  for (let i = 0; i < vecA.length; i++) {
    const d = vecA[i] - vecB[i];
    sumSq += d * d;
  }
  return Math.sqrt(sumSq) / MAX_POSSIBLE_L2;
}

export function computeSignalSnapshotHash(snapshot: SignalSnapshot): string {
  const vec = canonicalVector(snapshot);
  const canonical = vec.map((v) => v.toFixed(1)).join(",");
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

// Normalized L2 distance in the 16-dim space, expressed as a fraction of the
// maximum possible distance. 0.0 = identical, 1.0 = maximally different.
export function normalizedDistance(
  a: SignalSnapshot,
  b: SignalSnapshot,
): number {
  const va = canonicalVector(a);
  const vb = canonicalVector(b);
  let sumSq = 0;
  for (let i = 0; i < va.length; i++) {
    const d = va[i] - vb[i];
    sumSq += d * d;
  }
  return Math.sqrt(sumSq) / MAX_POSSIBLE_L2;
}

export function shouldRegenerate(
  oldSnapshot: SignalSnapshot | null | undefined,
  newSnapshot: SignalSnapshot,
  threshold = 0.1,
): boolean {
  if (!oldSnapshot) return true;
  return normalizedDistance(oldSnapshot, newSnapshot) >= threshold;
}
