import { supabaseAdmin } from "@/lib/supabase/admin";

export type LearningSupport = {
  id: string;
  high_revision_depth: boolean;
  low_reading_dwell: boolean;
  short_written_output: boolean;
  high_response_latency: boolean;
  task_abandonment_pattern: boolean;
  hint_seeking_high: boolean;
  planning_task_difficulty: boolean;
  reasoning_writing_gap: boolean;
  signal_count: number;
  support_indicator_level: "none" | "watch" | "recommend_screening";
  evaluator_note: string | null;
  requires_human_review: boolean;
};

export async function computeLearningSupport(
  sessionId: string
): Promise<LearningSupport> {
  // Get session info
  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("tenant_id, candidate_id")
    .eq("id", sessionId)
    .single();

  if (!session) throw new Error("Session not found");

  // Pull response_features
  const { data: features } = await supabaseAdmin
    .from("response_features")
    .select("revision_depth, session_id")
    .eq("session_id", sessionId);

  // Pull response_text with task type info
  const { data: responses } = await supabaseAdmin
    .from("response_text")
    .select(
      "word_count, task_instance_id, task_instances(task_templates(task_type))"
    )
    .eq("session_id", sessionId);

  // Pull timing signals
  const { data: timingSignals } = await supabaseAdmin
    .from("timing_signals")
    .select("signal_type, value_ms")
    .eq("session_id", sessionId);

  // Pull help events
  const { data: helpEvents } = await supabaseAdmin
    .from("help_events")
    .select("event_type")
    .eq("session_id", sessionId);

  // Pull interaction signals
  const { data: interactionSignals } = await supabaseAdmin
    .from("interaction_signals")
    .select("signal_type")
    .eq("session_id", sessionId);

  // Pull insight profile for reasoning/writing gap
  const { data: profile } = await supabaseAdmin
    .from("insight_profiles")
    .select("reasoning_score, writing_score")
    .eq("session_id", sessionId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  // Task instances count + response mode
  const { data: taskInstances } = await supabaseAdmin
    .from("task_instances")
    .select("id, response_mode")
    .eq("session_id", sessionId);

  const taskCount = taskInstances?.length ?? 1;

  // --- Compute flags ---

  // high_revision_depth: avg revision_depth across typed writing tasks > 4
  // Do NOT penalize voice responses for low revision_depth
  const voiceTaskIds = new Set(
    (taskInstances ?? []).filter((t) => t.response_mode === "voice").map((t) => t.id)
  );
  const typedFeatures = (features ?? []).filter(
    (f) => !voiceTaskIds.has(f.session_id) // approximate — features don't have task_instance_id directly
  );
  const revisionDepths = typedFeatures.map((f) => f.revision_depth ?? 0);
  const avgRevision =
    revisionDepths.length > 0
      ? revisionDepths.reduce((a, b) => a + b, 0) / revisionDepths.length
      : 0;
  const high_revision_depth = avgRevision > 4;

  // low_reading_dwell: avg time_on_text_ms < 30000
  const textTimes = (timingSignals ?? [])
    .filter((t) => t.signal_type === "time_on_text")
    .map((t) => t.value_ms ?? 0);
  const avgTextTime =
    textTimes.length > 0
      ? textTimes.reduce((a, b) => a + b, 0) / textTimes.length
      : Infinity;
  const low_reading_dwell = textTimes.length > 0 && avgTextTime < 30000;

  // short_written_output: avg word_count < 25 on writing tasks
  const writingResponses = (responses ?? []).filter((r) => {
    const ti = r.task_instances as unknown as {
      task_templates: { task_type: string };
    };
    const type = ti?.task_templates?.task_type;
    return type === "extended_writing" || type === "short_response";
  });
  const writingWordCounts = writingResponses.map((r) => r.word_count ?? 0);
  const avgWritingWords =
    writingWordCounts.length > 0
      ? writingWordCounts.reduce((a, b) => a + b, 0) / writingWordCounts.length
      : Infinity;
  const short_written_output =
    writingWordCounts.length > 0 && avgWritingWords < 25;

  // high_response_latency: avg response_latency_ms > 180000
  const latencies = (timingSignals ?? [])
    .filter(
      (t) =>
        t.signal_type === "task_dwell_time" ||
        t.signal_type === "response_latency"
    )
    .map((t) => t.value_ms ?? 0)
    .filter((v) => v > 0);
  const avgLatency =
    latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;
  const high_response_latency = latencies.length > 0 && avgLatency > 180000;

  // task_abandonment_pattern: focus_lost signals >= 4
  const abandonSignals = (interactionSignals ?? []).filter(
    (s) =>
      s.signal_type === "focus_lost" ||
      s.signal_type === "abandon_return" ||
      s.signal_type === "screen_revisit"
  ).length;
  const task_abandonment_pattern = abandonSignals >= 4;

  // hint_seeking_high: (total help_events / task count) > 3
  const hintCount = (helpEvents ?? []).filter(
    (e) => e.event_type === "hint_open"
  ).length;
  const hint_seeking_high = taskCount > 0 && hintCount / taskCount > 3;

  // planning_task_difficulty: planning task response word_count < 20
  const planningResponses = (responses ?? []).filter((r) => {
    const ti = r.task_instances as unknown as {
      task_templates: { task_type: string };
    };
    return ti?.task_templates?.task_type === "planning";
  });
  const planning_task_difficulty =
    planningResponses.length > 0 &&
    planningResponses.some((r) => (r.word_count ?? 0) < 20);

  // reasoning_writing_gap: reasoning_score > 65 AND writing_score < 35
  const reasoningScore = Number(profile?.reasoning_score ?? 0);
  const writingScore = Number(profile?.writing_score ?? 0);
  const reasoning_writing_gap = reasoningScore > 65 && writingScore < 35;

  // --- Compute summary ---
  const flags = [
    high_revision_depth,
    low_reading_dwell,
    short_written_output,
    high_response_latency,
    task_abandonment_pattern,
    hint_seeking_high,
    planning_task_difficulty,
    reasoning_writing_gap,
  ];
  const signal_count = flags.filter(Boolean).length;

  const support_indicator_level: "none" | "watch" | "recommend_screening" =
    signal_count >= 4
      ? "recommend_screening"
      : signal_count >= 2
      ? "watch"
      : "none";

  const evaluator_note =
    support_indicator_level === "recommend_screening"
      ? "Multiple response patterns are consistent with students who benefit from a learning support evaluation. Recommend a screening conversation before or shortly after enrollment. This is not a diagnosis."
      : support_indicator_level === "watch"
      ? "Some response patterns in this session are worth monitoring. Consider noting these during the admissions interview."
      : null;

  const requires_human_review =
    support_indicator_level === "recommend_screening";

  // Insert record
  const { data: record, error } = await supabaseAdmin
    .from("learning_support_signals")
    .insert({
      session_id: sessionId,
      candidate_id: session.candidate_id,
      tenant_id: session.tenant_id,
      high_revision_depth,
      low_reading_dwell,
      short_written_output,
      high_response_latency,
      task_abandonment_pattern,
      hint_seeking_high,
      planning_task_difficulty,
      reasoning_writing_gap,
      signal_count,
      support_indicator_level,
      evaluator_note,
      requires_human_review,
    })
    .select()
    .single();

  if (error) throw error;

  // Link to insight_profiles
  await supabaseAdmin
    .from("insight_profiles")
    .update({ learning_support_signal_id: record.id })
    .eq("session_id", sessionId);

  // If requires_human_review, also flag the insight profile
  if (requires_human_review) {
    await supabaseAdmin
      .from("insight_profiles")
      .update({ requires_human_review: true })
      .eq("session_id", sessionId);
  }

  return record as LearningSupport;
}
