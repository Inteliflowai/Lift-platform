export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";

export async function GET() {
  const { supabase, tenantId } = await getTenantContext();

  const { data, error } = await supabase
    .from("support_resources")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { supabase, tenantId } = await getTenantContext();
  const body = await req.json();

  const { data, error } = await supabase
    .from("support_resources")
    .insert({
      tenant_id: tenantId,
      name: body.name,
      resource_type: body.resource_type,
      description: body.description || null,
      available_for_grades: body.available_for_grades || [],
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const { supabase } = await getTenantContext();
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("support_resources")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
