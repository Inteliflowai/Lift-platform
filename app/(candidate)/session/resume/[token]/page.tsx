import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ResumePage({
  params,
}: {
  params: { token: string };
}) {
  // Find session by resume_token
  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("id, candidate_id, status, tenant_id")
    .eq("resume_token", params.token)
    .single();

  if (!session) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold text-review">Invalid Resume Link</h1>
        <p className="mt-2 text-muted">
          This resume link is no longer valid. Please contact your school.
        </p>
      </div>
    );
  }

  if (session.status === "completed") {
    // Get original invite token for done redirect
    const { data: invite } = await supabaseAdmin
      .from("invites")
      .select("token")
      .eq("candidate_id", session.candidate_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    redirect(`/session/done/${invite?.token ?? "unknown"}`);
  }

  // Resume the session
  await supabaseAdmin
    .from("sessions")
    .update({
      status: "in_progress",
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", session.id);

  await supabaseAdmin.from("session_events").insert({
    session_id: session.id,
    tenant_id: session.tenant_id,
    event_type: "resume",
  });

  // Get original invite token
  const { data: invite } = await supabaseAdmin
    .from("invites")
    .select("token")
    .eq("candidate_id", session.candidate_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  redirect(`/session/${invite?.token ?? "unknown"}`);
}
