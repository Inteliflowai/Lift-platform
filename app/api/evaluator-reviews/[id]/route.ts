import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const allowed = ["notes", "recommendation_tier", "override_reason", "status"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (updates.status === "finalized") {
    updates.finalized_at = new Date().toISOString();
  }

  const { data: review, error } = await supabaseAdmin
    .from("evaluator_reviews")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const action = updates.status === "finalized" ? "review_finalized" :
    updates.status === "in_progress" ? "review_reopened" : "review_updated";

  await writeAuditLog(supabaseAdmin, {
    tenant_id: review.tenant_id,
    actor_id: user.id,
    candidate_id: review.candidate_id,
    action,
    payload: updates,
  });

  return NextResponse.json(review);
}
