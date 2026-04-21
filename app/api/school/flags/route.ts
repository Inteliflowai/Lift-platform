export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ADMIN_ROLES = new Set(["platform_admin", "school_admin"]);

export async function GET(req: NextRequest) {
  const { tenantId, roles, isPlatformAdmin } = await getTenantContext();

  const canRead = isPlatformAdmin ||
    roles.some((r) => r.tenant_id === tenantId && ADMIN_ROLES.has(r.role));
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const candidateId = req.nextUrl.searchParams.get("candidate_id");
  const flagType = req.nextUrl.searchParams.get("flag_type");
  const severity = req.nextUrl.searchParams.get("severity");
  const cycleId = req.nextUrl.searchParams.get("cycle_id");
  const includeResolved = req.nextUrl.searchParams.get("include_resolved") === "1";

  let query = supabaseAdmin
    .from("candidate_flags")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("detected_at", { ascending: false })
    .limit(500);

  if (!includeResolved) query = query.is("resolved_at", null);
  if (candidateId) query = query.eq("candidate_id", candidateId);
  if (flagType) query = query.eq("flag_type", flagType);
  if (severity) query = query.eq("severity", severity);

  const { data: flags, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Join with candidates for display
  const candidateIds = Array.from(new Set((flags ?? []).map((f) => f.candidate_id)));
  const candidateById = new Map<string, { first_name: string | null; last_name: string | null; grade_applying_to: string | null; status: string | null; cycle_id: string | null }>();
  if (candidateIds.length > 0) {
    const { data: cands } = await supabaseAdmin
      .from("candidates")
      .select("id, first_name, last_name, grade_applying_to, status, cycle_id")
      .in("id", candidateIds);
    for (const c of cands ?? []) candidateById.set(c.id, c);
  }

  let rows = (flags ?? []).map((f) => {
    const c = candidateById.get(f.candidate_id);
    return {
      ...f,
      candidate: {
        id: f.candidate_id,
        first_name: c?.first_name ?? null,
        last_name: c?.last_name ?? null,
        grade_applying_to: c?.grade_applying_to ?? null,
        status: c?.status ?? null,
        cycle_id: c?.cycle_id ?? null,
      },
    };
  });
  if (cycleId) rows = rows.filter((r) => r.candidate.cycle_id === cycleId);

  return NextResponse.json({
    rows,
    counts: {
      total: rows.length,
      notable: rows.filter((r) => r.severity === "notable").length,
      advisory: rows.filter((r) => r.severity === "advisory").length,
    },
  });
}
