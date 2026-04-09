"use client";

import { useEffect } from "react";

export interface TenantBranding {
  primaryColor: string | null;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  hideLiftBranding: boolean;
  poweredByVisible: boolean;
  schoolName: string;
}

export function TenantThemeProvider({
  branding,
  children,
}: {
  branding: TenantBranding;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (branding.primaryColor && branding.primaryColor !== "#6366f1") {
      document.documentElement.style.setProperty(
        "--lift-primary",
        branding.primaryColor
      );
      // Generate a darker hover shade
      document.documentElement.style.setProperty(
        "--lift-primary-hover",
        darken(branding.primaryColor, 15)
      );
    }

    return () => {
      document.documentElement.style.removeProperty("--lift-primary");
      document.documentElement.style.removeProperty("--lift-primary-hover");
    };
  }, [branding.primaryColor]);

  return <>{children}</>;
}

function darken(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - Math.round(255 * (percent / 100)));
  const g = Math.max(
    0,
    ((num >> 8) & 0x00ff) - Math.round(255 * (percent / 100))
  );
  const b = Math.max(0, (num & 0x0000ff) - Math.round(255 * (percent / 100)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
