import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireFeature } from "@/lib/licensing/gate";
import { handleLicenseError } from "@/lib/licensing/apiHandler";
import { FEATURES } from "@/lib/licensing/features";
import { writeAuditLog } from "@/lib/audit";
import dns from "dns";

export async function POST(req: NextRequest) {
  try {
    const { user, tenantId } = await getTenantContext();

    try {
      await requireFeature(tenantId, FEATURES.WHITE_LABEL);
    } catch (err) {
      const r = handleLicenseError(err);
      if (r) return r;
      throw err;
    }

    const { domain } = await req.json();
    if (!domain || typeof domain !== "string") {
      return NextResponse.json({ error: "Domain required" }, { status: 400 });
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}(\.[a-zA-Z]{2,})?$/;
    const cleaned = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!domainRegex.test(cleaned)) {
      return NextResponse.json(
        { error: "Invalid domain format. Example: lift.yourschool.com" },
        { status: 400 }
      );
    }

    // DNS CNAME lookup
    let verified = false;
    try {
      const cnames = await dns.promises.resolveCname(cleaned);
      // Check if any CNAME points to a Vercel domain
      verified = cnames.some(
        (c) =>
          c.includes("vercel") ||
          c.includes("inteliflowai") ||
          c.includes("lift")
      );
    } catch {
      // CNAME not found
    }

    // Update tenant settings
    await supabaseAdmin
      .from("tenant_settings")
      .update({
        wl_custom_domain: cleaned,
        wl_custom_domain_verified: verified,
      })
      .eq("tenant_id", tenantId);

    if (verified) {
      await writeAuditLog(supabaseAdmin, {
        tenant_id: tenantId,
        actor_id: user.id,
        action: "custom_domain_verified",
        payload: { domain: cleaned },
      });
    }

    return NextResponse.json({
      verified,
      domain: cleaned,
      message: verified
        ? "Domain verified successfully!"
        : "CNAME record not found. DNS changes can take up to 48 hours.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed" },
      { status: 500 }
    );
  }
}
