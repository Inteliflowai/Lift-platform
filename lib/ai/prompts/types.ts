import { LIFT_DIMENSION_TO_BNCC, describeBnccList } from "@/lib/bncc/competencias";

export type PromptInput = {
  features: {
    sentence_count?: number;
    avg_sentence_length?: number;
    lexical_diversity?: number;
    evidence_marker_count?: number;
    revision_depth?: number;
    word_count?: number;
    response_latency_ms?: number;
    time_on_text_ms?: number;
    hint_count?: number;
    focus_lost_count?: number;
  };
  responses: { task_type: string; title: string; response_body: string }[];
  gradeBand: string;
  language: "en" | "pt";
};

export type PromptPair = {
  system: string;
  user: string;
};

const LANG_INSTRUCTION = {
  en: "",
  pt: "IMPORTANT: Respond entirely in Brazilian Portuguese.",
};

export function langNote(language: "en" | "pt"): string {
  return LANG_INSTRUCTION[language];
}

/**
 * Returns a BNCC framing addendum for PT prompts; empty string for EN.
 *
 * Cites the BNCC competências gerais this LIFT dimension most directly
 * exercises so Claude judges PT responses against the Brazilian curriculum
 * framework, not US/generic norms. Mapping in lib/bncc/competencias.ts.
 */
export function bnccNote(language: "en" | "pt", liftDimension: string): string {
  if (language !== "pt") return "";
  const ids = LIFT_DIMENSION_TO_BNCC[liftDimension];
  if (!ids || ids.length === 0) return "";
  return `Contexto BNCC: esta dimensão está alinhada às competências gerais ${describeBnccList(ids)} da Base Nacional Comum Curricular. Avalie a resposta considerando se evidencia desenvolvimento dessas competências no nível esperado para a série.`;
}

export const SCORE_FORMAT = `
Respond in this exact JSON format:
{
  "score": <number 0-100>,
  "confidence": <number 0-100>,
  "rationale": "<2-3 sentence explanation with evidence>"
}
Do not include any text outside the JSON.`;
