export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

const ADMIN_ROLES = new Set(["platform_admin", "school_admin"]);

// Transfer the session host to another admin. Callable by:
//   - the current host
//   - any school_admin of the same tenant (covers sick-host case)
//   - any platform_admin

export async function POST(
  req: NextRequest,
  context: { params: { id: string } },
) {
  const { user, tenantId, roles, isPlatformAdmin } = await getTenantContext();
  const sessionId = context.params.id;

  const body = await req.json().catch(() => ({}));
  const newHostId: string | undefined = body?.new_host_user_id;
  const reason: string | null = body?.reason ?? null;
  if (!newHostId) {
    return NextResponse.json({ error: "new_host_user_id required" }, { status: 400 });
  }

  const { data: session } = await supabaseAdmin
    .from("committee_sessions")
    .select("id, tenant_id, status, current_host_id, started_by")
    .eq("id", sessionId)
    .eq("tenant_id", tenantId)
    .single();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.status !== "active") {
    return NextResponse.json({ error: "Session is not active" }, { status: 409 });
  }

  const isCurrentHost = session.current_host_id === user.id;
  const isTenantAdmin = roles.some(
    (r) => r.tenant_id === tenantId && ADMIN_ROLES.has(r.role),
  );
  if (!isCurrentHost && !isPlatformAdmin && !isTenantAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Target must be a school_admin or platform_admin of this tenant
  const { data: targetRoles } = await supabaseAdmin
    .from("user_tenant_roles")
    .select("role")
    .eq("user_id", newHostId)
    .eq("tenant_id", tenantId);
  const targetValid = (targetRoles ?? []).some((r) => ADMIN_ROLES.has(r.role));
  const targetIsPlatformAdmin = (targetRoles ?? []).some((r) => r.role === "platform_admin");
  if (!targetValid && !targetIsPlatformAdmin) {
    // Also allow platform_admin cross-tenant (they have universal access)
    const { data: targetAnyRole } = await supabaseAdmin
      .from("user_tenant_roles")
      .select("role")
      .eq("user_id", newHostId)
      .eq("role", "platform_admin");
    if (!targetAnyRole || targetAnyRole.length === 0) {
      return NextResponse.json(
        { error: "Target user is not a school_admin or platform_admin for this tenant" },
        { status: 400 },
      );
    }
  }

  const priorHost = session.current_host_id;

  const { error } = await supabaseAdmin
    .from("committee_sessions")
    .update({ current_host_id: newHostId })
    .eq("id", sessionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    action: "committee_session.host_transferred",
    payload: {
      session_id: sessionId,
      from_host: priorHost,
      to_host: newHostId,
      reason,
      transferred_by_role: isCurrentHost ? "current_host" : (isPlatformAdmin ? "platform_admin" : "tenant_admin"),
    },
  });

  return NextResponse.json({ ok: true, current_host_id: newHostId });
}
