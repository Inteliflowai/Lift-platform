import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, candidate_id, guardian_id, action } = body;

  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("tenant_id, first_name")
    .eq("id", candidate_id)
    .single();

  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name")
    .eq("id", candidate.tenant_id)
    .single();

  if (action === "send_request") {
    // Get guardian
    const { data: guardian } = await supabaseAdmin
      .from("guardians")
      .select("*")
      .eq("candidate_id", candidate_id)
      .eq("is_primary", true)
      .single();

    if (!guardian) {
      return NextResponse.json({ error: "No guardian found" }, { status: 404 });
    }

    // Record that we sent the request
    await supabaseAdmin.from("consent_events").insert({
      candidate_id,
      tenant_id: candidate.tenant_id,
      consented_by: "system",
      guardian_id: guardian.id,
      consent_type: "guardian_request_sent",
    });

    // Send email to guardian
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const link = `${appUrl}/consent/guardian/${token}`;

    // Send guardian consent email
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 465,
      secure: true,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `LIFT <${process.env.EMAIL_USER || "lift@inteliflowai.com"}>`,
      to: guardian.email,
      subject: `${tenant?.name} — Guardian Consent Required for ${candidate.first_name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #6366f1;">LIFT</h2>
          <p>Hello ${guardian.full_name},</p>
          <p><strong>${tenant?.name}</strong> has invited ${candidate.first_name} to complete the LIFT experience. Because they are under 13, we need your consent before they can begin.</p>
          <p style="margin: 24px 0;">
            <a href="${link}" style="background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Review & Give Consent</a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">LIFT is a non-diagnostic admissions insight platform by Inteliflow AI.</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "approve") {
    // Insert guardian consent
    await supabaseAdmin.from("consent_events").insert({
      candidate_id,
      tenant_id: candidate.tenant_id,
      consented_by: "guardian",
      guardian_id: guardian_id || null,
      consent_type: "guardian_on_behalf",
      ip_address:
        req.headers.get("x-forwarded-for") ??
        req.headers.get("x-real-ip") ??
        "",
      user_agent: req.headers.get("user-agent") ?? "",
    });

    // Update candidate status
    await supabaseAdmin
      .from("candidates")
      .update({ status: "active" })
      .eq("id", candidate_id);

    // Update invite status
    await supabaseAdmin
      .from("invites")
      .update({ status: "accepted" })
      .eq("candidate_id", candidate_id)
      .in("status", ["pending", "opened"]);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
