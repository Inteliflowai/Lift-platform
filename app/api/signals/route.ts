import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, session_id, task_instance_id, tenant_id, signals } = body;

  if (!session_id || !tenant_id || !type) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (type === "interaction") {
    for (const s of signals ?? [body]) {
      await supabaseAdmin.from("interaction_signals").insert({
        session_id,
        task_instance_id: s.task_instance_id ?? task_instance_id ?? null,
        tenant_id,
        signal_type: s.signal_type,
        payload: s.payload ?? {},
      });
    }
  } else if (type === "timing") {
    for (const s of signals ?? [body]) {
      await supabaseAdmin.from("timing_signals").insert({
        session_id,
        task_instance_id: s.task_instance_id ?? task_instance_id ?? null,
        tenant_id,
        signal_type: s.signal_type,
        value_ms: s.value_ms ?? 0,
      });
    }
  } else if (type === "help") {
    for (const s of signals ?? [body]) {
      await supabaseAdmin.from("help_events").insert({
        session_id,
        task_instance_id: s.task_instance_id ?? task_instance_id ?? null,
        tenant_id,
        event_type: s.event_type ?? s.signal_type,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
