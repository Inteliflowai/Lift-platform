import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { session_id, candidate_email } = body;

  if (!session_id) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  const resumeToken = crypto.randomUUID();

  // Update session
  const { data: session, error } = await supabaseAdmin
    .from("sessions")
    .update({
      status: "paused",
      resume_token: resumeToken,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", session_id)
    .select("*, candidates(first_name, tenant_id)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Record event
  await supabaseAdmin.from("session_events").insert({
    session_id,
    tenant_id: session.tenant_id,
    event_type: "session_paused",
    payload: { resume_token: resumeToken },
  });

  // Send resume email if we have an email
  if (candidate_email) {
    const { data: settings } = await supabaseAdmin
      .from("tenant_settings")
      .select("session_pause_limit_hours, default_language")
      .eq("tenant_id", session.tenant_id)
      .single();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resumeLink = `${appUrl}/session/resume/${resumeToken}`;
    const candidateName = (session.candidates as unknown as { first_name: string })?.first_name ?? "there";

    let expiryNote = "";
    if (settings?.session_pause_limit_hours) {
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + settings.session_pause_limit_hours);
      expiryNote = `<p style="color: #666; font-size: 14px;">This link expires on ${expiry.toLocaleString()}.</p>`;
    }

    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 465,
      secure: true,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `LIFT <${process.env.EMAIL_USER || "lift@inteliflowai.com"}>`,
      to: candidate_email,
      subject: "Continue Your LIFT Session",
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #6366f1;">LIFT</h2>
          <p>Hi ${candidateName},</p>
          <p>Your session has been paused. When you're ready to continue, click the button below.</p>
          <p style="margin: 24px 0;">
            <a href="${resumeLink}" style="background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Continue Session</a>
          </p>
          ${expiryNote}
        </div>
      `,
    });
  }

  return NextResponse.json({ ok: true, resume_token: resumeToken });
}
