import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { TIER_PRICING, TIER_LIMITS } from "@/lib/licensing/features";
import { sendWeeklyDigestEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const year = now.getFullYear();

  // Events this week
  const { data: weekEvents } = await supabaseAdmin
    .from("license_events")
    .select("event_type, tenant_id")
    .gte("occurred_at", weekAgo.toISOString());

  const newTrials = (weekEvents ?? []).filter((e) => e.event_type === "trial_started").length;
  const conversions = (weekEvents ?? []).filter((e) => e.event_type === "tier_changed").length;
  const expired = (weekEvents ?? []).filter((e) => e.event_type === "trial_expired").length;

  // Active schools + ARR
  const { data: activeLicenses } = await supabaseAdmin
    .from("tenant_licenses")
    .select("tier")
    .eq("status", "active");

  const activeSchools = activeLicenses?.length ?? 0;
  let totalARR = 0;
  for (const lic of activeLicenses ?? []) {
    const pricing = TIER_PRICING[lic.tier as keyof typeof TIER_PRICING];
    totalARR += pricing?.annual ?? 0;
  }

  // Pending upgrade requests
  const { count: pendingRequests } = await supabaseAdmin
    .from("upgrade_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  // Past due
  const { count: pastDue } = await supabaseAdmin
    .from("tenant_licenses")
    .select("*", { count: "exact", head: true })
    .eq("status", "past_due");

  // Session limit >80%
  const { data: allLicenses } = await supabaseAdmin
    .from("tenant_licenses")
    .select("tenant_id, tier, session_limit_override")
    .in("status", ["active", "trialing"]);

  const { data: usageData } = await supabaseAdmin
    .from("license_usage")
    .select("tenant_id, sessions_completed")
    .eq("period_year", year);

  const usageByTenant: Record<string, number> = {};
  for (const u of usageData ?? []) {
    usageByTenant[u.tenant_id] = (usageByTenant[u.tenant_id] ?? 0) + (u.sessions_completed ?? 0);
  }

  let sessionLimitSchools = 0;
  for (const lic of allLicenses ?? []) {
    const used = usageByTenant[lic.tenant_id] ?? 0;
    const tierLimits = TIER_LIMITS[lic.tier as keyof typeof TIER_LIMITS];
    const limit = lic.session_limit_override ?? tierLimits?.sessions_per_year;
    if (limit && used >= limit * 0.8) sessionLimitSchools++;
  }

  // Data deletion this week
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const { data: deletionLicenses } = await supabaseAdmin
    .from("tenant_licenses")
    .select("tenant_id, tenants(name)")
    .lte("data_deletion_scheduled_at", weekFromNow.toISOString())
    .gte("data_deletion_scheduled_at", now.toISOString());

  const deletionSchools = (deletionLicenses ?? []).map((l) => {
    const t = l.tenants as unknown as { name: string } | null;
    return t?.name ?? "Unknown";
  });

  const weekDate = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  await sendWeeklyDigestEmail({
    newTrials,
    conversions,
    expired,
    activeSchools,
    totalARR,
    pendingRequests: pendingRequests ?? 0,
    sessionLimitSchools,
    pastDue: pastDue ?? 0,
    deletionSchools,
    weekDate,
  });

  return NextResponse.json({ ok: true, sent: true });
}
