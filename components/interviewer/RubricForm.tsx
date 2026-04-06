"use client";

import { useState } from "react";
import { Star } from "lucide-react";

const DIMENSIONS = [
  { key: "verbal_reasoning", label: "Verbal Reasoning", descriptors: ["Struggles to articulate ideas", "", "Communicates ideas clearly", "", "Articulates complex ideas with nuance"] },
  { key: "communication", label: "Communication", descriptors: ["Minimal responses", "", "Engaged and clear", "", "Thoughtful, fluent, and expressive"] },
  { key: "self_awareness", label: "Self-Awareness", descriptors: ["Limited self-reflection", "", "Some awareness of strengths/challenges", "", "Mature metacognitive insight"] },
  { key: "curiosity", label: "Curiosity", descriptors: ["Passive in conversation", "", "Shows genuine interest", "", "Asks thoughtful questions, explores ideas"] },
  { key: "resilience", label: "Resilience", descriptors: ["Shuts down when challenged", "", "Recovers with support", "", "Leans into challenge with confidence"] },
] as const;

const RECS = [
  { value: "strong_yes", label: "Strong Yes", color: "bg-[#10b981] text-white" },
  { value: "yes", label: "Yes", color: "bg-[#6366f1] text-white" },
  { value: "unsure", label: "Unsure", color: "bg-[#f59e0b] text-white" },
  { value: "no", label: "No", color: "bg-[#f43f5e] text-white" },
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
  const [scores, setScores] = useState<Record<string, number>>({});
  const [impression, setImpression] = useState("");
  const [standout, setStandout] = useState("");
  const [concerns, setConcerns] = useState("");
  const [rec, setRec] = useState("");
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const allScored = DIMENSIONS.every((d) => scores[d.key] >= 1);
  const canSubmit = allScored && impression.trim() && rec;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);

    await fetch("/api/interview-rubric", {
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
    onSubmitted();
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold">Interview Rubric — {candidateName}</h3>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="mt-2 rounded-md border border-lift-border bg-page-bg px-3 py-1.5 text-sm text-lift-text" />
      </div>

      {/* Star ratings */}
      <div className="space-y-4">
        {DIMENSIONS.map((dim) => (
          <div key={dim.key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{dim.label}</span>
              {scores[dim.key] && (
                <span className="text-xs text-muted">{dim.descriptors[scores[dim.key] - 1]}</span>
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
          <label className="mb-1 block text-xs text-muted">Overall Impression *</label>
          <textarea value={impression} onChange={(e) => setImpression(e.target.value)}
            className="w-full min-h-[80px] rounded-md border border-lift-border bg-surface p-3 text-sm outline-none focus:border-primary resize-y"
            placeholder="Your overall assessment of this candidate..." />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Standout Moments (optional)</label>
          <textarea value={standout} onChange={(e) => setStandout(e.target.value)}
            className="w-full min-h-[60px] rounded-md border border-lift-border bg-surface p-3 text-sm outline-none focus:border-primary resize-y"
            placeholder="What stood out during the interview?" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Concerns (optional)</label>
          <textarea value={concerns} onChange={(e) => setConcerns(e.target.value)}
            className="w-full min-h-[60px] rounded-md border border-lift-border bg-surface p-3 text-sm outline-none focus:border-primary resize-y"
            placeholder="Any concerns or areas for follow-up?" />
        </div>
      </div>

      {/* Recommendation */}
      <div>
        <label className="mb-2 block text-xs text-muted">Recommendation *</label>
        <div className="flex gap-2">
          {RECS.map((r) => (
            <button key={r.value} type="button"
              onClick={() => setRec(r.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                rec === r.value ? r.color : "border border-lift-border bg-surface text-muted hover:text-lift-text"
              }`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleSubmit} disabled={!canSubmit || saving}
        className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
        {saving ? "Submitting..." : "Submit Rubric"}
      </button>
    </div>
  );
}
