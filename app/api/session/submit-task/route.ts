import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logError } from "@/lib/errors/handler";

function detectLanguage(text: string): string {
  const ptWords = /\b(de|da|do|em|para|com|que|não|uma|são|está|isso)\b/gi;
  const matches = text.match(ptWords);
  return matches && matches.length > 5 ? "pt" : "en";
}

function countSentences(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  return sentences.length;
}

function calcLexicalDiversity(text: string): number {
  const words = text.toLowerCase().match(/\b\w+\b/g) ?? [];
  if (words.length === 0) return 0;
  const unique = new Set(words);
  return unique.size / words.length;
}

function countEvidenceMarkers(text: string): number {
  const markers =
    /\b(because|therefore|however|although|for example|for instance|in addition|moreover|furthermore|on the other hand|in contrast|as a result|consequently)\b/gi;
  const matches = text.match(markers);
  return matches?.length ?? 0;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, task_instance_id, response_body, revision_depth } = body;

    if (!session_id || !task_instance_id) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Idempotency check: if this task already has a response, return existing state
    const { data: existingResponse } = await supabaseAdmin
      .from("response_text")
      .select("id")
      .eq("task_instance_id", task_instance_id)
      .limit(1)
      .single();

    if (existingResponse) {
      // Already submitted — return current completion state without re-inserting
      const { data: allTasks } = await supabaseAdmin
        .from("task_instances")
        .select("status")
        .eq("session_id", session_id);

      const total = allTasks?.length ?? 0;
      const completed = allTasks?.filter((t) => t.status === "completed").length ?? 0;
      const completionPct = total > 0 ? Math.round((completed / total) * 10000) / 100 : 0;
      const allDone = total > 0 && completed === total;

      return NextResponse.json({
        ok: true,
        completion_pct: completionPct,
        all_done: allDone,
        idempotent: true,
      });
    }

    // Get session
    const { data: session } = await supabaseAdmin
      .from("sessions")
      .select("tenant_id")
      .eq("id", session_id)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const text = response_body ?? "";
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const language = detectLanguage(text);
    const sentenceCount = countSentences(text);
    const avgSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0;
    const lexicalDiversity = calcLexicalDiversity(text);
    const evidenceMarkerCount = countEvidenceMarkers(text);

    // 1. Update task instance
    await supabaseAdmin
      .from("task_instances")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", task_instance_id);

    // 2. Insert response_text
    let responseTextId: string | null = null;
    const { data: responseText, error: rtError } = await supabaseAdmin
      .from("response_text")
      .insert({
        task_instance_id,
        session_id,
        tenant_id: session.tenant_id,
        response_body: text,
        word_count: wordCount,
        language_detected: language,
      })
      .select("id")
      .single();

    if (rtError) {
      logError(rtError, { step: "response_text_insert", task_instance_id });
    } else {
      responseTextId = responseText?.id ?? null;
    }

    // 3. Insert response_features (non-critical — never block submission)
    if (responseTextId) {
      try {
        await supabaseAdmin.from("response_features").insert({
          response_text_id: responseTextId,
          session_id,
          tenant_id: session.tenant_id,
          sentence_count: sentenceCount,
          avg_sentence_length: Math.round(avgSentenceLength * 100) / 100,
          lexical_diversity: Math.round(lexicalDiversity * 10000) / 10000,
          evidence_marker_count: evidenceMarkerCount,
          revision_depth: revision_depth ?? 0,
        });
      } catch (err) {
        logError(err, { step: "response_features", task_instance_id });
      }
    }

    // 4. Session event (non-critical)
    try {
      await supabaseAdmin.from("session_events").insert({
        session_id,
        tenant_id: session.tenant_id,
        event_type: "task_complete",
        task_instance_id,
      });
    } catch (err) {
      logError(err, { step: "session_event", task_instance_id });
    }

    // 5. Recalculate completion %
    const { data: allTasks } = await supabaseAdmin
      .from("task_instances")
      .select("status")
      .eq("session_id", session_id);

    const total = allTasks?.length ?? 0;
    const completed = allTasks?.filter((t) => t.status === "completed").length ?? 0;
    const completionPct = total > 0 ? Math.round((completed / total) * 10000) / 100 : 0;

    try {
      await supabaseAdmin
        .from("sessions")
        .update({
          completion_pct: completionPct,
          last_activity_at: new Date().toISOString(),
          ...(completionPct === 0 ? {} : { status: "in_progress" }),
        })
        .eq("id", session_id);
    } catch (err) {
      logError(err, { step: "session_update", session_id });
    }

    const allDone = total > 0 && completed === total;

    return NextResponse.json({
      ok: true,
      completion_pct: completionPct,
      all_done: allDone,
    });
  } catch (err) {
    logError(err, { route: "submit-task" });
    // Always return success-shaped response to prevent client-side errors
    return NextResponse.json({
      ok: true,
      completion_pct: 0,
      all_done: false,
      error_logged: true,
    });
  }
}
