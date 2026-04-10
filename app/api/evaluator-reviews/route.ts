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
  const { candidate_id, tenant_id } = body;

  // Get current insight profile for AI snapshot
  const { data: profile } = await supabaseAdmin
    .from("insight_profiles")
    .select("reading_score, writing_score, reasoning_score, reflection_score, persistence_score, support_seeking_score, overall_confidence, placement_guidance")
    .eq("candidate_id", candidate_id)
    .eq("is_final", true)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  const { data: review, error } = await supabaseAdmin
    .from("evaluator_reviews")
    .insert({
      candidate_id,
      tenant_id,
      evaluator_id: user.id,
      status: "in_progress",
      ai_recommendation_snapshot: profile ?? {},
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(supabaseAdmin, {
    tenant_id, actor_id: user.id, candidate_id, action: "review_started",
  });

  return NextResponse.json(review, { status: 201 });
}
