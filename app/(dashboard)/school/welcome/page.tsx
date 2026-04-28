import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { WelcomeClient } from "./welcome-client";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const { user, tenantId, tenant } = await getTenantContext();

  // Check if welcome already completed
  const { data: settings } = await supabaseAdmin
    .from("tenant_settings")
    .select("welcome_completed")
    .eq("tenant_id", tenantId)
    .single();

  if (settings?.welcome_completed) {
    redirect("/school");
  }

  // Get trial info (sessions limit comes from LicenseProvider context in
  // welcome-client — sessions_limit on tenant_licenses doesn't exist; the
  // effective limit is computed from session_limit_override + tier defaults
  // by lib/licensing/resolver and passed through the dashboard layout).
  const { data: license } = await supabaseAdmin
    .from("tenant_licenses")
    .select("trial_ends_at")
    .eq("tenant_id", tenantId)
    .single();

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  // Pick a seeded demo candidate so the welcome page can link directly to a
  // ready-to-view sample report. Prefer one with a completed session +
  // insight_profile (the seeders always produce these for is_demo rows, but
  // be defensive — if seeding hadn't run yet, fall back to the candidates
  // list rather than a broken link).
  const { data: demoCandidate } = await supabaseAdmin
    .from("candidates")
    .select("id, sessions!inner(id, status)")
    .eq("tenant_id", tenantId)
    .eq("is_demo", true)
    .eq("sessions.status", "completed")
    .limit(1)
    .maybeSingle();

  const trialEndsAt = license?.trial_ends_at
    ? new Date(license.trial_ends_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <WelcomeClient
      firstName={profile?.full_name?.split(" ")[0] ?? "there"}
      schoolName={tenant?.name ?? "Your school"}
      trialEndsAt={trialEndsAt}
      tenantId={tenantId}
      sampleCandidateId={demoCandidate?.id ?? null}
    />
  );
}
