/**
 * Seed 2 additional demo candidates that trigger realistic enrollment-readiness
 * flags, then run the evaluator so the flags show up organically on
 * /school/flags and on the committee deliberation cards.
 *
 * Usage:
 *   npx tsx scripts/seed-pt-demo-flags.ts
 *
 * Demo flag candidates:
 *   1. Rafael Lima (8º ano) — low_completion flag
 *      session.completion_pct = 60, status = completed
 *      Narrative: "Student started the assessment but only finished 60% of
 *      the tasks. Worth a follow-up conversation with the family."
 *
 *   2. Camila Ribeiro (10º ano) — assessment_abandoned flag
 *      candidate.status = flagged, session.status = abandoned,
 *      last_activity_at 10 days ago.
 *      Narrative: "Student started the session but never came back.
 *      Marked abandoned 10 days ago. Worth a follow-up with the family."
 *      (Originally planned consent_not_captured but that requires
 *      admitted/waitlisted/offered statuses which the candidates table
 *      constraint doesn't allow — flag-evaluator vs schema inconsistency
 *      worth noting as a separate ticket.)
 *
 * Both flags are real observational conditions that the evaluator raises
 * deterministically — nothing faked. If the conditions are later resolved
 * (completion_pct edited, consent recorded), the daily cron auto-resolves.
 */
import { config } from "dotenv";

config({ path: ".env.pt", override: true });
process.env.LIFT_LOCALE = "pt";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase env vars in .env.pt");
  process.exit(1);
}

console.log(`PT Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

async function run() {
  const { createClient } = await import("@supabase/supabase-js");
  const { evaluateTenant } = await import("../lib/flags/evaluator");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Find the EduInsights tenant + its active cycle
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name, slug")
    .eq("slug", "eduinsights-demo")
    .limit(1);
  const tenant = tenants?.[0];
  if (!tenant) {
    console.error("EduInsights tenant not found");
    process.exit(1);
  }

  const { data: activeCycle } = await supabase
    .from("application_cycles")
    .select("id, name")
    .eq("tenant_id", tenant.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!activeCycle) {
    console.error("No active cycle on PT tenant. Run seed-pt-demo.ts first.");
    process.exit(1);
  }

  console.log(`Tenant: ${tenant.name} / Cycle: ${activeCycle.name}\n`);

  // ─── Candidate 1: Rafael Lima — low_completion flag ───────────────────

  console.log("[Rafael Lima] creating low_completion flag scenario...");
  const { data: existingRafael } = await supabase
    .from("candidates")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("first_name", "Rafael")
    .eq("last_name", "Lima")
    .maybeSingle();

  if (existingRafael) {
    console.log(`  already exists (id=${existingRafael.id}), skipping insert`);
  } else {
    const { data: rafael, error: rafaelErr } = await supabase
      .from("candidates")
      .insert({
        tenant_id: tenant.id,
        cycle_id: activeCycle.id,
        first_name: "Rafael",
        last_name: "Lima",
        grade_band: "8",
        grade_applying_to: "8",
        status: "completed",
      })
      .select("id")
      .single();
    if (rafaelErr || !rafael) {
      console.error("  failed to insert Rafael:", rafaelErr);
      process.exit(1);
    }
    const startedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const completedAt = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    const { error: sessErr } = await supabase
      .from("sessions")
      .insert({
        candidate_id: rafael.id,
        tenant_id: tenant.id,
        cycle_id: activeCycle.id,
        grade_band: "8",
        status: "completed",
        completion_pct: 60,
        started_at: startedAt.toISOString(),
        completed_at: completedAt.toISOString(),
        last_activity_at: completedAt.toISOString(),
      });
    if (sessErr) {
      console.error("  failed to insert Rafael's session:", sessErr);
    } else {
      console.log(`  ✓ created candidate ${rafael.id} with session at 60% completion`);
    }
  }

  // ─── Candidate 2: Camila Ribeiro — assessment_abandoned flag ─────────

  console.log("\n[Camila Ribeiro] creating assessment_abandoned flag scenario...");
  const { data: existingCamila } = await supabase
    .from("candidates")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("first_name", "Camila")
    .eq("last_name", "Ribeiro")
    .maybeSingle();

  if (existingCamila) {
    console.log(`  already exists (id=${existingCamila.id}), skipping insert`);
  } else {
    const { data: camila, error: camilaErr } = await supabase
      .from("candidates")
      .insert({
        tenant_id: tenant.id,
        cycle_id: activeCycle.id,
        first_name: "Camila",
        last_name: "Ribeiro",
        grade_band: "9-11",
        grade_applying_to: "10",
        status: "flagged",
      })
      .select("id")
      .single();
    if (camilaErr || !camila) {
      console.error("  failed to insert Camila:", camilaErr);
      process.exit(1);
    }
    // Session abandoned 10 days ago with low completion
    const lastActivity = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const startedAt = new Date(lastActivity.getTime() - 30 * 60 * 1000);
    const { error: sessErr } = await supabase.from("sessions").insert({
      candidate_id: camila.id,
      tenant_id: tenant.id,
      cycle_id: activeCycle.id,
      grade_band: "9-11",
      status: "abandoned",
      completion_pct: 25,
      started_at: startedAt.toISOString(),
      last_activity_at: lastActivity.toISOString(),
    });
    if (sessErr) {
      console.error("  failed to insert Camila's session:", sessErr);
    } else {
      console.log(`  ✓ created candidate ${camila.id} with session abandoned 10 days ago`);
    }
  }

  // ─── Run evaluator ─────────────────────────────────────────────────────

  console.log("\n─── Running flag evaluator on PT tenant ──────────────────");
  const summary = await evaluateTenant(tenant.id);
  console.log(JSON.stringify(summary, null, 2));

  // ─── Verify flags appear ──────────────────────────────────────────────

  const { data: activeFlags } = await supabase
    .from("candidate_flags")
    .select("id, flag_type, severity, candidate_id")
    .eq("tenant_id", tenant.id)
    .is("resolved_at", null);

  const { data: candidatesWithFlags } = await supabase
    .from("candidates")
    .select("id, first_name, last_name")
    .eq("tenant_id", tenant.id)
    .in("id", activeFlags?.map((f) => f.candidate_id) ?? ["00000000-0000-0000-0000-000000000000"]);

  console.log(`\nActive flags on PT tenant: ${activeFlags?.length ?? 0}`);
  for (const f of activeFlags ?? []) {
    const cand = candidatesWithFlags?.find((c) => c.id === f.candidate_id);
    const name = cand ? `${cand.first_name} ${cand.last_name}` : f.candidate_id;
    console.log(`  - ${name}: ${f.flag_type} (${f.severity})`);
  }
}

run().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
