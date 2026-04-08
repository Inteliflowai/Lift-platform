import { resolveInviteToken } from "@/lib/token";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { SessionClient } from "./session-client";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
}: {
  params: { token: string };
}) {
  const result = await resolveInviteToken(params.token);

  if (!result.valid) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold text-review">Invalid session link</h1>
        <p className="mt-2 text-muted">Please contact your school.</p>
      </div>
    );
  }

  const { candidate, invite } = result;

  // Re-fetch candidate status directly to avoid stale join data
  const { data: freshCandidate } = await supabaseAdmin
    .from("candidates")
    .select("status")
    .eq("id", candidate.id)
    .single();

  const candidateStatus = freshCandidate?.status ?? candidate.status;

  // Must have consented
  if (candidateStatus === "invited" || candidateStatus === "consent_pending") {
    redirect(`/consent/${params.token}`);
  }

  // Get existing session
  const { data: existingSession } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("candidate_id", candidate.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingSession?.status === "completed") {
    redirect(`/session/done/${params.token}`);
  }

  // Get tenant settings for pause and voice config
  const { data: settings } = await supabaseAdmin
    .from("tenant_settings")
    .select("session_pause_allowed, session_pause_limit_hours, voice_mode_enabled, passage_reader_enabled")
    .eq("tenant_id", candidate.tenant_id)
    .single();

  return (
    <SessionClient
      token={params.token}
      candidateEmail={invite.sent_to_email}
      gradeBand={candidate.grade_band as "6-7" | "8" | "9-11"}
      tenantId={candidate.tenant_id}
      pauseAllowed={settings?.session_pause_allowed ?? true}
      voiceEnabled={settings?.voice_mode_enabled ?? true}
      passageReaderEnabled={settings?.passage_reader_enabled ?? true}
      existingSession={existingSession}
    />
  );
}
