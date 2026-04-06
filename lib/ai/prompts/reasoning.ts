import { PromptInput, PromptPair, langNote, SCORE_FORMAT } from "./types";

export function buildPrompt(input: PromptInput): PromptPair {
  const reasoningResponses = input.responses.filter((r) =>
    ["scenario", "reading_passage", "quantitative_reasoning", "pattern_logic", "planning"].includes(
      r.task_type
    )
  );

  return {
    system: `You are an admissions insight analyst for LIFT, a non-diagnostic platform. You evaluate how students approach reasoning and problem-solving tasks. You do NOT diagnose any condition. Grade band: ${input.gradeBand}.

Score the student's REASONING dimension (0-100) based on:
- Logical structure of arguments and explanations
- Ability to consider multiple perspectives
- Use of evidence to support conclusions
- Problem-solving approach (step-by-step thinking, pattern recognition)
- Quality of mathematical/logical reasoning where applicable

${SCORE_FORMAT}
${langNote(input.language)}`,

    user: `Student reasoning responses:

${reasoningResponses.map((r) => `### ${r.title} (${r.task_type})\n${r.response_body}`).join("\n\n")}

Features:
- Evidence markers: ${input.features.evidence_marker_count ?? 0}
- Lexical diversity: ${input.features.lexical_diversity ?? "N/A"}
- Average response latency: ${input.features.response_latency_ms ?? "N/A"}ms`,
  };
}
