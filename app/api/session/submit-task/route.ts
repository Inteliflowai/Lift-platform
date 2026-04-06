import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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
  const body = await req.json();
  const {
    session_id,
    task_instance_id,
    response_body,
    revision_depth,
  } = body;

  if (!session_id || !task_instance_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
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
  const { data: responseText } = await supabaseAdmin
    .from("response_text")
    .insert({
      task_instance_id,
      session_id,
      tenant_id: session.tenant_id,
      response_body: text,
      word_count: wordCount,
      language_detected: language,
    })
    .select()
    .single();

  // 3. Insert response_features
  if (responseText) {
    await supabaseAdmin.from("response_features").insert({
      response_text_id: responseText.id,
      session_id,
      tenant_id: session.tenant_id,
      sentence_count: sentenceCount,
      avg_sentence_length: Math.round(avgSentenceLength * 100) / 100,
      lexical_diversity: Math.round(lexicalDiversity * 10000) / 10000,
      evidence_marker_count: evidenceMarkerCount,
      revision_depth: revision_depth ?? 0,
    });
  }

  // 4. Session event
  await supabaseAdmin.from("session_events").insert({
    session_id,
    tenant_id: session.tenant_id,
    event_type: "task_complete",
    task_instance_id,
  });

  // 5. Recalculate completion %
  const { data: allTasks } = await supabaseAdmin
    .from("task_instances")
    .select("status")
    .eq("session_id", session_id);

  const total = allTasks?.length ?? 0;
  const completed = allTasks?.filter((t) => t.status === "completed").length ?? 0;
  const completionPct = total > 0 ? Math.round((completed / total) * 10000) / 100 : 0;

  await supabaseAdmin
    .from("sessions")
    .update({
      completion_pct: completionPct,
      last_activity_at: new Date().toISOString(),
      ...(completionPct === 0 ? {} : { status: "in_progress" }),
    })
    .eq("id", session_id);

  // 6. Check if all done
  const allDone = total > 0 && completed === total;

  // Get next task
  let nextTask = null;
  if (!allDone) {
    const { data } = await supabaseAdmin
      .from("task_instances")
      .select("*, task_templates(*)")
      .eq("session_id", session_id)
      .eq("status", "pending")
      .order("sequence_order")
      .limit(1)
      .single();
    nextTask = data;
  }

  return NextResponse.json({
    ok: true,
    completion_pct: completionPct,
    all_done: allDone,
    next_task: nextTask,
  });
}
