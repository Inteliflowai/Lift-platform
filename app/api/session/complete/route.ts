import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { markOnboardingStep } from "@/lib/onboarding";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { session_id } = body;

  if (!session_id) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  // Get session with candidate
  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("tenant_id, candidate_id")
    .eq("id", session_id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Update session
  await supabaseAdmin
    .from("sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      completion_pct: 100,
    })
    .eq("id", session_id);

  // Update candidate
  await supabaseAdmin
    .from("candidates")
    .update({ status: "completed" })
    .eq("id", session.candidate_id);

  // Record event
  await supabaseAdmin.from("session_events").insert({
    session_id,
    tenant_id: session.tenant_id,
    event_type: "session_complete",
  });

  // Candidate status history
  await supabaseAdmin.from("candidate_status_history").insert({
    candidate_id: session.candidate_id,
    tenant_id: session.tenant_id,
    from_status: "active",
    to_status: "completed",
    reason: "Session completed",
  });

  markOnboardingStep(session.tenant_id, "session_completed").catch(() => {});

  // Trigger AI pipeline (fire-and-forget — don't block the candidate)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  fetch(`${baseUrl}/api/pipeline/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": process.env.INTERNAL_API_SECRET!,
    },
    body: JSON.stringify({ session_id }),
  }).catch((err) => {
    console.error("Pipeline trigger failed:", err);
  });

  return NextResponse.json({ ok: true });
}
