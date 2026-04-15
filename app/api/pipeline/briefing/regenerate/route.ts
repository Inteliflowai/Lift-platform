import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { tenantId } = await getTenantContext();
  const { candidate_id } = await req.json();

  if (!candidate_id) {
    return NextResponse.json({ error: "candidate_id required" }, { status: 400 });
  }

  // Get session for this candidate
  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("id")
    .eq("candidate_id", candidate_id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  if (!session) {
    return NextResponse.json({ error: "No completed session" }, { status: 404 });
  }

  // Delete any existing briefing so a fresh one is generated
  await supabaseAdmin
    .from("evaluator_briefings")
    .delete()
    .eq("candidate_id", candidate_id)
    .eq("tenant_id", tenantId);

  // Trigger briefing generation
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/pipeline/briefing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": process.env.INTERNAL_API_SECRET!,
    },
    body: JSON.stringify({ candidate_id, session_id: session.id }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: err?.error ?? "Briefing generation failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
