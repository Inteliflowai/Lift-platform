import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SupportDashboardClient } from "./support-client";

export const dynamic = "force-dynamic";

export default async function SupportDashboardPage() {
  const { tenantId } = await getTenantContext();

  // Fetch admitted candidates for this tenant
  const { data: candidates } = await supabaseAdmin
    .from("candidates")
    .select("id, first_name, last_name, grade_applying, status, gender")
    .eq("tenant_id", tenantId)
    .in("status", ["admitted", "offered"])
    .order("last_name");

  // Fetch support plans for these candidates
  const candidateIds = (candidates ?? []).map((c) => c.id);
  const { data: plans } = candidateIds.length > 0
    ? await supabaseAdmin
        .from("support_plans")
        .select("id, candidate_id, support_level, status, checklist_items, generated_at")
        .in("candidate_id", candidateIds)
        .order("generated_at", { ascending: false })
    : { data: [] };

  return (
    <SupportDashboardClient
      candidates={candidates ?? []}
      plans={plans ?? []}
    />
  );
}
