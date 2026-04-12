import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  baseEmailTemplate,
  type EmailTemplateOptions,
} from "./templates/base";

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

interface LiftEmail {
  to: string;
  subject: string;
  content: string;
  tenantId?: string;
  options?: EmailTemplateOptions;
  bcc?: string;
}

// Cache tenant branding for 5 minutes
const brandingCache = new Map<
  string,
  { data: EmailTemplateOptions; expiresAt: number }
>();

async function getTenantBranding(
  tenantId: string
): Promise<EmailTemplateOptions> {
  const cached = brandingCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const { data } = await supabaseAdmin
    .from("tenant_settings")
    .select(
      "logo_url, wl_primary_color, wl_email_from_name, wl_email_reply_to"
    )
    .eq("tenant_id", tenantId)
    .single();

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .single();

  const branding: EmailTemplateOptions = {
    schoolName: tenant?.name,
    schoolLogoUrl: data?.logo_url ?? undefined,
    primaryColor: data?.wl_primary_color ?? "#6366f1",
  };

  brandingCache.set(tenantId, {
    data: branding,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  return branding;
}

export async function sendLiftEmail(email: LiftEmail): Promise<void> {
  try {
    // Load tenant branding if available
    let brandingOptions: EmailTemplateOptions = {};
    let fromName = "LIFT — Inteliflow";
    let replyTo = "lift@inteliflowai.com";

    if (email.tenantId) {
      brandingOptions = await getTenantBranding(email.tenantId).catch(
        () => ({})
      );

      // Load email-specific branding
      const { data: wl } = await supabaseAdmin
        .from("tenant_settings")
        .select("wl_email_from_name, wl_email_reply_to")
        .eq("tenant_id", email.tenantId)
        .single();

      if (wl?.wl_email_from_name) fromName = wl.wl_email_from_name;
      if (wl?.wl_email_reply_to) replyTo = wl.wl_email_reply_to;
    }

    const mergedOptions = { ...brandingOptions, ...email.options };
    const fullHtml = baseEmailTemplate(email.content, mergedOptions);

    const transporter = getTransporter();
    await transporter.sendMail({
      from: `${fromName} <${process.env.EMAIL_USER || "lift@inteliflowai.com"}>`,
      replyTo,
      to: email.to,
      subject: email.subject,
      html: fullHtml,
      bcc: email.bcc,
    });

    // Log successful delivery
    try {
      await supabaseAdmin.from("email_logs").insert({
        tenant_id: email.tenantId || null,
        recipient: email.to,
        subject: email.subject,
        status: "sent",
      });
    } catch { /* never fail on logging */ }
  } catch (err) {
    console.error("[Email] Send failed:", err);

    // Log failed delivery
    try {
      await supabaseAdmin.from("email_logs").insert({
        tenant_id: email.tenantId || null,
        recipient: email.to,
        subject: email.subject,
        status: "failed",
        error_message: err instanceof Error ? err.message : String(err),
      });
    } catch { /* never fail on logging */ }
  }
}
