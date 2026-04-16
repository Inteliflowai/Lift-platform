import { supabaseAdmin } from "@/lib/supabase/admin";

export type TRIResult = {
  tri_score: number;
  tri_label: "emerging" | "developing" | "ready" | "thriving";
  tri_confidence: "low" | "moderate" | "high";
  tri_summary: string;
};

export async function computeTRI(profileId: string): Promise<TRIResult> {
  const { data: profile } = await supabaseAdmin
    .from("insight_profiles")
    .select(
      "reading_score, writing_score, reasoning_score, math_score, reflection_score, persistence_score, support_seeking_score, overall_confidence, session_id, learning_support_signal_id"
    )
    .eq("id", profileId)
    .single();

  if (!profile) throw new Error("Profile not found");

  // Get session completion %
  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("completion_pct")
    .eq("id", profile.session_id)
    .single();

  const completionPct = Number(session?.completion_pct ?? 0);

  // Get support signal level
  let supportLevel: "none" | "watch" | "recommend_screening" = "none";
  if (profile.learning_support_signal_id) {
    const { data: ls } = await supabaseAdmin
      .from("learning_support_signals")
      .select("support_indicator_level")
      .eq("id", profile.learning_support_signal_id)
      .single();
    supportLevel =
      (ls?.support_indicator_level as typeof supportLevel) ?? "none";
  }

  // Weighted average (7 dimensions)
  const reading = Number(profile.reading_score ?? 0);
  const writing = Number(profile.writing_score ?? 0);
  const reasoning = Number(profile.reasoning_score ?? 0);
  const math = Number(profile.math_score ?? 0);
  const reflection = Number(profile.reflection_score ?? 0);
  const persistence = Number(profile.persistence_score ?? 0);
  const supportSeeking = Number(profile.support_seeking_score ?? 0);

  let raw =
    reading * 0.15 +
    writing * 0.15 +
    reasoning * 0.15 +
    math * 0.15 +
    reflection * 0.15 +
    persistence * 0.15 +
    supportSeeking * 0.1;

  // Confidence adjustment
  const confidence = Number(profile.overall_confidence ?? 0);
  if (confidence < 50) {
    raw *= 0.9;
  } else if (confidence < 75) {
    raw *= 0.95;
  }

  // Support signal adjustment
  const sl = supportLevel as string;
  if (sl === "recommend_screening") {
    raw *= 0.92;
  } else if (sl === "watch") {
    raw *= 0.97;
  }

  // Clamp
  const tri_score = Math.round(Math.max(0, Math.min(100, raw)) * 10) / 10;

  // Label
  const tri_label: TRIResult["tri_label"] =
    tri_score >= 80
      ? "thriving"
      : tri_score >= 60
      ? "ready"
      : tri_score >= 40
      ? "developing"
      : "emerging";

  // Confidence level
  const tri_confidence: TRIResult["tri_confidence"] =
    confidence >= 75 && completionPct === 100
      ? "high"
      : confidence >= 50 || completionPct >= 80
      ? "moderate"
      : "low";

  // Summary
  const summaries: Record<TRIResult["tri_label"], string> = {
    emerging:
      "This student shows early readiness signals and would benefit from a structured transition support plan.",
    developing:
      "This student demonstrates growing readiness and would likely thrive with targeted onboarding support.",
    ready:
      "This student shows solid readiness for transition with standard school support structures in place.",
    thriving:
      "This student demonstrates strong readiness signals across multiple dimensions.",
  };

  let tri_summary = summaries[tri_label];
  if (tri_confidence === "low") {
    tri_summary +=
      " (Note: session data was limited — interpret with additional context.)";
  }

  // Update profile
  await supabaseAdmin
    .from("insight_profiles")
    .update({ tri_score, tri_label, tri_confidence, tri_summary })
    .eq("id", profileId);

  return { tri_score, tri_label, tri_confidence, tri_summary };
}
