"use client";

import { GuidedTour, type TourStep } from "@/components/ui/GuidedTour";

const STEPS: TourStep[] = [
  {
    title: "Welcome to LIFT!",
    content: "This quick tour will show you the key areas of your dashboard. You can always access help from the Help Guide in the sidebar.",
  },
  {
    target: "[data-tour='sidebar-nav']",
    title: "Navigation",
    content: "Use the sidebar to navigate between sections. Your main areas are: Dashboard, Candidates, Cycles, Team, Analytics, and Settings.",
    position: "right",
  },
  {
    target: "[data-tour='stat-cards']",
    title: "Dashboard Overview",
    content: "These cards show your admissions pipeline at a glance — total candidates, completed sessions, flagged profiles, and average completion rate. Hover the info icons for details.",
    position: "bottom",
  },
  {
    target: "[data-tour='review-queue']",
    title: "Review Queue",
    content: "Candidates flagged by the AI appear here. They may have low-confidence scores or unusual patterns that need your attention before making admissions decisions.",
    position: "bottom",
  },
  {
    title: "Invite Your First Candidate",
    content: "Go to Candidates in the sidebar to import or invite applicants. Each candidate gets a secure link to complete their LIFT session — it takes 45-75 minutes.",
  },
  {
    title: "After a Session Completes",
    content: "LIFT's AI pipeline automatically generates a TRI score, dimension analysis, evaluator briefing, and learning support signals. Your evaluator team reviews these in the Evaluator workspace.",
  },
  {
    title: "You're All Set!",
    content: "Check out the Help Guide in the sidebar anytime. Your 30-day trial includes all Enterprise features. Happy admissions season!",
  },
];

export function SchoolAdminTour() {
  return <GuidedTour tourId="school_admin_welcome" steps={STEPS} />;
}
