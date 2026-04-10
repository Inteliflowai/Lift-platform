export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import {
  baseEmailTemplate,
  emailGreeting,
  emailParagraph,
  emailButton,
  emailDivider,
  emailCallout,
  emailList,
  emailSignature,
} from "@/lib/emails/templates/base";

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://lift.inteliflowai.com";

const TEMPLATES: Record<string, { subject: string; content: string }> = {
  welcome: {
    subject: "Welcome to LIFT, Alex! Your 30-day trial starts now.",
    content: [
      emailGreeting("Alex"),
      emailParagraph('Your LIFT account for <strong>Demo Academy</strong> is ready. You have 30 days to explore everything LIFT has to offer — at no cost and with no credit card required.'),
      emailDivider(),
      emailParagraph("<strong>Your trial includes:</strong>"),
      emailList(["Up to 25 candidate sessions", "Full evaluator workspace and AI-powered reports", "Transition Readiness Index (TRI) scoring", "Learning Support Signals panel", "Evaluator Intelligence — pre-interview briefings", "English and Portuguese report generation"]),
      emailParagraph("Your trial ends on <strong>May 10, 2026</strong>."),
      emailButton("Go to My Dashboard", `${APP}/school`),
      emailParagraph("Questions? Reply to this email — we're here to help."),
      emailSignature(),
    ].join(""),
  },
  "trial-expiry": {
    subject: "Your LIFT trial has ended — your data is safe",
    content: [
      emailGreeting("Alex"),
      emailParagraph("Your 30-day LIFT trial for <strong>Demo Academy</strong> has ended."),
      emailCallout("Your data is safely stored until <strong>June 10, 2026</strong>. Upgrade before then to restore full access.", "warning"),
      emailButton("Upgrade Now", `${APP}/school/settings/subscription`),
      emailSignature(),
    ].join(""),
  },
  "trial-expiring": {
    subject: "Your LIFT trial ends in 5 days",
    content: [
      emailGreeting("Alex"),
      emailCallout("Your LIFT trial for <strong>Demo Academy</strong> ends in <strong>5 days</strong>.", "warning"),
      emailParagraph("Upgrade now to keep access to all your candidate data, reports, and evaluations."),
      emailButton("Upgrade Now", `${APP}/school/settings/subscription`),
      emailSignature(),
    ].join(""),
  },
  activation: {
    subject: "Your LIFT Professional plan is now active — welcome aboard!",
    content: [
      emailGreeting("Alex"),
      emailCallout("Your LIFT <strong>Professional</strong> plan for <strong>Demo Academy</strong> is now active.", "success"),
      emailParagraph("<strong>Plan details:</strong>"),
      emailList(["Plan: Professional", "Annual fee: $9,600", "Active until: April 10, 2027", "Sessions: 400 per year"]),
      emailButton("Go to Dashboard", `${APP}/school`),
      emailSignature(),
    ].join(""),
  },
  "payment-failed": {
    subject: "Action required: payment issue with your LIFT subscription",
    content: [
      emailGreeting("Alex"),
      emailCallout("We had trouble processing your LIFT payment for <strong>Demo Academy</strong>. Your account remains active while we resolve this.", "warning"),
      emailButton("Update Payment Method", `${APP}/school/settings/subscription`),
      emailParagraph("If you need help or have questions, reply here right away."),
      emailSignature(),
    ].join(""),
  },
  "session-limit": {
    subject: "80% of your LIFT sessions used — Demo Academy",
    content: [
      emailGreeting("Alex"),
      emailCallout("You've used <strong>320 of 400</strong> sessions (80%) for <strong>Demo Academy</strong> this year.", "warning"),
      emailParagraph("Upgrade your plan to get more sessions and keep your admissions process running smoothly."),
      emailButton("Upgrade Now", `${APP}/school/settings/subscription`),
      emailSignature(),
    ].join(""),
  },
  invite: {
    subject: "Demo Academy — You're Invited to Complete Your LIFT Profile",
    content: [
      emailGreeting("Sofia"),
      emailParagraph("<strong>Demo Academy</strong> has invited you to complete a short set of reading, writing, and reasoning activities as part of your admissions process."),
      emailCallout("This is not a test — there are no right or wrong answers. We're interested in how you think and approach different tasks."),
      emailButton("Start Your LIFT Session", `${APP}/session/demo`),
      emailParagraph('<span style="color:#9ca3af;font-size:13px;">This link expires on May 15, 2026.</span>'),
    ].join(""),
  },
  "data-deletion": {
    subject: "URGENT: LIFT data deletion in 7 days — Demo Academy",
    content: [
      emailGreeting("Alex"),
      emailCallout("<strong>URGENT:</strong> Your LIFT data for <strong>Demo Academy</strong> will be permanently deleted on <strong>June 10, 2026</strong> (7 days).", "warning"),
      emailParagraph("This includes all candidate sessions, evaluations, reports, and AI-generated insights."),
      emailButton("Reactivate Now", `${APP}/school/settings/subscription`),
      emailSignature(),
    ].join(""),
  },
};

export async function GET(
  req: NextRequest,
  { params }: { params: { template: string } }
) {
  const { isPlatformAdmin } = await getTenantContext();
  if (!isPlatformAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const tmpl = TEMPLATES[params.template];
  if (!tmpl) {
    const available = Object.keys(TEMPLATES).join(", ");
    return NextResponse.json(
      { error: `Template not found. Available: ${available}` },
      { status: 404 }
    );
  }

  const html = baseEmailTemplate(tmpl.content, {
    previewText: tmpl.subject,
    showUnsubscribe: false,
  });

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
