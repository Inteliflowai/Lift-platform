"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Dimension keys + descriptor keys. Labels resolve at render time via t().
const DIMENSION_KEYS = [
  { key: "verbal_reasoning", labelKey: "rubric.dim_verbal_reasoning", descKeys: ["rubric.verbal_desc_1", "", "rubric.verbal_desc_3", "", "rubric.verbal_desc_5"] },
  { key: "communication", labelKey: "rubric.dim_communication", descKeys: ["rubric.comm_desc_1", "", "rubric.comm_desc_3", "", "rubric.comm_desc_5"] },
  { key: "self_awareness", labelKey: "rubric.dim_self_awareness", descKeys: ["rubric.self_desc_1", "", "rubric.self_desc_3", "", "rubric.self_desc_5"] },
  { key: "curiosity", labelKey: "rubric.dim_curiosity", descKeys: ["rubric.curiosity_desc_1", "", "rubric.curiosity_desc_3", "", "rubric.curiosity_desc_5"] },
  { key: "resilience", labelKey: "rubric.dim_resilience", descKeys: ["rubric.resilience_desc_1", "", "rubric.resilience_desc_3", "", "rubric.resilience_desc_5"] },
] as const;

const REC_KEYS = [
  { value: "strong_yes", labelKey: "rubric.rec_strong_yes", color: "bg-[#10b981] text-white" },
  { value: "yes", labelKey: "rubric.rec_yes", color: "bg-[#6366f1] text-white" },
  { value: "unsure", labelKey: "rubric.rec_unsure", color: "bg-[#f59e0b] text-white" },
  { value: "no", labelKey: "rubric.rec_no", color: "bg-[#f43f5e] text-white" },
] as const;

export function RubricForm({
  candidateId,
  tenantId,
  candidateName,
  onSubmitted,
}: {
  candidateId: string;
  tenantId: string;
  candidateName: string;
  onSubmitted: () => void;
}) {
  const { t } = useLocale();
  const [scores, setScores] = useState<Record<string, number>>({});
  const [impression, setImpression] = useState("");
  const [standout, setStandout] = useState("");
  const [concerns, setConcerns] = useState("");
  const [rec, setRec] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const allScored = DIMENSION_KEYS.every((d) => scores[d.key] >= 1);
  const canSubmit = allScored && impression.trim() && rec;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);

    const res = await fetch("/api/interview-rubric", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate_id: candidateId,
        tenant_id: tenantId,
        interview_date: date,
        verbal_reasoning_score: scores.verbal_reasoning,
        communication_score: scores.communication,
        self_awareness_score: scores.self_awareness,
        curiosity_score: scores.curiosity,
        resilience_score: scores.resilience,
        overall_impression: impression,
        standout_moments: standout || null,
        concerns: concerns || null,
        recommendation: rec,
      }),
    });

    setSaving(false);

    if (res.ok) {
      setSubmitted(true);
      setTimeout(() => onSubmitted(), 2000);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-[#10b981]/30 bg-[#10b981]/5 p-8 text-center space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#10b981]/10">
          <svg className="h-7 w-7 text-[#10b981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" className="check-draw" />
          </svg>
        </div>
        <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[#10b981]">
          {t("rubric.submitted_title")}
        </h3>
        <p className="text-sm text-muted">
          {t("rubric.submitted_body").replace("{name}", candidateName)}
        </p>
        <p className="text-xs text-muted">{t("rubric.refreshing")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold">{t("rubric.header_prefix")} {candidateName}</h3>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="mt-2 rounded-md border border-lift-border bg-page-bg px-3 py-1.5 text-sm text-lift-text" />
      </div>

      {/* Star ratings */}
      <div className="space-y-4">
        {DIMENSION_KEYS.map((dim) => (
          <div key={dim.key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{t(dim.labelKey)}</span>
              {scores[dim.key] && (
                <span className="text-xs text-muted">
                  {dim.descKeys[scores[dim.key] - 1] ? t(dim.descKeys[scores[dim.key] - 1]) : ""}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} type="button" onClick={() => setScores({ ...scores, [dim.key]: v })}
                  className="transition-colors">
                  <Star size={24} fill={v <= (scores[dim.key] ?? 0) ? "#f59e0b" : "none"}
                    className={v <= (scores[dim.key] ?? 0) ? "text-[#f59e0b]" : "text-[#d1d5db]"} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Text areas */}
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-muted">{t("rubric.overall_impression_label")}</label>
          <textarea value={impression} onChange={(e) => setImpression(e.target.value)}
            className="w-full min-h-[80px] rounded-md border border-lift-border bg-surface p-3 text-sm outline-none focus:border-primary resize-y"
            placeholder={t("rubric.overall_impression_placeholder")} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">{t("rubric.standout_label")}</label>
          <textarea value={standout} onChange={(e) => setStandout(e.target.value)}
            className="w-full min-h-[60px] rounded-md border border-lift-border bg-surface p-3 text-sm outline-none focus:border-primary resize-y"
            placeholder={t("rubric.standout_placeholder")} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">{t("rubric.concerns_label")}</label>
          <textarea value={concerns} onChange={(e) => setConcerns(e.target.value)}
            className="w-full min-h-[60px] rounded-md border border-lift-border bg-surface p-3 text-sm outline-none focus:border-primary resize-y"
            placeholder={t("rubric.concerns_placeholder")} />
        </div>
      </div>

      {/* Recommendation */}
      <div>
        <label className="mb-2 block text-xs text-muted">{t("rubric.recommendation_label")}</label>
        <div className="flex gap-2">
          {REC_KEYS.map((r) => (
            <button key={r.value} type="button"
              onClick={() => setRec(r.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                rec === r.value ? r.color : "border border-lift-border bg-surface text-muted hover:text-lift-text"
              }`}>
              {t(r.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleSubmit} disabled={!canSubmit || saving}
        className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
        {saving ? t("rubric.submitting") : t("rubric.submit_btn")}
      </button>
    </div>
  );
}
