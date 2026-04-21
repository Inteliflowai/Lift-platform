// Defensible-language guardrail. Pure, zero-dep, unit-testable.
//
// Any generation passing through validateAgainstGuardrails() must not contain
// phrasing that exposes the school to challenges from parents, board members,
// or attorneys. Categories cover: comparative framing, protected-class
// references, medical/disability speculation, financial commentary,
// family-structure commentary, and IQ/deficit framing.
//
// False-positive tuning is intentional — we prefer to reject legitimate
// phrasing and regenerate than to ship language that could be challenged.
// Every rejection is audit-logged (action: defensible_language.guardrail_rejected)
// with rejected_phrase + category so the starter list can be tightened over
// time based on real pilot data.

export type ForbiddenCategory =
  | "comparative"
  | "protected_class"
  | "medical_disability"
  | "financial"
  | "family_structure"
  | "iq_deficit";

export interface ForbiddenPattern {
  pattern: RegExp;
  category: ForbiddenCategory;
  note?: string;
}

// Word-boundary matches on common phrasing. Case-insensitive.
export const FORBIDDEN_PATTERNS: readonly ForbiddenPattern[] = [
  // Comparative framing — never compare one candidate to another.
  { pattern: /\bcompared to\b/i,                        category: "comparative" },
  { pattern: /\brelative to (?:other|the other|their peers|peers)\b/i, category: "comparative" },
  { pattern: /\bbetter than (?:most|other applicants|peers)\b/i, category: "comparative" },
  { pattern: /\b(?:stronger|weaker) than (?:most|peers|other|others|their peers)\b/i, category: "comparative" },
  { pattern: /\bin the (?:top|bottom) (?:tier|percentile|half|quartile)\b/i, category: "comparative" },
  { pattern: /\bagainst (?:the |other )?(?:applicants|candidates)\b/i, category: "comparative" },
  { pattern: /\boutperforms?\b/i,                       category: "comparative" },

  // Protected-class — never reference race, ethnicity, religion, national
  // origin, or sexual orientation in admissions language.
  { pattern: /\b(?:race|racial|ethnicity|ethnic background)\b/i, category: "protected_class" },
  { pattern: /\b(?:religion|religious|faith background)\b/i, category: "protected_class" },
  { pattern: /\bnational origin\b/i,                    category: "protected_class" },
  { pattern: /\b(?:gay|lesbian|bisexual|transgender|LGBTQ\+?|sexual orientation|gender identity)\b/i, category: "protected_class" },

  // Medical / disability — no clinical speculation. LIFT is explicitly
  // non-diagnostic. Signals describe behaviors, never conditions.
  { pattern: /\bdiagnos(?:is|ed|tic)\b/i,               category: "medical_disability" },
  { pattern: /\bdisabilit(?:y|ies)\b/i,                 category: "medical_disability" },
  { pattern: /\bdisorder\b/i,                           category: "medical_disability" },
  { pattern: /\bspecial needs\b/i,                      category: "medical_disability" },
  { pattern: /\bADHD|ADD\b/i,                           category: "medical_disability" },
  { pattern: /\bautis(?:m|tic)\b/i,                     category: "medical_disability" },
  { pattern: /\bdyslexi(?:a|c)\b/i,                     category: "medical_disability" },
  { pattern: /\bIEP\b/,                                 category: "medical_disability" },
  { pattern: /\b504 (?:plan|accommodation)\b/i,         category: "medical_disability" },
  { pattern: /\b(?:neuro-?divergent|neurotypical)\b/i,  category: "medical_disability" },
  { pattern: /\bmental health\b/i,                      category: "medical_disability" },

  // Financial — never reference ability to pay, aid status, or family income.
  { pattern: /\bfinancial aid\b/i,                      category: "financial" },
  { pattern: /\btuition (?:assistance|cost)\b/i,        category: "financial" },
  { pattern: /\b(?:low|high|modest) income\b/i,         category: "financial" },
  { pattern: /\baffluent\b/i,                           category: "financial" },
  { pattern: /\bcannot afford\b/i,                      category: "financial" },
  { pattern: /\bscholarship need\b/i,                   category: "financial" },
  { pattern: /\bsocio-?economic\b/i,                    category: "financial" },

  // Family-structure — never reference parental status or family composition.
  { pattern: /\bsingle (?:parent|mother|father)\b/i,    category: "family_structure" },
  { pattern: /\bdivorced (?:parents|family)\b/i,        category: "family_structure" },
  { pattern: /\btwo-parent (?:home|household)\b/i,      category: "family_structure" },
  { pattern: /\bstepfamily\b/i,                         category: "family_structure" },
  { pattern: /\b(?:adopted|adoptive)\b/i,               category: "family_structure" },
  { pattern: /\bfoster (?:care|family|home)\b/i,        category: "family_structure" },

  // IQ / deficit framing — never use intelligence-measurement language or
  // deficit-framed descriptors.
  { pattern: /\bIQ\b/,                                  category: "iq_deficit" },
  { pattern: /\b(?:below|above) average\b/i,            category: "iq_deficit" },
  { pattern: /\bbehind (?:peers|grade level|their peers)\b/i, category: "iq_deficit" },
  { pattern: /\bslow learner\b/i,                       category: "iq_deficit" },
  { pattern: /\bgifted\b/i,                             category: "iq_deficit" },
  { pattern: /\bdeficit\b/i,                            category: "iq_deficit" },
  { pattern: /\bintellectual(?:ly)? (?:gifted|limited|impaired)\b/i, category: "iq_deficit" },

  // ----------------------------------------------------------------------
  // PORTUGUESE (Brazilian) variants
  // ----------------------------------------------------------------------
  // Mirrors the categories above for the EduInsights/PT deployment. Word
  // boundaries (\b) work even with internal diacritics (ç, ã, õ, é) because
  // PT words still start and end with ASCII letters in nearly all cases.
  // Patterns are case-insensitive; gender suffix variants (-o/-a, -os/-as)
  // are unioned in a single regex where the masculine and feminine forms
  // would otherwise duplicate.

  // Comparative framing (PT)
  // PT contractions: "a + os = aos", "a + as = às", "a + o = ao", "a + a = à".
  // Word boundaries (\b) ensure the longer contractions match before "a"
  // because "a" only matches when followed by non-word char.
  { pattern: /\bcomparad[oa]s? (?:a|ao|aos|à|às|com)\b/i, category: "comparative" },
  { pattern: /\bem compara[çc][ãa]o (?:a|ao|aos|à|às|com)\b/i, category: "comparative" },
  { pattern: /\bem rela[çc][ãa]o (?:a|ao|aos|à|às) (?:outros?|colegas?|pares|demais|outras?|alunos?)\b/i, category: "comparative" },
  { pattern: /\b(?:melhor|pior|superior|inferior) (?:que|do que|a|ao|aos|à|às) (?:os |as )?(?:colegas?|pares|outros?|demais|alunos?|a maioria)\b/i, category: "comparative" },
  { pattern: /\b(?:mais|menos) (?:forte|fraco)s? (?:que|do que|a|ao|aos|à|às) (?:os |as )?(?:colegas?|pares|outros?|demais)\b/i, category: "comparative" },
  { pattern: /\bno (?:n[íi]vel )?(?:topo|superior|inferior) (?:do|de|da)\b/i, category: "comparative" },
  { pattern: /\b(?:no|na) (?:percentil|quartil)\b/i,    category: "comparative" },
  { pattern: /\bsupera (?:os|as)? ?(?:colegas?|pares|outros?|demais)\b/i, category: "comparative" },

  // Protected class (PT)
  { pattern: /\b(?:ra[çc]a|racial|etnia|origem [eé]tnica|background [eé]tnico)\b/i, category: "protected_class" },
  { pattern: /\b(?:religi[ãa]o|religios[oa]s?|f[ée] (?:crist[ãa]|judaica|muçulmana|evang[ée]lica|cat[óo]lica))\b/i, category: "protected_class" },
  { pattern: /\borigem nacional\b/i,                    category: "protected_class" },
  { pattern: /\b(?:gay|l[ée]sbica|bissexual|transg[ée]nero|LGBTQ\+?|orienta[çc][ãa]o sexual|identidade de g[êe]nero)\b/i, category: "protected_class" },

  // Medical / disability (PT)
  { pattern: /\bdiagn[óo]stic[oa]s?\b/i,                category: "medical_disability" },
  { pattern: /\bdiagnosticad[oa]s?\b/i,                 category: "medical_disability" },
  { pattern: /\bdefici[êe]nci(?:a|as)\b/i,              category: "medical_disability" },
  { pattern: /\bdeficient[ea]s?\b/i,                    category: "medical_disability" },
  { pattern: /\b(?:transtorno|dist[úu]rbio)s?\b/i,      category: "medical_disability" },
  { pattern: /\bnecessidades especiais\b/i,             category: "medical_disability" },
  { pattern: /\bTDAH\b/,                                category: "medical_disability" },
  { pattern: /\bautis(?:mo|ta)s?\b/i,                   category: "medical_disability" },
  { pattern: /\bdislex(?:ia|[íi]c[oa])s?\b/i,           category: "medical_disability" },
  { pattern: /\bPEI\b/,                                 category: "medical_disability", note: "Plano Educacional Individualizado" },
  { pattern: /\bplano de (?:adapta[çc][ãa]o|acomoda[çc][ãa]o)\b/i, category: "medical_disability" },
  { pattern: /\bneurodivergent[ea]s?\b/i,               category: "medical_disability" },
  { pattern: /\bsa[úu]de mental\b/i,                    category: "medical_disability" },

  // Financial (PT)
  { pattern: /\bbolsa(?:s)? (?:de )?(?:estudos?|integral|parcial)\b/i, category: "financial" },
  { pattern: /\baux[íi]lio financeiro\b/i,              category: "financial" },
  { pattern: /\b(?:mensalidade|anuidade)s?\b/i,         category: "financial" },
  { pattern: /\b(?:baixa|alta|m[ée]dia) renda\b/i,      category: "financial" },
  { pattern: /\babastad[oa]s?\b/i,                      category: "financial" },
  { pattern: /\b(?:n[ãa]o |sem )(?:pode|podem|tem|t[êe]m) (?:condi[çc][õo]es|como) (?:de )?pagar\b/i, category: "financial" },
  { pattern: /\bnecessidade de bolsa\b/i,               category: "financial" },
  { pattern: /\bsocioecon[ôo]mic[oa]s?\b/i,             category: "financial" },

  // Family structure (PT)
  { pattern: /\b(?:m[ãa]e|pai)s? solteir[oa]s?\b/i,     category: "family_structure" },
  { pattern: /\bpais (?:divorciados?|separados?)\b/i,   category: "family_structure" },
  { pattern: /\b(?:lar|fam[íi]lia|casa) (?:com|de) dois pais\b/i, category: "family_structure" },
  { pattern: /\b(?:fam[íi]lia reconstitu[íi]da|padrasto|madrasta)\b/i, category: "family_structure" },
  { pattern: /\bado(?:tad|tiv)[oa]s?\b/i,               category: "family_structure" },
  { pattern: /\b(?:lar adotivo|ado[çc][ãa]o tempor[áa]ria|fam[íi]lia adotiva)\b/i, category: "family_structure" },

  // IQ / deficit framing (PT)
  { pattern: /\bQI\b/,                                  category: "iq_deficit" },
  { pattern: /\b(?:abaixo|acima) da m[ée]dia\b/i,       category: "iq_deficit" },
  { pattern: /\batrasad[oa]s? (?:em rela[çc][ãa]o (?:aos? |às? )?(?:colegas?|pares)|no n[íi]vel|na s[ée]rie)\b/i, category: "iq_deficit" },
  { pattern: /\b(?:aluno|estudante)s? lent[oa]s?\b/i,   category: "iq_deficit" },
  { pattern: /\b(?:superdotad|talentos|prodígios?)[oa]s?\b/i, category: "iq_deficit" },
  { pattern: /\bd[ée]ficit\b/i,                         category: "iq_deficit" },
  { pattern: /\bintelectualmente (?:superdotad[oa]s?|limitad[oa]s?|comprometid[oa]s?)\b/i, category: "iq_deficit" },
];

export interface GuardrailResult {
  ok: boolean;
  rejected_phrase?: string;
  category?: ForbiddenCategory;
}

export function validateAgainstGuardrails(text: string): GuardrailResult {
  if (!text) return { ok: true };
  for (const { pattern, category } of FORBIDDEN_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return {
        ok: false,
        rejected_phrase: match[0],
        category,
      };
    }
  }
  return { ok: true };
}
