import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getDemoTenantId, ensureDemoCandidates } from "@/lib/demo/seedDemoSchool";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const userAgent = req.headers.get("user-agent") ?? "";
    const body = await req.json().catch(() => ({}));

    // Rate limit: 20 demos per IP per hour
    const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("demo_sessions")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ip)
      .gte("created_at", windowStart);

    if ((count ?? 0) >= 20) {
      return NextResponse.json({ error: "Too many demo requests. Please try again later." }, { status: 429 });
    }

    const tenantId = await getDemoTenantId();
    console.log("[demo] Found tenant:", tenantId);
    await ensureDemoCandidates(tenantId);
    console.log("[demo] Candidates ensured");

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const { data: session, error } = await supabaseAdmin
      .from("demo_sessions")
      .insert({
        tenant_id: tenantId,
        ip_address: ip,
        user_agent: userAgent,
        expires_at: expiresAt,
        utm_source: body.utm_source || null,
        utm_medium: body.utm_medium || null,
        utm_campaign: body.utm_campaign || null,
      })
      .select("token")
      .single();

    if (error || !session) {
      console.error("[demo] create failed:", error);
      return NextResponse.json({ error: "Could not start demo." }, { status: 500 });
    }

    return NextResponse.json({ token: session.token, expiresAt, redirectUrl: `/demo/${session.token}` });
  } catch (err) {
    console.error("[demo] start error:", err);
    return NextResponse.json({ error: "Could not start demo." }, { status: 500 });
  }
}
