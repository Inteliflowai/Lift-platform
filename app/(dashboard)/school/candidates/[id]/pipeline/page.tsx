import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { PipelineClient } from "./pipeline-client";

export const dynamic = "force-dynamic";

export default async function PipelinePage({
  params,
}: {
  params: { id: string };
}) {
  const { tenantId } = await getTenantContext();

  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("first_name, last_name")
    .eq("id", params.id)
    .eq("tenant_id", tenantId)
    .single();

  if (!candidate) notFound();

  // Get sessions
  const { data: sessions } = await supabaseAdmin
    .from("sessions")
    .select("id, status, completed_at")
    .eq("candidate_id", params.id)
    .order("created_at", { ascending: false });

  // Get ai_runs for all sessions
  const sessionIds = sessions?.map((s) => s.id) ?? [];
  let aiRuns: {
    id: string;
    session_id: string;
    run_type: string;
    status: string;
    ran_at: string;
    ai_versions: { dimension: string; version_tag: string } | null;
  }[] = [];

  if (sessionIds.length > 0) {
    const { data } = await supabaseAdmin
      .from("ai_runs")
      .select("id, session_id, run_type, status, ran_at, ai_versions(dimension, version_tag)")
      .in("session_id", sessionIds)
      .order("ran_at", { ascending: false });
    aiRuns = (data ?? []) as unknown as typeof aiRuns;
  }

  return (
    <PipelineClient
      candidateName={`${candidate.first_name} ${candidate.last_name}`}
      sessions={sessions ?? []}
      aiRuns={aiRuns}
    />
  );
}
