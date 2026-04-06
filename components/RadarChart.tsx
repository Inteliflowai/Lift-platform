"use client";

import { useEffect, useState } from "react";

type Props = {
  scores: Record<string, number>;
  benchmarks?: Record<string, number> | null;
};

const DIMS = [
  { key: "reading", label: "Reading" },
  { key: "writing", label: "Writing" },
  { key: "reasoning", label: "Reasoning" },
  { key: "reflection", label: "Reflection" },
  { key: "persistence", label: "Persistence" },
  { key: "support_seeking", label: "Support" },
];

const CX = 160;
const CY = 150;
const R = 110;
const GRID_LEVELS = [20, 40, 60, 80, 100];

function polarToXY(angle: number, value: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const r = (value / 100) * R;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function polygonPoints(values: number[]): string {
  return values
    .map((v, i) => {
      const angle = (360 / 6) * i;
      const { x, y } = polarToXY(angle, v);
      return `${x},${y}`;
    })
    .join(" ");
}

export function RadarChart({ scores, benchmarks }: Props) {
  const [scale, setScale] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    function animate(ts: number) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 600, 1);
      setScale(1 - Math.pow(1 - p, 3));
      if (p < 1) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  const candidateValues = DIMS.map((d) => (scores[d.key] ?? 0) * scale);
  const benchmarkValues = benchmarks
    ? DIMS.map((d) => benchmarks[`avg_${d.key}`] ?? 0)
    : null;

  return (
    <div className="hidden md:block">
      <svg width="320" height="320" viewBox="0 0 320 300">
        {/* Grid hexagons */}
        {GRID_LEVELS.map((level) => (
          <polygon
            key={level}
            points={polygonPoints(Array(6).fill(level))}
            fill="none"
            stroke="#e5e5e5"
            strokeWidth={1}
          />
        ))}

        {/* Axis lines */}
        {DIMS.map((_, i) => {
          const angle = (360 / 6) * i;
          const { x, y } = polarToXY(angle, 100);
          return (
            <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#e5e5e5" strokeWidth={1} />
          );
        })}

        {/* Benchmark polygon */}
        {benchmarkValues && (
          <polygon
            points={polygonPoints(benchmarkValues)}
            fill="rgba(245,158,11,0.1)"
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}

        {/* Candidate polygon */}
        <polygon
          points={polygonPoints(candidateValues)}
          fill="rgba(99,102,241,0.15)"
          stroke="#6366f1"
          strokeWidth={2}
        />

        {/* Score dots + labels */}
        {DIMS.map((dim, i) => {
          const angle = (360 / 6) * i;
          const val = candidateValues[i];
          const { x, y } = polarToXY(angle, val);
          const labelPt = polarToXY(angle, 115);
          const isHovered = hovered === dim.key;

          return (
            <g key={dim.key}>
              {/* Label */}
              <text
                x={labelPt.x}
                y={labelPt.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-[#6b7280]"
                style={{ fontSize: "11px", fontFamily: "var(--font-body)" }}
              >
                {dim.label}
              </text>
              {/* Dot */}
              <circle
                cx={x}
                cy={y}
                r={isHovered ? 7 : 5}
                fill="#6366f1"
                stroke="white"
                strokeWidth={2}
                onMouseEnter={() => setHovered(dim.key)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer", transition: "r 150ms ease" }}
              />
              {/* Tooltip */}
              {isHovered && (
                <g>
                  <rect
                    x={x - 36}
                    y={y - 28}
                    width={72}
                    height={22}
                    rx={6}
                    fill="#1a1a2e"
                  />
                  <text
                    x={x}
                    y={y - 14}
                    textAnchor="middle"
                    fill="white"
                    style={{ fontSize: "11px", fontFamily: "var(--font-geist-mono)" }}
                  >
                    {dim.label}: {Math.round(scores[dim.key] ?? 0)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#6366f1]" />
          Candidate
        </span>
        {benchmarks && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
            Cycle average
          </span>
        )}
      </div>
    </div>
  );
}
