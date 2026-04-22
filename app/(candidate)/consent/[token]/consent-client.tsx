"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

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
  const { t } = useLocale();
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
          <h1 className="text-2xl font-bold">{t("consent.waiting_guardian_title")}</h1>
          <p className="mt-3 max-w-md mx-auto text-muted">
            {t("consent.waiting_guardian_sent_prefix")}{" "}
            <span className="text-lift-text">{guardian?.full_name}</span>{" "}
            {t("consent.waiting_guardian_at")}{" "}
            <span className="text-lift-text">{guardian?.email}</span>.
          </p>
          <p className="mt-2 text-sm text-muted">
            {t("consent.waiting_guardian_approved")}
          </p>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-lg space-y-6 py-8">
        <h1 className="text-2xl font-bold">{t("consent.guardian_required_title")}</h1>
        <p className="text-muted">
          {t("consent.guardian_required_body")}
        </p>
        {guardian && (
          <div className="rounded-lg border border-lift-border bg-surface p-4">
            <p className="text-sm">
              <span className="text-muted">{t("consent.guardian_label")}</span>{" "}
              {guardian.full_name}
            </p>
            <p className="text-sm">
              <span className="text-muted">{t("consent.guardian_email_label")}</span> {guardian.email}
            </p>
          </div>
        )}
        <button
          onClick={handleSendGuardianRequest}
          disabled={loading}
          className="rounded-lg bg-primary px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t("consent.sending") : t("consent.send_guardian_request")}
        </button>
      </div>
    );
  }

  // Self-consent flow
  return (
    <div className="mx-auto max-w-lg space-y-8 py-8">
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[#1c1917]">{t("consent.before_we_begin")}</h1>
        <p className="mt-2 text-sm text-[#78716c]">{schoolName}</p>
      </div>

      <div className="space-y-6 rounded-2xl border border-[#e8e4df] bg-white p-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[#1c1917]">{t("consent.what_is_lift_title")}</h2>
          <p className="mt-2 text-[15px] leading-[1.75] text-[#57534e]">
            {t("consent.what_is_lift_body").replace("{school}", schoolName)}
          </p>
        </div>

        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[#1c1917]">{t("consent.not_a_test_title")}</h2>
          <p className="mt-2 text-[15px] leading-[1.75] text-[#57534e]">
            {t("consent.not_a_test_body")}
          </p>
        </div>

        <div className="flex gap-3 rounded-xl border border-[#6366f1]/20 bg-[#6366f1]/5 p-4">
          <span className="mt-0.5 text-[#6366f1]">&#8505;</span>
          <p className="text-[13px] leading-relaxed text-[#57534e]">
            {t("consent.disclaimer")}
          </p>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="custom-checkbox mt-0.5"
        />
        <span className="text-[15px] leading-relaxed text-[#1c1917]">
          {t("consent.agree_checkbox_label")}
        </span>
      </label>

      <button
        onClick={handleSelfConsent}
        disabled={!agreed || loading}
        className="w-full rounded-xl bg-[#6366f1] py-3.5 font-[family-name:var(--font-display)] text-base font-semibold text-white transition-colors hover:bg-[#4f46e5] disabled:opacity-50"
      >
        {loading ? t("consent.starting") : t("consent.ready_to_begin")}
      </button>
    </div>
  );
}
