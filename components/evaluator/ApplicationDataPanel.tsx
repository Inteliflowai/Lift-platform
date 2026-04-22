"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { Tooltip } from "@/components/ui/Tooltip";
import { useTooltipContent } from "@/lib/tooltips/useTooltipContent";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { ClipboardList } from "lucide-react";

interface ApplicationData {
  gpa_current?: number | null;
  gpa_trend?: string | null;
  current_school?: string | null;
  isee_score?: number | null;
  isee_percentile?: number | null;
  ssat_score?: number | null;
  ssat_percentile?: number | null;
  other_test_name?: string | null;
  other_test_score?: string | null;
  teacher_rec_1_sentiment?: string | null;
  teacher_rec_1_notes?: string | null;
  teacher_rec_2_sentiment?: string | null;
  teacher_rec_2_notes?: string | null;
  counselor_rec_sentiment?: string | null;
  counselor_rec_notes?: string | null;
  interview_notes?: string | null;
  application_complete?: boolean;
  financial_aid_applicant?: boolean;
  sis_source?: string | null;
  sis_last_synced_at?: string | null;
}

interface Props {
  candidateId: string;
  cycleId?: string | null;
  triScore: number;
  triLabel: string | null;
  signalCount: number;
  completionPct: number;
  gradeBand: string;
}

const SENTIMENT_COLORS: Record<string, string> = {
  strong: "text-success",
  positive: "text-primary",
  neutral: "text-muted",
  mixed: "text-warning",
};

export function ApplicationDataPanel({
  candidateId,
  cycleId,
  triScore,
  triLabel: triLbl,
  signalCount,
  completionPct,
  gradeBand,
}: Props) {
  const TOOLTIPS = useTooltipContent();
  const { t } = useLocale();
  const [data, setData] = useState<ApplicationData>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch(`/api/school/candidates/application-data?candidate_id=${candidateId}`)
      .then((r) => r.json())
      .then(({ data: appData }) => {
        if (appData) {
          setData(appData);
          setHasData(true);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [candidateId]);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/school/candidates/application-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: candidateId,
          cycle_id: cycleId || null,
          ...data,
        }),
      });
      setHasData(true);
      toast(t("common.success"));
    } catch {
      toast(t("common.save_failed"), "error");
    } finally {
      setSaving(false);
    }
  }

  const triColor =
    triScore >= 75
      ? "text-success"
      : triScore >= 50
        ? "text-primary"
        : "text-warning";

  const isSynced = data.sis_source && data.sis_source !== "manual";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Empty state — show when no data has been entered yet
  if (!loading && !hasData) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-lift-border bg-surface py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <ClipboardList size={28} className="text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-lift-text">No application data yet</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Add GPA, test scores, and teacher recommendations here to see everything alongside LIFT session data — one view for the committee.
        </p>
        <button
          onClick={() => setHasData(true)}
          className="mt-5 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Add Application Data
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      {/* Left: LIFT summary */}
      <div className="h-fit space-y-4 rounded-lg border border-lift-border bg-surface p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
          LIFT Summary
        </p>

        <div className="text-center">
          <div className={`font-mono text-4xl font-bold ${triColor}`}>
            {triScore}
          </div>
          <div className={`text-xs font-bold ${triColor}`}>
            {triLbl || "TRI Score"}
          </div>
        </div>

        {signalCount > 0 && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-2.5">
            <p className="text-xs font-medium text-warning">
              ⚠ {signalCount} support signal{signalCount > 1 ? "s" : ""}
            </p>
          </div>
        )}

        <div className="space-y-1 text-xs text-muted">
          <div>
            Completion: <span className="font-medium text-lift-text">{completionPct}%</span>
          </div>
          <div>
            Grade Band: <span className="font-medium text-lift-text">{gradeBand}</span>
          </div>
        </div>

        {isSynced && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5">
            <p className="text-xs font-medium text-primary">
              ⟳ Synced from {data.sis_source}
            </p>
            {data.sis_last_synced_at && (
              <p className="mt-0.5 text-[10px] text-muted">
                {new Date(data.sis_last_synced_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Right: Application data form */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
            Application Data
          </p>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

        {/* Academic */}
        <div className="rounded-lg border border-lift-border bg-surface p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted">
            Academic
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="GPA">
              <input
                type="number"
                step="0.01"
                min="0"
                max="5"
                value={data.gpa_current ?? ""}
                onChange={(e) =>
                  setData({ ...data, gpa_current: e.target.value ? parseFloat(e.target.value) : null })
                }
                placeholder="e.g. 3.75"
                className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
                readOnly={!!isSynced}
              />
            </Field>
            <Field label="GPA Trend">
              <select
                value={data.gpa_trend || ""}
                onChange={(e) =>
                  setData({ ...data, gpa_trend: e.target.value || null })
                }
                className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
              >
                <option value="">Select...</option>
                <option value="improving">Improving</option>
                <option value="stable">Stable</option>
                <option value="declining">Declining</option>
              </select>
            </Field>
            <Field label="Current School">
              <input
                type="text"
                value={data.current_school || ""}
                onChange={(e) =>
                  setData({ ...data, current_school: e.target.value })
                }
                placeholder="School name"
                className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
                readOnly={!!isSynced}
              />
            </Field>
          </div>
        </div>

        {/* Standardized Tests */}
        <div className="rounded-lg border border-lift-border bg-surface p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted">
            Standardized Tests
          </p>
          <div className="grid grid-cols-4 gap-3">
            <Field label="ISEE Score">
              <input
                type="number"
                value={data.isee_score ?? ""}
                onChange={(e) =>
                  setData({ ...data, isee_score: e.target.value ? parseInt(e.target.value) : null })
                }
                placeholder="200-900"
                className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
                readOnly={!!isSynced}
              />
            </Field>
            <Field label="ISEE %ile">
              <input
                type="number"
                value={data.isee_percentile ?? ""}
                onChange={(e) =>
                  setData({ ...data, isee_percentile: e.target.value ? parseInt(e.target.value) : null })
                }
                placeholder="0-99"
                className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
                readOnly={!!isSynced}
              />
            </Field>
            <Field label="SSAT Score">
              <input
                type="number"
                value={data.ssat_score ?? ""}
                onChange={(e) =>
                  setData({ ...data, ssat_score: e.target.value ? parseInt(e.target.value) : null })
                }
                className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
                readOnly={!!isSynced}
              />
            </Field>
            <Field label="SSAT %ile">
              <input
                type="number"
                value={data.ssat_percentile ?? ""}
                onChange={(e) =>
                  setData({ ...data, ssat_percentile: e.target.value ? parseInt(e.target.value) : null })
                }
                placeholder="0-99"
                className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
                readOnly={!!isSynced}
              />
            </Field>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Other Test Name">
              <input
                type="text"
                value={data.other_test_name || ""}
                onChange={(e) =>
                  setData({ ...data, other_test_name: e.target.value })
                }
                placeholder="e.g. ERB, MAP"
                className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
              />
            </Field>
            <Field label="Other Test Score">
              <input
                type="text"
                value={data.other_test_score || ""}
                onChange={(e) =>
                  setData({ ...data, other_test_score: e.target.value })
                }
                className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
              />
            </Field>
          </div>
        </div>

        {/* Recommendations */}
        <div className="rounded-lg border border-lift-border bg-surface p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted">
            Recommendations <Tooltip content={TOOLTIPS.recommendation_sentiment} />
          </p>
          {(
            [
              { key: "teacher_rec_1", label: "Teacher Rec 1" },
              { key: "teacher_rec_2", label: "Teacher Rec 2" },
              { key: "counselor_rec", label: "Counselor Rec" },
            ] as const
          ).map((rec) => {
            const sentKey = `${rec.key}_sentiment` as keyof ApplicationData;
            const noteKey = `${rec.key}_notes` as keyof ApplicationData;
            const sentiment = (data[sentKey] as string) || "";
            return (
              <div key={rec.key} className="mb-3 grid grid-cols-[160px_1fr] gap-3 last:mb-0">
                <Field label={rec.label}>
                  <select
                    value={sentiment}
                    onChange={(e) =>
                      setData({ ...data, [sentKey]: e.target.value || null })
                    }
                    className={`w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary ${
                      SENTIMENT_COLORS[sentiment] || "text-muted"
                    }`}
                  >
                    <option value="">No rec yet</option>
                    <option value="strong">Strong</option>
                    <option value="positive">Positive</option>
                    <option value="neutral">Neutral</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </Field>
                <Field label="Notes">
                  <input
                    type="text"
                    value={(data[noteKey] as string) || ""}
                    onChange={(e) =>
                      setData({ ...data, [noteKey]: e.target.value })
                    }
                    placeholder="Key observations from rec..."
                    className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
                  />
                </Field>
              </div>
            );
          })}
        </div>

        {/* Interview Notes */}
        <div className="rounded-lg border border-lift-border bg-surface p-4">
          <Field label="Interview Notes">
            <textarea
              value={data.interview_notes || ""}
              onChange={(e) =>
                setData({ ...data, interview_notes: e.target.value })
              }
              rows={4}
              placeholder="Key observations from the interview..."
              className="w-full resize-y rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
            />
          </Field>
        </div>

        {/* Flags */}
        <div className="flex gap-6">
          {(
            [
              { key: "application_complete", label: "Application Complete" },
              { key: "financial_aid_applicant", label: "Financial Aid Applicant" },
            ] as const
          ).map((f) => (
            <label
              key={f.key}
              className="flex cursor-pointer items-center gap-2 text-sm text-muted"
            >
              <input
                type="checkbox"
                checked={!!(data[f.key as keyof ApplicationData])}
                onChange={(e) =>
                  setData({ ...data, [f.key]: e.target.checked })
                }
                className="rounded accent-primary"
              />
              {f.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
