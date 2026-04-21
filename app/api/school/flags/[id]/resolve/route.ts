export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveFlagManually, clampSnoozeDays } from "@/lib/flags/resolve";

const ADMIN_ROLES = new Set(["platform_admin", "school_admin"]);

export async function POST(
  req: NextRequest,
  context: { params: { id: string } },
) {
  const { user, tenantId, roles, isPlatformAdmin } = await getTenantContext();
  const flagId = context.params.id;

  const body = await req.json().catch(() => ({}));
  const resolvedReason: string | undefined = body?.resolved_reason;
  if (!resolvedReason || typeof resolvedReason !== "string" || resolvedReason.trim().length === 0) {
    return NextResponse.json({ error: "resolved_reason required" }, { status: 400 });
  }
  const snoozeDays = body?.snooze_days !== undefined ? clampSnoozeDays(body.snooze_days) : undefined;

  // Verify the flag belongs to this tenant before resolving
  const { data: flag } = await supabaseAdmin
    .from("candidate_flags")
    .select("id, tenant_id")
    .eq("id", flagId)
    .single();
  if (!flag) return NextResponse.json({ error: "Flag not found" }, { status: 404 });

  const canResolve = isPlatformAdmin ||
    (flag.tenant_id === tenantId &&
      roles.some((r) => r.tenant_id === tenantId && ADMIN_ROLES.has(r.role)));
  if (!canResolve) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ok = await resolveFlagManually({
    flagId,
    resolvedBy: user.id,
    resolvedReason: resolvedReason.trim(),
    snoozeDays,
  });
  if (!ok) {
    return NextResponse.json(
      { error: "Flag already resolved or not found" },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}
