import { SupabaseClient } from "@supabase/supabase-js";

export async function writeAuditLog(
  supabase: SupabaseClient,
  params: {
    tenant_id?: string | null;
    actor_id?: string | null;
    candidate_id?: string | null;
    session_id?: string | null;
    action: string;
    payload?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from("audit_logs").insert({
    tenant_id: params.tenant_id ?? null,
    actor_id: params.actor_id ?? null,
    candidate_id: params.candidate_id ?? null,
    session_id: params.session_id ?? null,
    action: params.action,
    payload: params.payload ?? {},
  });
  if (error) console.error("audit_log write failed:", error.message);
}
