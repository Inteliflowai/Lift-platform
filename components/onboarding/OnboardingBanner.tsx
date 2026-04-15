"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, Circle, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { usePathname } from "next/navigation";

export function OnboardingBanner() {
  const { t } = useLocale();
  const pathname = usePathname();
  const [stepsCompleted, setStepsCompleted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const STEPS = [
    {
      id: "cycle_created",
      label: t("onboarding.step1_label"),
      desc: t("onboarding.step1_desc"),
      action: { label: t("onboarding.step1_action"), href: "/school/cycles/new" },
    },
    {
      id: "evaluator_invited",
      label: t("onboarding.step2_label"),
      desc: t("onboarding.step2_desc"),
      action: { label: t("onboarding.step2_action"), href: "/school/team" },
    },
    {
      id: "candidate_invited",
      label: t("onboarding.step3_label"),
      desc: t("onboarding.step3_desc"),
      action: { label: t("onboarding.step3_action"), href: "/school/candidates/invite" },
    },
    {
      id: "session_completed",
      label: t("onboarding.step4_label"),
      desc: t("onboarding.step4_desc"),
      action: { label: t("onboarding.step4_action"), href: "/school/candidates" },
    },
    {
      id: "report_viewed",
      label: t("onboarding.step5_label"),
      desc: t("onboarding.step5_desc"),
      action: { label: t("onboarding.step5_action"), href: "/evaluator" },
    },
  ];

  const fetchProgress = useCallback(() => {
    fetch("/api/onboarding/progress")
      .then((r) => r.json())
      .then((data) => {
        setStepsCompleted(data.steps_completed ?? []);
        if (data.all_done) setAllDone(true);
        if (data.dismissed) setMinimized(true);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Fetch on mount and when navigating back to this page
  useEffect(() => {
    fetchProgress();
  }, [fetchProgress, pathname]);

  // Refetch when window regains focus (e.g. returning from another tab/page)
  useEffect(() => {
    function handleFocus() {
      fetchProgress();
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchProgress]);

  useEffect(() => {
    if (stepsCompleted.length === STEPS.length && !allDone) {
      setShowCelebration(true);
      setAllDone(true);
      setTimeout(() => setShowCelebration(false), 5000);
    }
  }, [stepsCompleted, allDone, STEPS.length]);

  if (loading || allDone) return null;

  const completedCount = stepsCompleted.length;
  const progress = (completedCount / STEPS.length) * 100;

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="mb-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
      >
        <Sparkles size={14} />
        {t("onboarding.setup")}: {completedCount}/{STEPS.length} {t("onboarding.complete")}
        <ChevronDown size={14} />
      </button>
    );
  }

  return (
    <div className="mb-6 rounded-xl border-l-4 border-l-primary border border-lift-border bg-surface overflow-hidden">
      {showCelebration && (
        <div className="bg-success/10 p-5 text-center">
          <div className="text-3xl mb-2">&#127881;</div>
          <p className="font-[family-name:var(--font-display)] text-lg font-bold text-success">
            {t("onboarding.celebration")}
          </p>
          <p className="text-sm text-muted">
            {t("onboarding.celebration_desc")}
          </p>
        </div>
      )}

      {!showCelebration && (
        <>
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-lift-text">
              {t("onboarding.title")}
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">
                {completedCount} of {STEPS.length} {t("onboarding.complete")}
              </span>
              <button
                onClick={() => setMinimized(true)}
                className="text-muted hover:text-lift-text"
              >
                <ChevronUp size={16} />
              </button>
            </div>
          </div>

          <div className="mx-5 mb-4 h-1.5 rounded-full bg-lift-border overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="px-5 pb-5 space-y-2">
            {STEPS.map((step, i) => {
              const isDone = stepsCompleted.includes(step.id);
              const isNext =
                !isDone &&
                STEPS.findIndex(
                  (s) => !stepsCompleted.includes(s.id)
                ) === i;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${
                    isDone
                      ? "bg-page-bg"
                      : isNext
                      ? "bg-primary/5 border border-primary/20"
                      : ""
                  }`}
                >
                  {isDone ? (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/20">
                      <Check size={14} className="text-success" />
                    </div>
                  ) : isNext ? (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20">
                      <Circle size={8} className="text-primary fill-primary" />
                    </div>
                  ) : (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lift-border">
                      <Circle size={8} className="text-muted" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        isDone
                          ? "text-muted line-through"
                          : isNext
                          ? "text-lift-text"
                          : "text-muted"
                      }`}
                    >
                      {step.label}
                    </p>
                    {isNext && (
                      <p className="text-xs text-muted mt-0.5">
                        {step.desc}
                      </p>
                    )}
                  </div>

                  {isNext && (
                    <Link
                      href={step.action.href}
                      className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                    >
                      {step.action.label}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
