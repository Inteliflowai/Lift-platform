import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Soft-archive seeded demo candidates once the tenant invites their first
 * real applicant. Flips `hidden_from_default_view = true` on every still-
 * visible `is_demo` row in the tenant. Idempotent — once demos are hidden,
 * the WHERE clause matches no rows, so resends and bulk imports are no-ops.
 *
 * Never deletes. The "Show sample candidates" toggle on /school/candidates
 * surfaces them again on demand.
 *
 * Callers (must guard against running for is_demo candidates themselves):
 *   - lib/invitations/trigger.ts (resends, bulk-send, SIS-inbound)
 *   - app/api/school/candidates/invite/route.ts (UI-created candidate)
 */
export async function softArchiveDemoCandidates(
  tenantId: string
): Promise<void> {
  await supabaseAdmin
    .from("candidates")
    .update({ hidden_from_default_view: true })
    .eq("tenant_id", tenantId)
    .eq("is_demo", true)
    .eq("hidden_from_default_view", false);
}
