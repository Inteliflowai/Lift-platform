import nodemailer from "nodemailer";

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

const FROM = `LIFT <${process.env.EMAIL_USER || "lift@inteliflowai.com"}>`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in sendTrialReminderEmail, sendAccountStatusEmail, etc. below
const TEAM_EMAIL = process.env.LIFT_TEAM_EMAIL || "lift@inteliflowai.com";

async function sendMail(to: string, subject: string, html: string, bcc?: string) {
  const transporter = getTransporter();
  await transporter.sendMail({ from: FROM, to, subject, html, bcc });
}

export async function sendInviteEmail(params: {
  to: string;
  candidateFirstName: string;
  schoolName: string;
  link: string;
  expiresAt: Date;
  language: "en" | "pt";
}) {
  const isEn = params.language === "en";

  const subject = isEn
    ? `${params.schoolName} — You're Invited to Complete Your LIFT Profile`
    : `${params.schoolName} — Convite para Completar seu Perfil LIFT`;

  const expiryStr = params.expiresAt.toLocaleDateString(
    isEn ? "en-US" : "pt-BR",
    { year: "numeric", month: "long", day: "numeric" }
  );

  const html = isEn
    ? `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #6366f1;">LIFT</h2>
        <p>Hi ${params.candidateFirstName},</p>
        <p><strong>${params.schoolName}</strong> has invited you to complete a short set of reading, writing, and reasoning activities as part of your admissions process.</p>
        <p>This is not a test — there are no right or wrong answers. We're interested in how you think and approach different tasks.</p>
        <p style="margin: 24px 0;">
          <a href="${params.link}" style="background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Start Your LIFT Session</a>
        </p>
        <p style="color: #666; font-size: 14px;">This link expires on ${expiryStr}.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">LIFT is a non-diagnostic admissions insight platform by Inteliflow AI. It does not diagnose any clinical or medical condition.</p>
      </div>
    `
    : `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #6366f1;">LIFT</h2>
        <p>Olá ${params.candidateFirstName},</p>
        <p><strong>${params.schoolName}</strong> convidou você a completar um conjunto de atividades de leitura, escrita e raciocínio como parte do processo de admissão.</p>
        <p>Isto não é uma prova — não existem respostas certas ou erradas. Queremos entender como você pensa e aborda diferentes tarefas.</p>
        <p style="margin: 24px 0;">
          <a href="${params.link}" style="background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Iniciar Sessão LIFT</a>
        </p>
        <p style="color: #666; font-size: 14px;">Este link expira em ${expiryStr}.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">LIFT é uma plataforma de insights de admissão não-diagnóstica da Inteliflow AI. Não diagnostica nenhuma condição clínica ou médica.</p>
      </div>
    `;

  return sendMail(params.to, subject, html);
}

export async function sendTeamInviteEmail(params: {
  to: string;
  schoolName: string;
  role: string;
  link: string;
}) {
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #6366f1;">LIFT</h2>
      <p>You've been invited to join <strong>${params.schoolName}</strong> on LIFT as a <strong>${params.role}</strong>.</p>
      <p style="margin: 24px 0;">
        <a href="${params.link}" style="background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Accept Invitation</a>
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">LIFT is a non-diagnostic admissions insight platform by Inteliflow AI.</p>
    </div>
  `;

  return sendMail(
    params.to,
    `${params.schoolName} — You're Invited to LIFT`,
    html
  );
}

export async function sendWelcomeEmail(params: {
  to: string;
  firstName: string;
  schoolName: string;
  trialEndsAt: Date;
  dashboardUrl: string;
}) {
  const trialEndStr = params.trialEndsAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #6366f1;">LIFT</h2>
      <p>Hi ${params.firstName},</p>
      <p>Your LIFT account for <strong>${params.schoolName}</strong> is ready. You have 30 days to explore everything LIFT has to offer — at no cost and with no credit card required.</p>
      <p style="font-weight: 600; margin-top: 20px;">Your trial includes:</p>
      <ul style="color: #444; font-size: 14px; line-height: 1.8;">
        <li>Up to 25 candidate sessions</li>
        <li>Full evaluator workspace and AI-powered reports</li>
        <li>Transition Readiness Index (TRI) scoring</li>
        <li>Learning Support Signals panel</li>
        <li>Evaluator Intelligence — pre-interview briefings and interview synthesis</li>
        <li>English and Portuguese report generation</li>
      </ul>
      <p style="color: #666; font-size: 14px;">Your trial ends on <strong>${trialEndStr}</strong>.</p>
      <p style="margin: 24px 0;">
        <a href="${params.dashboardUrl}" style="background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Go to My Dashboard</a>
      </p>
      <p style="color: #666; font-size: 14px;">Questions? Reply to this email — we're here to help.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">LIFT is a non-diagnostic admissions insight platform by Inteliflow AI.</p>
    </div>
  `;

  return sendMail(
    params.to,
    `Welcome to LIFT, ${params.firstName}! Your 30-day trial starts now.`,
    html
  );
}

export async function sendTrialExpiredEmail(params: {
  to: string;
  firstName: string;
  schoolName: string;
  dataDeletionDate: Date;
  upgradeUrl: string;
}) {
  const deletionStr = params.dataDeletionDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #6366f1;">LIFT</h2>
      <p>Hi ${params.firstName},</p>
      <p>Your 30-day LIFT trial for <strong>${params.schoolName}</strong> has ended.</p>
      <p>Your data — including all candidate sessions, evaluations, and reports — is safely stored and will be available for 30 days.</p>
      <p>Upgrade before <strong>${deletionStr}</strong> to restore full access and keep your data permanently.</p>
      <p style="margin: 24px 0;">
        <a href="${params.upgradeUrl}" style="background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Upgrade Now</a>
      </p>
      <p style="color: #666; font-size: 14px;">
        Need to talk? <a href="mailto:support@inteliflowai.com" style="color: #6366f1;">Contact our team</a>
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">LIFT is a non-diagnostic admissions insight platform by Inteliflow AI.</p>
    </div>
  `;

  return sendMail(
    params.to,
    `Your LIFT trial has ended — your data is safe`,
    html
  );
}

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
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #6366f1;">LIFT — Upgrade Request</h2>
      <p><strong>${params.schoolName}</strong> has requested an upgrade.</p>
      <table style="font-size: 14px; line-height: 1.8; margin: 16px 0;">
        <tr><td style="padding-right: 16px; color: #666;">Current tier:</td><td><strong>${params.currentTier}</strong></td></tr>
        <tr><td style="padding-right: 16px; color: #666;">Requested tier:</td><td><strong>${params.requestedTier}</strong></td></tr>
        <tr><td style="padding-right: 16px; color: #666;">Billing:</td><td>${params.billingPreference}</td></tr>
        <tr><td style="padding-right: 16px; color: #666;">Contact:</td><td>${params.adminName} (${params.adminEmail})</td></tr>
      </table>
      ${params.message ? `<p style="background: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 14px;">${params.message}</p>` : ""}
      <p style="margin: 24px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/licenses/${params.tenantId}" style="background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">View in Admin Panel</a>
      </p>
    </div>
  `;

  return sendMail(
    process.env.EMAIL_USER || "lift@inteliflowai.com",
    `Upgrade Request — ${params.schoolName} → ${params.requestedTier}`,
    html
  );
}

export async function sendUpgradeConfirmationEmail(params: {
  to: string;
  firstName: string;
  requestedTier: string;
}) {
  const tierLabel = params.requestedTier.charAt(0).toUpperCase() + params.requestedTier.slice(1);

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #6366f1;">LIFT</h2>
      <p>Hi ${params.firstName},</p>
      <p>We've received your request to upgrade to the <strong>${tierLabel}</strong> plan. Our team will send you a quote within 1 business day.</p>
      <p style="color: #666; font-size: 14px;">If you have any questions in the meantime, just reply to this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">LIFT is a non-diagnostic admissions insight platform by Inteliflow AI.</p>
    </div>
  `;

  return sendMail(
    params.to,
    `We received your upgrade request`,
    html
  );
}

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
  const endStr = params.periodEndsAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #6366f1;">LIFT</h2>
      <p>Hi ${params.firstName},</p>
      <p>Great news — your LIFT <strong>${params.tierLabel}</strong> plan for <strong>${params.schoolName}</strong> is now active.</p>
      <ul style="color: #444; font-size: 14px; line-height: 1.8;">
        <li>Plan: ${params.tierLabel}</li>
        <li>Annual fee: $${params.annualAmount.toLocaleString()}</li>
        <li>Active until: ${endStr}</li>
        ${params.sessionsLimit ? `<li>Sessions: ${params.sessionsLimit} per year</li>` : "<li>Sessions: Unlimited</li>"}
      </ul>
      <p style="color: #666; font-size: 14px;">Your invoice will follow separately. If you have any questions, reply to this email.</p>
      <p style="margin: 24px 0;">
        <a href="${params.dashboardUrl}" style="background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Go to Dashboard</a>
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">LIFT is a non-diagnostic admissions insight platform by Inteliflow AI.</p>
    </div>
  `;

  return sendMail(
    params.to,
    `Your LIFT ${params.tierLabel} plan is now active — welcome aboard!`,
    html
  );
}

// --- License notification emails ---

function liftEmailWrap(body: string): string {
  return `<div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
    <h2 style="color: #6366f1;">LIFT</h2>
    ${body}
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
    <p style="color: #999; font-size: 12px;">LIFT is a non-diagnostic admissions insight platform by Inteliflow AI.</p>
  </div>`;
}

export async function sendTrialExpiringEmail(params: {
  to: string;
  firstName: string;
  schoolName: string;
  daysRemaining: number;
}) {
  const urgent = params.daysRemaining <= 3;
  const html = liftEmailWrap(`
    <p>Hi ${params.firstName},</p>
    <p>${urgent ? "<strong>Urgent:</strong> " : ""}Your LIFT trial for <strong>${params.schoolName}</strong> ends in <strong>${params.daysRemaining} day${params.daysRemaining !== 1 ? "s" : ""}</strong>.</p>
    <p>Upgrade now to keep access to all your candidate data, reports, and evaluations.</p>
    <p style="margin: 24px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/school/settings/subscription" style="background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Upgrade Now</a>
    </p>
  `);
  return sendMail(params.to, `Your LIFT trial ends in ${params.daysRemaining} days`, html, TEAM_EMAIL);
}

export async function sendSuspendedEmail(params: {
  to: string;
  firstName: string;
  schoolName: string;
  reason: string;
  dataDeletionDate: Date | null;
}) {
  const isTrialExpiry = params.reason === "trial_expired";
  const deletionStr = params.dataDeletionDate?.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const html = liftEmailWrap(`
    <p>Hi ${params.firstName},</p>
    <p>Your LIFT account for <strong>${params.schoolName}</strong> has been ${isTrialExpiry ? "suspended because your trial has ended" : "suspended due to a billing issue"}.</p>
    ${deletionStr ? `<p>Your data is safely stored until <strong>${deletionStr}</strong>. Upgrade before then to restore full access.</p>` : ""}
    <p style="margin: 24px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/school/settings/subscription" style="background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Reactivate Now</a>
    </p>
    <p style="color: #666; font-size: 14px;">Need help? <a href="mailto:${TEAM_EMAIL}" style="color: #6366f1;">Contact our team</a></p>
  `);
  return sendMail(params.to, isTrialExpiry ? "Your LIFT trial has ended" : "Your LIFT account has been suspended", html, TEAM_EMAIL);
}

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
  const html = liftEmailWrap(`
    <p>Hi ${params.firstName},</p>
    <p>Your LIFT <strong>${params.tierLabel}</strong> plan for <strong>${params.schoolName}</strong> renews on <strong>${dateStr}</strong> (${params.daysUntilRenewal} days).</p>
    <p>Annual fee: <strong>$${params.annualAmount.toLocaleString()}</strong></p>
    <p>If you'd like to change your plan or have questions about renewal, please contact us.</p>
    <p style="margin: 24px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/school/settings/subscription" style="background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Subscription</a>
    </p>
  `);
  return sendMail(params.to, `LIFT renewal in ${params.daysUntilRenewal} days — ${params.schoolName}`, html, TEAM_EMAIL);
}

export async function sendSessionLimitWarningEmail(params: {
  to: string;
  firstName: string;
  schoolName: string;
  used: number;
  limit: number;
}) {
  const pct = Math.round((params.used / params.limit) * 100);
  const html = liftEmailWrap(`
    <p>Hi ${params.firstName},</p>
    <p>You've used <strong>${params.used} of ${params.limit}</strong> sessions (${pct}%) for <strong>${params.schoolName}</strong> this year.</p>
    <p>Upgrade your plan to get more sessions and keep your admissions process running smoothly.</p>
    <p style="margin: 24px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/school/settings/subscription" style="background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Upgrade Now</a>
    </p>
  `);
  return sendMail(params.to, `${pct}% of your LIFT sessions used — ${params.schoolName}`, html, TEAM_EMAIL);
}

export async function sendDataDeletionWarningEmail(params: {
  to: string;
  firstName: string;
  schoolName: string;
  daysRemaining: number;
  deletionDate: Date;
}) {
  const dateStr = params.deletionDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const html = liftEmailWrap(`
    <p>Hi ${params.firstName},</p>
    <p><strong>URGENT:</strong> Your LIFT data for <strong>${params.schoolName}</strong> will be permanently deleted on <strong>${dateStr}</strong> (${params.daysRemaining} days).</p>
    <p>This includes all candidate sessions, evaluations, reports, and AI-generated insights.</p>
    <p>Reactivate your subscription now to keep your data permanently.</p>
    <p style="margin: 24px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/school/settings/subscription" style="background: #f43f5e; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Reactivate Now</a>
    </p>
  `);
  return sendMail(params.to, `URGENT: LIFT data deletion in ${params.daysRemaining} days — ${params.schoolName}`, html, TEAM_EMAIL);
}

export async function sendPlanUpdatedEmail(params: {
  to: string;
  firstName: string;
  tierLabel: string;
}) {
  const html = liftEmailWrap(`
    <p>Hi ${params.firstName},</p>
    <p>Your LIFT plan has been updated to <strong>${params.tierLabel}</strong>.</p>
    <p style="margin: 24px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/school/settings/subscription" style="background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Subscription</a>
    </p>
  `);
  return sendMail(params.to, `Your LIFT plan has been updated`, html, TEAM_EMAIL);
}

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
  const html = liftEmailWrap(`
    <p><strong>Weekly Summary — ${params.weekDate}</strong></p>
    <table style="font-size: 14px; line-height: 2; margin: 16px 0;">
      <tr><td style="padding-right: 24px; color: #666;">New trials:</td><td><strong>${params.newTrials}</strong></td></tr>
      <tr><td style="padding-right: 24px; color: #666;">Trials → Paid:</td><td><strong>${params.conversions}</strong></td></tr>
      <tr><td style="padding-right: 24px; color: #666;">Trials expired:</td><td><strong>${params.expired}</strong></td></tr>
      <tr><td style="padding-right: 24px; color: #666;">Active paid schools:</td><td><strong>${params.activeSchools}</strong></td></tr>
      <tr><td style="padding-right: 24px; color: #666;">Total ARR:</td><td><strong>$${params.totalARR.toLocaleString()}</strong></td></tr>
      <tr><td style="padding-right: 24px; color: #666;">Pending upgrades:</td><td><strong>${params.pendingRequests}</strong></td></tr>
      <tr><td style="padding-right: 24px; color: #666;">Session limit >80%:</td><td><strong>${params.sessionLimitSchools}</strong></td></tr>
      <tr><td style="padding-right: 24px; color: #666;">Past due:</td><td><strong>${params.pastDue}</strong></td></tr>
    </table>
    ${params.deletionSchools.length > 0 ? `<p style="color: #f43f5e; font-weight: 600;">Data deletion scheduled this week: ${params.deletionSchools.join(", ")}</p>` : ""}
    <p style="margin: 24px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/licenses/health" style="background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Dashboard</a>
    </p>
  `);
  return sendMail(TEAM_EMAIL, `LIFT Weekly — ${params.weekDate}`, html);
}
