export const dynamic = "force-dynamic";
export const maxDuration = 180; // bounded concurrency of 5 keeps us well under this

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { commitStagedVotes } from "@/lib/committee/commitStagedVotes";

export async function POST(
  req: NextRequest,
  context: { params: { id: string } },
) {
  const { user, tenantId } = await getTenantContext();
  const sessionId = context.params.id;

  const { data: session } = await supabaseAdmin
    .from("committee_sessions")
    .select("id, tenant_id, status, current_host_id")
    .eq("id", sessionId)
    .eq("tenant_id", tenantId)
    .single();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.status !== "active") {
    return NextResponse.json({ error: "Session is not active" }, { status: 409 });
  }
  if (session.current_host_id !== user.id) {
    return NextResponse.json({ error: "Only the session host can commit" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const heldCandidateIds: string[] = Array.isArray(body?.hold_candidate_ids)
    ? body.hold_candidate_ids
    : [];

  const summary = await commitStagedVotes({
    sessionId,
    tenantId,
    actorId: user.id,
    heldCandidateIds,
  });

  return NextResponse.json(summary);
}
