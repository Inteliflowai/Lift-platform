import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: tenant, error } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const [settings, users, cycles] = await Promise.all([
    supabaseAdmin
      .from("tenant_settings")
      .select("*")
      .eq("tenant_id", params.id)
      .single(),
    supabaseAdmin
      .from("user_tenant_roles")
      .select("*, users(email, full_name)")
      .eq("tenant_id", params.id),
    supabaseAdmin
      .from("application_cycles")
      .select("*")
      .eq("tenant_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    tenant,
    settings: settings.data,
    users: users.data,
    cycles: cycles.data,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { status } = body;

  if (!status || !["active", "suspended", "archived"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data: tenant, error } = await supabaseAdmin
    .from("tenants")
    .update({ status })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(supabaseAdmin, {
    tenant_id: params.id,
    actor_id: user.id,
    action: "tenant_status_changed",
    payload: { new_status: status },
  });

  return NextResponse.json(tenant);
}
