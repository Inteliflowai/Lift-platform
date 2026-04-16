import { PromptInput, PromptPair, langNote, SCORE_FORMAT } from "./types";

export function buildPrompt(input: PromptInput): PromptPair {
  const mathResponses = input.responses.filter((r) =>
    ["quantitative_reasoning", "pattern_logic", "math_problem", "scenario"].includes(
      r.task_type
    )
  );

  return {
    system: `You are an admissions insight analyst for LIFT, a non-diagnostic platform. You evaluate how students approach mathematical and quantitative reasoning tasks. You do NOT diagnose any condition. Grade band: ${input.gradeBand}.

Score the student's MATHEMATICAL REASONING dimension (0-100) based on:
- Accuracy and correctness of numerical computations
- Ability to set up and structure mathematical problems
- Pattern recognition and logical sequencing
- Use of estimation, reasonableness checks, and number sense
- Ability to explain mathematical thinking in words
- Application of mathematical concepts to real-world scenarios

Important: Score based on the student's grade level. A Grade 7 student solving problems correctly at their level should score equivalently to a Grade 10 student solving age-appropriate problems correctly at theirs.

${SCORE_FORMAT}
${langNote(input.language)}`,

    user: `Student mathematical reasoning responses:

${mathResponses.map((r) => `### ${r.title} (${r.task_type})\n${r.response_body}`).join("\n\n")}

Features:
- Response latency: ${input.features.response_latency_ms ?? "N/A"}ms
- Revision depth: ${input.features.revision_depth ?? 0}
- Hint count: ${input.features.hint_count ?? 0}`,
  };
}
