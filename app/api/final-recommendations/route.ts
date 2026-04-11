export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { candidate_id, tenant_id, decision, rationale } = body;

  if (!candidate_id || !decision) {
    return NextResponse.json({ error: "candidate_id and decision required" }, { status: 400 });
  }

  const { data: rec, error } = await supabaseAdmin
    .from("final_recommendations")
    .insert({
      candidate_id,
      tenant_id,
      decided_by: user.id,
      decision,
      rationale: rationale ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update candidate status
  const newStatus = decision === "admit" ? "admitted" : decision === "waitlist" ? "waitlisted" : "reviewed";
  await supabaseAdmin
    .from("candidates")
    .update({ status: newStatus })
    .eq("id", candidate_id);

  await supabaseAdmin.from("candidate_status_history").insert({
    candidate_id,
    tenant_id,
    from_status: "completed",
    to_status: newStatus,
    changed_by: user.id,
    reason: `Final decision: ${decision}`,
  });

  await writeAuditLog(supabaseAdmin, {
    tenant_id,
    actor_id: user.id,
    candidate_id,
    action: "final_recommendation",
    payload: { decision, rationale },
  });

  // If admit → trigger CORE handoff + support plan generation asynchronously
  if (decision === "admit") {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const internalHeaders = {
      "Content-Type": "application/json",
      "x-internal-secret": process.env.INTERNAL_API_SECRET!,
    };
    fetch(`${baseUrl}/api/integrations/core-handoff`, {
      method: "POST",
      headers: internalHeaders,
      body: JSON.stringify({ candidate_id }),
    }).catch((err) => {
      console.error("CORE handoff trigger failed:", err);
    });
    // Generate support plan
    fetch(`${baseUrl}/api/pipeline/support-plan`, {
      method: "POST",
      headers: internalHeaders,
      body: JSON.stringify({ candidate_id }),
    }).catch((err) => {
      console.error("Support plan generation trigger failed:", err);
    });
  }

  return NextResponse.json(rec, { status: 201 });
}
