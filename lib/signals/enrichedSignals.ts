/**
 * Enriched Learning Support Signal Detectors
 *
 * These detect behavioral patterns from session data. Every signal:
 * - Describes a behavior, never a condition
 * - Is framed as "may benefit from..." never "has..." or "shows signs of..."
 * - Recommends professional follow-up, never makes a clinical statement
 */

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface LearningSignal {
  id: string;
  label: string;
  description: string;
  recommendation: string;
  severity: "advisory" | "notable";
  category: "reading" | "writing" | "processing" | "attention" | "self-regulation";
  evidenceSummary: string;
}

// Aggregated session behavior built from actual DB tables
interface SessionBehavior {
  gradeBand: string;
  // From timing_signals
  readingDwellTimesMs: number[];       // time_on_text per reading task
  responseLantenciesMs: number[];      // response_latency per task
  taskDwellTimesMs: number[];          // task_dwell_time per task
  // From response_text + response_features
  writingWordCounts: number[];         // word_count per writing task
  revisionDepths: number[];            // revision_depth per task
  // From help_events
  hintCount: number;
  taskCount: number;
  // From interaction_signals
  focusLostCount: number;
  abandonReturnCount: number;
  screenRevisitCount: number;
  // From insight_profiles
  readingScore: number | null;
  writingScore: number | null;
  reasoningScore: number | null;
  reflectionScore: number | null;
  persistenceScore: number | null;
  supportSeekingScore: number | null;
  // Session-level
  completionPct: number;
  totalSessionTimeMs: number;
}

// ── Detectors ─────────────────────────────────────────────────────────────────

function detectSlowReadingPace(d: SessionBehavior): LearningSignal | null {
  if (d.readingDwellTimesMs.length < 2) return null;

  // Expected reading dwell by grade band (ms)
  const thresholds: Record<string, number> = { "6-7": 90000, "8": 75000, "9-11": 60000 };
  const threshold = (thresholds[d.gradeBand] ?? 75000) * 1.8;

  const slowCount = d.readingDwellTimesMs.filter((t) => t > threshold).length;
  if (slowCount < 2) return null;

  return {
    id: "slow_reading_pace",
    label: "Extended Reading Time",
    description: "This student spent significantly more time than expected on reading passages across multiple tasks.",
    recommendation: "Consider whether extended time on assessments might be appropriate. A conversation with the family about their experience with timed reading tasks could be valuable.",
    severity: "notable",
    category: "reading",
    evidenceSummary: `Observed on ${slowCount} of ${d.readingDwellTimesMs.length} reading tasks.`,
  };
}

function detectFrequentScreenRevisits(d: SessionBehavior): LearningSignal | null {
  if (d.screenRevisitCount < 6) return null;

  return {
    id: "frequent_passage_revisits",
    label: "Repeated Passage Re-reading",
    description: "This student returned to re-read content multiple times before responding — more than is typical for their grade.",
    recommendation: "This pattern can reflect strong thoroughness, but may also suggest the student benefits from reading comprehension support. Worth exploring in the admissions conversation.",
    severity: "advisory",
    category: "reading",
    evidenceSummary: `${d.screenRevisitCount} screen revisit events recorded during the session.`,
  };
}

function detectHighRevisionDepth(d: SessionBehavior): LearningSignal | null {
  if (d.revisionDepths.length < 2) return null;

  const highRevisionTasks = d.revisionDepths.filter((r) => r > 6);
  if (highRevisionTasks.length < 2) return null;

  const avg = Math.round(d.revisionDepths.reduce((a, b) => a + b, 0) / d.revisionDepths.length);

  return {
    id: "high_writing_deletion",
    label: "High Written Expression Revision",
    description: "This student revised and rewrote a significant portion of their written responses, suggesting difficulty with written expression or planning.",
    recommendation: "Consider whether written expression support — including pre-writing strategies or assistive technology — might benefit this student. Not necessarily a barrier to admission, but worth a support conversation.",
    severity: "notable",
    category: "writing",
    evidenceSummary: `Average revision depth of ${avg} across ${d.revisionDepths.length} tasks. ${highRevisionTasks.length} tasks with high revision.`,
  };
}

function detectReasoningWritingGap(d: SessionBehavior): LearningSignal | null {
  if (d.reasoningScore == null || d.writingScore == null) return null;
  if (d.reasoningScore > 65 && d.writingScore < 35) {
    return {
      id: "reasoning_writing_gap",
      label: "Reasoning–Expression Gap",
      description: "This student demonstrated strong reasoning ability but produced significantly less written output than expected. This pattern can suggest the barrier is expression rather than understanding.",
      recommendation: "This student may benefit from evaluation of written expression and assistive technology options. Their academic potential may be stronger than written work alone would suggest.",
      severity: "notable",
      category: "writing",
      evidenceSummary: "Strong reasoning performance alongside limited written output across multiple tasks.",
    };
  }
  return null;
}

function detectHighPaceVariance(d: SessionBehavior): LearningSignal | null {
  if (d.taskDwellTimesMs.length < 3) return null;

  const mean = d.taskDwellTimesMs.reduce((a, b) => a + b, 0) / d.taskDwellTimesMs.length;
  if (mean === 0) return null;

  const variance = d.taskDwellTimesMs.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / d.taskDwellTimesMs.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean; // coefficient of variation

  if (cv < 0.65) return null;

  return {
    id: "high_pace_variance",
    label: "Variable Task Pacing",
    description: "This student's time allocation across tasks was highly variable — rushing through some and spending disproportionate time on others.",
    recommendation: "Variable pacing can reflect difficulty with attention regulation or task prioritization. Worth exploring whether the student has strategies for managing longer academic tasks.",
    severity: "advisory",
    category: "attention",
    evidenceSummary: "Significant variation in time allocation across tasks of similar complexity.",
  };
}

function detectLowHintUtilization(d: SessionBehavior): LearningSignal | null {
  if (d.taskCount < 4) return null;

  const hintRate = d.hintCount / d.taskCount;
  // Low hint usage combined with low scores suggests difficulty seeking support
  if (hintRate < 0.1 && d.supportSeekingScore != null && d.supportSeekingScore < 30) {
    return {
      id: "low_hint_utilization",
      label: "Low Support-Seeking Under Challenge",
      description: "When faced with difficult tasks, this student rarely used available hints — suggesting difficulty recognizing when to seek help.",
      recommendation: "This student may benefit from explicit support-seeking strategies and a learning environment that normalizes asking for help. Worth discussing in onboarding.",
      severity: "advisory",
      category: "self-regulation",
      evidenceSummary: `Used hints on only ${d.hintCount} of ${d.taskCount} tasks with a low support-seeking score.`,
    };
  }
  return null;
}

function detectTaskAbandonmentPattern(d: SessionBehavior): LearningSignal | null {
  const abandonSignals = d.focusLostCount + d.abandonReturnCount;
  if (abandonSignals < 4) return null;
  if (d.completionPct > 75) return null;

  return {
    id: "task_abandonment",
    label: "Task Completion Difficulty",
    description: "This student left multiple tasks incomplete during the session, which may reflect difficulty sustaining effort across longer academic experiences.",
    recommendation: "Consider whether extended time, chunked assignments, or check-in support might help this student succeed. Not a barrier to admission — a planning signal.",
    severity: "notable",
    category: "attention",
    evidenceSummary: `${abandonSignals} abandon/focus-loss events. Overall completion: ${Math.round(d.completionPct)}%.`,
  };
}

function detectLowReflectionDepth(d: SessionBehavior): LearningSignal | null {
  if (d.reflectionScore == null) return null;
  if (d.reflectionScore > 30) return null;

  // Also check writing output is low on writing tasks
  const shortResponses = d.writingWordCounts.filter((wc) => wc < 25).length;
  if (shortResponses < 2) return null;

  return {
    id: "low_reflection_depth",
    label: "Limited Metacognitive Expression",
    description: "This student's responses to reflection tasks were brief and rarely referenced their own thinking or process — suggesting metacognitive skills may be still developing.",
    recommendation: "Explicit metacognitive instruction and journaling practices may help this student develop stronger self-awareness as a learner. Not uncommon at this age.",
    severity: "advisory",
    category: "self-regulation",
    evidenceSummary: `Low reflection score with ${shortResponses} brief written responses.`,
  };
}

function detectShortWrittenOutput(d: SessionBehavior): LearningSignal | null {
  if (d.writingWordCounts.length < 2) return null;

  const shortCount = d.writingWordCounts.filter((wc) => wc < 20).length;
  if (shortCount < 2) return null;

  const avg = Math.round(d.writingWordCounts.reduce((a, b) => a + b, 0) / d.writingWordCounts.length);

  return {
    id: "short_written_output",
    label: "Limited Written Output",
    description: "This student produced significantly shorter written responses than expected across multiple tasks, which may indicate difficulty with written expression or engagement.",
    recommendation: "Pre-writing scaffolds, graphic organizers, or planning time before writing tasks may significantly support this student. Worth discussing with their family.",
    severity: "advisory",
    category: "writing",
    evidenceSummary: `Average word count of ${avg} across ${d.writingWordCounts.length} writing tasks. ${shortCount} tasks with fewer than 20 words.`,
  };
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadSessionBehavior(sessionId: string): Promise<SessionBehavior | null> {
  // Load session
  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("grade_band, completion_pct, started_at, completed_at, candidate_id")
    .eq("id", sessionId)
    .single();

  if (!session) return null;

  const totalMs = session.completed_at && session.started_at
    ? new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()
    : 0;

  // Load timing signals
  const { data: timings } = await supabaseAdmin
    .from("timing_signals")
    .select("signal_type, value_ms")
    .eq("session_id", sessionId);

  const readingDwells = (timings ?? []).filter((t) => t.signal_type === "time_on_text").map((t) => Number(t.value_ms));
  const responseLats = (timings ?? []).filter((t) => t.signal_type === "response_latency").map((t) => Number(t.value_ms));
  const taskDwells = (timings ?? []).filter((t) => t.signal_type === "task_dwell_time").map((t) => Number(t.value_ms));

  // Load response features via response_text
  const { data: responses } = await supabaseAdmin
    .from("response_text")
    .select("word_count, response_features(revision_depth)")
    .eq("session_id", sessionId);

  const wordCounts = (responses ?? []).map((r) => r.word_count ?? 0);
  const revisionDepths = (responses ?? []).flatMap((r) => {
    const feats = r.response_features;
    if (Array.isArray(feats)) return feats.map((f: { revision_depth: number }) => f.revision_depth ?? 0);
    if (feats && typeof feats === "object") return [(feats as { revision_depth: number }).revision_depth ?? 0];
    return [];
  });

  // Load help events
  const { data: helpEvents } = await supabaseAdmin
    .from("help_events")
    .select("event_type")
    .eq("session_id", sessionId);

  const hintCount = (helpEvents ?? []).filter((e) => e.event_type === "hint_open").length;

  // Load interaction signals
  const { data: interactions } = await supabaseAdmin
    .from("interaction_signals")
    .select("signal_type")
    .eq("session_id", sessionId);

  const focusLost = (interactions ?? []).filter((i) => i.signal_type === "focus_lost").length;
  const abandonReturn = (interactions ?? []).filter((i) => i.signal_type === "abandon_return").length;
  const screenRevisit = (interactions ?? []).filter((i) => i.signal_type === "screen_revisit").length;

  // Load task count
  const { count: taskCount } = await supabaseAdmin
    .from("task_instances")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  // Load insight profile scores
  const { data: profile } = await supabaseAdmin
    .from("insight_profiles")
    .select("reading_score, writing_score, reasoning_score, reflection_score, persistence_score, support_seeking_score")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return {
    gradeBand: session.grade_band ?? "8",
    readingDwellTimesMs: readingDwells,
    responseLantenciesMs: responseLats,
    taskDwellTimesMs: taskDwells,
    writingWordCounts: wordCounts,
    revisionDepths,
    hintCount,
    taskCount: taskCount ?? 0,
    focusLostCount: focusLost,
    abandonReturnCount: abandonReturn,
    screenRevisitCount: screenRevisit,
    readingScore: profile?.reading_score ? Number(profile.reading_score) : null,
    writingScore: profile?.writing_score ? Number(profile.writing_score) : null,
    reasoningScore: profile?.reasoning_score ? Number(profile.reasoning_score) : null,
    reflectionScore: profile?.reflection_score ? Number(profile.reflection_score) : null,
    persistenceScore: profile?.persistence_score ? Number(profile.persistence_score) : null,
    supportSeekingScore: profile?.support_seeking_score ? Number(profile.support_seeking_score) : null,
    completionPct: Number(session.completion_pct) || 0,
    totalSessionTimeMs: totalMs,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function computeEnrichedSignals(sessionId: string): Promise<LearningSignal[]> {
  const behavior = await loadSessionBehavior(sessionId);
  if (!behavior) return [];

  const detectors = [
    detectSlowReadingPace,
    detectFrequentScreenRevisits,
    detectHighRevisionDepth,
    detectReasoningWritingGap,
    detectHighPaceVariance,
    detectLowHintUtilization,
    detectTaskAbandonmentPattern,
    detectLowReflectionDepth,
    detectShortWrittenOutput,
  ];

  const signals: LearningSignal[] = [];

  for (const detector of detectors) {
    try {
      const signal = detector(behavior);
      if (signal) signals.push(signal);
    } catch (err) {
      console.error("[enrichedSignals] detector error:", err);
    }
  }

  // Sort: notable first, then advisory
  return signals.sort((a, b) => {
    if (a.severity === "notable" && b.severity === "advisory") return -1;
    if (a.severity === "advisory" && b.severity === "notable") return 1;
    return 0;
  });
}
