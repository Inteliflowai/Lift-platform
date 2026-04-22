/**
 * Generate defensible language cache for the 3 PT demo candidates
 * (Pedro Oliveira, Mariana Tanaka, Helena Costa) against the
 * EduInsights Supabase using .env.pt config.
 *
 * Usage:
 *   npx tsx scripts/seed-pt-defensible-language.ts
 *
 * What it does for each candidate:
 *   - Calls generateAndPersistDefensibleLanguage() which:
 *     - Reads insight_profile, enriched signals, mission_statement
 *     - Builds PT-localized inputs (dimension labels + signal humanization)
 *     - Calls Claude Sonnet 4.6 with PT prompts
 *     - Validates against PT forbidden-phrase guardrail
 *     - Falls back to PT safe templates if guardrail rejects 3x
 *     - Persists to candidates.defensible_language_cache
 *     - Writes audit log rows for each decision
 *
 * Locale: forces LIFT_LOCALE=pt before any import so getLocale() and the
 * admin client see the right env. Same technique as seed-pt-demo.ts.
 */
import { config } from "dotenv";

config({ path: ".env.pt", override: true });
process.env.LIFT_LOCALE = "pt";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase env vars in .env.pt");
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY in .env.pt (required for Claude Sonnet call)");
  process.exit(1);
}

console.log(`PT Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
console.log(`LIFT_LOCALE=${process.env.LIFT_LOCALE}`);

async function run() {
  const { createClient } = await import("@supabase/supabase-js");
  const { generateAndPersistDefensibleLanguage } = await import(
    "../lib/director/defensibleLanguagePersist"
  );

  const probe = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Find the EduInsights tenant
  const { data: tenants } = await probe
    .from("tenants")
    .select("id, name, slug")
    .eq("slug", "eduinsights-demo")
    .limit(1);
  const tenant = tenants?.[0];
  if (!tenant) {
    console.error("EduInsights tenant not found");
    process.exit(1);
  }

  // Pull the 3 PT demo candidates
  const { data: candidates } = await probe
    .from("candidates")
    .select("id, first_name, last_name, status")
    .eq("tenant_id", tenant.id)
    .in("first_name", ["Pedro", "Mariana", "Helena"])
    .eq("status", "completed");

  if (!candidates || candidates.length === 0) {
    console.error("No PT demo candidates found. Run seed-pt-demo.ts first.");
    process.exit(1);
  }

  console.log(`\nGenerating defensible language for ${candidates.length} candidates...\n`);

  for (const c of candidates) {
    const name = `${c.first_name} ${c.last_name}`;
    console.log(`[${name}] starting...`);
    try {
      const result = await generateAndPersistDefensibleLanguage({
        candidateId: c.id,
        actorId: null,
        trigger: "manual",
        respectDriftThreshold: false,
      });
      if (result.skipped) {
        console.log(`[${name}] skipped: ${result.reason}`);
        continue;
      }
      const cache = result.persisted;
      if (!cache) {
        console.log(`[${name}] no cache returned`);
        continue;
      }
      const used = cache.fallback_used ? "SAFE-TEMPLATE FALLBACK" : "AI-generated";
      console.log(`[${name}] ✓ ${used}`);
      console.log(`  Admit (${cache.admit.length} chars): ${cache.admit.slice(0, 100)}...`);
      console.log(`  Waitlist (${cache.waitlist.length} chars): ${cache.waitlist.slice(0, 100)}...`);
      console.log(`  Decline (${cache.decline.length} chars): ${cache.decline.slice(0, 100)}...`);
      console.log(`  Attempts: admit=${cache.attempts.admit}, waitlist=${cache.attempts.waitlist}, decline=${cache.attempts.decline}`);
      console.log();
    } catch (err) {
      console.error(`[${name}] failed:`, err instanceof Error ? err.message : err);
    }
  }

  // Final verification
  const { count: cachedCount } = await probe
    .from("candidates")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id)
    .not("defensible_language_updated_at", "is", null);

  console.log(`\nDone. ${cachedCount}/${candidates.length} candidates have populated defensible language cache.`);
}

run().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
