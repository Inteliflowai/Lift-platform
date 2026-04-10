export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { markOnboardingStep } from "@/lib/onboarding";

export async function GET() {
  const { tenantId } = await getTenantContext();

  const { data: cycles, error } = await supabaseAdmin
    .from("application_cycles")
    .select("*, candidates(count)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(cycles);
}

export async function POST(req: NextRequest) {
  const { tenantId, user } = await getTenantContext();
  const body = await req.json();
  const { name, academic_year, opens_at, closes_at } = body;

  if (!name || !academic_year) {
    return NextResponse.json(
      { error: "Name and academic year are required" },
      { status: 400 }
    );
  }

  // Create cycle
  const { data: cycle, error: cycleErr } = await supabaseAdmin
    .from("application_cycles")
    .insert({
      tenant_id: tenantId,
      name,
      academic_year,
      opens_at: opens_at || null,
      closes_at: closes_at || null,
      status: "draft",
    })
    .select()
    .single();

  if (cycleErr) return NextResponse.json({ error: cycleErr.message }, { status: 500 });

  // Auto-generate 3 grade band templates
  const bands = ["6-7", "8", "9-11"] as const;
  const templates = bands.map((gb) => ({
    tenant_id: tenantId,
    cycle_id: cycle.id,
    grade_band: gb,
    name: `Default ${gb}`,
    config: {
      task_count: gb === "6-7" ? 4 : gb === "8" ? 5 : 6,
      time_limit_minutes: gb === "6-7" ? 30 : gb === "8" ? 40 : 50,
      hint_density: "medium",
      ux_mode: gb === "6-7" ? "simple" : "standard",
    },
    is_default: true,
  }));

  await supabaseAdmin.from("grade_band_templates").insert(templates);

  markOnboardingStep(tenantId, "cycle_created").catch(() => {});

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    action: "cycle_created",
    payload: { cycle_id: cycle.id, name, academic_year },
  });

  return NextResponse.json(cycle, { status: 201 });
}
