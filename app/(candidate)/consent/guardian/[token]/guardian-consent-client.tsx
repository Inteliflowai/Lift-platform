"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

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
  const { t } = useLocale();
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
        <h1 className="text-2xl font-bold text-success">{t("guardian.thank_you")}</h1>
        <p className="mt-3 max-w-md mx-auto text-muted">
          {t("guardian.thank_you_body")
            .replace(/\{name\}/g, candidateFirstName)
            .replace("{school}", schoolName)}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <h1 className="text-2xl font-bold">{t("guardian.title")}</h1>
      <p className="text-muted">
        {t("guardian.intro")
          .replace("{guardian}", guardianName)
          .replace("{school}", schoolName)
          .split("{name}")
          .map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && (
                <span className="font-medium text-lift-text">{candidateFirstName}</span>
              )}
            </span>
          ))}
      </p>

      <div className="space-y-4 rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="font-semibold">{t("guardian.what_is_lift_title")}</h2>
        <p className="text-sm text-muted">
          {t("guardian.what_is_lift_body")}
        </p>

        <div className="rounded-md border border-warning/30 bg-warning/5 p-4">
          <h3 className="text-sm font-semibold text-warning">
            {t("guardian.disclaimer_title")}
          </h3>
          <p className="mt-1 text-xs text-muted">
            {t("guardian.disclaimer_body")}
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
          {t("guardian.agree_checkbox").replace("{name}", candidateFirstName)}
        </span>
      </label>

      <button
        onClick={handleConsent}
        disabled={!agreed || loading}
        className="w-full rounded-lg bg-primary py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? t("guardian.submitting") : t("guardian.submit")}
      </button>
    </div>
  );
}
