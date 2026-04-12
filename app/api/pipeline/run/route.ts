import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { session_id } = await req.json();
  if (!session_id) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("tenant_id, candidate_id")
    .eq("id", session_id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const headers = {
    "Content-Type": "application/json",
    "x-internal-secret": process.env.INTERNAL_API_SECRET!,
  };

  let features: Record<string, unknown> | null = null;
  let scores: Record<string, unknown> | null = null;
  let profileId: string | null = null;
  let needsHumanReview = false;
  const pipelineErrors: { step: string; error: string }[] = [];

  // Step 1: Extract features
  try {
    const extractRes = await fetch(`${baseUrl}/api/pipeline/extract`, {
      method: "POST",
      headers,
      body: JSON.stringify({ session_id }),
    });
    if (extractRes.ok) {
      features = await extractRes.json();
    } else {
      throw new Error(`Extract failed: ${extractRes.status}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    pipelineErrors.push({ step: "extract", error: msg });
    needsHumanReview = true;
    console.error("[Pipeline] Extract failed:", msg);
  }

  // Step 2: Score dimensions
  let scoreData: Record<string, unknown> = {};
  try {
    const scoreRes = await fetch(`${baseUrl}/api/pipeline/score`, {
      method: "POST",
      headers,
      body: JSON.stringify({ session_id, features }),
    });
    if (scoreRes.ok) {
      scoreData = await scoreRes.json();
      scores = scoreData.scores as Record<string, unknown>;
      profileId = scoreData.profile_id as string;
      if (scoreData.requires_human_review) needsHumanReview = true;
    } else {
      throw new Error(`Score failed: ${scoreRes.status}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    pipelineErrors.push({ step: "score", error: msg });
    needsHumanReview = true;
    console.error("[Pipeline] Score failed:", msg);
  }

  // Step 2b: Compute TRI (only if scoring succeeded)
  if (profileId) {
    try {
      const { computeTRI } = await import("@/lib/signals/tri");
      await computeTRI(profileId);
    } catch (err) {
      pipelineErrors.push({ step: "tri", error: err instanceof Error ? err.message : String(err) });
    }
  }

  // Step 3: Generate narratives
  try {
    const narrativeRes = await fetch(`${baseUrl}/api/pipeline/narrative`, {
      method: "POST",
      headers,
      body: JSON.stringify({ session_id, scores, features }),
    });
    if (!narrativeRes.ok) {
      throw new Error(`Narrative failed: ${narrativeRes.status}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    pipelineErrors.push({ step: "narrative", error: msg });
    // Set fallback narrative
    await supabaseAdmin
      .from("insight_profiles")
      .update({
        internal_narrative: "Automated narrative generation encountered an issue. Please review session responses manually.",
        family_narrative: "A detailed summary is being prepared and will be available soon.",
      })
      .eq("session_id", session_id);
    console.error("[Pipeline] Narrative failed:", msg);
  }

  // Ensure a profile exists (create if scoring failed to create one)
  const { data: existingProfile } = await supabaseAdmin
    .from("insight_profiles")
    .select("id")
    .eq("session_id", session_id)
    .single();

  if (!existingProfile) {
    const { data: created } = await supabaseAdmin
      .from("insight_profiles")
      .insert({
        session_id,
        candidate_id: session.candidate_id,
        tenant_id: session.tenant_id,
        requires_human_review: true,
        low_confidence_flags: ["pipeline_error"],
        unusual_pattern_flags: [],
        is_final: false,
        pipeline_partial: true,
        pipeline_errors: pipelineErrors,
      })
      .select("id")
      .single();
    profileId = created?.id ?? null;
  }

  // Finalize profile
  const isPartial = pipelineErrors.length > 0;
  await supabaseAdmin
    .from("insight_profiles")
    .update({
      is_final: true,
      requires_human_review: needsHumanReview || isPartial,
      pipeline_partial: isPartial,
      pipeline_errors: pipelineErrors,
      pipeline_completed_at: new Date().toISOString(),
    })
    .eq("session_id", session_id);

  // Update candidate status — pipeline errors should NOT prevent completion
  await supabaseAdmin
    .from("candidates")
    .update({ status: "completed" })
    .eq("id", session.candidate_id)
    .neq("status", "completed");

  // Step 4: Learning support signals (non-blocking)
  try {
    const { computeLearningSupport } = await import("@/lib/signals/learningSupport");
    await computeLearningSupport(session_id);
  } catch (err) {
    pipelineErrors.push({ step: "learning_support", error: err instanceof Error ? err.message : String(err) });
  }

  // Step 4b: Enriched behavioral signals (non-blocking)
  try {
    const { computeEnrichedSignals } = await import("@/lib/signals/enrichedSignals");
    const enrichedSignals = await computeEnrichedSignals(session_id);
    if (enrichedSignals.length > 0) {
      await supabaseAdmin
        .from("learning_support_signals")
        .update({
          enriched_signals: enrichedSignals,
          enriched_signal_count: enrichedSignals.length,
          has_notable_signals: enrichedSignals.some((s) => s.severity === "notable"),
        })
        .eq("session_id", session_id);
    }
  } catch (err) {
    pipelineErrors.push({ step: "enriched_signals", error: err instanceof Error ? err.message : String(err) });
  }

  // Step 5: Evaluator briefing (non-blocking)
  try {
    await fetch(`${baseUrl}/api/pipeline/briefing`, {
      method: "POST",
      headers,
      body: JSON.stringify({ candidate_id: session.candidate_id, session_id }),
    });
  } catch {
    // Silent — briefing is optional
  }

  // Step 6: Cohort benchmarks (non-blocking)
  try {
    const { data: cand } = await supabaseAdmin
      .from("candidates")
      .select("cycle_id")
      .eq("id", session.candidate_id)
      .single();
    if (cand?.cycle_id) {
      await fetch(`${baseUrl}/api/pipeline/benchmarks`, {
        method: "POST",
        headers,
        body: JSON.stringify({ cycle_id: cand.cycle_id, tenant_id: session.tenant_id }),
      });
    }
  } catch {
    // Silent — benchmarks are optional
  }

  // Notify evaluators if human review needed
  if (needsHumanReview) {
    notifyEvaluators(session.tenant_id, session.candidate_id).catch(() => {});
  }

  await writeAuditLog(supabaseAdmin, {
    tenant_id: session.tenant_id,
    candidate_id: session.candidate_id,
    session_id,
    action: isPartial ? "pipeline_partial_complete" : "pipeline_complete",
    payload: isPartial ? { errors: pipelineErrors } : undefined,
  });

  return NextResponse.json({
    ok: true,
    profile_id: profileId,
    partial: isPartial,
    errors: pipelineErrors.length > 0 ? pipelineErrors : undefined,
  });
}

async function notifyEvaluators(tenantId: string, candidateId: string) {
  // Get evaluators for this tenant
  const { data: roles } = await supabaseAdmin
    .from("user_tenant_roles")
    .select("users(email, full_name)")
    .eq("tenant_id", tenantId)
    .in("role", ["evaluator", "school_admin"]);

  if (!roles || roles.length === 0) return;

  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("first_name, last_name")
    .eq("id", candidateId)
    .single();

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .single();

  const candidateName = candidate
    ? `${candidate.first_name} ${candidate.last_name}`
    : "A candidate";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 465,
      secure: true,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const emails = roles
      .map((r) => {
        const u = r.users as unknown as { email: string; full_name: string | null };
        return u?.email;
      })
      .filter(Boolean) as string[];

    if (emails.length === 0) return;

    await transporter.sendMail({
      from: `LIFT <${process.env.EMAIL_USER || "lift@inteliflowai.com"}>`,
      to: emails.join(", "),
      subject: `${tenant?.name ?? "LIFT"} — Review Required: ${candidateName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #6366f1;">LIFT</h2>
          <p><strong>${candidateName}</strong> has completed their LIFT session and has been flagged for human review.</p>
          <p style="margin: 24px 0;">
            <a href="${appUrl}/evaluator" style="background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Go to Review Queue</a>
          </p>
        </div>
      `,
    });
  } catch {
    // Non-critical — log but don't fail pipeline
    console.error("Failed to send evaluator notification email");
  }
}
