import { NextResponse } from "next/server";
import { LicenseError, LicenseExpiredError } from "./gate";

export function handleLicenseError(error: unknown): NextResponse | null {
  if (error instanceof LicenseExpiredError) {
    return NextResponse.json(
      {
        error: "license_expired",
        message:
          "Your LIFT license has expired. Please contact your administrator.",
      },
      { status: 402 }
    );
  }
  if (error instanceof LicenseError) {
    return NextResponse.json(
      {
        error: "feature_not_available",
        feature: error.feature,
        required_tier: error.requiredTier,
        message: `This feature requires the ${error.requiredTier} plan.`,
      },
      { status: 403 }
    );
  }
  return null;
}
