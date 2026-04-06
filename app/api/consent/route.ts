import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { candidate_id, consent_type, consented_by } = body;

  if (!candidate_id || !consent_type || !consented_by) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Get candidate's tenant
  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("tenant_id")
    .eq("id", candidate_id)
    .single();

  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  // Insert consent event
  await supabaseAdmin.from("consent_events").insert({
    candidate_id,
    tenant_id: candidate.tenant_id,
    consented_by,
    consent_type,
    ip_address: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "",
    user_agent: req.headers.get("user-agent") ?? "",
  });

  // Update candidate status to active
  await supabaseAdmin
    .from("candidates")
    .update({ status: "active" })
    .eq("id", candidate_id);

  // Update invite status to accepted
  await supabaseAdmin
    .from("invites")
    .update({ status: "accepted" })
    .eq("candidate_id", candidate_id)
    .eq("status", "opened");

  return NextResponse.json({ ok: true });
}
