export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { candidate_id, action } = body;

  // Get user's tenant
  const { data: role } = await supabase
    .from("user_tenant_roles")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  await writeAuditLog(supabaseAdmin, {
    tenant_id: role?.tenant_id,
    actor_id: user.id,
    candidate_id: candidate_id ?? null,
    action: action ?? "unknown",
  });

  return NextResponse.json({ ok: true });
}
