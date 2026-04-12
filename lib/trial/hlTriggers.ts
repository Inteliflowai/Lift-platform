import { supabaseAdmin } from "@/lib/supabase/admin";
import { upsertHLContact, addHLTags } from "@/lib/highlevel/client";

export async function checkAndFireHLTriggers(tenantId: string): Promise<void> {
  if (!process.env.HL_API_KEY) return;

  try {
    // Get trial health for this tenant
    const { data: health } = await supabaseAdmin
      .from("trial_health")
      .select("*")
      .eq("tenant_id", tenantId)
      .single();

    if (!health) return;

    // Get school admin email for HL lookup
    const { data: adminRole } = await supabaseAdmin
      .from("user_tenant_roles")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("role", "school_admin")
      .limit(1)
      .single();

    if (!adminRole) return;

    const { data: adminUser } = await supabaseAdmin
      .from("users")
      .select("email, full_name")
      .eq("id", adminRole.user_id)
      .single();

    if (!adminUser?.email) return;

    // Upsert contact in HL to get contactId
    const contactId = await upsertHLContact({
      email: adminUser.email,
      name: adminUser.full_name ?? undefined,
      companyName: health.tenant_name,
      source: "LIFT Platform",
    });

    if (!contactId) return;

    const daysSinceSignup = Number(health.days_since_signup || 0);

    // Trigger: No login on day 1
    if (daysSinceSignup >= 1 && !health.day1_login) {
      await addHLTags(contactId, ["lift-trial-no-day1-login"]);
    }

    // Trigger: Day 7 — no candidate completed
    if (daysSinceSignup >= 7 && !health.candidate_completed) {
      await addHLTags(contactId, ["lift-trial-at-risk", "lift-dormant"]);
    }

    // Trigger: First candidate completed — positive signal
    if (health.candidate_completed && health.first_session_day !== null) {
      await addHLTags(contactId, ["lift-first-session-complete"]);
    }

    // Trigger: High feature depth — engaged user
    if (Number(health.feature_depth_score) >= 5) {
      await addHLTags(contactId, ["lift-trial-engaged"]);
    }

    // Trigger: Low feature depth at day 14
    if (daysSinceSignup >= 14 && Number(health.feature_depth_score) < 3) {
      await addHLTags(contactId, ["lift-trial-low-engagement"]);
    }
  } catch (err) {
    console.error("[trial] checkAndFireHLTriggers error:", err);
  }
}
