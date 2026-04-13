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

  // Load demo candidates with profiles and signals
  const { data: candidates } = await supabaseAdmin
    .from("candidates")
    .select("id, first_name, last_name, grade_band, status, insight_profiles(tri_score, tri_label, tri_confidence, reading_score, writing_score, reasoning_score, reflection_score, persistence_score, support_seeking_score, overall_confidence, internal_narrative, placement_guidance), learning_support_signals(support_indicator_level, enriched_signals, enriched_signal_count, has_notable_signals)")
    .eq("tenant_id", tenantId)
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  return <DemoWorkspace token={params.token} expiresAt={session.expires_at} candidates={candidates ?? []} />;
}
