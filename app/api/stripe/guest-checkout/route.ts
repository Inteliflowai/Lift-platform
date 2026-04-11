import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { getStripePrices } from "@/lib/stripe/prices";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Payment system not configured." },
        { status: 503 }
      );
    }

    const { tier, email, school_name, full_name } = await req.json();

    if (!tier || !email || !school_name || !full_name) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    const prices = getStripePrices();
    const priceId = prices[tier];
    if (!priceId) {
      return NextResponse.json(
        { error: `Invalid plan: "${tier}".` },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    // Create a Stripe customer with the school info
    const customer = await stripe.customers.create({
      email,
      name: full_name,
      metadata: {
        school_name,
        full_name,
        guest_purchase: "true",
        tier,
      },
    });

    // Create checkout session — guest flow (no tenant_id yet)
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/buy/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/buy?tier=${tier}&cancelled=true`,
      subscription_data: {
        metadata: {
          guest_purchase: "true",
          tier,
          school_name,
          full_name,
          email,
        },
      },
      metadata: {
        guest_purchase: "true",
        tier,
        school_name,
        full_name,
        email,
      },
      allow_promotion_codes: true,
      billing_address_collection: "required",
    });

    return NextResponse.json({ checkout_url: session.url });
  } catch (err) {
    console.error("Guest checkout error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
