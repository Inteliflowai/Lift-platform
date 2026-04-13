import { notFound, redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getDemoTenantId } from "@/lib/demo/seedDemoSchool";
import { DemoWorkspace } from "@/components/demo/DemoWorkspace";

export const dynamic = "force-dynamic";

export default async function DemoPage({ params }: { params: { token: string } }) {
  const { data: session } = await supabaseAdmin
    .from("demo_sessions")
    .select("*")
    .eq("token", params.token)
    .single();

  if (!session) notFound();

  if (new Date(session.expires_at) < new Date()) {
    redirect("/demo/expired");
  }

  // Update activity
  await supabaseAdmin
    .from("demo_sessions")
    .update({ last_active_at: new Date().toISOString(), page_views: (session.page_views || 0) + 1 })
    .eq("token", params.token);

  const tenantId = await getDemoTenantId();

  // Load demo candidates - simple query first, then enrich
  const { data: rawCandidates, error: candErr } = await supabaseAdmin
    .from("candidates")
    .select("id, first_name, last_name, grade_band, status")
    .eq("tenant_id", tenantId)
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  if (candErr) console.error("[demo] candidates query error:", candErr);
  console.log("[demo] raw candidates found:", rawCandidates?.length ?? 0);

  // Enrich with profiles and signals
  const candidates = [];
  for (const c of rawCandidates ?? []) {
    const { data: profiles } = await supabaseAdmin
      .from("insight_profiles")
      .select("tri_score, tri_label, tri_confidence, reading_score, writing_score, reasoning_score, reflection_score, persistence_score, support_seeking_score, overall_confidence, internal_narrative, placement_guidance")
      .eq("candidate_id", c.id);

    const { data: signals } = await supabaseAdmin
      .from("learning_support_signals")
      .select("support_indicator_level, enriched_signals, enriched_signal_count, has_notable_signals")
      .eq("candidate_id", c.id);

    candidates.push({ ...c, insight_profiles: profiles ?? [], learning_support_signals: signals ?? [] });
  }

  console.log("[demo] enriched candidates:", candidates.length);

  return <DemoWorkspace token={params.token} expiresAt={session.expires_at} candidates={candidates ?? []} />;
}
