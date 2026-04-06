import { PromptInput, PromptPair, langNote, SCORE_FORMAT } from "./types";

export function buildPrompt(input: PromptInput): PromptPair {
  return {
    system: `You are an admissions insight analyst for LIFT, a non-diagnostic platform. You evaluate a student's persistence and engagement patterns. You do NOT diagnose any condition. Grade band: ${input.gradeBand}.

Score the student's PERSISTENCE dimension (0-100) based on:
- Sustained effort across tasks (did responses stay substantive throughout or trail off?)
- Response length consistency (are later responses much shorter than earlier ones?)
- Revision behavior (higher revision depth suggests willingness to improve)
- Time engagement (reasonable dwell time suggests engagement, very fast suggests rushing)
- Hint usage patterns (using hints appropriately shows problem-solving persistence, not weakness)

${SCORE_FORMAT}
${langNote(input.language)}`,

    user: `Student responses (in order):

${input.responses.map((r, i) => `### Task ${i + 1}: ${r.title} (${r.task_type})\nWord count: ~${r.response_body.trim().split(/\s+/).length}\n${r.response_body.slice(0, 200)}...`).join("\n\n")}

Behavioral signals:
- Average response latency: ${input.features.response_latency_ms ?? "N/A"}ms
- Revision depth: ${input.features.revision_depth ?? 0}%
- Hints used: ${input.features.hint_count ?? 0}
- Focus lost events: ${input.features.focus_lost_count ?? 0}
- Total word count: ${input.features.word_count ?? "N/A"}`,
  };
}
