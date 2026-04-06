"use client";

import { useState } from "react";

export function GuardianConsentClient({
  token,
  candidateId,
  candidateFirstName,
  schoolName,
  guardianName,
  guardianId,
}: {
  token: string;
  candidateId: string;
  candidateFirstName: string;
  schoolName: string;
  guardianName: string;
  guardianId?: string;
}) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleConsent() {
    if (!agreed) return;
    setLoading(true);

    const res = await fetch("/api/consent/guardian", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        candidate_id: candidateId,
        guardian_id: guardianId,
        action: "approve",
      }),
    });

    if (res.ok) setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold text-success">Thank You!</h1>
        <p className="mt-3 max-w-md mx-auto text-muted">
          You&apos;ve given consent for {candidateFirstName} to participate in
          the LIFT experience at {schoolName}. They can now begin their session.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <h1 className="text-2xl font-bold">Guardian Consent</h1>
      <p className="text-muted">
        Hello {guardianName}, {schoolName} has invited{" "}
        <span className="font-medium text-lift-text">{candidateFirstName}</span>{" "}
        to complete the LIFT experience as part of their admissions process.
      </p>

      <div className="space-y-4 rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="font-semibold">What is LIFT?</h2>
        <p className="text-sm text-muted">
          LIFT is a set of short activities that explore how students approach
          reading, writing, and reasoning tasks. It is not a test — there are no
          right or wrong answers.
        </p>

        <div className="rounded-md border border-warning/30 bg-warning/5 p-4">
          <h3 className="text-sm font-semibold text-warning">
            Non-Diagnostic Disclaimer
          </h3>
          <p className="mt-1 text-xs text-muted">
            LIFT does not diagnose, screen for, or identify any clinical,
            medical, or learning condition. All insights are reviewed by
            qualified human evaluators before any admissions decision is made.
          </p>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-lift-border"
        />
        <span className="text-sm">
          I give consent for {candidateFirstName} to participate in the LIFT
          experience. I understand this is not a diagnosis or clinical
          assessment.
        </span>
      </label>

      <button
        onClick={handleConsent}
        disabled={!agreed || loading}
        className="w-full rounded-lg bg-primary py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Submitting..." : "I Consent"}
      </button>
    </div>
  );
}
