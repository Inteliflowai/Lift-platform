/**
 * EduInsights (PT) — Seed Script
 *
 * Mirror of scripts/seed.ts adapted for the Brazilian deployment:
 *   - tenant slug eduinsights-demo, name "Colégio Demonstração"
 *   - default_language: "pt" on tenant_settings
 *   - PT-localized cycle name + admin emails
 *   - same 3-role pattern (platform_admin, school_admin, evaluator)
 *
 * Loads credentials from .env.pt (the EduInsights Supabase project,
 * NOT the LIFT one) — make sure that file has the EduInsights
 * NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running.
 *
 * Usage:
 *   npx tsx scripts/seed-pt.ts
 *
 * After this runs, seed tasks + demo candidates with:
 *   npx tsx scripts/seed-pt-tasks.ts   (PT task templates)
 *   npx tsx scripts/seed-pt-demo.ts    (Pedro / Mariana / Helena)
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// override:true so .env.pt wins even if .env.local was already loaded
config({ path: ".env.pt", override: true });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.pt.\n" +
      "Confirm .env.pt exists in the repo root and points at the EduInsights Supabase project."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

const TENANT = {
  name: "Colégio Demonstração",
  slug: "eduinsights-demo",
} as const;

const USERS = [
  {
    email: "admin@eduinsights.datanex.ai",
    password: "Admin2026!",
    full_name: "Admin EduInsights",
    role: "platform_admin" as const,
  },
  {
    email: "escola@eduinsights.datanex.ai",
    password: "Admin2026!",
    full_name: "Diretor(a) Demonstração",
    role: "school_admin" as const,
  },
  {
    email: "avaliador@eduinsights.datanex.ai",
    password: "Eval2026!",
    full_name: "Avaliador(a) Demonstração",
    role: "evaluator" as const,
  },
];

async function seed() {
  console.log("Seeding EduInsights (PT)...\n");
  console.log(`Supabase: ${SUPABASE_URL}\n`);

  // 1. Tenant
  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .upsert(
      { name: TENANT.name, slug: TENANT.slug, status: "active" },
      { onConflict: "slug" }
    )
    .select()
    .single();
  if (tenantErr) throw tenantErr;
  console.log("Tenant:", tenant.name, tenant.id);

  // 2. Tenant settings (PT defaults)
  const { error: settingsErr } = await supabase.from("tenant_settings").upsert(
    {
      tenant_id: tenant.id,
      default_language: "pt",
      coppa_mode: false,
      session_pause_allowed: true,
      session_pause_limit_hours: 48,
    },
    { onConflict: "tenant_id" }
  );
  if (settingsErr) throw settingsErr;
  console.log("Tenant settings created (default_language=pt)");

  // 3. Users (Supabase Auth + user_tenant_roles)
  for (const u of USERS) {
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", u.email)
      .single();

    let userId: string;

    if (existing) {
      userId = existing.id;
      console.log(`User ${u.email} already exists (${userId})`);
    } else {
      const { data: authUser, error: authErr } =
        await supabase.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: { full_name: u.full_name },
        });
      if (authErr) throw authErr;
      userId = authUser.user.id;
      console.log(`User ${u.email} created (${userId})`);
    }

    const { error: roleErr } = await supabase.from("user_tenant_roles").upsert(
      {
        user_id: userId,
        tenant_id: tenant.id,
        role: u.role,
      },
      { onConflict: "user_id,tenant_id,role" }
    );
    if (roleErr) throw roleErr;
    console.log(`  Role ${u.role} assigned`);
  }

  // 4. Application cycle (active so candidate invites attach to it)
  const year = new Date().getFullYear();
  const { data: cycle, error: cycleErr } = await supabase
    .from("application_cycles")
    .upsert(
      {
        tenant_id: tenant.id,
        name: `Processo Seletivo ${year}-${year + 1}`,
        academic_year: `${year}-${year + 1}`,
        status: "active",
        opens_at: new Date(`${year}-08-01`).toISOString(),
        closes_at: new Date(`${year + 1}-06-30`).toISOString(),
      },
      { onConflict: "id" }
    )
    .select()
    .single();
  if (cycleErr) throw cycleErr;
  console.log("Cycle:", cycle.name, cycle.id);

  // 5. Grade band templates
  const gradeBands = ["6-7", "8", "9-11"] as const;
  for (const gb of gradeBands) {
    const { error: gbErr } = await supabase.from("grade_band_templates").insert({
      tenant_id: tenant.id,
      cycle_id: cycle.id,
      grade_band: gb,
      name: `Padrão ${gb}`,
      config: {},
      is_default: true,
    });
    if (gbErr && !gbErr.message.includes("duplicate")) throw gbErr;
    console.log(`Grade band template ${gb} created`);
  }

  console.log("\nSeed complete!\n");
  console.log("─".repeat(60));
  console.log("Login credentials (eduinsights.datanex.ai/login):");
  console.log("─".repeat(60));
  for (const u of USERS) {
    console.log(`  ${u.role.padEnd(15)}  ${u.email}  ::  ${u.password}`);
  }
  console.log("─".repeat(60));
  console.log("\nNext steps:");
  console.log("  npx tsx scripts/seed-pt-tasks.ts   # PT task templates");
  console.log("  npx tsx scripts/seed-pt-demo.ts    # Pedro / Mariana / Helena demo candidates");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
