"use client";

import { GuidedTour, type TourStep } from "@/components/ui/GuidedTour";

const STEPS: TourStep[] = [
  {
    title: "Welcome to Your Evaluator Workspace",
    content: "This is where you review candidate profiles, AI-generated insights, and submit your admissions recommendations.",
  },
  {
    title: "Your Review Queue",
    content: "Candidates assigned to you appear at the top. Candidates flagged by the AI for human review are also highlighted. Click any name to open their full profile.",
  },
  {
    title: "Candidate Detail — 7 Tabs",
    content: "Each candidate has: Overview (TRI + dimensions), Responses (written work), Signals (behavioral data), Evaluator Review (your assessment), Interview Notes, Outcomes, and Support Plan.",
  },
  {
    title: "TRI Score",
    content: "The Transition Readiness Index is a composite of 6 dimensions. It's not a pass/fail — it shows readiness patterns. Hover the info icon on the gauge for details.",
  },
  {
    title: "Learning Support Signals",
    content: "LIFT detects 9 behavioral patterns (reading pace, revision depth, task abandonment, etc.). Each signal includes a plain-language description and recommendation. These are observations, not diagnoses.",
  },
  {
    title: "Submitting Your Review",
    content: "In the Evaluator Review tab, select your recommendation tier and add notes. If your tier differs from the AI's suggestion, you'll be asked for a rationale. Your review is saved immediately.",
  },
  {
    title: "Ready to Review!",
    content: "Check the Help Guide in the sidebar for detailed explanations of every score and signal. Good luck with your reviews!",
  },
];

export function EvaluatorTour() {
  return <GuidedTour tourId="evaluator_welcome" steps={STEPS} />;
}
