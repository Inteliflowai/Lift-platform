import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const { tenantId } = await getTenantContext();

  const { data, error } = await supabaseAdmin
    .from("user_tenant_roles")
    .select("id, role, granted_at, users(id, email, full_name)")
    .eq("tenant_id", tenantId)
    .order("granted_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
