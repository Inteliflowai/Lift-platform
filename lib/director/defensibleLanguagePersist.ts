// Shared helper for generating, persisting, and auditing defensible language.
// Called by:
//   - pipeline step 5b on session completion (trigger: "pipeline")
//   - manual regenerate POST route (trigger: "manual")
//
// Returns the persisted cache (or null on skip). Never throws — callers use
// the returned value to decide whether to surface an error.

import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import {
  generateDefensibleLanguage,
  type DefensibleLanguageCache,
  type GenerationInputs,
} from "@/lib/ai/defensibleLanguage";
import {
  computeSignalSnapshotVector,
  normalizedDistanceFromVectors,
  type SignalSnapshot,
} from "@/lib/ai/signalHash";

// Drift threshold for auto-regeneration: 10% normalized L2 distance.
// Below this, cached language is considered current. See signalHash tests
// for the boundary semantics.
const DRIFT_THRESHOLD = 0.1;

type Trigger = "pipeline" | "manual";

interface PersistOptions {
  candidateId: string;
  actorId?: string | null;
  trigger: Trigger;
  // If true, skip regeneration when cache exists and signal hash has not drifted ≥ 10%.
  // Pipeline sets this true; manual sets false.
  respectDriftThreshold?: boolean;
}

interface Profile {
  reading_score: number | null;
  writing_score: number | null;
  reasoning_score: number | null;
  math_score: number | null;
  reflection_score: number | null;
  persistence_score: number | null;
  support_seeking_score: number | null;
  learning_support_signal_id: string | null;
}

const DIM_LABELS: Record<string, string> = {
  reading_score: "reading comprehension",
  writing_score: "written expression",
  reasoning_score: "reasoning",
  math_score: "mathematical reasoning",
  reflection_score: "reflective thinking",
  persistence_score: "persistence",
  support_seeking_score: "asking for support when needed",
};

const SIGNAL_HUMANIZATION: Record<string, string> = {
  extended_reading_time: "took additional time on dense reading passages",
  repeated_passage_rereading: "re-read passages multiple times before responding",
  high_written_expression_revision: "revised written responses extensively",
  reasoning_expression_gap: "reasoned strongly but expressed those ideas more tentatively in writing",
  limited_written_output: "produced shorter written responses than typical at this grade",
  variable_task_pacing: "worked at variable pace across tasks",
  task_completion_difficulty: "worked to finish some tasks within the available time",
  low_support_seeking_under_challenge: "worked independently rather than seeking hints under challenge",
  limited_metacognitive_expression: "focused on task answers rather than explaining process",
};

function pickTopDimensions(
  profile: Profile,
  side: "top" | "bottom",
  n: number,
): string[] {
  const entries = (Object.entries(profile) as Array<[string, number | null]>)
    .filter(([k, v]) => k in DIM_LABELS && typeof v === "number")
    .sort(([, a], [, b]) =>
      side === "top" ? (b as number) - (a as number) : (a as number) - (b as number),
    )
    .slice(0, n);
  return entries.map(([k]) => DIM_LABELS[k]);
}

export async function generateAndPersistDefensibleLanguage(
  options: PersistOptions,
): Promise<{ persisted: DefensibleLanguageCache | null; skipped: boolean; reason?: string }> {
  const { candidateId, actorId = null, trigger, respectDriftThreshold = false } = options;

  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select(
      "id, tenant_id, first_name, last_name, grade_applying_to, defensible_language_cache, signal_snapshot_hash, signal_snapshot_vector",
    )
    .eq("id", candidateId)
    .single();

  if (!candidate) {
    return { persisted: null, skipped: true, reason: "candidate_not_found" };
  }

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name")
    .eq("id", candidate.tenant_id)
    .single();

  const { data: settings } = await supabaseAdmin
    .from("tenant_settings")
    .select("mission_statement")
    .eq("tenant_id", candidate.tenant_id)
    .maybeSingle();

  const { data: profile } = await supabaseAdmin
    .from("insight_profiles")
    .select(
      "reading_score, writing_score, reasoning_score, math_score, reflection_score, persistence_score, support_seeking_score, learning_support_signal_id",
    )
    .eq("candidate_id", candidateId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!profile) {
    return { persisted: null, skipped: true, reason: "no_insight_profile" };
  }

  let enrichedSignals: Array<{ id: string; severity: "advisory" | "notable" | null }> = [];
  if (profile.learning_support_signal_id) {
    const { data: lss } = await supabaseAdmin
      .from("learning_support_signals")
      .select("enriched_signals")
      .eq("id", profile.learning_support_signal_id)
      .maybeSingle();
    if (lss?.enriched_signals && Array.isArray(lss.enriched_signals)) {
      enrichedSignals = lss.enriched_signals.map((s: { id?: string; severity?: string }) => ({
        id: s.id ?? "",
        severity:
          s.severity === "advisory" || s.severity === "notable" ? s.severity : null,
      }));
    }
  }

  const snapshot: SignalSnapshot = {
    dimensionScores: {
      reading: profile.reading_score,
      writing: profile.writing_score,
      reasoning: profile.reasoning_score,
      math: profile.math_score,
      reflection: profile.reflection_score,
      persistence: profile.persistence_score,
      support_seeking: profile.support_seeking_score,
    },
    enrichedSignals,
  };

  // Drift-threshold check — only skip if caller opted in AND a previous cache
  // + stored vector exist. Uses normalized-L2 distance in the 16-dim space.
  const newVector = computeSignalSnapshotVector(snapshot);
  if (respectDriftThreshold && Array.isArray(candidate.signal_snapshot_vector)) {
    const priorCache = (candidate.defensible_language_cache ?? {}) as Partial<DefensibleLanguageCache>;
    if (priorCache.admit && priorCache.waitlist && priorCache.decline) {
      const priorVector = candidate.signal_snapshot_vector as number[];
      const distance = normalizedDistanceFromVectors(priorVector, newVector);
      if (distance < DRIFT_THRESHOLD) {
        return { persisted: null, skipped: true, reason: "drift_below_threshold" };
      }
    }
  }

  const inputs: GenerationInputs = {
    candidateFirstName: candidate.first_name ?? "The candidate",
    candidateLastName: candidate.last_name ?? "",
    gradeApplyingTo: candidate.grade_applying_to ?? "",
    schoolName: tenant?.name ?? "the school",
    missionStatement: settings?.mission_statement ?? null,
    topStrengths: pickTopDimensions(profile, "top", 2),
    developingAreas: pickTopDimensions(profile, "bottom", 1),
    behavioralEvidence: enrichedSignals
      .filter((s) => s.severity !== null)
      .map((s) => SIGNAL_HUMANIZATION[s.id] ?? s.id.replace(/_/g, " ")),
    signalSnapshot: snapshot,
  };

  const { cache, perDecision } = await generateDefensibleLanguage(inputs);

  const priorEdits = (
    (candidate.defensible_language_cache as Partial<DefensibleLanguageCache> | undefined)
      ?.edited_versions ?? []
  ) as DefensibleLanguageCache["edited_versions"];

  const merged: DefensibleLanguageCache = { ...cache, edited_versions: priorEdits };

  await supabaseAdmin
    .from("candidates")
    .update({
      defensible_language_cache: merged,
      defensible_language_updated_at: merged.generated_at,
      signal_snapshot_hash: merged.signal_snapshot_hash,
      signal_snapshot_vector: newVector,
      defensible_language_model: merged.model,
    })
    .eq("id", candidateId);

  const actionType =
    trigger === "pipeline"
      ? "defensible_language.generated"
      : "defensible_language.regenerated_manual";

  await writeAuditLog(supabaseAdmin, {
    tenant_id: candidate.tenant_id,
    actor_id: actorId,
    candidate_id: candidateId,
    action: actionType,
    payload: {
      trigger,
      model: merged.model,
      prompt_version: merged.prompt_version,
      signal_snapshot_hash: merged.signal_snapshot_hash,
      fallback_used: merged.fallback_used,
      attempts: merged.attempts,
    },
  });

  // Per-decision audit rows for guardrail rejections and fallbacks.
  for (const d of perDecision) {
    d.rejected.forEach(async (rej, idx) => {
      await writeAuditLog(supabaseAdmin, {
        tenant_id: candidate.tenant_id,
        actor_id: actorId,
        candidate_id: candidateId,
        action: "defensible_language.guardrail_rejected",
        payload: {
          decision: d.decision,
          rejected_phrase: rej.phrase,
          category: rej.category,
          attempt_number: idx + 1,
          prompt_version: merged.prompt_version,
          model: merged.model,
        },
      });
    });
    if (d.fallback_used) {
      await writeAuditLog(supabaseAdmin, {
        tenant_id: candidate.tenant_id,
        actor_id: actorId,
        candidate_id: candidateId,
        action: "defensible_language.fell_back_to_template",
        payload: {
          decision: d.decision,
          prompt_version: merged.prompt_version,
          model: merged.model,
          total_rejections: d.rejected.length,
        },
      });
    }
  }

  return { persisted: merged, skipped: false };
}
