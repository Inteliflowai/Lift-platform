export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { sendInviteEmail } from "@/lib/email";
import { markOnboardingStep } from "@/lib/onboarding";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { tenantId, tenant, user } = await getTenantContext();
  const body = await req.json();
  const {
    first_name,
    last_name,
    email,
    grade_applying_to,
    date_of_birth,
    gender,
    guardian_name,
    guardian_email,
  } = body;

  if (!first_name || !last_name || !email || !grade_applying_to) {
    return NextResponse.json(
      { error: "First name, last name, email, and grade are required" },
      { status: 400 }
    );
  }

  // Determine grade band
  const gradeNum = parseInt(grade_applying_to, 10);
  let gradeBand: string;
  if (gradeNum <= 7) gradeBand = "6-7";
  else if (gradeNum === 8) gradeBand = "8";
  else gradeBand = "9-11";

  // Get active cycle
  const { data: cycle } = await supabaseAdmin
    .from("application_cycles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .limit(1)
    .single();

  // Check COPPA: if under 13 and coppa_mode enabled
  const { data: settings } = await supabaseAdmin
    .from("tenant_settings")
    .select("coppa_mode, default_language")
    .eq("tenant_id", tenantId)
    .single();

  const coppaMode = settings?.coppa_mode ?? false;
  let needsGuardian = false;

  if (coppaMode && date_of_birth) {
    const dob = new Date(date_of_birth);
    const age = Math.floor(
      (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    if (age < 13) {
      needsGuardian = true;
      if (!guardian_name || !guardian_email) {
        return NextResponse.json(
          { error: "Guardian info required for candidates under 13 with COPPA mode enabled" },
          { status: 400 }
        );
      }
    }
  }

  // 1. Create candidate
  const { data: candidate, error: candErr } = await supabaseAdmin
    .from("candidates")
    .insert({
      tenant_id: tenantId,
      cycle_id: cycle?.id ?? null,
      first_name,
      last_name,
      grade_applying_to: String(grade_applying_to),
      grade_band: gradeBand,
      date_of_birth: date_of_birth || null,
      gender: gender || null,
      status: needsGuardian ? "consent_pending" : "invited",
    })
    .select()
    .single();

  if (candErr) return NextResponse.json({ error: candErr.message }, { status: 500 });

  // 2. Create guardian if COPPA
  if (needsGuardian && guardian_name && guardian_email) {
    await supabaseAdmin.from("guardians").insert({
      candidate_id: candidate.id,
      tenant_id: tenantId,
      full_name: guardian_name,
      email: guardian_email,
      is_primary: true,
    });
  }

  // 3. Generate token
  const token = crypto.randomUUID();

  // 4. Create invite
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error: invErr } = await supabaseAdmin.from("invites").insert({
    candidate_id: candidate.id,
    tenant_id: tenantId,
    token,
    sent_to_email: email,
    sent_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
    status: "pending",
  });

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });

  // 5. Send invite email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const link = `${appUrl}/invite/${token}`;
  const language = (settings?.default_language as "en" | "pt") ?? "en";

  await sendInviteEmail({
    to: email,
    candidateFirstName: first_name,
    schoolName: tenant?.name ?? "Your School",
    link,
    expiresAt,
    language,
  });

  // 6. Audit log
  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    candidate_id: candidate.id,
    action: "invite_sent",
    payload: { email, token, grade_band: gradeBand },
  });

  markOnboardingStep(tenantId, "candidate_invited").catch(() => {});

  // Track trial event (non-blocking)
  import("@/lib/trial/trackEvent").then(({ trackTrialEvent }) =>
    trackTrialEvent(tenantId, "first_candidate_invited", user.id).catch(() => {})
  );

  return NextResponse.json({ candidate, token }, { status: 201 });
}
