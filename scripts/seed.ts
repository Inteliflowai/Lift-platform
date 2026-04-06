/**
 * LIFT Platform — Seed Script
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seed() {
  console.log("Seeding LIFT platform...\n");

  // 1. Tenant
  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .upsert({ name: "Hillside Academy", slug: "hillside", status: "active" }, { onConflict: "slug" })
    .select()
    .single();
  if (tenantErr) throw tenantErr;
  console.log("Tenant:", tenant.name, tenant.id);

  // 2. Tenant settings
  const { error: settingsErr } = await supabase.from("tenant_settings").upsert(
    {
      tenant_id: tenant.id,
      default_language: "en",
      coppa_mode: false,
      session_pause_allowed: true,
      session_pause_limit_hours: 48,
    },
    { onConflict: "tenant_id" }
  );
  if (settingsErr) throw settingsErr;
  console.log("Tenant settings created");

  // 3. Users (via Supabase Auth admin API)
  const usersToCreate = [
    {
      email: "admin@lift.inteliflowai.com",
      password: "Admin2026!",
      full_name: "LIFT Admin",
      role: "platform_admin" as const,
    },
    {
      email: "schooladmin@hillside.edu",
      password: "Admin2026!",
      full_name: "Hillside Admin",
      role: "school_admin" as const,
    },
    {
      email: "evaluator@hillside.edu",
      password: "Eval2026!",
      full_name: "Hillside Evaluator",
      role: "evaluator" as const,
    },
  ];

  for (const u of usersToCreate) {
    // Check if user already exists
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

    // Assign role (skip for platform_admin tenant association if role is platform_admin)
    const tenantId = u.role === "platform_admin" ? tenant.id : tenant.id;
    const { error: roleErr } = await supabase.from("user_tenant_roles").upsert(
      {
        user_id: userId,
        tenant_id: tenantId,
        role: u.role,
      },
      { onConflict: "user_id,tenant_id,role" }
    );
    if (roleErr) throw roleErr;
    console.log(`  Role ${u.role} assigned`);
  }

  // 4. Application cycle
  const { data: cycle, error: cycleErr } = await supabase
    .from("application_cycles")
    .upsert(
      {
        tenant_id: tenant.id,
        name: "2025-2026 Admissions",
        academic_year: "2025-2026",
        status: "active",
        opens_at: new Date("2025-09-01").toISOString(),
        closes_at: new Date("2026-06-30").toISOString(),
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
      name: `Default ${gb}`,
      config: {},
      is_default: true,
    });
    if (gbErr && !gbErr.message.includes("duplicate")) throw gbErr;
    console.log(`Grade band template ${gb} created`);
  }

  // 6. Candidate
  const { data: candidate, error: candErr } = await supabase
    .from("candidates")
    .insert({
      tenant_id: tenant.id,
      cycle_id: cycle.id,
      first_name: "Jamie",
      last_name: "Rivera",
      grade_applying_to: "8",
      grade_band: "8",
      status: "invited",
    })
    .select()
    .single();
  if (candErr) throw candErr;
  console.log("Candidate:", candidate.first_name, candidate.last_name, candidate.id);

  // 7. Invite
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error: inviteErr } = await supabase.from("invites").insert({
    candidate_id: candidate.id,
    tenant_id: tenant.id,
    token: "test-token-jamie",
    sent_to_email: "jamie@test.com",
    sent_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
    status: "pending",
  });
  if (inviteErr) throw inviteErr;
  console.log("Invite created for Jamie (token: test-token-jamie)");

  console.log("\nSeed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
