export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { upsertHLContact, addHLTags } from "@/lib/highlevel/client";

export async function POST(req: NextRequest) {
  const { isPlatformAdmin } = await getTenantContext();
  if (!isPlatformAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = await req.json();
  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });
  }

  // Get school admin email
  const { data: adminRole } = await supabaseAdmin
    .from("user_tenant_roles")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .eq("role", "school_admin")
    .limit(1)
    .single();

  if (!adminRole) {
    return NextResponse.json({ error: "No admin found" }, { status: 404 });
  }

  const { data: adminUser } = await supabaseAdmin
    .from("users")
    .select("email, full_name")
    .eq("id", adminRole.user_id)
    .single();

  if (!adminUser?.email) {
    return NextResponse.json({ error: "No email found" }, { status: 404 });
  }

  // Upsert HL contact and add nudge tag
  const contactId = await upsertHLContact({
    email: adminUser.email,
    name: adminUser.full_name ?? undefined,
    source: "LIFT Platform",
  });

  if (!contactId) {
    return NextResponse.json({ error: "HL contact not found" }, { status: 404 });
  }

  await addHLTags(contactId, ["lift-trial-manual-nudge"]);

  return NextResponse.json({ success: true });
}
