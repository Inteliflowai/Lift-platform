import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/email";
import { seedTaskTemplatesForTenant } from "@/lib/seed-task-templates";
import { syncLicenseEventToHL } from "@/lib/highlevel/events";

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
    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from("tenants")
      .insert({
        name: schoolName.trim(),
        slug,
        status: "active",
        school_type: schoolType,
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

    // Create 3 demo candidates so the school sees sample data
    await seedDemoCandidates(tenant.id);

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

async function seedDemoCandidates(tenantId: string) {
  const demos = [
    {
      first_name: "Sofia",
      last_name: "Martinez (Demo)",
      grade_applying_to: 8,
      grade_band: "8",
      status: "active",
    },
    {
      first_name: "James",
      last_name: "Chen (Demo)",
      grade_applying_to: 7,
      grade_band: "6-7",
      status: "active",
    },
    {
      first_name: "Amara",
      last_name: "Okafor (Demo)",
      grade_applying_to: 10,
      grade_band: "9-11",
      status: "active",
    },
  ];

  for (const demo of demos) {
    await supabaseAdmin.from("candidates").insert({
      ...demo,
      tenant_id: tenantId,
    });
  }
}
