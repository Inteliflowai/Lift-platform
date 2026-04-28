import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { invalidateLicenseCache } from "./resolver";
import { TIER_PRICING } from "./features";
import { sendActivationEmail, sendSuspendedEmail, sendPlanUpdatedEmail } from "@/lib/email";
import { seedTaskTemplatesForTenant } from "@/lib/seed-task-templates";
import { syncLicenseEventToHL } from "@/lib/highlevel/events";

export async function handleStripeWebhook(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const tier = session.metadata?.tier;

      // Guest purchase — create tenant + user from Stripe data
      if (session.metadata?.guest_purchase === "true" && tier) {
        await handleGuestPurchase(session, tier);
        break;
      }

      const tenantId = session.metadata?.tenant_id;
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

async function handleGuestPurchase(session: Stripe.Checkout.Session, tier: string) {
  console.log("[GuestPurchase] Starting for tier:", tier, "session:", session.id);
  const email = session.metadata?.email ?? session.customer_details?.email ?? "";
  const fullName = session.metadata?.full_name ?? session.customer_details?.name ?? "";
  const schoolName = session.metadata?.school_name ?? `${fullName}'s School`;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  console.log("[GuestPurchase] Email:", email, "Name:", fullName, "School:", schoolName);

  if (!email) {
    console.error("[GuestPurchase] No email found in session metadata or customer_details");
    return;
  }

  // Idempotency: check if this checkout session was already processed
  const { data: existingEvent } = await supabaseAdmin
    .from("license_events")
    .select("id")
    .eq("event_type", "guest_purchase_completed")
    .contains("payload", { stripe_session_id: session.id })
    .limit(1);

  if (existingEvent && existingEvent.length > 0) {
    console.log("[GuestPurchase] Already processed session:", session.id);
    return;
  }

  // Check if user already exists
  const { data: existingUsers } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .limit(1);

  if (existingUsers && existingUsers.length > 0) {
    console.log("[GuestPurchase] Existing user found:", existingUsers[0].id);
    // User exists — find their tenant and just activate the license
    const { data: roles } = await supabaseAdmin
      .from("user_tenant_roles")
      .select("tenant_id")
      .eq("user_id", existingUsers[0].id)
      .limit(1);

    if (roles?.[0]?.tenant_id) {
      console.log("[GuestPurchase] Activating license for existing tenant:", roles[0].tenant_id);
      const { stripe: stripeClient } = await import("@/lib/stripe/client");
      const sub = await stripeClient.subscriptions.retrieve(subscriptionId) as unknown as {
        current_period_start: number;
        current_period_end: number;
      };

      // Update subscription metadata with tenant_id for future webhooks
      await stripeClient.subscriptions.update(subscriptionId, {
        metadata: { tenant_id: roles[0].tenant_id, tier },
      });

      await activateLicense({
        tenantId: roles[0].tenant_id,
        tier,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        periodStart: new Date(sub.current_period_start * 1000).toISOString(),
        periodEnd: new Date(sub.current_period_end * 1000).toISOString(),
      });

      console.log("[GuestPurchase] License activated, sending confirmation email");

      // Send confirmation email
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lift.inteliflowai.com";
      const { sendLiftEmail } = await import("@/lib/emails/send");
      const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
      await sendLiftEmail({
        to: email,
        subject: `LIFT ${tierLabel} Plan Activated`,
        tenantId: roles[0].tenant_id,
        content: `
          <h2 style="margin:0 0 12px;font-size:20px;color:#1a1a2e">Your Plan is Active!</h2>
          <p>Hi ${fullName.split(" ")[0]},</p>
          <p>Your <strong>${tierLabel}</strong> plan is now active. You can log in to your dashboard to get started.</p>
          <div style="text-align:center;margin:28px 0">
            <a href="${appUrl}/login" style="display:inline-block;padding:14px 32px;background:#6366f1;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">
              Go to Dashboard
            </a>
          </div>
        `,
      }).catch((err) => console.error("[GuestPurchase] Confirmation email failed:", err));

      // HL sync
      console.log("[GuestPurchase] Syncing to HL");
      syncLicenseEventToHL({
        event_type: "tier_changed",
        tenant_id: roles[0].tenant_id,
        tenant_name: schoolName,
        admin_email: email,
        admin_name: fullName,
        tier,
      }).catch((err) => console.error("[GuestPurchase] HL sync failed:", err));

      console.log("[GuestPurchase] Done (existing user path)");
      return;
    } else {
      console.log("[GuestPurchase] Existing user has no tenant role, creating new tenant");
    }
  }

  // Create new auth user with a readable temp password
  const words = ["Lift", "School", "Ready", "Bright", "Learn", "Start", "Grow", "Focus"];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  const tempPassword = `${word}${num}!`;
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    console.error("[GuestPurchase] Failed to create auth user:", authError?.message);
    return;
  }

  const userId = authData.user.id;

  try {
    // Create tenant
    const slug = schoolName
      .toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from("tenants")
      .insert({ name: schoolName.trim(), slug, status: "active" })
      .select()
      .single();

    if (tenantErr || !tenant) throw new Error(tenantErr?.message || "Failed to create tenant");

    // Update user profile
    await supabaseAdmin.from("users").update({ full_name: fullName.trim(), email }).eq("id", userId);

    // Assign school_admin role
    await supabaseAdmin.from("user_tenant_roles").insert({
      user_id: userId,
      tenant_id: tenant.id,
      role: "school_admin",
    });

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

    // Seed task templates
    await seedTaskTemplatesForTenant(tenant.id);

    // Get subscription details
    const { stripe: stripeClient } = await import("@/lib/stripe/client");
    const sub = await stripeClient.subscriptions.retrieve(subscriptionId) as unknown as {
      current_period_start: number;
      current_period_end: number;
    };

    // Update subscription metadata with tenant_id
    await stripeClient.subscriptions.update(subscriptionId, {
      metadata: { tenant_id: tenant.id, tier },
    });

    // Activate license (skip trial — they paid)
    await activateLicense({
      tenantId: tenant.id,
      tier,
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: customerId,
      periodStart: new Date(sub.current_period_start * 1000).toISOString(),
      periodEnd: new Date(sub.current_period_end * 1000).toISOString(),
    });

    // Log event
    await supabaseAdmin.from("license_events").insert({
      tenant_id: tenant.id,
      actor_id: userId,
      event_type: "guest_purchase_completed",
      to_tier: tier,
      to_status: "active",
      payload: { source: "stripe_guest_checkout", school_name: schoolName, stripe_session_id: session.id },
    });

    // Send welcome email with temporary credentials
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lift.inteliflowai.com";
    const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
    const { sendLiftEmail } = await import("@/lib/emails/send");
    await sendLiftEmail({
      to: email,
      subject: `Welcome to LIFT — Your ${tierLabel} Account is Ready`,
      tenantId: tenant.id,
      content: `
        <h2 style="margin:0 0 12px;font-size:20px;color:#1a1a2e">Welcome to LIFT!</h2>
        <p>Hi ${fullName.split(" ")[0]},</p>
        <p>Your <strong>${tierLabel}</strong> plan for <strong>${schoolName}</strong> is now active. Here are your login credentials:</p>
        <div style="margin:20px 0;padding:20px;background:#f8f8fa;border-radius:8px;border:1px solid #e5e5e5">
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280">Email</p>
          <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1a1a2e">${email}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280">Temporary Password</p>
          <p style="margin:0;font-size:16px;font-weight:600;color:#1a1a2e;font-family:monospace;letter-spacing:1px">${tempPassword}</p>
        </div>
        <div style="text-align:center;margin:28px 0">
          <a href="${appUrl}/login" style="display:inline-block;padding:14px 32px;background:#6366f1;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">
            Log In to Your Dashboard
          </a>
        </div>
        <p style="font-size:13px;color:#f59e0b;font-weight:600">&#9888; Please change your password after your first login via Settings &gt; Account.</p>
        <p style="font-size:13px;color:#6b7280">If you have any questions, reply to this email or contact us at lift@inteliflowai.com.</p>
      `,
    }).catch((err) => console.error("[GuestPurchase] Welcome email failed:", err));

    // Flag user for password change on first login (via auth metadata)
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { must_change_password: true },
    });

    // HL sync — purchased directly
    syncLicenseEventToHL({
      event_type: "tier_changed",
      tenant_id: tenant.id,
      tenant_name: schoolName,
      admin_email: email,
      admin_name: fullName,
      tier,
    }).catch((err) => console.error("HL sync failed:", err));

    // Seed demo candidates
    const demos = [
      { first_name: "Sofia", last_name: "Martinez (Demo)", grade_band: "8", status: "active" },
      { first_name: "James", last_name: "Chen (Demo)", grade_band: "6-7", status: "active" },
      { first_name: "Amara", last_name: "Okafor (Demo)", grade_band: "9-11", status: "active" },
    ];
    for (const demo of demos) {
      await supabaseAdmin.from("candidates").insert({ ...demo, tenant_id: tenant.id, is_demo: true });
    }

  } catch (err) {
    console.error("[GuestPurchase] Tenant creation failed:", err);
    await supabaseAdmin.auth.admin.deleteUser(userId);
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
