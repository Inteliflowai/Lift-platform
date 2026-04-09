export type Locale = "en" | "pt";

export function getLocale(): Locale {
  return (process.env.LIFT_LOCALE as Locale) || "en";
}

export function getBrand() {
  const locale = getLocale();
  const isPortuguese = locale === "pt";

  return {
    locale,
    name: process.env.LIFT_BRAND_NAME || (isPortuguese ? "EduInsights" : "LIFT"),
    tagline: process.env.LIFT_BRAND_TAGLINE || (isPortuguese ? "Insights Educacionais para Transições" : "Learning Insight for Transitions"),
    hidePricing: process.env.LIFT_HIDE_PRICING === "true",
    poweredBy: isPortuguese ? "Powered by Inteliflow" : "Powered by Inteliflow",
    logoText: process.env.LIFT_BRAND_NAME || (isPortuguese ? "EduInsights" : "LIFT"),
  };
}
