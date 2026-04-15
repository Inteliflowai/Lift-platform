"use client";

import {
  ClipboardList,
  Users,
  FileText,
  Star,
  Brain,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import {
  HelpSection,
  Steps,
  WhereToFind,
  Tip,
  Warning,
  StatExplainer,
  TableOfContents,
} from "../components/HelpUI";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export default function EvaluatorHelp() {
  const { t } = useLocale();
  const toc = [
    { id: "queue", label: "Your Review Queue" },
    { id: "candidate-review", label: "Reviewing a Candidate" },
    { id: "tri-score", label: "Understanding the TRI Score" },
    { id: "briefing", label: "Evaluator Intelligence Briefing" },
    { id: "learning-support", label: "Learning Support Signals" },
    { id: "enriched-signals", label: "Enriched Behavioral Signals" },
    { id: "support-plan", label: "Support Plan Tab" },
    { id: "outcomes", label: "Outcome Tracking" },
    { id: "writing-review", label: "Writing Your Review" },
    { id: "reports", label: "Cohort Reports" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("help.evaluator.title")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t("help.evaluator.subtitle")}
        </p>
      </div>

      <TableOfContents items={toc} />

      {/* Queue */}
      <HelpSection id="queue" title="Your Review Queue" icon={ClipboardList} defaultOpen>
        <WhereToFind path={["Sidebar", "My Queue"]} />
        <p className="text-sm text-muted">
          Your queue shows candidates who have completed their LIFT session and are ready for your review. Candidates are sorted by completion date — most recent first.
        </p>

        <h3 className="text-sm font-semibold">Queue Status Indicators</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Completed</span> — Session done, AI profile generated. Ready for your review.</p>
          <p><span className="font-medium text-review">Flagged</span> — The AI detected unusual patterns. Review this candidate with extra attention.</p>
          <p><span className="font-medium text-success">Reviewed</span> — You (or another evaluator) have already submitted a review.</p>
        </div>

        <Tip>
          You can also browse all candidates (not just your queue) by clicking <strong>All Candidates</strong> in the sidebar.
        </Tip>
      </HelpSection>

      {/* Candidate Review */}
      <HelpSection id="candidate-review" title="Reviewing a Candidate" icon={Users}>
        <p className="text-sm text-muted">
          Click on any candidate in your queue to see their full profile. Here&apos;s what you&apos;ll find on the review page:
        </p>

        <h3 className="text-sm font-semibold">Page Layout (top to bottom)</h3>
        <Steps steps={[
          "Candidate header — name, grade, session completion date, TRI score badge",
          "TRI Score gauge — visual indicator with label (Emerging / Developing / Ready / Thriving)",
          "Dimension scores — radar chart showing all 6 dimensions with individual scores",
          "Evaluator Intelligence briefing — AI-generated pre-interview guide",
          "Learning Support Signals panel — behavioral flags if any were detected",
          "Response tab — the candidate's actual written responses to each task",
          "Your Review section — where you write your evaluation and recommendation",
        ]} />

        <Tip>
          Read the candidate&apos;s actual responses (Response tab) alongside the AI scores. The AI provides quantitative analysis, but your qualitative judgment is essential.
        </Tip>
      </HelpSection>

      {/* TRI Score */}
      <HelpSection id="tri-score" title="Understanding the TRI Score" icon={Star}>
        <p className="text-sm text-muted">
          The Transition Readiness Index is a weighted composite of 6 dimensions:
        </p>

        <div className="space-y-2">
          <StatExplainer label="Reading (20%)" example="0-100" description="How the candidate processes, comprehends, and uses evidence from reading passages. Based on their reading_passage task responses." />
          <StatExplainer label="Writing (20%)" example="0-100" description="Quality of written expression: structure, vocabulary, coherence, and development of ideas. Based on extended_writing and short_response tasks." />
          <StatExplainer label="Reasoning (20%)" example="0-100" description="Ability to analyze scenarios, solve problems, and think through multi-step challenges. Based on scenario, quantitative_reasoning, and pattern_logic tasks." />
          <StatExplainer label="Reflection (15%)" example="0-100" description="Self-awareness and metacognition. How thoughtfully the candidate considers their own thinking and learning. Based on reflection tasks." />
          <StatExplainer label="Persistence (15%)" example="0-100" description="How the candidate responds when tasks get harder. Measured through behavioral signals: time on difficult tasks, retry behavior, completion rate." />
          <StatExplainer label="Support Seeking (10%)" example="0-100" description="Willingness to use available resources (hints, re-reads). A healthy score means the candidate knows when to ask for help — not too much, not too little." />
        </div>

        <Warning>
          The TRI is an <strong>insight tool</strong>, not a pass/fail score. Two candidates with the same TRI can have very different profiles. Always look at the dimension breakdown.
        </Warning>
      </HelpSection>

      {/* Briefing */}
      <HelpSection id="briefing" title="Evaluator Intelligence Briefing" icon={Brain}>
        <p className="text-sm text-muted">
          The briefing is auto-generated after each session. It&apos;s designed to prepare you for the interview.
        </p>

        <h3 className="text-sm font-semibold">What the Briefing Contains</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Key Observations (3-5)</span> — Specific patterns from this candidate&apos;s session that are worth noting. Example: &quot;Showed strong evidence use in reading but struggled with structured argumentation in extended writing.&quot;</p>
          <p><span className="font-medium text-lift-text">Suggested Interview Questions (6-8)</span> — Questions tailored to this candidate&apos;s specific patterns. These aren&apos;t generic — they&apos;re mapped to what the AI observed.</p>
          <p><span className="font-medium text-lift-text">Areas to Explore</span> — Dimensions where confidence was lower or patterns were ambiguous. These are opportunities to learn more in the interview.</p>
          <p><span className="font-medium text-lift-text">Strengths to Confirm</span> — Strong areas from the session that you should look for in person.</p>
        </div>

        <Tip>
          Print or open the briefing on your phone before walking into an interview. It takes 2 minutes to read and dramatically improves interview quality.
        </Tip>
      </HelpSection>

      {/* Learning Support */}
      <HelpSection id="learning-support" title="Learning Support Signals" icon={AlertTriangle}>
        <p className="text-sm text-muted">
          This panel appears when the AI detects behavioral patterns associated with students who may benefit from learning support evaluation.
        </p>

        <h3 className="text-sm font-semibold">Signal Levels</h3>
        <div className="space-y-2">
          <StatExplainer label="None (0-1 flags)" example="Green" description="No significant patterns detected. Proceed with standard evaluation." />
          <StatExplainer label="Watch (2-3 flags)" example="Amber" description="Some patterns worth noting. Consider asking about learning history in the interview. No immediate action required." />
          <StatExplainer label="Recommend Screening (4+ flags)" example="Red" description="Multiple patterns consistent with learning support needs. LIFT recommends a professional screening conversation before or shortly after enrollment. This candidate's profile is auto-flagged for human review." />
        </div>

        <Warning>
          <strong>This is not a diagnosis.</strong> LIFT does not diagnose learning disabilities, ADHD, or any clinical condition. These signals are designed to prompt professional follow-up — not to replace it.
        </Warning>
      </HelpSection>

      {/* Enriched Signals */}
      <HelpSection id="enriched-signals" title="Enriched Behavioral Signals" icon={Brain}>
        <WhereToFind path={["Candidate Detail", "Overview tab", "Learning Support Signals panel"]} />
        <p className="text-sm text-muted">
          In addition to the original 8 boolean flags, LIFT now computes 9 enriched behavioral signals with detailed descriptions, evidence summaries, and actionable recommendations.
        </p>

        <h3 className="text-sm font-semibold">What You&apos;ll See</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p>Each enriched signal includes:</p>
          <p><span className="font-medium text-lift-text">Severity</span> — Advisory (amber) or Notable (orange). Notable signals warrant a conversation.</p>
          <p><span className="font-medium text-lift-text">Category</span> — Reading, Writing, Attention, or Self-Regulation.</p>
          <p><span className="font-medium text-lift-text">Description</span> — Plain-language explanation of what was observed.</p>
          <p><span className="font-medium text-lift-text">Evidence</span> — Specific data from the session (italicized).</p>
          <p><span className="font-medium text-lift-text">Recommendation</span> — What to explore next, marked with a lightbulb icon.</p>
        </div>

        <Warning>
          These are behavioral observations, not diagnoses. They indicate patterns that may warrant a professional learning support conversation. Never use them as the sole basis for an admissions decision.
        </Warning>
      </HelpSection>

      {/* Support Plan */}
      <HelpSection id="support-plan" title="Support Plan Tab" icon={Star}>
        <WhereToFind path={["Candidate Detail", "Support Plan tab"]} />
        <p className="text-sm text-muted">
          For admitted candidates, the Support Plan tab shows a 90-day onboarding plan generated by LIFT&apos;s AI. It includes actionable checklists, recommended resources, and guidance for the transition.
        </p>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Week 1-2 Actions</span> — Interactive checklist. Check items off as you complete them.</p>
          <p><span className="font-medium text-lift-text">Month 1 Priorities</span> — Also a checklist. Longer-term goals for the first month.</p>
          <p><span className="font-medium text-lift-text">Month 2-3 Checkpoints</span> — Timeline milestones for sustained support.</p>
          <p><span className="font-medium text-lift-text">Recommended Resources</span> — Mapped to your school&apos;s configured resources with priority levels.</p>
          <p><span className="font-medium text-lift-text">Plan Narrative</span> — A written summary about this student&apos;s transition needs.</p>
        </div>
      </HelpSection>

      {/* Outcomes */}
      <HelpSection id="outcomes" title="Outcome Tracking" icon={AlertTriangle}>
        <WhereToFind path={["Candidate Detail", "Outcomes tab"]} />
        <p className="text-sm text-muted">
          Record post-admission outcomes for candidates: GPA, academic standing, support services used, social adjustment, and retention. This data helps compare LIFT&apos;s predictions against actual performance.
        </p>
        <Tip>
          The Outcomes tab shows the candidate&apos;s original TRI prediction alongside the recorded outcomes, making it easy to evaluate prediction accuracy over time.
        </Tip>
      </HelpSection>

      {/* Writing Review */}
      <HelpSection id="writing-review" title="Writing Your Review" icon={MessageSquare}>
        <WhereToFind path={["Candidate Detail", "Your Review section (bottom)"]} />

        <Steps steps={[
          "Read the TRI score, dimension breakdown, and briefing to form your initial impression.",
          "Read the candidate's actual responses in the Response tab.",
          "Write your evaluation in the text area — focus on what you observed and what matters for admissions.",
          "Select a recommendation tier: Admit / Waitlist / Decline / Defer / Needs More Info.",
          "Click \"Submit Review\" — your review becomes visible to the school admin immediately.",
        ]} />

        <h3 className="mt-4 text-sm font-semibold">Recommendation Tiers</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-success">Admit</span> — Strong candidate. Recommend acceptance.</p>
          <p><span className="font-medium text-warning">Waitlist</span> — Promising but uncertain. Consider if space allows.</p>
          <p><span className="font-medium text-review">Decline</span> — Not the right fit at this time.</p>
          <p><span className="font-medium text-primary">Defer</span> — Not enough information to decide. Recommend re-evaluation.</p>
          <p><span className="font-medium text-muted">Needs More Info</span> — Specific follow-up required before any decision.</p>
        </div>

        <Tip>
          Your review is one input to the admissions decision — not the only one. The school admin sees all evaluator reviews alongside interview notes and the AI profile when making final recommendations.
        </Tip>
      </HelpSection>

      {/* Reports */}
      <HelpSection id="reports" title="Cohort Reports" icon={FileText}>
        <WhereToFind path={["Sidebar", "Reports"]} />
        <p className="text-sm text-muted">
          The Reports page shows aggregate analytics across your school&apos;s candidate pool.
        </p>

        <div className="space-y-2">
          <StatExplainer label="TRI Distribution" example="Chart" description="A histogram showing how your candidates' TRI scores are distributed. Helps you understand the overall readiness profile of your applicant pool." />
          <StatExplainer label="Dimension Averages" example="Reading: 68" description="Average scores across all completed sessions per dimension. Identifies whether your applicant pool trends strong or weak in specific areas." />
          <StatExplainer label="Grade Comparison" example="Grade 8 avg: 72" description="Compares average scores across grades. Useful for understanding differences in readiness by age group." />
        </div>
      </HelpSection>
    </div>
  );
}
