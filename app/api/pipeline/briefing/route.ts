import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAnthropicClient, AI_MODEL } from "@/lib/ai/client";
import { getLatestVersion } from "@/lib/ai/versions";
import { createAiRun, completeAiRun } from "@/lib/ai/logger";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { candidate_id, session_id } = await req.json();

  const { data: profile } = await supabaseAdmin
    .from("insight_profiles")
    .select("*")
    .eq("candidate_id", candidate_id)
    .eq("is_final", true)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("first_name, last_name, grade_band, grade_applying_to, preferred_language, tenant_id, cycle_id")
    .eq("id", candidate_id)
    .single();

  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  // Get response samples
  const { data: responses } = await supabaseAdmin
    .from("response_text")
    .select("response_body, task_instances(task_templates(title, task_type))")
    .eq("session_id", session_id)
    .limit(10);

  const responseSamples = (responses ?? []).map((r) => {
    const ti = r.task_instances as unknown as { task_templates: { title: string; task_type: string } };
    return `${ti?.task_templates?.title} (${ti?.task_templates?.task_type}): "${(r.response_body ?? "").slice(0, 150)}..."`;
  }).join("\n");

  // Get learning support
  let lsLevel = "none";
  if (profile.learning_support_signal_id) {
    const { data: ls } = await supabaseAdmin
      .from("learning_support_signals")
      .select("support_indicator_level")
      .eq("id", profile.learning_support_signal_id)
      .single();
    lsLevel = ls?.support_indicator_level ?? "none";
  }

  const lang = candidate.preferred_language === "pt" ? "Respond entirely in Brazilian Portuguese." : "";

  const version = await getLatestVersion("reading");
  const client = getAnthropicClient();

  const run = version ? await createAiRun({
    session_id,
    tenant_id: candidate.tenant_id,
    ai_version_id: version.id,
    run_type: "briefing_generation",
    inputs: { candidate_id },
  }) : null;

  try {
    const res = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      temperature: 0.4,
      system: `You are an experienced admissions consultant reviewing a candidate profile for a ${candidate.grade_band === "6-7" ? "middle school" : "high school"} admissions team. Generate a pre-interview briefing. ${lang}

Output ONLY valid JSON:
{
  "key_observations": ["...", "..."],
  "interview_questions": [{"question": "...", "rationale": "...", "dimension": "..."}],
  "areas_to_explore": ["...", "..."],
  "strengths_to_confirm": ["...", "..."],
  "confidence_explanation": "..."
}

Rules:
- key_observations: 3-5 specific evidence-based observations from the data
- interview_questions: 6-8 questions tailored to THIS candidate. Open-ended, conversational, age-appropriate for grade ${candidate.grade_applying_to}. Map each to a dimension.
- areas_to_explore: 2-4 areas where session data was ambiguous or low-confidence
- strengths_to_confirm: 2-3 strong signals worth validating in person
- confidence_explanation: plain language explaining why confidence is ${profile.tri_confidence ?? "moderate"}`,
      messages: [{
        role: "user",
        content: `Candidate: ${candidate.first_name} ${candidate.last_name}, Grade ${candidate.grade_applying_to} (Band ${candidate.grade_band})
TRI: ${profile.tri_score} (${profile.tri_label}), Confidence: ${profile.tri_confidence}
Reading: ${profile.reading_score}, Writing: ${profile.writing_score}, Reasoning: ${profile.reasoning_score}
Reflection: ${profile.reflection_score}, Persistence: ${profile.persistence_score}, Support Seeking: ${profile.support_seeking_score}
Overall Confidence: ${profile.overall_confidence}%
Support Level: ${lsLevel}

Response Samples:
${responseSamples}

Internal Narrative Summary:
${(profile.internal_narrative as string ?? "").slice(0, 800)}`,
      }],
    });

    const text = res.content[0].type === "text" ? res.content[0].text : "";
    if (run) await completeAiRun(run.id, text, "complete");

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const parsed = JSON.parse(jsonMatch[0]);

    await supabaseAdmin.from("evaluator_briefings").insert({
      candidate_id,
      tenant_id: candidate.tenant_id,
      cycle_id: candidate.cycle_id,
      generated_by_ai_version_id: version?.id,
      key_observations: parsed.key_observations ?? [],
      interview_questions: parsed.interview_questions ?? [],
      areas_to_explore: parsed.areas_to_explore ?? [],
      strengths_to_confirm: parsed.strengths_to_confirm ?? [],
      confidence_explanation: parsed.confidence_explanation ?? "",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (run) await completeAiRun(run.id, String(err), "failed");
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
