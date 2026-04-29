"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

/**
 * Inline orientation card — three short paragraphs explaining what LIFT
 * measures, framed for an in-product context (terser than the marketing
 * page). Mounted on:
 *   - /school/welcome — defaultOpen, since trial users have no context yet
 *   - /evaluator/candidates/[id] Overview tab — collapsed by default to
 *     preserve vertical space on a dense page
 *
 * Holds the observation-not-diagnosis framing; do not soften the
 * non-diagnostic line.
 */
export function HowLiftWorks({
  defaultOpen = false,
}: {
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-lift-border bg-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-left text-sm font-medium text-lift-text hover:bg-page-bg/40 transition-colors"
        aria-expanded={open}
      >
        <span>How LIFT works</span>
        {open ? (
          <ChevronUp size={16} className="text-muted" />
        ) : (
          <ChevronDown size={16} className="text-muted" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 text-sm leading-relaxed text-muted">
          <div>
            <p className="font-medium text-lift-text mb-1">
              Transition Readiness Index (TRI)
            </p>
            <p>
              A single 0&ndash;100 score per candidate. TRI rolls up seven
              dimensions of learning readiness &mdash; reading, writing,
              reasoning, math, reflection, persistence, and support-seeking
              &mdash; weighted by how a candidate engages with each task,
              not just what they answer.
            </p>
          </div>

          <div>
            <p className="font-medium text-lift-text mb-1">
              Behavioral signals
            </p>
            <p>
              Nine signals captured passively during the session: extended
              reading time, revision depth, hint usage, focus loss, and
              more. They surface support needs that scores alone miss
              &mdash; a strong writer who pauses long before each
              paragraph, a confident reasoner who never asks for help.
            </p>
          </div>

          <div>
            <p className="font-medium text-lift-text mb-1">
              Observation, not diagnosis
            </p>
            <p>
              LIFT does not diagnose. It reveals how a candidate approaches
              academic tasks &mdash; observations your team can use,
              structured for committee. FERPA aligned, COPPA aware. Every
              recommendation reaches a human reviewer before it shapes a
              decision.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
