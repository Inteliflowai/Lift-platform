/**
 * Generate HighLevel snapshot JSON for LIFT
 * Usage: npx tsx scripts/generate-hl-snapshot.ts
 */
import { writeFileSync } from "fs";

const APP_URL = "https://lift.inteliflowai.com";
const SITE_URL = "https://admissions.inteliflowai.com";
const FROM = "LIFT — Inteliflow AI";
const REPLY = "lift@inteliflowai.com";

function email(subject: string, body: string) {
  return {
    type: "send_email",
    subject,
    body: `<div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; line-height: 1.6; color: #333;">${body}<br/><hr style="border:none;border-top:1px solid #eee;margin:24px 0"/><p style="color:#999;font-size:12px;">LIFT is a non-diagnostic admissions insight platform by Inteliflow AI.</p></div>`,
    from_name: FROM,
    reply_to: REPLY,
  };
}

function wait(duration: number, unit: "hours" | "days" = "days") {
  return { type: "wait", duration, unit };
}

function cond(field: string, operator: string, value: string) {
  return { type: "condition", field, operator, value, continue_if: true };
}

function tag(action: "add_tag" | "remove_tag", t: string) {
  return { type: action, tag: t };
}

function stage(s: string) {
  return { type: "move_pipeline_stage", stage: s };
}

function btn(label: string, url: string) {
  return `<p style="margin:24px 0"><a href="${url}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">${label}</a></p>`;
}

function btn2(label1: string, url1: string, label2: string, url2: string) {
  return `<p style="margin:24px 0"><a href="${url1}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">${label1}</a>&nbsp;&nbsp;<a href="${url2}" style="color:#6366f1;text-decoration:underline;font-weight:600">${label2}</a></p>`;
}

const sig = "<br/>— The LIFT Team";

// ============ WORKFLOWS ============

const workflows = [
  // 1. Demo Request Follow-Up
  {
    name: "Demo Request Follow-Up",
    status: "published",
    trigger: { type: "tag_added", tag: "lift-lead" },
    steps: [
      wait(1, "hours"),
      email(
        "{{contact.firstName}}, here's what LIFT can do for {{contact.companyName}}",
        `<p>Hi {{contact.firstName}},</p><p>Thanks for reaching out about LIFT. I wanted to send over a few things that might help.</p><p>LIFT is an AI-powered admissions insight platform for Grades 6-11. In a single 45-75 minute adaptive session, LIFT reveals how each applicant approaches reading, writing, reasoning, and reflection — giving your team a structured profile before the interview even begins.</p><p>Here's what admissions directors tell us they value most:</p><ul><li>Pre-interview briefings tailored to each candidate's specific session data</li><li>A Transition Readiness Index (TRI) score that gives a clear at-a-glance indicator</li><li>Learning Support Signals that surface candidates who may need additional evaluation</li><li>Reports in English and Portuguese</li></ul><p>The best way to see it is to try it. Your 30-day free trial includes full Professional features — no credit card required.</p>${btn("Start Your Free Trial", `${APP_URL}/register`)}<p>Questions? Just reply to this email.</p>${sig}`
      ),
      wait(2),
      cond("tags", "not_contains", "lift-trial"),
      email(
        "A quick question about {{contact.companyName}}'s admissions process",
        `<p>Hi {{contact.firstName}},</p><p>I wanted to follow up on your interest in LIFT.</p><p>Quick question: what's the biggest challenge your admissions team faces right now?</p><p>For most schools we talk to it's one of these:</p><p>→ Making placement decisions with limited insight into how students actually learn<br/>→ Evaluators working from different mental models with no shared framework<br/>→ Missing students who would thrive with the right support</p><p>LIFT was built specifically to solve these. I'd love to show you how in a live demo — or you can jump straight into a free trial and see for yourself.</p>${btn2("Book a Demo", `${SITE_URL}/#forms`, "Start Free Trial", `${APP_URL}/register`)}${sig}`
      ),
      wait(3),
      cond("tags", "not_contains", "lift-trial"),
      email(
        "Last note from LIFT — {{contact.firstName}}",
        `<p>Hi {{contact.firstName}},</p><p>I'll keep this short. I don't want to keep filling your inbox if the timing isn't right.</p><p>When you're ready to explore what LIFT can do for {{contact.companyName}}'s admissions process, your free trial is waiting.</p>${btn("Start Free Trial — No Credit Card", `${APP_URL}/register`)}<p>If you have questions before starting just reply here — happy to help.</p>${sig}`
      ),
      stage("Demo Requested"),
    ],
  },

  // 2. Info Request Nurture
  {
    name: "Info Request Nurture",
    status: "published",
    trigger: { type: "tag_added", tag: "lift-lead" },
    steps: [
      wait(7),
      cond("tags", "not_contains", "lift-trial"),
      email(
        "What does a LIFT session actually look like?",
        `<p>Hi {{contact.firstName}},</p><p>You showed interest in LIFT a week ago. I wanted to share what actually happens during a LIFT session — because it's different from what most admissions tools do.</p><p>A candidate receives a secure link. They complete an adaptive experience on any device — reading passages, short writing tasks, reasoning scenarios, and reflection prompts. No test prep required. No right or wrong answers in the traditional sense.</p><p>What LIFT captures is HOW they approach each task:</p><ul><li>How they process and use evidence from reading passages</li><li>How they structure written responses under real conditions</li><li>How they navigate multi-step reasoning challenges</li><li>How they respond when tasks get harder</li></ul><p>This gives your team a profile that a transcript and a 30-minute interview simply can't provide.</p>${btn2("See how it works", `${SITE_URL}/#how-it-works`, "Start Free Trial", `${APP_URL}/register`)}${sig}`
      ),
      wait(7),
      cond("tags", "not_contains", "lift-trial"),
      email(
        "The admissions insight most schools are missing",
        `<p>Hi {{contact.firstName}},</p><p>Here's something we hear from admissions directors a lot: "We admitted a student we thought would do well — and they struggled from day one. We admitted another we weren't sure about — and they thrived."</p><p>Traditional admissions can't always predict this. LIFT can get closer.</p><p>LIFT's Transition Readiness Index (TRI) is a composite score across 6 readiness dimensions — reading, writing, reasoning, reflection, persistence, and self-advocacy. It tells you not just whether a student is ready, but where they'll need support.</p><p>For boarding and therapeutic schools especially, this is the insight that changes how you onboard and support new students — not just how you select them.</p>${btn2("Learn about the TRI", `${SITE_URL}/#features`, "Start Free Trial", `${APP_URL}/register`)}${sig}`
      ),
      wait(7),
      cond("tags", "not_contains", "lift-trial"),
      email(
        "LIFT is non-diagnostic — here's what that means",
        `<p>Hi {{contact.firstName}},</p><p>One question we get from admissions directors: "Is LIFT a diagnostic tool? Could it create compliance issues for our school?"</p><p>The answer is no — and this is by design.</p><p>LIFT does not diagnose learning disabilities, ADHD, mental health conditions, or any clinical trait. It does not make automated admissions decisions. Every output requires human review before any recommendation is shared.</p><p>What LIFT does is surface behavioral and performance patterns from a structured academic task experience. Patterns that are visible to a skilled evaluator — but that most admissions processes never systematically capture.</p><p>LIFT is FERPA-aligned, COPPA-aware, and fully non-diagnostic. It's designed to support your team's judgment — not replace it.</p>${btn("Start Free Trial — 30 days free", `${APP_URL}/register`)}${sig}`
      ),
    ],
  },

  // 3. Abandoned Registration
  {
    name: "Abandoned Registration",
    status: "published",
    trigger: { type: "tag_added", tag: "lift-abandoned-registration" },
    steps: [
      wait(2, "hours"),
      email(
        "Did something go wrong, {{contact.firstName}}?",
        `<p>Hi {{contact.firstName}},</p><p>It looks like you started signing up for LIFT but didn't quite finish. Did something go wrong? We want to make sure you can get started easily.</p><p>If you ran into a technical issue just reply to this email and we'll sort it out right away.</p><p>Or you can try again here — it only takes about 2 minutes:</p>${btn("Complete Your Registration", `${APP_URL}/register`)}<p>No credit card required. 30-day free trial. Cancel anytime.</p>${sig}`
      ),
      wait(1),
      email(
        "Your free LIFT trial is still waiting",
        `<p>Hi {{contact.firstName}},</p><p>Just a quick note — your 30-day free trial is ready whenever you are.</p><p>LIFT gives {{contact.companyName}}'s admissions team:</p><p>✓ Full candidate session engine for Grades 6-11<br/>✓ AI-powered insight reports in English and Portuguese<br/>✓ Evaluator Intelligence — pre-interview briefings and structured rubrics<br/>✓ Transition Readiness Index (TRI) scoring</p><p>All at no cost for 30 days. No credit card needed.</p>${btn("Start Your Trial", `${APP_URL}/register`)}${sig}`
      ),
    ],
  },

  // 4. Trial Welcome Sequence
  {
    name: "Trial Welcome Sequence",
    status: "published",
    trigger: { type: "tag_added", tag: "lift-trial" },
    steps: [
      email(
        "Welcome to LIFT, {{contact.firstName}} — here's where to start",
        `<p>Hi {{contact.firstName}},</p><p>Your 30-day LIFT trial for {{contact.companyName}} is now active. Here's what to do in your first week to get the most out of it.</p><p><strong>Step 1: Configure your admissions cycle</strong><br/>Go to Cycles → New Cycle and set up your grade bands and timeline.<br/><a href="${APP_URL}/school/cycles/new" style="color:#6366f1">Set up your cycle →</a></p><p><strong>Step 2: Invite a test candidate</strong><br/>Use a colleague or a student you already know to run a full test session.<br/><a href="${APP_URL}/school/candidates/invite" style="color:#6366f1">Invite a candidate →</a></p><p><strong>Step 3: Review the evaluator workspace</strong><br/>See how the TRI score, dimension scores, and pre-interview briefings look on a real session.<br/><a href="${APP_URL}/school" style="color:#6366f1">Go to your dashboard →</a></p><p>Your trial includes up to 25 sessions and full Professional features. Questions? Reply here anytime.</p>${sig}`
      ),
      stage("Trial Active"),
      wait(3),
      cond("tags", "not_contains", "lift-customer"),
      email(
        "The feature LIFT evaluators use most",
        `<p>Hi {{contact.firstName}},</p><p>Three days in — hoping you've had a chance to explore LIFT. I wanted to highlight the feature admissions directors tell us changes how they work: the <strong>Evaluator Intelligence briefing</strong>.</p><p>Before an interview, LIFT generates a personalized briefing for each candidate based on their session data. It includes:</p><ul><li>3-5 key observations specific to this candidate</li><li>6-8 tailored interview questions mapped to their specific patterns</li><li>Areas where session confidence was lower — worth exploring in person</li><li>Strengths to look for and confirm in the interview</li></ul><p>It's like walking into every interview already knowing what to ask.</p>${btn("See it in your evaluator workspace", `${APP_URL}/evaluator`)}${sig}`
      ),
      wait(4),
      cond("tags", "not_contains", "lift-customer"),
      email(
        "What the Learning Support Signals panel shows you",
        `<p>Hi {{contact.firstName}},</p><p>One of LIFT's most valuable — and most carefully built — features is the <strong>Learning Support Signals</strong> panel.</p><p>After every session, LIFT analyzes 8 behavioral patterns that research associates with students who benefit from additional learning support evaluation:</p><ul><li>Extended revision patterns in written responses</li><li>Reading pace relative to passage length</li><li>Response time consistency across task types</li><li>Gap between reasoning signals and written expression</li></ul><p>And more. When patterns are detected, the evaluator sees a plain-language summary — never a diagnosis, always a flag for professional follow-up.</p><p>For boarding and therapeutic schools especially, this is insight that changes how you prepare for a student's arrival.</p>${btn("Learn about Learning Support Signals", `${SITE_URL}/#features`)}${sig}`
      ),
      wait(7),
      cond("tags", "not_contains", "lift-customer"),
      email(
        "Halfway through your trial — how's it going?",
        `<p>Hi {{contact.firstName}},</p><p>You're halfway through your 30-day LIFT trial. I wanted to check in and see how it's going for {{contact.companyName}}.</p><p>Have you run any candidate sessions yet? If yes — great. If not, the best way to evaluate LIFT is to see a real session in action. Even a test with a colleague gives you a much better sense of the experience.</p>${btn("Invite a test candidate", `${APP_URL}/school/candidates/invite`)}<p>If you have questions or want a walkthrough call just reply here — happy to jump on a call this week.</p>${sig}`
      ),
      wait(6),
      cond("tags", "not_contains", "lift-customer"),
      tag("add_tag", "lift-trial-ending"),
      stage("Trial Ending"),
    ],
  },

  // 5. Trial Not Activated
  {
    name: "Trial Not Activated",
    status: "published",
    trigger: { type: "tag_added", tag: "lift-trial" },
    steps: [
      wait(7),
      cond("custom.lift_sessions_used", "equals", "0"),
      cond("tags", "not_contains", "lift-customer"),
      tag("add_tag", "lift-no-session"),
      email(
        "{{contact.firstName}}, you haven't tried LIFT yet",
        `<p>Hi {{contact.firstName}},</p><p>You signed up for LIFT a week ago but haven't run a candidate session yet. That's completely normal — admissions season timing doesn't always align perfectly.</p><p>But here's the thing: the best way to evaluate LIFT isn't reading about it. It's seeing a real session result.</p><p>The fastest way to get there: invite a colleague to complete a test session as a fake candidate. Takes about 45 minutes and you'll immediately see what your evaluators will see.</p>${btn("Invite a test candidate now", `${APP_URL}/school/candidates/invite`)}<p>I'm also happy to run a live walkthrough with you — just reply and we'll find a time.</p>${sig}`
      ),
      wait(5),
      cond("custom.lift_sessions_used", "equals", "0"),
      cond("tags", "not_contains", "lift-customer"),
      email(
        "Can I help you get started with LIFT?",
        `<p>Hi {{contact.firstName}},</p><p>I noticed you haven't had a chance to run a session in LIFT yet. I want to make sure you're getting value from your trial — not just sitting on an unused account.</p><p>Would it help to jump on a 20-minute call? I can walk you through setup, show you a sample session, and answer any questions about how LIFT would fit {{contact.companyName}}'s admissions process.</p>${btn("Book a 20-minute call", `${SITE_URL}/#forms`)}<p>Or if you just need a nudge, here's the quick start:</p><ol><li>Go to Cycles → Create a cycle</li><li>Go to Candidates → Invite someone</li><li>They complete the session → you see the results</li></ol><p>That's it. The whole thing takes one afternoon to test end to end.</p>${btn("Go to your dashboard", `${APP_URL}/school`)}${sig}`
      ),
    ],
  },

  // 6. Trial Ending
  {
    name: "Trial Ending",
    status: "published",
    trigger: { type: "tag_added", tag: "lift-trial-ending" },
    steps: [
      email(
        "Your LIFT trial ends in 7 days, {{contact.firstName}}",
        `<p>Hi {{contact.firstName}},</p><p>Your LIFT trial for {{contact.companyName}} ends in 7 days. I wanted to make sure you have everything you need to make a decision.</p><p>Here's what happens when your trial ends:</p><ul><li>Your account is suspended (you can still log in and see this message)</li><li>Your data — all sessions, reports, and evaluations — is safely stored for 30 days</li><li>Upgrading at any point restores full access immediately</li></ul><p>LIFT Professional is $9,600/year — $800/month equivalent. For a school making admissions decisions that shape students' lives, that's less than the cost of one application cycle's worth of traditional assessment tools.</p>${btn2("Upgrade to Professional", `${APP_URL}/school/settings/subscription`, "Book a call first", `${SITE_URL}/#forms`)}${sig}`
      ),
      wait(3),
      cond("tags", "not_contains", "lift-customer"),
      email(
        "4 days left — common questions about upgrading LIFT",
        `<p>Hi {{contact.firstName}},</p><p>Four days left on your trial. I want to address the questions we hear most often at this point:</p><p><strong>"Is it really annual only?"</strong><br/>Yes — LIFT uses annual contracts. This keeps the price lower than monthly billing would require and aligns with how schools budget. Biannual payment (60% in September, 40% in February) is available on request.</p><p><strong>"What if we only use it during admissions season?"</strong><br/>LIFT is designed for year-round value. Post-admissions: support plans for incoming students, CORE integration, outcome tracking. Summer: grade dean dashboards and onboarding checkpoints. September: cycle prep and new evaluator onboarding.</p><p><strong>"Can we white-label it?"</strong><br/>Yes — Enterprise plan includes custom domain and school logo throughout.</p><p><strong>"What if we need more sessions?"</strong><br/>Additional sessions are available in 100-packs at $149 each.</p>${btn2("See all plans", `${APP_URL}/school/settings/subscription`, "Talk to us", `${SITE_URL}/#forms`)}${sig}`
      ),
      wait(3),
      cond("tags", "not_contains", "lift-customer"),
      email(
        "Last day of your LIFT trial, {{contact.firstName}}",
        `<p>Hi {{contact.firstName}},</p><p>Today is the last day of your LIFT trial for {{contact.companyName}}.</p><p>If LIFT is right for your school, upgrading takes about 2 minutes. Your data stays exactly as it is and access continues without interruption.</p>${btn("Upgrade Now — Before Trial Ends", `${APP_URL}/school/settings/subscription`)}<p>If the timing isn't right this cycle, that's okay. Your data is held safely for 30 days. When you're ready, everything will be exactly where you left it.</p><p>Questions before you decide? Reply here — I'll respond quickly.</p>${sig}`
      ),
    ],
  },

  // 7. Win Back
  {
    name: "Win Back",
    status: "published",
    trigger: { type: "tag_added", tag: "lift-expired" },
    steps: [
      email(
        "Your LIFT trial ended — your data is safe for 30 days",
        `<p>Hi {{contact.firstName}},</p><p>Your LIFT trial for {{contact.companyName}} has ended. Your account is currently suspended but your data — all sessions, evaluations, and reports — is safely stored and will be available for the next 30 days.</p><p>Reactivating is simple. Choose a plan and your account is restored immediately with everything intact.</p>${btn("Reactivate LIFT", `${APP_URL}/school/settings/subscription`)}<p>If budget or timing was the issue, reply here. We can often find a way to work with your school's situation.</p>${sig}`
      ),
      wait(7),
      cond("tags", "not_contains", "lift-customer"),
      email(
        "Still thinking about LIFT, {{contact.firstName}}?",
        `<p>Hi {{contact.firstName}},</p><p>It's been a week since your LIFT trial ended. I wanted to check in — is there anything that got in the way of moving forward?</p><p>Common reasons schools pause at this point:</p><p>→ <strong>Budget approval timing</strong> — if you need to go through a formal approval process, we can send a formal quote and product overview for your business office.<br/>→ <strong>Not enough time to evaluate during trial</strong> — we can extend your trial period. Just reply and ask.<br/>→ <strong>Waiting for the right admissions cycle</strong> — makes sense. We can reactivate your account when timing is better.</p><p>Whatever the situation, just reply here. We'd rather find a way to work with you than lose you entirely.</p>${btn("Reactivate LIFT", `${APP_URL}/school/settings/subscription`)}${sig}`
      ),
      wait(16),
      cond("tags", "not_contains", "lift-customer"),
      email(
        "7 days until your LIFT data is deleted",
        `<p>Hi {{contact.firstName}},</p><p><strong>Important notice:</strong> your LIFT data for {{contact.companyName}} will be permanently deleted in 7 days.</p><p>This includes all candidate sessions, evaluations, insight reports, and admissions data collected during your trial.</p><p>To keep your data and restore access: reactivate your account before the deletion date.</p>${btn("Reactivate and Keep Your Data", `${APP_URL}/school/settings/subscription`)}<p>After deletion, this data cannot be recovered. If you're not ready to reactivate but want to keep a copy of your data, log in and use the Export function before the deadline.</p>${sig}`
      ),
    ],
  },

  // 8. Abandoned Upgrade
  {
    name: "Abandoned Upgrade",
    status: "published",
    trigger: { type: "tag_added", tag: "lift-abandoned-upgrade" },
    steps: [
      wait(4, "hours"),
      email(
        "Still thinking about upgrading LIFT, {{contact.firstName}}?",
        `<p>Hi {{contact.firstName}},</p><p>I noticed you were looking at LIFT's subscription options. Did something stop you from upgrading?</p><p>If it was a question about pricing, features, or contract terms — I'm happy to answer directly. Just reply here.</p>${btn2("View Plans and Pricing", `${APP_URL}/school/settings/subscription`, "Book a 15-minute call", `${SITE_URL}/#forms`)}${sig}`
      ),
      wait(2),
      cond("tags", "not_contains", "lift-customer"),
      email(
        "A question about {{contact.companyName}}'s admissions needs",
        `<p>Hi {{contact.firstName}},</p><p>I wanted to reach out personally about your interest in upgrading LIFT.</p><p>What would make LIFT the obvious choice for {{contact.companyName}}? Is it a specific feature, a pricing question, or something else entirely?</p><p>Reply here — I read every response and I'll get back to you same day.</p>${sig}`
      ),
    ],
  },

  // 9. Upgrade Request Follow-Up
  {
    name: "Upgrade Request Follow-Up",
    status: "published",
    trigger: { type: "pipeline_stage_changed", stage: "Negotiating" },
    steps: [
      { type: "send_email", subject: "ACTION REQUIRED: Upgrade request from {{contact.companyName}}", body: "<p>School: {{contact.companyName}}<br/>Contact: {{contact.firstName}} {{contact.lastName}} ({{contact.email}})<br/>Requested tier: {{custom.lift_tier}}<br/>Time: now</p><p><a href='" + APP_URL + "/admin/licenses'>View in Admin Panel</a></p>", from_name: FROM, reply_to: REPLY, to: REPLY },
      email(
        "We received your upgrade request, {{contact.firstName}}",
        `<p>Hi {{contact.firstName}},</p><p>We received your request to upgrade {{contact.companyName}} to LIFT {{custom.lift_tier}}. We'll send you a confirmation and invoice within 1 business day.</p><p>In the meantime if you have any questions just reply here.</p>${sig}`
      ),
      wait(1),
      cond("tags", "not_contains", "lift-customer"),
      { type: "send_email", subject: "REMINDER: Upgrade request pending for {{contact.companyName}} — 24 hours", body: "<p>Upgrade request from {{contact.companyName}} is still pending after 24 hours. Please process.</p>", from_name: FROM, reply_to: REPLY, to: REPLY },
    ],
  },

  // 10. Session Limit Warning
  {
    name: "Session Limit Warning",
    status: "published",
    trigger: { type: "tag_added", tag: "lift-session-limit-warning" },
    steps: [
      email(
        "{{contact.firstName}}, you're approaching your session limit",
        `<p>Hi {{contact.firstName}},</p><p>Your LIFT account for {{contact.companyName}} has used 80% of your annual session allocation.</p><p>You have a few options:</p><p>→ <strong>Add a session pack:</strong> 100 additional sessions for $149<br/>→ <strong>Upgrade your plan:</strong> Professional includes 400 sessions, Enterprise is unlimited</p>${btn("View options", `${APP_URL}/school/settings/subscription`)}<p>Questions? Reply here and we'll help you find the right solution before your cycle ends.</p>${sig}`
      ),
    ],
  },

  // 11. Customer Onboarding
  {
    name: "Customer Onboarding",
    status: "published",
    trigger: { type: "tag_added", tag: "lift-customer" },
    steps: [
      email(
        "Welcome to LIFT, {{contact.firstName}} — you're all set",
        `<p>Hi {{contact.firstName}},</p><p>Your LIFT subscription for {{contact.companyName}} is now active. Welcome to the team.</p><p>Here's your quick-start checklist:</p><p>✓ <a href="${APP_URL}/school/cycles/new" style="color:#6366f1">Configure your admissions cycle</a><br/>✓ Set up grade band templates for your applicant pool<br/>✓ <a href="${APP_URL}/school/team" style="color:#6366f1">Invite your evaluators</a><br/>✓ <a href="${APP_URL}/school/candidates/invite" style="color:#6366f1">Send your first candidate invitation</a><br/>✓ <a href="${APP_URL}/school/settings" style="color:#6366f1">Customize tenant settings</a></p><p>Your invoice will arrive from Stripe shortly. If you have any questions about getting set up, reply here or book an onboarding call:</p>${btn("Book Onboarding Call", `${SITE_URL}/#forms`)}${sig}`
      ),
      wait(7),
      email(
        "How's your first week with LIFT going?",
        `<p>Hi {{contact.firstName}},</p><p>One week in — how is LIFT working for {{contact.companyName}} so far?</p><p>If you've run your first candidate sessions, great. If not, here's the fastest path to seeing real value: invite one candidate this week and review their results together as a team.</p><p>Three things worth exploring this week:</p><ol><li>The pre-interview briefing card — generated automatically after each session</li><li>The TRI score and what it means for your cohort</li><li>The evaluator rubric for structured interview scoring</li></ol><p>Questions or feedback? Reply here — I read everything personally.</p>${sig}`
      ),
      wait(23),
      email(
        "One month with LIFT — a few tips for your cycle",
        `<p>Hi {{contact.firstName}},</p><p>You've been using LIFT for about a month now. Here are a few tips that schools find most valuable at this stage:</p><p>→ Run the cohort dashboard after your first 10+ sessions to see patterns across your applicant pool<br/>→ Use the export function to share family summaries with your admissions committee<br/>→ Check the Learning Support Signals panel — it's often where the most important conversations start</p><p>As always, if there's anything we can do to make LIFT more valuable for {{contact.companyName}}, just reply here.</p>${sig}`
      ),
    ],
  },

  // 12. Renewal Reminder
  {
    name: "Renewal Reminder",
    status: "published",
    trigger: { type: "tag_added", tag: "lift-renewal-due" },
    steps: [
      email(
        "Your LIFT subscription renews in 60 days",
        `<p>Hi {{contact.firstName}},</p><p>Your LIFT subscription for {{contact.companyName}} renews in 60 days. We wanted to give you plenty of notice.</p><p>Renewal details:</p><ul><li>Plan: {{custom.lift_tier}}</li><li>Renewal date: {{custom.renewal_date}}</li></ul><p>If you'd like to upgrade, downgrade, or discuss your renewal, reply here or contact us at ${REPLY}.</p><p>We'll be in touch closer to your renewal date with a formal reminder and invoice.</p>${sig}`
      ),
      wait(30),
      email(
        "LIFT renewal in 30 days — {{contact.companyName}}",
        `<p>Hi {{contact.firstName}},</p><p>Your LIFT renewal is 30 days away. Your invoice will be sent closer to the renewal date.</p><p>This year LIFT added several new features to your plan:</p><ul><li>Evaluator Intelligence with pre-interview briefings</li><li>Post-interview synthesis — reconciling session and interview observations</li><li>TRI animated gauge and cohort distribution dashboard</li><li>Redesigned PDF reports with radar chart and school logo</li></ul><p>If you have questions about your renewal or want to discuss your plan, reply here.</p>${sig}`
      ),
      wait(23),
      email(
        "LIFT renews in 7 days — {{contact.companyName}}",
        `<p>Hi {{contact.firstName}},</p><p>Your LIFT subscription renews in 7 days. Your invoice will arrive from Stripe on the renewal date.</p><p>If anything has changed — school size, applicant volume, or feature needs — now is a good time to discuss your plan.</p>${btn2("View your subscription", `${APP_URL}/school/settings/subscription`, "Contact us", `mailto:${REPLY}`)}${sig}`
      ),
    ],
  },

  // 13. Payment Failed
  {
    name: "Payment Failed",
    status: "published",
    trigger: { type: "tag_added", tag: "lift-payment-failed" },
    steps: [
      email(
        "Action required: payment issue with your LIFT subscription",
        `<p>Hi {{contact.firstName}},</p><p>We had trouble processing your LIFT payment for {{contact.companyName}}. Your account remains active while we resolve this.</p><p>To update your payment method:</p>${btn("Update Payment Method", `${APP_URL}/school/settings/subscription`)}<p>(Click "Manage Billing" to access the Stripe customer portal)</p><p>If you need help or have questions, reply here right away.</p>${sig}`
      ),
      wait(2),
      cond("tags", "contains", "lift-payment-failed"),
      email(
        "Urgent: your LIFT payment needs attention",
        `<p>Hi {{contact.firstName}},</p><p>We still haven't been able to process your LIFT payment. Your account will be suspended if this isn't resolved in the next 48 hours.</p><p>Please update your payment method immediately:</p>${btn("Update Payment Method Now", `${APP_URL}/school/settings/subscription`)}<p>Or contact us directly at ${REPLY} if you'd like to pay by invoice.</p>${sig}`
      ),
      { type: "send_email", subject: "Payment failure unresolved — {{contact.companyName}} — 48 hours", body: "<p>Payment failure for {{contact.companyName}} is unresolved after 2 days. Account will be suspended soon.</p>", from_name: FROM, reply_to: REPLY, to: REPLY },
    ],
  },

  // 14. Cancellation
  {
    name: "Cancellation",
    status: "published",
    trigger: { type: "tag_added", tag: "lift-cancelled" },
    steps: [
      email(
        "We're sorry to see you go, {{contact.firstName}}",
        `<p>Hi {{contact.firstName}},</p><p>Your LIFT subscription for {{contact.companyName}} has been cancelled. We're sorry to see you go.</p><p>Your data will be retained for 30 days. If you change your mind, reactivating is simple:</p>${btn("Reactivate LIFT", `${APP_URL}/school/settings/subscription`)}<p>One ask: could you tell us why you cancelled? Your feedback directly shapes how we improve LIFT.</p><p><a href="mailto:${REPLY}" style="color:#6366f1">Share feedback →</a></p>${sig}`
      ),
      { type: "send_email", subject: "Cancellation: {{contact.companyName}} — follow up needed", body: "<p>{{contact.companyName}} has cancelled their LIFT subscription. Follow up needed.</p>", from_name: FROM, reply_to: REPLY, to: REPLY },
      wait(7),
      email(
        "{{contact.firstName}}, was there something we could have done better?",
        `<p>Hi {{contact.firstName}},</p><p>I wanted to reach out personally after {{contact.companyName}}'s cancellation.</p><p>If there was a specific issue — with the product, pricing, or support — I'd genuinely like to know. We're a small team building something we believe in and feedback like yours is how we get better.</p><p>And if circumstances change and LIFT becomes the right fit again, we'd love to have {{contact.companyName}} back.</p>${sig}`
      ),
    ],
  },

  // 15. Re-engagement (Dormant Trial)
  {
    name: "Re-engagement (Dormant Trial)",
    status: "published",
    trigger: { type: "tag_added", tag: "lift-dormant" },
    steps: [
      email(
        "{{contact.firstName}}, we noticed you haven't logged into LIFT recently",
        `<p>Hi {{contact.firstName}},</p><p>You have a LIFT trial active for {{contact.companyName}} but we haven't seen any activity in the last 14 days.</p><p>Is the timing just not right this cycle? Or is there something about LIFT that isn't clicking yet?</p><p>Either way, I'd love to help. A 20-minute call can often unblock whatever's getting in the way.</p>${btn("Book a quick call", `${SITE_URL}/#forms`)}<p>Or just reply here — happy to help via email too.</p><p>Your trial still has time left. Let's make it count.</p>${sig}`
      ),
    ],
  },

  // 16. NPS and Feedback
  {
    name: "NPS and Feedback",
    status: "published",
    trigger: { type: "tag_added", tag: "lift-nps-sent" },
    steps: [
      email(
        "Quick question about your experience with LIFT",
        `<p>Hi {{contact.firstName}},</p><p>You've been using LIFT for about a month. I have one quick question:</p><p><strong>On a scale of 0-10, how likely are you to recommend LIFT to another admissions director?</strong></p><p><a href="${SITE_URL}/#forms" style="color:#6366f1;font-weight:600">0-6: Not likely</a> &nbsp;|&nbsp; <a href="mailto:${REPLY}?subject=NPS%207-8" style="color:#6366f1;font-weight:600">7-8: Somewhat likely</a> &nbsp;|&nbsp; <a href="mailto:${REPLY}?subject=NPS%209-10" style="color:#6366f1;font-weight:600">9-10: Very likely</a></p><p>Your honest answer helps us understand what's working and what needs improvement.</p>${sig}`
      ),
    ],
  },
];

// ============ BUILD SNAPSHOT ============

const snapshot = {
  snapshot: {
    name: "LIFT Complete Sales & Nurture System",
    version: "1.0",
    created_at: "2026-04-09",
    pipeline: {
      name: "LIFT Sales",
      stages: [
        "New Lead",
        "Demo Requested",
        "Demo Scheduled",
        "Trial Active",
        "Trial Ending",
        "Trial Expired",
        "Negotiating",
        "Customer — Essentials",
        "Customer — Professional",
        "Customer — Enterprise",
        "Churned",
      ],
    },
    tags: [
      "lift-lead", "lift-trial", "lift-trial-ending", "lift-expired",
      "lift-customer", "lift-essentials", "lift-professional", "lift-enterprise",
      "lift-churned", "lift-session-limit-warning", "lift-renewal-due",
      "lift-payment-failed", "lift-cancelled", "lift-no-session", "lift-dormant",
      "lift-nps-sent", "lift-abandoned-upgrade", "lift-abandoned-registration",
    ],
    workflows,
  },
};

// Write JSON
writeFileSync("output/lift-hl-snapshot.json", JSON.stringify(snapshot, null, 2));
console.log("✓ output/lift-hl-snapshot.json written");

// Write summary
const summary = [
  "# LIFT HighLevel Snapshot Summary\n",
  `Generated: ${new Date().toISOString().split("T")[0]}`,
  `Total workflows: ${workflows.length}`,
  `Total tags: ${snapshot.snapshot.tags.length}`,
  `Pipeline stages: ${snapshot.snapshot.pipeline.stages.length}\n`,
  "## Workflows\n",
  "| # | Name | Trigger | Emails |",
  "|---|------|---------|--------|",
  ...workflows.map((w, i) => {
    const emailCount = w.steps.filter((s: any) => s.type === "send_email").length;
    const trigger = w.trigger.type === "tag_added"
      ? `Tag: ${(w.trigger as any).tag}`
      : `Stage: ${(w.trigger as any).stage}`;
    return `| ${i + 1} | ${w.name} | ${trigger} | ${emailCount} |`;
  }),
].join("\n");

writeFileSync("output/lift-hl-snapshot-summary.md", summary);
console.log("✓ output/lift-hl-snapshot-summary.md written");
