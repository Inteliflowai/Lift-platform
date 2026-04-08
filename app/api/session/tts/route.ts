import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import OpenAI from "openai";
import { createHash } from "crypto";

const MAX_CHUNK = 4000;

/** Split text at sentence boundaries, never mid-sentence. */
function chunkText(text: string): string[] {
  if (text.length <= MAX_CHUNK) return [text];

  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length > MAX_CHUNK && current.length > 0) {
      chunks.push(current.trimEnd());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.length > 0) chunks.push(current.trimEnd());
  return chunks;
}

export async function POST(req: NextRequest) {
  let body: { text?: string; session_token?: string; voice?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { text, session_token, voice } = body;

  if (!text || !session_token) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Validate session token
  const { data: invite } = await supabaseAdmin
    .from("invites")
    .select("candidate_id, tenant_id")
    .eq("token", session_token)
    .single();

  if (!invite) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Check tenant setting
  const { data: settings } = await supabaseAdmin
    .from("tenant_settings")
    .select("passage_reader_enabled")
    .eq("tenant_id", invite.tenant_id)
    .single();

  if (!settings?.passage_reader_enabled) {
    return NextResponse.json(
      { error: "Passage reader not enabled" },
      { status: 403 }
    );
  }

  // ETag caching
  const selectedVoice = voice || "nova";
  const etag = createHash("md5")
    .update(text + selectedVoice)
    .digest("hex");

  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch === `"${etag}"`) {
    return new NextResponse(null, { status: 304 });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const chunks = chunkText(text);

    const audioBuffers: Buffer[] = [];
    for (const chunk of chunks) {
      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: selectedVoice as "nova" | "alloy" | "echo" | "fable" | "onyx" | "shimmer",
        input: chunk,
      });
      const arrayBuffer = await response.arrayBuffer();
      audioBuffers.push(Buffer.from(arrayBuffer));
    }

    const combined = Buffer.concat(audioBuffers);

    // Get active session for this candidate
    const { data: activeSession } = await supabaseAdmin
      .from("sessions")
      .select("id")
      .eq("candidate_id", invite.candidate_id)
      .eq("status", "in_progress")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Log help event (fire-and-forget)
    supabaseAdmin
      .from("help_events")
      .insert({
        session_id: activeSession?.id ?? null,
        tenant_id: invite.tenant_id,
        event_type: "passage_read_aloud",
        payload: { char_count: text.length },
      })
      .then(() => {});

    return new NextResponse(combined, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
        ETag: `"${etag}"`,
      },
    });
  } catch (err) {
    console.error("TTS generation failed:", err);
    return NextResponse.json(
      { error: "tts_failed" },
      { status: 500 }
    );
  }
}
