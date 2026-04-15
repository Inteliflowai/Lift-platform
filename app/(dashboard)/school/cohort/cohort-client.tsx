"use client";

import { useState, useEffect, useMemo } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface CohortRow {
  candidate_id: string;
  session_id: string;
  first_name: string;
  last_name: string;
  grade_band: string;
  tri_score: number;
  reading_score: number;
  writing_score: number;
  reasoning_score: number;
  reflection_score: number;
  persistence_score: number;
  support_seeking_score: number;
  completion_pct: number;
  completed_at: string;
  signal_count: number;
  support_level: string;
}

interface CohortStats {
  total: number;
  avgTri: number;
  withSignals: number;
  byGrade: Record<string, number>;
  triDistribution: { strong: number; developing: number; emerging: number };
}

interface Cycle {
  id: string;
  name: string;
  status: string;
}

const triColor = (s: number) =>
  s >= 75 ? "#10b981" : s >= 50 ? "#6366f1" : "#f59e0b";

const triLabel = (s: number) =>
  s >= 75 ? "Strong" : s >= 50 ? "Developing" : "Emerging";

const DIMS = [
  { key: "reading_score", label: "Reading" },
  { key: "writing_score", label: "Writing" },
  { key: "reasoning_score", label: "Reasoning" },
  { key: "reflection_score", label: "Reflection" },
  { key: "persistence_score", label: "Persistence" },
  { key: "support_seeking_score", label: "Advocacy" },
] as const;

function getTopStrength(row: CohortRow): string {
  let topLabel: string = DIMS[0].label;
  let topScore = (row as any)[DIMS[0].key] || 0;
  for (const d of DIMS) {
    const score = (row as any)[d.key] || 0;
    if (score > topScore) {
      topScore = score;
      topLabel = d.label;
    }
  }
  return topLabel;
}

function DimensionSparkline({ row }: { row: CohortRow }) {
  const scores = DIMS.map((d) => (row as any)[d.key] || 0);
  const max = Math.max(...scores);
  return (
    <div className="flex items-end gap-[2px]" style={{ height: 24 }}>
      {scores.map((score, i) => (
        <div
          key={i}
          title={DIMS[i].label}
          style={{
            width: 6,
            height: Math.max(3, (score / 100) * 24),
            background: score === max ? "#6366f1" : "rgba(99,102,241,0.3)",
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}

function MiniTRIGauge({ score }: { score: number }) {
  const color = triColor(score);
  const r = 18,
    cx = 22,
    cy = 22;
  const startAngle = -210,
    endAngle = 30;
  const totalDeg = endAngle - startAngle;
  const pct = score / 100;
  const angle = startAngle + totalDeg * pct;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(angle));
  const y2 = cy + r * Math.sin(toRad(angle));
  const large = totalDeg * pct > 180 ? 1 : 0;
  const bgX2 = cx + r * Math.cos(toRad(endAngle));
  const bgY2 = cy + r * Math.sin(toRad(endAngle));

  return (
    <div className="relative" style={{ width: 44, height: 44 }}>
      <svg width="44" height="44" viewBox="0 0 44 44">
        <path
          d={`M ${x1} ${y1} A ${r} ${r} 0 1 1 ${bgX2} ${bgY2}`}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {score > 0 && (
          <path
            d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-mono text-xs font-bold"
          style={{ color }}
        >
          {score}
        </span>
      </div>
    </div>
  );
}

export function CohortClient() {
  const { t } = useLocale();
  const [rows, setRows] = useState<CohortRow[]>([]);
  const [stats, setStats] = useState<CohortStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"table" | "card">("table");
  const [sort, setSort] = useState("tri_desc");
  const [gradeFilter, setGradeFilter] = useState("");
  const [flagFilter, setFlagFilter] = useState("");
  const [search, setSearch] = useState("");
  const [cycleId, setCycleId] = useState("");
  const [cycles, setCycles] = useState<Cycle[]>([]);

  // Load cycles on mount
  useEffect(() => {
    fetch("/api/school/cohort")
      .then((r) => r.json())
      .then((data) => {
        setCycles(data.cycles ?? []);
        // Auto-select first active cycle
        const active = (data.cycles ?? []).find(
          (c: Cycle) => c.status === "active"
        );
        if (active) setCycleId(active.id);
        else if (data.cycles?.length) setCycleId(data.cycles[0].id);
      });
  }, []);

  // Load cohort data when filters change
  useEffect(() => {
    if (!cycleId) return;
    setLoading(true);
    const params = new URLSearchParams({ cycleId, sort });
    if (gradeFilter) params.set("grade", gradeFilter);
    if (flagFilter) params.set("flag", flagFilter);

    fetch(`/api/school/cohort?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data.sessions ?? []);
        setStats(data.stats ?? null);
      })
      .finally(() => setLoading(false));
  }, [cycleId, sort, gradeFilter, flagFilter]);

  // Client-side name search
  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const name = `${r.first_name} ${r.last_name}`.toLowerCase();
      return name.includes(q);
    });
  }, [rows, search]);

  return (
    <div className="mx-auto max-w-[1400px] p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-[28px] font-bold text-[#e2e8f0]">
            Cohort View
          </h1>
          <p className="mt-1 font-body text-sm text-[#64748b]">
            All candidates in this admissions cycle — ranked and compared
          </p>
        </div>
        {/* View toggle */}
        <div className="flex rounded-lg border border-[#2d2d3d] bg-[#0f0f13] p-[3px]">
          {(["table", "card"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3.5 py-1.5 font-body text-[13px] font-semibold transition-colors ${
                view === v
                  ? "bg-[#6366f1] text-white"
                  : "text-[#64748b] hover:text-[#a0a0c0]"
              }`}
            >
              {v === "table" ? "≡ Table" : "⊞ Cards"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      {stats && stats.total > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            {
              label: "Total Candidates",
              val: stats.total,
              color: "#6366f1",
            },
            {
              label: "Average TRI",
              val: stats.avgTri,
              color: triColor(stats.avgTri),
            },
            {
              label: "Strong ≥ 75",
              val: `${stats.triDistribution.strong} (${stats.total > 0 ? Math.round((stats.triDistribution.strong / stats.total) * 100) : 0}%)`,
              color: "#10b981",
            },
            {
              label: "With Signals",
              val: stats.withSignals,
              color: stats.withSignals > 0 ? "#f59e0b" : "#10b981",
            },
            {
              label: "Developing",
              val: stats.triDistribution.developing,
              color: "#6366f1",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border bg-[#1a1a24] p-3.5 text-center"
              style={{ borderColor: `${s.color}25` }}
            >
              <div
                className="font-mono text-2xl font-bold leading-none"
                style={{ color: s.color }}
              >
                {s.val}
              </div>
              <div className="mt-1 font-body text-[11px] text-[#64748b]">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-2.5">
        <select
          value={cycleId}
          onChange={(e) => setCycleId(e.target.value)}
          className="rounded-lg border border-[#2d2d3d] bg-[#0f0f13] px-3 py-2 font-body text-[13px] text-[#e2e8f0] outline-none"
        >
          <option value="">Select cycle...</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="rounded-lg border border-[#2d2d3d] bg-[#0f0f13] px-3 py-2 font-body text-[13px] text-[#e2e8f0] outline-none"
        >
          <option value="">All Grades</option>
          <option value="6-7">Grade 6-7</option>
          <option value="8">Grade 8</option>
          <option value="9-11">Grade 9-11</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-lg border border-[#2d2d3d] bg-[#0f0f13] px-3 py-2 font-body text-[13px] text-[#e2e8f0] outline-none"
        >
          <option value="tri_desc">TRI High → Low</option>
          <option value="tri_asc">TRI Low → High</option>
          <option value="name_asc">Name A → Z</option>
          <option value="grade">By Grade</option>
          <option value="signals">Signals First</option>
        </select>
        <select
          value={flagFilter}
          onChange={(e) => setFlagFilter(e.target.value)}
          className="rounded-lg border border-[#2d2d3d] bg-[#0f0f13] px-3 py-2 font-body text-[13px] text-[#e2e8f0] outline-none"
        >
          <option value="">All Candidates</option>
          <option value="signals">Has Signals</option>
          <option value="strong">Strong ≥ 75</option>
          <option value="emerging">Emerging &lt; 50</option>
        </select>
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] rounded-lg border border-[#2d2d3d] bg-[#0f0f13] px-3 py-2 font-body text-[13px] text-[#e2e8f0] outline-none placeholder:text-[#4a4a5a]"
        />
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#6366f1] border-t-transparent" />
        </div>
      )}

      {/* No cycle selected */}
      {!cycleId && !loading && (
        <div className="rounded-xl border border-[#2d2d3d] bg-[#1a1a24] p-16 text-center font-body text-[#64748b]">
          Select an admissions cycle to view the cohort.
        </div>
      )}

      {/* Table View */}
      {!loading && cycleId && view === "table" && (
        <div className="overflow-hidden rounded-xl border border-[#2d2d3d] bg-[#1a1a24]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#2d2d3d]">
                  {[
                    "Candidate",
                    "TRI",
                    "Dimensions",
                    "Top Strength",
                    "Signals",
                    "Completion",
                    "Date",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-body text-[11px] font-bold uppercase tracking-wider text-[#64748b]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const name = `${r.first_name} ${r.last_name}`;
                  const color = triColor(r.tri_score);
                  const initials = `${r.first_name?.[0] ?? ""}${r.last_name?.[0] ?? ""}`;
                  return (
                    <tr
                      key={r.candidate_id}
                      className={
                        i < filtered.length - 1
                          ? "border-b border-white/[0.04]"
                          : ""
                      }
                      style={{
                        background:
                          r.signal_count > 0
                            ? "rgba(245,158,11,0.04)"
                            : "transparent",
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-body text-xs font-bold"
                            style={{
                              background: `${color}25`,
                              color,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="font-body text-sm font-semibold text-[#e2e8f0]">
                              {name}
                            </div>
                            <div className="font-body text-[11px] text-[#64748b]">
                              Grade {r.grade_band}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <MiniTRIGauge score={r.tri_score} />
                      </td>
                      <td className="px-4 py-3">
                        <DimensionSparkline row={r} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded-full px-2.5 py-0.5 font-body text-xs font-semibold"
                          style={{
                            background: `${color}15`,
                            color,
                          }}
                        >
                          {getTopStrength(r)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.signal_count > 0 ? (
                          <span className="rounded-full border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.12)] px-2.5 py-0.5 font-body text-xs font-bold text-[#f59e0b]">
                            ⚠ {r.signal_count}
                          </span>
                        ) : (
                          <span className="font-body text-xs text-[#10b981]">
                            ✓ Clear
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[13px] text-[#94a3b8]">
                          {r.completion_pct}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-body text-xs text-[#64748b]">
                          {r.completed_at
                            ? new Date(r.completed_at).toLocaleDateString(
                                "en-US",
                                { month: "short", day: "numeric" }
                              )
                            : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`/evaluator/candidates/${r.candidate_id}`}
                          className="font-body text-xs font-semibold text-[#6366f1] no-underline hover:text-[#818cf8]"
                        >
                          View →
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && !loading && (
            <div className="p-10 text-center font-body text-[#64748b]">
              No candidates match your filters.
            </div>
          )}
        </div>
      )}

      {/* Card View */}
      {!loading && cycleId && view === "card" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => {
            const name = `${r.first_name} ${r.last_name}`;
            const color = triColor(r.tri_score);
            const initials = `${r.first_name?.[0] ?? ""}${r.last_name?.[0] ?? ""}`;
            return (
              <div
                key={r.candidate_id}
                className="rounded-xl border bg-[#1a1a24] p-5 transition-colors"
                style={{
                  borderColor:
                    r.signal_count > 0
                      ? "rgba(245,158,11,0.3)"
                      : "#2d2d3d",
                }}
              >
                <div className="mb-3.5 flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-body text-sm font-bold"
                    style={{ background: `${color}25`, color }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-body text-[15px] font-bold text-[#e2e8f0]">
                      {name}
                    </div>
                    <div className="font-body text-[11px] text-[#64748b]">
                      Grade {r.grade_band}
                    </div>
                  </div>
                  <MiniTRIGauge score={r.tri_score} />
                </div>

                <div className="mb-3 flex flex-wrap gap-1.5">
                  <span
                    className="rounded-full px-2.5 py-0.5 font-body text-[11px] font-semibold"
                    style={{ background: `${color}15`, color }}
                  >
                    {triLabel(r.tri_score)}
                  </span>
                  <span className="rounded-full bg-[rgba(99,102,241,0.1)] px-2.5 py-0.5 font-body text-[11px] font-semibold text-[#a5b4fc]">
                    ✦ {getTopStrength(r)}
                  </span>
                  {r.signal_count > 0 && (
                    <span className="rounded-full border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.12)] px-2.5 py-0.5 font-body text-[11px] font-bold text-[#f59e0b]">
                      ⚠ Signals
                    </span>
                  )}
                </div>

                <DimensionSparkline row={r} />

                <a
                  href={`/evaluator/candidates/${r.candidate_id}`}
                  className="mt-3.5 block rounded-lg border border-[rgba(99,102,241,0.2)] bg-[rgba(99,102,241,0.08)] py-2 text-center font-body text-[13px] font-semibold text-[#a5b4fc] no-underline hover:bg-[rgba(99,102,241,0.15)]"
                >
                  View Profile →
                </a>
              </div>
            );
          })}
          {filtered.length === 0 && !loading && (
            <div className="col-span-full p-10 text-center font-body text-[#64748b]">
              No candidates match your filters.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
