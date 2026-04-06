import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import OpenAI from "openai";

const VOICE_ALLOWED_TYPES = [
  "short_response",
  "extended_writing",
  "reflection",
  "scenario",
  "planning",
  "quantitative_reasoning",
  "pattern_logic",
];

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const audio = formData.get("audio") as Blob | null;
  const taskInstanceId = formData.get("task_instance_id") as string;
  const sessionToken = formData.get("session_token") as string;
  const taskType = formData.get("task_type") as string;

  if (!audio || !taskInstanceId || !sessionToken) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // CRITICAL: Never allow voice on reading passages
  if (taskType === "reading_passage") {
    return NextResponse.json(
      { error: "voice_not_allowed_on_reading_tasks" },
      { status: 400 }
    );
  }

  if (!VOICE_ALLOWED_TYPES.includes(taskType)) {
    return NextResponse.json(
      { error: "voice_not_allowed_on_this_task_type" },
      { status: 400 }
    );
  }

  // Validate session token
  const { data: invite } = await supabaseAdmin
    .from("invites")
    .select("candidate_id, tenant_id")
    .eq("token", sessionToken)
    .single();

  if (!invite) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Get tenant settings
  const { data: settings } = await supabaseAdmin
    .from("tenant_settings")
    .select("voice_mode_enabled, delete_audio_after_transcription")
    .eq("tenant_id", invite.tenant_id)
    .single();

  if (!settings?.voice_mode_enabled) {
    return NextResponse.json(
      { error: "Voice mode not enabled" },
      { status: 403 }
    );
  }

  // Get session for this candidate
  const { data: taskInstance } = await supabaseAdmin
    .from("task_instances")
    .select("session_id")
    .eq("id", taskInstanceId)
    .single();

  if (!taskInstance) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const sessionId = taskInstance.session_id;

  // Upload audio to Supabase Storage temporarily
  const audioBuffer = Buffer.from(await audio.arrayBuffer());
  const storagePath = `${invite.tenant_id}/${sessionId}/${taskInstanceId}.webm`;

  await supabaseAdmin.storage
    .from("lift-audio")
    .upload(storagePath, audioBuffer, {
      contentType: "audio/webm",
      upsert: true,
    });

  try {
    // Transcribe with Whisper
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const file = new File([audioBuffer], "audio.webm", {
      type: "audio/webm",
    });

    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file,
      response_format: "verbose_json",
    });

    const transcript = transcription.text ?? "";
    const confidence =
      transcription.segments && transcription.segments.length > 0
        ? transcription.segments.reduce(
            (sum, seg) => sum + (seg.avg_logprob ?? 0),
            0
          ) / transcription.segments.length
        : null;

    // Normalize confidence to 0-1 range (avg_logprob is negative, closer to 0 = better)
    const normalizedConfidence =
      confidence !== null ? Math.min(1, Math.max(0, 1 + confidence)) : null;

    // Update task instance response mode
    await supabaseAdmin
      .from("task_instances")
      .update({ response_mode: "voice" })
      .eq("id", taskInstanceId);

    // Record help event
    await supabaseAdmin.from("help_events").insert({
      session_id: sessionId,
      task_instance_id: taskInstanceId,
      tenant_id: invite.tenant_id,
      event_type: "voice_response_used",
    });

    // Delete audio if configured
    if (settings.delete_audio_after_transcription) {
      await supabaseAdmin.storage.from("lift-audio").remove([storagePath]);
    }

    return NextResponse.json({
      transcript,
      confidence: normalizedConfidence,
    });
  } catch (err) {
    // Delete audio on failure too
    if (settings?.delete_audio_after_transcription) {
      await supabaseAdmin.storage.from("lift-audio").remove([storagePath]);
    }

    console.error("Transcription failed:", err);
    return NextResponse.json(
      { error: "transcription_failed" },
      { status: 500 }
    );
  }
}
