import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createAdapter } from "@/lib/integrations/factory";
import { sendLiftEmail } from "@/lib/emails/send";
import type { CandidatePayload, ProviderType } from "@/lib/integrations/base";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { candidate_id } = await req.json();
  if (!candidate_id) {
    return NextResponse.json({ error: "candidate_id required" }, { status: 400 });
  }

  // Load candidate
  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("*, tenant_id")
    .eq("id", candidate_id)
    .single();

  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  // Load insight profile for TRI score
  const { data: profiles } = await supabaseAdmin
    .from("insight_profiles")
    .select("*")
    .eq("candidate_id", candidate_id)
    .order("created_at", { ascending: false })
    .limit(1);

  const profile = profiles?.[0];

  // Load learning support signals
  const { data: signals } = await supabaseAdmin
    .from("learning_support_signals")
    .select("support_level")
    .eq("candidate_id", candidate_id)
    .order("created_at", { ascending: false })
    .limit(1);

  // Load session
  const { data: sessions } = await supabaseAdmin
    .from("sessions")
    .select("completed_at")
    .eq("candidate_id", candidate_id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1);

  // Build payload
  const payload: CandidatePayload = {
    lift_candidate_id: candidate.id,
    school_id: candidate.tenant_id,
    first_name: candidate.first_name,
    last_name: candidate.last_name,
    email: candidate.email ?? null,
    grade: candidate.grade_applying ?? null,
    preferred_language: candidate.preferred_language ?? null,
    gender: candidate.gender ?? null,
    lift_session_completed_at: sessions?.[0]?.completed_at ?? null,
    tri_score: profile?.tri_score ?? null,
    tri_label: profile?.tri_label ?? null,
    readiness_dimensions: profile
      ? {
          reading: profile.reading_score,
          writing: profile.writing_score,
          reasoning: profile.reasoning_score,
          reflection: profile.reflection_score,
          persistence: profile.persistence_score,
          support_seeking: profile.support_seeking_score,
        }
      : null,
    support_indicator_level: signals?.[0]?.support_level ?? null,
    lift_report_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://lift.inteliflowai.com"}/evaluator/candidates/${candidate.id}`,
  };

  // Load active SIS integrations for this tenant
  const { data: integrations } = await supabaseAdmin
    .from("sis_integrations")
    .select("*")
    .eq("tenant_id", candidate.tenant_id)
    .eq("status", "active");

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ message: "No active SIS integrations" });
  }

  const results: { provider: string; status: string; error?: string }[] = [];

  for (const integration of integrations) {
    if (integration.provider === "csv_manual") continue; // CSV is manual only

    try {
      const adapter = createAdapter(
        integration.provider as ProviderType,
        integration.config as string
      );
      const result = await adapter.pushCandidate(payload);

      // Update candidate
      await supabaseAdmin
        .from("candidates")
        .update({
          sis_external_id: result.external_id,
          sis_sync_status: "synced",
        })
        .eq("id", candidate_id);

      // Update integration
      await supabaseAdmin
        .from("sis_integrations")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: "success",
          last_sync_error: null,
        })
        .eq("id", integration.id);

      // Log success
      await supabaseAdmin.from("sis_sync_log").insert({
        tenant_id: candidate.tenant_id,
        integration_id: integration.id,
        candidate_id,
        provider: integration.provider,
        direction: "outbound",
        status: "success",
        payload_sent: payload,
        response_received: { external_id: result.external_id },
      });

      results.push({ provider: integration.provider, status: "success" });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      // Update candidate
      await supabaseAdmin
        .from("candidates")
        .update({ sis_sync_status: "failed" })
        .eq("id", candidate_id);

      // Update integration
      await supabaseAdmin
        .from("sis_integrations")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: "failed",
          last_sync_error: errorMsg,
        })
        .eq("id", integration.id);

      // Log failure
      await supabaseAdmin.from("sis_sync_log").insert({
        tenant_id: candidate.tenant_id,
        integration_id: integration.id,
        candidate_id,
        provider: integration.provider,
        direction: "outbound",
        status: "failed",
        payload_sent: payload,
        error_message: errorMsg,
      });

      // Alert school admin
      const { data: admins } = await supabaseAdmin
        .from("user_tenant_roles")
        .select("user_id")
        .eq("tenant_id", candidate.tenant_id)
        .eq("role", "school_admin");

      for (const admin of admins ?? []) {
        const { data: user } = await supabaseAdmin
          .from("users")
          .select("email")
          .eq("id", admin.user_id)
          .single();

        if (user?.email) {
          await sendLiftEmail({
            to: user.email,
            subject: `SIS Sync Failed: ${candidate.first_name} ${candidate.last_name}`,
            tenantId: candidate.tenant_id,
            content: `
              <h2 style="margin:0 0 12px;font-size:18px;color:#1a1a2e">SIS Sync Failed</h2>
              <p>The SIS sync for <strong>${candidate.first_name} ${candidate.last_name}</strong> to <strong>${integration.provider}</strong> has failed.</p>
              <p style="color:#6b7280;font-size:13px">Error: ${errorMsg}</p>
              <p>You can retry the sync from Settings &gt; Integrations.</p>
            `,
          });
        }
      }

      results.push({ provider: integration.provider, status: "failed", error: errorMsg });
    }
  }

  return NextResponse.json({ results });
}
