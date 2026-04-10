export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { invalidateLicenseCache } from "@/lib/licensing/resolver";
import { TIER_LIMITS, TIER_PRICING } from "@/lib/licensing/features";
import { sendActivationEmail } from "@/lib/email";
import { writeAuditLog } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const { user, isPlatformAdmin } = await getTenantContext();
  if (!isPlatformAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { tenantId } = params;
  const body = await req.json();
  const {
    tier,
    billing_cycle,
    period_starts_at,
    period_ends_at,
    installment_1_amount,
    installment_2_amount,
    request_id,
  } = body;

  if (!tier || !period_starts_at || !period_ends_at) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Get current license
  const { data: before } = await supabaseAdmin
    .from("tenant_licenses")
    .select("tier, status")
    .eq("tenant_id", tenantId)
    .single();

  // Activate license
  const updates: Record<string, unknown> = {
    tier,
    status: "active",
    billing_cycle: billing_cycle ?? "annual",
    current_period_starts_at: period_starts_at,
    current_period_ends_at: period_ends_at,
    next_renewal_at: period_ends_at,
    trial_converted: before?.status === "trialing",
    trial_converted_at:
      before?.status === "trialing" ? new Date().toISOString() : undefined,
    suspended_at: null,
    suspended_reason: null,
    data_deletion_scheduled_at: null,
    updated_at: new Date().toISOString(),
  };

  if (installment_1_amount) {
    updates.installment_1_amount = installment_1_amount;
  }
  if (installment_2_amount) {
    updates.installment_2_due = true;
    updates.installment_2_amount = installment_2_amount;
  }

  const { error: updateErr } = await supabaseAdmin
    .from("tenant_licenses")
    .update(updates)
    .eq("tenant_id", tenantId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Log event
  await supabaseAdmin.from("license_events").insert({
    tenant_id: tenantId,
    actor_id: user.id,
    event_type: "tier_changed",
    from_tier: before?.tier,
    to_tier: tier,
    from_status: before?.status,
    to_status: "active",
    payload: { billing_cycle, request_id },
  });

  // Mark upgrade request as activated
  if (request_id) {
    await supabaseAdmin
      .from("upgrade_requests")
      .update({
        status: "activated",
        activated_at: new Date().toISOString(),
        activated_by: user.id,
      })
      .eq("id", request_id);
  }

  invalidateLicenseCache(tenantId);

  // Send activation email to school admin
  const { data: schoolAdmin } = await supabaseAdmin
    .from("user_tenant_roles")
    .select("user_id, users(full_name, email)")
    .eq("tenant_id", tenantId)
    .eq("role", "school_admin")
    .limit(1)
    .single();

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .single();

  if (schoolAdmin) {
    const adminUser = schoolAdmin.users as unknown as {
      full_name: string;
      email: string;
    };
    const tierKey = tier as keyof typeof TIER_PRICING;
    const pricing = TIER_PRICING[tierKey];
    const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];

    sendActivationEmail({
      to: adminUser.email,
      firstName: adminUser.full_name?.split(" ")[0] ?? "",
      schoolName: tenant?.name ?? "",
      tierLabel: pricing?.label ?? tier,
      annualAmount: pricing?.annual ?? 0,
      periodEndsAt: new Date(period_ends_at),
      sessionsLimit: limits?.sessions_per_year ?? null,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/school`,
    }).catch((err) => console.error("Activation email failed:", err));
  }

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    action: "license_activated",
    payload: { tier, billing_cycle },
  });

  return NextResponse.json({ success: true });
}
