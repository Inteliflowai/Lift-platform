import { supabaseAdmin } from "@/lib/supabase/admin";

const VALID_STEPS = [
  "cycle_created",
  "evaluator_invited",
  "candidate_invited",
  "session_completed",
  "report_viewed",
];

/** Mark an onboarding step as completed for a tenant. Fire-and-forget safe. */
export async function markOnboardingStep(
  tenantId: string,
  step: string
): Promise<void> {
  if (!VALID_STEPS.includes(step)) return;

  try {
    const { data } = await supabaseAdmin
      .from("tenant_settings")
      .select("onboarding_steps_completed, onboarding_completed")
      .eq("tenant_id", tenantId)
      .single();

    if (!data || data.onboarding_completed) return;

    const current: string[] = data.onboarding_steps_completed ?? [];
    if (current.includes(step)) return;

    const updated = [...current, step];
    const allDone = VALID_STEPS.every((s) => updated.includes(s));

    await supabaseAdmin
      .from("tenant_settings")
      .update({
        onboarding_steps_completed: updated,
        onboarding_completed: allDone,
      })
      .eq("tenant_id", tenantId);
  } catch {
    // Non-critical — never throw from onboarding tracking
  }
}
