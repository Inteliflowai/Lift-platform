export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const { user, tenantId } = await getTenantContext();

  const body = await req.json();
  const { export_type, cycle_id } = body;

  if (!["full", "candidates_only", "cycle"].includes(export_type ?? "full")) {
    return NextResponse.json({ error: "Invalid export_type" }, { status: 400 });
  }

  // Create request
  const { data: request, error } = await supabaseAdmin
    .from("data_export_requests")
    .insert({
      tenant_id: tenantId,
      requested_by: user.id,
      export_type: export_type ?? "full",
      cycle_id: cycle_id ?? null,
    })
    .select()
    .single();

  if (error || !request) {
    return NextResponse.json({ error: "Failed to create export request" }, { status: 500 });
  }

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    action: "data_export_requested",
    payload: { request_id: request.id, export_type },
  });

  // Trigger background processing (fire and forget)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  fetch(`${baseUrl}/api/exports/data/process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": process.env.INTERNAL_API_SECRET!,
    },
    body: JSON.stringify({ request_id: request.id }),
  }).catch((err) => console.error("Export process trigger failed:", err));

  return NextResponse.json({
    request_id: request.id,
    status: "queued",
    message: "Export is being prepared. You will receive an email when it is ready.",
  });
}

// GET: list export requests for this tenant
export async function GET() {
  const { tenantId } = await getTenantContext();

  const { data } = await supabaseAdmin
    .from("data_export_requests")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json(data ?? []);
}
