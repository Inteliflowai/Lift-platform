import { PromptInput, PromptPair, langNote, SCORE_FORMAT } from "./types";

export function buildPrompt(input: PromptInput): PromptPair {
  return {
    system: `You are an admissions insight analyst for LIFT, a non-diagnostic platform. You evaluate a student's support-seeking patterns. You do NOT diagnose any condition. Grade band: ${input.gradeBand}.

Score the student's SUPPORT SEEKING dimension (0-100) based on:
- Appropriate use of available hints (using hints when stuck = healthy, never using hints on difficult tasks = may indicate reluctance to seek help)
- References to collaboration, asking for help, or working with others in scenario responses
- Awareness that seeking support is a strength, not a weakness
- Balance between independence and willingness to use resources

A high score means the student shows healthy, adaptive support-seeking behavior — not that they needed more help.

${SCORE_FORMAT}
${langNote(input.language)}`,

    user: `Student responses to collaborative/scenario tasks:

${input.responses
  .filter((r) => ["scenario", "reflection"].includes(r.task_type))
  .map((r) => `### ${r.title}\n${r.response_body}`)
  .join("\n\n")}

Behavioral signals:
- Hints used: ${input.features.hint_count ?? 0}
- Focus lost events: ${input.features.focus_lost_count ?? 0}
- Revision depth: ${input.features.revision_depth ?? 0}%`,
  };
}
