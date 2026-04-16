"use client";

import { useState, useMemo } from "react";
import { useToast } from "@/components/ui/Toast";
import { Tooltip } from "@/components/ui/Tooltip";
import { TOOLTIPS } from "@/lib/tooltips/content";
import {
  computeComposition,
  type CohortRowForComposition,
  type ClassComposition,
} from "@/lib/cohort/computeComposition";

interface ClassBuilderProps {
  rows: CohortRowForComposition[];
  cycleId: string;
  hasCoreAccess: boolean;
  onClose: () => void;
}

const triColor = (n: number) =>
  n >= 75 ? "#10b981" : n >= 50 ? "#6366f1" : "#f59e0b";

const DIMS = [
  { key: "reading", label: "Reading" },
  { key: "writing", label: "Writing" },
  { key: "reasoning", label: "Reasoning" },
  { key: "math", label: "Math" },
  { key: "reflection", label: "Reflection" },
  { key: "persistence", label: "Persistence" },
  { key: "advocacy", label: "Advocacy" },
] as const;

export function ClassBuilder({ rows, cycleId, hasCoreAccess, onClose }: ClassBuilderProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const { toast } = useToast();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.candidate_id)));
  }

  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(r.candidate_id)),
    [rows, selected]
  );

  const comp: ClassComposition = useMemo(
    () => computeComposition(selectedRows),
    [selectedRows]
  );

  async function saveDraft() {
    setSaving(true);
    try {
      const res = await fetch("/api/school/cohort/composition", {
        method: savedId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          composition_id: savedId,
          cycle_id: cycleId,
          name: "Incoming Class Draft",
          candidate_ids: Array.from(selected),
          composition_snapshot: comp,
        }),
      });
      const { composition: saved } = await res.json();
      if (saved?.id) setSavedId(saved.id);
      toast("Draft saved");
    } catch {
      toast("Failed to save draft", "error");
    } finally {
      setSaving(false);
    }
  }

  async function confirmClass() {
    setSaving(true);
    try {
      await fetch("/api/school/cohort/composition", {
        method: savedId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          composition_id: savedId,
          cycle_id: cycleId,
          name: "Incoming Class",
          status: "confirmed",
          candidate_ids: Array.from(selected),
          composition_snapshot: comp,
        }),
      });
      toast("Incoming class confirmed");
      setConfirmModal(false);
    } catch {
      toast("Failed to confirm class", "error");
    } finally {
      setSaving(false);
    }
  }

  function exportCSV() {
    const header = ["Name", "Grade", "TRI", "Reading", "Writing", "Reasoning", "Reflection", "Persistence", "Advocacy", "Signals"];
    const csvRows = selectedRows.map((r) => [
      `"${r.first_name} ${r.last_name}"`,
      r.grade_band,
      r.tri_score,
      r.reading_score,
      r.writing_score,
      r.reasoning_score,
      r.reflection_score,
      r.persistence_score,
      r.support_seeking_score,
      r.signal_count > 0 ? "Yes" : "No",
    ]);
    const csv = [header, ...csvRows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "incoming-class.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast("CSV exported");
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[3fr_2fr]">
      {/* Left: Candidate selection */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={selected.size === rows.length && rows.length > 0}
              onChange={toggleAll}
              className="h-4 w-4 rounded accent-primary"
            />
            <span className="font-body text-[13px] text-[#94a3b8]">
              {selected.size > 0
                ? `${selected.size} of ${rows.length} selected`
                : "Select candidates for your incoming class"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-[#2d2d3d] px-3.5 py-1.5 font-body text-[13px] text-[#64748b] hover:text-[#a0a0c0]"
          >
            Exit Builder
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#2d2d3d] bg-[#1a1a24]">
          <table className="w-full border-collapse">
            <tbody>
              {rows.map((r, i) => {
                const isSelected = selected.has(r.candidate_id);
                const color = triColor(r.tri_score);
                const initials = `${r.first_name?.[0] ?? ""}${r.last_name?.[0] ?? ""}`;
                return (
                  <tr
                    key={r.candidate_id}
                    onClick={() => toggle(r.candidate_id)}
                    className={`cursor-pointer transition-colors ${
                      i < rows.length - 1 ? "border-b border-white/[0.04]" : ""
                    } ${isSelected ? "bg-[rgba(99,102,241,0.08)]" : "hover:bg-white/[0.02]"}`}
                  >
                    <td className="w-10 px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="h-[15px] w-[15px] rounded accent-primary"
                      />
                    </td>
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full font-body text-[11px] font-bold"
                          style={{ background: `${color}25`, color }}
                        >
                          {initials}
                        </div>
                        <div>
                          <div className="font-body text-[13px] font-semibold text-[#e2e8f0]">
                            {r.first_name} {r.last_name}
                          </div>
                          <div className="font-body text-[11px] text-[#64748b]">
                            Grade {r.grade_applying_to || r.grade_band}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="font-mono text-[16px] font-bold" style={{ color }}>
                        {r.tri_score}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {r.signal_count > 0 && (
                        <span className="font-body text-[11px] text-[#f59e0b]">⚠</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right: Live composition */}
      <div className="sticky top-20 space-y-3">
        {selected.size === 0 ? (
          <div className="rounded-xl border border-[#2d2d3d] bg-[#1a1a24] px-6 py-12 text-center">
            <div className="mb-3 text-[32px]">☑</div>
            <p className="font-body text-sm leading-relaxed text-[#64748b]">
              Select candidates on the left to see your class composition update live
            </p>
          </div>
        ) : (
          <>
            {/* At a Glance */}
            <div className="rounded-xl border border-[#2d2d3d] bg-[#1a1a24] p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-primary">
                Class at a Glance
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <div
                  className="rounded-lg border p-2.5 text-center"
                  style={{ borderColor: "#6366f125", background: "#6366f110" }}
                >
                  <div className="font-mono text-[26px] font-bold leading-none text-primary">
                    {comp.total}
                  </div>
                  <div className="mt-1 font-body text-[11px] text-[#64748b]">Students</div>
                </div>
                <div
                  className="rounded-lg border p-2.5 text-center"
                  style={{
                    borderColor: `${triColor(comp.avgTri)}25`,
                    background: `${triColor(comp.avgTri)}10`,
                  }}
                >
                  <div
                    className="font-mono text-[26px] font-bold leading-none"
                    style={{ color: triColor(comp.avgTri) }}
                  >
                    {comp.avgTri}
                  </div>
                  <div className="mt-1 font-body text-[11px] text-[#64748b]">
                    Avg <Tooltip content={TOOLTIPS.tri_score} mode="inline">TRI</Tooltip>
                  </div>
                </div>
              </div>
            </div>

            {/* TRI Distribution */}
            <div className="rounded-xl border border-[#2d2d3d] bg-[#1a1a24] p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-primary">
                Readiness Distribution
              </p>
              {(
                [
                  { key: "strong", label: "Strong ≥ 75", color: "#10b981" },
                  { key: "developing", label: "Developing 50-74", color: "#6366f1" },
                  { key: "emerging", label: "Emerging < 50", color: "#f59e0b" },
                ] as const
              ).map((band) => {
                const d = comp.triDistribution[band.key];
                return (
                  <div key={band.key} className="mb-2.5 last:mb-0">
                    <div className="mb-1 flex justify-between">
                      <span className="font-body text-xs text-[#94a3b8]">{band.label}</span>
                      <span className="font-mono text-xs" style={{ color: band.color }}>
                        {d.count} ({d.pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${d.pct}%`, background: band.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* By Grade */}
            {Object.keys(comp.byGrade).length > 1 && (
              <div className="rounded-xl border border-[#2d2d3d] bg-[#1a1a24] p-4">
                <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                  By Grade
                </p>
                {Object.entries(comp.byGrade)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([grade, count]) => (
                    <div key={grade} className="mb-1 flex justify-between last:mb-0">
                      <span className="font-body text-xs text-[#94a3b8]">Grade {grade}</span>
                      <span className="font-mono text-xs text-[#a5b4fc]">{count}</span>
                    </div>
                  ))}
              </div>
            )}

            {/* Dimension Profile */}
            <div className="rounded-xl border border-[#2d2d3d] bg-[#1a1a24] p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-primary">
                Class Dimension Profile
              </p>
              {DIMS.map((d) => {
                const score = comp.dimensionAverages[d.key as keyof typeof comp.dimensionAverages] || 0;
                const c = triColor(score);
                const isStrength = comp.classStrengths.some((s) =>
                  s.toLowerCase().includes(d.label.toLowerCase())
                );
                return (
                  <div key={d.key} className="mb-1.5 last:mb-0">
                    <div className="mb-0.5 flex justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-body text-[11px] text-[#94a3b8]">{d.label}</span>
                        {isStrength && (
                          <span className="font-body text-[9px] font-bold text-success">
                            ✦ STRENGTH
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px]" style={{ color: c }}>
                        {score}
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${score}%`, background: c }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Support load */}
            {comp.signalCount > 0 && (
              <div className="rounded-xl border border-warning/25 border-l-[3px] border-l-warning bg-warning/[0.04] p-3.5">
                <p className="font-body text-[13px] leading-relaxed text-[#fbbf24]">
                  ⚠ <strong>{comp.signalCount} student{comp.signalCount !== 1 ? "s" : ""}</strong>{" "}
                  ({comp.signalPct}%) in this selection have learning support signals.
                  Ensure your learning support team has capacity before enrollment.
                </p>
              </div>
            )}

            {/* CORE Preview */}
            <div
              className={`rounded-xl border bg-[#1a1a24] p-4 ${
                hasCoreAccess ? "border-success/30" : "border-[#2d2d3d]"
              }`}
            >
              <p
                className={`mb-2 text-[10px] font-bold uppercase tracking-widest ${
                  hasCoreAccess ? "text-success" : "text-[#64748b]"
                }`}
              >
                CORE Readiness Preview
              </p>
              {hasCoreAccess ? (
                <p className="font-body text-xs leading-relaxed text-[#64748b]">
                  When you confirm this class, students will be pushed to CORE
                  with predicted mastery bands and learning styles.
                </p>
              ) : (
                <div>
                  <p className="mb-2 font-body text-xs leading-relaxed text-[#64748b]">
                    See how this class would be profiled in CORE — predicted
                    mastery bands and learning styles before day one.
                  </p>
                  <a
                    href="/school/settings/subscription"
                    className="font-body text-xs font-semibold text-primary no-underline hover:underline"
                  >
                    Add CORE to your plan →
                  </a>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={saveDraft}
                disabled={saving}
                className="flex-1 rounded-lg border border-primary/30 bg-primary/10 py-2.5 font-body text-[13px] font-semibold text-[#a5b4fc] hover:bg-primary/15 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button
                onClick={exportCSV}
                className="flex-1 rounded-lg border border-[#2d2d3d] py-2.5 font-body text-[13px] font-semibold text-[#64748b] hover:text-[#a0a0c0]"
              >
                Export CSV
              </button>
            </div>
            <button
              onClick={() => setConfirmModal(true)}
              disabled={selected.size === 0}
              className="w-full rounded-lg bg-gradient-to-r from-[#2b1460] to-[#6366f1] py-3 font-body text-sm font-bold text-white disabled:opacity-40"
            >
              ✓ Confirm Incoming Class ({selected.size})
            </button>
          </>
        )}

        {/* Confirm modal */}
        {confirmModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-[400px] rounded-2xl border border-primary/30 bg-[#1a1a24] p-8 text-center">
              <h3 className="font-display text-[22px] font-bold text-[#e2e8f0]">
                Confirm Incoming Class?
              </h3>
              <p className="mx-auto mt-3 max-w-[320px] font-body text-sm leading-relaxed text-[#94a3b8]">
                You are confirming{" "}
                <strong className="text-[#e2e8f0]">{selected.size} candidates</strong> as
                your incoming class. This will save the final composition and make it
                available for support plan generation.
              </p>
              <div className="mt-6 flex gap-2.5">
                <button
                  onClick={() => setConfirmModal(false)}
                  className="flex-1 rounded-lg border border-[#2d2d3d] py-2.5 font-body text-sm text-[#64748b] hover:text-[#a0a0c0]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClass}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-gradient-to-r from-[#2b1460] to-[#6366f1] py-2.5 font-body text-sm font-bold text-white disabled:opacity-50"
                >
                  {saving ? "Confirming..." : "Confirm Class"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
