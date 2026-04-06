import { PromptInput, PromptPair, langNote, SCORE_FORMAT } from "./types";

export function buildPrompt(input: PromptInput): PromptPair {
  const reflectionResponses = input.responses.filter(
    (r) => r.task_type === "reflection"
  );
  // Also include any metacognitive content from other responses
  const allResponses = input.responses;

  return {
    system: `You are an admissions insight analyst for LIFT, a non-diagnostic platform. You evaluate a student's capacity for self-reflection and metacognition. You do NOT diagnose any condition. Grade band: ${input.gradeBand}.

Score the student's REFLECTION dimension (0-100) based on:
- Awareness of own thinking processes and learning strategies
- Ability to articulate what they find challenging and why
- Honesty and depth of self-assessment
- Growth mindset indicators (viewing challenges as opportunities)

${SCORE_FORMAT}
${langNote(input.language)}`,

    user: `Student reflection responses:

${reflectionResponses.map((r) => `### ${r.title}\n${r.response_body}`).join("\n\n")}

All responses for context:
${allResponses.map((r) => `### ${r.title} (${r.task_type})\n${r.response_body.slice(0, 300)}`).join("\n\n")}`,
  };
}
