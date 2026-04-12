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
  HeartHandshake,
  Target,
  Plug,
  Brain,
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

export default function SchoolAdminHelp() {
  const { t } = useLocale();

  const toc = [
    { id: "dashboard", label: t("help.dashboard.title") },
    { id: "candidates", label: t("help.candidates.title") },
    { id: "cycles", label: t("help.cycles.title") },
    { id: "team", label: t("help.team.title") },
    { id: "evaluator-workspace", label: t("help.evaluator_workspace.title") },
    { id: "reports", label: t("help.settings.title") },
    { id: "settings", label: t("help.settings.title") },
    { id: "subscription", label: t("help.subscription.title") },
    { id: "support-plans", label: "Support Plans" },
    { id: "outcome-tracking", label: "Outcome Tracking" },
    { id: "sis-integrations", label: "SIS Integrations" },
    { id: "support-resources", label: "Support Resources" },
    { id: "enriched-signals", label: "Enriched Learning Signals" },
    { id: "stats", label: t("help.stats.title") },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("help.school_admin.title")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t("help.school_admin.subtitle")}
        </p>
      </div>

      <TableOfContents items={toc} />

      {/* Dashboard */}
      <HelpSection id="dashboard" title={t("help.dashboard.title")} icon={LayoutDashboard} defaultOpen>
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
          <p><span className="font-medium text-lift-text">Professional ($12,000/yr)</span> — 500 sessions, 5 evaluator seats, full session engine, TRI, Learning Support Signals, Evaluator Intelligence, support plans, outcome tracking, voice features.</p>
          <p><span className="font-medium text-lift-text">Enterprise ($18,000/yr)</span> — Unlimited sessions and seats, white label, SIS integrations, cohort intelligence, board reporting, API access, dedicated CSM.</p>
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

      {/* Support Plans */}
      <HelpSection id="support-plans" title="Support Plans" icon={HeartHandshake}>
        <WhereToFind path={["Sidebar", "Support Plans"]} />
        <p className="text-sm text-muted">
          When a candidate is admitted, LIFT automatically generates a 90-day onboarding support plan tailored to their assessment profile and your school&apos;s available support resources.
        </p>

        <h3 className="text-sm font-semibold">How Plans Are Generated</h3>
        <Steps steps={[
          "A candidate receives an \"admit\" decision via the Evaluator Review tab.",
          "LIFT's AI reads the candidate's insight profile, learning support signals, and your school's configured support resources.",
          "A structured 90-day plan is generated with three phases: Week 1-2 Actions, Month 1 Priorities, and Month 2-3 Checkpoints.",
          "The plan appears on the candidate's \"Support Plan\" tab in draft status.",
        ]} />

        <h3 className="mt-4 text-sm font-semibold">Using the Plan</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Interactive Checklist</span> — Week 1-2 and Month 1 items are checkboxes. Check them off as your team completes each action.</p>
          <p><span className="font-medium text-lift-text">Finalize Plan</span> — Click &quot;Finalize Plan&quot; when you&apos;re satisfied. This locks the plan for sharing.</p>
          <p><span className="font-medium text-lift-text">Share with Team</span> — Share the plan with grade deans or learning specialists. They receive an email notification and can view the plan from their dashboard.</p>
          <p><span className="font-medium text-lift-text">Support Level</span> — Each plan has a level: Independent, Standard, Enhanced, or Intensive. This is determined by the AI based on the candidate&apos;s profile.</p>
        </div>

        <h3 className="mt-4 text-sm font-semibold">Plan Sections</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Recommended Resources</span> — Mapped to your school&apos;s configured support resources with priority levels.</p>
          <p><span className="font-medium text-lift-text">Academic Accommodations</span> — Suggestions to consider (not automatic). Shown in an amber callout.</p>
          <p><span className="font-medium text-lift-text">Social Integration Notes</span> — Guidance for the student&apos;s social transition.</p>
          <p><span className="font-medium text-lift-text">Plan Narrative</span> — A written summary for the grade dean about this student&apos;s transition needs.</p>
          <p><span className="font-medium text-lift-text">Family Welcome Note</span> — A warm paragraph for the family about onboarding support.</p>
        </div>

        <Warning>
          Support plans are AI-generated recommendations. They should be reviewed and customized by your team before sharing with families. The &quot;Flag for Early Review&quot; banner means the AI suggests checking in before the standard 30-day mark.
        </Warning>
      </HelpSection>

      {/* Outcome Tracking */}
      <HelpSection id="outcome-tracking" title="Outcome Tracking" icon={Target}>
        <WhereToFind path={["Candidate Detail", "Outcomes tab"]} />
        <p className="text-sm text-muted">
          Track how admitted students actually perform after enrollment. Record GPA, academic standing, support needs, and retention data — then compare against LIFT&apos;s original predictions.
        </p>

        <h3 className="text-sm font-semibold">Recording Outcomes</h3>
        <Steps steps={[
          "Open a candidate's detail page and navigate to the \"Outcomes\" tab.",
          "The tab appears for candidates with status: completed, reviewed, admitted, waitlisted, or offered.",
          "Fill in the outcome form: academic year, term, GPA, academic standing, support services used, and advisor notes.",
          "Click \"Save Outcome\" — you can record multiple outcomes across different terms.",
        ]} />

        <h3 className="mt-4 text-sm font-semibold">What to Record</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">GPA & Scale</span> — Enter the GPA and select the scale (4.0, 5.0, or 100).</p>
          <p><span className="font-medium text-lift-text">Academic Standing</span> — Excellent, Good, Satisfactory, Needs Support, or Probation.</p>
          <p><span className="font-medium text-lift-text">Social Adjustment</span> — Well Integrated, Developing, or Struggling.</p>
          <p><span className="font-medium text-lift-text">Support Services</span> — Tutoring sessions/week, counseling engaged, learning support plan active, extracurricular engagement.</p>
          <p><span className="font-medium text-lift-text">Retention</span> — Whether the student was retained or withdrew (with optional reason).</p>
        </div>

        <Tip>
          The Outcomes tab also shows the candidate&apos;s original LIFT prediction (TRI score and label) alongside recorded outcomes so you can visually compare predicted readiness against actual performance.
        </Tip>
      </HelpSection>

      {/* SIS Integrations */}
      <HelpSection id="sis-integrations" title="SIS Integrations" icon={Plug}>
        <WhereToFind path={["Sidebar", "Settings", "Integrations"]} />
        <p className="text-sm text-muted">
          Connect LIFT to your Student Information System. When a candidate is admitted, their record is automatically pushed to your SIS — no manual export needed. Available on the Enterprise plan.
        </p>

        <h3 className="text-sm font-semibold">Supported Systems</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Veracross</span> — OAuth 2.0. You&apos;ll need your Client ID, Client Secret, and School Route from the Veracross Axiom portal.</p>
          <p><span className="font-medium text-lift-text">Blackbaud</span> — SKY API. Requires Subscription Key, Access Token, Refresh Token, and School ID from developer.sky.blackbaud.com.</p>
          <p><span className="font-medium text-lift-text">PowerSchool</span> — REST API. Requires Server URL, Client ID, and Client Secret from your PowerSchool admin panel.</p>
          <p><span className="font-medium text-lift-text">Ravenna</span> — API Key and School Slug from Ravenna admin Settings → API Access.</p>
          <p><span className="font-medium text-lift-text">Webhook</span> — Send candidate data to any URL with HMAC-SHA256 signature verification.</p>
          <p><span className="font-medium text-lift-text">CSV Manual</span> — Export admitted candidates as CSV in Standard, Veracross, or Blackbaud format.</p>
        </div>

        <h3 className="mt-4 text-sm font-semibold">Connecting a Provider</h3>
        <Steps steps={[
          "Go to Settings → Integrations and click \"Connect\" on your SIS provider.",
          "Follow the step-by-step setup instructions shown in the configuration modal.",
          "Enter your credentials — they are encrypted before storage (AES-256-GCM).",
          "Click \"Save & Connect\" then use \"Test\" to verify the connection works.",
          "Once tested, the integration status changes to \"Active\" and will auto-sync on admissions.",
        ]} />

        <h3 className="mt-4 text-sm font-semibold">What Gets Synced</h3>
        <p className="text-xs text-muted">
          When a candidate is admitted, LIFT pushes: name, email, grade, gender, language preference, TRI score, readiness dimensions, support indicator level, and a link to their LIFT report.
        </p>

        <Tip>
          If a sync fails, the school admin receives an email notification. You can retry failed syncs from the &quot;Retry Failed&quot; button in the sync log section.
        </Tip>
      </HelpSection>

      {/* Support Resources */}
      <HelpSection id="support-resources" title="Support Resources Configuration" icon={BookOpen}>
        <WhereToFind path={["Sidebar", "Settings", "Resources"]} />
        <p className="text-sm text-muted">
          Configure the support resources available at your school. These are used when LIFT generates AI support plans for admitted candidates — the AI maps recommended support to your actual resources.
        </p>

        <h3 className="text-sm font-semibold">Setting Up Resources</h3>
        <Steps steps={[
          "Go to Settings → Resources. If this is your first time, you'll see starter suggestions (tutoring, learning specialist, peer mentor, counselor).",
          "Click a suggestion to add it instantly, or click \"Add Resource\" to create your own.",
          "For each resource, set: Name, Type (academic, social, counseling, learning support, enrichment, other), Description, and applicable grade levels.",
          "Leave grade levels empty if the resource is available to all grades.",
          "Toggle resources active/inactive as availability changes throughout the year.",
        ]} />

        <h3 className="mt-4 text-sm font-semibold">Resource Types</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Academic</span> — Tutoring, academic coaching, study skills programs.</p>
          <p><span className="font-medium text-lift-text">Social</span> — Peer mentoring, buddy programs, social groups.</p>
          <p><span className="font-medium text-lift-text">Counseling</span> — School counselor, transition support, adjustment services.</p>
          <p><span className="font-medium text-lift-text">Learning Support</span> — Learning specialists, reading specialists, assistive technology.</p>
          <p><span className="font-medium text-lift-text">Enrichment</span> — Advanced programs, leadership opportunities, clubs.</p>
        </div>

        <Tip>
          The more specific your resource descriptions, the better the AI can match them to candidate needs in support plans. &quot;Weekly 1:1 math tutoring with Mrs. Chen&quot; is more useful than &quot;math help.&quot;
        </Tip>
      </HelpSection>

      {/* Enriched Learning Signals */}
      <HelpSection id="enriched-signals" title="Enriched Learning Support Signals" icon={Brain}>
        <WhereToFind path={["Candidate Detail", "Overview tab", "Learning Support Signals panel"]} />
        <p className="text-sm text-muted">
          LIFT now detects 9 nuanced behavioral patterns during candidate sessions. These are <strong>behavioral observations</strong>, not diagnoses — they describe what was observed during the session and recommend follow-up conversations.
        </p>

        <h3 className="text-sm font-semibold">Signal Categories</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Reading</span> — Extended reading time, repeated passage re-reading.</p>
          <p><span className="font-medium text-lift-text">Writing</span> — High revision depth, reasoning-expression gap, limited written output.</p>
          <p><span className="font-medium text-lift-text">Attention</span> — Variable task pacing, task completion difficulty.</p>
          <p><span className="font-medium text-lift-text">Self-Regulation</span> — Low support-seeking under challenge, limited metacognitive expression.</p>
        </div>

        <h3 className="mt-4 text-sm font-semibold">Severity Levels</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-[#fbbf24]">Advisory</span> — Worth noting. A pattern was observed but may not require action. Could reflect a student&apos;s style rather than a need.</p>
          <p><span className="font-medium text-[#f59e0b]">Notable</span> — Worth a conversation. The pattern was consistent enough to warrant follow-up with the family or a learning support professional.</p>
        </div>

        <h3 className="mt-4 text-sm font-semibold">How to Read the Panel</h3>
        <p className="text-xs text-muted">
          Each signal includes a plain-language description, the evidence observed (in italics), and a specific recommendation. The recommendation always suggests what to explore — never what to conclude.
        </p>

        <Warning>
          LIFT does not diagnose learning disabilities or clinical conditions. These signals should be reviewed by a qualified learning support professional before any decisions are made. They are one input among many. For therapeutic schools, an additional disclaimer is displayed.
        </Warning>
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
