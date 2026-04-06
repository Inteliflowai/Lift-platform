import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  // Validate internal secret
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { session_id } = await req.json();
  if (!session_id) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  // Get session
  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("tenant_id, candidate_id")
    .eq("id", session_id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Load all data for this session
  const [responsesRes, timingRes, helpRes, interactionRes] =
    await Promise.all([
      supabaseAdmin
        .from("response_text")
        .select("*, task_instances(task_templates(task_type, title))")
        .eq("session_id", session_id),
      supabaseAdmin
        .from("timing_signals")
        .select("*")
        .eq("session_id", session_id),
      supabaseAdmin
        .from("help_events")
        .select("*")
        .eq("session_id", session_id),
      supabaseAdmin
        .from("interaction_signals")
        .select("*")
        .eq("session_id", session_id),
    ]);

  const responses = responsesRes.data ?? [];
  const timingSignals = timingRes.data ?? [];
  const helpEvents = helpRes.data ?? [];
  const interactionSignals = interactionRes.data ?? [];

  // Compute aggregate features
  const totalWords = responses.reduce((s, r) => s + (r.word_count ?? 0), 0);
  const avgWordCount =
    responses.length > 0 ? totalWords / responses.length : 0;

  const latencies = timingSignals
    .filter((t) => t.signal_type === "response_latency" || t.signal_type === "task_dwell_time")
    .map((t) => t.value_ms ?? 0);
  const avgLatency =
    latencies.length > 0
      ? latencies.reduce((s, v) => s + v, 0) / latencies.length
      : 0;

  const textTimes = timingSignals
    .filter((t) => t.signal_type === "time_on_text")
    .map((t) => t.value_ms ?? 0);
  const totalTimeOnText = textTimes.reduce((s, v) => s + v, 0);

  const hintCount = helpEvents.filter(
    (e) => e.event_type === "hint_open"
  ).length;

  const focusLostCount = interactionSignals.filter(
    (s) => s.signal_type === "focus_lost"
  ).length;

  // Aggregate response_features
  const { data: existingFeatures } = await supabaseAdmin
    .from("response_features")
    .select("*")
    .eq("session_id", session_id);

  const features = existingFeatures ?? [];
  const avgSentenceLength =
    features.length > 0
      ? features.reduce((s, f) => s + Number(f.avg_sentence_length ?? 0), 0) /
        features.length
      : 0;
  const avgLexicalDiversity =
    features.length > 0
      ? features.reduce((s, f) => s + Number(f.lexical_diversity ?? 0), 0) /
        features.length
      : 0;
  const totalEvidenceMarkers = features.reduce(
    (s, f) => s + (f.evidence_marker_count ?? 0),
    0
  );
  const avgRevisionDepth =
    features.length > 0
      ? features.reduce((s, f) => s + (f.revision_depth ?? 0), 0) /
        features.length
      : 0;
  const totalSentences = features.reduce(
    (s, f) => s + (f.sentence_count ?? 0),
    0
  );

  const summary = {
    session_id,
    tenant_id: session.tenant_id,
    candidate_id: session.candidate_id,
    task_count: responses.length,
    total_word_count: totalWords,
    avg_word_count: Math.round(avgWordCount),
    avg_response_latency_ms: Math.round(avgLatency),
    total_time_on_text_ms: totalTimeOnText,
    hint_count: hintCount,
    focus_lost_count: focusLostCount,
    avg_sentence_length: Math.round(avgSentenceLength * 100) / 100,
    avg_lexical_diversity: Math.round(avgLexicalDiversity * 10000) / 10000,
    total_evidence_markers: totalEvidenceMarkers,
    avg_revision_depth: Math.round(avgRevisionDepth),
    total_sentences: totalSentences,
    responses: responses.map((r) => {
      const ti = r.task_instances as unknown as {
        task_templates: { task_type: string; title: string };
      };
      return {
        task_type: ti?.task_templates?.task_type ?? "unknown",
        title: ti?.task_templates?.title ?? "Unknown",
        response_body: r.response_body ?? "",
        word_count: r.word_count ?? 0,
      };
    }),
  };

  return NextResponse.json(summary);
}
