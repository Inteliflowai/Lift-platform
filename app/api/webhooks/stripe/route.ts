import { NextRequest, NextResponse } from "next/server";
import { handleStripeWebhook } from "@/lib/licensing/stripe";

/**
 * Stripe webhook endpoint — wired but inactive.
 * Set STRIPE_WEBHOOK_SECRET in env to activate.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Stripe webhooks not configured" },
      { status: 503 }
    );
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // TODO: Validate signature with Stripe SDK when activated
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  // const event = stripe.webhooks.constructEvent(body, signature, secret);

  try {
    const event = JSON.parse(body);
    await handleStripeWebhook(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
