import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { session_id, task_instance_id } = body;

  if (!session_id) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  // Get tenant_id from session
  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("tenant_id")
    .eq("id", session_id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Insert heartbeat event
  await supabaseAdmin.from("session_events").insert({
    session_id,
    tenant_id: session.tenant_id,
    event_type: "heartbeat",
    task_instance_id: task_instance_id ?? null,
    payload: { timestamp: new Date().toISOString() },
  });

  // Update last_activity_at
  await supabaseAdmin
    .from("sessions")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", session_id);

  return NextResponse.json({ ok: true });
}
