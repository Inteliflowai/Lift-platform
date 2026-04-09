export function getStripePrices(): Record<string, string> {
  return {
    essentials: process.env.STRIPE_PRICE_ID_ESSENTIALS ?? "",
    professional: process.env.STRIPE_PRICE_ID_PROFESSIONAL ?? "",
    enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE ?? "",
  };
}

export const TIER_ANNUAL_AMOUNTS: Record<string, number> = {
  essentials: 4800,
  professional: 9600,
  enterprise: 18000,
};
