export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: tenants, error } = await supabaseAdmin
    .from("tenants")
    .select("*, candidates(count)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(tenants);
}

export async function POST(req: NextRequest) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, slug, admin_email } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
  }

  // Create tenant
  const { data: tenant, error: tenantErr } = await supabaseAdmin
    .from("tenants")
    .insert({ name, slug, status: "active" })
    .select()
    .single();

  if (tenantErr) return NextResponse.json({ error: tenantErr.message }, { status: 500 });

  // Create default tenant settings
  await supabaseAdmin.from("tenant_settings").insert({ tenant_id: tenant.id });

  // If admin email provided, create auth user and assign school_admin role
  if (admin_email) {
    let adminUserId: string;

    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", admin_email)
      .single();

    if (existingUser) {
      adminUserId = existingUser.id;
    } else {
      const { data: authUser, error: authErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: admin_email,
          email_confirm: true,
          user_metadata: { full_name: "" },
        });
      if (authErr) {
        return NextResponse.json({ error: authErr.message }, { status: 500 });
      }
      adminUserId = authUser.user.id;
    }

    await supabaseAdmin.from("user_tenant_roles").insert({
      user_id: adminUserId,
      tenant_id: tenant.id,
      role: "school_admin",
      granted_by: user.id,
    });
  }

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenant.id,
    actor_id: user.id,
    action: "tenant_created",
    payload: { name, slug, admin_email },
  });

  return NextResponse.json(tenant, { status: 201 });
}
