export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

const ADMIN_ROLES = new Set(["platform_admin", "school_admin"]);

// POST — log a copy-to-clipboard event. Body: { decision, version }.
export async function POST(
  req: NextRequest,
  context: { params: { id: string } },
) {
  const { user, roles, isPlatformAdmin } = await getTenantContext();
  const candidateId = context.params.id;

  const body = await req.json().catch(() => null);
  const decision = body?.decision;
  const version = body?.version;

  if (!["admit", "waitlist", "decline"].includes(decision)) {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }
  if (!["ai", "edited"].includes(version)) {
    return NextResponse.json({ error: "Invalid version" }, { status: 400 });
  }

  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("id, tenant_id, status")
    .eq("id", candidateId)
    .single();

  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canCopy =
    isPlatformAdmin ||
    roles.some((r) => r.tenant_id === candidate.tenant_id && ADMIN_ROLES.has(r.role));
  if (!canCopy) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await writeAuditLog(supabaseAdmin, {
    tenant_id: candidate.tenant_id,
    actor_id: user.id,
    candidate_id: candidateId,
    action: "defensible_language.copied_to_clipboard",
    payload: {
      decision,
      version,
      candidate_status: candidate.status,
    },
  });

  return NextResponse.json({ ok: true });
}
