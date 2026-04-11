export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET — CSV Export
export async function GET(req: NextRequest) {
  const { tenantId } = await getTenantContext();
  const cycleId = req.nextUrl.searchParams.get("cycle_id");
  const format = req.nextUrl.searchParams.get("format") ?? "standard";

  // Load admitted candidates
  let query = supabaseAdmin
    .from("candidates")
    .select("*, insight_profiles(*), learning_support_signals(*), sessions(completed_at)")
    .eq("tenant_id", tenantId)
    .in("status", ["admitted", "offered"]);

  if (cycleId) {
    query = query.eq("cycle_id", cycleId);
  }

  const { data: candidates } = await query;

  if (!candidates || candidates.length === 0) {
    return new NextResponse("No admitted candidates found", { status: 404 });
  }

  let csv = "";

  if (format === "veracross") {
    csv = "First Name,Last Name,Email,Applying For Grade,Gender,Language,TRI Score,Support Level,LIFT ID\n";
    for (const c of candidates) {
      const profile = Array.isArray(c.insight_profiles) ? c.insight_profiles[0] : c.insight_profiles;
      const signal = Array.isArray(c.learning_support_signals) ? c.learning_support_signals[0] : c.learning_support_signals;
      csv += `"${c.first_name}","${c.last_name}","${c.email ?? ""}","${c.grade_applying ?? ""}","${c.gender ?? ""}","${c.preferred_language ?? "en"}","${profile?.tri_score ?? ""}","${signal?.support_level ?? ""}","${c.id}"\n`;
    }
  } else if (format === "blackbaud") {
    csv = "first_name,last_name,email,entering_grade,gender,lift_tri_score,lift_support_level,lift_candidate_id\n";
    for (const c of candidates) {
      const profile = Array.isArray(c.insight_profiles) ? c.insight_profiles[0] : c.insight_profiles;
      const signal = Array.isArray(c.learning_support_signals) ? c.learning_support_signals[0] : c.learning_support_signals;
      csv += `"${c.first_name}","${c.last_name}","${c.email ?? ""}","${c.grade_applying ?? ""}","${c.gender ?? ""}","${profile?.tri_score ?? ""}","${signal?.support_level ?? ""}","${c.id}"\n`;
    }
  } else {
    // Standard format
    csv = "LIFT ID,First Name,Last Name,Email,Grade,Gender,Language,Session Completed,TRI Score,TRI Label,Reading,Writing,Reasoning,Reflection,Persistence,Support Seeking,Support Level\n";
    for (const c of candidates) {
      const profile = Array.isArray(c.insight_profiles) ? c.insight_profiles[0] : c.insight_profiles;
      const signal = Array.isArray(c.learning_support_signals) ? c.learning_support_signals[0] : c.learning_support_signals;
      const session = Array.isArray(c.sessions) ? c.sessions[0] : c.sessions;
      csv += `"${c.id}","${c.first_name}","${c.last_name}","${c.email ?? ""}","${c.grade_applying ?? ""}","${c.gender ?? ""}","${c.preferred_language ?? "en"}","${session?.completed_at ?? ""}","${profile?.tri_score ?? ""}","${profile?.tri_label ?? ""}","${profile?.reading_score ?? ""}","${profile?.writing_score ?? ""}","${profile?.reasoning_score ?? ""}","${profile?.reflection_score ?? ""}","${profile?.persistence_score ?? ""}","${profile?.support_seeking_score ?? ""}","${signal?.support_level ?? ""}"\n`;
    }
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="lift-export-${format}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

// POST — CSV Import
export async function POST(req: NextRequest) {
  const { tenantId } = await getTenantContext();
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const text = await file.text();
  const lines = text.split("\n").filter((l) => l.trim());

  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
  }

  const header = lines[0].toLowerCase();
  const emailIdx = header.split(",").findIndex((h) => h.replace(/"/g, "").trim() === "email");

  if (emailIdx === -1) {
    return NextResponse.json({ error: "CSV must contain an 'email' column" }, { status: 400 });
  }

  const created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.replace(/"/g, "").trim());
    const email = cols[emailIdx];

    if (!email) {
      errors.push(`Row ${i + 1}: missing email`);
      continue;
    }

    // Check if candidate exists
    const { data: existing } = await supabaseAdmin
      .from("candidates")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("email", email)
      .limit(1);

    if (existing && existing.length > 0) {
      updated++;
    } else {
      errors.push(`Row ${i + 1}: no matching candidate for ${email}`);
    }
  }

  return NextResponse.json({ created, updated, errors });
}
