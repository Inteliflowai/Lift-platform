export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { invalidateLicenseCache } from "@/lib/licensing/resolver";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const { user, isPlatformAdmin } = await getTenantContext();
  if (!isPlatformAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { tenantId } = params;

  const allowed = [
    "tier",
    "status",
    "trial_ends_at",
    "billing_cycle",
    "current_period_starts_at",
    "current_period_ends_at",
    "next_renewal_at",
    "installment_1_paid",
    "installment_1_paid_at",
    "installment_1_amount",
    "installment_2_due",
    "installment_2_due_at",
    "installment_2_paid",
    "installment_2_paid_at",
    "installment_2_amount",
    "feature_overrides",
    "feature_blocks",
    "session_limit_override",
    "seat_limit_override",
    "internal_notes",
  ];

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  // Get current state for event logging
  const { data: before } = await supabaseAdmin
    .from("tenant_licenses")
    .select("tier, status")
    .eq("tenant_id", tenantId)
    .single();

  const { data, error } = await supabaseAdmin
    .from("tenant_licenses")
    .update(updates)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log event if tier or status changed
  if (
    (updates.tier && updates.tier !== before?.tier) ||
    (updates.status && updates.status !== before?.status)
  ) {
    await supabaseAdmin.from("license_events").insert({
      tenant_id: tenantId,
      actor_id: user.id,
      event_type: updates.tier !== before?.tier ? "tier_changed" : "status_changed",
      from_tier: before?.tier,
      to_tier: (updates.tier as string) ?? before?.tier,
      from_status: before?.status,
      to_status: (updates.status as string) ?? before?.status,
    });
  }

  invalidateLicenseCache(tenantId);

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    action: "license_updated",
    payload: updates,
  });

  return NextResponse.json(data);
}
