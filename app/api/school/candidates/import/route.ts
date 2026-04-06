import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { sendInviteEmail } from "@/lib/email";
import crypto from "crypto";

type ImportRow = {
  first_name: string;
  last_name: string;
  email: string;
  grade_applying_to: string;
  date_of_birth?: string;
  guardian_name?: string;
  guardian_email?: string;
};

export async function POST(req: NextRequest) {
  const { tenantId, tenant, user } = await getTenantContext();
  const body = await req.json();
  const { candidates, send_invites } = body as {
    candidates: ImportRow[];
    send_invites: boolean;
  };

  if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
    return NextResponse.json({ error: "No candidates provided" }, { status: 400 });
  }

  if (candidates.length > 500) {
    return NextResponse.json({ error: "Max 500 candidates per import" }, { status: 400 });
  }

  // Get active cycle
  const { data: cycle } = await supabaseAdmin
    .from("application_cycles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .limit(1)
    .single();

  // Get tenant settings
  const { data: settings } = await supabaseAdmin
    .from("tenant_settings")
    .select("coppa_mode, default_language")
    .eq("tenant_id", tenantId)
    .single();

  const language = (settings?.default_language as "en" | "pt") ?? "en";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const results: { row: number; status: string; error?: string; name?: string }[] = [];
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < candidates.length; i++) {
    const row = candidates[i];

    // Validate required fields
    if (!row.first_name || !row.last_name || !row.email || !row.grade_applying_to) {
      results.push({
        row: i + 1,
        status: "error",
        error: "Missing required field (first_name, last_name, email, grade_applying_to)",
      });
      skipped++;
      continue;
    }

    // Validate grade
    const gradeNum = parseInt(String(row.grade_applying_to), 10);
    if (isNaN(gradeNum) || gradeNum < 6 || gradeNum > 11) {
      results.push({
        row: i + 1,
        status: "error",
        error: `Invalid grade: ${row.grade_applying_to} (must be 6-11)`,
        name: `${row.first_name} ${row.last_name}`,
      });
      skipped++;
      continue;
    }

    // Check for duplicate email
    const { data: existing } = await supabaseAdmin
      .from("candidates")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("first_name", row.first_name)
      .eq("last_name", row.last_name)
      .limit(1)
      .single();

    if (existing) {
      results.push({
        row: i + 1,
        status: "skipped",
        error: "Candidate already exists",
        name: `${row.first_name} ${row.last_name}`,
      });
      skipped++;
      continue;
    }

    // Determine grade band
    let gradeBand: string;
    if (gradeNum <= 7) gradeBand = "6-7";
    else if (gradeNum === 8) gradeBand = "8";
    else gradeBand = "9-11";

    // COPPA check
    let needsGuardian = false;
    if (settings?.coppa_mode && row.date_of_birth) {
      const age = Math.floor(
        (Date.now() - new Date(row.date_of_birth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      );
      needsGuardian = age < 13;
    }

    try {
      // Create candidate
      const { data: candidate, error: candErr } = await supabaseAdmin
        .from("candidates")
        .insert({
          tenant_id: tenantId,
          cycle_id: cycle?.id ?? null,
          first_name: row.first_name.trim(),
          last_name: row.last_name.trim(),
          grade_applying_to: String(gradeNum),
          grade_band: gradeBand,
          date_of_birth: row.date_of_birth || null,
          status: needsGuardian ? "consent_pending" : "invited",
        })
        .select()
        .single();

      if (candErr) throw candErr;

      // Guardian if needed
      if (needsGuardian && row.guardian_name && row.guardian_email) {
        await supabaseAdmin.from("guardians").insert({
          candidate_id: candidate.id,
          tenant_id: tenantId,
          full_name: row.guardian_name.trim(),
          email: row.guardian_email.trim(),
          is_primary: true,
        });
      }

      // Create invite
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await supabaseAdmin.from("invites").insert({
        candidate_id: candidate.id,
        tenant_id: tenantId,
        token,
        sent_to_email: row.email.trim(),
        sent_at: send_invites ? new Date().toISOString() : null,
        expires_at: expiresAt.toISOString(),
        status: "pending",
      });

      // Send invite email if requested
      if (send_invites) {
        await sendInviteEmail({
          to: row.email.trim(),
          candidateFirstName: row.first_name.trim(),
          schoolName: tenant?.name ?? "Your School",
          link: `${appUrl}/invite/${token}`,
          expiresAt,
          language,
        });
      }

      results.push({
        row: i + 1,
        status: "created",
        name: `${row.first_name} ${row.last_name}`,
      });
      created++;
    } catch (err) {
      results.push({
        row: i + 1,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
        name: `${row.first_name} ${row.last_name}`,
      });
      skipped++;
    }
  }

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    action: "candidates_imported",
    payload: { total: candidates.length, created, skipped, send_invites },
  });

  return NextResponse.json({ created, skipped, total: candidates.length, results });
}
