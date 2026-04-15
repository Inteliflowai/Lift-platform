import { getAnthropicClient, AI_MODEL } from "./client";
import { withRetry } from "./retry";

export interface CommitteeReportData {
  candidateName: string;
  candidateFirstName: string;
  gradeApplyingFor: string;
  schoolName: string;

  triScore: number;
  topStrengths: string[];
  developingAreas: string[];
  signalCount: number;

  // Interview data (optional)
  rubricRecommendation?: string;
  synthesisNarrative?: string;

  // Re-applicant data (optional)
  isReapplicant?: boolean;
  priorTriScore?: number;
  triChange?: number;
}

export async function generateCommitteeNarrative(
  data: CommitteeReportData
): Promise<string> {
  const client = getAnthropicClient();
  const hasSynthesis = !!data.synthesisNarrative;
  const isReapplicant = !!data.isReapplicant;
  const hasSignals = data.signalCount > 0;

  const prompt = `You are writing a concise admissions committee summary for ${data.candidateName}, a Grade ${data.gradeApplyingFor} applicant to ${data.schoolName}.

This summary will be read by the admissions committee during a decision meeting. Write it as a neutral, evidence-based recommendation brief.

LIFT SESSION DATA:
- TRI Score: ${data.triScore}/100
- Top strengths: ${data.topStrengths.join(", ")}
- Areas still developing: ${data.developingAreas.join(", ")}
- Learning support signals: ${hasSignals ? `${data.signalCount} signals detected` : "None detected"}
${data.rubricRecommendation ? `- Interviewer recommendation: ${data.rubricRecommendation}` : ""}
${isReapplicant ? `- Re-applicant: prior TRI was ${data.priorTriScore}, current TRI is ${data.triScore} (${data.triChange !== undefined && data.triChange >= 0 ? "+" : ""}${data.triChange} change)` : ""}
${hasSynthesis ? `\nEVALUATOR SYNTHESIS:\n${data.synthesisNarrative}` : ""}

Write a 3-paragraph committee brief:

Paragraph 1 — Readiness Summary (2-3 sentences):
State the TRI score and what it indicates at a high level. Identify the 1-2 most notable strengths observed in the session. Be direct and specific.

Paragraph 2 — Areas for Consideration (2-3 sentences):
Identify any dimensions that are still developing.
${hasSignals ? "Note that learning support signals were detected and describe what this means for planning — not as a negative, but as a planning consideration." : "Note that no learning support signals were detected."}
${isReapplicant && data.triChange !== undefined ? "Note whether the re-applicant's profile has improved, remained stable, or declined since their prior application." : ""}
Keep this balanced — not every developing area is a reason to reject.

Paragraph 3 — Committee Consideration (1-2 sentences):
A direct, neutral statement about what the evidence suggests for the committee's consideration. Do NOT make the admission decision — frame it as "the data suggests..." or "the committee may wish to consider..."
${hasSynthesis ? "Incorporate the evaluator synthesis into this paragraph." : ""}

IMPORTANT RULES:
- Write in third person ("the candidate", "${data.candidateFirstName}", "they")
- Do not use diagnostic language
- Do not mention specific numeric scores in the text — describe patterns, not numbers
- Keep total length to 150-180 words
- Write for a Head of School who has 90 seconds to read this
- Do not include a heading or sign-off — just the 3 paragraphs`;

  const response = await withRetry(() =>
    client.messages.create({
      model: AI_MODEL,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    })
  );

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");
  return content.text.trim();
}
