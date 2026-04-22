/**
 * Manually seed PT demo candidates (Pedro, Mariana, Helena) against the
 * EduInsights Supabase using .env.pt config. Idempotent — exits early
 * if the tenant already has 3+ insight_profiles.
 *
 * Usage:
 *   npx tsx scripts/seed-pt-demo.ts
 *
 * Requires .env.pt at the repo root with NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY pointing at the EduInsights project.
 *
 * Same logic as ensureDemoCandidatesPt() in lib/demo/seedDemoSchoolPt.ts —
 * we dynamic-import the seeder AFTER loading .env.pt so the shared
 * supabaseAdmin client is constructed with PT credentials.
 */
import { config } from "dotenv";

// MUST load .env.pt before any module that reads process.env at import time
// (lib/supabase/admin.ts creates the client at module-load using
// process.env.NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
config({ path: ".env.pt", override: true });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.pt");
  process.exit(1);
}

console.log(`PT Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

async function run() {
  // Dynamic imports so the admin client is built with PT env vars
  const { createClient } = await import("@supabase/supabase-js");
  const { ensureDemoCandidatesPt } = await import("../lib/demo/seedDemoSchoolPt");

  const probe = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Find the EduInsights tenant
  const { data: tenants, error: tErr } = await probe
    .from("tenants")
    .select("id, name, slug")
    .eq("slug", "eduinsights-demo")
    .limit(1);

  if (tErr) {
    console.error("Failed to query tenants:", tErr.message);
    process.exit(1);
  }
  const tenant = tenants?.[0];
  if (!tenant) {
    console.error("Tenant 'eduinsights-demo' not found");
    process.exit(1);
  }
  console.log(`Seeding PT demo for: ${tenant.name} (${tenant.slug}, id=${tenant.id})`);

  await ensureDemoCandidatesPt(tenant.id);

  // Verify final state
  const { count: profileCount } = await probe
    .from("insight_profiles")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id);
  const { count: candidateCount } = await probe
    .from("candidates")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id);
  const { count: cycleCount } = await probe
    .from("application_cycles")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id)
    .eq("status", "active");

  console.log(
    `\nDone. Tenant now has ${candidateCount} candidates, ${profileCount} insight profiles, ${cycleCount} active cycle(s).`,
  );
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
