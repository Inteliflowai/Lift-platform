export interface TooltipContent {
  id: string;
  title: string;
  body: string;
  learnMoreHref?: string;
  roles?: string[];
}

export const TOOLTIPS: Record<string, TooltipContent> = {
  // ── TRI Score ──
  tri_score: {
    id: "tri_score",
    title: "Transition Readiness Index (TRI)",
    body: "A composite score (0–100) across 6 readiness dimensions. It shows how prepared a student appears for the academic and social demands of a new school — not their intelligence or potential. It is not a pass/fail score.",
    learnMoreHref: "/help/evaluator#tri-score",
  },

  // ── 6 Dimensions ──
  dim_reading: {
    id: "dim_reading",
    title: "Reading Interpretation",
    body: "How the student engages with written text — whether they locate evidence, make inferences, and build meaning from grade-level passages. Reflects comprehension strategy, not reading speed.",
    learnMoreHref: "/help/evaluator#dimensions",
  },
  dim_writing: {
    id: "dim_writing",
    title: "Written Expression",
    body: "Clarity, structure, and voice in written output. LIFT captures how ideas develop across drafts and how much the student revises — not just the final word count.",
    learnMoreHref: "/help/evaluator#dimensions",
  },
  dim_reasoning: {
    id: "dim_reasoning",
    title: "Reasoning & Problem Structuring",
    body: "How the student approaches unfamiliar problems — whether they identify patterns, organize information, and build toward a solution. Distinct from prior knowledge.",
    learnMoreHref: "/help/evaluator#dimensions",
  },
  dim_reflection: {
    id: "dim_reflection",
    title: "Reflection & Metacognition",
    body: "Awareness of one's own thinking process. Students who can name challenges, evaluate their own work, and plan next steps tend to transition more successfully.",
    learnMoreHref: "/help/evaluator#dimensions",
  },
  dim_persistence: {
    id: "dim_persistence",
    title: "Task Persistence",
    body: "Sustained engagement under challenge. Measured through revision depth, time on task, and whether the student returns to difficult items rather than skipping them.",
    learnMoreHref: "/help/evaluator#dimensions",
  },
  dim_math: {
    id: "dim_math",
    title: "Mathematical Reasoning",
    body: "How the student approaches quantitative problems — accuracy, problem setup, pattern recognition, and ability to explain mathematical thinking. Scored at grade level, not absolute difficulty.",
    learnMoreHref: "/help/evaluator#dimensions",
  },
  dim_advocacy: {
    id: "dim_advocacy",
    title: "Academic Self-Advocacy",
    body: "How the student seeks support when stuck — whether they use hints, ask for clarification, or engage with available tools. A strong predictor of how well they'll ask for help in a new environment.",
    learnMoreHref: "/help/evaluator#dimensions",
  },

  // ── Learning Support Signals ──
  learning_support_signals: {
    id: "learning_support_signals",
    title: "Learning Support Signals",
    body: "LIFT detects 9 behavioral patterns observed during the session — including reading pace, revision depth, and task abandonment. When patterns appear, they are flagged for professional follow-up. These are observations, not diagnoses.",
    learnMoreHref: "/help/evaluator#enriched-signals",
  },
  signal_severity_advisory: {
    id: "signal_severity_advisory",
    title: "Advisory Signal",
    body: "A pattern worth noting in the admissions conversation. Does not require immediate action, but is worth exploring — particularly if it aligns with anything from the student's application.",
  },
  signal_severity_notable: {
    id: "signal_severity_notable",
    title: "Notable Signal",
    body: "A stronger behavioral pattern that warrants a direct conversation with the family and referral to your learning support team before the student arrives on campus.",
  },

  // ── Evaluator Intelligence ──
  evaluator_intelligence: {
    id: "evaluator_intelligence",
    title: "Evaluator Intelligence",
    body: "AI-generated briefing prepared specifically for this candidate's interview. Includes observations drawn from session data, tailored interview questions, and areas to explore. Generated fresh for each candidate.",
    learnMoreHref: "/help/evaluator#briefing",
  },
  pre_interview_briefing: {
    id: "pre_interview_briefing",
    title: "Pre-Interview Briefing",
    body: "Read this before you meet the candidate. It tells you what to look for, what to probe, and where the session data suggests deeper conversation. Specific to this candidate — not a generic template.",
  },
  post_interview_synthesis: {
    id: "post_interview_synthesis",
    title: "Post-Interview Synthesis",
    body: "Generated after you complete the evaluator rubric. Combines session behavioral data with your interview observations to produce a holistic placement recommendation.",
  },

  // ── Evaluator Rubric ──
  evaluator_rubric: {
    id: "evaluator_rubric",
    title: "Evaluator Rubric",
    body: "Your structured scoring of the candidate after the interview. Fills in the human context that the session cannot capture — body language, verbal communication, fit for your school's culture.",
    learnMoreHref: "/help/evaluator#writing-review",
  },

  // ── School Admin Concepts ──
  admissions_cycle: {
    id: "admissions_cycle",
    title: "Admissions Cycle",
    body: "A defined period of admissions activity (e.g. 2025-2026 Applications). All candidates, sessions, and evaluations belong to a cycle. You can have multiple cycles open simultaneously.",
    learnMoreHref: "/help/school_admin#cycles",
  },
  session_token: {
    id: "session_token",
    title: "Candidate Session Link",
    body: "A unique secure URL for this candidate. Send it to them directly — they do not need to create an account. The link is single-use and tied to this candidate only.",
  },
  grade_band: {
    id: "grade_band",
    title: "Grade",
    body: "LIFT automatically serves age-appropriate tasks based on the grade a student is applying for. Grade 6-7, Grade 8, and Grade 9-11 each have a distinct experience designed for that developmental stage.",
  },
  completion_rate: {
    id: "completion_rate",
    title: "Completion Rate",
    body: "The percentage of available tasks this candidate completed. A low completion rate may itself be a signal — it can reflect time management, disengagement, or technical difficulty.",
  },

  // ── Support Plan ──
  support_plan: {
    id: "support_plan",
    title: "Support Plan",
    body: "A 90-day onboarding plan generated for admitted candidates. Contains recommended interventions mapped to the specific behavioral patterns observed in their session. Hand this to your learning support team before the student arrives.",
    learnMoreHref: "/help/school_admin#support-plans",
  },

  // ── Outcome Tracking ──
  outcome_tracking: {
    id: "outcome_tracking",
    title: "Outcome Tracking",
    body: "Record how admitted students actually perform after enrollment. LIFT compares real outcomes against TRI predictions to compute a prediction accuracy report — proving platform value to your board over time.",
    learnMoreHref: "/help/school_admin#outcome-tracking",
  },

  // ── Session & Signals ──
  hint_usage: {
    id: "hint_usage",
    title: "Hint Usage",
    body: "How often this candidate requested hints during their session. Low = worked independently. Moderate = asked occasionally. High = asked frequently — may benefit from additional support scaffolding.",
  },
  task_count: {
    id: "task_count",
    title: "Session Tasks",
    body: "The number of tasks in this candidate's session experience. Task count varies by grade and session configuration.",
  },
  tri_distribution: {
    id: "tri_distribution",
    title: "Readiness Distribution",
    body: "Shows how your candidates' readiness levels are distributed. Strong Readiness = TRI 75+, Developing = TRI 50-74, Emerging = below 50. This is not a pass/fail — it shows the readiness profile of your applicant pool.",
  },
  readiness_level: {
    id: "readiness_level",
    title: "Readiness Level",
    body: "Based on the Transition Readiness Index (TRI). Strong Readiness = candidate shows strong signals across most dimensions. Developing = solid signals with some areas still growing. Emerging = several dimensions still developing — may benefit from additional support.",
  },
  fit_notes: {
    id: "fit_notes",
    title: "Fit Notes",
    body: "Your school's notes on candidate fit beyond readiness scores — athletic needs, artistic talents, legacy status, financial aid, or any other factor your admissions committee considers.",
  },

  // ── Cohort View ──
  cohort_tri_avg: {
    id: "cohort_tri_avg",
    title: "Average TRI",
    body: "The mean Transition Readiness Index across all completed candidates in this cycle. Use it as a baseline — individual scores above or below this average are worth a closer look.",
  },
  cohort_signals: {
    id: "cohort_signals",
    title: "Support Signals",
    body: "Candidates flagged with one or more behavioral patterns that may warrant a learning support conversation. Not a negative — this helps your team plan proactively before a student arrives on campus.",
  },

  // ── Observation Notes ──
  sentiment_confirms: {
    id: "sentiment_confirms",
    title: "Confirms",
    body: "The interview confirmed what LIFT observed in the session. The candidate behaved consistently across both settings — a strong signal of authentic performance.",
  },
  sentiment_contradicts: {
    id: "sentiment_contradicts",
    title: "Contradicts",
    body: "The interview showed something different from the LIFT session. This isn't necessarily concerning — it may reflect test anxiety, a different setting, or growth since the session.",
  },
  sentiment_expands: {
    id: "sentiment_expands",
    title: "Expands",
    body: "The interview added nuance that the session couldn't capture — context, motivation, or interpersonal qualities that deepen your understanding of this candidate.",
  },
  sentiment_unclear: {
    id: "sentiment_unclear",
    title: "Unclear",
    body: "The interview didn't clearly confirm or contradict this observation. Note it for follow-up or additional conversation with the candidate or family.",
  },

  // ── Application Data ──
  application_data: {
    id: "application_data",
    title: "Application Data",
    body: "School-side information about this candidate — GPA, test scores, teacher recommendations — displayed alongside LIFT session data so evaluators see everything in one place.",
  },
  recommendation_sentiment: {
    id: "recommendation_sentiment",
    title: "Recommendation Sentiment",
    body: "A quick summary of the teacher or counselor recommendation tone. Strong = enthusiastic endorsement, Positive = supportive, Neutral = factual/standard, Mixed = concerns noted alongside strengths.",
  },

  // ── Committee Report ──
  committee_report: {
    id: "committee_report",
    title: "Committee Brief",
    body: "A one-page printable summary designed for your admissions committee meeting. AI-generated narrative combining LIFT data with interview observations. Confidential — not for families.",
  },

  // ── Trial-specific banners ──
  trial_invite_first_candidate: {
    id: "trial_invite_first_candidate",
    title: "Invite your first candidate",
    body: "The fastest way to evaluate LIFT is to run a real session. Invite a colleague to complete a test session as a practice candidate — takes 45 minutes and immediately shows you what your evaluators will see.",
    learnMoreHref: "/help/school_admin#candidates",
    roles: ["school_admin"],
  },
  trial_explore_evaluator: {
    id: "trial_explore_evaluator",
    title: "Explore the Evaluator Workspace",
    body: "Once a session is complete, switch to your evaluator view to see the full intelligence layer — TRI score, dimension breakdown, pre-interview briefing, and Learning Support Signals.",
    learnMoreHref: "/help/evaluator",
    roles: ["school_admin"],
  },
  trial_family_report: {
    id: "trial_family_report",
    title: "Try the Family Report",
    body: "Generate a Family Report for any completed session to see what you would hand to a candidate's parents. School-branded, AI-written, warm in tone — no clinical language.",
    roles: ["school_admin", "evaluator"],
  },
};
