import { resolveInviteToken } from "@/lib/token";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ConsentClient } from "./consent-client";

export const dynamic = "force-dynamic";

export default async function ConsentPage({
  params,
}: {
  params: { token: string };
}) {
  const result = await resolveInviteToken(params.token);

  if (!result.valid) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold text-review">Invalid link</h1>
        <p className="mt-2 text-muted">Please contact your school.</p>
      </div>
    );
  }

  const { candidate, tenant } = result;

  // Check if already consented
  if (candidate.status === "active" || candidate.status === "completed") {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">You&apos;re all set!</h1>
        <p className="mt-2 text-muted">Consent already completed.</p>
        <a
          href={`/session/${params.token}`}
          className="mt-4 inline-block rounded-lg bg-primary px-6 py-2 text-white hover:opacity-90"
        >
          Continue to Session
        </a>
      </div>
    );
  }

  // Check COPPA
  const { data: settings } = await supabaseAdmin
    .from("tenant_settings")
    .select("coppa_mode")
    .eq("tenant_id", candidate.tenant_id)
    .single();

  const coppaMode = settings?.coppa_mode ?? false;
  let needsGuardian = false;

  if (coppaMode && candidate.date_of_birth) {
    const age = Math.floor(
      (Date.now() - new Date(candidate.date_of_birth).getTime()) /
        (365.25 * 24 * 60 * 60 * 1000)
    );
    needsGuardian = age < 13;
  }

  const guardian = candidate.guardians?.[0] ?? null;

  // Check if guardian consent already requested
  let guardianConsentSent = false;
  if (needsGuardian) {
    const { count } = await supabaseAdmin
      .from("consent_events")
      .select("*", { count: "exact", head: true })
      .eq("candidate_id", candidate.id)
      .eq("consent_type", "guardian_request_sent");

    guardianConsentSent = (count ?? 0) > 0;
  }

  return (
    <ConsentClient
      token={params.token}
      candidateId={candidate.id}
      schoolName={tenant.name}
      needsGuardian={needsGuardian}
      guardian={guardian}
      guardianConsentSent={guardianConsentSent}
    />
  );
}
