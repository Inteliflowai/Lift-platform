import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CandidateListClient } from "./candidate-list-client";

export default async function CandidatesPage() {
  const { tenantId } = await getTenantContext();

  const { data: candidates } = await supabaseAdmin
    .from("candidates")
    .select(
      "*, sessions(status, completion_pct, last_activity_at, created_at), invites(id, token, status, expires_at, sent_at)"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  const hasVisibleDemo = (candidates ?? []).some(
    (c) => c.is_demo && !c.hidden_from_default_view
  );

  return (
    <>
      {hasVisibleDemo && (
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium text-primary">
            Sample candidates included
          </p>
          <p className="mt-1 text-xs text-muted">
            We&apos;ve added a few sample candidates so you can explore the
            platform. They&apos;re marked with a <strong>Sample</strong> pill
            and will be hidden automatically once you send your first real
            invitation. Use <strong>Import Excel</strong> or{" "}
            <strong>Invite Candidate</strong> when you&apos;re ready.
          </p>
        </div>
      )}
      <CandidateListClient candidates={candidates ?? []} />
    </>
  );
}
