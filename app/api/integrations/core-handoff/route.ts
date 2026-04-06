import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { candidate_id } = await req.json();
  if (!candidate_id) {
    return NextResponse.json({ error: "candidate_id required" }, { status: 400 });
  }

  const coreApiUrl = process.env.CORE_API_URL;
  if (!coreApiUrl) {
    // CORE not configured — skip silently
    await writeAuditLog(supabaseAdmin, {
      action: "core_handoff_skipped",
      payload: { reason: "CORE_API_URL not configured", candidate_id },
    });
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Get candidate + profile data
  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("*, tenants(slug), insight_profiles(reading_score, writing_score, reasoning_score, reflection_score, persistence_score, support_seeking_score, placement_guidance)")
    .eq("id", candidate_id)
    .single();

  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const tenant = candidate.tenants as unknown as { slug: string };
  const profile = (candidate.insight_profiles as unknown[])?.[0] as Record<string, unknown> | undefined;

  const payload = {
    first_name: candidate.first_name,
    last_name: candidate.last_name,
    grade_applying_to: candidate.grade_applying_to,
    preferred_language: candidate.preferred_language,
    tenant_slug: tenant?.slug,
    lift_candidate_id: candidate.id,
    dimension_scores: profile
      ? {
          reading: profile.reading_score,
          writing: profile.writing_score,
          reasoning: profile.reasoning_score,
          reflection: profile.reflection_score,
          persistence: profile.persistence_score,
          support_seeking: profile.support_seeking_score,
        }
      : null,
    placement_guidance: profile?.placement_guidance ?? null,
  };

  try {
    const res = await fetch(`${coreApiUrl}/api/integrations/lift/candidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_API_SECRET!,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`CORE responded ${res.status}`);
    }

    const data = await res.json();

    // Store core_student_id
    if (data.student_id) {
      await supabaseAdmin
        .from("candidates")
        .update({ core_student_id: data.student_id })
        .eq("id", candidate_id);
    }

    await writeAuditLog(supabaseAdmin, {
      tenant_id: candidate.tenant_id,
      candidate_id,
      action: "core_handoff_complete",
      payload: { core_student_id: data.student_id },
    });

    return NextResponse.json({ ok: true, core_student_id: data.student_id });
  } catch (err) {
    await writeAuditLog(supabaseAdmin, {
      tenant_id: candidate.tenant_id,
      candidate_id,
      action: "core_handoff_failed",
      payload: { error: err instanceof Error ? err.message : String(err) },
    });

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "CORE handoff failed" },
      { status: 502 }
    );
  }
}
