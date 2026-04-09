import Stripe from "stripe";

function createStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, {
    // @ts-expect-error — API version string, Stripe types may lag
    apiVersion: "2024-06-20",
    typescript: true,
  });
}

// Lazy singleton — only created when first accessed
let _stripe: Stripe | null = null;
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    if (!_stripe) _stripe = createStripeClient();
    return (_stripe as unknown as Record<string | symbol, unknown>)[prop];
  },
});
