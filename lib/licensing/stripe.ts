import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { invalidateLicenseCache } from "./resolver";
import { TIER_PRICING } from "./features";
import { sendActivationEmail, sendSuspendedEmail, sendPlanUpdatedEmail } from "@/lib/email";

export async function handleStripeWebhook(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const tenantId = session.metadata?.tenant_id;
      const tier = session.metadata?.tier;
      if (!tenantId || !tier) break;

      const { stripe } = await import("@/lib/stripe/client");
      const subscriptionId = session.subscription as string;
      const sub = await stripe.subscriptions.retrieve(subscriptionId) as unknown as {
        current_period_start: number;
        current_period_end: number;
      };

      await activateLicense({
        tenantId,
        tier,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: session.customer as string,
        periodStart: new Date(sub.current_period_start * 1000).toISOString(),
        periodEnd: new Date(sub.current_period_end * 1000).toISOString(),
      });
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as unknown as { id: string; subscription: string | null };
      if (!invoice.subscription) break;

      const { stripe } = await import("@/lib/stripe/client");
      const sub = await stripe.subscriptions.retrieve(
        invoice.subscription
      ) as unknown as {
        metadata: Record<string, string>;
        current_period_start: number;
        current_period_end: number;
      };
      const tenantId = sub.metadata.tenant_id;
      if (!tenantId) break;

      await renewLicense({
        tenantId,
        periodStart: new Date(sub.current_period_start * 1000).toISOString(),
        periodEnd: new Date(sub.current_period_end * 1000).toISOString(),
        stripeInvoiceId: invoice.id,
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice2 = event.data.object as unknown as { subscription: string | null };
      if (!invoice2.subscription) break;

      const { stripe: stripeClient } = await import("@/lib/stripe/client");
      const sub2 = await stripeClient.subscriptions.retrieve(
        invoice2.subscription
      ) as unknown as { metadata: Record<string, string> };
      const tenantId = sub2.metadata.tenant_id;
      if (!tenantId) break;

      await setLicensePastDue(tenantId);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const tenantId = sub.metadata.tenant_id;
      if (!tenantId) break;

      await cancelLicense(tenantId);
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const tenantId = sub.metadata.tenant_id;
      const newTier = sub.metadata.tier;
      if (!tenantId || !newTier) break;

      await changeLicenseTier(tenantId, newTier);
      break;
    }
  }
}

async function getSchoolAdminEmail(tenantId: string) {
  const { data } = await supabaseAdmin
    .from("user_tenant_roles")
    .select("users(full_name, email)")
    .eq("tenant_id", tenantId)
    .eq("role", "school_admin")
    .limit(1)
    .single();
  const u = data?.users as unknown as { full_name: string; email: string } | null;
  return { email: u?.email ?? "", firstName: u?.full_name?.split(" ")[0] ?? "" };
}

async function getTenantName(tenantId: string) {
  const { data } = await supabaseAdmin
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .single();
  return data?.name ?? "";
}

async function activateLicense(params: {
  tenantId: string;
  tier: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  periodStart: string;
  periodEnd: string;
}) {
  const { data: before } = await supabaseAdmin
    .from("tenant_licenses")
    .select("tier, status")
    .eq("tenant_id", params.tenantId)
    .single();

  await supabaseAdmin
    .from("tenant_licenses")
    .update({
      tier: params.tier,
      status: "active",
      stripe_subscription_id: params.stripeSubscriptionId,
      stripe_customer_id: params.stripeCustomerId,
      current_period_starts_at: params.periodStart,
      current_period_ends_at: params.periodEnd,
      next_renewal_at: params.periodEnd,
      trial_converted: before?.status === "trialing",
      trial_converted_at:
        before?.status === "trialing" ? new Date().toISOString() : undefined,
      suspended_at: null,
      suspended_reason: null,
      data_deletion_scheduled_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", params.tenantId);

  await supabaseAdmin.from("license_events").insert({
    tenant_id: params.tenantId,
    event_type: "tier_changed",
    from_tier: before?.tier,
    to_tier: params.tier,
    from_status: before?.status,
    to_status: "active",
    payload: { source: "stripe", subscription_id: params.stripeSubscriptionId },
  });

  invalidateLicenseCache(params.tenantId);

  // Send activation email
  const admin = await getSchoolAdminEmail(params.tenantId);
  const schoolName = await getTenantName(params.tenantId);
  const pricing = TIER_PRICING[params.tier as keyof typeof TIER_PRICING];

  sendActivationEmail({
    to: admin.email,
    firstName: admin.firstName,
    schoolName,
    tierLabel: pricing?.label ?? params.tier,
    annualAmount: pricing?.annual ?? 0,
    periodEndsAt: new Date(params.periodEnd),
    sessionsLimit: null,
    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/school`,
  }).catch((err) => console.error("Activation email failed:", err));
}

async function renewLicense(params: {
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  stripeInvoiceId: string;
}) {
  await supabaseAdmin
    .from("tenant_licenses")
    .update({
      status: "active",
      current_period_starts_at: params.periodStart,
      current_period_ends_at: params.periodEnd,
      next_renewal_at: params.periodEnd,
      stripe_invoice_id: params.stripeInvoiceId,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", params.tenantId);

  await supabaseAdmin.from("license_events").insert({
    tenant_id: params.tenantId,
    event_type: "renewed",
    to_status: "active",
    payload: { invoice_id: params.stripeInvoiceId },
  });

  invalidateLicenseCache(params.tenantId);
}

async function setLicensePastDue(tenantId: string) {
  await supabaseAdmin
    .from("tenant_licenses")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId);

  await supabaseAdmin.from("license_events").insert({
    tenant_id: tenantId,
    event_type: "payment_failed",
    to_status: "past_due",
  });

  invalidateLicenseCache(tenantId);

  const admin = await getSchoolAdminEmail(tenantId);
  const schoolName = await getTenantName(tenantId);
  sendSuspendedEmail({
    to: admin.email,
    firstName: admin.firstName,
    schoolName,
    reason: "payment_failed",
    dataDeletionDate: null,
  }).catch((err) => console.error("Past due email failed:", err));
}

async function cancelLicense(tenantId: string) {
  const deletionDate = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  await supabaseAdmin
    .from("tenant_licenses")
    .update({
      status: "cancelled",
      suspended_at: new Date().toISOString(),
      suspended_reason: "subscription_cancelled",
      data_deletion_scheduled_at: deletionDate,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId);

  await supabaseAdmin.from("license_events").insert({
    tenant_id: tenantId,
    event_type: "cancelled",
    to_status: "cancelled",
  });

  invalidateLicenseCache(tenantId);

  const admin = await getSchoolAdminEmail(tenantId);
  const schoolName = await getTenantName(tenantId);
  sendSuspendedEmail({
    to: admin.email,
    firstName: admin.firstName,
    schoolName,
    reason: "subscription_cancelled",
    dataDeletionDate: new Date(deletionDate),
  }).catch((err) => console.error("Cancellation email failed:", err));
}

async function changeLicenseTier(tenantId: string, newTier: string) {
  const { data: before } = await supabaseAdmin
    .from("tenant_licenses")
    .select("tier")
    .eq("tenant_id", tenantId)
    .single();

  if (before?.tier === newTier) return;

  await supabaseAdmin
    .from("tenant_licenses")
    .update({ tier: newTier, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId);

  await supabaseAdmin.from("license_events").insert({
    tenant_id: tenantId,
    event_type: "tier_changed",
    from_tier: before?.tier,
    to_tier: newTier,
  });

  invalidateLicenseCache(tenantId);

  const admin = await getSchoolAdminEmail(tenantId);
  const pricing = TIER_PRICING[newTier as keyof typeof TIER_PRICING];
  sendPlanUpdatedEmail({
    to: admin.email,
    firstName: admin.firstName,
    tierLabel: pricing?.label ?? newTier,
  }).catch((err) => console.error("Tier change email failed:", err));
}
