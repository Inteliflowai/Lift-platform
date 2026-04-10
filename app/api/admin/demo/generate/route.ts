export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { DEMO_NAMES } from "@/lib/demo/names";
import { RESPONSES } from "@/lib/demo/responses";
import { PROFILES, BAND_DISTRIBUTION, STAGE_DISTRIBUTION } from "@/lib/demo/profiles";
import type { DemoStage } from "@/lib/demo/profiles";
import crypto from "crypto";

const GRADE_BANDS = ["6-7", "8", "9-11"] as const;
const TASK_TYPES = ["reading_passage", "short_response", "extended_writing", "reflection", "scenario"];

export async function POST(req: NextRequest) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify platform_admin
  const { data: roles } = await supabase.from("user_tenant_roles").select("role").eq("user_id", user.id);
  if (!roles?.some((r) => r.role === "platform_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenant_id } = await req.json();
  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  // Get active cycle or create one
  let cycleId: string;
  const { data: cycle } = await supabaseAdmin
    .from("application_cycles")
    .select("id")
    .eq("tenant_id", tenant_id)
    .eq("status", "active")
    .limit(1)
    .single();

  if (cycle) {
    cycleId = cycle.id;
  } else {
    const { data: newCycle } = await supabaseAdmin
      .from("application_cycles")
      .insert({
        tenant_id,
        name: "2025-2026 Demo Cycle",
        academic_year: "2025-2026",
        status: "active",
        opens_at: new Date("2025-09-01").toISOString(),
        closes_at: new Date("2026-06-30").toISOString(),
      })
      .select()
      .single();
    cycleId = newCycle!.id;
  }

  // Ensure task templates exist for each band/type combo
  const TASK_TITLES: Record<string, string> = {
    reading_passage: "Reading Comprehension",
    short_response: "Short Response",
    extended_writing: "Extended Writing",
    reflection: "Self-Reflection",
    scenario: "Scenario Analysis",
  };

  const templateCache: Record<string, string> = {}; // "band:type" → template_id
  for (const band of GRADE_BANDS) {
    for (const taskType of TASK_TYPES) {
      const key = `${band}:${taskType}`;
      const { data: existing } = await supabaseAdmin
        .from("task_templates")
        .select("id")
        .eq("tenant_id", tenant_id)
        .eq("grade_band", band)
        .eq("task_type", taskType)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (existing) {
        templateCache[key] = existing.id;
      } else {
        // Also check global templates
        const { data: global } = await supabaseAdmin
          .from("task_templates")
          .select("id")
          .is("tenant_id", null)
          .eq("grade_band", band)
          .eq("task_type", taskType)
          .eq("is_active", true)
          .limit(1)
          .single();

        if (global) {
          templateCache[key] = global.id;
        } else {
          // Create a demo template
          const { data: newTpl } = await supabaseAdmin
            .from("task_templates")
            .insert({
              tenant_id,
              grade_band: band,
              task_type: taskType,
              title: `${TASK_TITLES[taskType] ?? taskType} (${band})`,
              language: "en",
              content: { prompt: "Demo task" },
              is_active: true,
            })
            .select()
            .single();
          if (newTpl) templateCache[key] = newTpl.id;
        }
      }
    }
  }

  let nameIdx = 0;
  let created = 0;

  for (const band of GRADE_BANDS) {
    const gradeNum = band === "6-7" ? "7" : band === "8" ? "8" : "10";

    for (let distIdx = 0; distIdx < BAND_DISTRIBUTION.length; distIdx++) {
      const profileType = BAND_DISTRIBUTION[distIdx];
      const stage: DemoStage = STAGE_DISTRIBUTION[distIdx];
      const name = DEMO_NAMES[nameIdx % DEMO_NAMES.length];
      nameIdx++;

      const profile = PROFILES[profileType];
      const responseSet = RESPONSES[band]?.[profileType === "emerging_support" ? "emerging" : profileType === "ready" ? "developing" : profileType] ?? RESPONSES[band]?.developing;

      // Days ago for realistic timestamps (spread over 4 weeks)
      const daysAgo = Math.floor(Math.random() * 28) + 1;
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() - daysAgo);

      // Candidate status based on stage
      const candidateStatus = stage === "completed" ? "completed" : stage === "in_progress" ? "active" : stage;

      // 1. Create candidate
      const { data: candidate } = await supabaseAdmin
        .from("candidates")
        .insert({
          tenant_id,
          cycle_id: cycleId,
          first_name: name.first,
          last_name: name.last,
          grade_applying_to: gradeNum,
          grade_band: band,
          preferred_language: "en",
          status: candidateStatus,
        })
        .select()
        .single();

      if (!candidate) continue;

      // 2. Invite
      const token = crypto.randomUUID();
      const inviteStatus = stage === "invited" ? "pending" : stage === "consent_pending" ? "opened" : "accepted";
      await supabaseAdmin.from("invites").insert({
        candidate_id: candidate.id,
        tenant_id,
        token,
        sent_to_email: `${name.first.toLowerCase()}.${name.last.toLowerCase()}@demo.lift`,
        sent_at: new Date(sessionDate.getTime() - 86400000 * 2).toISOString(),
        expires_at: new Date(Date.now() + 86400000 * 90).toISOString(), // 90 days from now for demo
        status: inviteStatus,
      });

      // 3. Consent (skip for invited/consent_pending)
      if (stage !== "invited" && stage !== "consent_pending") {
        await supabaseAdmin.from("consent_events").insert({
          candidate_id: candidate.id,
          tenant_id,
          consented_by: "candidate",
          consent_type: "candidate_self",
        });
      }

      // Skip session/response/profile for candidates who haven't started
      if (stage === "invited" || stage === "consent_pending") {
        created++;
        continue;
      }

      // 4. Session
      const sessionStatus = stage === "completed" ? "completed" : "in_progress";
      const completionPct = stage === "completed" ? 100 : Math.floor(Math.random() * 40) + 20;
      const { data: session } = await supabaseAdmin
        .from("sessions")
        .insert({
          candidate_id: candidate.id,
          tenant_id,
          cycle_id: cycleId,
          grade_band: band,
          status: sessionStatus,
          started_at: sessionDate.toISOString(),
          completed_at: stage === "completed" ? new Date(sessionDate.getTime() + 2400000).toISOString() : null,
          last_activity_at: new Date(sessionDate.getTime() + 2400000).toISOString(),
          completion_pct: completionPct,
        })
        .select()
        .single();

      if (!session) continue;

      // 5-8. Task instances, responses, features, signals
      for (let t = 0; t < TASK_TYPES.length; t++) {
        const taskType = TASK_TYPES[t];
        const responseBody = responseSet?.[taskType] ?? "Response not available.";

        const templateId = templateCache[`${band}:${taskType}`];
        const { data: ti } = await supabaseAdmin
          .from("task_instances")
          .insert({
            session_id: session.id,
            tenant_id,
            task_template_id: templateId ?? null,
            sequence_order: t + 1,
            status: "completed",
            started_at: new Date(sessionDate.getTime() + t * 480000).toISOString(),
            completed_at: new Date(sessionDate.getTime() + (t + 1) * 480000).toISOString(),
          })
          .select()
          .single();

        if (!ti) continue;

        const wordCount = responseBody.split(/\s+/).filter(Boolean).length;
        const sentenceCount = responseBody.split(/[.!?]+/).filter((s) => s.trim()).length;

        const { data: rt } = await supabaseAdmin
          .from("response_text")
          .insert({
            task_instance_id: ti.id,
            session_id: session.id,
            tenant_id,
            response_body: responseBody,
            word_count: wordCount,
            language_detected: "en",
          })
          .select()
          .single();

        if (rt) {
          await supabaseAdmin.from("response_features").insert({
            response_text_id: rt.id,
            session_id: session.id,
            tenant_id,
            sentence_count: sentenceCount,
            avg_sentence_length: sentenceCount > 0 ? Math.round((wordCount / sentenceCount) * 100) / 100 : 0,
            lexical_diversity: 0.4 + Math.random() * 0.3,
            evidence_marker_count: Math.floor(Math.random() * 5),
            revision_depth: profileType === "emerging_support" ? 5 : Math.floor(Math.random() * 3),
          });
        }

        // Timing signals
        await supabaseAdmin.from("timing_signals").insert({
          session_id: session.id,
          task_instance_id: ti.id,
          tenant_id,
          signal_type: "task_dwell_time",
          value_ms: 60000 + Math.floor(Math.random() * 180000),
        });
      }

      // Skip profiles/briefings/reviews for in-progress candidates
      if (stage === "in_progress") {
        created++;
        continue;
      }

      // 9. Insight profile (completed only)
      const tri_summary = {
        emerging: "This student shows early readiness signals and would benefit from a structured transition support plan.",
        developing: "This student demonstrates growing readiness and would likely thrive with targeted onboarding support.",
        ready: "This student shows solid readiness for transition with standard school support structures in place.",
        thriving: "This student demonstrates strong readiness signals across multiple dimensions.",
      }[profile.tri_label] ?? "";

      const { data: insightProfile } = await supabaseAdmin
        .from("insight_profiles")
        .insert({
          session_id: session.id,
          candidate_id: candidate.id,
          tenant_id,
          reading_score: profile.reading + Math.floor(Math.random() * 6 - 3),
          writing_score: profile.writing + Math.floor(Math.random() * 6 - 3),
          reasoning_score: profile.reasoning + Math.floor(Math.random() * 6 - 3),
          reflection_score: profile.reflection + Math.floor(Math.random() * 6 - 3),
          persistence_score: profile.persistence + Math.floor(Math.random() * 6 - 3),
          support_seeking_score: profile.support_seeking + Math.floor(Math.random() * 6 - 3),
          overall_confidence: profile.confidence,
          tri_score: profile.tri + Math.floor(Math.random() * 4 - 2),
          tri_label: profile.tri_label,
          tri_confidence: profile.tri_confidence,
          tri_summary: tri_summary + (profile.tri_confidence === "low" ? " (Note: session data was limited — interpret with additional context.)" : ""),
          requires_human_review: profile.learning_support,
          low_confidence_flags: profile.confidence < 50 ? ["low_overall_confidence"] : [],
          unusual_pattern_flags: [],
          internal_narrative: `${name.first} demonstrated ${profile.tri_label}-level readiness across the assessment dimensions. Reading comprehension showed ${profile.reading > 70 ? "strong" : profile.reading > 50 ? "developing" : "emerging"} engagement with the passage material.`,
          family_narrative: `${name.first} completed a series of learning activities as part of the admissions process. The activities explored how ${name.first} approaches reading, writing, and reasoning tasks. ${name.first} showed ${profile.tri_label === "thriving" ? "strong engagement and thoughtful responses" : profile.tri_label === "ready" ? "solid effort and clear thinking" : "developing skills that will continue to grow with support"} throughout the experience.`,
          placement_guidance: profile.tri_label === "thriving" ? "Independent — standard school support sufficient." : profile.tri_label === "ready" ? "Standard Support — would benefit from structured check-ins during transition." : profile.tri_label === "developing" ? "Enhanced Support — recommend targeted onboarding plan and regular progress monitoring." : "Enhanced Support — recommend learning support screening before enrollment.",
          is_final: true,
        })
        .select()
        .single();

      // 10. Learning support signals
      if (profile.learning_support && insightProfile) {
        const { data: ls } = await supabaseAdmin
          .from("learning_support_signals")
          .insert({
            session_id: session.id,
            candidate_id: candidate.id,
            tenant_id,
            high_revision_depth: true,
            reasoning_writing_gap: true,
            short_written_output: true,
            signal_count: 3,
            support_indicator_level: "recommend_screening",
            evaluator_note: "Multiple response patterns are consistent with students who benefit from a learning support evaluation. Recommend a screening conversation before or shortly after enrollment. This is not a diagnosis.",
            requires_human_review: true,
          })
          .select()
          .single();

        if (ls && insightProfile) {
          await supabaseAdmin
            .from("insight_profiles")
            .update({ learning_support_signal_id: ls.id })
            .eq("id", insightProfile.id);
        }
      }

      // 11. Evaluator briefing
      await supabaseAdmin.from("evaluator_briefings").insert({
        candidate_id: candidate.id,
        tenant_id,
        cycle_id: cycleId,
        key_observations: profile.briefing_observations,
        interview_questions: profile.briefing_questions,
        areas_to_explore: ["Academic transition readiness", "Peer collaboration style"],
        strengths_to_confirm: profile.tri_label === "thriving" ? ["Strong analytical thinking", "Self-directed learning"] : ["Willingness to seek support", "Engagement with tasks"],
        confidence_explanation: `Confidence is ${profile.tri_confidence} based on ${profile.confidence}% overall confidence score and session completion data.`,
      });

      // 12. Some evaluator reviews (for ~60% of candidates)
      if (Math.random() > 0.4) {
        const tiers = ["strong_admit", "admit", "waitlist", "decline", "defer"] as const;
        const tierIdx = profileType === "thriving" ? 0 : profileType === "ready" ? 1 : profileType === "developing" ? 2 : 4;
        await supabaseAdmin.from("evaluator_reviews").insert({
          candidate_id: candidate.id,
          tenant_id,
          notes: `Reviewed ${name.first}'s profile. ${profile.tri_label === "thriving" ? "Strong candidate overall." : profile.tri_label === "ready" ? "Solid candidate with standard support needs." : "Needs additional consideration."}`,
          recommendation_tier: tiers[tierIdx],
          status: Math.random() > 0.3 ? "finalized" : "in_progress",
          finalized_at: Math.random() > 0.3 ? new Date().toISOString() : null,
        });
      }

      created++;
    }
  }

  // Mark tenant as demo
  await supabaseAdmin
    .from("tenants")
    .update({
      is_demo: true,
      demo_activated_at: new Date().toISOString(),
      demo_activated_by: user.id,
    })
    .eq("id", tenant_id);

  await writeAuditLog(supabaseAdmin, {
    tenant_id,
    actor_id: user.id,
    action: "demo_activated",
    payload: { candidates_created: created },
  });

  return NextResponse.json({ ok: true, created });
}
