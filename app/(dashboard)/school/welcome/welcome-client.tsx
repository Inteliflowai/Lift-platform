"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, ArrowRight } from "lucide-react";

export function WelcomeClient({
  firstName,
  schoolName,
  trialEndsAt,
  tenantId,
}: {
  firstName: string;
  schoolName: string;
  trialEndsAt: string | null;
  tenantId: string;
}) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(8);

  useEffect(() => {
    // Mark welcome as seen
    fetch("/api/school/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ welcome_completed: true }),
    }).catch(() => {});
  }, [tenantId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          router.push("/school");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  const cards = [
    {
      title: "Configure your first admissions cycle",
      href: "/school/cycles/new",
    },
    {
      title: "Invite your first candidate",
      href: "/school/candidates/invite",
    },
    {
      title: "Explore the evaluator workspace",
      href: "/evaluator",
    },
  ];

  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      {/* Checkmark */}
      <div className="mb-6 flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
          <CheckCircle size={48} className="text-success" strokeWidth={1.5} />
        </div>
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-lift-text">
        You&apos;re all set, {firstName}!
      </h1>

      <p className="mt-3 text-muted">
        {schoolName}&apos;s 30-day LIFT trial is active.
      </p>

      <div className="mt-4 flex justify-center gap-6 text-sm">
        {trialEndsAt && (
          <div>
            <p className="text-xs text-muted">Trial ends</p>
            <p className="font-medium text-lift-text">{trialEndsAt}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-muted">Sessions available</p>
          <p className="font-medium text-lift-text">25</p>
        </div>
      </div>

      {/* What to do first */}
      <div className="mt-10 space-y-3">
        <p className="text-sm font-medium text-muted">What to do first</p>
        {cards.map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="flex items-center justify-between rounded-lg border border-lift-border bg-surface p-4 text-left text-sm font-medium text-lift-text hover:border-primary/30 hover:bg-primary/5 transition-colors"
          >
            {card.title}
            <ArrowRight size={16} className="text-muted" />
          </a>
        ))}
      </div>

      {/* Get Started */}
      <button
        onClick={() => router.push("/school")}
        className="mt-8 rounded-lg bg-primary px-8 py-3 font-medium text-white hover:opacity-90 transition-opacity"
      >
        Get Started
      </button>

      <p className="mt-3 text-xs text-muted">
        Redirecting in {secondsLeft}s...
      </p>
    </div>
  );
}
