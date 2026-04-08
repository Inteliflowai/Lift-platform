import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { TIER_LIMITS } from "@/lib/licensing/features";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const record = body.record ?? body;
  const tenantId: string = record.tenant_id;
  const year = record.period_year ?? new Date().getFullYear();

  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 });
  }

  // Get total sessions used this year
  const { data: usageRows } = await supabaseAdmin
    .from("license_usage")
    .select("sessions_completed")
    .eq("tenant_id", tenantId)
    .eq("period_year", year);

  const totalUsed = (usageRows ?? []).reduce(
    (sum, r) => sum + (r.sessions_completed ?? 0),
    0
  );

  // Get session limit
  const { data: lic } = await supabaseAdmin
    .from("tenant_licenses")
    .select("tier, session_limit_override")
    .eq("tenant_id", tenantId)
    .single();

  if (!lic) return NextResponse.json({ ok: true, skipped: "no_license" });

  const tierLimits = TIER_LIMITS[lic.tier as keyof typeof TIER_LIMITS];
  const limit = lic.session_limit_override ?? tierLimits?.sessions_per_year;

  if (!limit) return NextResponse.json({ ok: true, unlimited: true });

  // Check 80% threshold
  if (totalUsed >= limit * 0.8 && totalUsed < limit) {
    // Check if we already fired this event this year
    const { data: existing } = await supabaseAdmin
      .from("license_events")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("event_type", "session_limit_80pct")
      .gte("occurred_at", `${year}-01-01`)
      .limit(1);

    if (!existing || existing.length === 0) {
      await supabaseAdmin.from("license_events").insert({
        tenant_id: tenantId,
        event_type: "session_limit_80pct",
        payload: { sessions_used: totalUsed, limit },
      });
    }
  }

  // Check 100% threshold
  if (totalUsed >= limit) {
    const { data: existing } = await supabaseAdmin
      .from("license_events")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("event_type", "session_limit_reached")
      .gte("occurred_at", `${year}-01-01`)
      .limit(1);

    if (!existing || existing.length === 0) {
      await supabaseAdmin.from("license_events").insert({
        tenant_id: tenantId,
        event_type: "session_limit_reached",
        payload: { sessions_used: totalUsed, limit },
      });
    }
  }

  return NextResponse.json({ ok: true, used: totalUsed, limit });
}
