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

export const SCORE_FORMAT = `
Respond in this exact JSON format:
{
  "score": <number 0-100>,
  "confidence": <number 0-100>,
  "rationale": "<2-3 sentence explanation with evidence>"
}
Do not include any text outside the JSON.`;
