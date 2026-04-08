import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/email";

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

  // Check if email already exists
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const emailExists = existingUsers?.users?.some(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
  if (emailExists) {
    return NextResponse.json(
      { error: "An account with this email already exists. Please sign in instead." },
      { status: 409 }
    );
  }

  // Create auth user
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message || "Failed to create account." },
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

    // Create user profile
    const { error: userErr } = await supabaseAdmin.from("users").insert({
      id: userId,
      full_name: fullName.trim(),
      email,
    });

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
