export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

const ADMIN_ROLES = new Set(["platform_admin", "school_admin"]);

export async function GET(req: NextRequest) {
  const { tenantId, roles, isPlatformAdmin } = await getTenantContext();

  const canRead = isPlatformAdmin ||
    roles.some((r) => r.tenant_id === tenantId);
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const statusFilter = req.nextUrl.searchParams.get("status");
  const cycleId = req.nextUrl.searchParams.get("cycle_id");

  let query = supabaseAdmin
    .from("committee_sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("started_at", { ascending: false })
    .limit(50);
  if (statusFilter) query = query.eq("status", statusFilter);
  if (cycleId) query = query.eq("cycle_id", cycleId);

  const { data: sessions, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count votes per session (staged/committed/held)
  const sessionIds = (sessions ?? []).map((s) => s.id);
  const countsBySession = new Map<string, { staged: number; committed: number; held: number }>();
  if (sessionIds.length > 0) {
    const { data: votes } = await supabaseAdmin
      .from("committee_votes")
      .select("session_id, status")
      .in("session_id", sessionIds);
    for (const v of votes ?? []) {
      const c = countsBySession.get(v.session_id) ?? { staged: 0, committed: 0, held: 0 };
      if (v.status === "staged") c.staged++;
      else if (v.status === "committed") c.committed++;
      else if (v.status === "held") c.held++;
      countsBySession.set(v.session_id, c);
    }
  }

  const payload = (sessions ?? []).map((s) => ({
    ...s,
    vote_counts: countsBySession.get(s.id) ?? { staged: 0, committed: 0, held: 0 },
  }));

  return NextResponse.json({ sessions: payload });
}

export async function POST(req: NextRequest) {
  const { user, tenantId, roles, isPlatformAdmin } = await getTenantContext();

  const canWrite = isPlatformAdmin ||
    roles.some((r) => r.tenant_id === tenantId && ADMIN_ROLES.has(r.role));
  if (!canWrite) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const cycleId: string | undefined = body?.cycle_id;
  const candidateIds: string[] = Array.isArray(body?.candidate_ids) ? body.candidate_ids : [];
  const name: string = body?.name ?? `Committee Session — ${new Date().toLocaleDateString()}`;

  if (!cycleId) {
    return NextResponse.json({ error: "cycle_id required" }, { status: 400 });
  }

  const { data: session, error } = await supabaseAdmin
    .from("committee_sessions")
    .insert({
      tenant_id: tenantId,
      cycle_id: cycleId,
      name,
      candidate_ids: candidateIds,
      started_by: user.id,
      current_host_id: user.id,
    })
    .select()
    .single();

  if (error) {
    // Partial unique index violation → friendly message
    if (error.code === "23505" || /duplicate key/i.test(error.message)) {
      return NextResponse.json(
        { error: "active_session_exists", message: "An active committee session already exists for this cycle. Resume it or end it before starting a new one." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    action: "committee_session.started",
    payload: {
      session_id: session.id,
      cycle_id: cycleId,
      name,
      candidate_count: candidateIds.length,
    },
  });

  return NextResponse.json({ session });
}
