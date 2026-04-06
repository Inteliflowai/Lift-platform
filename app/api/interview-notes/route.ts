import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { candidate_id, tenant_id, interview_date, notes, rubric_scores } = body;

  const { data, error } = await supabaseAdmin
    .from("interviewer_notes")
    .insert({
      candidate_id,
      tenant_id,
      interviewer_id: user.id,
      interview_date: interview_date || new Date().toISOString().split("T")[0],
      notes: notes ?? "",
      rubric_scores: rubric_scores ?? {},
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
