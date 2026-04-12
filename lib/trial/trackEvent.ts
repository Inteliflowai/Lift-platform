import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkAndFireHLTriggers } from "./hlTriggers";

export type TrialEventType =
  | "day1_login"
  | "first_candidate_invited"
  | "first_candidate_completed"
  | "evaluator_workspace_opened"
  | "tri_report_viewed"
  | "pdf_downloaded"
  | "support_plan_viewed"
  | "cohort_export_downloaded"
  | "evaluator_intelligence_opened";

export async function trackTrialEvent(
  tenantId: string,
  eventType: TrialEventType,
  userId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    // Check if tenant is on trial — only track trial tenants
    const { data: license } = await supabaseAdmin
      .from("tenant_licenses")
      .select("status, trial_ends_at")
      .eq("tenant_id", tenantId)
      .single();

    if (!license || license.status !== "trialing") return;
    if (new Date(license.trial_ends_at) < new Date()) return;

    // Insert — ignore conflict (first occurrence wins via unique index)
    await supabaseAdmin
      .from("trial_events")
      .upsert(
        {
          tenant_id: tenantId,
          event_type: eventType,
          user_id: userId || null,
          metadata: metadata || {},
        },
        { onConflict: "tenant_id,event_type", ignoreDuplicates: true }
      );

    // Fire HL risk check async (don't await — non-blocking)
    checkAndFireHLTriggers(tenantId).catch((err) =>
      console.error("[trial] HL trigger error:", err)
    );
  } catch (err) {
    // Never throw — trial tracking must never break the main flow
    console.error("[trial] trackTrialEvent error:", err);
  }
}
