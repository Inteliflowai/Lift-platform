import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAnthropicClient, AI_MODEL } from "@/lib/ai/client";
import { getLatestVersion } from "@/lib/ai/versions";
import { createAiRun, completeAiRun } from "@/lib/ai/logger";
import { requireFeature } from "@/lib/licensing/gate";
import { handleLicenseError } from "@/lib/licensing/apiHandler";
import { FEATURES } from "@/lib/licensing/features";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { candidate_id, rubric_id } = await req.json();

  // Get profile
  const { data: profile } = await supabaseAdmin
    .from("insight_profiles")
    .select("*")
    .eq("candidate_id", candidate_id)
    .eq("is_final", true)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  // Get briefing
  const { data: briefing } = await supabaseAdmin
    .from("evaluator_briefings")
    .select("key_observations, areas_to_explore")
    .eq("candidate_id", candidate_id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  // Get rubric submission
  const { data: rubric } = await supabaseAdmin
    .from("interview_rubric_submissions")
    .select("*")
    .eq("id", rubric_id)
    .single();

  // Get any free-text notes
  const { data: notes } = await supabaseAdmin
    .from("interviewer_notes")
    .select("notes")
    .eq("candidate_id", candidate_id)
    .order("created_at", { ascending: false })
    .limit(3);

  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("tenant_id, preferred_language")
    .eq("id", candidate_id)
    .single();

  if (!candidate || !rubric) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  // License gate: evaluator intelligence
  try {
    await requireFeature(candidate.tenant_id, FEATURES.EVALUATOR_INTELLIGENCE);
  } catch (err) {
    const licenseResponse = handleLicenseError(err);
    if (licenseResponse) return licenseResponse;
    throw err;
  }

  const lang = candidate.preferred_language === "pt" ? "Respond in Brazilian Portuguese." : "";
  const version = await getLatestVersion("reading");
  const client = getAnthropicClient();

  const run = version ? await createAiRun({
    session_id: profile?.session_id ?? rubric_id,
    tenant_id: candidate.tenant_id,
    ai_version_id: version.id,
    run_type: "interview_synthesis",
    inputs: { candidate_id, rubric_id },
  }) : null;

  try {
    const res = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1536,
      temperature: 0.4,
      system: `You are an admissions analyst synthesizing a candidate's LIFT session data with their interview observations. Compare signals and identify alignment or divergence. ${lang}

Output ONLY valid JSON:
{
  "confirmations": ["..."],
  "contradictions": ["..."],
  "new_signals": ["..."],
  "synthesis_narrative": "...",
  "updated_support_recommendation": "..."
}`,
      messages: [{
        role: "user",
        content: `SESSION DATA:
TRI: ${profile?.tri_score} (${profile?.tri_label})
Reading: ${profile?.reading_score}, Writing: ${profile?.writing_score}, Reasoning: ${profile?.reasoning_score}
Reflection: ${profile?.reflection_score}, Persistence: ${profile?.persistence_score}
Confidence: ${profile?.overall_confidence}%
Placement guidance: ${(profile?.placement_guidance as string ?? "").slice(0, 300)}

Key observations from briefing: ${(briefing?.key_observations ?? []).join("; ")}

INTERVIEW DATA:
Verbal Reasoning: ${rubric.verbal_reasoning_score}/5
Communication: ${rubric.communication_score}/5
Self-Awareness: ${rubric.self_awareness_score}/5
Curiosity: ${rubric.curiosity_score}/5
Resilience: ${rubric.resilience_score}/5
Overall Impression: ${rubric.overall_impression ?? ""}
Standout Moments: ${rubric.standout_moments ?? ""}
Concerns: ${rubric.concerns ?? ""}
Recommendation: ${rubric.recommendation}

Additional notes: ${(notes ?? []).map((n) => n.notes).join(" | ").slice(0, 500)}`,
      }],
    });

    const text = res.content[0].type === "text" ? res.content[0].text : "";
    if (run) await completeAiRun(run.id, text, "complete");

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON");
    const parsed = JSON.parse(jsonMatch[0]);

    await supabaseAdmin.from("interview_syntheses").insert({
      candidate_id,
      tenant_id: candidate.tenant_id,
      ai_version_id: version?.id,
      confirmations: parsed.confirmations ?? [],
      contradictions: parsed.contradictions ?? [],
      new_signals: parsed.new_signals ?? [],
      synthesis_narrative: parsed.synthesis_narrative ?? "",
      updated_support_recommendation: parsed.updated_support_recommendation ?? "",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (run) await completeAiRun(run.id, String(err), "failed");
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
