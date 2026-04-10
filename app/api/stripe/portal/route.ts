export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";

export async function POST() {
  const { tenantId } = await getTenantContext();

  const { data: license } = await supabaseAdmin
    .from("tenant_licenses")
    .select("stripe_customer_id")
    .eq("tenant_id", tenantId)
    .single();

  if (!license?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account found" },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: license.stripe_customer_id,
    return_url: `${appUrl}/school/settings/subscription`,
  });

  return NextResponse.json({ portal_url: session.url });
}
