import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: roles } = await supabase.from("user_tenant_roles").select("role").eq("user_id", user.id);
  if (!roles?.some((r) => r.role === "platform_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenant_id, regenerate } = await req.json();
  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  // Delete all candidates (cascade handles sessions, responses, signals, profiles, etc.)
  await supabaseAdmin.from("candidates").delete().eq("tenant_id", tenant_id);
  // Also delete cycles
  await supabaseAdmin.from("application_cycles").delete().eq("tenant_id", tenant_id);
  // Delete evaluator_briefings, cohort_benchmarks
  await supabaseAdmin.from("evaluator_briefings").delete().eq("tenant_id", tenant_id);
  await supabaseAdmin.from("cohort_benchmarks").delete().eq("tenant_id", tenant_id);
  await supabaseAdmin.from("interview_syntheses").delete().eq("tenant_id", tenant_id);

  // Reset tenant
  await supabaseAdmin
    .from("tenants")
    .update({
      is_demo: false,
      demo_reset_at: new Date().toISOString(),
    })
    .eq("id", tenant_id);

  await writeAuditLog(supabaseAdmin, {
    tenant_id,
    actor_id: user.id,
    action: "demo_reset",
  });

  // Optionally regenerate
  if (regenerate) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await fetch(`${baseUrl}/api/admin/demo/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({ tenant_id }),
    });
  }

  return NextResponse.json({ ok: true, regenerated: !!regenerate });
}
