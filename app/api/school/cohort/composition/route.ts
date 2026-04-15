export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireFeature } from "@/lib/licensing/gate";
import { FEATURES } from "@/lib/licensing/features";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { tenantId } = await getTenantContext();
  await requireFeature(tenantId, FEATURES.CLASS_BUILDER);

  const cycleId = req.nextUrl.searchParams.get("cycle_id");
  if (!cycleId) {
    return NextResponse.json({ error: "cycle_id required" }, { status: 400 });
  }

  const { data } = await supabaseAdmin
    .from("class_compositions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("cycle_id", cycleId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ compositions: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { tenantId, user } = await getTenantContext();
  await requireFeature(tenantId, FEATURES.CLASS_BUILDER);

  const { cycle_id, name, candidate_ids, composition_snapshot } = await req.json();

  if (!cycle_id || !candidate_ids?.length) {
    return NextResponse.json({ error: "cycle_id and candidate_ids required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("class_compositions")
    .insert({
      tenant_id: tenantId,
      cycle_id,
      name: name || "Incoming Class Draft",
      status: "draft",
      candidate_ids,
      composition_snapshot: composition_snapshot || {},
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    action: "class_composition_created",
    payload: { composition_id: data.id, candidate_count: candidate_ids.length },
  });

  return NextResponse.json({ composition: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { tenantId, user } = await getTenantContext();
  await requireFeature(tenantId, FEATURES.CLASS_BUILDER);

  const { composition_id, name, status, candidate_ids, composition_snapshot } = await req.json();

  if (!composition_id) {
    return NextResponse.json({ error: "composition_id required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (name !== undefined) updates.name = name;
  if (status !== undefined) updates.status = status;
  if (candidate_ids !== undefined) updates.candidate_ids = candidate_ids;
  if (composition_snapshot !== undefined) updates.composition_snapshot = composition_snapshot;
  if (status === "confirmed") updates.confirmed_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("class_compositions")
    .update(updates)
    .eq("id", composition_id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    action: status === "confirmed" ? "class_composition_confirmed" : "class_composition_updated",
    payload: { composition_id, status, candidate_count: candidate_ids?.length },
  });

  return NextResponse.json({ composition: data });
}
