export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import crypto from "crypto";

/**
 * Trial-conversion helper: lets a school admin send the assessment to
 * themselves with one click. Pre-fills name/email from their profile, uses
 * grade 8 (middle of the assessment range), creates a candidate flagged
 * `is_demo = true` so it cleanly soft-archives once they invite their first
 * real applicant. Returns the invite token; the client navigates to
 * /invite/{token} so the admin experiences the candidate flow firsthand.
 *
 * No invite email is sent — they're about to click through immediately.
 */
export async function POST() {
  const { tenantId, user } = await getTenantContext();

  // Read profile for name. Email comes from auth — full_name comes from the
  // users table that the registration flow populates.
  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const fullName = profile?.full_name?.trim() || "Demo User";
  const email = profile?.email?.trim() || user.email;
  if (!email) {
    return NextResponse.json(
      { error: "No email on file for this user." },
      { status: 400 }
    );
  }

  const [firstName, ...rest] = fullName.split(" ");
  const lastName = rest.join(" ") || "(You)";

  // Resolve active cycle (auto-created at registration). Fall back to most
  // recent draft cycle if somehow no active cycle exists yet.
  const { data: cycle } = await supabaseAdmin
    .from("application_cycles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Create candidate. Default to grade 8 — middle of the supported range, so
  // the admin gets the standard task mix. Marked is_demo so soft-archive
  // applies on first real invite.
  const { data: candidate, error: candErr } = await supabaseAdmin
    .from("candidates")
    .insert({
      tenant_id: tenantId,
      cycle_id: cycle?.id ?? null,
      first_name: firstName,
      last_name: lastName,
      grade_applying_to: "8",
      grade_band: "8",
      status: "invited",
      is_demo: true,
    })
    .select("id")
    .single();

  if (candErr || !candidate) {
    return NextResponse.json(
      { error: candErr?.message ?? "Failed to create candidate." },
      { status: 500 }
    );
  }

  const token = crypto.randomUUID();
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

  if (invErr) {
    return NextResponse.json({ error: invErr.message }, { status: 500 });
  }

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    candidate_id: candidate.id,
    action: "self_invite_created",
    payload: { email, grade: "8" },
  });

  return NextResponse.json({ token }, { status: 201 });
}
