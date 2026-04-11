import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAnthropicClient, AI_MODEL } from "@/lib/ai/client";
import { withRetry } from "@/lib/ai/retry";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { candidate_id, session_id } = await req.json();
  if (!candidate_id) {
    return NextResponse.json({ error: "candidate_id required" }, { status: 400 });
  }

  // Load candidate + profile
  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("*, tenant_id")
    .eq("id", candidate_id)
    .single();

  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  // Load insight profile
  const profileQuery = supabaseAdmin
    .from("insight_profiles")
    .select("*")
    .eq("candidate_id", candidate_id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (session_id) profileQuery.eq("session_id", session_id);

  const { data: profiles } = await profileQuery;
  const profile = profiles?.[0];

  // Load learning support signals
  const { data: signals } = await supabaseAdmin
    .from("learning_support_signals")
    .select("*")
    .eq("candidate_id", candidate_id)
    .order("created_at", { ascending: false })
    .limit(1);

  const supportSignals = signals?.[0];

  // Load school's support resources
  const { data: resources } = await supabaseAdmin
    .from("support_resources")
    .select("*")
    .eq("tenant_id", candidate.tenant_id)
    .eq("is_active", true);

  // Filter resources by candidate grade if available
  const gradeBand = profile?.grade_band ?? candidate.grade_applying;
  const availableResources = (resources ?? []).filter((r) => {
    if (!r.available_for_grades || r.available_for_grades.length === 0) return true;
    return r.available_for_grades.includes(gradeBand);
  });

  // Build Claude prompt
  const system = `You are an experienced school transition counselor specializing in K-12 admissions onboarding.
You generate structured 90-day support plans for newly admitted students based on their assessment insights.

Your plans must be:
- Practical and actionable for school staff
- Sensitive to the student's specific learning profile
- Mapped to the school's available support resources
- Organized in phases: Week 1-2 (immediate), Month 1 (settling), Month 2-3 (sustained)

Output valid JSON only, no markdown.`;

  const profileSummary = profile
    ? `Reading: ${profile.reading_score}/100, Writing: ${profile.writing_score}/100, Reasoning: ${profile.reasoning_score}/100, Reflection: ${profile.reflection_score}/100, Persistence: ${profile.persistence_score}/100, Support Seeking: ${profile.support_seeking_score}/100. Overall confidence: ${profile.overall_confidence}%. TRI: ${profile.tri_score ?? "N/A"}.`
    : "No assessment profile available.";

  const signalsSummary = supportSignals
    ? `Learning support level: ${supportSignals.support_level}. Flags: ${JSON.stringify(supportSignals.flags ?? {})}.`
    : "No learning support signals.";

  const resourceList = availableResources.length > 0
    ? availableResources.map((r) => `- ${r.name} (${r.resource_type}): ${r.description || "No description"}`).join("\n")
    : "No specific resources configured. Suggest general support categories.";

  const userPrompt = `Generate a 90-day onboarding support plan for this newly admitted student.

Student: ${candidate.first_name} ${candidate.last_name}
Grade: ${gradeBand || "Unknown"}
Gender: ${candidate.gender || "Not specified"}

Assessment Profile:
${profileSummary}

Learning Support Signals:
${signalsSummary}

School's Available Support Resources:
${resourceList}

Return JSON with these exact fields:
{
  "support_level": "independent" | "standard" | "enhanced" | "intensive",
  "week_1_2_actions": ["action 1", "action 2", ...],
  "month_1_priorities": ["priority 1", "priority 2", ...],
  "month_2_3_checkpoints": ["checkpoint 1", "checkpoint 2", ...],
  "recommended_resources": [{"name": "...", "resource_type": "...", "rationale": "...", "priority": "high" | "medium" | "low"}],
  "academic_accommodations": ["accommodation 1", ...],
  "social_integration_notes": "paragraph about social integration approach",
  "flag_for_early_review": true/false,
  "plan_narrative": "2-3 paragraph narrative for the grade dean about this student's transition needs",
  "family_welcome_note": "warm, encouraging paragraph for the family about onboarding support"
}`;

  try {
    const client = getAnthropicClient();
    const response = await withRetry(() =>
      client.messages.create({
        model: AI_MODEL,
        max_tokens: 2048,
        temperature: 0.4,
        system,
        messages: [{ role: "user", content: userPrompt }],
      })
    );

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    const plan = JSON.parse(jsonMatch[0]);

    // Generate checklist items from week_1_2_actions and month_1_priorities
    const checklistItems = [
      ...(plan.week_1_2_actions ?? []).map((action: string) => ({
        id: crypto.randomUUID(),
        text: action,
        phase: "week_1_2",
        completed: false,
        completed_at: null,
        completed_by: null,
      })),
      ...(plan.month_1_priorities ?? []).map((priority: string) => ({
        id: crypto.randomUUID(),
        text: priority,
        phase: "month_1",
        completed: false,
        completed_at: null,
        completed_by: null,
      })),
    ];

    // Insert support plan
    const { data: inserted, error } = await supabaseAdmin
      .from("support_plans")
      .insert({
        candidate_id,
        tenant_id: candidate.tenant_id,
        support_level: plan.support_level,
        week_1_2_actions: plan.week_1_2_actions,
        month_1_priorities: plan.month_1_priorities,
        month_2_3_checkpoints: plan.month_2_3_checkpoints,
        recommended_resources: plan.recommended_resources,
        academic_accommodations: plan.academic_accommodations,
        social_integration_notes: plan.social_integration_notes,
        flag_for_early_review: plan.flag_for_early_review ?? false,
        plan_narrative: plan.plan_narrative,
        family_welcome_note: plan.family_welcome_note,
        checklist_items: checklistItems,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      console.error("[SupportPlan] Insert failed:", error);
      return NextResponse.json({ error: "Failed to save plan" }, { status: 500 });
    }

    return NextResponse.json({ plan: inserted });
  } catch (err) {
    console.error("[SupportPlan] Generation failed:", err);
    return NextResponse.json({ error: "Plan generation failed" }, { status: 500 });
  }
}
