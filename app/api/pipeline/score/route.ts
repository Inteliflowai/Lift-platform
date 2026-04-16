import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAnthropicClient, AI_MODEL } from "@/lib/ai/client";
import { getLatestVersion } from "@/lib/ai/versions";
import { createAiRun, completeAiRun } from "@/lib/ai/logger";
import type { PromptInput } from "@/lib/ai/prompts/types";

import * as readingPrompt from "@/lib/ai/prompts/reading";
import * as writingPrompt from "@/lib/ai/prompts/writing";
import * as reasoningPrompt from "@/lib/ai/prompts/reasoning";
import * as reflectionPrompt from "@/lib/ai/prompts/reflection";
import * as persistencePrompt from "@/lib/ai/prompts/persistence";
import * as supportSeekingPrompt from "@/lib/ai/prompts/support_seeking";
import * as mathPrompt from "@/lib/ai/prompts/math";

const DIMENSION_PROMPTS: Record<
  string,
  { buildPrompt: (input: PromptInput) => { system: string; user: string } }
> = {
  reading: readingPrompt,
  writing: writingPrompt,
  reasoning: reasoningPrompt,
  math: mathPrompt,
  reflection: reflectionPrompt,
  persistence: persistencePrompt,
  support_seeking: supportSeekingPrompt,
};

const DIMENSIONS = Object.keys(DIMENSION_PROMPTS);

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { session_id, features } = await req.json();
  if (!session_id || !features) {
    return NextResponse.json(
      { error: "session_id and features required" },
      { status: 400 }
    );
  }

  const client = getAnthropicClient();

  // Get candidate language
  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("tenant_id, candidate_id, grade_band")
    .eq("id", session_id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("preferred_language")
    .eq("id", session.candidate_id)
    .single();

  const language = (candidate?.preferred_language as "en" | "pt") ?? "en";

  const promptInput: PromptInput = {
    features: {
      sentence_count: features.total_sentences,
      avg_sentence_length: features.avg_sentence_length,
      lexical_diversity: features.avg_lexical_diversity,
      evidence_marker_count: features.total_evidence_markers,
      revision_depth: features.avg_revision_depth,
      word_count: features.total_word_count,
      response_latency_ms: features.avg_response_latency_ms,
      time_on_text_ms: features.total_time_on_text_ms,
      hint_count: features.hint_count,
      focus_lost_count: features.focus_lost_count,
    },
    responses: features.responses,
    gradeBand: session.grade_band,
    language,
  };

  const scores: Record<string, { score: number; confidence: number; rationale: string }> = {};
  const aiRunIds: string[] = [];
  const lowConfidenceFlags: string[] = [];
  const unusualPatternFlags: string[] = [];

  for (const dim of DIMENSIONS) {
    const version = await getLatestVersion(dim);
    if (!version) continue;

    const promptBuilder = DIMENSION_PROMPTS[dim];
    const prompt = promptBuilder.buildPrompt(promptInput);

    const run = await createAiRun({
      session_id,
      tenant_id: session.tenant_id,
      ai_version_id: version.id,
      run_type: `score_${dim}`,
      inputs: promptInput,
    });
    aiRunIds.push(run.id);

    try {
      const response = await client.messages.create({
        model: AI_MODEL,
        max_tokens: 1024,
        temperature: 0.3,
        system: prompt.system,
        messages: [{ role: "user", content: prompt.user }],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";

      await completeAiRun(run.id, text, "complete");

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        scores[dim] = {
          score: Number(parsed.score) || 0,
          confidence: Number(parsed.confidence) || 0,
          rationale: parsed.rationale || "",
        };

        if (scores[dim].confidence < 50) {
          lowConfidenceFlags.push(`${dim}_low_confidence`);
        }
      } else {
        scores[dim] = { score: 0, confidence: 0, rationale: "Parse error" };
        lowConfidenceFlags.push(`${dim}_parse_error`);
      }
    } catch (err) {
      await completeAiRun(run.id, String(err), "failed");
      scores[dim] = { score: 0, confidence: 0, rationale: "API error" };
      lowConfidenceFlags.push(`${dim}_api_error`);
    }
  }

  // Compute overall confidence
  const confidences = Object.values(scores).map((s) => s.confidence);
  const overallConfidence =
    confidences.length > 0
      ? Math.round(
          confidences.reduce((a, b) => a + b, 0) / confidences.length
        )
      : 0;

  // Anomaly detection
  if (features.avg_word_count < 20) {
    unusualPatternFlags.push("low_word_count");
  }
  if (features.avg_response_latency_ms < 30000 && features.avg_response_latency_ms > 0) {
    unusualPatternFlags.push("very_fast_responses");
  }
  if (features.avg_revision_depth === 0) {
    unusualPatternFlags.push("minimal_revision");
  }

  // Check completion %
  const { data: sessionFull } = await supabaseAdmin
    .from("sessions")
    .select("completion_pct")
    .eq("id", session_id)
    .single();

  if (sessionFull && Number(sessionFull.completion_pct) < 60) {
    unusualPatternFlags.push("incomplete_session");
  }

  // Check if human review required
  const { data: settings } = await supabaseAdmin
    .from("tenant_settings")
    .select("require_human_review_always")
    .eq("tenant_id", session.tenant_id)
    .single();

  const requiresHumanReview =
    overallConfidence < 60 ||
    unusualPatternFlags.length >= 2 ||
    settings?.require_human_review_always === true;

  // Upsert insight_profiles
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("insight_profiles")
    .upsert(
      {
        session_id,
        candidate_id: session.candidate_id,
        tenant_id: session.tenant_id,
        reading_score: scores.reading?.score ?? null,
        writing_score: scores.writing?.score ?? null,
        reasoning_score: scores.reasoning?.score ?? null,
        math_score: scores.math?.score ?? null,
        reflection_score: scores.reflection?.score ?? null,
        persistence_score: scores.persistence?.score ?? null,
        support_seeking_score: scores.support_seeking?.score ?? null,
        overall_confidence: overallConfidence,
        low_confidence_flags: lowConfidenceFlags,
        unusual_pattern_flags: unusualPatternFlags,
        requires_human_review: requiresHumanReview,
        ai_run_ids: aiRunIds,
        is_final: false,
      },
      { onConflict: "session_id" }
    )
    .select()
    .single();

  if (profileErr) {
    // session_id might not be unique constraint, insert instead
    const { data: inserted } = await supabaseAdmin
      .from("insight_profiles")
      .insert({
        session_id,
        candidate_id: session.candidate_id,
        tenant_id: session.tenant_id,
        reading_score: scores.reading?.score ?? null,
        writing_score: scores.writing?.score ?? null,
        reasoning_score: scores.reasoning?.score ?? null,
        math_score: scores.math?.score ?? null,
        reflection_score: scores.reflection?.score ?? null,
        persistence_score: scores.persistence?.score ?? null,
        support_seeking_score: scores.support_seeking?.score ?? null,
        overall_confidence: overallConfidence,
        low_confidence_flags: lowConfidenceFlags,
        unusual_pattern_flags: unusualPatternFlags,
        requires_human_review: requiresHumanReview,
        ai_run_ids: aiRunIds,
        is_final: false,
      })
      .select()
      .single();

    return NextResponse.json({
      scores,
      overall_confidence: overallConfidence,
      low_confidence_flags: lowConfidenceFlags,
      unusual_pattern_flags: unusualPatternFlags,
      requires_human_review: requiresHumanReview,
      profile_id: inserted?.id,
    });
  }

  return NextResponse.json({
    scores,
    overall_confidence: overallConfidence,
    low_confidence_flags: lowConfidenceFlags,
    unusual_pattern_flags: unusualPatternFlags,
    requires_human_review: requiresHumanReview,
    profile_id: profile?.id,
  });
}
