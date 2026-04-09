import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CandidateListClient } from "./candidate-list-client";

export default async function CandidatesPage() {
  const { tenantId } = await getTenantContext();

  const { data: candidates } = await supabaseAdmin
    .from("candidates")
    .select(
      "*, sessions(status, completion_pct, last_activity_at, created_at), invites(id, token, status, expires_at)"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  const hasDemo = (candidates ?? []).some((c) =>
    c.last_name?.includes("(Demo)")
  );

  return (
    <>
      {hasDemo && (
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium text-primary">
            Sample candidates included
          </p>
          <p className="mt-1 text-xs text-muted">
            We&apos;ve added 3 demo candidates so you can explore the platform.
            To get started with real candidates, use{" "}
            <strong>Import Excel</strong> to upload a spreadsheet or{" "}
            <strong>Invite Candidate</strong> to send individual invitations.
            Demo candidates can be deleted at any time.
          </p>
        </div>
      )}
      <CandidateListClient candidates={candidates ?? []} />
    </>
  );
}
