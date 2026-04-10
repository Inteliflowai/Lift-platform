export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { getStripePrices } from "@/lib/stripe/prices";

export async function POST(req: NextRequest) {
  try {
    const { user, tenantId, tenant } = await getTenantContext();

    const body = await req.json();
    const { tier } = body;

    const prices = getStripePrices();
    const priceId = prices[tier];
    if (!priceId) {
      return NextResponse.json(
        { error: `Invalid tier or missing price ID for "${tier}". Check STRIPE_PRICE_ID env vars.` },
        { status: 400 }
      );
    }

    // Get current license
    const { data: license } = await supabaseAdmin
      .from("tenant_licenses")
      .select("status, stripe_customer_id")
      .eq("tenant_id", tenantId)
      .single();

    if (!license || (license.status !== "trialing" && license.status !== "active")) {
      return NextResponse.json(
        { error: "License must be trialing or active to upgrade" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let customerId = license.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        name: tenant?.name ?? undefined,
        metadata: {
          tenant_id: tenantId,
          school_name: tenant?.name ?? "",
          admin_email: user.email ?? "",
        },
      });
      customerId = customer.id;

      await supabaseAdmin
        .from("tenant_licenses")
        .update({ stripe_customer_id: customerId })
        .eq("tenant_id", tenantId);
    }

    // Create checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/school/settings/subscription?payment=success`,
      cancel_url: `${appUrl}/school/settings/subscription?payment=cancelled`,
      subscription_data: {
        metadata: { tenant_id: tenantId, tier },
      },
      allow_promotion_codes: true,
      billing_address_collection: "required",
      metadata: { tenant_id: tenantId, tier },
    });

    return NextResponse.json({ checkout_url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
