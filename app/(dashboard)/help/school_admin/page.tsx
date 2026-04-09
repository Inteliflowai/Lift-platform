"use client";

import {
  LayoutDashboard,
  Users,
  Calendar,
  UserCheck,
  Settings,
  CreditCard,
  BarChart2,
  BookOpen,
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

export default function SchoolAdminHelp() {
  const toc = [
    { id: "dashboard", label: "Dashboard Overview" },
    { id: "candidates", label: "Managing Candidates" },
    { id: "cycles", label: "Admissions Cycles" },
    { id: "team", label: "Team Management" },
    { id: "evaluator-workspace", label: "Understanding Evaluator View" },
    { id: "reports", label: "Reports & Exports" },
    { id: "settings", label: "School Settings" },
    { id: "subscription", label: "Subscription & Billing" },
    { id: "stats", label: "Stats & Scores Explained" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">School Admin Guide</h1>
        <p className="mt-1 text-sm text-muted">
          Everything you need to run your school&apos;s admissions process on LIFT.
        </p>
      </div>

      <TableOfContents items={toc} />

      {/* Dashboard */}
      <HelpSection id="dashboard" title="Dashboard Overview" icon={LayoutDashboard} defaultOpen>
        <WhereToFind path={["Sidebar", "Dashboard"]} />
        <p className="text-sm text-muted">
          Your dashboard gives you a real-time snapshot of your admissions pipeline. Here&apos;s what each section shows:
        </p>

        <div className="space-y-2">
          <StatExplainer
            label="Total Candidates"
            example="47"
            description="All candidates imported or invited to your school across all cycles. Includes active, completed, and flagged candidates."
          />
          <StatExplainer
            label="Completed Sessions"
            example="32"
            description="Number of candidates who finished all assessment tasks. Each completed session automatically triggers the AI pipeline to generate insight profiles, TRI scores, and evaluator briefings."
          />
          <StatExplainer
            label="Flagged / Needs Review"
            example="5"
            description="Candidates whose AI-generated profiles were flagged for human review. This happens when confidence scores are low, unusual patterns are detected, or Learning Support Signals exceed thresholds. Always review these before making admissions decisions."
          />
          <StatExplainer
            label="Avg Completion %"
            example="87%"
            description="The average percentage of tasks completed across all sessions. A number below 70% may indicate that candidates are dropping off mid-session — consider checking session settings or task difficulty."
          />
        </div>

        <Tip>
          The <strong>Review Queue</strong> shows candidates needing attention. Click any name to see their full profile, AI scores, and evaluator briefing.
        </Tip>
      </HelpSection>

      {/* Candidates */}
      <HelpSection id="candidates" title="Managing Candidates" icon={Users}>
        <WhereToFind path={["Sidebar", "Candidates"]} />

        <h3 className="text-sm font-semibold">Importing Candidates</h3>
        <Steps steps={[
          "Click \"Import Excel\" in the top right of the Candidates page.",
          "Upload a spreadsheet (.xlsx or .csv) with columns: First Name, Last Name, Email, Grade Applying To, Date of Birth.",
          "Review the import preview — LIFT will show you how many candidates will be created.",
          "Click \"Import\" to create all candidates at once.",
          "Each candidate gets an invite token automatically. Use \"Invite Candidate\" to send emails.",
        ]} />

        <h3 className="mt-4 text-sm font-semibold">Inviting a Single Candidate</h3>
        <Steps steps={[
          "Click \"Invite Candidate\" from the Candidates page.",
          "Fill in the candidate's name, email, grade applying to, and guardian info (if COPPA mode is on).",
          "Click \"Send Invite\" — the candidate receives an email with a secure session link.",
          "The link is valid for the number of days configured in your cycle settings.",
        ]} />

        <h3 className="mt-4 text-sm font-semibold">Candidate Statuses</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Invited</span> — Invite sent, waiting for candidate to open the link</p>
          <p><span className="font-medium text-lift-text">Consent Pending</span> — Guardian consent required (COPPA mode)</p>
          <p><span className="font-medium text-lift-text">Active</span> — Session in progress or ready to begin</p>
          <p><span className="font-medium text-lift-text">Completed</span> — All tasks finished, AI pipeline has run</p>
          <p><span className="font-medium text-lift-text">Flagged</span> — Requires human review before admissions decision</p>
        </div>

        <Tip>
          When you first register, LIFT creates 3 demo candidates (Sofia Martinez, James Chen, Amara Okafor) so you can explore the platform. These are marked with &quot;(Demo)&quot; and can be deleted anytime.
        </Tip>
      </HelpSection>

      {/* Cycles */}
      <HelpSection id="cycles" title="Admissions Cycles" icon={Calendar}>
        <WhereToFind path={["Sidebar", "Cycles"]} />
        <p className="text-sm text-muted">
          An admissions cycle represents one application period (e.g. &quot;Fall 2026&quot;). Each cycle has its own candidate pool, dates, and grade bands.
        </p>

        <h3 className="text-sm font-semibold">Creating a Cycle</h3>
        <Steps steps={[
          "Click \"New Cycle\" from the Cycles page.",
          "Enter a name (e.g. \"Fall 2026 Admissions\") and academic year.",
          "Set opening and closing dates — invites can only be sent during this window.",
          "Configure grade bands (6-7, 8, 9-11) — each band gets its own set of age-appropriate assessment tasks.",
          "Click \"Create Cycle\" — it becomes active immediately.",
        ]} />

        <Tip>
          You can have multiple cycles but only one active at a time. Completed cycles are archived and their data remains accessible for reporting.
        </Tip>
      </HelpSection>

      {/* Team */}
      <HelpSection id="team" title="Team Management" icon={UserCheck}>
        <WhereToFind path={["Sidebar", "Team"]} />
        <p className="text-sm text-muted">
          Add evaluators, interviewers, and other staff to your school. Each role sees a different view of the platform.
        </p>

        <h3 className="text-sm font-semibold">Roles Explained</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">School Admin</span> — Full control: candidates, cycles, team, settings, billing. You are this role.</p>
          <p><span className="font-medium text-lift-text">Evaluator</span> — Reviews candidate profiles, TRI scores, AI briefings. Writes evaluator reviews and recommendations.</p>
          <p><span className="font-medium text-lift-text">Interviewer</span> — Conducts interviews using AI-generated briefings. Submits rubric scores and interview notes.</p>
        </div>

        <h3 className="mt-4 text-sm font-semibold">Inviting a Team Member</h3>
        <Steps steps={[
          "Click \"Invite\" on the Team page.",
          "Enter their name, email, and select a role.",
          "They receive an email with a link to set up their account.",
          "Once they log in, they see only the pages relevant to their role.",
        ]} />

        <Warning>
          Evaluator and interviewer seats are limited by your subscription tier. Check your plan limits in Settings → Subscription.
        </Warning>
      </HelpSection>

      {/* Evaluator Workspace */}
      <HelpSection id="evaluator-workspace" title="Understanding the Evaluator View" icon={BarChart2}>
        <p className="text-sm text-muted">
          When a candidate completes their session, LIFT generates an insight profile that evaluators use for review. Here&apos;s what they see:
        </p>

        <h3 className="text-sm font-semibold">Candidate Profile Components</h3>
        <div className="space-y-2">
          <StatExplainer
            label="TRI Score (Transition Readiness Index)"
            example="72 — Ready"
            description="A composite score (0-100) across 6 dimensions: reading, writing, reasoning, reflection, persistence, and support-seeking. Labels: Emerging (<40), Developing (40-59), Ready (60-79), Thriving (80+)."
          />
          <StatExplainer
            label="Dimension Scores"
            example="Reading: 78, Writing: 65"
            description="Individual scores (0-100) for each dimension, generated by Claude AI analyzing the candidate's actual responses. Each includes a confidence level and rationale."
          />
          <StatExplainer
            label="Evaluator Briefing"
            example="Key observations + interview questions"
            description="An AI-generated pre-interview guide with 3-5 observations specific to this candidate, 6-8 tailored interview questions, and areas to explore further."
          />
          <StatExplainer
            label="Learning Support Signals"
            example="Watch — 2 flags"
            description="Behavioral patterns that may indicate a need for learning support evaluation. Three levels: None (0-1 flags), Watch (2-3), Recommend Screening (4+). This is NOT a diagnosis — it's a prompt for professional follow-up."
          />
        </div>

        <Tip>
          The evaluator sees all of this on one page. They can then write their review, select a recommendation tier (admit/waitlist/decline/defer), and submit. The school admin can see all reviews in the candidate detail page.
        </Tip>
      </HelpSection>

      {/* Reports */}
      <HelpSection id="reports" title="Reports & Exports" icon={BookOpen}>
        <p className="text-sm text-muted">
          LIFT generates several types of reports:
        </p>

        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Internal Report (PDF)</span> — Full insight profile for your admissions team. Includes all scores, narratives, and Learning Support Signals.</p>
          <p><span className="font-medium text-lift-text">Family Summary (PDF)</span> — A parent-friendly overview of the candidate&apos;s session. Does not include diagnostic language or raw scores. Available in English and Portuguese.</p>
          <p><span className="font-medium text-lift-text">Cohort CSV Export</span> — Spreadsheet of all candidates with scores for data analysis.</p>
        </div>

        <Warning>
          Portuguese reports require the Professional plan or higher. English reports are available on all plans.
        </Warning>
      </HelpSection>

      {/* Settings */}
      <HelpSection id="settings" title="School Settings" icon={Settings}>
        <WhereToFind path={["Sidebar", "Settings"]} />

        <h3 className="text-sm font-semibold">Key Settings</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Default Language</span> — Sets the language for candidate invites and session UI (English or Portuguese).</p>
          <p><span className="font-medium text-lift-text">COPPA Mode</span> — When enabled, requires parental/guardian consent before candidates under 13 can begin their session.</p>
          <p><span className="font-medium text-lift-text">Session Pause</span> — Allows candidates to pause mid-session and resume later via email link.</p>
          <p><span className="font-medium text-lift-text">Voice Response</span> — Enables candidates to speak their answers instead of typing. Recommended for Grade 6-7. Audio is transcribed and immediately deleted.</p>
          <p><span className="font-medium text-lift-text">Passage Reader</span> — A text-to-speech player above reading passages. Helps candidates with reading difficulties without affecting scoring.</p>
        </div>
      </HelpSection>

      {/* Subscription */}
      <HelpSection id="subscription" title="Subscription & Billing" icon={CreditCard}>
        <WhereToFind path={["Sidebar", "Settings", "Subscription"]} />

        <h3 className="text-sm font-semibold">Plans</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Essentials ($4,800/yr)</span> — 150 sessions, 2 evaluator seats, core features.</p>
          <p><span className="font-medium text-lift-text">Professional ($9,600/yr)</span> — 400 sessions, 5 seats, TRI scoring, Learning Support Signals, Evaluator Intelligence, Portuguese reports, voice features.</p>
          <p><span className="font-medium text-lift-text">Enterprise ($18,000/yr)</span> — Unlimited sessions and seats, benchmarking network, outcome tracking, SIS integrations, white label, dedicated CSM.</p>
          <p><span className="font-medium text-lift-text">Trial (30 days)</span> — All Enterprise features, capped at 25 sessions and 3 evaluator seats. No credit card required.</p>
        </div>

        <h3 className="mt-4 text-sm font-semibold">Upgrading</h3>
        <Steps steps={[
          "Go to Settings → Subscription.",
          "Click \"Get [Plan Name]\" on the plan you want.",
          "You'll be redirected to Stripe's secure checkout page.",
          "Complete payment — your plan activates immediately.",
          "You'll see a \"Payment successful\" confirmation when you return.",
        ]} />

        <h3 className="mt-4 text-sm font-semibold">Managing Billing</h3>
        <p className="text-sm text-muted">
          If you have an active subscription, click <strong>Manage Billing</strong> on the subscription page to access the Stripe Customer Portal where you can update payment methods, view invoices, or cancel.
        </p>
      </HelpSection>

      {/* Stats Explained */}
      <HelpSection id="stats" title="Stats & Scores Explained" icon={BarChart2}>
        <p className="text-sm text-muted">
          A comprehensive reference for every metric in LIFT.
        </p>

        <h3 className="text-sm font-semibold">TRI Score Breakdown</h3>
        <div className="space-y-2">
          <StatExplainer
            label="Emerging (0-39)"
            example="TRI: 28"
            description="The candidate showed significant gaps across multiple readiness dimensions. This doesn't mean they can't succeed — it means they'll likely need substantial transition support. Explore the dimension detail to see where the gaps are."
          />
          <StatExplainer
            label="Developing (40-59)"
            example="TRI: 52"
            description="The candidate shows mixed readiness. Some dimensions are strong, others need work. The dimension breakdown is especially important here — two students with a 52 can look very different."
          />
          <StatExplainer
            label="Ready (60-79)"
            example="TRI: 72"
            description="The candidate demonstrates solid readiness for transition. Some areas of strength and some growth areas, but the overall profile suggests they'll adapt well with standard support."
          />
          <StatExplainer
            label="Thriving (80-100)"
            example="TRI: 88"
            description="Strong readiness across all dimensions. The candidate showed depth, consistency, and self-awareness throughout their session. Consider this student for leadership or mentoring opportunities."
          />
        </div>

        <h3 className="mt-4 text-sm font-semibold">Learning Support Signal Flags</h3>
        <div className="space-y-2">
          <StatExplainer label="High Revision Depth" example="Flag" description="The candidate made significantly more edits than average on typed responses. May indicate perfectionism, uncertainty, or motor planning difficulty." />
          <StatExplainer label="Low Reading Dwell" example="Flag" description="The candidate spent less than 30 seconds on reading passages before responding. May indicate rushing, avoidance, or strong reading fluency." />
          <StatExplainer label="Short Written Output" example="Flag" description="Average word count below 25 words on writing tasks. May indicate expressive language difficulty, low engagement, or test anxiety." />
          <StatExplainer label="High Response Latency" example="Flag" description="Consistently slow to begin tasks. May indicate processing speed differences or task avoidance." />
          <StatExplainer label="Reasoning-Writing Gap" example="Flag" description="Reasoning score significantly higher than writing score. Suggests the candidate understands more than they can express in writing — worth exploring in interview." />
        </div>

        <Warning>
          Learning Support Signals are <strong>not diagnoses</strong>. They are patterns that trained evaluators should consider alongside interview observations and other admissions data. LIFT recommends professional follow-up when 4+ flags are present.
        </Warning>
      </HelpSection>
    </div>
  );
}
