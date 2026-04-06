import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { CandidateDetailClient } from "./candidate-detail-client";

export const dynamic = "force-dynamic";

export default async function EvaluatorCandidateDetail({
  params,
}: {
  params: { id: string };
}) {
  const { tenantId } = await getTenantContext();

  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("*")
    .eq("id", params.id)
    .eq("tenant_id", tenantId)
    .single();
  if (!candidate) notFound();

  // Profile
  const { data: profile } = await supabaseAdmin
    .from("insight_profiles")
    .select("*")
    .eq("candidate_id", params.id)
    .eq("tenant_id", tenantId)
    .eq("is_final", true)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  // Sessions
  const { data: sessions } = await supabaseAdmin
    .from("sessions")
    .select("id, status, completion_pct, completed_at, started_at")
    .eq("candidate_id", params.id)
    .order("created_at", { ascending: false });

  const sessionId = sessions?.[0]?.id;

  // Responses
  let responses: unknown[] = [];
  if (sessionId) {
    const { data } = await supabaseAdmin
      .from("task_instances")
      .select("id, sequence_order, status, task_templates(title, task_type), response_text(response_body, word_count, submitted_at), response_features(revision_depth)")
      .eq("session_id", sessionId)
      .order("sequence_order");
    responses = data ?? [];
  }

  // Signals
  let timingSignals: unknown[] = [];
  let helpEvents: unknown[] = [];
  let interactionSignals: unknown[] = [];
  let sessionEvents: unknown[] = [];
  if (sessionId) {
    const [t, h, i, e] = await Promise.all([
      supabaseAdmin.from("timing_signals").select("*").eq("session_id", sessionId).order("occurred_at"),
      supabaseAdmin.from("help_events").select("*").eq("session_id", sessionId).order("occurred_at"),
      supabaseAdmin.from("interaction_signals").select("*").eq("session_id", sessionId).order("occurred_at"),
      supabaseAdmin.from("session_events").select("*").eq("session_id", sessionId).order("occurred_at"),
    ]);
    timingSignals = t.data ?? [];
    helpEvents = h.data ?? [];
    interactionSignals = i.data ?? [];
    sessionEvents = e.data ?? [];
  }

  // Evaluator reviews
  const { data: reviews } = await supabaseAdmin
    .from("evaluator_reviews")
    .select("*, users(full_name, email)")
    .eq("candidate_id", params.id)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  // Interview notes
  const { data: interviewNotes } = await supabaseAdmin
    .from("interviewer_notes")
    .select("*, users(full_name, email)")
    .eq("candidate_id", params.id)
    .eq("tenant_id", tenantId)
    .order("interview_date", { ascending: false });

  // Invite info
  const { data: invite } = await supabaseAdmin
    .from("invites")
    .select("sent_at")
    .eq("candidate_id", params.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Learning support signals
  let learningSupport = null;
  if (profile?.learning_support_signal_id) {
    const { data } = await supabaseAdmin
      .from("learning_support_signals")
      .select("*")
      .eq("id", profile.learning_support_signal_id)
      .single();
    learningSupport = data;
  } else if (sessionId) {
    // Fallback: look up by session
    const { data } = await supabaseAdmin
      .from("learning_support_signals")
      .select("*")
      .eq("session_id", sessionId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .single();
    learningSupport = data;
  }

  return (
    <CandidateDetailClient
      candidate={candidate}
      profile={profile}
      sessions={sessions ?? []}
      responses={responses}
      timingSignals={timingSignals}
      helpEvents={helpEvents}
      interactionSignals={interactionSignals}
      sessionEvents={sessionEvents}
      reviews={reviews ?? []}
      interviewNotes={interviewNotes ?? []}
      inviteSentAt={invite?.sent_at}
      tenantId={tenantId}
      learningSupport={learningSupport}
    />
  );
}
