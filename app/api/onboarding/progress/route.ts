export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";

const VALID_STEPS = [
  "cycle_created",
  "evaluator_invited",
  "candidate_invited",
  "session_completed",
  "report_viewed",
];

export async function GET() {
  const { tenantId } = await getTenantContext();

  const { data: settings } = await supabaseAdmin
    .from("tenant_settings")
    .select("onboarding_completed, onboarding_steps_completed, onboarding_dismissed_at")
    .eq("tenant_id", tenantId)
    .single();

  const completed = settings?.onboarding_steps_completed ?? [];
  const allDone = VALID_STEPS.every((s) => completed.includes(s));
  const nextStep = VALID_STEPS.find((s) => !completed.includes(s)) ?? null;

  return NextResponse.json({
    steps_completed: completed,
    all_done: allDone || settings?.onboarding_completed,
    next_step: allDone ? null : nextStep,
    dismissed: !!settings?.onboarding_dismissed_at,
  });
}

export async function POST(req: NextRequest) {
  const { tenantId } = await getTenantContext();
  const { step } = await req.json();

  if (!step || !VALID_STEPS.includes(step)) {
    return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  }

  const { data: settings } = await supabaseAdmin
    .from("tenant_settings")
    .select("onboarding_steps_completed")
    .eq("tenant_id", tenantId)
    .single();

  const current = settings?.onboarding_steps_completed ?? [];
  if (current.includes(step)) {
    return NextResponse.json({ ok: true, already: true });
  }

  const updated = [...current, step];
  const allDone = VALID_STEPS.every((s) => updated.includes(s));

  await supabaseAdmin
    .from("tenant_settings")
    .update({
      onboarding_steps_completed: updated,
      onboarding_completed: allDone,
    })
    .eq("tenant_id", tenantId);

  return NextResponse.json({
    ok: true,
    steps_completed: updated,
    all_done: allDone,
  });
}
