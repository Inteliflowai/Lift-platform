export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const { data: rubric, error } = await supabaseAdmin
    .from("interview_rubric_submissions")
    .insert({
      candidate_id: body.candidate_id,
      tenant_id: body.tenant_id,
      interviewer_id: user.id,
      interview_date: body.interview_date ?? new Date().toISOString().split("T")[0],
      verbal_reasoning_score: body.verbal_reasoning_score,
      communication_score: body.communication_score,
      self_awareness_score: body.self_awareness_score,
      curiosity_score: body.curiosity_score,
      resilience_score: body.resilience_score,
      overall_impression: body.overall_impression,
      standout_moments: body.standout_moments ?? null,
      concerns: body.concerns ?? null,
      recommendation: body.recommendation,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(supabaseAdmin, {
    tenant_id: body.tenant_id,
    actor_id: user.id,
    candidate_id: body.candidate_id,
    action: "interview_rubric_submitted",
    payload: { recommendation: body.recommendation },
  });

  // Trigger synthesis asynchronously
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  fetch(`${baseUrl}/api/pipeline/synthesize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": process.env.INTERNAL_API_SECRET!,
    },
    body: JSON.stringify({ candidate_id: body.candidate_id, rubric_id: rubric.id }),
  }).catch((err) => console.error("Synthesis trigger failed:", err));

  return NextResponse.json(rubric, { status: 201 });
}
