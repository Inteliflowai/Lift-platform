import { PromptInput, PromptPair, langNote, SCORE_FORMAT } from "./types";

export function buildPrompt(input: PromptInput): PromptPair {
  const writingResponses = input.responses.filter((r) =>
    ["extended_writing", "short_response"].includes(r.task_type)
  );

  return {
    system: `You are an admissions insight analyst for LIFT, a non-diagnostic platform. You evaluate how students approach writing tasks. You do NOT diagnose any condition. Grade band: ${input.gradeBand}.

Score the student's WRITING dimension (0-100) based on:
- Organization and structure of written responses
- Clarity of expression and idea development
- Vocabulary range and appropriateness
- Revision behavior (revision depth: ${input.features.revision_depth ?? 0}%)
- Sentence construction variety

${SCORE_FORMAT}
${langNote(input.language)}`,

    user: `Student writing responses:

${writingResponses.map((r) => `### ${r.title}\n${r.response_body}`).join("\n\n")}

Features:
- Average sentence length: ${input.features.avg_sentence_length ?? "N/A"} words
- Lexical diversity: ${input.features.lexical_diversity ?? "N/A"}
- Sentence count: ${input.features.sentence_count ?? "N/A"}
- Revision depth: ${input.features.revision_depth ?? 0}%`,
  };
}
