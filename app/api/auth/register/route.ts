import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/email";
import { seedTaskTemplatesForTenant } from "@/lib/seed-task-templates";
import { syncLicenseEventToHL } from "@/lib/highlevel/events";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit/middleware";
import { ensureDemoCandidates } from "@/lib/demo/seedDemoSchool";
import { inferExpectedTier } from "@/lib/licensing/expectedTier";
import { markOnboardingStep } from "@/lib/onboarding";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function uniqueSlug(base: string): Promise<string> {
  const slug = slugify(base);
  let suffix = 1;

  while (true) {
    const candidate = suffix === 1 ? slug : `${slug}-${suffix}`;
    const { data } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("slug", candidate)
      .limit(1);
    if (!data || data.length === 0) return candidate;
    suffix++;
  }
}

export async function POST(req: NextRequest) {
  // Rate limit: 5 registrations per IP per hour
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!rateLimit(`register:${ip}`, 5, 3600)) {
    return rateLimitResponse() as unknown as NextResponse;
  }

  const body = await req.json();
  const {
    schoolName,
    schoolType,
    fullName,
    email,
    password,
    confirmPassword,
    estimatedApplicants,
    country,
    title,
  } = body;

  // Validate required fields
  if (!schoolName?.trim() || !schoolType || !fullName?.trim() || !email?.trim() || !password) {
    return NextResponse.json(
      { error: "All required fields must be provided." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json(
      { error: "Passwords do not match." },
      { status: 400 }
    );
  }

  // Check if email already exists — try creating and handle duplicate error
  // (Supabase will return an error if the email is taken)

  // Create auth user
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    const msg = authError?.message ?? "";
    if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("duplicate")) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in instead." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: msg || "Failed to create account." },
      { status: 500 }
    );
  }

  const userId = authData.user.id;

  try {
    // Create tenant
    const slug = await uniqueSlug(schoolName);
    const expectedTier = inferExpectedTier({
      schoolType,
      estimatedApplicants,
    });
    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from("tenants")
      .insert({
        name: schoolName.trim(),
        slug,
        status: "active",
        school_type: schoolType,
        expected_tier: expectedTier,
      })
      .select()
      .single();

    if (tenantErr || !tenant) throw new Error(tenantErr?.message || "Failed to create school.");

    // Update user profile (trigger auto-created the row from auth.users)
    const { error: userErr } = await supabaseAdmin
      .from("users")
      .update({ full_name: fullName.trim(), email })
      .eq("id", userId);

    if (userErr) throw new Error(userErr.message);

    // Assign school_admin role
    const { error: roleErr } = await supabaseAdmin
      .from("user_tenant_roles")
      .insert({
        user_id: userId,
        tenant_id: tenant.id,
        role: "school_admin",
      });

    if (roleErr) throw new Error(roleErr.message);

    // Create tenant settings
    await supabaseAdmin.from("tenant_settings").insert({
      tenant_id: tenant.id,
      default_language: "en",
      coppa_mode: false,
      session_pause_allowed: true,
      session_pause_limit_hours: 48,
      data_retention_days: 1095,
      require_human_review_always: false,
      voice_mode_enabled: true,
      passage_reader_enabled: true,
      delete_audio_after_transcription: true,
    });

    // tenant_licenses is auto-created by DB trigger (create_trial_license)

    // Seed standard task templates for all grade bands
    await seedTaskTemplatesForTenant(tenant.id);

    // Auto-create a default active cycle so the trial user can immediately
    // invite a candidate (or self-invite from the welcome page) without first
    // configuring a cycle. Status MUST be 'active' — the candidate invite
    // route filters cycles on status='active' to attach a cycle_id.
    {
      const startYear = new Date().getFullYear();
      const academicYear = `${startYear}-${startYear + 1}`;
      const cycleName = `${academicYear} Full Year Admissions`;
      const { data: cycle } = await supabaseAdmin
        .from("application_cycles")
        .insert({
          tenant_id: tenant.id,
          name: cycleName,
          academic_year: academicYear,
          status: "active",
        })
        .select("id")
        .single();

      if (cycle) {
        const bands = ["6-7", "8", "9-11"] as const;
        await supabaseAdmin.from("grade_band_templates").insert(
          bands.map((gb) => ({
            tenant_id: tenant.id,
            cycle_id: cycle.id,
            grade_band: gb,
            name: `Default ${gb}`,
            config: {
              task_count: gb === "6-7" ? 4 : gb === "8" ? 5 : 6,
              time_limit_minutes: gb === "6-7" ? 30 : gb === "8" ? 40 : 50,
              hint_density: "medium",
              ux_mode: gb === "6-7" ? "simple" : "standard",
            },
            is_default: true,
          }))
        );
      }

      // Mark onboarding step 1 done so the (now-quieted) banner doesn't nag.
      markOnboardingStep(tenant.id, "cycle_created").catch(() => {});
    }

    // Log registration metadata as license event
    await supabaseAdmin.from("license_events").insert({
      tenant_id: tenant.id,
      actor_id: userId,
      event_type: "registration_completed",
      to_tier: "trial",
      to_status: "trialing",
      payload: {
        school_type: schoolType,
        estimated_applicants: estimatedApplicants,
        country,
        admin_title: title,
      },
    });

    // Send welcome email (fire-and-forget)
    const { data: license } = await supabaseAdmin
      .from("tenant_licenses")
      .select("trial_ends_at")
      .eq("tenant_id", tenant.id)
      .single();

    sendWelcomeEmail({
      to: email,
      firstName: fullName.trim().split(" ")[0],
      schoolName: schoolName.trim(),
      trialEndsAt: license?.trial_ends_at
        ? new Date(license.trial_ends_at)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    }).catch((err) => console.error("Welcome email failed:", err));

    // Sync to HighLevel CRM (fire-and-forget)
    syncLicenseEventToHL({
      event_type: "trial_started",
      tenant_id: tenant.id,
      tenant_name: schoolName.trim(),
      admin_email: email,
      admin_name: fullName.trim(),
      tier: "trial",
      school_type: schoolType,
      estimated_applicants: estimatedApplicants,
    }).catch((err) => console.error("HL sync failed:", err));

    // Create 3 demo candidates with full profiles so the school sees sample data immediately
    await ensureDemoCandidates(tenant.id).catch((err) =>
      console.error("[register] Demo seed failed:", err)
    );

    return NextResponse.json(
      { success: true, tenant_id: tenant.id, redirect: "/school/welcome" },
      { status: 201 }
    );
  } catch (err) {
    // Clean up auth user on failure
    await supabaseAdmin.auth.admin.deleteUser(userId);
    console.error("Registration failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Registration failed. Please try again.",
      },
      { status: 500 }
    );
  }
}

