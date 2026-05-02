// Allow-list of public marketing paths where analytics trackers are permitted
// to fire. Every other path — including all authenticated dashboard surfaces,
// candidate assessment routes, auth/password flows, and error pages — is off.
//
// Rationale: LIFT's authenticated URLs include candidate UUIDs and, on some
// routes, minor PII. A deny-list fails open when a new route is added without
// remembering to exclude it. This allow-list fails closed.
//
// This predicate is the single source of truth for analytics path control.
// We deliberately did not use route-group-based isolation (e.g. mounting
// GA4/LinkedIn scripts inside an `app/(public)/layout.tsx`) because LIFT's
// `(public)` group mixes marketing pages with credential flows
// (/forgot-password, /reset-password, /confirm) that must not fire analytics.
// To add belt-and-suspenders later, create a dedicated `(marketing)` route
// group and mount GA4/LinkedIn in its layout — this predicate would remain
// authoritative.

const MARKETING_PATHS_EXACT = new Set<string>([
  "/lift",
  "/admissions",
  "/pricing",
  "/register",
  "/buy",
  "/buy/success",
  "/demo/new",
  "/demo/expired",
]);

const MARKETING_PREFIXES: readonly string[] = ["/legal/"];

export function isPublicMarketingPath(
  pathname: string | null | undefined,
): boolean {
  if (!pathname) return false;
  if (MARKETING_PATHS_EXACT.has(pathname)) return true;
  return MARKETING_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
