/**
 * BNCC — Base Nacional Comum Curricular
 * Single source of truth for the 10 competências gerais.
 *
 * Used by:
 *   - PT task templates (scripts/seed-pt-tasks.ts) — each task tagged with the
 *     1-2 competências it exercises
 *   - AI scoring prompts (lib/ai/prompts/*.ts) — when locale=pt, the prompt
 *     cites the relevant competências for each LIFT dimension
 *   - PT narratives (committeeNarrative.ts, defensibleLanguage.ts) — committee
 *     briefs and family rationales reference BNCC framing
 *
 * Reference: http://basenacionalcomum.mec.gov.br/
 *
 * NOTE: Mapping is intentionally at the competências gerais level (10 items)
 * rather than habilidades específicas (hundreds). Per-grade habilidade tagging
 * was rejected in favor of pragmatic high-level alignment that covers the
 * Brazilian private + public school market without requiring per-task curation
 * by year and discipline.
 */

export type BnccCompetenciaId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type BnccCompetencia = {
  id: BnccCompetenciaId;
  /** Short label for UI badges and tags */
  short: string;
  /** Full official name from BNCC */
  name: string;
  /** Brief paraphrase suitable for AI prompts and reports */
  description: string;
};

export const BNCC_COMPETENCIAS_GERAIS: readonly BnccCompetencia[] = [
  {
    id: 1,
    short: "Conhecimento",
    name: "Conhecimento",
    description: "Valorizar e utilizar conhecimentos historicamente construídos sobre o mundo físico, social, cultural e digital.",
  },
  {
    id: 2,
    short: "Pensamento Científico",
    name: "Pensamento Científico, Crítico e Criativo",
    description: "Exercitar a curiosidade intelectual e recorrer à abordagem própria das ciências, incluindo a investigação, a reflexão, a análise crítica e a criatividade.",
  },
  {
    id: 3,
    short: "Repertório Cultural",
    name: "Repertório Cultural",
    description: "Valorizar e fruir as diversas manifestações artísticas e culturais, das locais às mundiais, e participar de práticas diversificadas da produção artístico-cultural.",
  },
  {
    id: 4,
    short: "Comunicação",
    name: "Comunicação",
    description: "Utilizar diferentes linguagens — verbal, corporal, visual, sonora e digital — para se expressar e partilhar informações, experiências, ideias e sentimentos em diferentes contextos.",
  },
  {
    id: 5,
    short: "Cultura Digital",
    name: "Cultura Digital",
    description: "Compreender, utilizar e criar tecnologias digitais de informação e comunicação de forma crítica, significativa, reflexiva e ética.",
  },
  {
    id: 6,
    short: "Trabalho e Projeto de Vida",
    name: "Trabalho e Projeto de Vida",
    description: "Valorizar a diversidade de saberes e vivências culturais e apropriar-se de conhecimentos para entender as relações no mundo do trabalho e fazer escolhas alinhadas ao exercício da cidadania e ao seu projeto de vida.",
  },
  {
    id: 7,
    short: "Argumentação",
    name: "Argumentação",
    description: "Argumentar com base em fatos, dados e informações confiáveis, para formular, negociar e defender ideias, pontos de vista e decisões comuns.",
  },
  {
    id: 8,
    short: "Autoconhecimento e Autocuidado",
    name: "Autoconhecimento e Autocuidado",
    description: "Conhecer-se, apreciar-se e cuidar de sua saúde física e emocional, reconhecendo suas emoções e as dos outros, com autocrítica e capacidade para lidar com elas.",
  },
  {
    id: 9,
    short: "Empatia e Cooperação",
    name: "Empatia e Cooperação",
    description: "Exercitar a empatia, o diálogo, a resolução de conflitos e a cooperação, fazendo-se respeitar e promovendo o respeito ao outro e aos direitos humanos.",
  },
  {
    id: 10,
    short: "Responsabilidade e Cidadania",
    name: "Responsabilidade e Cidadania",
    description: "Agir pessoal e coletivamente com autonomia, responsabilidade, flexibilidade, resiliência e determinação, tomando decisões com base em princípios éticos, democráticos, inclusivos, sustentáveis e solidários.",
  },
] as const;

const BY_ID = new Map(BNCC_COMPETENCIAS_GERAIS.map((c) => [c.id, c]));

export function getBncc(id: BnccCompetenciaId): BnccCompetencia {
  const c = BY_ID.get(id);
  if (!c) throw new Error(`Unknown BNCC competência: ${id}`);
  return c;
}

/**
 * Returns "Comp. 2 (Pensamento Científico) e Comp. 7 (Argumentação)" for [2, 7].
 * Used in AI prompts so Claude has the names, not just numbers.
 */
export function describeBnccList(ids: readonly BnccCompetenciaId[]): string {
  if (ids.length === 0) return "";
  return ids
    .map((id) => {
      const c = getBncc(id);
      return `Comp. ${c.id} (${c.short})`;
    })
    .join(ids.length === 2 ? " e " : ", ");
}

/**
 * Maps each LIFT scoring dimension to the BNCC competências gerais it most
 * directly exercises. Intentionally minimal (1-2 per dimension) so PT prompts
 * stay readable and the framing matches what each task actually measures.
 */
export const LIFT_DIMENSION_TO_BNCC: Record<string, readonly BnccCompetenciaId[]> = {
  reading: [2, 4],          // Pensamento Crítico + Comunicação
  writing: [4, 7],          // Comunicação + Argumentação
  reasoning: [2, 7],        // Pensamento Crítico + Argumentação
  math: [2, 7],             // Pensamento Crítico (científico) + Argumentação
  reflection: [8, 2],       // Autoconhecimento + Pensamento Crítico
  persistence: [6, 10],     // Projeto de Vida + Responsabilidade
  support_seeking: [9, 6],  // Empatia/Cooperação + Projeto de Vida
};
