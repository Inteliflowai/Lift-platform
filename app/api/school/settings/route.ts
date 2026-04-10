export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const { tenantId } = await getTenantContext();

  const { data, error } = await supabaseAdmin
    .from("tenant_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const { tenantId, user } = await getTenantContext();
  const body = await req.json();

  const allowed = [
    "default_language",
    "coppa_mode",
    "session_pause_allowed",
    "session_pause_limit_hours",
    "data_retention_days",
    "require_human_review_always",
    "voice_mode_enabled",
    "passage_reader_enabled",
    "welcome_completed",
    "logo_url",
    "wl_primary_color",
    "wl_logo_dark_url",
    "wl_favicon_url",
    "wl_hide_lift_branding",
    "wl_email_from_name",
    "wl_email_reply_to",
    "wl_powered_by_visible",
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  // Map data retention dropdown values
  if (updates.data_retention_days) {
    const valid = [365, 1095, 2555];
    if (!valid.includes(updates.data_retention_days as number)) {
      return NextResponse.json({ error: "Invalid retention value" }, { status: 400 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from("tenant_settings")
    .update(updates)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    action: "settings_updated",
    payload: updates,
  });

  return NextResponse.json(data);
}
