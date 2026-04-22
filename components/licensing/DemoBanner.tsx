"use client";

import { usePathname } from "next/navigation";

// Tenant-scoped "Demo Mode" banner. Suppressed on /admin/* routes because
// platform admins navigating cross-tenant aren't operating inside a single
// tenant context — the banner would misleadingly imply the platform itself
// is in demo mode rather than one of the tenants the admin happens to be
// assigned to.
export function DemoBanner() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return (
    <div className="flex h-10 items-center justify-center bg-[#f59e0b] text-[13px] font-medium text-[#78350f]">
      Demo Mode — All candidates and data on this account are synthetic. No real student information is present.
    </div>
  );
}
