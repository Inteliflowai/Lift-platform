import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CandidateListClient } from "./candidate-list-client";

export default async function CandidatesPage() {
  const { tenantId } = await getTenantContext();

  const { data: candidates } = await supabaseAdmin
    .from("candidates")
    .select(
      "*, sessions(status, completion_pct, last_activity_at), invites(id, token, status, expires_at)"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  return <CandidateListClient candidates={candidates ?? []} />;
}
