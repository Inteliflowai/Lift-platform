import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { LicenseProvider } from "@/lib/licensing/context";
import { ToastProvider } from "@/components/ui/Toast";
import { getLicense, isLicenseActive, getTrialDaysRemaining } from "@/lib/licensing/resolver";
import { checkSessionLimit } from "@/lib/licensing/gate";
import { TrialBanner } from "@/components/licensing/TrialBanner";
import { TenantThemeProvider, type TenantBranding } from "@/lib/theming/TenantTheme";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: roles } = await supabase
    .from("user_tenant_roles")
    .select("role, tenant_id")
    .eq("user_id", user.id);

  const roleOrder = [
    "platform_admin",
    "school_admin",
    "evaluator",
    "interviewer",
    "support",
  ];
  const userRoles = roles?.map((r) => r.role) ?? [];
  const primaryRole =
    roleOrder.find((r) => userRoles.includes(r)) ?? "school_admin";

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  // Check if tenant is in demo mode + fetch branding
  const tenantId = roles?.[0]?.tenant_id;
  let isDemo = false;
  let branding: TenantBranding = {
    primaryColor: null,
    logoUrl: null,
    logoDarkUrl: null,
    faviconUrl: null,
    hideLiftBranding: false,
    poweredByVisible: true,
    schoolName: "",
  };

  if (tenantId) {
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("is_demo, name")
      .eq("id", tenantId)
      .single();
    isDemo = tenant?.is_demo ?? false;
    branding.schoolName = tenant?.name ?? "";

    const { data: wl } = await supabaseAdmin
      .from("tenant_settings")
      .select("wl_primary_color, logo_url, wl_logo_dark_url, wl_favicon_url, wl_hide_lift_branding, wl_powered_by_visible")
      .eq("tenant_id", tenantId)
      .single();

    if (wl) {
      branding = {
        primaryColor: wl.wl_primary_color !== "#6366f1" ? wl.wl_primary_color : null,
        logoUrl: wl.logo_url ?? null,
        logoDarkUrl: wl.wl_logo_dark_url ?? null,
        faviconUrl: wl.wl_favicon_url ?? null,
        hideLiftBranding: wl.wl_hide_lift_branding ?? false,
        poweredByVisible: wl.wl_powered_by_visible ?? true,
        schoolName: tenant?.name ?? "",
      };
    }
  }

  // Fetch license data for client-side context
  let licenseData = {
    tier: "trial",
    status: "trialing",
    trialDaysRemaining: 30 as number | null,
    isActive: true,
    featureOverrides: [] as string[],
    featureBlocks: [] as string[],
    sessionsUsed: 0,
    sessionsLimit: 25 as number | null,
  };

  if (tenantId) {
    try {
      const license = await getLicense(tenantId);
      const sessionInfo = await checkSessionLimit(tenantId);
      licenseData = {
        tier: license.tier,
        status: license.status,
        trialDaysRemaining: getTrialDaysRemaining(license),
        isActive: isLicenseActive(license),
        featureOverrides: license.feature_overrides,
        featureBlocks: license.feature_blocks,
        sessionsUsed: sessionInfo.used,
        sessionsLimit: sessionInfo.limit,
      };
    } catch {
      // License not found — use defaults (trial)
    }

    // Track trial login event (non-blocking, first-occurrence-only via unique index)
    if (licenseData.status === "trialing") {
      import("@/lib/trial/trackEvent").then(({ trackTrialEvent }) =>
        trackTrialEvent(tenantId, "day1_login", user.id).catch(() => {})
      );
    }
  }

  return (
    <LicenseProvider license={licenseData}>
      <ToastProvider>
      <TenantThemeProvider branding={branding}>
      <TrialBanner />
      <div className="min-h-screen bg-white text-[#1a1a2e]">
        <Sidebar role={primaryRole} allRoles={userRoles} userName={profile?.full_name} branding={branding} />
        <div className="md:ml-60 flex min-h-screen flex-col">
          {user.user_metadata?.must_change_password && (
            <div className="flex h-10 items-center justify-center gap-2 bg-[#f59e0b] text-[13px] font-medium text-[#78350f]">
              You&apos;re using a temporary password.
              <a href="/settings/account" className="underline hover:no-underline">Change it now →</a>
            </div>
          )}
          {isDemo && (
            <div className="flex h-10 items-center justify-center bg-[#f59e0b] text-[13px] font-medium text-[#78350f]">
              Demo Mode — All candidates and data on this account are synthetic. No real student information is present.
            </div>
          )}
          <TopBar
            email={user.email!}
            fullName={profile?.full_name}
            avatarUrl={profile?.avatar_url}
          />
          <main className="flex-1 bg-[#f8f8fa] p-6">{children}</main>
        </div>
      </div>
      </TenantThemeProvider>
      </ToastProvider>
    </LicenseProvider>
  );
}
