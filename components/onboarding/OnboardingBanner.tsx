"use client";

import { useState, useEffect } from "react";
import { Check, Circle, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import Link from "next/link";

const STEPS = [
  {
    id: "cycle_created",
    label: "Create your first admissions cycle",
    desc: "Set up your grade bands, timeline, and candidate experience.",
    action: { label: "Create Cycle", href: "/school/cycles/new" },
  },
  {
    id: "evaluator_invited",
    label: "Invite an evaluator to your team",
    desc: "Evaluators review candidate sessions and make recommendations.",
    action: { label: "Invite Evaluator", href: "/school/team" },
  },
  {
    id: "candidate_invited",
    label: "Send your first candidate invitation",
    desc: "Send a secure link to a test candidate — even a colleague works.",
    action: { label: "Invite Candidate", href: "/school/candidates/invite" },
  },
  {
    id: "session_completed",
    label: "Complete a test session",
    desc: "Have your test candidate complete the LIFT experience end to end.",
    action: { label: "View Candidates", href: "/school/candidates" },
  },
  {
    id: "report_viewed",
    label: "Review a candidate report",
    desc: "See what your evaluators will see — the TRI score, dimensions, and briefing.",
    action: { label: "Go to Evaluator", href: "/evaluator" },
  },
];

export function OnboardingBanner() {
  const [stepsCompleted, setStepsCompleted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
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

  useEffect(() => {
    if (stepsCompleted.length === STEPS.length && !allDone) {
      setShowCelebration(true);
      setAllDone(true);
      setTimeout(() => setShowCelebration(false), 5000);
    }
  }, [stepsCompleted, allDone]);

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
        Setup: {completedCount}/{STEPS.length} complete
        <ChevronDown size={14} />
      </button>
    );
  }

  return (
    <div className="mb-6 rounded-xl border-l-4 border-l-primary border border-lift-border bg-surface overflow-hidden">
      {/* Celebration overlay */}
      {showCelebration && (
        <div className="bg-success/10 p-5 text-center">
          <div className="text-3xl mb-2">&#127881;</div>
          <p className="font-[family-name:var(--font-display)] text-lg font-bold text-success">
            You&apos;re all set!
          </p>
          <p className="text-sm text-muted">
            LIFT is ready for your admissions cycle.
          </p>
        </div>
      )}

      {!showCelebration && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-lift-text">
              Get started with LIFT
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">
                {completedCount} of {STEPS.length} complete
              </span>
              <button
                onClick={() => setMinimized(true)}
                className="text-muted hover:text-lift-text"
              >
                <ChevronUp size={16} />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mx-5 mb-4 h-1.5 rounded-full bg-lift-border overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Steps */}
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
                  {/* Icon */}
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

                  {/* Content */}
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

                  {/* Action */}
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
