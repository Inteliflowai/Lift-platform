export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { invalidateLicenseCache } from "@/lib/licensing/resolver";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const { user, isPlatformAdmin } = await getTenantContext();
  if (!isPlatformAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { tenant_id, action, days, tier } = await req.json();
  if (!tenant_id || !action) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: before } = await supabaseAdmin
    .from("tenant_licenses")
    .select("*")
    .eq("tenant_id", tenant_id)
    .single();

  if (!before) {
    return NextResponse.json({ error: "License not found" }, { status: 404 });
  }

  let eventType = "";

  switch (action) {
    case "reset_to_trial": {
      await supabaseAdmin
        .from("tenant_licenses")
        .update({
          tier: "trial",
          status: "trialing",
          trial_starts_at: new Date().toISOString(),
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          trial_converted: false,
          trial_converted_at: null,
          billing_cycle: null,
          current_period_starts_at: null,
          current_period_ends_at: null,
          next_renewal_at: null,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          stripe_invoice_id: null,
          installment_1_paid: false,
          installment_2_due: false,
          installment_2_paid: false,
          suspended_at: null,
          suspended_reason: null,
          data_deletion_scheduled_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenant_id);
      eventType = "reset_to_trial";
      break;
    }

    case "extend_trial": {
      const extendDays = days ?? 30;
      const currentEnd = before.trial_ends_at
        ? new Date(before.trial_ends_at)
        : new Date();
      const newEnd = new Date(currentEnd.getTime() + extendDays * 24 * 60 * 60 * 1000);
      await supabaseAdmin
        .from("tenant_licenses")
        .update({
          trial_ends_at: newEnd.toISOString(),
          status: "trialing",
          suspended_at: null,
          suspended_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenant_id);
      eventType = "trial_extended";
      break;
    }

    case "activate": {
      const activeTier = tier ?? "professional";
      await supabaseAdmin
        .from("tenant_licenses")
        .update({
          tier: activeTier,
          status: "active",
          current_period_starts_at: new Date().toISOString(),
          current_period_ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          next_renewal_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          trial_converted: true,
          trial_converted_at: new Date().toISOString(),
          suspended_at: null,
          suspended_reason: null,
          data_deletion_scheduled_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenant_id);
      eventType = "manually_activated";
      break;
    }

    case "suspend": {
      await supabaseAdmin
        .from("tenant_licenses")
        .update({
          status: "suspended",
          suspended_at: new Date().toISOString(),
          suspended_reason: "admin_action",
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenant_id);
      eventType = "manually_suspended";
      break;
    }

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await supabaseAdmin.from("license_events").insert({
    tenant_id,
    actor_id: user.id,
    event_type: eventType,
    from_tier: before.tier,
    to_tier: action === "activate" ? (tier ?? "professional") : action === "reset_to_trial" ? "trial" : before.tier,
    from_status: before.status,
    to_status: action === "reset_to_trial" ? "trialing" : action === "activate" ? "active" : action === "suspend" ? "suspended" : before.status,
    payload: { action, days, tier },
  });

  await supabaseAdmin.from("admin_reset_log").insert({
    performed_by: user.id,
    tenant_id,
    reset_type: action === "extend_trial" ? "extend_trial" : "reset_license",
    notes: `Action: ${action}${days ? `, days: ${days}` : ""}${tier ? `, tier: ${tier}` : ""}`,
  });

  invalidateLicenseCache(tenant_id);

  await writeAuditLog(supabaseAdmin, {
    tenant_id,
    actor_id: user.id,
    action: `admin_license_${action}`,
    payload: { action, days, tier },
  });

  const { data: updated } = await supabaseAdmin
    .from("tenant_licenses")
    .select("*")
    .eq("tenant_id", tenant_id)
    .single();

  return NextResponse.json({ success: true, license: updated });
}
