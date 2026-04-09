import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  // Heartbeat must NEVER fail visibly to the client
  try {
    const body = await req.json();
    const { session_id, task_instance_id } = body;

    if (!session_id) {
      return NextResponse.json({ ok: true }); // silent — don't error for heartbeat
    }

    const { data: session } = await supabaseAdmin
      .from("sessions")
      .select("tenant_id")
      .eq("id", session_id)
      .single();

    if (!session) {
      return NextResponse.json({ ok: true }); // silent
    }

    // Non-critical DB writes — fire and forget
    await Promise.allSettled([
      supabaseAdmin.from("session_events").insert({
        session_id,
        tenant_id: session.tenant_id,
        event_type: "heartbeat",
        task_instance_id: task_instance_id ?? null,
      }),
      supabaseAdmin
        .from("sessions")
        .update({ last_activity_at: new Date().toISOString() })
        .eq("id", session_id),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    // Always return 200 — heartbeat failure should never surface to candidate
    return NextResponse.json({ ok: true });
  }
}
