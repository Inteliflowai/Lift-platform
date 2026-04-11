export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { encryptConfig } from "@/lib/crypto/encrypt";
import { createAdapter } from "@/lib/integrations/factory";
import type { ProviderType } from "@/lib/integrations/base";

export async function GET() {
  const { tenantId } = await getTenantContext();

  const { data: integrations } = await supabaseAdmin
    .from("sis_integrations")
    .select("id, provider, status, last_sync_at, last_sync_status, last_sync_error, created_at")
    .eq("tenant_id", tenantId);

  // Load recent sync logs
  const { data: logs } = await supabaseAdmin
    .from("sis_sync_log")
    .select("id, provider, candidate_id, direction, status, error_message, synced_at")
    .eq("tenant_id", tenantId)
    .order("synced_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ integrations: integrations ?? [], logs: logs ?? [] });
}

export async function POST(req: NextRequest) {
  const { tenantId } = await getTenantContext();
  const body = await req.json();
  const { provider, config } = body;

  if (!provider || !config) {
    return NextResponse.json({ error: "provider and config required" }, { status: 400 });
  }

  // Encrypt config before storage
  let encryptedConfig: string;
  try {
    encryptedConfig = encryptConfig(config);
  } catch {
    return NextResponse.json({ error: "Encryption failed — check ENCRYPTION_KEY env var" }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("sis_integrations")
    .upsert(
      {
        tenant_id: tenantId,
        provider,
        config: encryptedConfig,
        status: "inactive",
      },
      { onConflict: "tenant_id,provider" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, provider: data.provider, status: data.status });
}

export async function PATCH(req: NextRequest) {
  const { tenantId } = await getTenantContext();
  const body = await req.json();
  const { id, action } = body;

  if (!id || !action) {
    return NextResponse.json({ error: "id and action required" }, { status: 400 });
  }

  if (action === "test") {
    // Test connection
    const { data: integration } = await supabaseAdmin
      .from("sis_integrations")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    try {
      const adapter = createAdapter(integration.provider as ProviderType, integration.config as string);
      const result = await adapter.testConnection();

      if (result.success) {
        await supabaseAdmin
          .from("sis_integrations")
          .update({ status: "active" })
          .eq("id", id);
        return NextResponse.json({ success: true });
      } else {
        await supabaseAdmin
          .from("sis_integrations")
          .update({ status: "error", last_sync_error: result.error })
          .eq("id", id);
        return NextResponse.json({ success: false, error: result.error });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ success: false, error: errMsg });
    }
  }

  if (action === "activate") {
    await supabaseAdmin.from("sis_integrations").update({ status: "active" }).eq("id", id);
    return NextResponse.json({ success: true });
  }

  if (action === "deactivate") {
    await supabaseAdmin.from("sis_integrations").update({ status: "inactive" }).eq("id", id);
    return NextResponse.json({ success: true });
  }

  if (action === "disconnect") {
    await supabaseAdmin.from("sis_integrations").delete().eq("id", id).eq("tenant_id", tenantId);
    return NextResponse.json({ success: true });
  }

  if (action === "retry_failed") {
    // Re-trigger sync for all failed candidates in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: failedLogs } = await supabaseAdmin
      .from("sis_sync_log")
      .select("candidate_id")
      .eq("tenant_id", tenantId)
      .eq("status", "failed")
      .gte("synced_at", sevenDaysAgo);

    const candidateIds = Array.from(new Set((failedLogs ?? []).map((l) => l.candidate_id)));
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    for (const cid of candidateIds) {
      fetch(`${baseUrl}/api/integrations/sis-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": process.env.INTERNAL_API_SECRET!,
        },
        body: JSON.stringify({ candidate_id: cid }),
      }).catch(() => {});
    }

    return NextResponse.json({ retrying: candidateIds.length });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
