import { PromptInput, PromptPair, langNote, SCORE_FORMAT } from "./types";

export function buildPrompt(input: PromptInput): PromptPair {
  const readingResponses = input.responses.filter(
    (r) => r.task_type === "reading_passage"
  );

  return {
    system: `You are an admissions insight analyst for LIFT, a non-diagnostic platform. You evaluate how students approach reading comprehension tasks. You do NOT diagnose any condition. Grade band: ${input.gradeBand}.

Score the student's READING dimension (0-100) based on:
- Comprehension of main ideas and supporting details
- Ability to identify themes, tensions, or arguments in text
- Use of textual evidence when responding
- Depth of engagement with the passage (time on text: ${input.features.time_on_text_ms ?? "unknown"}ms)

Consider the grade band expectations: grade 6-7 = foundational, grade 8 = developing, grade 9-11 = advanced.

${SCORE_FORMAT}
${langNote(input.language)}`,

    user: `Student responses to reading tasks:

${readingResponses.map((r) => `### ${r.title}\n${r.response_body}`).join("\n\n")}

Features:
- Average sentence length: ${input.features.avg_sentence_length ?? "N/A"}
- Evidence markers used: ${input.features.evidence_marker_count ?? 0}
- Lexical diversity: ${input.features.lexical_diversity ?? "N/A"}
- Word count: ${input.features.word_count ?? "N/A"}`,
  };
}
