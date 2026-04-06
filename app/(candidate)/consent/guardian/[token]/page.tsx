import { resolveInviteToken } from "@/lib/token";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { GuardianConsentClient } from "./guardian-consent-client";

export const dynamic = "force-dynamic";

export default async function GuardianConsentPage({
  params,
}: {
  params: { token: string };
}) {
  const result = await resolveInviteToken(params.token);

  if (!result.valid) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold text-review">Invalid link</h1>
        <p className="mt-2 text-muted">Please contact the school.</p>
      </div>
    );
  }

  const { candidate, tenant } = result;

  // Check if already consented
  const { count } = await supabaseAdmin
    .from("consent_events")
    .select("*", { count: "exact", head: true })
    .eq("candidate_id", candidate.id)
    .eq("consent_type", "guardian_on_behalf");

  if ((count ?? 0) > 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold text-success">
          Consent Already Provided
        </h1>
        <p className="mt-2 text-muted">
          Thank you! {candidate.first_name} can now begin their LIFT session.
        </p>
      </div>
    );
  }

  const guardian = candidate.guardians?.[0] ?? null;

  return (
    <GuardianConsentClient
      token={params.token}
      candidateId={candidate.id}
      candidateFirstName={candidate.first_name}
      schoolName={tenant.name}
      guardianName={guardian?.full_name ?? "Guardian"}
      guardianId={guardian?.id}
    />
  );
}
