import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { TIER_PRICING, TIER_LIMITS } from "@/lib/licensing/features";
import {
  sendTrialExpiringEmail,
  sendTrialExpiredEmail,
  sendSuspendedEmail,
  sendPlanUpdatedEmail,
  sendRenewalReminderEmail,
  sendSessionLimitWarningEmail,
  sendDataDeletionWarningEmail,
  sendUpgradeRequestEmail,
} from "@/lib/email";
import { syncLicenseEventToHL } from "@/lib/highlevel/events";

async function getSchoolAdmin(tenantId: string) {
  const { data } = await supabaseAdmin
    .from("user_tenant_roles")
    .select("user_id, users(full_name, email)")
    .eq("tenant_id", tenantId)
    .eq("role", "school_admin")
    .limit(1)
    .single();

  if (!data) return null;
  const u = data.users as unknown as { full_name: string; email: string };
  return { userId: data.user_id, fullName: u.full_name, email: u.email };
}

async function getTenantName(tenantId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .single();
  return data?.name ?? "Your school";
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  // Supabase webhook sends: { type, table, record, ... }
  const record = body.record ?? body;
  const eventType: string = record.event_type ?? body.event_type;
  const tenantId: string = record.tenant_id ?? body.tenant_id;

  if (!eventType || !tenantId) {
    return NextResponse.json({ error: "Missing event_type or tenant_id" }, { status: 400 });
  }

  const admin = await getSchoolAdmin(tenantId);
  if (!admin) {
    return NextResponse.json({ ok: true, skipped: "no_admin" });
  }

  const schoolName = await getTenantName(tenantId);
  const firstName = admin.fullName?.split(" ")[0] ?? "there";

  try {
    switch (eventType) {
      case "trial_expiring_soon": {
        const { data: lic } = await supabaseAdmin
          .from("tenant_licenses")
          .select("trial_ends_at")
          .eq("tenant_id", tenantId)
          .single();
        const daysRemaining = lic?.trial_ends_at
          ? Math.max(0, Math.ceil((new Date(lic.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : 7;
        await sendTrialExpiringEmail({ to: admin.email, firstName, schoolName, daysRemaining });
        break;
      }

      case "trial_expired": {
        const { data: lic } = await supabaseAdmin
          .from("tenant_licenses")
          .select("data_deletion_scheduled_at")
          .eq("tenant_id", tenantId)
          .single();
        await sendTrialExpiredEmail({
          to: admin.email,
          firstName,
          schoolName,
          dataDeletionDate: lic?.data_deletion_scheduled_at ? new Date(lic.data_deletion_scheduled_at) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/school/settings/subscription`,
        });
        break;
      }

      case "tier_changed": {
        const toTier = record.to_tier ?? "";
        const pricing = TIER_PRICING[toTier as keyof typeof TIER_PRICING];
        await sendPlanUpdatedEmail({
          to: admin.email,
          firstName,
          tierLabel: pricing?.label ?? toTier,
        });
        break;
      }

      case "suspended": {
        const { data: lic } = await supabaseAdmin
          .from("tenant_licenses")
          .select("suspended_reason, data_deletion_scheduled_at")
          .eq("tenant_id", tenantId)
          .single();
        await sendSuspendedEmail({
          to: admin.email,
          firstName,
          schoolName,
          reason: lic?.suspended_reason ?? "unknown",
          dataDeletionDate: lic?.data_deletion_scheduled_at ? new Date(lic.data_deletion_scheduled_at) : null,
        });
        break;
      }

      case "renewal_reminder": {
        const { data: lic } = await supabaseAdmin
          .from("tenant_licenses")
          .select("tier, next_renewal_at")
          .eq("tenant_id", tenantId)
          .single();
        if (lic?.next_renewal_at) {
          const renewalDate = new Date(lic.next_renewal_at);
          const daysUntil = Math.max(0, Math.ceil((renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
          const pricing = TIER_PRICING[lic.tier as keyof typeof TIER_PRICING];
          await sendRenewalReminderEmail({
            to: admin.email,
            firstName,
            schoolName,
            tierLabel: pricing?.label ?? lic.tier,
            daysUntilRenewal: daysUntil,
            renewalDate,
            annualAmount: pricing?.annual ?? 0,
          });
        }
        break;
      }

      case "session_limit_80pct":
      case "session_limit_reached": {
        const { data: lic } = await supabaseAdmin
          .from("tenant_licenses")
          .select("tier, session_limit_override")
          .eq("tenant_id", tenantId)
          .single();
        const tierLimits = TIER_LIMITS[lic?.tier as keyof typeof TIER_LIMITS];
        const limit = lic?.session_limit_override ?? tierLimits?.sessions_per_year ?? 25;
        const payload = record.payload as Record<string, number> | undefined;
        const used = payload?.sessions_used ?? limit;
        await sendSessionLimitWarningEmail({ to: admin.email, firstName, schoolName, used, limit });
        break;
      }

      case "data_deletion_warning": {
        const { data: lic } = await supabaseAdmin
          .from("tenant_licenses")
          .select("data_deletion_scheduled_at")
          .eq("tenant_id", tenantId)
          .single();
        if (lic?.data_deletion_scheduled_at) {
          const deletionDate = new Date(lic.data_deletion_scheduled_at);
          const daysRemaining = Math.max(0, Math.ceil((deletionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
          await sendDataDeletionWarningEmail({ to: admin.email, firstName, schoolName, daysRemaining, deletionDate });
        }
        break;
      }

      case "upgrade_requested": {
        const payload = record.payload as Record<string, string> | undefined;
        await sendUpgradeRequestEmail({
          schoolName,
          currentTier: record.from_tier ?? "",
          requestedTier: record.to_tier ?? "",
          billingPreference: payload?.billing_cycle ?? "annual",
          adminName: admin.fullName,
          adminEmail: admin.email,
          message: payload?.message ?? null,
          tenantId,
        });
        break;
      }

      // trial_started is handled in registration — skip to avoid duplicates
      case "trial_started":
        break;

      default:
        break;
    }
  } catch (err) {
    console.error(`License notification failed for ${eventType}:`, err);
  }

  // Sync to HighLevel CRM (fire-and-forget)
  const { data: lic } = await supabaseAdmin
    .from("tenant_licenses")
    .select("tier")
    .eq("tenant_id", tenantId)
    .single();

  syncLicenseEventToHL({
    event_type: eventType,
    tenant_id: tenantId,
    tenant_name: schoolName,
    admin_email: admin.email,
    admin_name: admin.fullName,
    tier: lic?.tier ?? "trial",
  }).catch((err) => console.error("HL sync failed:", err));

  return NextResponse.json({ ok: true, event_type: eventType });
}
