"use client";

import { useState, useEffect, useMemo } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Tooltip } from "@/components/ui/Tooltip";
import { useTooltipContent } from "@/lib/tooltips/useTooltipContent";
import { useLicense } from "@/lib/licensing/context";
import { FEATURES } from "@/lib/licensing/features";
import { ClassBuilder } from "@/components/cohort/ClassBuilder";

interface CohortRow {
  candidate_id: string;
  session_id: string;
  first_name: string;
  last_name: string;
  grade_band: string;
  grade_applying_to: string;
  tri_score: number;
  reading_score: number;
  writing_score: number;
  reasoning_score: number;
  math_score: number;
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
  s >= 75 ? "#10b981" : s >= 50 ? "#14b8a6" : "#f59e0b";

const triLabel = (s: number) =>
  s >= 75 ? "Strong" : s >= 50 ? "Developing" : "Emerging";

const DIMS = [
  { key: "reading_score", label: "Reading" },
  { key: "writing_score", label: "Writing" },
  { key: "reasoning_score", label: "Reasoning" },
  { key: "math_score", label: "Math" },
  { key: "reflection_score", label: "Reflection" },
  { key: "persistence_score", label: "Persistence" },
  { key: "support_seeking_score", label: "Advocacy" },
] as const;

function getDimScore(row: CohortRow, key: string): number {
  return (row[key as keyof CohortRow] as number) || 0;
}

function getTopStrength(row: CohortRow): string {
  let topLabel: string = DIMS[0].label;
  let topScore = getDimScore(row, DIMS[0].key);
  for (const d of DIMS) {
    const score = getDimScore(row, d.key);
    if (score > topScore) {
      topScore = score;
      topLabel = d.label;
    }
  }
  return topLabel;
}

function DimensionSparkline({ row }: { row: CohortRow }) {
  const scores = DIMS.map((d) => getDimScore(row, d.key));
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
            background: score === max ? "#14b8a6" : "rgba(20,184,166,0.3)",
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
  useLocale(); // ensure locale context is available
  const TOOLTIPS = useTooltipContent();
  const { hasFeature } = useLicense();
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
  const [builderMode, setBuilderMode] = useState(false);
  const showBuilder = hasFeature(FEATURES.CLASS_BUILDER);
  const hasCoreAccess = hasFeature(FEATURES.CORE_BRIDGE);

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
        <div className="flex items-center gap-2">
          {/* Build Class button */}
          {showBuilder && cycleId && rows.length > 0 && !builderMode && (
            <button
              onClick={() => setBuilderMode(true)}
              className="rounded-lg bg-gradient-to-r from-[#0a1419] to-[#14b8a6] px-4 py-1.5 font-body text-[13px] font-bold text-white hover:opacity-90"
            >
              Build Class
            </button>
          )}
          {/* View toggle */}
          {!builderMode && (
            <div className="flex rounded-lg border border-[#2d2d3d] bg-[#0f0f13] p-[3px]">
              {(["table", "card"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-md px-3.5 py-1.5 font-body text-[13px] font-semibold transition-colors ${
                    view === v
                      ? "bg-[#14b8a6] text-white"
                      : "text-[#64748b] hover:text-[#a0a0c0]"
                  }`}
                >
                  {v === "table" ? "≡ Table" : "⊞ Cards"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Class Builder mode */}
      {builderMode && cycleId && (
        <ClassBuilder
          rows={rows}
          cycleId={cycleId}
          hasCoreAccess={hasCoreAccess}
          onClose={() => setBuilderMode(false)}
        />
      )}

      {/* Normal cohort view — hidden when builder mode active */}
      {!builderMode && <>
      {/* Insight banner */}
      {stats && stats.total > 0 && (
        <div className="mb-5 rounded-xl border border-[#2d2d3d] bg-[#1a1a24] px-5 py-4">
          <div className="flex items-center gap-4">
            {/* Key insight sentence */}
            <div className="flex-1">
              <p className="font-body text-[15px] font-medium text-[#e2e8f0]">
                <span className="font-mono font-bold text-[#14b8a6]">{stats.total}</span> candidate{stats.total !== 1 ? "s" : ""} completed
                {stats.withSignals > 0 ? (
                  <span>
                    {" — "}
                    <span className="font-bold text-[#f59e0b]">{stats.withSignals}</span>
                    {" "}ha{stats.withSignals !== 1 ? "ve" : "s"} support signals worth reviewing before your next committee meeting.
                  </span>
                ) : (
                  <span className="text-[#10b981]"> — no support signals detected. Your class looks clean.</span>
                )}
              </p>
              <div className="mt-1.5 flex items-center gap-4 font-body text-xs text-[#64748b]">
                <span>
                  Avg <Tooltip content={TOOLTIPS.cohort_tri_avg} mode="inline">TRI</Tooltip>:{" "}
                  <span className="font-mono font-bold" style={{ color: triColor(stats.avgTri) }}>{stats.avgTri}</span>
                </span>
                <span className="text-[#10b981]">{stats.triDistribution.strong} strong</span>
                <span className="text-[#14b8a6]">{stats.triDistribution.developing} developing</span>
                <span className="text-[#f59e0b]">{stats.triDistribution.emerging} emerging</span>
                {Object.entries(stats.byGrade).map(([g, n]) => (
                  <span key={g} className="text-[#64748b]">Grade {g}: {n}</span>
                ))}
              </div>
            </div>
          </div>
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
          <option value="6-7">Grades 6-7</option>
          <option value="8">Grade 8</option>
          <option value="9-11">Grades 9-11</option>
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
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#14b8a6] border-t-transparent" />
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
                  <th className="px-4 py-3 text-left font-body text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Candidate</th>
                  <th className="px-4 py-3 text-left font-body text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                    TRI <Tooltip content={TOOLTIPS.tri_score} />
                  </th>
                  <th className="px-4 py-3 text-left font-body text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Dimensions</th>
                  <th className="px-4 py-3 text-left font-body text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Top Strength</th>
                  <th className="px-4 py-3 text-left font-body text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                    Signals <Tooltip content={TOOLTIPS.cohort_signals} />
                  </th>
                  <th className="px-4 py-3 text-left font-body text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Completion</th>
                  <th className="px-4 py-3 text-left font-body text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Date</th>
                  <th className="px-4 py-3"></th>
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
                              Grade {r.grade_applying_to}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <MiniTRIGauge score={r.tri_score} />
                          <span
                            className="font-body text-[10px] font-bold uppercase"
                            style={{ color }}
                          >
                            {triLabel(r.tri_score)}
                          </span>
                        </div>
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
                          className="font-body text-xs font-semibold text-[#14b8a6] no-underline hover:text-[#2dd4bf]"
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
                      Grade {r.grade_applying_to}
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
                  <span className="rounded-full bg-[rgba(20,184,166,0.1)] px-2.5 py-0.5 font-body text-[11px] font-semibold text-[#5eead4]">
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
                  className="mt-3.5 block rounded-lg border border-[rgba(20,184,166,0.2)] bg-[rgba(20,184,166,0.08)] py-2 text-center font-body text-[13px] font-semibold text-[#5eead4] no-underline hover:bg-[rgba(20,184,166,0.15)]"
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
      </>}
    </div>
  );
}
