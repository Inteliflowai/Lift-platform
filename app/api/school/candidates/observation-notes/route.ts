export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const { tenantId } = await getTenantContext();
  const candidateId = req.nextUrl.searchParams.get("candidate_id");

  if (!candidateId) {
    return NextResponse.json({ error: "candidate_id required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("interviewer_observation_notes")
    .select("*")
    .eq("candidate_id", candidateId)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { tenantId, user } = await getTenantContext();
  const body = await req.json();
  const { candidate_id, note_type, linked_observation_text, linked_question_text, note_text, sentiment } = body;

  if (!candidate_id || !note_text) {
    return NextResponse.json({ error: "candidate_id and note_text required" }, { status: 400 });
  }

  // Verify candidate belongs to tenant
  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("id")
    .eq("id", candidate_id)
    .eq("tenant_id", tenantId)
    .single();

  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("interviewer_observation_notes")
    .insert({
      candidate_id,
      tenant_id: tenantId,
      author_id: user.id,
      note_type: note_type || "free_note",
      linked_observation_text: linked_observation_text || null,
      linked_question_text: linked_question_text || null,
      note_text: note_text.trim(),
      sentiment: sentiment || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { tenantId } = await getTenantContext();
  const { note_id, note_text, sentiment } = await req.json();

  if (!note_id || !note_text) {
    return NextResponse.json({ error: "note_id and note_text required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("interviewer_observation_notes")
    .update({
      note_text: note_text.trim(),
      sentiment: sentiment || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", note_id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data });
}

export async function DELETE(req: NextRequest) {
  const { tenantId } = await getTenantContext();
  const noteId = req.nextUrl.searchParams.get("note_id");

  if (!noteId) {
    return NextResponse.json({ error: "note_id required" }, { status: 400 });
  }

  await supabaseAdmin
    .from("interviewer_observation_notes")
    .delete()
    .eq("id", noteId)
    .eq("tenant_id", tenantId);

  return NextResponse.json({ success: true });
}
