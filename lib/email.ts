import { sendLiftEmail } from "@/lib/emails/send";
import {
  emailGreeting,
  emailParagraph,
  emailButton,
  emailDivider,
  emailCallout,
  emailList,
  emailSignature,
} from "@/lib/emails/templates/base";

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://lift.inteliflowai.com";
const TEAM = process.env.LIFT_TEAM_EMAIL || "lift@inteliflowai.com";

// ─── Candidate Invite ───

export async function sendInviteEmail(params: {
  to: string;
  candidateFirstName: string;
  schoolName: string;
  link: string;
  expiresAt: Date;
  language: "en" | "pt";
}) {
  const isEn = params.language === "en";
  const expiryStr = params.expiresAt.toLocaleDateString(isEn ? "en-US" : "pt-BR", { year: "numeric", month: "long", day: "numeric" });

  const content = isEn
    ? [
        emailGreeting(params.candidateFirstName),
        emailParagraph(`<strong>${params.schoolName}</strong> has invited you to complete a short set of reading, writing, and reasoning activities as part of your admissions process.`),
        emailCallout("This is not a test — there are no right or wrong answers. We're interested in how you think and approach different tasks."),
        emailButton("Start Your LIFT Session", params.link),
        emailParagraph(`<span style="color:#9ca3af;font-size:13px;">This link expires on ${expiryStr}.</span>`),
      ].join("")
    : [
        emailGreeting(params.candidateFirstName),
        emailParagraph(`<strong>${params.schoolName}</strong> convidou você a completar um conjunto de atividades de leitura, escrita e raciocínio como parte do processo de admissão.`),
        emailCallout("Isto não é uma prova — não existem respostas certas ou erradas. Queremos entender como você pensa e aborda diferentes tarefas."),
        emailButton("Iniciar Sessão LIFT", params.link),
        emailParagraph(`<span style="color:#9ca3af;font-size:13px;">Este link expira em ${expiryStr}.</span>`),
      ].join("");

  await sendLiftEmail({
    to: params.to,
    subject: isEn
      ? `${params.schoolName} — You're Invited to Complete Your LIFT Profile`
      : `${params.schoolName} — Convite para Completar seu Perfil LIFT`,
    content,
    options: { previewText: isEn ? "Complete your admissions activities" : "Complete suas atividades", showUnsubscribe: false },
  });
}

// ─── Team Invite ───

export async function sendTeamInviteEmail(params: {
  to: string;
  schoolName: string;
  role: string;
  link: string;
}) {
  const content = [
    emailGreeting("there"),
    emailParagraph(`You've been invited to join <strong>${params.schoolName}</strong> on LIFT as a <strong>${params.role}</strong>.`),
    emailButton("Accept Invitation", params.link),
    emailSignature(),
  ].join("");

  await sendLiftEmail({
    to: params.to,
    subject: `${params.schoolName} — You're Invited to LIFT`,
    content,
    options: { previewText: `Join ${params.schoolName} on LIFT`, showUnsubscribe: false },
  });
}

// ─── Welcome (Registration) ───

export async function sendWelcomeEmail(params: {
  to: string;
  firstName: string;
  schoolName: string;
  trialEndsAt: Date;
  dashboardUrl: string;
}) {
  const endStr = params.trialEndsAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const content = [
    emailGreeting(params.firstName),
    emailParagraph(`Your LIFT account for <strong>${params.schoolName}</strong> is ready. You have 30 days to explore everything LIFT has to offer — at no cost and with no credit card required.`),
    emailDivider(),
    emailParagraph("<strong>Your trial includes:</strong>"),
    emailList([
      "Up to 25 candidate sessions",
      "Full evaluator workspace and AI-powered reports",
      "Transition Readiness Index (TRI) scoring",
      "Learning Support Signals panel",
      "Evaluator Intelligence — pre-interview briefings",
      "English and Portuguese report generation",
    ]),
    emailParagraph(`Your trial ends on <strong>${endStr}</strong>.`),
    emailButton("Go to My Dashboard", params.dashboardUrl),
    emailParagraph("Questions? Reply to this email — we're here to help."),
    emailSignature(),
  ].join("");

  await sendLiftEmail({
    to: params.to,
    subject: `Welcome to LIFT, ${params.firstName}! Your 30-day trial starts now.`,
    content,
    options: { previewText: "Your 30-day free trial is active", showUnsubscribe: false },
  });
}

// ─── Trial Expired ───

export async function sendTrialExpiredEmail(params: {
  to: string;
  firstName: string;
  schoolName: string;
  dataDeletionDate: Date;
  upgradeUrl: string;
}) {
  const delStr = params.dataDeletionDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const content = [
    emailGreeting(params.firstName),
    emailParagraph(`Your 30-day LIFT trial for <strong>${params.schoolName}</strong> has ended.`),
    emailCallout(`Your data is safely stored until <strong>${delStr}</strong>. Upgrade before then to restore full access and keep your data permanently.`, "warning"),
    emailButton("Upgrade Now", params.upgradeUrl),
    emailParagraph(`Need to talk? <a href="mailto:${TEAM}" style="color:#6366f1;">Contact our team</a>`),
    emailSignature(),
  ].join("");

  await sendLiftEmail({
    to: params.to,
    subject: "Your LIFT trial has ended — your data is safe",
    content,
    bcc: TEAM,
    options: { previewText: "Your trial ended but your data is safe for 30 days", showUnsubscribe: false },
  });
}

// ─── Upgrade Request (to platform team) ───

export async function sendUpgradeRequestEmail(params: {
  schoolName: string;
  currentTier: string;
  requestedTier: string;
  billingPreference: string;
  adminName: string;
  adminEmail: string;
  message: string | null;
  tenantId: string;
}) {
  const content = [
    emailParagraph(`<strong>${params.schoolName}</strong> has requested an upgrade.`),
    emailDivider(),
    emailParagraph(`
      <strong>Current tier:</strong> ${params.currentTier}<br/>
      <strong>Requested tier:</strong> ${params.requestedTier}<br/>
      <strong>Billing:</strong> ${params.billingPreference}<br/>
      <strong>Contact:</strong> ${params.adminName} (${params.adminEmail})
    `),
    params.message ? emailCallout(params.message) : "",
    emailButton("View in Admin Panel", `${APP}/admin/licenses/${params.tenantId}`),
  ].join("");

  await sendLiftEmail({
    to: TEAM,
    subject: `Upgrade Request — ${params.schoolName} → ${params.requestedTier}`,
    content,
    options: { previewText: `${params.schoolName} wants to upgrade`, showUnsubscribe: false },
  });
}

// ─── Upgrade Confirmation ───

export async function sendUpgradeConfirmationEmail(params: {
  to: string;
  firstName: string;
  requestedTier: string;
}) {
  const label = params.requestedTier.charAt(0).toUpperCase() + params.requestedTier.slice(1);

  const content = [
    emailGreeting(params.firstName),
    emailParagraph(`We've received your request to upgrade to the <strong>${label}</strong> plan. Our team will send you a quote within 1 business day.`),
    emailParagraph("If you have any questions in the meantime, just reply to this email."),
    emailSignature(),
  ].join("");

  await sendLiftEmail({
    to: params.to,
    subject: "We received your upgrade request",
    content,
    options: { previewText: "We'll send you a quote within 1 business day", showUnsubscribe: false },
  });
}

// ─── Subscription Activated ───

export async function sendActivationEmail(params: {
  to: string;
  firstName: string;
  schoolName: string;
  tierLabel: string;
  annualAmount: number;
  periodEndsAt: Date;
  sessionsLimit: number | null;
  dashboardUrl: string;
}) {
  const endStr = params.periodEndsAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const content = [
    emailGreeting(params.firstName),
    emailCallout(`Your LIFT <strong>${params.tierLabel}</strong> plan for <strong>${params.schoolName}</strong> is now active.`, "success"),
    emailParagraph("<strong>Plan details:</strong>"),
    emailList([
      `Plan: ${params.tierLabel}`,
      `Annual fee: $${params.annualAmount.toLocaleString()}`,
      `Active until: ${endStr}`,
      params.sessionsLimit ? `Sessions: ${params.sessionsLimit} per year` : "Sessions: Unlimited",
    ]),
    emailParagraph("Your invoice will follow separately. If you have any questions, reply to this email."),
    emailButton("Go to Dashboard", params.dashboardUrl),
    emailSignature(),
  ].join("");

  await sendLiftEmail({
    to: params.to,
    subject: `Your LIFT ${params.tierLabel} plan is now active — welcome aboard!`,
    content,
    options: { previewText: `${params.tierLabel} plan activated`, showUnsubscribe: false },
  });
}

// ─── Trial Expiring Soon ───

export async function sendTrialExpiringEmail(params: {
  to: string;
  firstName: string;
  schoolName: string;
  daysRemaining: number;
}) {
  const urgent = params.daysRemaining <= 3;

  const content = [
    emailGreeting(params.firstName),
    emailCallout(
      `${urgent ? "<strong>Urgent:</strong> " : ""}Your LIFT trial for <strong>${params.schoolName}</strong> ends in <strong>${params.daysRemaining} day${params.daysRemaining !== 1 ? "s" : ""}</strong>.`,
      urgent ? "warning" : "info"
    ),
    emailParagraph("Upgrade now to keep access to all your candidate data, reports, and evaluations."),
    emailButton("Upgrade Now", `${APP}/school/settings/subscription`),
    emailSignature(),
  ].join("");

  await sendLiftEmail({
    to: params.to,
    subject: `Your LIFT trial ends in ${params.daysRemaining} days`,
    content,
    bcc: TEAM,
    options: { previewText: `${params.daysRemaining} days left on your trial`, showUnsubscribe: false },
  });
}

// ─── Suspended ───

export async function sendSuspendedEmail(params: {
  to: string;
  firstName: string;
  schoolName: string;
  reason: string;
  dataDeletionDate: Date | null;
}) {
  const isTrial = params.reason === "trial_expired";
  const delStr = params.dataDeletionDate?.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const content = [
    emailGreeting(params.firstName),
    emailCallout(
      `Your LIFT account for <strong>${params.schoolName}</strong> has been ${isTrial ? "suspended because your trial has ended" : "suspended due to a billing issue"}.`,
      "warning"
    ),
    delStr ? emailParagraph(`Your data is safely stored until <strong>${delStr}</strong>. Upgrade before then to restore full access.`) : "",
    emailButton("Reactivate Now", `${APP}/school/settings/subscription`),
    emailParagraph(`Need help? <a href="mailto:${TEAM}" style="color:#6366f1;">Contact our team</a>`),
    emailSignature(),
  ].join("");

  await sendLiftEmail({
    to: params.to,
    subject: isTrial ? "Your LIFT trial has ended" : "Your LIFT account has been suspended",
    content,
    bcc: TEAM,
    options: { previewText: "Your account has been suspended", showUnsubscribe: false },
  });
}

// ─── Renewal Reminder ───

export async function sendRenewalReminderEmail(params: {
  to: string;
  firstName: string;
  schoolName: string;
  tierLabel: string;
  daysUntilRenewal: number;
  renewalDate: Date;
  annualAmount: number;
}) {
  const dateStr = params.renewalDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const content = [
    emailGreeting(params.firstName),
    emailParagraph(`Your LIFT <strong>${params.tierLabel}</strong> plan for <strong>${params.schoolName}</strong> renews on <strong>${dateStr}</strong> (${params.daysUntilRenewal} days).`),
    emailParagraph(`Annual fee: <strong>$${params.annualAmount.toLocaleString()}</strong>`),
    emailParagraph("If you'd like to change your plan or have questions about renewal, please contact us."),
    emailButton("View Subscription", `${APP}/school/settings/subscription`),
    emailSignature(),
  ].join("");

  await sendLiftEmail({
    to: params.to,
    subject: `LIFT renewal in ${params.daysUntilRenewal} days — ${params.schoolName}`,
    content,
    bcc: TEAM,
    options: { previewText: `Renewal in ${params.daysUntilRenewal} days`, showUnsubscribe: false },
  });
}

// ─── Session Limit Warning ───

export async function sendSessionLimitWarningEmail(params: {
  to: string;
  firstName: string;
  schoolName: string;
  used: number;
  limit: number;
}) {
  const pct = Math.round((params.used / params.limit) * 100);

  const content = [
    emailGreeting(params.firstName),
    emailCallout(`You've used <strong>${params.used} of ${params.limit}</strong> sessions (${pct}%) for <strong>${params.schoolName}</strong> this year.`, "warning"),
    emailParagraph("Upgrade your plan to get more sessions and keep your admissions process running smoothly."),
    emailButton("Upgrade Now", `${APP}/school/settings/subscription`),
    emailSignature(),
  ].join("");

  await sendLiftEmail({
    to: params.to,
    subject: `${pct}% of your LIFT sessions used — ${params.schoolName}`,
    content,
    bcc: TEAM,
    options: { previewText: `${pct}% of sessions used`, showUnsubscribe: false },
  });
}

// ─── Data Deletion Warning ───

export async function sendDataDeletionWarningEmail(params: {
  to: string;
  firstName: string;
  schoolName: string;
  daysRemaining: number;
  deletionDate: Date;
}) {
  const dateStr = params.deletionDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const content = [
    emailGreeting(params.firstName),
    emailCallout(`<strong>URGENT:</strong> Your LIFT data for <strong>${params.schoolName}</strong> will be permanently deleted on <strong>${dateStr}</strong> (${params.daysRemaining} days).`, "warning"),
    emailParagraph("This includes all candidate sessions, evaluations, reports, and AI-generated insights."),
    emailParagraph("Reactivate your subscription now to keep your data permanently."),
    emailButton("Reactivate Now", `${APP}/school/settings/subscription`),
    emailSignature(),
  ].join("");

  await sendLiftEmail({
    to: params.to,
    subject: `URGENT: LIFT data deletion in ${params.daysRemaining} days — ${params.schoolName}`,
    content,
    bcc: TEAM,
    options: { previewText: `Data deletion in ${params.daysRemaining} days`, showUnsubscribe: false },
  });
}

// ─── Plan Updated ───

export async function sendPlanUpdatedEmail(params: {
  to: string;
  firstName: string;
  tierLabel: string;
}) {
  const content = [
    emailGreeting(params.firstName),
    emailCallout(`Your LIFT plan has been updated to <strong>${params.tierLabel}</strong>.`, "success"),
    emailButton("View Subscription", `${APP}/school/settings/subscription`),
    emailSignature(),
  ].join("");

  await sendLiftEmail({
    to: params.to,
    subject: "Your LIFT plan has been updated",
    content,
    options: { previewText: `Plan updated to ${params.tierLabel}`, showUnsubscribe: false },
  });
}

// ─── Weekly Digest (Internal) ───

export async function sendWeeklyDigestEmail(params: {
  newTrials: number;
  conversions: number;
  expired: number;
  activeSchools: number;
  totalARR: number;
  pendingRequests: number;
  sessionLimitSchools: number;
  pastDue: number;
  deletionSchools: string[];
  weekDate: string;
}) {
  const content = [
    emailParagraph(`<strong>Weekly Summary — ${params.weekDate}</strong>`),
    emailDivider(),
    emailParagraph(`
      <strong>New trials:</strong> ${params.newTrials}<br/>
      <strong>Trials → Paid:</strong> ${params.conversions}<br/>
      <strong>Trials expired:</strong> ${params.expired}<br/>
      <strong>Active paid schools:</strong> ${params.activeSchools}<br/>
      <strong>Total ARR:</strong> $${params.totalARR.toLocaleString()}<br/>
      <strong>Pending upgrades:</strong> ${params.pendingRequests}<br/>
      <strong>Session limit &gt;80%:</strong> ${params.sessionLimitSchools}<br/>
      <strong>Past due:</strong> ${params.pastDue}
    `),
    params.deletionSchools.length > 0
      ? emailCallout(`Data deletion scheduled this week: ${params.deletionSchools.join(", ")}`, "warning")
      : "",
    emailButton("View Dashboard", `${APP}/admin/licenses/health`),
  ].join("");

  await sendLiftEmail({
    to: TEAM,
    subject: `LIFT Weekly — ${params.weekDate}`,
    content,
    options: { previewText: `${params.newTrials} new trials, $${params.totalARR.toLocaleString()} ARR`, showUnsubscribe: false },
  });
}
