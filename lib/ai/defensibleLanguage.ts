// Defensible Decision Language generator.
//
// Produces three parent-safe, parent-facing rationale versions per candidate —
// admit, waitlist, decline — each 3–5 sentences, evidence-cited, mission-aligned
// when a mission_statement is set. Every generation passes through
// validateAgainstGuardrails() before being accepted; on 3rd rejection we fall
// back to a deterministic safe template rather than ship a 3rd attempt that
// might slip through.
//
// The recommendation itself is NOT made by this module — the LLM writes
// language, never judgment. Recommendation is computed deterministically from
// signals elsewhere.

import { getAnthropicClient } from "./client";
import { withRetry } from "./retry";
import { validateAgainstGuardrails, type GuardrailResult } from "./forbiddenPhrases";
import {
  computeSignalSnapshotHash,
  type SignalSnapshot,
} from "./signalHash";
import { getLocale, type Locale } from "@/lib/i18n/config";

// Sonnet 4.6 — tightly constrained output, much cheaper than Opus at the
// same quality for this specific task. Keep Opus on the main scoring and
// narrative pipeline; defensible language is a volume feature where Sonnet
// fits better.
export const DEFENSIBLE_LANGUAGE_MODEL = "claude-sonnet-4-6";

// Prompt version — bumps trigger cache regeneration on next pipeline run.
// Update when the prompt text, constraints, or output format changes in a
// way that would materially alter past outputs. v1.1 adds locale-aware
// (pt/en) prompt selection.
export const DEFENSIBLE_LANGUAGE_PROMPT_VERSION = "dl-v1.1";

const MAX_ATTEMPTS_PER_DECISION = 3; // 1 initial + 2 regenerations before fallback

export type DecisionType = "admit" | "waitlist" | "decline";

export interface GenerationInputs {
  candidateFirstName: string;
  candidateLastName: string;
  gradeApplyingTo: string;
  schoolName: string;
  missionStatement?: string | null;
  topStrengths: string[];      // 2–3 plain-English strengths derived from dimension scores
  developingAreas: string[];    // 1–2 plain-English developing areas
  behavioralEvidence: string[]; // plain-English enriched-signal observations
  signalSnapshot: SignalSnapshot;
}

export interface GenerationAttempt {
  decision: DecisionType;
  attempts: number;
  rejected: Array<{ phrase: string; category: string; text: string }>;
  final_text: string;
  fallback_used: boolean;
}

export interface DefensibleLanguageCache {
  admit: string;
  waitlist: string;
  decline: string;
  edited_versions: Array<{
    decision: DecisionType;
    text: string;
    actor_id: string;
    ts: string;
  }>;
  generated_at: string;
  signal_snapshot_hash: string;
  model: string;
  prompt_version: string;
  fallback_used: boolean;
  attempts: Record<DecisionType, number>;
}

// ---- Safe deterministic fallback templates --------------------------------
//
// These ship if the AI cannot produce a guardrail-clean generation after
// MAX_ATTEMPTS_PER_DECISION attempts. They are intentionally boring, generic,
// and mission-neutral. They reference only the school name and high-level
// domains (never specific scores, signals, or comparative framing).
//
// CRITICAL: every string returned here MUST pass validateAgainstGuardrails().
// Protected by the test in __tests__/defensible-language-cache.test.ts.

export function safeFallbackTemplate(
  decision: DecisionType,
  inputs: GenerationInputs,
  localeOverride?: Locale,
): string {
  const locale = localeOverride ?? getLocale();
  const first = inputs.candidateFirstName || (locale === "pt" ? "O candidato" : "The candidate");
  const school = inputs.schoolName || (locale === "pt" ? "a escola" : "the school");

  if (locale === "pt") {
    const grade = inputs.gradeApplyingTo ? `${inputs.gradeApplyingTo}º ano` : "o ano pretendido";
    if (decision === "admit") {
      return `${first} concluiu uma avaliação completa de prontidão para o ${grade} em ${school}. As evidências da avaliação sustentam uma recomendação de admissão, e a equipe de admissões está satisfeita em avançar com ${first} no processo. A equipe aguarda com interesse os próximos passos com ${first} e a família.`;
    }
    if (decision === "waitlist") {
      return `${first} concluiu uma avaliação completa de prontidão para o ${grade} em ${school}. As evidências sustentam a inclusão de ${first} na lista de espera enquanto a equipe de admissões continua a analisar o grupo. A família será notificada assim que a equipe tiver mais informações sobre vagas disponíveis.`;
    }
    return `${first} concluiu uma avaliação completa de prontidão para o ${grade} em ${school}. Após análise cuidadosa, a equipe de admissões decidiu não estender uma oferta neste momento. A decisão reflete um juízo sobre o ajuste com o grupo atual e o programa da escola, e a equipe de admissões agradece o envolvimento de ${first} ao longo do processo.`;
  }

  const grade = inputs.gradeApplyingTo ? `Grade ${inputs.gradeApplyingTo}` : "the applied grade";
  if (decision === "admit") {
    return `${first} has completed a full readiness assessment for ${grade} at ${school}. The evidence from the assessment supports a recommendation of admission, and the admissions team is pleased to move ${first} forward in the process. The team looks forward to working with ${first} and the family on the next steps.`;
  }
  if (decision === "waitlist") {
    return `${first} has completed a full readiness assessment for ${grade} at ${school}. The evidence supports placing ${first} on the waitlist while the admissions team continues to review the cohort. The family will be notified as soon as the admissions team has additional information about available seats.`;
  }
  return `${first} has completed a full readiness assessment for ${grade} at ${school}. After careful review, the admissions team has decided not to extend an offer at this time. The decision reflects a judgment about fit with the current cohort and the school's program, and the admissions team appreciates ${first}'s engagement throughout the process.`;
}

// ---- Prompt builder -------------------------------------------------------

function buildPrompt(decision: DecisionType, inputs: GenerationInputs, locale: Locale): string {
  if (locale === "pt") {
    const missionLine = inputs.missionStatement?.trim()
      ? `Missão da escola: "${inputs.missionStatement.trim()}"`
      : `A declaração de missão da escola não está cadastrada; formule a justificativa em torno do programa e do ajuste ao grupo de ${inputs.schoolName}, sem inventar linguagem de missão.`;

    const decisionFraming =
      decision === "admit"
        ? "Esta é a versão ADMITIR — escreva uma justificativa positiva e acolhedora que afirme o ajuste."
        : decision === "waitlist"
          ? "Esta é a versão LISTA DE ESPERA — escreva uma justificativa equilibrada que reconheça os pontos fortes e explique que a equipe de admissões continua a analisar o grupo. Voltada para o futuro."
          : "Esta é a versão NÃO ADMITIR — escreva uma justificativa voltada para o futuro, focada no ajuste e não em déficit. Respeitosa e definitiva. Nunca peça desculpas pela decisão.";

    return `Você está redigindo uma justificativa de decisão de admissão para ${inputs.schoolName} — especificamente a versão ${decision === "admit" ? "ADMITIR" : decision === "waitlist" ? "LISTA DE ESPERA" : "NÃO ADMITIR"} para um(a) estudante chamado(a) ${inputs.candidateFirstName} candidato(a) ao ${inputs.gradeApplyingTo}º ano.

${decisionFraming}

${missionLine}

EVIDÊNCIAS DA AVALIAÇÃO:
- Principais pontos fortes observados: ${inputs.topStrengths.join(", ") || "(nenhum identificado)"}
- Áreas ainda em desenvolvimento: ${inputs.developingAreas.join(", ") || "(nenhuma identificada)"}
- Observações comportamentais: ${inputs.behavioralEvidence.length > 0 ? inputs.behavioralEvidence.join("; ") : "(sem sinais comportamentais notáveis)"}

RESTRIÇÕES (estritas):
1. Total de 3 a 5 frases. Sem listas, títulos ou despedida.
2. Referencie evidências ESPECÍFICAS da avaliação acima — nunca traços genéricos.
3. A redação deve, quando possível, conectar-se à missão da escola ou ao ajuste ao grupo.
4. Linguagem segura para os responsáveis: NÃO inclua nada do seguinte:
   - Comparações com outros candidatos ou colegas (nada de "comparado a/com", "melhor/pior que", "acima/abaixo da média", linguagem de percentil ou quartil)
   - Referências a classe protegida (raça, etnia, religião, origem nacional, orientação sexual, identidade de gênero)
   - Especulação médica ou de deficiência (nada de "diagnóstico", "transtorno", "necessidades especiais", "TDAH", "autismo", "dislexia", "PEI", "neurodivergente", "saúde mental")
   - Comentário financeiro (nada de "bolsa", "mensalidade", "renda", "pode pagar", "socioeconômico")
   - Comentário sobre estrutura familiar (nada de "mãe/pai solteiro(a)", "pais divorciados", "família reconstituída", "adotado(a)", "lar adotivo")
   - Enquadramento de QI (nada de "QI", "superdotado", "lento", "déficit", "atrasado em relação aos colegas")
5. As versões de NÃO ADMITIR e LISTA DE ESPERA DEVEM ser voltadas para o futuro — focadas em ajuste, não em déficit.
6. Escreva em terceira pessoa ("${inputs.candidateFirstName}", "o(a) estudante", "ele(a)"). Não use segunda pessoa.
7. Esta justificativa deve ser autossuficiente e defensável se questionada por um responsável, membro do conselho ou advogado.

Produza APENAS o parágrafo de justificativa. Sem preâmbulo, sem ressalvas, sem markdown.`;
  }

  const missionLine = inputs.missionStatement?.trim()
    ? `The school's mission: "${inputs.missionStatement.trim()}"`
    : `The school's mission statement is not on file; phrase rationale around ${inputs.schoolName}'s program and cohort fit without inventing mission language.`;

  const decisionFraming =
    decision === "admit"
      ? "This is an ADMIT version — write a positive, welcoming rationale that affirms fit."
      : decision === "waitlist"
        ? "This is a WAITLIST version — write a balanced rationale that acknowledges strengths while explaining that the admissions team is continuing to review the cohort. Forward-looking."
        : "This is a DECLINE version — write a forward-looking rationale that focuses on fit, not deficit. Respectful and definitive. Never apologize for the decision.";

  return `You are drafting an admissions decision rationale for ${inputs.schoolName} — specifically the ${decision.toUpperCase()} version for a student named ${inputs.candidateFirstName} applying to Grade ${inputs.gradeApplyingTo}.

${decisionFraming}

${missionLine}

EVIDENCE FROM THE ASSESSMENT:
- Top strengths observed: ${inputs.topStrengths.join(", ") || "(none surfaced)"}
- Areas still developing: ${inputs.developingAreas.join(", ") || "(none surfaced)"}
- Behavioral observations: ${inputs.behavioralEvidence.length > 0 ? inputs.behavioralEvidence.join("; ") : "(no notable behavioral signals)"}

CONSTRAINTS (strict):
1. 3–5 sentences total. No lists, no headings, no sign-off.
2. Reference SPECIFIC evidence from the assessment above — never generic traits.
3. Phrasing must tie to the school's mission or cohort fit where possible.
4. Parent-safe: do NOT include any of the following:
   - Comparisons to other applicants or peers (no "compared to", "better/worse than", "above/below average", percentile or quartile language)
   - Protected-class references (race, ethnicity, religion, national origin, sexual orientation, gender identity)
   - Medical or disability speculation (no "diagnosis", "disorder", "special needs", "ADHD", "autism", "dyslexia", "IEP", "504 plan", "neurodivergent", "mental health")
   - Financial commentary (no "financial aid", "tuition", "income", "afford", "socio-economic")
   - Family-structure commentary (no "single parent", "divorced", "two-parent", "stepfamily", "adopted", "foster")
   - IQ-style framing (no "IQ", "gifted", "slow learner", "deficit", "behind peers")
5. Decline and waitlist versions MUST be forward-looking — focused on fit, not deficit.
6. Write in third person ("${inputs.candidateFirstName}", "the student", "they"). Do not use second person.
7. This rationale must stand alone and be defensible if challenged by a parent, board member, or attorney.

Output ONLY the rationale paragraph. No preamble, no caveats, no markdown.`;
}

// ---- Single-decision generation with retry-on-guardrail-rejection ---------

async function generateOneDecision(
  decision: DecisionType,
  inputs: GenerationInputs,
  locale: Locale,
): Promise<GenerationAttempt> {
  const client = getAnthropicClient();
  const rejected: GenerationAttempt["rejected"] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_DECISION; attempt++) {
    let text: string;
    try {
      const response = await withRetry(() =>
        client.messages.create({
          model: DEFENSIBLE_LANGUAGE_MODEL,
          max_tokens: 400,
          messages: [{ role: "user", content: buildPrompt(decision, inputs, locale) }],
        }),
      );
      const content = response.content[0];
      if (!content || content.type !== "text") {
        // Unexpected non-text response — skip this attempt, try again.
        continue;
      }
      text = content.text.trim();
    } catch {
      // Network / API failure — count as an attempt and continue.
      continue;
    }

    const check: GuardrailResult = validateAgainstGuardrails(text);
    if (check.ok) {
      return {
        decision,
        attempts: attempt,
        rejected,
        final_text: text,
        fallback_used: false,
      };
    }
    rejected.push({
      phrase: check.rejected_phrase ?? "",
      category: check.category ?? "",
      text,
    });
  }

  // All attempts exhausted — ship the safe template. Guaranteed to pass
  // validateAgainstGuardrails() (covered by a unit test).
  return {
    decision,
    attempts: MAX_ATTEMPTS_PER_DECISION,
    rejected,
    final_text: safeFallbackTemplate(decision, inputs, locale),
    fallback_used: true,
  };
}

// ---- Public API -----------------------------------------------------------

export interface GenerationResult {
  cache: DefensibleLanguageCache;
  perDecision: GenerationAttempt[];
}

export async function generateDefensibleLanguage(
  inputs: GenerationInputs,
  localeOverride?: Locale,
): Promise<GenerationResult> {
  const locale = localeOverride ?? getLocale();
  const [admit, waitlist, decline] = await Promise.all([
    generateOneDecision("admit", inputs, locale),
    generateOneDecision("waitlist", inputs, locale),
    generateOneDecision("decline", inputs, locale),
  ]);

  const cache: DefensibleLanguageCache = {
    admit: admit.final_text,
    waitlist: waitlist.final_text,
    decline: decline.final_text,
    edited_versions: [],
    generated_at: new Date().toISOString(),
    signal_snapshot_hash: computeSignalSnapshotHash(inputs.signalSnapshot),
    model: DEFENSIBLE_LANGUAGE_MODEL,
    prompt_version: DEFENSIBLE_LANGUAGE_PROMPT_VERSION,
    fallback_used: admit.fallback_used || waitlist.fallback_used || decline.fallback_used,
    attempts: {
      admit: admit.attempts,
      waitlist: waitlist.attempts,
      decline: decline.attempts,
    },
  };

  return { cache, perDecision: [admit, waitlist, decline] };
}
