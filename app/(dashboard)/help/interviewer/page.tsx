"use client";

import {
  Briefcase,
  FileCheck,
  MessageSquare,
  Brain,
  ClipboardCheck,
} from "lucide-react";
import {
  HelpSection,
  Steps,
  WhereToFind,
  Tip,
  StatExplainer,
  TableOfContents,
} from "../components/HelpUI";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export default function InterviewerHelp() {
  const { t } = useLocale();
  const toc = [
    { id: "cases", label: "Your Cases" },
    { id: "preparing", label: "Preparing for an Interview" },
    { id: "rubric", label: "Using the Interview Rubric" },
    { id: "notes", label: "Submitting Interview Notes" },
    { id: "synthesis", label: "Interview Synthesis" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("help.interviewer.title")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t("help.interviewer.subtitle")}
        </p>
      </div>

      <TableOfContents items={toc} />

      {/* Cases */}
      <HelpSection id="cases" title="Your Cases" icon={Briefcase} defaultOpen>
        <WhereToFind path={["Sidebar", "My Cases"]} />
        <p className="text-sm text-muted">
          Your Cases page lists the candidates assigned to you for interviews. Each card shows the candidate&apos;s name, grade band, TRI score, and interview status.
        </p>

        <h3 className="text-sm font-semibold">Interview Statuses</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-primary">Scheduled</span> — Interview is planned. Click to view the AI briefing and prepare.</p>
          <p><span className="font-medium text-warning">In Progress</span> — You&apos;ve started but haven&apos;t submitted notes yet.</p>
          <p><span className="font-medium text-success">Completed</span> — Notes and rubric scores submitted.</p>
        </div>
      </HelpSection>

      {/* Preparing */}
      <HelpSection id="preparing" title="Preparing for an Interview" icon={Brain}>
        <p className="text-sm text-muted">
          LIFT generates a personalized briefing for each candidate based on their assessment session. This is the most important thing to read before the interview.
        </p>

        <Steps steps={[
          "Open the candidate from your Cases page.",
          "Read the Evaluator Intelligence briefing at the top.",
          "Note the Key Observations — these are specific to this candidate, not generic.",
          "Review the Suggested Interview Questions — they're mapped to the candidate's patterns.",
          "Check the \"Areas to Explore\" — these are dimensions where the AI wasn't confident. Your interview can fill in the gaps.",
          "Optionally review the candidate's actual responses in the Response tab for additional context.",
        ]} />

        <Tip>
          The briefing is designed to be read in 2-3 minutes. Consider printing it or keeping it open on your phone during the interview.
        </Tip>
      </HelpSection>

      {/* Rubric */}
      <HelpSection id="rubric" title="Using the Interview Rubric" icon={ClipboardCheck}>
        <p className="text-sm text-muted">
          After the interview, you score the candidate on a structured rubric. This creates a standardized data point that can be compared across interviewers.
        </p>

        <h3 className="text-sm font-semibold">Rubric Categories</h3>
        <div className="space-y-2">
          <StatExplainer label="Communication" example="1-5" description="How clearly and effectively the candidate expressed themselves verbally. Consider: eye contact, articulation, ability to explain thinking." />
          <StatExplainer label="Critical Thinking" example="1-5" description="Evidence of analytical reasoning during the interview. Did they think through questions or give surface-level answers?" />
          <StatExplainer label="Self-Awareness" example="1-5" description="Ability to reflect on their own strengths, challenges, and learning. Does this match what the LIFT session showed?" />
          <StatExplainer label="Motivation & Fit" example="1-5" description="Genuine interest in the school and thoughtfulness about why this is the right fit for them." />
          <StatExplainer label="Overall Impression" example="1-5" description="Your holistic assessment of the candidate as a potential member of your school community." />
        </div>

        <h3 className="mt-4 text-sm font-semibold">Scoring Scale</h3>
        <div className="space-y-1 text-xs text-muted">
          <p><strong>5</strong> — Exceptional. Stands out clearly.</p>
          <p><strong>4</strong> — Strong. Above what you typically see.</p>
          <p><strong>3</strong> — Solid. Meets expectations for this grade level.</p>
          <p><strong>2</strong> — Below expectations. Concerning in some areas.</p>
          <p><strong>1</strong> — Significant concerns.</p>
        </div>
      </HelpSection>

      {/* Notes */}
      <HelpSection id="notes" title="Submitting Interview Notes" icon={MessageSquare}>
        <Steps steps={[
          "After the interview, return to the candidate's page in LIFT.",
          "Score each rubric category (1-5).",
          "Write your interview notes in the text area. Include specific observations, memorable quotes, and anything that surprised you.",
          "Click \"Submit\" — your scores and notes are saved immediately.",
          "The school admin and evaluator can now see your interview data alongside the AI profile.",
        ]} />

        <Tip>
          Write notes while the interview is fresh — ideally within an hour. Specific details (&quot;She described her approach to the science project by...&quot;) are far more useful than general impressions (&quot;She seemed smart&quot;).
        </Tip>
      </HelpSection>

      {/* Synthesis */}
      <HelpSection id="synthesis" title="Interview Synthesis" icon={FileCheck}>
        <p className="text-sm text-muted">
          After you submit your rubric and notes, LIFT&apos;s AI generates an <strong>Interview Synthesis</strong> — a document that reconciles what the LIFT session showed with what you observed in the interview.
        </p>

        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Confirmed Strengths</span> — Patterns from the session that your interview validated.</p>
          <p><span className="font-medium text-lift-text">New Insights</span> — Things you observed that the session didn&apos;t (or couldn&apos;t) capture.</p>
          <p><span className="font-medium text-lift-text">Discrepancies</span> — Areas where the interview impression differed from the session. These are especially important for admissions decisions.</p>
        </div>

        <Tip>
          The synthesis is one of LIFT&apos;s most powerful tools for evaluators. It creates a complete picture by combining structured AI analysis with human observation — exactly what good admissions decisions require.
        </Tip>
      </HelpSection>
    </div>
  );
}
