export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendLiftEmail } from "@/lib/emails/send";
import { emailGreeting, emailParagraph, emailButton, emailSignature } from "@/lib/emails/templates/base";

// GET: list assignments (for current user or all if admin)
export async function GET(req: NextRequest) {
  const { user, tenantId, isPlatformAdmin } = await getTenantContext();
  const url = new URL(req.url);
  const candidateId = url.searchParams.get("candidate_id");
  const myOnly = url.searchParams.get("my") === "true";

  let query = supabaseAdmin
    .from("candidate_assignments")
    .select("*, candidates(first_name, last_name, grade_band, status, gender), users!assigned_to(full_name, email)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (candidateId) query = query.eq("candidate_id", candidateId);
  if (myOnly && !isPlatformAdmin) query = query.eq("assigned_to", user.id);

  const { data } = await query;
  return NextResponse.json(data ?? []);
}

// POST: assign candidate to team member
export async function POST(req: NextRequest) {
  const { user, tenantId, tenant } = await getTenantContext();
  const body = await req.json();
  const { candidate_id, assigned_to, assignment_type, notes } = body;

  if (!candidate_id || !assigned_to) {
    return NextResponse.json({ error: "candidate_id and assigned_to required" }, { status: 400 });
  }

  // Check if already assigned to this person
  const { data: existing } = await supabaseAdmin
    .from("candidate_assignments")
    .select("id")
    .eq("candidate_id", candidate_id)
    .eq("assigned_to", assigned_to)
    .eq("tenant_id", tenantId)
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Already assigned to this team member" }, { status: 409 });
  }

  const { data: assignment, error } = await supabaseAdmin
    .from("candidate_assignments")
    .insert({
      tenant_id: tenantId,
      candidate_id,
      assigned_to,
      assigned_by: user.id,
      assignment_type: assignment_type || "both",
      notes: notes || null,
    })
    .select("*, candidates(first_name, last_name, grade_band)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send email notification to the assignee
  const { data: assignee } = await supabaseAdmin
    .from("users")
    .select("full_name, email")
    .eq("id", assigned_to)
    .single();

  if (assignee?.email) {
    const cand = assignment.candidates as unknown as { first_name: string; last_name: string; grade_band: string };
    const candidateName = `${cand.first_name} ${cand.last_name}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lift.inteliflowai.com";
    const typeLabel = assignment_type === "review" ? "review" : assignment_type === "interview" ? "interview" : "review and interview";

    sendLiftEmail({
      to: assignee.email,
      subject: `New assignment: ${candidateName}`,
      tenantId,
      content: [
        emailGreeting(assignee.full_name?.split(" ")[0] ?? "there"),
        emailParagraph(`You&apos;ve been assigned to <strong>${typeLabel}</strong> <strong>${candidateName}</strong> (Grade ${cand.grade_band}) at <strong>${tenant?.name ?? "your school"}</strong>.`),
        emailButton("View Candidate", `${appUrl}/evaluator/candidates/${candidate_id}`),
        emailParagraph("Log in to your dashboard to see the candidate&apos;s profile, TRI score, and AI briefing."),
        emailSignature(),
      ].join(""),
      options: { previewText: `New candidate assigned to you: ${candidateName}`, showUnsubscribe: false },
    }).catch((err) => console.error("Assignment email failed:", err));
  }

  return NextResponse.json(assignment, { status: 201 });
}

// DELETE: remove assignment
export async function DELETE(req: NextRequest) {
  const { tenantId } = await getTenantContext();
  const { assignment_id } = await req.json();

  if (!assignment_id) {
    return NextResponse.json({ error: "assignment_id required" }, { status: 400 });
  }

  await supabaseAdmin
    .from("candidate_assignments")
    .delete()
    .eq("id", assignment_id)
    .eq("tenant_id", tenantId);

  return NextResponse.json({ ok: true });
}
