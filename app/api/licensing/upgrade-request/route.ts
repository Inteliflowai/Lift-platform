import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getLicense } from "@/lib/licensing/resolver";
import { sendUpgradeRequestEmail, sendUpgradeConfirmationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { user, tenantId, tenant } = await getTenantContext();

  const body = await req.json();
  const { requested_tier, billing_cycle, message } = body;

  if (!requested_tier || !["essentials", "professional", "enterprise"].includes(requested_tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const license = await getLicense(tenantId);

  // Insert upgrade request
  const { error: reqErr } = await supabaseAdmin
    .from("upgrade_requests")
    .insert({
      tenant_id: tenantId,
      requested_by: user.id,
      current_tier: license.tier,
      requested_tier,
      billing_preference: billing_cycle,
      message: message || null,
    });

  if (reqErr) {
    return NextResponse.json({ error: reqErr.message }, { status: 500 });
  }

  // Log license event
  await supabaseAdmin.from("license_events").insert({
    tenant_id: tenantId,
    actor_id: user.id,
    event_type: "upgrade_requested",
    from_tier: license.tier,
    to_tier: requested_tier,
    payload: { billing_cycle, message },
  });

  // Get user profile for email
  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const schoolName = tenant?.name ?? "Unknown School";
  const adminEmail = profile?.email ?? user.email ?? "";
  const adminName = profile?.full_name ?? "";

  // Send notification to platform team (fire-and-forget)
  sendUpgradeRequestEmail({
    schoolName,
    currentTier: license.tier,
    requestedTier: requested_tier,
    billingPreference: billing_cycle,
    adminName,
    adminEmail,
    message: message || null,
    tenantId,
  }).catch((err) => console.error("Upgrade notification email failed:", err));

  // Send confirmation to school admin
  sendUpgradeConfirmationEmail({
    to: adminEmail,
    firstName: adminName.split(" ")[0],
    requestedTier: requested_tier,
  }).catch((err) => console.error("Upgrade confirmation email failed:", err));

  return NextResponse.json({ success: true });
}
