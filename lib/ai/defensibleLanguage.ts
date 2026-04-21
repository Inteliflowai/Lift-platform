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

// Sonnet 4.6 — tightly constrained output, much cheaper than Opus at the
// same quality for this specific task. Keep Opus on the main scoring and
// narrative pipeline; defensible language is a volume feature where Sonnet
// fits better.
export const DEFENSIBLE_LANGUAGE_MODEL = "claude-sonnet-4-6";

// Prompt version — bumps trigger cache regeneration on next pipeline run.
// Update when the prompt text, constraints, or output format changes in a
// way that would materially alter past outputs.
export const DEFENSIBLE_LANGUAGE_PROMPT_VERSION = "dl-v1.0";

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
): string {
  const first = inputs.candidateFirstName || "The candidate";
  const school = inputs.schoolName || "the school";
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

function buildPrompt(decision: DecisionType, inputs: GenerationInputs): string {
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
          messages: [{ role: "user", content: buildPrompt(decision, inputs) }],
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
    final_text: safeFallbackTemplate(decision, inputs),
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
): Promise<GenerationResult> {
  const [admit, waitlist, decline] = await Promise.all([
    generateOneDecision("admit", inputs),
    generateOneDecision("waitlist", inputs),
    generateOneDecision("decline", inputs),
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
