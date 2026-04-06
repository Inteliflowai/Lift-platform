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

async function sendMail(to: string, subject: string, html: string) {
  const transporter = getTransporter();
  await transporter.sendMail({ from: FROM, to, subject, html });
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
