import { getAnthropicClient, AI_MODEL } from "./client";
import { withRetry } from "./retry";
import { getLocale, type Locale } from "@/lib/i18n/config";

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

function buildPromptPt(data: CommitteeReportData): string {
  const hasSynthesis = !!data.synthesisNarrative;
  const isReapplicant = !!data.isReapplicant;
  const hasSignals = data.signalCount > 0;

  return `Você está redigindo um resumo conciso para o comitê de admissões sobre ${data.candidateName}, candidato(a) ao ${data.gradeApplyingFor}º ano em ${data.schoolName}.

Este resumo será lido pelo comitê de admissões durante uma reunião de decisão. Escreva como um informe de recomendação neutro e baseado em evidências.

DADOS DA SESSÃO LIFT:
- Pontuação TRI: ${data.triScore}/100
- Principais pontos fortes: ${data.topStrengths.join(", ")}
- Áreas ainda em desenvolvimento: ${data.developingAreas.join(", ")}
- Sinais de apoio à aprendizagem: ${hasSignals ? `${data.signalCount} sinal(is) detectado(s)` : "Nenhum detectado"}
${data.rubricRecommendation ? `- Recomendação do entrevistador: ${data.rubricRecommendation}` : ""}
${isReapplicant ? `- Recandidatura: o TRI anterior era ${data.priorTriScore}, o TRI atual é ${data.triScore} (variação ${data.triChange !== undefined && data.triChange >= 0 ? "+" : ""}${data.triChange})` : ""}
${hasSynthesis ? `\nSÍNTESE DO AVALIADOR:\n${data.synthesisNarrative}` : ""}

Escreva um informe de comitê em 3 parágrafos:

Parágrafo 1 — Resumo de Prontidão (2-3 frases):
Apresente a pontuação TRI e o que ela indica em alto nível. Identifique o(s) 1-2 ponto(s) forte(s) mais notável(is) observado(s) na sessão. Seja direto(a) e específico(a).

Parágrafo 2 — Áreas para Consideração (2-3 frases):
Identifique quaisquer dimensões ainda em desenvolvimento.
${hasSignals ? "Observe que sinais de apoio à aprendizagem foram detectados e descreva o que isso significa para o planejamento — não como algo negativo, mas como uma consideração de planejamento." : "Observe que nenhum sinal de apoio à aprendizagem foi detectado."}
${isReapplicant && data.triChange !== undefined ? "Indique se o perfil do(a) recandidato(a) melhorou, permaneceu estável ou declinou desde a candidatura anterior." : ""}
Mantenha equilíbrio — nem toda área em desenvolvimento é motivo para recusar.

Parágrafo 3 — Consideração do Comitê (1-2 frases):
Uma declaração direta e neutra sobre o que as evidências sugerem para a consideração do comitê. NÃO tome a decisão de admissão — formule como "as evidências sugerem..." ou "o comitê pode considerar...".
${hasSynthesis ? "Incorpore a síntese do avaliador neste parágrafo." : ""}

REGRAS IMPORTANTES:
- Escreva em terceira pessoa ("o(a) candidato(a)", "${data.candidateFirstName}", "ele(a)")
- Não use linguagem diagnóstica
- Não mencione pontuações numéricas específicas no texto — descreva padrões, não números
- Mantenha o comprimento total entre 150 e 180 palavras
- Escreva para um(a) Diretor(a) que tem 90 segundos para ler isto
- Não inclua título nem despedida — apenas os 3 parágrafos`;
}

function buildPromptEn(data: CommitteeReportData): string {
  const hasSynthesis = !!data.synthesisNarrative;
  const isReapplicant = !!data.isReapplicant;
  const hasSignals = data.signalCount > 0;

  return `You are writing a concise admissions committee summary for ${data.candidateName}, a Grade ${data.gradeApplyingFor} applicant to ${data.schoolName}.

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
}

export async function generateCommitteeNarrative(
  data: CommitteeReportData,
  localeOverride?: Locale,
): Promise<string> {
  const locale = localeOverride ?? getLocale();
  const client = getAnthropicClient();
  const prompt = locale === "pt" ? buildPromptPt(data) : buildPromptEn(data);

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
