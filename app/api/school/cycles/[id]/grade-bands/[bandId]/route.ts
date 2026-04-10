export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; bandId: string } }
) {
  const { tenantId, user } = await getTenantContext();
  const body = await req.json();
  const { config } = body;

  if (!config) {
    return NextResponse.json({ error: "Config is required" }, { status: 400 });
  }

  const { data: band, error } = await supabaseAdmin
    .from("grade_band_templates")
    .update({ config })
    .eq("id", params.bandId)
    .eq("cycle_id", params.id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    action: "grade_band_config_updated",
    payload: { cycle_id: params.id, band_id: params.bandId, config },
  });

  return NextResponse.json(band);
}
