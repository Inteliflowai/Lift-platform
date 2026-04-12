export function getStripePrices(): Record<string, string> {
  return {
    professional: process.env.STRIPE_PRICE_ID_PROFESSIONAL ?? "",
    enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE ?? "",
  };
}

export const TIER_ANNUAL_AMOUNTS: Record<string, number> = {
  professional: 12000,
  enterprise: 18000,
};
