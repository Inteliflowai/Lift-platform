/**
 * Pure composition calculator — no DB calls.
 * Takes CohortRow[] (same shape as cohort API), returns class composition summary.
 */

export interface CohortRowForComposition {
  candidate_id: string;
  first_name: string;
  last_name: string;
  grade_band: string;
  grade_applying_to?: string;
  tri_score: number;
  reading_score: number;
  writing_score: number;
  reasoning_score: number;
  math_score: number;
  reflection_score: number;
  persistence_score: number;
  support_seeking_score: number;
  completion_pct: number;
  signal_count: number;
}

export interface ClassComposition {
  total: number;
  avgTri: number;
  triDistribution: {
    strong: { count: number; pct: number };
    developing: { count: number; pct: number };
    emerging: { count: number; pct: number };
  };
  byGrade: Record<string, number>;
  signalCount: number;
  signalPct: number;
  dimensionAverages: {
    reading: number;
    writing: number;
    reasoning: number;
    math: number;
    reflection: number;
    persistence: number;
    advocacy: number;
  };
  classStrengths: string[];
  classDeveloping: string[];
}

const DIM_LABELS: Record<string, string> = {
  reading: "Reading Interpretation",
  writing: "Written Expression",
  reasoning: "Reasoning & Problem Solving",
  math: "Mathematical Reasoning",
  reflection: "Reflection & Metacognition",
  persistence: "Task Persistence",
  advocacy: "Academic Self-Advocacy",
};

export function computeComposition(
  rows: CohortRowForComposition[]
): ClassComposition {
  const empty: ClassComposition = {
    total: 0,
    avgTri: 0,
    triDistribution: {
      strong: { count: 0, pct: 0 },
      developing: { count: 0, pct: 0 },
      emerging: { count: 0, pct: 0 },
    },
    byGrade: {},
    signalCount: 0,
    signalPct: 0,
    dimensionAverages: { reading: 0, writing: 0, reasoning: 0, math: 0, reflection: 0, persistence: 0, advocacy: 0 },
    classStrengths: [],
    classDeveloping: [],
  };

  if (!rows.length) return empty;

  const n = rows.length;
  const triScores = rows.map((r) => r.tri_score || 0);
  const avgTri = Math.round(triScores.reduce((a, b) => a + b, 0) / n);

  const strong = rows.filter((r) => (r.tri_score || 0) >= 75);
  const developing = rows.filter((r) => (r.tri_score || 0) >= 50 && (r.tri_score || 0) < 75);
  const emerging = rows.filter((r) => (r.tri_score || 0) < 50);

  const byGrade = rows.reduce((acc: Record<string, number>, r) => {
    const g = r.grade_band || "Unknown";
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {});

  const signalCount = rows.filter((r) => r.signal_count > 0).length;

  const avg = (fn: (r: CohortRowForComposition) => number) =>
    Math.round(rows.reduce((a, r) => a + fn(r), 0) / n);

  const dimensionAverages = {
    reading: avg((r) => r.reading_score || 0),
    writing: avg((r) => r.writing_score || 0),
    reasoning: avg((r) => r.reasoning_score || 0),
    math: avg((r) => r.math_score || 0),
    reflection: avg((r) => r.reflection_score || 0),
    persistence: avg((r) => r.persistence_score || 0),
    advocacy: avg((r) => r.support_seeking_score || 0),
  };

  const sorted = Object.entries(dimensionAverages).sort((a, b) => b[1] - a[1]);

  return {
    total: n,
    avgTri,
    triDistribution: {
      strong: { count: strong.length, pct: Math.round((strong.length / n) * 100) },
      developing: { count: developing.length, pct: Math.round((developing.length / n) * 100) },
      emerging: { count: emerging.length, pct: Math.round((emerging.length / n) * 100) },
    },
    byGrade,
    signalCount,
    signalPct: Math.round((signalCount / n) * 100),
    dimensionAverages,
    classStrengths: sorted.slice(0, 2).map(([k]) => DIM_LABELS[k]),
    classDeveloping: sorted.slice(-2).map(([k]) => DIM_LABELS[k]),
  };
}
