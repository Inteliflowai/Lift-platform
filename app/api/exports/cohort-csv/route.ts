export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cycleId = searchParams.get("cycle_id");
  if (!cycleId) return NextResponse.json({ error: "cycle_id required" }, { status: 400 });

  // Get user's tenant
  const { data: roles } = await supabase
    .from("user_tenant_roles")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  const tenantId = roles?.tenant_id;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

  const { data: candidates } = await supabaseAdmin
    .from("candidates")
    .select(
      "id, first_name, last_name, grade_band, status, sessions(completion_pct), insight_profiles(reading_score, writing_score, reasoning_score, reflection_score, persistence_score, support_seeking_score, overall_confidence, requires_human_review), evaluator_reviews(recommendation_tier, finalized_at, status)"
    )
    .eq("tenant_id", tenantId)
    .eq("cycle_id", cycleId)
    .order("last_name");

  const headers = [
    "candidate_id", "name", "grade_band", "status", "completion_pct",
    "reading_score", "writing_score", "reasoning_score", "reflection_score",
    "persistence_score", "support_seeking_score", "overall_confidence",
    "requires_human_review", "recommendation_tier", "finalized_at",
  ];

  const rows = (candidates ?? []).map((c) => {
    const sess = (c.sessions as { completion_pct: number }[])?.[0];
    const p = (c.insight_profiles as Record<string, unknown>[])?.[0];
    const r = (c.evaluator_reviews as Record<string, unknown>[])?.find(
      (rv) => rv.status === "finalized"
    ) ?? (c.evaluator_reviews as Record<string, unknown>[])?.[0];

    return [
      c.id,
      `${c.first_name} ${c.last_name}`,
      c.grade_band,
      c.status,
      sess?.completion_pct ?? "",
      p?.reading_score ?? "",
      p?.writing_score ?? "",
      p?.reasoning_score ?? "",
      p?.reflection_score ?? "",
      p?.persistence_score ?? "",
      p?.support_seeking_score ?? "",
      p?.overall_confidence ?? "",
      p?.requires_human_review ?? "",
      r?.recommendation_tier ?? "",
      r?.finalized_at ?? "",
    ]
      .map((v) => {
        const s = String(v ?? "");
        return s.includes(",") ? `"${s}"` : s;
      })
      .join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    action: "cohort_csv_exported",
    payload: { cycle_id: cycleId, row_count: rows.length },
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lift-cohort-${cycleId}.csv"`,
    },
  });
}
