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

  const { session_id, scores, features } = await req.json();
  if (!session_id) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  const client = getAnthropicClient();

  // Get session + candidate + tenant
  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("tenant_id, candidate_id, grade_band")
    .eq("id", session_id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("first_name, last_name, preferred_language, grade_applying_to")
    .eq("id", session.candidate_id)
    .single();

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name")
    .eq("id", session.tenant_id)
    .single();

  const language = (candidate?.preferred_language ?? "en") as "en" | "pt";
  const langInstruction =
    language === "pt"
      ? "IMPORTANT: Write entirely in Brazilian Portuguese."
      : "";

  const candidateName = `${candidate?.first_name ?? "Student"} ${candidate?.last_name ?? ""}`.trim();
  const gradeBand = session.grade_band;

  // Build score summary for prompts
  const scoreLines = Object.entries(scores ?? {})
    .map(
      ([dim, s]: [string, unknown]) =>
        `- ${dim}: ${(s as { score: number; rationale: string }).score}/100 — ${(s as { score: number; rationale: string }).rationale}`
    )
    .join("\n");

  const responseSummary = (features?.responses ?? [])
    .map(
      (r: { title: string; response_body: string }) =>
        `### ${r.title}\n${r.response_body.slice(0, 400)}`
    )
    .join("\n\n");

  const version = await getLatestVersion("reading"); // Use any version for narrative runs

  // 1. Internal narrative
  const internalRun = version
    ? await createAiRun({
        session_id,
        tenant_id: session.tenant_id,
        ai_version_id: version.id,
        run_type: "narrative_internal",
        inputs: { scores, features: features?.responses?.length },
      })
    : null;

  let internalNarrative = "";
  try {
    const internalRes = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      temperature: 0.4,
      system: `You are an admissions insight report writer for LIFT, a non-diagnostic admissions platform used by ${tenant?.name ?? "the school"}. Write a professional internal report for admissions staff.

NON-DIAGNOSTIC DISCLAIMER: This report describes how the student approached learning tasks. It does not constitute a diagnosis, clinical assessment, or prediction of academic performance.

Structure:
1. Opening disclaimer (one line)
2. Executive summary (2-3 sentences)
3. Dimension-by-dimension analysis (reference specific quotes from responses — use brief phrases in quotation marks)
4. Confidence notes and caution flags
5. Transition fit indicators: recommended environment pace (accelerated/standard/supported), support level needs
6. Overall recommendation context

Grade band: ${gradeBand}. Candidate: ${candidateName}, applying to grade ${candidate?.grade_applying_to ?? "N/A"}.
${langInstruction}`,
      messages: [
        {
          role: "user",
          content: `Dimension scores:\n${scoreLines}\n\nStudent responses:\n${responseSummary}\n\nBehavioral features:\n- Word count: ${features?.total_word_count ?? "N/A"}\n- Avg latency: ${features?.avg_response_latency_ms ?? "N/A"}ms\n- Hints used: ${features?.hint_count ?? 0}\n- Revision depth: ${features?.avg_revision_depth ?? 0}%\n- Focus lost: ${features?.focus_lost_count ?? 0}\n- Confidence flags: ${features?.low_confidence_flags?.join(", ") || "none"}\n- Pattern flags: ${features?.unusual_pattern_flags?.join(", ") || "none"}`,
        },
      ],
    });

    internalNarrative =
      internalRes.content[0].type === "text" ? internalRes.content[0].text : "";
    if (internalRun)
      await completeAiRun(internalRun.id, internalNarrative, "complete");
  } catch (err) {
    if (internalRun) await completeAiRun(internalRun.id, String(err), "failed");
  }

  // 2. Family summary
  const familyRun = version
    ? await createAiRun({
        session_id,
        tenant_id: session.tenant_id,
        ai_version_id: version.id,
        run_type: "narrative_family",
        inputs: { scores },
      })
    : null;

  let familyNarrative = "";
  try {
    const familyRes = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      temperature: 0.5,
      system: `You are writing a warm, encouraging summary for the family of a student who completed the LIFT admissions experience at ${tenant?.name ?? "the school"}.

NON-DIAGNOSTIC DISCLAIMER: Start with: "This summary describes how your child approached learning tasks. It is not a diagnosis or prediction."

Guidelines:
- Use plain language, warm tone, no jargon
- Describe strengths and areas where the student might benefit from support
- Do NOT include any scores or numbers
- Prose only, 3-4 paragraphs
- Use the student's first name: ${candidate?.first_name ?? "your child"}
${langInstruction}`,
      messages: [
        {
          role: "user",
          content: `Dimension scores (for your reference only — do not include in output):\n${scoreLines}`,
        },
      ],
    });

    familyNarrative =
      familyRes.content[0].type === "text" ? familyRes.content[0].text : "";
    if (familyRun)
      await completeAiRun(familyRun.id, familyNarrative, "complete");
  } catch (err) {
    if (familyRun) await completeAiRun(familyRun.id, String(err), "failed");
  }

  // 3. Placement guidance
  const placementRun = version
    ? await createAiRun({
        session_id,
        tenant_id: session.tenant_id,
        ai_version_id: version.id,
        run_type: "narrative_placement",
        inputs: { scores },
      })
    : null;

  let placementGuidance = "";
  try {
    const placementRes = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 512,
      temperature: 0.3,
      system: `You are writing brief placement guidance for grade deans and support staff at ${tenant?.name ?? "the school"}.

NON-DIAGNOSTIC DISCLAIMER: Start with a brief disclaimer that this is not a diagnostic assessment.

Structure:
1. Support level recommendation: one of "Independent", "Standard Support", or "Enhanced Support"
2. 3-5 bullet suggestions for onboarding or placement consideration
3. Any specific considerations for the student's grade band (${gradeBand})

Student: ${candidateName}, applying to grade ${candidate?.grade_applying_to ?? "N/A"}.
${langInstruction}`,
      messages: [
        {
          role: "user",
          content: `Dimension scores:\n${scoreLines}\n\nKey signals: word count ${features?.total_word_count ?? "N/A"}, revision depth ${features?.avg_revision_depth ?? 0}%, hints used ${features?.hint_count ?? 0}`,
        },
      ],
    });

    placementGuidance =
      placementRes.content[0].type === "text"
        ? placementRes.content[0].text
        : "";
    if (placementRun)
      await completeAiRun(placementRun.id, placementGuidance, "complete");
  } catch (err) {
    if (placementRun)
      await completeAiRun(placementRun.id, String(err), "failed");
  }

  // Update insight_profiles
  await supabaseAdmin
    .from("insight_profiles")
    .update({
      internal_narrative: internalNarrative,
      family_narrative: familyNarrative,
      placement_guidance: placementGuidance,
    })
    .eq("session_id", session_id);

  return NextResponse.json({
    internal_narrative: internalNarrative.length,
    family_narrative: familyNarrative.length,
    placement_guidance: placementGuidance.length,
  });
}
