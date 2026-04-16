export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { tenantId } = await getTenantContext();

  const [cycleRes, bandsRes, candidatesRes] = await Promise.all([
    supabaseAdmin
      .from("application_cycles")
      .select("*")
      .eq("id", params.id)
      .eq("tenant_id", tenantId)
      .single(),
    supabaseAdmin
      .from("grade_band_templates")
      .select("*")
      .eq("cycle_id", params.id)
      .eq("tenant_id", tenantId)
      .order("grade_band"),
    supabaseAdmin
      .from("candidates")
      .select("*")
      .eq("cycle_id", params.id)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
  ]);

  if (cycleRes.error) {
    return NextResponse.json({ error: cycleRes.error.message }, { status: 404 });
  }

  return NextResponse.json({
    cycle: cycleRes.data,
    gradeBands: bandsRes.data ?? [],
    candidates: candidatesRes.data ?? [],
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { tenantId, user } = await getTenantContext();
  const body = await req.json();

  const allowed = ["name", "academic_year", "opens_at", "closes_at", "status"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const { data: cycle, error } = await supabaseAdmin
    .from("application_cycles")
    .update(updates)
    .eq("id", params.id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    action: "cycle_updated",
    payload: { cycle_id: params.id, ...updates },
  });

  return NextResponse.json(cycle);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { tenantId, user } = await getTenantContext();

  // Only allow deleting cycles with no candidates
  const { count } = await supabaseAdmin
    .from("candidates")
    .select("id", { count: "exact", head: true })
    .eq("cycle_id", params.id)
    .eq("tenant_id", tenantId);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Cannot delete a cycle with candidates" },
      { status: 400 }
    );
  }

  // Delete grade band templates first
  await supabaseAdmin
    .from("grade_band_templates")
    .delete()
    .eq("cycle_id", params.id)
    .eq("tenant_id", tenantId);

  const { error } = await supabaseAdmin
    .from("application_cycles")
    .delete()
    .eq("id", params.id)
    .eq("tenant_id", tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    action: "cycle_deleted",
    payload: { cycle_id: params.id },
  });

  return NextResponse.json({ ok: true });
}
