/**
 * Stripe webhook handler — wired but inactive.
 * Activate by setting STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in .env.local.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StripeEvent = { type: string; data: { object: any } };

export async function handleStripeWebhook(
  event: StripeEvent
): Promise<void> {
  switch (event.type) {
    case "invoice.paid":
      // Update tenant_licenses: status='active', installment paid flags, period dates
      // Call activateLicense(tenantId, tier, periodDates)
      break;
    case "invoice.payment_failed":
      // Update status='past_due', send payment failed email
      break;
    case "customer.subscription.deleted":
      // Update status='cancelled', schedule data deletion
      break;
    case "customer.subscription.updated":
      // Tier change from Stripe — update tier in tenant_licenses
      break;
  }
}
