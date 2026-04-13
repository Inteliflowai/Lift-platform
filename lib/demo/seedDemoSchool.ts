import { supabaseAdmin } from "@/lib/supabase/admin";

const DEMO_SLUG = "lift-demo";

// 3 synthetic candidates at different readiness levels
const DEMO_CANDIDATES = [
  {
    first_name: "Jamie",
    last_name: "Rivera",
    grade_band: "8",
    tri_score: 74,
    tri_label: "ready",
    tri_confidence: "high",
    reading: 81, writing: 68, reasoning: 74, reflection: 62, persistence: 78, support_seeking: 71,
    overall_confidence: 82,
    support_level: "none" as const,
    enriched_signals: [],
  },
  {
    first_name: "Alex",
    last_name: "Chen",
    grade_band: "9-11",
    tri_score: 61,
    tri_label: "ready",
    tri_confidence: "moderate",
    reading: 58, writing: 55, reasoning: 69, reflection: 48, persistence: 52, support_seeking: 44,
    overall_confidence: 64,
    support_level: "watch" as const,
    enriched_signals: [
      { id: "slow_reading_pace", label: "Extended Reading Time", severity: "notable", category: "reading", description: "Spent significantly more time than expected on reading passages across multiple tasks.", recommendation: "Consider whether extended time on assessments might be appropriate.", evidenceSummary: "Observed on 3 of 4 reading passages." },
      { id: "high_writing_deletion", label: "High Written Expression Revision", severity: "advisory", category: "writing", description: "Deleted and rewrote a significant portion of written responses.", recommendation: "Written expression support may benefit this student.", evidenceSummary: "Observed across 2 writing tasks." },
    ],
  },
  {
    first_name: "Sofia",
    last_name: "Okafor",
    grade_band: "6-7",
    tri_score: 88,
    tri_label: "thriving",
    tri_confidence: "high",
    reading: 91, writing: 84, reasoning: 87, reflection: 82, persistence: 93, support_seeking: 88,
    overall_confidence: 91,
    support_level: "none" as const,
    enriched_signals: [],
  },
];

export async function getDemoTenantId(): Promise<string> {
  const { data } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("slug", DEMO_SLUG)
    .single();

  if (!data) throw new Error("Demo tenant not found. Create it first.");
  return data.id;
}

export async function ensureDemoCandidates(tenantId: string): Promise<void> {
  // Check if demo candidates with profiles exist
  const { count } = await supabaseAdmin
    .from("insight_profiles")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  if ((count ?? 0) >= 3) return;

  // Clear any existing candidates without profiles for this tenant
  const { error: delErr } = await supabaseAdmin.from("candidates").delete().eq("tenant_id", tenantId);
  if (delErr) console.error("[demo] delete candidates error:", delErr);

  console.log("[demo] Seeding demo candidates for tenant:", tenantId);

  // Seed demo candidates with full profiles
  for (const c of DEMO_CANDIDATES) {
    // Create candidate
    const { data: candidate, error: candErr } = await supabaseAdmin
      .from("candidates")
      .insert({
        tenant_id: tenantId,
        first_name: c.first_name,
        last_name: c.last_name,
        grade_band: c.grade_band,
        status: "completed",
      })
      .select("id")
      .single();

    if (candErr) { console.error("[demo] candidate insert error:", c.first_name, candErr); continue; }
    if (!candidate) { console.error("[demo] candidate insert returned null:", c.first_name); continue; }
    console.log("[demo] Created candidate:", c.first_name, candidate.id);

    // Create session
    const completedAt = new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: session, error: sessErr } = await supabaseAdmin
      .from("sessions")
      .insert({
        candidate_id: candidate.id,
        tenant_id: tenantId,
        grade_band: c.grade_band,
        status: "completed",
        completion_pct: 100,
        completed_at: completedAt,
        started_at: new Date(new Date(completedAt).getTime() - 55 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    if (sessErr) { console.error("[demo] session insert error:", c.first_name, sessErr); continue; }
    if (!session) { console.error("[demo] session insert returned null:", c.first_name); continue; }
    console.log("[demo] Created session:", c.first_name, session.id);

    // Create insight profile
    const { data: profile } = await supabaseAdmin
      .from("insight_profiles")
      .insert({
        session_id: session.id,
        candidate_id: candidate.id,
        tenant_id: tenantId,
        reading_score: c.reading,
        writing_score: c.writing,
        reasoning_score: c.reasoning,
        reflection_score: c.reflection,
        persistence_score: c.persistence,
        support_seeking_score: c.support_seeking,
        overall_confidence: c.overall_confidence,
        tri_score: c.tri_score,
        tri_label: c.tri_label,
        tri_confidence: c.tri_confidence,
        is_final: true,
        requires_human_review: c.support_level === "watch",
      })
      .select("id")
      .single();

    // Create learning support signals
    if (profile) {
      await supabaseAdmin.from("learning_support_signals").insert({
        session_id: session.id,
        candidate_id: candidate.id,
        tenant_id: tenantId,
        signal_count: c.enriched_signals.length,
        support_indicator_level: c.support_level,
        enriched_signals: c.enriched_signals,
        enriched_signal_count: c.enriched_signals.length,
        has_notable_signals: c.enriched_signals.some((s) => s.severity === "notable"),
        high_revision_depth: false,
        low_reading_dwell: c.support_level === "watch",
        short_written_output: false,
        high_response_latency: false,
        task_abandonment_pattern: false,
        hint_seeking_high: false,
        planning_task_difficulty: false,
        reasoning_writing_gap: c.reasoning > c.writing + 15,
      });
    }
  }
}
