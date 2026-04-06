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

  try {
    // Step 1: Extract features
    await writeAuditLog(supabaseAdmin, {
      tenant_id: session.tenant_id,
      candidate_id: session.candidate_id,
      session_id,
      action: "pipeline_extract_start",
    });

    const extractRes = await fetch(`${baseUrl}/api/pipeline/extract`, {
      method: "POST",
      headers,
      body: JSON.stringify({ session_id }),
    });

    if (!extractRes.ok) {
      throw new Error(`Extract failed: ${extractRes.status}`);
    }

    features = await extractRes.json();

    await writeAuditLog(supabaseAdmin, {
      tenant_id: session.tenant_id,
      candidate_id: session.candidate_id,
      session_id,
      action: "pipeline_extract_complete",
    });

    // Step 2: Score dimensions
    await writeAuditLog(supabaseAdmin, {
      tenant_id: session.tenant_id,
      candidate_id: session.candidate_id,
      session_id,
      action: "pipeline_score_start",
    });

    const scoreRes = await fetch(`${baseUrl}/api/pipeline/score`, {
      method: "POST",
      headers,
      body: JSON.stringify({ session_id, features }),
    });

    if (!scoreRes.ok) {
      throw new Error(`Score failed: ${scoreRes.status}`);
    }

    const scoreData = await scoreRes.json();
    scores = scoreData.scores;

    await writeAuditLog(supabaseAdmin, {
      tenant_id: session.tenant_id,
      candidate_id: session.candidate_id,
      session_id,
      action: "pipeline_score_complete",
      payload: {
        overall_confidence: scoreData.overall_confidence,
        requires_human_review: scoreData.requires_human_review,
      },
    });

    // Step 3: Generate narratives
    await writeAuditLog(supabaseAdmin, {
      tenant_id: session.tenant_id,
      candidate_id: session.candidate_id,
      session_id,
      action: "pipeline_narrative_start",
    });

    const narrativeRes = await fetch(`${baseUrl}/api/pipeline/narrative`, {
      method: "POST",
      headers,
      body: JSON.stringify({ session_id, scores, features }),
    });

    if (!narrativeRes.ok) {
      throw new Error(`Narrative failed: ${narrativeRes.status}`);
    }

    await writeAuditLog(supabaseAdmin, {
      tenant_id: session.tenant_id,
      candidate_id: session.candidate_id,
      session_id,
      action: "pipeline_narrative_complete",
    });

    // Finalize
    await supabaseAdmin
      .from("insight_profiles")
      .update({ is_final: true })
      .eq("session_id", session_id);

    // Update candidate status
    await supabaseAdmin
      .from("candidates")
      .update({ status: "completed" })
      .eq("id", session.candidate_id)
      .neq("status", "completed");

    // Check if human review needed → notify evaluators
    if (scoreData.requires_human_review) {
      await notifyEvaluators(session.tenant_id, session.candidate_id);
    }

    await writeAuditLog(supabaseAdmin, {
      tenant_id: session.tenant_id,
      candidate_id: session.candidate_id,
      session_id,
      action: "pipeline_complete",
    });

    return NextResponse.json({ ok: true, profile_id: scoreData.profile_id });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    // Safety fallback: mark as requires human review
    await supabaseAdmin
      .from("insight_profiles")
      .update({ requires_human_review: true })
      .eq("session_id", session_id);

    // If no profile exists yet, create one
    const { data: existing } = await supabaseAdmin
      .from("insight_profiles")
      .select("id")
      .eq("session_id", session_id)
      .single();

    if (!existing) {
      await supabaseAdmin.from("insight_profiles").insert({
        session_id,
        candidate_id: session.candidate_id,
        tenant_id: session.tenant_id,
        requires_human_review: true,
        low_confidence_flags: ["pipeline_error"],
        unusual_pattern_flags: [],
        is_final: false,
      });
    }

    await writeAuditLog(supabaseAdmin, {
      tenant_id: session.tenant_id,
      candidate_id: session.candidate_id,
      session_id,
      action: "pipeline_error",
      payload: { error: errorMsg },
    });

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
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
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const emails = roles
      .map((r) => {
        const u = r.users as unknown as { email: string; full_name: string | null };
        return u?.email;
      })
      .filter(Boolean) as string[];

    if (emails.length === 0) return;

    await resend.emails.send({
      from: "LIFT <noreply@lift.inteliflowai.com>",
      to: emails,
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
