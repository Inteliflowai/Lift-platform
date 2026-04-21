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
