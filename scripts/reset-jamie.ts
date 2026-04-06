/**
 * Reset Jamie Rivera's state for re-testing the candidate flow
 * Usage: npx tsx scripts/reset-jamie.ts
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function reset() {
  // Find Jamie
  const { data: cand } = await s
    .from("candidates")
    .select("id")
    .eq("first_name", "Jamie")
    .eq("last_name", "Rivera")
    .single();

  if (!cand) {
    console.log("Jamie not found. Run seed first.");
    return;
  }

  console.log("Candidate ID:", cand.id);

  // Delete sessions + cascaded data
  const { data: sessions } = await s
    .from("sessions")
    .select("id")
    .eq("candidate_id", cand.id);

  for (const sess of sessions ?? []) {
    await s.from("session_events").delete().eq("session_id", sess.id);
    await s.from("response_features").delete().eq("session_id", sess.id);
    await s.from("response_text").delete().eq("session_id", sess.id);
    await s.from("task_instances").delete().eq("session_id", sess.id);
    await s.from("interaction_signals").delete().eq("session_id", sess.id);
    await s.from("timing_signals").delete().eq("session_id", sess.id);
    await s.from("help_events").delete().eq("session_id", sess.id);
  }
  await s.from("sessions").delete().eq("candidate_id", cand.id);

  // Delete consent events
  await s.from("consent_events").delete().eq("candidate_id", cand.id);

  // Reset invite
  await s
    .from("invites")
    .update({ status: "pending", opened_at: null })
    .eq("token", "test-token-jamie");

  // Reset candidate status
  await s
    .from("candidates")
    .update({ status: "invited" })
    .eq("id", cand.id);

  console.log("Jamie Rivera reset to initial state. Ready for re-test.");
}

reset().catch(console.error);
