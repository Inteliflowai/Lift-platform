"use client";

import { useState } from "react";

export function ConsentClient({
  token,
  candidateId,
  schoolName,
  needsGuardian,
  guardian,
  guardianConsentSent: initialSent,
}: {
  token: string;
  candidateId: string;
  schoolName: string;
  needsGuardian: boolean;
  guardian: { id: string; full_name: string; email: string } | null;
  guardianConsentSent: boolean;
}) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guardianSent, setGuardianSent] = useState(initialSent);

  async function handleSelfConsent() {
    if (!agreed) return;
    setLoading(true);

    const res = await fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        candidate_id: candidateId,
        consent_type: "candidate_self",
        consented_by: "candidate",
      }),
    });

    if (res.ok) {
      window.location.href = `/session/${token}`;
      return;
    }
    setLoading(false);
  }

  async function handleSendGuardianRequest() {
    setLoading(true);

    const res = await fetch("/api/consent/guardian", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        candidate_id: candidateId,
        action: "send_request",
      }),
    });

    if (res.ok) {
      setGuardianSent(true);
    }
    setLoading(false);
  }

  // Guardian consent flow
  if (needsGuardian) {
    if (guardianSent) {
      return (
        <div className="py-12 text-center">
          <h1 className="text-2xl font-bold">Waiting for Guardian Consent</h1>
          <p className="mt-3 max-w-md mx-auto text-muted">
            We&apos;ve sent a consent request to{" "}
            <span className="text-lift-text">{guardian?.full_name}</span> at{" "}
            <span className="text-lift-text">{guardian?.email}</span>.
          </p>
          <p className="mt-2 text-sm text-muted">
            Once your guardian approves, you&apos;ll be able to start your
            session. Check back soon!
          </p>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-lg space-y-6 py-8">
        <h1 className="text-2xl font-bold">Guardian Consent Required</h1>
        <p className="text-muted">
          Because you&apos;re under 13, a parent or guardian needs to give
          permission before you can begin.
        </p>
        {guardian && (
          <div className="rounded-lg border border-lift-border bg-surface p-4">
            <p className="text-sm">
              <span className="text-muted">Guardian:</span>{" "}
              {guardian.full_name}
            </p>
            <p className="text-sm">
              <span className="text-muted">Email:</span> {guardian.email}
            </p>
          </div>
        )}
        <button
          onClick={handleSendGuardianRequest}
          disabled={loading}
          className="rounded-lg bg-primary px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Consent Request to Guardian"}
        </button>
      </div>
    );
  }

  // Self-consent flow
  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <h1 className="text-2xl font-bold">Before We Begin</h1>

      <div className="space-y-4 rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="font-semibold">What is LIFT?</h2>
        <p className="text-sm text-muted">
          LIFT is a set of short activities that explore how you approach
          reading, writing, and reasoning tasks. {schoolName} uses these
          insights as part of their admissions process.
        </p>

        <h2 className="font-semibold">This is not a test</h2>
        <p className="text-sm text-muted">
          There are no right or wrong answers. We&apos;re interested in how you
          think — not what you know. Take your time, do your best, and be
          yourself.
        </p>

        <div className="rounded-md border border-warning/30 bg-warning/5 p-4">
          <h3 className="text-sm font-semibold text-warning">
            Non-Diagnostic Disclaimer
          </h3>
          <p className="mt-1 text-xs text-muted">
            LIFT is a non-diagnostic platform. It does not diagnose, screen for,
            or identify any clinical, medical, or learning condition. The
            insights generated are used solely to help schools understand how
            candidates approach learning tasks. All final decisions are made by
            qualified human reviewers.
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
          I understand that LIFT is not a test or diagnosis, and I agree to
          participate.
        </span>
      </label>

      <button
        onClick={handleSelfConsent}
        disabled={!agreed || loading}
        className="w-full rounded-lg bg-primary py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Starting..." : "I Agree — Let's Begin"}
      </button>
    </div>
  );
}
