export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const { tenantId } = await getTenantContext();
  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search") ?? "";
  const gradeBand = searchParams.get("grade_band");
  const status = searchParams.get("status");
  const flaggedOnly = searchParams.get("flagged") === "true";

  let query = supabaseAdmin
    .from("candidates")
    .select("*, sessions(status, completion_pct, last_activity_at), invites(token, status, expires_at)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
  }
  if (gradeBand) {
    query = query.eq("grade_band", gradeBand);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (flaggedOnly) {
    query = query.eq("status", "flagged");
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
