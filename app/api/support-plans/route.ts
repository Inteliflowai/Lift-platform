export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { checkFeature } from "@/lib/licensing/gate";
import { FEATURES } from "@/lib/licensing/features";

export async function GET(req: NextRequest) {
  const { supabase, tenantId, isPlatformAdmin } = await getTenantContext();
  const candidateId = req.nextUrl.searchParams.get("candidate_id");

  if (!candidateId) {
    return NextResponse.json({ error: "candidate_id required" }, { status: 400 });
  }

  const allowed = isPlatformAdmin || await checkFeature(tenantId, FEATURES.PLACEMENT_SUPPORT_PLAN);
  if (!allowed) {
    return NextResponse.json({ error: "Feature not available" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("support_plans")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("generated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const { supabase, tenantId, isPlatformAdmin } = await getTenantContext();

  const allowed = isPlatformAdmin || await checkFeature(tenantId, FEATURES.PLACEMENT_SUPPORT_PLAN);
  if (!allowed) {
    return NextResponse.json({ error: "Feature not available" }, { status: 403 });
  }

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("support_plans")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
